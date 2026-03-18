// Production Management MVP - Metrics Calculation Service (Supabase版)
import { supabase } from '../lib/supabase-client.js';
import type { Order, Procurement, WorkerLog, OrderKPI, DashboardKPI, CalendarEvent } from '../../shared/production-schema.js';

export class MetricsService {
  /**
   * Calculate KPI for a single order (using Supabase)
   */
  async calculateOrderKPI(orderId: string): Promise<OrderKPI | null> {
    const { data: orderData } = await supabase.from('orders').select('*').eq('order_id', orderId).maybeSingle();
    if (!orderData) return null;
    const order = orderData as Order;

    const [procRes, wlRes] = await Promise.all([
      supabase.from('procurements').select('*').eq('order_id', orderId),
      supabase.from('workers_log').select('*').eq('order_id', orderId)
    ]);

    const procurements = (procRes.data || []) as Procurement[];
    const workerLogs = (wlRes.data || []) as WorkerLog[];

    return this._calcKPI(order, procurements, workerLogs);
  }

  private _calcKPI(order: Order, procurements: Procurement[], workerLogs: WorkerLog[]): OrderKPI {
    const qty = (order.qty as number) ?? 0;
    const estimatedMaterialCost = (order.estimated_material_cost as number) ?? 0;
    const sales = (order.sales as number) ?? 0;
    const stdTimePerUnit = (order.std_time_per_unit as number) ?? 0;
    const defaultWageRate = 2000;

    const baseMaterialCost = qty * estimatedMaterialCost;
    const purchaseMaterialCost = procurements
      .filter(p => p.kind === 'purchase' && p.status === 'received')
      .reduce((sum, p) => sum + ((p.qty as number) ?? 0) * ((p.unit_price as number) ?? 0), 0);
    const materialCost = baseMaterialCost + purchaseMaterialCost;

    const manufactureHours = procurements
      .filter(p => p.kind === 'manufacture')
      .reduce((sum, p) => sum + ((p.qty as number) ?? 0) * ((p.act_time_per_unit as number) ?? 0), 0);
    const workerLogHours = workerLogs
      .reduce((sum, w) => sum + ((w.qty as number) ?? 0) * ((w.act_time_per_unit as number) ?? 0), 0);
    const totalActualHours = manufactureHours + workerLogHours;
    const actualTimePerUnit = qty > 0 ? totalActualHours / qty : 0;

    const laborCost = defaultWageRate * totalActualHours;
    const grossProfit = sales - (materialCost + laborCost);
    const variancePct = stdTimePerUnit > 0
      ? ((actualTimePerUnit - stdTimePerUnit) / stdTimePerUnit) * 100 : 0;

    return {
      order_id: order.order_id,
      product_name: order.product_name ?? '',
      qty,
      due_date: order.due_date ?? '',
      sales,
      estimated_material_cost: estimatedMaterialCost,
      std_time_per_unit: stdTimePerUnit,
      status: order.status ?? 'pending',
      customer_name: order.customer_name ?? undefined,
      material_cost: materialCost,
      labor_cost: laborCost,
      gross_profit: grossProfit,
      actual_time_per_unit: actualTimePerUnit,
      variance_pct: variancePct
    };
  }

  async calculateOrderKPIs(options: {
    from?: string; to?: string; q?: string; page?: number; pageSize?: number;
  } = {}): Promise<{ orders: OrderKPI[], total: number }> {
    const { from, to, q, page = 1, pageSize = 20 } = options;
    const offset = (page - 1) * pageSize;

    let query = supabase.from('orders').select('*', { count: 'exact' });
    if (from) query = query.gte('due_date', from);
    if (to) query = query.lte('due_date', to);
    if (q) query = query.ilike('product_name', `%${q}%`);
    query = query.order('due_date', { ascending: true }).range(offset, offset + pageSize - 1);

    const { data: orders, count } = await query;
    const orderList = (orders || []) as Order[];
    const orderIds = orderList.map(o => o.order_id);

    let procurements: Procurement[] = [];
    let workerLogs: WorkerLog[] = [];
    if (orderIds.length > 0) {
      const [pr, wl] = await Promise.all([
        supabase.from('procurements').select('*').in('order_id', orderIds),
        supabase.from('workers_log').select('*').in('order_id', orderIds)
      ]);
      procurements = (pr.data || []) as Procurement[];
      workerLogs = (wl.data || []) as WorkerLog[];
    }

    const kpis = orderList.map(order => this._calcKPI(
      order,
      procurements.filter(p => p.order_id === order.order_id),
      workerLogs.filter(w => w.order_id === order.order_id)
    ));

    return { orders: kpis, total: count ?? 0 };
  }

  async calculateDashboardKPI(options: { from?: string; to?: string } = {}): Promise<DashboardKPI> {
    const { from, to } = options;

    let orderQuery = supabase.from('orders').select('*');
    if (from) orderQuery = orderQuery.gte('due_date', from);
    if (to) orderQuery = orderQuery.lte('due_date', to);

    const { data: orders } = await orderQuery;
    const orderList = (orders || []) as Order[];
    const orderIds = orderList.map(o => o.order_id);

    if (orderIds.length === 0) {
      return {
        total_sales: 0, total_gross_profit: 0, total_std_hours: 0,
        total_actual_hours: 0, avg_variance_pct: 0,
        purchase_completion_rate: 0, manufacture_completion_rate: 0
      };
    }

    const [procRes, wlRes] = await Promise.all([
      supabase.from('procurements').select('*').in('order_id', orderIds),
      supabase.from('workers_log').select('*').in('order_id', orderIds)
    ]);
    const procurements = (procRes.data || []) as Procurement[];
    const workerLogs = (wlRes.data || []) as WorkerLog[];

    let totalSales = 0, totalGrossProfit = 0, totalStdHours = 0;
    let totalActualHours = 0, varianceSum = 0, validVarianceCount = 0;

    for (const order of orderList) {
      const kpi = this._calcKPI(
        order,
        procurements.filter(p => p.order_id === order.order_id),
        workerLogs.filter(w => w.order_id === order.order_id)
      );
      totalSales += kpi.sales;
      totalGrossProfit += kpi.gross_profit;
      totalStdHours += kpi.qty * kpi.std_time_per_unit;
      totalActualHours += kpi.qty * kpi.actual_time_per_unit;
      if (kpi.variance_pct !== 0) { varianceSum += kpi.variance_pct; validVarianceCount++; }
    }

    const avgVariancePct = validVarianceCount > 0 ? varianceSum / validVarianceCount : 0;
    const purchases = procurements.filter(p => p.kind === 'purchase');
    const manufactures = procurements.filter(p => p.kind === 'manufacture');

    return {
      total_sales: totalSales, total_gross_profit: totalGrossProfit,
      total_std_hours: totalStdHours, total_actual_hours: totalActualHours,
      avg_variance_pct: avgVariancePct,
      purchase_completion_rate: purchases.length > 0
        ? (purchases.filter(p => p.status === 'received').length / purchases.length) * 100 : 0,
      manufacture_completion_rate: manufactures.length > 0
        ? (manufactures.filter(p => p.status === 'done').length / manufactures.length) * 100 : 0
    };
  }

  async getCalendarEvents(options: { from?: string; to?: string } = {}): Promise<CalendarEvent[]> {
    const { from, to } = options;
    const events: CalendarEvent[] = [];

    let orderQuery = supabase.from('orders').select('order_id,product_name,due_date');
    if (from) orderQuery = orderQuery.gte('due_date', from);
    if (to) orderQuery = orderQuery.lte('due_date', to);

    const { data: orders } = await orderQuery;
    const orderIds = ((orders || []) as any[]).map((o: any) => o.order_id);

    for (const order of (orders || []) as any[]) {
      if (!order.due_date) continue;
      events.push({
        id: `order-${order.order_id}`,
        title: `納期: ${order.product_name ?? ''}`,
        date: order.due_date,
        type: 'due_date',
        status: new Date(order.due_date) < new Date() ? 'overdue' : 'pending',
        order_id: order.order_id
      });
    }

    if (orderIds.length > 0) {
      const { data: procs } = await supabase
        .from('procurements')
        .select('id,order_id,kind,item_name,eta,status,received_at,completed_at')
        .in('order_id', orderIds);

      for (const proc of (procs || []) as any[]) {
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
        if (proc.received_at) {
          events.push({ id: `proc-received-${proc.id}`, title: `入荷完了: ${proc.item_name || ''}`,
            date: proc.received_at, type: 'received', status: 'completed',
            order_id: proc.order_id, procurement_id: proc.id });
        }
        if (proc.completed_at) {
          events.push({ id: `proc-completed-${proc.id}`, title: `製造完了: ${proc.item_name || ''}`,
            date: proc.completed_at, type: 'completed', status: 'completed',
            order_id: proc.order_id, procurement_id: proc.id });
        }
      }
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getCSVData(options: { from?: string; to?: string } = {}): Promise<OrderKPI[]> {
    const result = await this.calculateOrderKPIs(options);
    return result.orders;
  }
}
