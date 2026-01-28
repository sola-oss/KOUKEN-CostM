// Production Management MVP - Complete System Replacement
// Replaces the previous sales order system with focused production management
import { Router } from 'express';
import productionApiRouter from './production-api.js';
import salesOrdersRouter from './sales-orders-sqlite.js';

const router = Router();

// Use all production management API routes
router.use(productionApiRouter);

// Use sales orders API routes
router.use('/api', salesOrdersRouter);

export default router;