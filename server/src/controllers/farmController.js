import {
  createFarmProfile,
  findFarmProfileByUserId,
  findFarmProfileById,
  updateFarmProfile,
} from '../models/farmModel.js';

const IRRIGATION_TYPES = ['none', 'rainfed', 'canal', 'borewell', 'drip', 'sprinkler'];

export async function getMyFarm(req, res, next) {
  try {
    const farm = await findFarmProfileByUserId(req.user.id);
    if (!farm) {
      return res.status(404).json({ error: 'No farm profile yet' });
    }
    res.json({ farm });
  } catch (err) {
    next(err);
  }
}

export async function createFarm(req, res, next) {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ error: 'Only farmers can create a farm profile' });
    }

    const existing = await findFarmProfileByUserId(req.user.id);
    if (existing) {
      return res.status(409).json({ error: 'Farm profile already exists for this user' });
    }

    const { location, latitude, longitude, soilType, irrigationAccess, landSize, preferredCrops } = req.body;

    if (!location) {
      return res.status(400).json({ error: 'location is required' });
    }
    if (irrigationAccess && !IRRIGATION_TYPES.includes(irrigationAccess)) {
      return res.status(400).json({ error: `irrigationAccess must be one of ${IRRIGATION_TYPES.join(', ')}` });
    }

    const farm = await createFarmProfile({
      userId: req.user.id,
      location,
      latitude,
      longitude,
      soilType,
      irrigationAccess: irrigationAccess || 'rainfed',
      landSize,
      preferredCrops,
    });

    res.status(201).json({ farm });
  } catch (err) {
    next(err);
  }
}

export async function updateFarm(req, res, next) {
  try {
    const farm = await findFarmProfileById(req.params.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm profile not found' });
    }
    if (farm.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this farm profile' });
    }

    const { location, latitude, longitude, soilType, irrigationAccess, landSize, preferredCrops } = req.body;
    if (irrigationAccess && !IRRIGATION_TYPES.includes(irrigationAccess)) {
      return res.status(400).json({ error: `irrigationAccess must be one of ${IRRIGATION_TYPES.join(', ')}` });
    }

    const updated = await updateFarmProfile(req.params.id, {
      location,
      latitude,
      longitude,
      soilType,
      irrigationAccess,
      landSize,
      preferredCrops,
    });

    res.json({ farm: updated });
  } catch (err) {
    next(err);
  }
}
