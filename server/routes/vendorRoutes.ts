// Vendor management routes with search and pagination
import { Router } from 'express';
import { SqliteDatabase } from '../dao/sqlite/database.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { createInsertSchema } from 'drizzle-zod';
import { vendors } from '../../shared/schema.js';
import { z } from 'zod';

const router = Router();
const createVendorSchema = createInsertSchema(vendors).omit({ 
  id: true, 
  created_at: true 
});

// Query parameters schema for vendor search
const vendorFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  pref: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * GET /api/vendors - List vendors with search and pagination
 */
router.get('/', asyncHandler(async (req, res) => {
  const filters = vendorFiltersSchema.parse(req.query);
  
  const vendorFilters = {
    search: filters.search,
    category: filters.category,
    pref: filters.pref,
    is_active: filters.active === 'true' ? true : filters.active === 'false' ? false : undefined,
    page: filters.page,
    page_size: filters.page_size,
  };

  const db = new SqliteDatabase();
  
  try {
    const result = await db.vendors.findAll(vendorFilters);
    res.json(result);
  } finally {
    await db.close();
  }
}));

/**
 * GET /api/vendors/categories - Get all vendor categories
 */
router.get('/categories', asyncHandler(async (req, res) => {
  const db = new SqliteDatabase();
  
  try {
    const categories = await db.vendors.getCategories();
    res.json({ 
      data: categories,
      meta: { total: categories.length }
    });
  } finally {
    await db.close();
  }
}));

/**
 * GET /api/vendors/prefectures - Get all prefectures
 */
router.get('/prefectures', asyncHandler(async (req, res) => {
  const db = new SqliteDatabase();
  
  try {
    const prefectures = await db.vendors.getPrefectures();
    res.json({ 
      data: prefectures,
      meta: { total: prefectures.length }
    });
  } finally {
    await db.close();
  }
}));

/**
 * GET /api/vendors/:id - Get vendor by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw createError('Invalid vendor ID', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    const vendor = await db.vendors.findById(id);
    if (!vendor) {
      throw createError('Vendor not found', 404);
    }
    res.json({ data: vendor });
  } finally {
    await db.close();
  }
}));

/**
 * POST /api/vendors - Create new vendor
 */
router.post('/', asyncHandler(async (req, res) => {
  const validatedData = createVendorSchema.parse(req.body);
  
  const db = new SqliteDatabase();
  
  try {
    const vendor = await db.vendors.create(validatedData);
    res.status(201).json({ 
      data: vendor,
      message: 'Vendor created successfully',
    });
  } finally {
    await db.close();
  }
}));

/**
 * PATCH /api/vendors/:id - Update vendor
 */
router.patch('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw createError('Invalid vendor ID', 400);
  }

  const updateSchema = createVendorSchema.partial();
  const validatedData = updateSchema.parse(req.body);
  
  if (Object.keys(validatedData).length === 0) {
    throw createError('No fields provided for update', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    const vendor = await db.vendors.update(id, validatedData);
    res.json({ 
      data: vendor,
      message: 'Vendor updated successfully',
    });
  } finally {
    await db.close();
  }
}));

/**
 * DELETE /api/vendors/:id - Deactivate vendor (soft delete)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    throw createError('Invalid vendor ID', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    const success = await db.vendors.delete(id);
    if (!success) {
      throw createError('Vendor not found', 404);
    }
    res.status(204).send();
  } finally {
    await db.close();
  }
}));

export default router;