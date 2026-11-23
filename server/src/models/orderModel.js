import { query, pool } from '../config/db.js';

export class InsufficientStockError extends Error {}
export class ListingUnavailableError extends Error {}
export class InvalidTransitionError extends Error {}

// Allowed forward moves through the order lifecycle. Terminal states
// (delivered, cancelled) have no outgoing transitions.
export const ORDER_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const ORDER_SELECT = `
  SELECT orders.*, listings.crop_name, listings.unit, listings.unit_price, listings.farmer_id,
         buyer.name AS buyer_name, farmer.name AS farmer_name
  FROM orders
  JOIN listings ON listings.id = orders.listing_id
  JOIN users buyer ON buyer.id = orders.buyer_id
  JOIN users farmer ON farmer.id = listings.farmer_id`;

// Locks the listing row so two concurrent orders can't both succeed
// past the available quantity.
export async function createOrder({ listingId, buyerId, quantity, deliveryAddress }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const listingResult = await client.query('SELECT * FROM listings WHERE id = $1 FOR UPDATE', [listingId]);
    const listing = listingResult.rows[0];
    if (!listing) throw new ListingUnavailableError('Listing not found');
    if (listing.status !== 'active') throw new ListingUnavailableError('Listing is not active');
    if (Number(listing.quantity) < quantity) {
      throw new InsufficientStockError(`Only ${Number(listing.quantity)} ${listing.unit} available`);
    }

    const totalPrice = Math.round(quantity * Number(listing.unit_price) * 100) / 100;
    const remaining = Math.round((Number(listing.quantity) - quantity) * 100) / 100;
    const newStatus = remaining <= 0 ? 'sold_out' : listing.status;

    await client.query('UPDATE listings SET quantity = $1, status = $2 WHERE id = $3', [remaining, newStatus, listingId]);

    const orderResult = await client.query(
      `INSERT INTO orders (listing_id, buyer_id, quantity, total_price, delivery_address)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [listingId, buyerId, quantity, totalPrice, deliveryAddress || null]
    );

    await client.query('COMMIT');
    return { order: orderResult.rows[0], listing: { ...listing, quantity: remaining, status: newStatus } };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function findOrdersForBuyer(buyerId) {
  const result = await query(`${ORDER_SELECT} WHERE orders.buyer_id = $1 ORDER BY orders.created_at DESC`, [buyerId]);
  return result.rows;
}

export async function findOrdersForFarmer(farmerId) {
  const result = await query(`${ORDER_SELECT} WHERE listings.farmer_id = $1 ORDER BY orders.created_at DESC`, [farmerId]);
  return result.rows;
}

export async function findAllOrders() {
  const result = await query(`${ORDER_SELECT} ORDER BY orders.created_at DESC`);
  return result.rows;
}

export async function findOrderWithListing(id) {
  const result = await query(`${ORDER_SELECT} WHERE orders.id = $1`, [id]);
  return result.rows[0];
}

// Changes status inside a transaction. Cancelling returns the ordered
// quantity to the listing (and re-activates it if it had sold out).
export async function transitionOrderStatus(id, status) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
    const order = orderResult.rows[0];
    if (!order) throw new InvalidTransitionError('Order not found');

    if (!ORDER_TRANSITIONS[order.status].includes(status)) {
      throw new InvalidTransitionError(`Cannot move an order from ${order.status} to ${status}`);
    }

    if (status === 'cancelled') {
      await client.query(
        `UPDATE listings
         SET quantity = quantity + $1,
             status = CASE WHEN status = 'sold_out' THEN 'active'::listing_status ELSE status END
         WHERE id = $2`,
        [order.quantity, order.listing_id]
      );
    }

    await client.query('UPDATE orders SET status = $1, updated_at = now() WHERE id = $2', [status, id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return findOrderWithListing(id);
}
