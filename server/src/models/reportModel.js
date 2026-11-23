import { query } from '../config/db.js';

const REPORT_SELECT = `
  SELECT field_reports.*, plots.name AS plot_name, users.name AS reporter_name
  FROM field_reports
  LEFT JOIN plots ON plots.id = field_reports.plot_id
  JOIN users ON users.id = field_reports.user_id`;

export async function createFieldReport({ userId, plotId, description, category, severity, location, aiClassified }) {
  const result = await query(
    `INSERT INTO field_reports (user_id, plot_id, description, category, severity, location, status, ai_classified)
     VALUES ($1, $2, $3, $4, $5, $6, 'open', $7)
     RETURNING id`,
    [userId, plotId ?? null, description, category, severity, location, Boolean(aiClassified)]
  );
  return findReportById(result.rows[0].id);
}

export async function findReportById(id) {
  const result = await query(`${REPORT_SELECT} WHERE field_reports.id = $1`, [id]);
  return result.rows[0];
}

export async function findReportsForUser(userId) {
  const result = await query(
    `${REPORT_SELECT} WHERE field_reports.user_id = $1 ORDER BY field_reports.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function findAllReports({ status, severity, category } = {}) {
  const conditions = [];
  const values = [];

  if (status) { values.push(status); conditions.push(`field_reports.status = $${values.length}`); }
  if (severity) { values.push(severity); conditions.push(`field_reports.severity = $${values.length}`); }
  if (category) { values.push(category); conditions.push(`field_reports.category = $${values.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(`${REPORT_SELECT} ${where} ORDER BY field_reports.created_at DESC`, values);
  return result.rows;
}

export async function updateReportStatus(id, status) {
  await query('UPDATE field_reports SET status = $1 WHERE id = $2', [status, id]);
  return findReportById(id);
}

export async function addStatusHistory(reportId, status, changedBy, note = null) {
  await query(
    'INSERT INTO report_status_history (report_id, status, changed_by, note) VALUES ($1, $2, $3, $4)',
    [reportId, status, changedBy, note]
  );
}

export async function findStatusHistory(reportId) {
  const result = await query(
    `SELECT report_status_history.*, users.name AS changed_by_name, users.role AS changed_by_role
     FROM report_status_history
     LEFT JOIN users ON users.id = report_status_history.changed_by
     WHERE report_id = $1
     ORDER BY changed_at ASC, report_status_history.id ASC`,
    [reportId]
  );
  return result.rows;
}
