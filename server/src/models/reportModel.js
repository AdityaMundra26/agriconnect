import { query } from '../config/db.js';

export async function createFieldReport({ userId, plotId, description, category, severity, location }) {
  const result = await query(
    `INSERT INTO field_reports (user_id, plot_id, description, category, severity, location, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'open')
     RETURNING *`,
    [userId, plotId ?? null, description, category, severity, location]
  );
  return result.rows[0];
}

export async function findReportById(id) {
  const result = await query('SELECT * FROM field_reports WHERE id = $1', [id]);
  return result.rows[0];
}

export async function findReportsForUser(userId) {
  const result = await query(
    'SELECT * FROM field_reports WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

export async function findAllReports({ status, severity, category } = {}) {
  const conditions = [];
  const values = [];
  let i = 1;

  if (status) { conditions.push(`status = $${i++}`); values.push(status); }
  if (severity) { conditions.push(`severity = $${i++}`); values.push(severity); }
  if (category) { conditions.push(`category = $${i++}`); values.push(category); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(
    `SELECT * FROM field_reports ${where} ORDER BY created_at DESC`,
    values
  );
  return result.rows;
}

export async function updateReportStatus(id, status) {
  const result = await query(
    'UPDATE field_reports SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0];
}

export async function addStatusHistory(reportId, status, changedBy) {
  await query(
    'INSERT INTO report_status_history (report_id, status, changed_by) VALUES ($1, $2, $3)',
    [reportId, status, changedBy]
  );
}

export async function findStatusHistory(reportId) {
  const result = await query(
    'SELECT * FROM report_status_history WHERE report_id = $1 ORDER BY changed_at ASC',
    [reportId]
  );
  return result.rows;
}
