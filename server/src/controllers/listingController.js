import {
  createListing,
  findListingById,
  findActiveListings,
  findListingsByFarmer,
  findAllListings,
  updateListing,
} from '../models/listingModel.js';
import { notify } from '../services/notificationService.js';

const LISTING_STATUSES = ['active', 'sold_out', 'closed'];
const UNITS = ['kg', 'quintal', 'tonne', 'dozen', 'crate', 'litre'];

function optionalNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export async function browseListings(req, res, next) {
  try {
    const { cropName, sort } = req.query;
    const minPrice = optionalNumber(req.query.minPrice);
    const maxPrice = optionalNumber(req.query.maxPrice);
    if (Number.isNaN(minPrice) || Number.isNaN(maxPrice)) {
      return res.status(400).json({ error: 'minPrice and maxPrice must be numbers' });
    }
    const listings = await findActiveListings({ cropName, minPrice, maxPrice, sort });
    res.json({ listings });
  } catch (err) {
    next(err);
  }
}

export async function myListings(req, res, next) {
  try {
    res.json({ listings: await findListingsByFarmer(req.user.id) });
  } catch (err) {
    next(err);
  }
}

export async function adminListings(req, res, next) {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    res.json({ listings: await findAllListings() });
  } catch (err) {
    next(err);
  }
}

export async function createListingHandler(req, res, next) {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ error: 'Only farmers can create listings' });
    }

    const { cropName, unit, qualityNotes, location } = req.body;
    const quantity = Number(req.body.quantity);
    const unitPrice = Number(req.body.unitPrice);
    if (!cropName || !String(cropName).trim()) return res.status(400).json({ error: 'cropName is required' });
    if (!Number.isFinite(quantity) || quantity <= 0) return res.status(400).json({ error: 'quantity must be a positive number' });
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return res.status(400).json({ error: 'unitPrice must be a positive number' });
    if (unit && !UNITS.includes(unit)) return res.status(400).json({ error: `unit must be one of ${UNITS.join(', ')}` });

    const listing = await createListing({
      farmerId: req.user.id,
      cropName: String(cropName).trim(),
      quantity,
      unit,
      unitPrice,
      qualityNotes,
      location,
    });

    res.status(201).json({ listing });
  } catch (err) {
    next(err);
  }
}

export async function updateListingHandler(req, res, next) {
  try {
    const listing = await findListingById(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const isOwner = listing.farmer_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'You do not own this listing' });

    const { cropName, unit, qualityNotes, location, status } = req.body;
    const quantity = optionalNumber(req.body.quantity);
    const unitPrice = optionalNumber(req.body.unitPrice);

    if (status !== undefined && !LISTING_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${LISTING_STATUSES.join(', ')}` });
    }
    if (unit !== undefined && !UNITS.includes(unit)) {
      return res.status(400).json({ error: `unit must be one of ${UNITS.join(', ')}` });
    }
    if (Number.isNaN(quantity) || (quantity !== undefined && quantity < 0)) {
      return res.status(400).json({ error: 'quantity must be a non-negative number' });
    }
    if (Number.isNaN(unitPrice) || (unitPrice !== undefined && unitPrice <= 0)) {
      return res.status(400).json({ error: 'unitPrice must be a positive number' });
    }
    // Admins moderate (status only); content edits belong to the owner.
    if (!isOwner && [cropName, unit, qualityNotes, location, quantity, unitPrice].some((v) => v !== undefined)) {
      return res.status(403).json({ error: 'Admins can only change a listing\'s status' });
    }

    // Re-activating with zero stock would let buyers order nothing.
    const effectiveQty = quantity ?? Number(listing.quantity);
    let nextStatus = status;
    if ((status ?? listing.status) === 'active' && effectiveQty <= 0) {
      return res.status(400).json({ error: 'Add stock before marking the listing active' });
    }
    if (quantity !== undefined && quantity > 0 && listing.status === 'sold_out' && status === undefined) {
      nextStatus = 'active';
    }

    const updated = await updateListing(req.params.id, {
      cropName: cropName !== undefined ? String(cropName).trim() : undefined,
      quantity,
      unit,
      unitPrice,
      qualityNotes,
      location,
      status: nextStatus,
    });

    if (isAdmin && !isOwner && status && status !== listing.status) {
      await notify(
        listing.farmer_id,
        `An admin set your ${listing.crop_name} listing to ${status.replace('_', ' ')}`,
        { type: 'listing', link: '/marketplace' }
      );
    }

    res.json({ listing: updated });
  } catch (err) {
    next(err);
  }
}
