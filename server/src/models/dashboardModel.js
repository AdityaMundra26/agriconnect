import { query } from '../config/db.js';

const one = async (sql, values = []) => (await query(sql, values)).rows[0];
const many = async (sql, values = []) => (await query(sql, values)).rows;

export async function farmerSummary(userId) {
  const [stats, recentOrders, upcomingHarvests, recentReports] = await Promise.all([
    one(
      `SELECT
         (SELECT COUNT(*)::int FROM plots JOIN farm_profiles fp ON fp.id = plots.farm_profile_id WHERE fp.user_id = $1) AS plots,
         (SELECT COALESCE(SUM(plots.area), 0)::float FROM plots JOIN farm_profiles fp ON fp.id = plots.farm_profile_id WHERE fp.user_id = $1) AS plot_area,
         (SELECT COUNT(*)::int FROM crop_cycles cc JOIN plots ON plots.id = cc.plot_id JOIN farm_profiles fp ON fp.id = plots.farm_profile_id
            WHERE fp.user_id = $1 AND cc.status IN ('sown', 'growing')) AS active_cycles,
         (SELECT COUNT(*)::int FROM listings WHERE farmer_id = $1 AND status = 'active') AS active_listings,
         (SELECT COUNT(*)::int FROM orders JOIN listings ON listings.id = orders.listing_id
            WHERE listings.farmer_id = $1 AND orders.status = 'pending') AS pending_orders,
         (SELECT COALESCE(SUM(orders.total_price), 0)::float FROM orders JOIN listings ON listings.id = orders.listing_id
            WHERE listings.farmer_id = $1 AND orders.status <> 'cancelled') AS revenue,
         (SELECT COUNT(*)::int FROM field_reports WHERE user_id = $1 AND status IN ('open', 'in_progress')) AS open_reports,
         (SELECT EXISTS (SELECT 1 FROM farm_profiles WHERE user_id = $1)) AS has_farm`,
      [userId]
    ),
    many(
      `SELECT orders.id, orders.quantity, orders.total_price, orders.status, orders.created_at,
              listings.crop_name, listings.unit, users.name AS buyer_name
       FROM orders JOIN listings ON listings.id = orders.listing_id JOIN users ON users.id = orders.buyer_id
       WHERE listings.farmer_id = $1 ORDER BY orders.created_at DESC LIMIT 5`,
      [userId]
    ),
    many(
      `SELECT cc.id, cc.crop_name, cc.status, cc.sown_date, cc.expected_harvest_date, plots.name AS plot_name
       FROM crop_cycles cc JOIN plots ON plots.id = cc.plot_id JOIN farm_profiles fp ON fp.id = plots.farm_profile_id
       WHERE fp.user_id = $1 AND cc.status IN ('planned', 'sown', 'growing')
       ORDER BY cc.expected_harvest_date ASC NULLS LAST LIMIT 5`,
      [userId]
    ),
    many(
      `SELECT id, description, category, severity, status, created_at FROM field_reports
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 4`,
      [userId]
    ),
  ]);
  return { stats, recentOrders, upcomingHarvests, recentReports };
}

export async function buyerSummary(userId) {
  const [stats, recentOrders, freshListings] = await Promise.all([
    one(
      `SELECT
         (SELECT COUNT(*)::int FROM orders WHERE buyer_id = $1) AS orders,
         (SELECT COUNT(*)::int FROM orders WHERE buyer_id = $1 AND status IN ('pending', 'confirmed', 'shipped')) AS in_progress,
         (SELECT COUNT(*)::int FROM orders WHERE buyer_id = $1 AND status = 'delivered') AS delivered,
         (SELECT COALESCE(SUM(total_price), 0)::float FROM orders WHERE buyer_id = $1 AND status <> 'cancelled') AS spent,
         (SELECT COUNT(*)::int FROM listings WHERE status = 'active') AS available_listings,
         (SELECT COUNT(DISTINCT farmer_id)::int FROM listings WHERE status = 'active') AS active_sellers`,
      [userId]
    ),
    many(
      `SELECT orders.id, orders.quantity, orders.total_price, orders.status, orders.created_at,
              listings.crop_name, listings.unit, users.name AS farmer_name
       FROM orders JOIN listings ON listings.id = orders.listing_id JOIN users ON users.id = listings.farmer_id
       WHERE orders.buyer_id = $1 ORDER BY orders.created_at DESC LIMIT 5`,
      [userId]
    ),
    many(
      `SELECT listings.id, listings.crop_name, listings.quantity, listings.unit, listings.unit_price,
              users.name AS farmer_name, COALESCE(listings.location, fp.location) AS seller_location
       FROM listings JOIN users ON users.id = listings.farmer_id
       LEFT JOIN farm_profiles fp ON fp.user_id = listings.farmer_id
       WHERE listings.status = 'active' ORDER BY listings.created_at DESC LIMIT 4`
    ),
  ]);
  return { stats, recentOrders, freshListings };
}

export async function adminSummary() {
  const [stats, usersByRole, recentReports, recentUsers] = await Promise.all([
    one(
      `SELECT
         (SELECT COUNT(*)::int FROM users) AS users,
         (SELECT COUNT(*)::int FROM listings WHERE status = 'active') AS active_listings,
         (SELECT COUNT(*)::int FROM orders) AS orders,
         (SELECT COALESCE(SUM(total_price), 0)::float FROM orders WHERE status <> 'cancelled') AS gmv,
         (SELECT COUNT(*)::int FROM field_reports WHERE status IN ('open', 'in_progress')) AS open_reports,
         (SELECT COUNT(*)::int FROM field_reports WHERE status IN ('open', 'in_progress') AND severity IN ('high', 'critical')) AS urgent_reports`
    ),
    many(`SELECT role, COUNT(*)::int AS count FROM users GROUP BY role ORDER BY role`),
    many(
      `SELECT fr.id, fr.description, fr.category, fr.severity, fr.status, fr.created_at, users.name AS reporter_name
       FROM field_reports fr JOIN users ON users.id = fr.user_id
       WHERE fr.status IN ('open', 'in_progress')
       ORDER BY CASE fr.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, fr.created_at DESC
       LIMIT 5`
    ),
    many(`SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5`),
  ]);
  return { stats, usersByRole, recentReports, recentUsers };
}

export async function listUsersWithActivity() {
  return many(
    `SELECT users.id, users.name, users.email, users.role, users.created_at,
            (SELECT COUNT(*)::int FROM listings WHERE farmer_id = users.id) AS listings,
            (SELECT COUNT(*)::int FROM orders WHERE buyer_id = users.id) AS orders,
            (SELECT COUNT(*)::int FROM field_reports WHERE user_id = users.id) AS reports
     FROM users ORDER BY users.created_at DESC`
  );
}
