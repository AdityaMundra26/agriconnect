import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

// Placeholder routers for modules not yet implemented.
// Each mirrors the endpoints in the project spec so the frontend
// can be wired up against a stable API shape before the real
// DB-backed logic lands.

function notImplemented(req, res) {
  res.status(501).json({ error: `${req.method} ${req.baseUrl}${req.path} is not implemented yet` });
}

// Yield analytics needs harvested-quantity tracking that doesn't exist yet
// (crop_cycles has no yield field) - left stubbed until that's built.
export const analyticsRouter = Router();
analyticsRouter.use(authenticate);
analyticsRouter.get('/yield', notImplemented);
