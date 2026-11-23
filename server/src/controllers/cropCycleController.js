import { findPlotWithOwner } from '../models/plotModel.js';
import {
  createCropCycle,
  findCropCyclesForOwner,
  findCropCycleWithOwner,
  updateCropCycle,
  deleteCropCycle,
} from '../models/cropCycleModel.js';

const STATUSES = ['planned', 'sown', 'growing', 'harvested', 'failed'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Normalizes and validates the body; returns { fields } or { error }.
function parseBody(body, { requireCrop }) {
  const { cropName, sownDate, expectedHarvestDate, harvestDate, harvestedQuantity, yieldUnit, status, notes } = body;
  if (requireCrop && (!cropName || !String(cropName).trim())) return { error: 'cropName is required' };
  if (status !== undefined && !STATUSES.includes(status)) {
    return { error: `status must be one of ${STATUSES.join(', ')}` };
  }
  for (const [name, value] of Object.entries({ sownDate, expectedHarvestDate, harvestDate })) {
    if (value && !DATE_RE.test(value)) return { error: `${name} must be a YYYY-MM-DD date` };
  }
  if (sownDate && expectedHarvestDate && expectedHarvestDate < sownDate) {
    return { error: 'expectedHarvestDate cannot be before sownDate' };
  }
  let qty;
  if (harvestedQuantity !== undefined && harvestedQuantity !== null && harvestedQuantity !== '') {
    qty = Number(harvestedQuantity);
    if (!Number.isFinite(qty) || qty < 0) return { error: 'harvestedQuantity must be a non-negative number' };
  }
  const empty = (v) => (v === '' ? null : v);
  return {
    fields: {
      cropName: cropName !== undefined ? String(cropName).trim() : undefined,
      sownDate: empty(sownDate),
      expectedHarvestDate: empty(expectedHarvestDate),
      harvestDate: empty(harvestDate),
      harvestedQuantity: harvestedQuantity === '' ? null : qty,
      yieldUnit: yieldUnit || undefined,
      status,
      notes: empty(notes),
    },
  };
}

export async function listCropCycles(req, res, next) {
  try {
    const cycles = await findCropCyclesForOwner(req.user.id, req.query.plotId);
    res.json({ cycles });
  } catch (err) {
    next(err);
  }
}

export async function createCropCycleHandler(req, res, next) {
  try {
    const plot = await findPlotWithOwner(req.body.plotId);
    if (!plot || plot.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this plot' });
    }
    const { fields, error } = parseBody(req.body, { requireCrop: true });
    if (error) return res.status(400).json({ error });
    if (fields.status === 'harvested' && !fields.harvestDate) {
      fields.harvestDate = new Date().toISOString().slice(0, 10);
    }
    const cycle = await createCropCycle(plot.id, fields);
    res.status(201).json({ cycle: { ...cycle, plot_name: plot.name } });
  } catch (err) {
    next(err);
  }
}

export async function updateCropCycleHandler(req, res, next) {
  try {
    const existing = await findCropCycleWithOwner(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Crop cycle not found' });
    if (existing.owner_id !== req.user.id) return res.status(403).json({ error: 'You do not own this crop cycle' });

    const { fields, error } = parseBody(req.body, { requireCrop: false });
    if (error) return res.status(400).json({ error });
    if (fields.status === 'harvested' && !fields.harvestDate && !existing.harvest_date) {
      fields.harvestDate = new Date().toISOString().slice(0, 10);
    }
    const cycle = await updateCropCycle(req.params.id, fields);
    res.json({ cycle });
  } catch (err) {
    next(err);
  }
}

export async function deleteCropCycleHandler(req, res, next) {
  try {
    const existing = await findCropCycleWithOwner(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Crop cycle not found' });
    if (existing.owner_id !== req.user.id) return res.status(403).json({ error: 'You do not own this crop cycle' });
    await deleteCropCycle(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
