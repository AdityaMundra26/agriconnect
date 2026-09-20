import { Router } from 'express';
import authRoutes from './authRoutes.js';
import farmRoutes from './farmRoutes.js';
import plotRoutes from './plotRoutes.js';
import reportRoutes from './reportRoutes.js';
import listingRoutes from './listingRoutes.js';
import orderRoutes from './orderRoutes.js';
import advisoryRoutes from './advisoryRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import assistantRoutes from './assistantRoutes.js';
import { analyticsRouter } from './stubRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/farms', farmRoutes);
router.use('/plots', plotRoutes);
router.use('/advisory', advisoryRoutes);
router.use('/listings', listingRoutes);
router.use('/orders', orderRoutes);
router.use('/reports', reportRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/analytics', analyticsRouter);
router.use('/assistant', assistantRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
