// Project management routes
import { Router } from 'express';
import { SqliteDatabase } from '../dao/sqlite/database.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { createInsertSchema } from 'drizzle-zod';
import { projects } from '../../shared/schema.js';
import { z } from 'zod';

const router = Router();
const createProjectSchema = createInsertSchema(projects).omit({ 
  id: true, 
  created_at: true 
});

/**
 * GET /api/projects - List all projects
 */
router.get('/', asyncHandler(async (req, res) => {
  const db = new SqliteDatabase();
  
  try {
    const allProjects = await db.projects.findAll();
    res.json({
      data: allProjects,
      meta: {
        total: allProjects.length,
      },
    });
  } finally {
    await db.close();
  }
}));

/**
 * GET /api/projects/active - List active projects only
 */
router.get('/active', asyncHandler(async (req, res) => {
  const db = new SqliteDatabase();
  
  try {
    const activeProjects = await db.projects.findActive();
    res.json({
      data: activeProjects,
      meta: {
        total: activeProjects.length,
      },
    });
  } finally {
    await db.close();
  }
}));

/**
 * GET /api/projects/segments/:segment - Get projects by segment
 */
router.get('/segments/:segment', asyncHandler(async (req, res) => {
  const segment = req.params.segment;
  if (!['観光', '住宅', 'サウナ'].includes(segment)) {
    throw createError('Invalid segment', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    const projects = await db.projects.findBySegment(segment);
    res.json({
      data: projects,
      meta: {
        total: projects.length,
      },
    });
  } finally {
    await db.close();
  }
}));

/**
 * GET /api/projects/:id - Get project by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw createError('Invalid project ID', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    const project = await db.projects.findById(id);
    if (!project) {
      throw createError('Project not found', 404);
    }
    res.json({ data: project });
  } finally {
    await db.close();
  }
}));

/**
 * POST /api/projects - Create new project
 */
router.post('/', asyncHandler(async (req, res) => {
  const validatedData = createProjectSchema.parse(req.body);
  
  const db = new SqliteDatabase();
  
  try {
    // Validate vendor exists if provided
    if (validatedData.vendor_id) {
      const vendor = await db.vendors.findById(validatedData.vendor_id);
      if (!vendor) {
        throw createError('Referenced vendor not found', 400);
      }
    }

    const project = await db.projects.create(validatedData);
    res.status(201).json({ 
      data: project,
      message: 'Project created successfully',
    });
  } finally {
    await db.close();
  }
}));

/**
 * PATCH /api/projects/:id - Update project
 */
router.patch('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw createError('Invalid project ID', 400);
  }

  const updateSchema = createProjectSchema.partial();
  const validatedData = updateSchema.parse(req.body);
  
  if (Object.keys(validatedData).length === 0) {
    throw createError('No fields provided for update', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    // Validate vendor exists if provided
    if (validatedData.vendor_id) {
      const vendor = await db.vendors.findById(validatedData.vendor_id);
      if (!vendor) {
        throw createError('Referenced vendor not found', 400);
      }
    }

    const project = await db.projects.update(id, validatedData);
    res.json({ 
      data: project,
      message: 'Project updated successfully',
    });
  } finally {
    await db.close();
  }
}));

/**
 * DELETE /api/projects/:id - Deactivate project (soft delete)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw createError('Invalid project ID', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    const success = await db.projects.delete(id);
    if (!success) {
      throw createError('Project not found', 404);
    }
    res.status(204).send();
  } finally {
    await db.close();
  }
}));

export default router;