// Production Management MVP - Complete System Replacement
// Replaces the previous sales order system with focused production management
import { Router } from 'express';
import productionApiRouter from './production-api.js';
import salesOrdersRouter from './sales-orders-sqlite.js';
import authRouter from './auth.js';
import quotesRouter from './quotes-api.js';
import summaryInvoicesRouter from './summary-invoices-api.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Auth routes (user management via Supabase Admin API)
// 自前でトークンを確かめるので、下の関所より先に置く。
router.use(authRouter);

// ここから下の /api はログインしていないと使えない。
router.use('/api', requireAuth);

// Quotes API - mounted explicitly at /api/quotes for reliable routing
router.use('/api/quotes', quotesRouter);

// Summary invoices API (合計請求書)
router.use('/api/summary-invoices', summaryInvoicesRouter);

// Use all production management API routes
router.use(productionApiRouter);

// Use sales orders API routes
router.use('/api', salesOrdersRouter);

export default router;
