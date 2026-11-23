import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { reportsAnalytics, marketplaceAnalytics, yieldAnalytics } from '../controllers/analyticsController.js';

const router = Router();

router.use(authenticate);
router.get('/reports', reportsAnalytics);
router.get('/marketplace', marketplaceAnalytics);
router.get('/yield', yieldAnalytics);

export default router;
