import { query } from '../config/db.js';

export async function createNotification({ userId, message, type = 'info', link = null }) {
  const result = await query(
    `INSERT INTO notifications (user_id, message, type, link)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, message, type, link]
  );
  return result.rows[0];
}

export async function findNotificationsForUser(userId, limit = 30) {
  const result = await query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

export async function countUnread(userId) {
  const result = await query(
    'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false',
    [userId]
  );
  return result.rows[0].count;
}

export async function markRead(id, userId) {
  const result = await query(
    'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, userId]
  );
  return result.rows[0];
}

export async function markAllRead(userId) {
  await query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [userId]);
}
