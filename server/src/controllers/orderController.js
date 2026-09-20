import {
  createOrder,
  findOrdersForBuyer,
  findOrdersForFarmer,
  findAllOrders,
  findOrderWithListing,
  updateOrderStatus,
  InsufficientStockError,
  ListingUnavailableError,
} from '../models/orderModel.js';
import { findListingById } from '../models/listingModel.js';

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export async function createOrderHandler(req, res, next) {
  try {
    const { listingId, quantity } = req.body;
    if (!listingId || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({ error: 'listingId and a positive quantity are required' });
    }

    const listing = await findListingById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (listing.farmer_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot order your own listing' });
    }

    const order = await createOrder({ listingId, buyerId: req.user.id, quantity: Number(quantity) });
    res.status(201).json({ order });
  } catch (err) {
    if (err instanceof InsufficientStockError || err instanceof ListingUnavailableError) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

export async function listOrders(req, res, next) {
  try {
    if (req.user.role === 'admin') {
      return res.json({ orders: await findAllOrders() });
    }
    if (req.user.role === 'farmer') {
      return res.json({ orders: await findOrdersForFarmer(req.user.id) });
    }
    res.json({ orders: await findOrdersForBuyer(req.user.id) });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatusHandler(req, res, next) {
  try {
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${ORDER_STATUSES.join(', ')}` });
    }

    const order = await findOrderWithListing(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isFarmerOwner = order.farmer_id === req.user.id;
    const isBuyer = order.buyer_id === req.user.id;

    if (isAdmin || isFarmerOwner) {
      // farmer/admin can move the order through any status
    } else if (isBuyer) {
      if (status !== 'cancelled' || order.status !== 'pending') {
        return res.status(403).json({ error: 'Buyers can only cancel a pending order' });
      }
    } else {
      return res.status(403).json({ error: 'You are not part of this order' });
    }

    const updated = await updateOrderStatus(req.params.id, status);
    res.json({ order: updated });
  } catch (err) {
    next(err);
  }
}
