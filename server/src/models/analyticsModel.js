import { query } from '../config/db.js';

// Reports analytics — scoped to the caller's own reports unless isAdmin.
function reportScopeClause(userId, isAdmin, startIndex) {
  if (isAdmin) return { clause: '', values: [] };
  return { clause: `WHERE user_id = $${startIndex}`, values: [userId] };
}

export async function getReportCategoryCounts(userId, isAdmin) {
  const { clause, values } = reportScopeClause(userId, isAdmin, 1);
  const result = await query(
    `SELECT category, COUNT(*)::int AS count FROM field_reports ${clause} GROUP BY category ORDER BY count DESC`,
    values
  );
  return result.rows;
}

export async function getReportSeverityCounts(userId, isAdmin) {
  const { clause, values } = reportScopeClause(userId, isAdmin, 1);
  const result = await query(
    `SELECT severity, COUNT(*)::int AS count FROM field_reports ${clause} GROUP BY severity ORDER BY severity`,
    values
  );
  return result.rows;
}

export async function getReportStatusCounts(userId, isAdmin) {
  const { clause, values } = reportScopeClause(userId, isAdmin, 1);
  const result = await query(
    `SELECT status, COUNT(*)::int AS count FROM field_reports ${clause} GROUP BY status ORDER BY status`,
    values
  );
  return result.rows;
}

export async function getReportsOverTime(userId, isAdmin) {
  const { clause, values } = reportScopeClause(userId, isAdmin, 1);
  const result = await query(
    `SELECT created_at::date AS date, COUNT(*)::int AS count
     FROM field_reports ${clause}
     GROUP BY date ORDER BY date`,
    values
  );
  return result.rows;
}

// Marketplace analytics — scoped by role: farmer sees their own sales,
// buyer sees their own purchases, admin sees everything.
function marketplaceScopeClause(role, userId, startIndex) {
  if (role === 'admin') return { clause: '', values: [] };
  if (role === 'farmer') return { clause: `WHERE listings.farmer_id = $${startIndex}`, values: [userId] };
  return { clause: `WHERE orders.buyer_id = $${startIndex}`, values: [userId] };
}

export async function getOrderVolumeOverTime(role, userId) {
  const { clause, values } = marketplaceScopeClause(role, userId, 1);
  const result = await query(
    `SELECT orders.created_at::date AS date, COUNT(*)::int AS count,
            COALESCE(SUM(orders.total_price), 0)::float AS revenue
     FROM orders
     JOIN listings ON listings.id = orders.listing_id
     ${clause}
     GROUP BY date ORDER BY date`,
    values
  );
  return result.rows;
}

export async function getTopCrops(role, userId) {
  const { clause, values } = marketplaceScopeClause(role, userId, 1);
  const result = await query(
    `SELECT listings.crop_name,
            COALESCE(SUM(orders.quantity), 0)::float AS total_quantity,
            COALESCE(SUM(orders.total_price), 0)::float AS total_revenue
     FROM orders
     JOIN listings ON listings.id = orders.listing_id
     ${clause}
     GROUP BY listings.crop_name
     ORDER BY total_revenue DESC
     LIMIT 10`,
    values
  );
  return result.rows;
}

export async function getOrdersByStatus(role, userId) {
  const { clause, values } = marketplaceScopeClause(role, userId, 1);
  const result = await query(
    `SELECT orders.status, COUNT(*)::int AS count
     FROM orders
     JOIN listings ON listings.id = orders.listing_id
     ${clause}
     GROUP BY orders.status ORDER BY orders.status`,
    values
  );
  return result.rows;
}
