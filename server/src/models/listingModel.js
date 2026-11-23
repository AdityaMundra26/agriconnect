import { query } from '../config/db.js';

// Every listing read joins the seller's name and farm location so the
// marketplace can show "who / where" without extra requests.
const LISTING_SELECT = `
  SELECT listings.*, users.name AS farmer_name,
         COALESCE(listings.location, farm_profiles.location) AS seller_location,
         (SELECT COUNT(*)::int FROM orders WHERE orders.listing_id = listings.id) AS order_count
  FROM listings
  JOIN users ON users.id = listings.farmer_id
  LEFT JOIN farm_profiles ON farm_profiles.user_id = listings.farmer_id`;

const SORTS = {
  newest: 'listings.created_at DESC',
  price_asc: 'listings.unit_price ASC',
  price_desc: 'listings.unit_price DESC',
  quantity_desc: 'listings.quantity DESC',
};

export async function createListing({ farmerId, cropName, quantity, unit, unitPrice, qualityNotes, location }) {
  const result = await query(
    `INSERT INTO listings (farmer_id, crop_name, quantity, unit, unit_price, quality_notes, location)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [farmerId, cropName, quantity, unit || 'kg', unitPrice, qualityNotes || null, location || null]
  );
  return findListingDetailed(result.rows[0].id);
}

export async function findListingById(id) {
  const result = await query('SELECT * FROM listings WHERE id = $1', [id]);
  return result.rows[0];
}

export async function findListingDetailed(id) {
  const result = await query(`${LISTING_SELECT} WHERE listings.id = $1`, [id]);
  return result.rows[0];
}

export async function findActiveListings({ cropName, minPrice, maxPrice, sort } = {}) {
  const conditions = [`listings.status = 'active'`];
  const values = [];

  if (cropName) { values.push(`%${cropName}%`); conditions.push(`listings.crop_name ILIKE $${values.length}`); }
  if (minPrice !== undefined) { values.push(minPrice); conditions.push(`listings.unit_price >= $${values.length}`); }
  if (maxPrice !== undefined) { values.push(maxPrice); conditions.push(`listings.unit_price <= $${values.length}`); }

  const result = await query(
    `${LISTING_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY ${SORTS[sort] || SORTS.newest}`,
    values
  );
  return result.rows;
}

export async function findListingsByFarmer(farmerId) {
  const result = await query(`${LISTING_SELECT} WHERE listings.farmer_id = $1 ORDER BY listings.created_at DESC`, [farmerId]);
  return result.rows;
}

// Admin moderation view - every listing regardless of status or owner.
export async function findAllListings() {
  const result = await query(`${LISTING_SELECT} ORDER BY listings.created_at DESC`);
  return result.rows;
}

export async function updateListing(id, fields) {
  const columns = {
    cropName: 'crop_name',
    quantity: 'quantity',
    unit: 'unit',
    unitPrice: 'unit_price',
    qualityNotes: 'quality_notes',
    location: 'location',
    status: 'status',
  };

  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(columns)) {
    if (fields[key] !== undefined) {
      values.push(fields[key]);
      sets.push(`${column} = $${values.length}`);
    }
  }

  if (sets.length > 0) {
    values.push(id);
    await query(`UPDATE listings SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
  }
  return findListingDetailed(id);
}
