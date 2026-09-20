import { query } from '../config/db.js';

export async function createListing({ farmerId, cropName, quantity, unit, unitPrice, qualityNotes }) {
  const result = await query(
    `INSERT INTO listings (farmer_id, crop_name, quantity, unit, unit_price, quality_notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [farmerId, cropName, quantity, unit || 'kg', unitPrice, qualityNotes ?? null]
  );
  return result.rows[0];
}

export async function findListingById(id) {
  const result = await query('SELECT * FROM listings WHERE id = $1', [id]);
  return result.rows[0];
}

export async function findActiveListings({ cropName, minPrice, maxPrice } = {}) {
  const conditions = [`status = 'active'`];
  const values = [];
  let i = 1;

  if (cropName) { conditions.push(`crop_name ILIKE $${i++}`); values.push(`%${cropName}%`); }
  if (minPrice) { conditions.push(`unit_price >= $${i++}`); values.push(minPrice); }
  if (maxPrice) { conditions.push(`unit_price <= $${i++}`); values.push(maxPrice); }

  const result = await query(
    `SELECT listings.*, users.name AS farmer_name
     FROM listings
     JOIN users ON users.id = listings.farmer_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY listings.created_at DESC`,
    values
  );
  return result.rows;
}

export async function findListingsByFarmer(farmerId) {
  const result = await query(
    'SELECT * FROM listings WHERE farmer_id = $1 ORDER BY created_at DESC',
    [farmerId]
  );
  return result.rows;
}

// Admin moderation view - every listing regardless of status or owner.
export async function findAllListings() {
  const result = await query(
    `SELECT listings.*, users.name AS farmer_name
     FROM listings
     JOIN users ON users.id = listings.farmer_id
     ORDER BY listings.created_at DESC`
  );
  return result.rows;
}

export async function updateListing(id, fields) {
  const columns = {
    quantity: 'quantity',
    unitPrice: 'unit_price',
    qualityNotes: 'quality_notes',
    status: 'status',
  };

  const sets = [];
  const values = [];
  let i = 1;

  for (const [key, column] of Object.entries(columns)) {
    if (fields[key] !== undefined) {
      sets.push(`${column} = $${i}`);
      values.push(fields[key]);
      i += 1;
    }
  }

  if (sets.length === 0) {
    return findListingById(id);
  }

  values.push(id);
  const result = await query(
    `UPDATE listings SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0];
}
