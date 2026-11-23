import { Router } from 'express';
import { register, login, me, updateMe, sendTestAlert } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, me);
router.put('/me', authenticate, updateMe);
router.post('/me/test-alert', authenticate, sendTestAlert);

export default router;
