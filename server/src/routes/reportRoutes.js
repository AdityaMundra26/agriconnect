import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createReport, listReports, getReport, updateStatus } from '../controllers/reportController.js';

const router = Router();

router.use(authenticate);
router.get('/', listReports);
router.get('/:id', getReport);
router.post('/', createReport);
router.put('/:id/status', updateStatus);

export default router;
