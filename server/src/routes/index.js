import { Router } from 'express';
import authRoutes from './authRoutes.js';
import farmRoutes from './farmRoutes.js';
import plotRoutes from './plotRoutes.js';
import cropCycleRoutes from './cropCycleRoutes.js';
import reportRoutes from './reportRoutes.js';
import listingRoutes from './listingRoutes.js';
import orderRoutes from './orderRoutes.js';
import advisoryRoutes from './advisoryRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import assistantRoutes from './assistantRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { summary, adminUsers } from '../controllers/dashboardController.js';
import { isAiAvailable } from '../services/aiService.js';
import { listAlerts } from '../services/alertService.js';
import { providerName } from '../services/smsProvider.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/farms', farmRoutes);
router.use('/plots', plotRoutes);
router.use('/crop-cycles', cropCycleRoutes);
router.use('/advisory', advisoryRoutes);
router.use('/listings', listingRoutes);
router.use('/orders', orderRoutes);
router.use('/reports', reportRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/assistant', assistantRoutes);
router.use('/notifications', notificationRoutes);

router.get('/dashboard/summary', authenticate, summary);
router.get('/admin/users', authenticate, authorize('admin'), adminUsers);
router.get('/admin/alerts', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    res.json({ alerts: await listAlerts(), provider: providerName() });
  } catch (err) {
    next(err);
  }
});

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    features: { ai: isAiAvailable(), weather: Boolean(process.env.OPENWEATHER_API_KEY), sms: providerName() },
  });
});

export default router;
