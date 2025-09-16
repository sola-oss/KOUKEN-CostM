// Work order management routes
import { Router } from 'express';
import { SqliteDatabase } from '../dao/sqlite/database.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { createInsertSchema } from 'drizzle-zod';
import { workOrders } from '../../shared/schema.js';

const router = Router();
const createWorkOrderSchema = createInsertSchema(workOrders).omit({ 
  id: true 
});

/**
 * GET /api/work-orders - List all work orders
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = new SqliteDatabase();
  
  try {
    const allWorkOrders = await db.workOrders.findAll();
    res.json({
      data: allWorkOrders,
      meta: {
        total: allWorkOrders.length,
      },
    });
  } finally {
    await db.close();
  }
}));

/**
 * GET /api/work-orders/project/:projectId - Get work orders by project
 */
router.get('/project/:projectId', asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.projectId);
  if (isNaN(projectId)) {
    throw createError('Invalid project ID', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    const workOrders = await db.workOrders.findByProjectId(projectId);
    res.json({
      data: workOrders,
      meta: {
        total: workOrders.length,
      },
    });
  } finally {
    await db.close();
  }
}));

/**
 * GET /api/work-orders/:id - Get work order by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw createError('Invalid work order ID', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    const workOrder = await db.workOrders.findById(id);
    if (!workOrder) {
      throw createError('Work order not found', 404);
    }
    res.json({ data: workOrder });
  } finally {
    await db.close();
  }
}));

/**
 * POST /api/work-orders - Create new work order
 */
router.post('/', asyncHandler(async (req, res) => {
  const validatedData = createWorkOrderSchema.parse(req.body);
  
  const db = new SqliteDatabase();
  
  try {
    // Validate project exists
    const project = await db.projects.findById(validatedData.project_id);
    if (!project) {
      throw createError('Referenced project not found', 400);
    }

    const workOrder = await db.workOrders.create(validatedData);
    res.status(201).json({ 
      data: workOrder,
      message: 'Work order created successfully',
    });
  } finally {
    await db.close();
  }
}));

/**
 * PATCH /api/work-orders/:id - Update work order
 */
router.patch('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw createError('Invalid work order ID', 400);
  }

  const updateSchema = createWorkOrderSchema.partial();
  const validatedData = updateSchema.parse(req.body);
  
  if (Object.keys(validatedData).length === 0) {
    throw createError('No fields provided for update', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    // Validate project exists if provided
    if (validatedData.project_id) {
      const project = await db.projects.findById(validatedData.project_id);
      if (!project) {
        throw createError('Referenced project not found', 400);
      }
    }

    const workOrder = await db.workOrders.update(id, validatedData);
    res.json({ 
      data: workOrder,
      message: 'Work order updated successfully',
    });
  } finally {
    await db.close();
  }
}));

/**
 * DELETE /api/work-orders/:id - Delete work order
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw createError('Invalid work order ID', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    const success = await db.workOrders.delete(id);
    if (!success) {
      throw createError('Work order not found', 404);
    }
    res.status(204).send();
  } finally {
    await db.close();
  }
}));

export default router;