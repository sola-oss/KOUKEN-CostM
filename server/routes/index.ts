// Production Management MVP - Complete System Replacement
// Replaces the previous sales order system with focused production management
import { Router } from 'express';
import productionApiRouter from './production-api.js';
import salesOrdersRouter from './sales-orders-sqlite.js';
import authRouter from './auth.js';
import quotesRouter from './quotes-api.js';

const router = Router();

// Quotes API - mounted explicitly at /api/quotes for reliable routing
router.use('/api/quotes', quotesRouter);

// Use all production management API routes
router.use(productionApiRouter);

// Use sales orders API routes
router.use('/api', salesOrdersRouter);

// Auth routes (user management via Supabase Admin API)
router.use(authRouter);

export default router;
