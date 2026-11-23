import { query } from '../config/db.js';

const PUBLIC_COLUMNS = 'id, name, email, role, phone, sms_alerts, voice_alerts, created_at';

export async function createUser({ name, email, passwordHash, role, phone }) {
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${PUBLIC_COLUMNS}`,
    [name, email, passwordHash, role, phone || null]
  );
  return result.rows[0];
}

// Emails are matched case-insensitively so "Ravi@x.com" and "ravi@x.com"
// are the same account.
export async function findUserByEmail(email) {
  const result = await query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  return result.rows[0];
}

export async function findUserById(id) {
  const result = await query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return result.rows[0];
}

// Only fields that are not undefined are changed. phone === '' clears it.
export async function updateUserProfile(id, fields) {
  const columns = { name: 'name', phone: 'phone', smsAlerts: 'sms_alerts', voiceAlerts: 'voice_alerts' };
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(columns)) {
    if (fields[key] !== undefined) {
      values.push(key === 'phone' && fields[key] === '' ? null : fields[key]);
      sets.push(`${column} = $${values.length}`);
    }
  }
  if (sets.length === 0) return findUserById(id);
  values.push(id);
  const result = await query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING ${PUBLIC_COLUMNS}`,
    values
  );
  return result.rows[0];
}
