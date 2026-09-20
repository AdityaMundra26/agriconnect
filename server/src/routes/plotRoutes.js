import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listPlots,
  getPlot,
  createPlotHandler,
  updatePlotHandler,
  deletePlotHandler,
} from '../controllers/plotController.js';

const router = Router();

router.use(authenticate);
router.get('/', listPlots);
router.get('/:id', getPlot);
router.post('/', createPlotHandler);
router.put('/:id', updatePlotHandler);
router.delete('/:id', deletePlotHandler);

export default router;
