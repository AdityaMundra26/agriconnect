import { Router } from 'express';
import authRoutes from './authRoutes.js';
import {
  farmsRouter,
  plotsRouter,
  advisoryRouter,
  listingsRouter,
  ordersRouter,
  reportsRouter,
  analyticsRouter,
  assistantRouter,
} from './stubRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/farms', farmsRouter);
router.use('/plots', plotsRouter);
router.use('/advisory', advisoryRouter);
router.use('/listings', listingsRouter);
router.use('/orders', ordersRouter);
router.use('/reports', reportsRouter);
router.use('/analytics', analyticsRouter);
router.use('/assistant', assistantRouter);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
