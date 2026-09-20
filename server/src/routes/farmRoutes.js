import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMyFarm, createFarm, updateFarm } from '../controllers/farmController.js';

const router = Router();

router.use(authenticate);
router.get('/me', getMyFarm);
router.post('/', createFarm);
router.put('/:id', updateFarm);

export default router;
