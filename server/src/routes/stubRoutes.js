import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

// Placeholder routers for modules not yet implemented.
// Each mirrors the endpoints in the project spec so the frontend
// can be wired up against a stable API shape before the real
// DB-backed logic lands.

function notImplemented(req, res) {
  res.status(501).json({ error: `${req.method} ${req.baseUrl}${req.path} is not implemented yet` });
}

export const farmsRouter = Router();
farmsRouter.use(authenticate);
farmsRouter.get('/', notImplemented);
farmsRouter.post('/', notImplemented);
farmsRouter.put('/:id', notImplemented);

export const plotsRouter = Router();
plotsRouter.use(authenticate);
plotsRouter.get('/', notImplemented);
plotsRouter.post('/', notImplemented);
plotsRouter.put('/:id', notImplemented);

export const advisoryRouter = Router();
advisoryRouter.use(authenticate);
advisoryRouter.get('/:plotId', notImplemented);

export const listingsRouter = Router();
listingsRouter.get('/', notImplemented);
listingsRouter.post('/', authenticate, notImplemented);

export const ordersRouter = Router();
ordersRouter.use(authenticate);
ordersRouter.get('/', notImplemented);
ordersRouter.post('/', notImplemented);

export const reportsRouter = Router();
reportsRouter.use(authenticate);
reportsRouter.get('/', notImplemented);
reportsRouter.post('/', notImplemented);
reportsRouter.put('/:id/status', notImplemented);

export const analyticsRouter = Router();
analyticsRouter.use(authenticate);
analyticsRouter.get('/yield', notImplemented);
analyticsRouter.get('/reports', notImplemented);
analyticsRouter.get('/marketplace', notImplemented);

export const assistantRouter = Router();
assistantRouter.use(authenticate);
assistantRouter.post('/query', notImplemented);
