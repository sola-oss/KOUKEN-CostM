// Employee management routes
import { Router } from 'express';
import { SqliteDatabase } from '../dao/sqlite/database.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { createInsertSchema } from 'drizzle-zod';
import { employees } from '../../shared/schema.js';
import { z } from 'zod';

const router = Router();
const createEmployeeSchema = createInsertSchema(employees).omit({ 
  id: true, 
  created_at: true 
});

/**
 * GET /api/employees - List all employees
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = new SqliteDatabase();
  
  try {
    const allEmployees = await db.employees.findAll();
    res.json({
      data: allEmployees,
      meta: {
        total: allEmployees.length,
      },
    });
  } finally {
    await db.close();
  }
}));

/**
 * GET /api/employees/active - List active employees only
 */
router.get('/active', asyncHandler(async (req, res) => {
  const db = new SqliteDatabase();
  
  try {
    const activeEmployees = await db.employees.findActive();
    res.json({
      data: activeEmployees,
      meta: {
        total: activeEmployees.length,
      },
    });
  } finally {
    await db.close();
  }
}));

/**
 * GET /api/employees/:id - Get employee by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw createError('Invalid employee ID', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    const employee = await db.employees.findById(id);
    if (!employee) {
      throw createError('Employee not found', 404);
    }
    res.json({ data: employee });
  } finally {
    await db.close();
  }
}));

/**
 * POST /api/employees - Create new employee
 */
router.post('/', asyncHandler(async (req, res) => {
  const validatedData = createEmployeeSchema.parse(req.body);
  
  const db = new SqliteDatabase();
  
  try {
    const employee = await db.employees.create(validatedData);
    res.status(201).json({ 
      data: employee,
      message: 'Employee created successfully',
    });
  } finally {
    await db.close();
  }
}));

/**
 * PATCH /api/employees/:id - Update employee
 */
router.patch('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw createError('Invalid employee ID', 400);
  }

  const updateSchema = createEmployeeSchema.partial();
  const validatedData = updateSchema.parse(req.body);
  
  if (Object.keys(validatedData).length === 0) {
    throw createError('No fields provided for update', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    const employee = await db.employees.update(id, validatedData);
    res.json({ 
      data: employee,
      message: 'Employee updated successfully',
    });
  } finally {
    await db.close();
  }
}));

/**
 * DELETE /api/employees/:id - Deactivate employee (soft delete)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw createError('Invalid employee ID', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    const success = await db.employees.delete(id);
    if (!success) {
      throw createError('Employee not found', 404);
    }
    res.status(204).send();
  } finally {
    await db.close();
  }
}));

export default router;