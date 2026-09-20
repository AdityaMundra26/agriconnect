import { query, pool } from '../config/db.js';

export class InsufficientStockError extends Error {}
export class ListingUnavailableError extends Error {}

// Locks the listing row so two concurrent orders can't both succeed
// past the available quantity.
export async function createOrder({ listingId, buyerId, quantity }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const listingResult = await client.query(
      'SELECT * FROM listings WHERE id = $1 FOR UPDATE',
      [listingId]
    );
    const listing = listingResult.rows[0];
    if (!listing) {
      throw new ListingUnavailableError('Listing not found');
    }
    if (listing.status !== 'active') {
      throw new ListingUnavailableError('Listing is not active');
    }
    if (Number(listing.quantity) < quantity) {
      throw new InsufficientStockError('Not enough quantity available');
    }

    const totalPrice = quantity * Number(listing.unit_price);
    const remaining = Number(listing.quantity) - quantity;
    const newStatus = remaining === 0 ? 'sold_out' : listing.status;

    await client.query('UPDATE listings SET quantity = $1, status = $2 WHERE id = $3', [
      remaining,
      newStatus,
      listingId,
    ]);

    const orderResult = await client.query(
      `INSERT INTO orders (listing_id, buyer_id, quantity, total_price)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [listingId, buyerId, quantity, totalPrice]
    );

    await client.query('COMMIT');
    return orderResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function findOrderById(id) {
  const result = await query('SELECT * FROM orders WHERE id = $1', [id]);
  return result.rows[0];
}

export async function findOrdersForBuyer(buyerId) {
  const result = await query(
    `SELECT orders.*, listings.crop_name, listings.farmer_id
     FROM orders
     JOIN listings ON listings.id = orders.listing_id
     WHERE orders.buyer_id = $1
     ORDER BY orders.created_at DESC`,
    [buyerId]
  );
  return result.rows;
}

export async function findOrdersForFarmer(farmerId) {
  const result = await query(
    `SELECT orders.*, listings.crop_name, listings.farmer_id
     FROM orders
     JOIN listings ON listings.id = orders.listing_id
     WHERE listings.farmer_id = $1
     ORDER BY orders.created_at DESC`,
    [farmerId]
  );
  return result.rows;
}

export async function findAllOrders() {
  const result = await query(
    `SELECT orders.*, listings.crop_name, listings.farmer_id
     FROM orders
     JOIN listings ON listings.id = orders.listing_id
     ORDER BY orders.created_at DESC`
  );
  return result.rows;
}

// Joins to listings so callers can check farmer ownership in one query.
export async function findOrderWithListing(id) {
  const result = await query(
    `SELECT orders.*, listings.farmer_id, listings.crop_name
     FROM orders
     JOIN listings ON listings.id = orders.listing_id
     WHERE orders.id = $1`,
    [id]
  );
  return result.rows[0];
}

export async function updateOrderStatus(id, status) {
  const result = await query(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0];
}
