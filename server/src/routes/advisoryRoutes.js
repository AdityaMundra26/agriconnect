import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getAdvisory } from '../controllers/advisoryController.js';

const router = Router();

router.use(authenticate);
router.get('/:plotId', getAdvisory);

export default router;
