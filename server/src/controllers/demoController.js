import jwt from 'jsonwebtoken';
import { pool, query } from '../config/db.js';
import { seedDemoData, removeDemoData, getDemoStatus } from '../services/demoData.js';

// Who may load/remove the sample data:
//   public - anyone (the button shows on the login page). Default outside production.
//   admin  - admins only (Admin Console). Default in production.
//   off    - nobody; use `npm run seed` instead.
export function demoToggleMode() {
  const mode = (process.env.DEMO_TOGGLE || '').toLowerCase();
  if (['public', 'admin', 'off'].includes(mode)) return mode;
  return process.env.NODE_ENV === 'production' ? 'admin' : 'public';
}

function callerIsAdmin(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return false;
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET).role === 'admin';
  } catch {
    return false;
  }
}

function assertAllowed(req, res) {
  const mode = demoToggleMode();
  if (mode === 'public' || (mode === 'admin' && callerIsAdmin(req))) return true;
  res.status(403).json({
    error: mode === 'off' ? 'The demo data toggle is disabled on this server' : 'Only admins can change demo data',
  });
  return false;
}

// One load/remove at a time; a second click while one runs gets a 409.
let busy = false;

export async function status(req, res, next) {
  try {
    res.json({ ...(await getDemoStatus(query)), toggle: demoToggleMode(), busy });
  } catch (err) {
    next(err);
  }
}

async function runExclusive(res, next, work) {
  if (busy) return res.status(409).json({ error: 'Demo data is already being updated, please wait' });
  busy = true;
  const client = await pool.connect();
  try {
    const q = (sql, values) => client.query(sql, values);
    await work(q);
    res.json({ ...(await getDemoStatus(q)), toggle: demoToggleMode(), busy: false });
  } catch (err) {
    next(err);
  } finally {
    client.release();
    busy = false;
  }
}

export function enable(req, res, next) {
  if (!assertAllowed(req, res)) return;
  return runExclusive(res, next, (q) => seedDemoData(q));
}

export function disable(req, res, next) {
  if (!assertAllowed(req, res)) return;
  return runExclusive(res, next, (q) => removeDemoData(q));
}
