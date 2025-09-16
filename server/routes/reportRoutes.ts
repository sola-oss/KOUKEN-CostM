// Report and analytics routes
import { Router } from 'express';
import { SqliteDatabase } from '../dao/sqlite/database.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const router = Router();

// Report filters schema
const reportFiltersSchema = z.object({
  from: z.string().optional(), // YYYY-MM-DD
  to: z.string().optional(),   // YYYY-MM-DD
  segment: z.enum(['観光', '住宅', 'サウナ']).optional(),
});

/**
 * GET /api/reports/dashboard - Get dashboard statistics
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
  const employeeIdSchema = z.object({
    employee_id: z.coerce.number().int().optional(),
  });
  
  const { employee_id } = employeeIdSchema.parse(req.query);
  
  const db = new SqliteDatabase();
  
  try {
    const stats = await db.reports.getDashboardStats(employee_id);
    res.json({ 
      data: stats,
      generated_at: new Date().toISOString(),
    });
  } finally {
    await db.close();
  }
}));

/**
 * GET /api/reports/projects - Get project-based reports
 */
router.get('/projects', asyncHandler(async (req, res) => {
  const filters = reportFiltersSchema.parse(req.query);
  
  const db = new SqliteDatabase();
  
  try {
    const projectReports = await db.reports.getProjectReports(filters);
    res.json({
      data: projectReports,
      meta: {
        total: projectReports.length,
        filters,
      },
      generated_at: new Date().toISOString(),
    });
  } finally {
    await db.close();
  }
}));

/**
 * GET /api/reports/monthly/:yearMonth - Get monthly report
 * @param yearMonth - Format: YYYY-MM (e.g., 2024-03)
 */
router.get('/monthly/:yearMonth', asyncHandler(async (req, res) => {
  const yearMonth = req.params.yearMonth;
  
  // Validate year-month format
  const yearMonthRegex = /^\d{4}-\d{2}$/;
  if (!yearMonthRegex.test(yearMonth)) {
    throw createError('Invalid year-month format. Expected YYYY-MM', 400);
  }

  const db = new SqliteDatabase();
  
  try {
    const monthlyReport = await db.reports.getMonthlyReport(yearMonth);
    
    // Calculate totals
    const totalMinutes = monthlyReport.reduce((sum, project) => sum + project.total_minutes, 0);
    const totalLaborCost = monthlyReport.reduce((sum, project) => sum + project.labor_cost, 0);
    
    res.json({
      data: monthlyReport,
      meta: {
        month: yearMonth,
        total_minutes: totalMinutes,
        total_hours: Math.round((totalMinutes / 60) * 10) / 10,
        total_labor_cost: Math.round(totalLaborCost * 100) / 100,
        project_count: monthlyReport.length,
      },
      generated_at: new Date().toISOString(),
    });
  } finally {
    await db.close();
  }
}));

export default router;