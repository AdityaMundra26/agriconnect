import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  browseListings,
  myListings,
  adminListings,
  createListingHandler,
  updateListingHandler,
} from '../controllers/listingController.js';

const router = Router();

router.get('/', browseListings);
router.get('/mine', authenticate, myListings);
router.get('/admin', authenticate, adminListings);
router.post('/', authenticate, createListingHandler);
router.put('/:id', authenticate, updateListingHandler);

export default router;
