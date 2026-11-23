import { Router } from 'express';
import { status, enable, disable } from '../controllers/demoController.js';

const router = Router();

// Status is public so the login page knows whether to show demo logins.
// enable/disable check permissions themselves (see DEMO_TOGGLE).
router.get('/', status);
router.post('/enable', enable);
router.post('/disable', disable);

export default router;
