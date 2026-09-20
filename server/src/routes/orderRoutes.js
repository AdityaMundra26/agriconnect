import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createOrderHandler, listOrders, updateOrderStatusHandler } from '../controllers/orderController.js';

const router = Router();

router.use(authenticate);
router.get('/', listOrders);
router.post('/', createOrderHandler);
router.put('/:id/status', updateOrderStatusHandler);

export default router;
