import { Router } from 'express';
import authRoutes from './authRoutes.js';
import farmRoutes from './farmRoutes.js';
import plotRoutes from './plotRoutes.js';
import reportRoutes from './reportRoutes.js';
import {
  advisoryRouter,
  listingsRouter,
  ordersRouter,
  analyticsRouter,
  assistantRouter,
} from './stubRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/farms', farmRoutes);
router.use('/plots', plotRoutes);
router.use('/advisory', advisoryRouter);
router.use('/listings', listingsRouter);
router.use('/orders', ordersRouter);
router.use('/reports', reportRoutes);
router.use('/analytics', analyticsRouter);
router.use('/assistant', assistantRouter);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
