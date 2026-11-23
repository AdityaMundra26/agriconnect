import {
  createOrder,
  findOrdersForBuyer,
  findOrdersForFarmer,
  findAllOrders,
  findOrderWithListing,
  transitionOrderStatus,
  InsufficientStockError,
  ListingUnavailableError,
  InvalidTransitionError,
} from '../models/orderModel.js';
import { findListingById } from '../models/listingModel.js';
import { notify } from '../services/notificationService.js';

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export async function createOrderHandler(req, res, next) {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ error: 'Only buyer accounts can place orders' });
    }
    const { listingId, quantity, deliveryAddress } = req.body;
    const qty = Number(quantity);
    if (!listingId || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: 'listingId and a positive quantity are required' });
    }

    const listing = await findListingById(listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.farmer_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot order your own listing' });
    }

    const { order, listing: updatedListing } = await createOrder({
      listingId,
      buyerId: req.user.id,
      quantity: qty,
      deliveryAddress,
    });

    await notify(
      listing.farmer_id,
      `New order #${order.id}: ${qty} ${listing.unit} of ${listing.crop_name} (₹${order.total_price})`,
      { type: 'order', link: '/orders', sms: true, smsText: `New order #${order.id} for ${qty} ${listing.unit} ${listing.crop_name} worth Rs ${order.total_price}. Open AgriConnect to confirm.` }
    );
    if (updatedListing.status === 'sold_out') {
      await notify(listing.farmer_id, `Your ${listing.crop_name} listing is now sold out`, {
        type: 'listing',
        link: '/marketplace',
      });
    }

    res.status(201).json({ order: await findOrderWithListing(order.id) });
  } catch (err) {
    if (err instanceof InsufficientStockError || err instanceof ListingUnavailableError) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

export async function listOrders(req, res, next) {
  try {
    if (req.user.role === 'admin') return res.json({ orders: await findAllOrders() });
    if (req.user.role === 'farmer') return res.json({ orders: await findOrdersForFarmer(req.user.id) });
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
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const isAdmin = req.user.role === 'admin';
    const isFarmerOwner = order.farmer_id === req.user.id;
    const isBuyer = order.buyer_id === req.user.id;

    if (!isAdmin && !isFarmerOwner) {
      if (!isBuyer) return res.status(403).json({ error: 'You are not part of this order' });
      if (status !== 'cancelled' || order.status !== 'pending') {
        return res.status(403).json({ error: 'Buyers can only cancel a pending order' });
      }
    }

    const updated = await transitionOrderStatus(req.params.id, status);

    const label = `Order #${order.id} (${order.crop_name})`;
    if (isBuyer && !isFarmerOwner && !isAdmin) {
      await notify(order.farmer_id, `${label} was cancelled by the buyer`, { type: 'order', link: '/orders', sms: true });
    } else {
      await notify(order.buyer_id, `${label} is now ${status}`, { type: 'order', link: '/orders', sms: true });
      if (isAdmin && !isFarmerOwner) {
        await notify(order.farmer_id, `${label} was set to ${status} by an admin`, { type: 'order', link: '/orders' });
      }
    }

    res.json({ order: updated });
  } catch (err) {
    if (err instanceof InvalidTransitionError) return res.status(400).json({ error: err.message });
    next(err);
  }
}
