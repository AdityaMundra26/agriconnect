import { findFarmProfileByUserId } from '../models/farmModel.js';
import {
  createPlot,
  findPlotsByFarmProfileId,
  findPlotWithOwner,
  updatePlot,
  deletePlot,
} from '../models/plotModel.js';

export async function listPlots(req, res, next) {
  try {
    const farm = await findFarmProfileByUserId(req.user.id);
    if (!farm) {
      return res.json({ plots: [] });
    }
    const plots = await findPlotsByFarmProfileId(farm.id);
    res.json({ plots });
  } catch (err) {
    next(err);
  }
}

export async function getPlot(req, res, next) {
  try {
    const plot = await findPlotWithOwner(req.params.id);
    if (!plot) {
      return res.status(404).json({ error: 'Plot not found' });
    }
    if (plot.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this plot' });
    }
    res.json({ plot });
  } catch (err) {
    next(err);
  }
}

export async function createPlotHandler(req, res, next) {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ error: 'Only farmers can add plots' });
    }

    const farm = await findFarmProfileByUserId(req.user.id);
    if (!farm) {
      return res.status(400).json({ error: 'Create a farm profile before adding plots' });
    }

    const { name, area, cropHistory } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const plot = await createPlot({ farmProfileId: farm.id, name, area, cropHistory });
    res.status(201).json({ plot });
  } catch (err) {
    next(err);
  }
}

export async function updatePlotHandler(req, res, next) {
  try {
    const plot = await findPlotWithOwner(req.params.id);
    if (!plot) {
      return res.status(404).json({ error: 'Plot not found' });
    }
    if (plot.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this plot' });
    }

    const { name, area, cropHistory } = req.body;
    const updated = await updatePlot(req.params.id, { name, area, cropHistory });
    res.json({ plot: updated });
  } catch (err) {
    next(err);
  }
}

export async function deletePlotHandler(req, res, next) {
  try {
    const plot = await findPlotWithOwner(req.params.id);
    if (!plot) {
      return res.status(404).json({ error: 'Plot not found' });
    }
    if (plot.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not own this plot' });
    }

    await deletePlot(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
