import { findPlotWithOwner } from '../models/plotModel.js';
import { findFarmProfileById } from '../models/farmModel.js';
import { findCropCyclesForOwner } from '../models/cropCycleModel.js';
import { getCurrentWeather } from '../services/weatherService.js';
import { generateAdvisory } from '../services/advisoryService.js';

export async function getAdvisory(req, res, next) {
  try {
    const plot = await findPlotWithOwner(req.params.plotId);
    if (!plot) return res.status(404).json({ error: 'Plot not found' });
    if (plot.owner_id !== req.user.id) return res.status(403).json({ error: 'You do not own this plot' });

    const [farm, cycles] = await Promise.all([
      findFarmProfileById(plot.farm_profile_id),
      findCropCyclesForOwner(req.user.id, plot.id),
    ]);
    const weather = await getCurrentWeather(farm.location);
    const activeCycles = cycles.filter((c) => ['planned', 'sown', 'growing'].includes(c.status));
    const advisory = generateAdvisory({ farm, plot, weather, activeCycles });

    res.json({ advisory });
  } catch (err) {
    next(err);
  }
}
