import { query } from '../config/db.js';

// Reports analytics - scoped to the caller's own reports unless isAdmin.
function reportScope(userId, isAdmin) {
  return isAdmin ? { clause: '', values: [] } : { clause: 'WHERE user_id = $1', values: [userId] };
}

export async function getReportCategoryCounts(userId, isAdmin) {
  const { clause, values } = reportScope(userId, isAdmin);
  const result = await query(
    `SELECT COALESCE(category, 'other') AS category, COUNT(*)::int AS count
     FROM field_reports ${clause} GROUP BY 1 ORDER BY count DESC`,
    values
  );
  return result.rows;
}

export async function getReportSeverityCounts(userId, isAdmin) {
  const { clause, values } = reportScope(userId, isAdmin);
  const result = await query(
    `SELECT severity, COUNT(*)::int AS count FROM field_reports ${clause}
     GROUP BY severity ORDER BY severity`,
    values
  );
  return result.rows.filter((r) => r.severity);
}

export async function getReportStatusCounts(userId, isAdmin) {
  const { clause, values } = reportScope(userId, isAdmin);
  const result = await query(
    `SELECT status, COUNT(*)::int AS count FROM field_reports ${clause} GROUP BY status ORDER BY status`,
    values
  );
  return result.rows;
}

export async function getReportsOverTime(userId, isAdmin) {
  const { clause, values } = reportScope(userId, isAdmin);
  const result = await query(
    `SELECT to_char(created_at::date, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
     FROM field_reports ${clause}
     GROUP BY 1 ORDER BY 1`,
    values
  );
  return result.rows;
}

// Marketplace analytics - scoped by role: farmer sees their own sales,
// buyer sees their own purchases, admin sees everything.
function marketplaceScope(role, userId) {
  if (role === 'admin') return { clause: '', values: [] };
  if (role === 'farmer') return { clause: 'WHERE listings.farmer_id = $1', values: [userId] };
  return { clause: 'WHERE orders.buyer_id = $1', values: [userId] };
}

const REVENUE = `COALESCE(SUM(orders.total_price) FILTER (WHERE orders.status <> 'cancelled'), 0)::float`;

export async function getOrderVolumeOverTime(role, userId) {
  const { clause, values } = marketplaceScope(role, userId);
  const result = await query(
    `SELECT to_char(orders.created_at::date, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count, ${REVENUE} AS revenue
     FROM orders JOIN listings ON listings.id = orders.listing_id
     ${clause}
     GROUP BY 1 ORDER BY 1`,
    values
  );
  return result.rows;
}

export async function getTopCrops(role, userId) {
  const { clause, values } = marketplaceScope(role, userId);
  const result = await query(
    `SELECT listings.crop_name,
            COALESCE(SUM(orders.quantity) FILTER (WHERE orders.status <> 'cancelled'), 0)::float AS total_quantity,
            ${REVENUE} AS total_revenue
     FROM orders JOIN listings ON listings.id = orders.listing_id
     ${clause}
     GROUP BY listings.crop_name
     HAVING ${REVENUE} > 0
     ORDER BY total_revenue DESC
     LIMIT 8`,
    values
  );
  return result.rows;
}

export async function getOrdersByStatus(role, userId) {
  const { clause, values } = marketplaceScope(role, userId);
  const result = await query(
    `SELECT orders.status, COUNT(*)::int AS count
     FROM orders JOIN listings ON listings.id = orders.listing_id
     ${clause}
     GROUP BY orders.status ORDER BY orders.status`,
    values
  );
  return result.rows;
}

export async function getMarketplaceTotals(role, userId) {
  const { clause, values } = marketplaceScope(role, userId);
  const result = await query(
    `SELECT COUNT(*)::int AS orders,
            ${REVENUE} AS revenue,
            COUNT(*) FILTER (WHERE orders.status = 'delivered')::int AS delivered,
            COALESCE(AVG(orders.total_price) FILTER (WHERE orders.status <> 'cancelled'), 0)::float AS avg_order_value
     FROM orders JOIN listings ON listings.id = orders.listing_id
     ${clause}`,
    values
  );
  return result.rows[0];
}

// Yield analytics from harvested crop cycles. Farmers see their own farm;
// admins see the whole platform. Yield per acre uses the plot's area.
function yieldScope(role, userId) {
  if (role === 'admin') return { clause: '', values: [] };
  return { clause: 'AND farm_profiles.user_id = $1', values: [userId] };
}

export async function getYieldByCrop(role, userId) {
  const { clause, values } = yieldScope(role, userId);
  const result = await query(
    `SELECT crop_cycles.crop_name, crop_cycles.yield_unit AS unit,
            COUNT(*)::int AS harvests,
            SUM(crop_cycles.harvested_quantity)::float AS total_quantity,
            (SUM(crop_cycles.harvested_quantity) / NULLIF(SUM(plots.area) FILTER (WHERE plots.area > 0), 0))::float AS per_acre
     FROM crop_cycles
     JOIN plots ON plots.id = crop_cycles.plot_id
     JOIN farm_profiles ON farm_profiles.id = plots.farm_profile_id
     WHERE crop_cycles.status = 'harvested' AND crop_cycles.harvested_quantity IS NOT NULL ${clause}
     GROUP BY crop_cycles.crop_name, crop_cycles.yield_unit
     ORDER BY total_quantity DESC`,
    values
  );
  return result.rows;
}

export async function getYieldOverTime(role, userId) {
  const { clause, values } = yieldScope(role, userId);
  const result = await query(
    `SELECT to_char(date_trunc('month', COALESCE(crop_cycles.harvest_date, crop_cycles.created_at::date)), 'YYYY-MM') AS month,
            SUM(crop_cycles.harvested_quantity)::float AS total_quantity
     FROM crop_cycles
     JOIN plots ON plots.id = crop_cycles.plot_id
     JOIN farm_profiles ON farm_profiles.id = plots.farm_profile_id
     WHERE crop_cycles.status = 'harvested' AND crop_cycles.harvested_quantity IS NOT NULL ${clause}
     GROUP BY 1 ORDER BY 1`,
    values
  );
  return result.rows;
}

export async function getCycleStatusCounts(role, userId) {
  const { clause, values } = yieldScope(role, userId);
  const result = await query(
    `SELECT crop_cycles.status, COUNT(*)::int AS count
     FROM crop_cycles
     JOIN plots ON plots.id = crop_cycles.plot_id
     JOIN farm_profiles ON farm_profiles.id = plots.farm_profile_id
     WHERE true ${clause}
     GROUP BY crop_cycles.status`,
    values
  );
  return result.rows;
}
