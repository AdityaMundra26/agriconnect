import { Router } from 'express';
import authRoutes from './authRoutes.js';
import farmRoutes from './farmRoutes.js';
import plotRoutes from './plotRoutes.js';
import reportRoutes from './reportRoutes.js';
import listingRoutes from './listingRoutes.js';
import orderRoutes from './orderRoutes.js';
import {
  advisoryRouter,
  analyticsRouter,
  assistantRouter,
} from './stubRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/farms', farmRoutes);
router.use('/plots', plotRoutes);
router.use('/advisory', advisoryRouter);
router.use('/listings', listingRoutes);
router.use('/orders', orderRoutes);
router.use('/reports', reportRoutes);
router.use('/analytics', analyticsRouter);
router.use('/assistant', assistantRouter);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
