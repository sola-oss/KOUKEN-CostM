// Production Management MVP - Metrics Calculation Service
import Database from 'better-sqlite3';
import type { Order, Procurement, WorkerLog, OrderKPI, DashboardKPI, CalendarEvent } from '../../shared/production-schema.js';

export class MetricsService {
  constructor(private db: Database.Database) {}

  /**
   * 集計ルール実装:
   * - 材料費 = (orders.qty * orders.estimated_material_cost) + Σ[purchase where status='received'](qty * unit_price)
   * - 労務費 = defaultWageRate * (Σ[manufacture](qty * act_time_per_unit) + Σ[workers_log](qty * act_time_per_unit))
   *   ※ 賃金レートはシステム設定のデフォルト値（2000円/時）を使用
   * - 粗利 = sales - (材料費 + 労務費)
   * - 工数差異% = ((実績工数[h/個] - 標準工数[h/個]) / 標準工数) * 100
   */

  /**
   * Calculate KPI for a single order
   */
  calculateOrderKPI(orderId: string): OrderKPI | null {
    // Get order details
    const order = this.db.prepare(`
      SELECT * FROM orders WHERE order_id = ?
    `).get(orderId) as Order | undefined;

    if (!order) return null;

    // Apply safe defaults for nullable fields
    // Note: For OrderKPI, we must provide string values (not null) for required fields
    // This matches the non-nullable OrderKPI interface requirements
    const qty = order.qty ?? 0;
    const estimatedMaterialCost = order.estimated_material_cost ?? 0;
    const sales = order.sales ?? 0;
    const stdTimePerUnit = order.std_time_per_unit ?? 0;
    const productName = order.product_name ?? '';
    // Keep due_date as empty string for OrderKPI (required field), but track null state
    const dueDate = order.due_date ?? '';
    const status = order.status ?? 'pending';
    const customerName = order.customer_name ?? undefined;

    // Calculate material cost
    const baseMaterialCost = qty * estimatedMaterialCost;
    
    // Add received purchases material cost
    const purchaseMaterialCost = this.db.prepare(`
      SELECT COALESCE(SUM(qty * unit_price), 0) as total
      FROM procurements 
      WHERE order_id = ? AND kind = 'purchase' AND status = 'received'
    `).get(orderId) as { total: number };

    const materialCost = baseMaterialCost + purchaseMaterialCost.total;

    // Calculate actual work hours from manufacture and workers_log
    const manufactureHours = this.db.prepare(`
      SELECT COALESCE(SUM(qty * act_time_per_unit), 0) as total
      FROM procurements 
      WHERE order_id = ? AND kind = 'manufacture'
    `).get(orderId) as { total: number };

    const workerLogHours = this.db.prepare(`
      SELECT COALESCE(SUM(qty * act_time_per_unit), 0) as total
      FROM workers_log 
      WHERE order_id = ?
    `).get(orderId) as { total: number };

    const totalActualHours = manufactureHours.total + workerLogHours.total;
    const actualTimePerUnit = qty > 0 ? totalActualHours / qty : 0;

    // Calculate labor cost
    const defaultWageRate = 2000; // システム設定のデフォルト賃金レート（円/時）
    const laborCost = defaultWageRate * totalActualHours;

    // Calculate gross profit
    const grossProfit = sales - (materialCost + laborCost);

    // Calculate efficiency variance
    const variancePct = stdTimePerUnit > 0 
      ? ((actualTimePerUnit - stdTimePerUnit) / stdTimePerUnit) * 100
      : 0;

    return {
      order_id: order.order_id,
      product_name: productName,
      qty: qty,
      due_date: dueDate,
      sales: sales,
      estimated_material_cost: estimatedMaterialCost,
      std_time_per_unit: stdTimePerUnit,
      status: status,
      customer_name: customerName,
      material_cost: materialCost,
      labor_cost: laborCost,
      gross_profit: grossProfit,
      actual_time_per_unit: actualTimePerUnit,
      variance_pct: variancePct
    };
  }

  /**
   * Calculate KPIs for multiple orders (with optional filters)
   */
  calculateOrderKPIs(options: {
    from?: string;
    to?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  } = {}): { orders: OrderKPI[], total: number } {
    const { from, to, q, page = 1, pageSize = 20 } = options;
    
    // Build WHERE clause
    let whereConditions: string[] = [];
    let params: any[] = [];
    
    if (from) {
      whereConditions.push('due_date >= ?');
      params.push(from);
    }
    
    if (to) {
      whereConditions.push('due_date <= ?');
      params.push(to);
    }
    
    if (q) {
      whereConditions.push('product_name LIKE ?');
      params.push(`%${q}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const totalQuery = `SELECT COUNT(*) as count FROM orders ${whereClause}`;
    const totalResult = this.db.prepare(totalQuery).get(params) as { count: number };
    
    // Get paginated order IDs
    const offset = (page - 1) * pageSize;
    const ordersQuery = `
      SELECT order_id FROM orders 
      ${whereClause}
      ORDER BY due_date ASC
      LIMIT ? OFFSET ?
    `;
    
    const orderIds = this.db.prepare(ordersQuery).all([...params, pageSize, offset]) as { order_id: string }[];
    
    // Calculate KPIs for each order
    const orders = orderIds
      .map(row => this.calculateOrderKPI(row.order_id))
      .filter((kpi): kpi is OrderKPI => kpi !== null);

    return {
      orders,
      total: totalResult.count
    };
  }

  /**
   * Calculate dashboard KPIs
   */
  calculateDashboardKPI(options: { from?: string; to?: string } = {}): DashboardKPI {
    const { from, to } = options;
    
    // Build WHERE clause for date filtering
    let whereConditions: string[] = [];
    let params: any[] = [];
    
    if (from) {
      whereConditions.push('due_date >= ?');
      params.push(from);
    }
    
    if (to) {
      whereConditions.push('due_date <= ?');
      params.push(to);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get all relevant order IDs
    const orderIds = this.db.prepare(`
      SELECT order_id FROM orders ${whereClause}
    `).all(params) as { order_id: string }[];

    let totalSales = 0;
    let totalGrossProfit = 0;
    let totalStdHours = 0;
    let totalActualHours = 0;
    let varianceSum = 0;
    let validVarianceCount = 0;

    // Calculate KPIs for each order
    for (const row of orderIds) {
      const kpi = this.calculateOrderKPI(row.order_id);
      if (kpi) {
        totalSales += kpi.sales;
        totalGrossProfit += kpi.gross_profit;
        totalStdHours += kpi.qty * this.getOrderStdTimePerUnit(kpi.order_id);
        totalActualHours += kpi.qty * kpi.actual_time_per_unit;
        
        if (kpi.variance_pct !== 0) {
          varianceSum += kpi.variance_pct;
          validVarianceCount++;
        }
      }
    }

    const avgVariancePct = validVarianceCount > 0 ? varianceSum / validVarianceCount : 0;

    // Calculate procurement completion rates
    const purchaseStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN p.status = 'received' THEN 1 ELSE 0 END) as completed
      FROM procurements p
      JOIN orders o ON p.order_id = o.order_id
      WHERE p.kind = 'purchase' ${whereClause.replace('due_date', 'o.due_date')}
    `).get(params) as { total: number; completed: number };

    const manufactureStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN p.status = 'done' THEN 1 ELSE 0 END) as completed
      FROM procurements p
      JOIN orders o ON p.order_id = o.order_id
      WHERE p.kind = 'manufacture' ${whereClause.replace('due_date', 'o.due_date')}
    `).get(params) as { total: number; completed: number };

    const purchaseCompletionRate = purchaseStats.total > 0 ? (purchaseStats.completed / purchaseStats.total) * 100 : 0;
    const manufactureCompletionRate = manufactureStats.total > 0 ? (manufactureStats.completed / manufactureStats.total) * 100 : 0;

    return {
      total_sales: totalSales,
      total_gross_profit: totalGrossProfit,
      total_std_hours: totalStdHours,
      total_actual_hours: totalActualHours,
      avg_variance_pct: avgVariancePct,
      purchase_completion_rate: purchaseCompletionRate,
      manufacture_completion_rate: manufactureCompletionRate
    };
  }

  /**
   * Get calendar events for progress visualization
   */
  getCalendarEvents(options: { from?: string; to?: string } = {}): CalendarEvent[] {
    const { from, to } = options;
    const events: CalendarEvent[] = [];
    
    // Build WHERE clause for date filtering
    let whereConditions: string[] = [];
    let params: any[] = [];
    
    if (from || to) {
      const dateConditions = [];
      if (from) dateConditions.push('due_date >= ?');
      if (to) dateConditions.push('due_date <= ?');
      whereConditions.push(`(${dateConditions.join(' AND ')})`);
      if (from) params.push(from);
      if (to) params.push(to);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get order due dates
    const orders = this.db.prepare(`
      SELECT order_id, product_name, due_date FROM orders ${whereClause}
    `).all(params) as Order[];

    for (const order of orders) {
      if (!order.due_date) continue; // Skip orders without due date
      const isOverdue = new Date(order.due_date) < new Date();
      events.push({
        id: `order-${order.order_id}`,
        title: `納期: ${order.product_name ?? ''}`,
        date: order.due_date,
        type: 'due_date',
        status: isOverdue ? 'overdue' : 'pending',
        order_id: order.order_id
      });
    }

    // Get procurement events
    const procurements = this.db.prepare(`
      SELECT p.id, p.order_id, p.kind, p.item_name, p.eta, p.status, p.received_at, p.completed_at
      FROM procurements p
      JOIN orders o ON p.order_id = o.order_id
      ${whereClause.replace('due_date', 'o.due_date')}
    `).all(params) as Procurement[];

    for (const proc of procurements) {
      // ETA events
      if (proc.eta) {
        events.push({
          id: `proc-eta-${proc.id}`,
          title: `${proc.kind === 'purchase' ? '入荷予定' : '製造予定'}: ${proc.item_name || ''}`,
          date: proc.eta,
          type: 'eta',
          status: proc.status === 'received' || proc.status === 'done' ? 'completed' : 'pending',
          order_id: proc.order_id,
          procurement_id: proc.id
        });
      }

      // Completion events
      if (proc.received_at) {
        events.push({
          id: `proc-received-${proc.id}`,
          title: `入荷完了: ${proc.item_name || ''}`,
          date: proc.received_at,
          type: 'received',
          status: 'completed',
          order_id: proc.order_id,
          procurement_id: proc.id
        });
      }

      if (proc.completed_at) {
        events.push({
          id: `proc-completed-${proc.id}`,
          title: `製造完了: ${proc.item_name || ''}`,
          date: proc.completed_at,
          type: 'completed',
          status: 'completed',
          order_id: proc.order_id,
          procurement_id: proc.id
        });
      }
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Helper method to get standard time per unit for an order
   */
  private getOrderStdTimePerUnit(orderId: string): number {
    const result = this.db.prepare(`
      SELECT std_time_per_unit FROM orders WHERE order_id = ?
    `).get(orderId) as { std_time_per_unit: number } | undefined;
    
    return result?.std_time_per_unit || 0;
  }

  /**
   * Get CSV export data
   */
  getCSVData(options: { from?: string; to?: string } = {}): OrderKPI[] {
    const result = this.calculateOrderKPIs(options);
    return result.orders;
  }
}