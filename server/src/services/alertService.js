import { query } from '../config/db.js';
import { deliver, toE164 } from './smsProvider.js';

const SMS_MAX = 300;
const PREFIX = 'AgriConnect: ';

async function logAlert({ userId, channel, to, message, provider, status, error }) {
  const result = await query(
    `INSERT INTO alert_log (user_id, channel, to_number, message, provider, status, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [userId, channel, to, message, provider, status, error || null]
  );
  return result.rows[0];
}

// Sends an alert on one channel, respecting the user's opt-in unless `force`
// (used for the "send test alert" button). Returns the alert_log row, or
// { skipped: reason } when nothing was sent. Never throws.
export async function sendAlert(userId, channel, text, { force = false } = {}) {
  try {
    const user = (await query('SELECT id, phone, sms_alerts, voice_alerts FROM users WHERE id = $1', [userId])).rows[0];
    if (!user) return { skipped: 'no_user' };
    const optedIn = channel === 'voice' ? user.voice_alerts : user.sms_alerts;
    if (!optedIn && !force) return { skipped: 'not_opted_in' };
    const to = toE164(user.phone);
    if (!to) return { skipped: 'no_valid_phone' };

    const message = `${PREFIX}${text}`.slice(0, SMS_MAX);
    const outcome = await deliver(channel, to, message);
    return await logAlert({ userId, channel, to, message, ...outcome });
  } catch (err) {
    console.error('sendAlert failed:', err.message);
    return { skipped: 'error' };
  }
}

// Voice-call every admin who opted in (used for critical field reports).
export async function alertAdmins(channel, text) {
  const admins = (await query(`SELECT id FROM users WHERE role = 'admin'`)).rows;
  return Promise.all(admins.map((a) => sendAlert(a.id, channel, text)));
}

export async function listAlerts(limit = 100) {
  const result = await query(
    `SELECT alert_log.*, users.name AS user_name, users.role AS user_role
     FROM alert_log LEFT JOIN users ON users.id = alert_log.user_id
     ORDER BY alert_log.created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}
