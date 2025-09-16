// Main routes aggregator for work hour management system
import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import employeeRoutes from './employeeRoutes.js';
import vendorRoutes from './vendorRoutes.js';
import projectRoutes from './projectRoutes.js';
import workOrderRoutes from './workOrderRoutes.js';
import timeEntryRoutes from './timeEntryRoutes.js';
import reportRoutes from './reportRoutes.js';

const router = Router();

// Health and system routes (no rate limiting)
router.use('/', healthRoutes);

// API routes (with rate limiting applied in main server)
router.use('/api/employees', employeeRoutes);
router.use('/api/vendors', vendorRoutes);
router.use('/api/projects', projectRoutes);
router.use('/api/work-orders', workOrderRoutes);
router.use('/api/time-entries', timeEntryRoutes);
router.use('/api/reports', reportRoutes);

export default router;