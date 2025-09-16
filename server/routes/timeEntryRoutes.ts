// Time entry management routes with approval workflow
import { Router } from 'express';
import { SqliteDatabase } from '../dao/sqlite/database.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { createInsertSchema } from 'drizzle-zod';
import { timeEntries } from '../../shared/schema.js';
import { z } from 'zod';

const router = Router();
const createTimeEntrySchema = createInsertSchema(timeEntries).omit({ 
  id: true, 
  created_at: true, 
  updated_at: true, 
  status: true,  // Always created as 'draft'
  approved_at: true, 
  approved_by: true 
});

// Query parameters schema for time entry filtering
const timeEntryFiltersSchema = z.object({
  employee_id: z.coerce.number().int().optional(),
  project_id: z.coerce.number().int().optional(),
  status: z.enum(['draft', 'approved']).optional(),
  from: z.string().optional(), // YYYY-MM-DD
  to: z.string().optional(),   // YYYY-MM-DD
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * GET /api/time-entries - List time entries with filtering and pagination
 */
router.get('/', asyncHandler(async (req, res) => {
  const filters = timeEntryFiltersSchema.parse(req.query);
  
  const db = new SqliteDatabase();
  
  try {
    const result = await db.timeEntries.findAll(filters);
    res.json(result);
  } finally {
    await db.close();
  }
}));

/**
 * GET /api/time-entries/pending - Get all pending approval time entries
 */
router.get('/pending', asyncHandler(async (req, res) => {
  const db = new SqliteDatabase();
  
  try {
    const pendingEntries = await db.timeEntries.findPendingApprovals();
    res.json({
      data: pendingEntries,
      meta: {
        total: pendingEntries.length,
      },
    });
  } finally {
    await db.close();
  }
}));

/**
 * GET /api/time-entries/employee/:employeeId - Get time entries by employee
 */
router.get('/employee/:employeeId', asyncHandler(async (req, res) => {
  const employeeId = parseInt(req.params.employeeId);
  if (isNaN(employeeId)) {
    throw createError('Invalid employee ID', 400);
  }

  const filters = timeEntryFiltersSchema.omit({ employee_id: true }).parse(req.query);
  
  const db = new SqliteDatabase();
  
  try {
    const result = await db.timeEntries.findByEmployeeId(employeeId, filters);
    res.json(result);
  } finally {
    await db.close();
  }
}));

/**
 * GET /api/time-entries/employee/:employeeId/drafts - Get draft time entries by employee
 */
router.get('/employee/:employeeId/drafts', asyncHandler(async (req, res) => {
  const employeeId = parseInt(req.params.employeeId);
  if (isNaN(employeeId)) {
    throw createError('Invalid employee ID', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    const draftEntries = await db.timeEntries.findDraftsByEmployee(employeeId);
    res.json({
      data: draftEntries,
      meta: {
        total: draftEntries.length,
      },
    });
  } finally {
    await db.close();
  }
}));

/**
 * GET /api/time-entries/:id - Get time entry by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw createError('Invalid time entry ID', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    const timeEntry = await db.timeEntries.findById(id);
    if (!timeEntry) {
      throw createError('Time entry not found', 404);
    }
    res.json({ data: timeEntry });
  } finally {
    await db.close();
  }
}));

/**
 * POST /api/time-entries - Create new time entry
 */
router.post('/', asyncHandler(async (req, res) => {
  const validatedData = createTimeEntrySchema.parse(req.body);
  
  const db = new SqliteDatabase();
  
  try {
    // Validate employee exists
    const employee = await db.employees.findById(validatedData.employee_id);
    if (!employee) {
      throw createError('Referenced employee not found', 400);
    }

    // Validate work order exists
    const workOrder = await db.workOrders.findById(validatedData.work_order_id);
    if (!workOrder) {
      throw createError('Referenced work order not found', 400);
    }

    const timeEntry = await db.timeEntries.create(validatedData);
    res.status(201).json({ 
      data: timeEntry,
      message: 'Time entry created successfully',
    });
  } finally {
    await db.close();
  }
}));

/**
 * PATCH /api/time-entries/:id - Update time entry (draft only)
 */
router.patch('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw createError('Invalid time entry ID', 400);
  }

  const updateSchema = createTimeEntrySchema.partial();
  const validatedData = updateSchema.parse(req.body);
  
  if (Object.keys(validatedData).length === 0) {
    throw createError('No fields provided for update', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    const timeEntry = await db.timeEntries.update(id, validatedData);
    res.json({ 
      data: timeEntry,
      message: 'Time entry updated successfully',
    });
  } finally {
    await db.close();
  }
}));

/**
 * PATCH /api/time-entries/:id/approve - Approve time entry
 */
router.patch('/:id/approve', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw createError('Invalid time entry ID', 400);
  }

  const approverSchema = z.object({
    approver_id: z.number().int(),
  });
  const { approver_id } = approverSchema.parse(req.body);

  const db = new SqliteDatabase();
  
  try {
    // Validate approver exists and has appropriate role
    const approver = await db.employees.findById(approver_id);
    if (!approver) {
      throw createError('Approver not found', 400);
    }
    
    if (!['manager', 'admin'].includes(approver.role)) {
      throw createError('Insufficient permissions to approve time entries', 403);
    }

    const timeEntry = await db.timeEntries.approve(id, approver_id);
    res.json({ 
      data: timeEntry,
      message: 'Time entry approved successfully',
    });
  } finally {
    await db.close();
  }
}));

/**
 * DELETE /api/time-entries/:id - Delete time entry (draft only)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw createError('Invalid time entry ID', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    const success = await db.timeEntries.delete(id);
    if (!success) {
      throw createError('Time entry not found or cannot be deleted', 404);
    }
    res.status(204).send();
  } finally {
    await db.close();
  }
}));

export default router;