import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listCropCycles,
  createCropCycleHandler,
  updateCropCycleHandler,
  deleteCropCycleHandler,
} from '../controllers/cropCycleController.js';

const router = Router();

router.use(authenticate);
router.get('/', listCropCycles);
router.post('/', createCropCycleHandler);
router.put('/:id', updateCropCycleHandler);
router.delete('/:id', deleteCropCycleHandler);

export default router;
