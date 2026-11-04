import { Router } from 'express';
import * as searchController from '../controllers/searchController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', searchController.searchWorkspace);

export default router;
