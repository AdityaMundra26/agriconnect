import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail, findUserById, updateUserProfile } from '../models/userModel.js';
import { sendAlert } from '../services/alertService.js';
import { toE164 } from '../services/smsProvider.js';

const SALT_ROUNDS = 10;
// Self-registration is limited to farmer/buyer; admin accounts are provisioned
// separately (e.g. directly in the database) so report moderation can't be
// bypassed by signing up as admin.
const SELF_SERVICE_ROLES = ['farmer', 'buyer'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s]{7,20}$/;

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export async function register(req, res, next) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const { password, role = 'farmer', phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (name.length > 120) return res.status(400).json({ error: 'Name is too long' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    if (!SELF_SERVICE_ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of ${SELF_SERVICE_ROLES.join(', ')}` });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (phone && !PHONE_RE.test(phone)) return res.status(400).json({ error: 'Enter a valid phone number' });

    if (await findUserByEmail(email)) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser({ name, email, passwordHash, role, phone });

    res.status(201).json({ user, token: signToken(user) });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const { password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // eslint-disable-next-line no-unused-vars
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token: signToken(user) });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : undefined;
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : undefined;
    const { smsAlerts, voiceAlerts } = req.body;
    if (name !== undefined && (!name || name.length > 120)) return res.status(400).json({ error: 'Enter a valid name' });
    if (phone && !PHONE_RE.test(phone)) return res.status(400).json({ error: 'Enter a valid phone number' });
    for (const [k, v] of Object.entries({ smsAlerts, voiceAlerts })) {
      if (v !== undefined && typeof v !== 'boolean') return res.status(400).json({ error: `${k} must be true or false` });
    }

    // Alerts need somewhere to go.
    const current = await findUserById(req.user.id);
    const effectivePhone = phone !== undefined ? phone : current.phone;
    if ((smsAlerts || voiceAlerts) && !toE164(effectivePhone)) {
      return res.status(400).json({ error: 'Add a valid mobile number before turning on SMS or voice alerts' });
    }

    const user = await updateUserProfile(req.user.id, { name, phone, smsAlerts, voiceAlerts });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function sendTestAlert(req, res, next) {
  try {
    const channel = req.body.channel === 'voice' ? 'voice' : 'sms';
    const result = await sendAlert(
      req.user.id,
      channel,
      channel === 'voice' ? 'This is a test voice alert. Your alerts are working.' : 'Test alert - your SMS alerts are working.',
      { force: true }
    );
    if (result.skipped === 'no_valid_phone') return res.status(400).json({ error: 'Add a valid mobile number first' });
    if (result.skipped) return res.status(500).json({ error: 'Could not send the test alert' });
    res.json({ alert: result });
  } catch (err) {
    next(err);
  }
}
