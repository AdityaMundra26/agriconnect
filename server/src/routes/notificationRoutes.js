import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listNotifications,
  readNotification,
  readAllNotifications,
  streamNotifications,
} from '../controllers/notificationController.js';

const router = Router();

// Authenticates itself via ?token= (EventSource can't set headers).
router.get('/stream', streamNotifications);

router.use(authenticate);
router.get('/', listNotifications);
router.put('/read-all', readAllNotifications);
router.put('/:id/read', readNotification);

export default router;
