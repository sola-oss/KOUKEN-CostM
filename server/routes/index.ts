// Production Management MVP - Complete System Replacement
// Replaces the previous sales order system with focused production management
import { Router } from 'express';
import productionApiRouter from './production-api.js';

const router = Router();

// Use all production management API routes
router.use(productionApiRouter);

export default router;