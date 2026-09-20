import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../controllers/assistantController.js';

const router = Router();

router.use(authenticate);
router.post('/query', query);

export default router;
