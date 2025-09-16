// SQLite Report DAO implementation for aggregation and analytics
import Database from 'better-sqlite3';
import { IReportDAO } from '../interfaces';
import { ProjectReport, ReportFilters } from '@shared/types';
import { getTokyoDayBounds } from '../../utils/timezone';

export class SqliteReportDAO implements IReportDAO {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  async getProjectReports(filters: ReportFilters): Promise<ProjectReport[]> {
    const { from, to, segment } = filters;

    const conditions: string[] = [];
    const params: any[] = [];

    // Date filtering (using Tokyo timezone bounds converted to UTC)
    if (from) {
      const { start } = getTokyoDayBounds(from);
      conditions.push('te.start_at >= ?');
      params.push(start);
    }

    if (to) {
      const { end } = getTokyoDayBounds(to);
      conditions.push('te.start_at <= ?');
      params.push(end);
    }

    // Segment filtering
    if (segment) {
      conditions.push('p.segment = ?');
      params.push(segment);
    }

    // Only include approved time entries
    conditions.push(`te.status = 'approved'`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const stmt = this.db.prepare(`
      SELECT 
        p.id as project_id,
        p.name as project_name,
        p.segment,
        COALESCE(SUM(te.minutes), 0) as total_minutes,
        COALESCE(SUM(CAST(te.minutes as REAL) / 60.0 * e.hourly_cost_rate), 0) as labor_cost
      FROM projects p
      LEFT JOIN work_orders wo ON p.id = wo.project_id
      LEFT JOIN time_entries te ON wo.id = te.work_order_id AND te.status = 'approved'
      LEFT JOIN employees e ON te.employee_id = e.id
      ${whereClause.replace('te.', 'te.').replace('p.', 'p.')}
      GROUP BY p.id, p.name, p.segment
      HAVING p.is_active = 1
      ORDER BY labor_cost DESC, project_name
    `);

    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => ({
      project_id: row.project_id,
      project_name: row.project_name,
      segment: row.segment,
      total_minutes: row.total_minutes || 0,
      labor_cost: parseFloat((row.labor_cost || 0).toFixed(2)),
    }));
  }

  async getMonthlyReport(yearMonth: string): Promise<ProjectReport[]> {
    // Parse YYYY-MM format
    const [year, month] = yearMonth.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      throw new Error('Invalid year-month format. Expected YYYY-MM');
    }

    // Get first and last day of the month in Tokyo timezone
    const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate(); // Get last day of month
    const lastDayStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

    return this.getProjectReports({
      from: firstDay,
      to: lastDayStr,
    });
  }

  async getDashboardStats(employeeId?: number): Promise<{
    todayHours: number;
    pendingApprovals: number;
    activeProjects: number;
  }> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { start, end } = getTokyoDayBounds(today);

    // Today's hours for the employee (if specified) or all employees
    const todayHoursStmt = employeeId 
      ? this.db.prepare(`
          SELECT COALESCE(SUM(te.minutes), 0) as total_minutes
          FROM time_entries te
          WHERE te.employee_id = ? 
            AND te.start_at >= ? 
            AND te.start_at <= ?
            AND te.status = 'approved'
        `)
      : this.db.prepare(`
          SELECT COALESCE(SUM(te.minutes), 0) as total_minutes
          FROM time_entries te
          WHERE te.start_at >= ? 
            AND te.start_at <= ?
            AND te.status = 'approved'
        `);

    const todayMinutes = employeeId 
      ? (todayHoursStmt.get(employeeId, start, end) as any).total_minutes
      : (todayHoursStmt.get(start, end) as any).total_minutes;

    // Pending approvals count
    const pendingApprovalsStmt = employeeId
      ? this.db.prepare(`
          SELECT COUNT(*) as count
          FROM time_entries te
          WHERE te.employee_id = ? AND te.status = 'draft'
        `)
      : this.db.prepare(`
          SELECT COUNT(*) as count
          FROM time_entries te
          WHERE te.status = 'draft'
        `);

    const pendingCount = employeeId
      ? (pendingApprovalsStmt.get(employeeId) as any).count
      : (pendingApprovalsStmt.get() as any).count;

    // Active projects count
    const activeProjectsStmt = employeeId
      ? this.db.prepare(`
          SELECT COUNT(DISTINCT wo.project_id) as count
          FROM time_entries te
          JOIN work_orders wo ON te.work_order_id = wo.id
          JOIN projects p ON wo.project_id = p.id
          WHERE te.employee_id = ? 
            AND p.is_active = 1
            AND te.start_at >= DATE('now', '-30 days')
        `)
      : this.db.prepare(`
          SELECT COUNT(*) as count
          FROM projects p
          WHERE p.is_active = 1
        `);

    const activeCount = employeeId
      ? (activeProjectsStmt.get(employeeId) as any).count
      : (activeProjectsStmt.get() as any).count;

    return {
      todayHours: Math.round((todayMinutes / 60) * 10) / 10, // Round to 1 decimal
      pendingApprovals: pendingCount,
      activeProjects: activeCount,
    };
  }
}