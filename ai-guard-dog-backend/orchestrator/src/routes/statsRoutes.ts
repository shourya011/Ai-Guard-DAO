/**
 * Stats Routes
 * 
 * Express router for dashboard statistics
 */

import { Router } from 'express';
import { getDashboardStats } from '../controllers/statsController';

const router = Router();

// GET /api/stats - Get dashboard statistics
router.get('/', getDashboardStats);

export default router;
