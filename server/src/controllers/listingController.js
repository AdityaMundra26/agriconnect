import {
  createListing,
  findListingById,
  findActiveListings,
  findListingsByFarmer,
  findAllListings,
  updateListing,
} from '../models/listingModel.js';

const LISTING_STATUSES = ['active', 'sold_out', 'closed'];

export async function browseListings(req, res, next) {
  try {
    const { cropName, minPrice, maxPrice } = req.query;
    const listings = await findActiveListings({
      cropName,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
    res.json({ listings });
  } catch (err) {
    next(err);
  }
}

export async function myListings(req, res, next) {
  try {
    const listings = await findListingsByFarmer(req.user.id);
    res.json({ listings });
  } catch (err) {
    next(err);
  }
}

export async function adminListings(req, res, next) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const listings = await findAllListings();
    res.json({ listings });
  } catch (err) {
    next(err);
  }
}

export async function createListingHandler(req, res, next) {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ error: 'Only farmers can create listings' });
    }

    const { cropName, quantity, unit, unitPrice, qualityNotes } = req.body;
    if (!cropName || !quantity || !unitPrice) {
      return res.status(400).json({ error: 'cropName, quantity and unitPrice are required' });
    }
    if (Number(quantity) <= 0 || Number(unitPrice) <= 0) {
      return res.status(400).json({ error: 'quantity and unitPrice must be positive' });
    }

    const listing = await createListing({
      farmerId: req.user.id,
      cropName,
      quantity: Number(quantity),
      unit,
      unitPrice: Number(unitPrice),
      qualityNotes,
    });

    res.status(201).json({ listing });
  } catch (err) {
    next(err);
  }
}

export async function updateListingHandler(req, res, next) {
  try {
    const listing = await findListingById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (listing.farmer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not own this listing' });
    }

    const { quantity, unitPrice, qualityNotes, status } = req.body;
    if (status && !LISTING_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${LISTING_STATUSES.join(', ')}` });
    }
    if (quantity !== undefined && Number(quantity) < 0) {
      return res.status(400).json({ error: 'quantity cannot be negative' });
    }
    if (unitPrice !== undefined && Number(unitPrice) <= 0) {
      return res.status(400).json({ error: 'unitPrice must be positive' });
    }

    const updated = await updateListing(req.params.id, {
      quantity: quantity !== undefined ? Number(quantity) : undefined,
      unitPrice: unitPrice !== undefined ? Number(unitPrice) : undefined,
      qualityNotes,
      status,
    });

    res.json({ listing: updated });
  } catch (err) {
    next(err);
  }
}
