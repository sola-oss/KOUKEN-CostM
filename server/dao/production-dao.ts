// Production Management MVP - Data Access Object (Supabase版)
import { supabase } from '../lib/supabase-client.js';
import type { 
  Order, Procurement, WorkerLog, Task, WorkLog, Material, MaterialUsage, MaterialUsageWithMaterial,
  InsertOrder, InsertProcurement, InsertWorkerLog, InsertTask, InsertWorkLog, InsertMaterial, InsertMaterialUsage,
  OrderKPI, DashboardKPI, CalendarEvent, CostSettings, OrderCostSummary, CostAggregationResponse, ZoneCostSummary,
  WorkerMaster, InsertWorkerMaster, VendorMaster, InsertVendorMaster, OutsourcingCost, InsertOutsourcingCost, OutsourcingCostWithVendor,
  CustomerMaster, InsertCustomerMaster
} from '../../shared/production-schema.js';

// ============================================================
// ユーティリティ
// ============================================================

function throwIfError<T>(data: T | null, error: any, context: string): T {
  if (error) throw new Error(`[DAO:${context}] ${error.message}`);
  if (data === null) throw new Error(`[DAO:${context}] No data returned`);
  return data;
}

// PostgreSQL booleanを正規化（念のため）
function normBool(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'boolean') return val;
  return val === 1 || val === '1' || val === 'true';
}

// ============================================================
// KPI計算（バッチ対応・Supabase用）
// ============================================================

function calcOrderKPIFromData(
  order: Order,
  procurements: Procurement[],
  workerLogs: WorkerLog[],
  defaultWageRate: number = 2000
): OrderKPI {
  const qty = (order.qty as number) ?? 0;
  const estimatedMaterialCost = (order.estimated_material_cost as number) ?? 0;
  const sales = (order.sales as number) ?? 0;
  const stdTimePerUnit = (order.std_time_per_unit as number) ?? 0;

  // 材料費（procurementsは新スキーマのため旧kind/unit_priceは参照しない）
  const baseMaterialCost = qty * estimatedMaterialCost;
  const materialCost = baseMaterialCost;

  // 実労働時間（workers_logのみ参照）
  const workerLogHours = workerLogs
    .reduce((sum, w) => sum + ((w.qty as number) ?? 0) * ((w.act_time_per_unit as number) ?? 0), 0);
  const totalActualHours = workerLogHours;
  const actualTimePerUnit = qty > 0 ? totalActualHours / qty : 0;

  // 労務費
  const laborCost = defaultWageRate * totalActualHours;

  // 粗利
  const grossProfit = sales - (materialCost + laborCost);

  // 工数差異
  const variancePct = stdTimePerUnit > 0
    ? ((actualTimePerUnit - stdTimePerUnit) / stdTimePerUnit) * 100
    : 0;

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

// ============================================================
// ProductionDAO
// ============================================================

export class ProductionDAO {
  constructor() {}

  async verifyProcurementsSchema(): Promise<void> {
    // Using compatibility layer: new fields mapped to old Supabase columns
    // (item_name→description, qty→quantity, total_amount→amount, eta→order_date, vendor JSON→material_id/account_type/notes)
    const { error } = await supabase
      .from('procurements')
      .select('id, item_name, qty, unit_price, total_amount, eta, status, vendor, vendor_id')
      .limit(1);
    if (error) {
      console.error('✗ Supabase procurements schema check failed:', error.message, '| code:', error.code);
    } else {
      console.log('✓ Supabase procurements table OK (compatibility mode: old schema → new field mapping)');
    }
  }

  // ========== Orders CRUD ==========

  async createOrder(orderData: InsertOrder): Promise<string> {
    const now = new Date().toISOString();

    let orderId = orderData.order_id;
    if (!orderId) {
      // 決算期対応の自動採番 (ko130XXX 形式)
      // kouken社の決算期は5月末締め（6月始まり）
      const baseDate = orderData.order_date ? new Date(orderData.order_date) : new Date();
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth() + 1; // 1-indexed
      const fiscalBaseYear = month >= 6 ? year : year - 1;
      const prefixNum = 130 + (fiscalBaseYear - 2025) * 10;
      const prefix = `ko${prefixNum}`;

      // 同プレフィックスの受注番号を全件取得して最大連番を算出
      const { data: rows } = await supabase
        .from('orders')
        .select('order_id')
        .like('order_id', `${prefix}%`);
      const serialNums = (rows || [])
        .map(r => {
          const suffix = r.order_id.slice(prefix.length);
          return parseInt(suffix, 10);
        })
        .filter(n => !isNaN(n));
      const maxSerial = serialNums.length > 0 ? Math.max(...serialNums) : 0;
      const nextSerial = String(maxSerial + 1).padStart(3, '0');
      orderId = `${prefix}${nextSerial}`;
    }

    const row = {
      order_id: orderId,
      order_date: orderData.order_date ?? null,
      client_name: orderData.client_name ?? null,
      manager: orderData.manager ?? null,
      client_order_no: orderData.client_order_no ?? null,
      project_title: orderData.project_title ?? null,
      is_delivered: orderData.is_delivered ?? false,
      has_shipping_fee: orderData.has_shipping_fee ?? false,
      is_amount_confirmed: orderData.is_amount_confirmed ?? false,
      is_invoiced: orderData.is_invoiced ?? false,
      due_date: orderData.due_date ?? null,
      delivery_date: orderData.delivery_date ?? null,
      confirmed_date: orderData.confirmed_date ?? null,
      estimated_amount: orderData.estimated_amount ?? null,
      invoiced_amount: orderData.invoiced_amount ?? null,
      invoice_month: orderData.invoice_month ?? null,
      subcontractor: orderData.subcontractor ?? null,
      processing_hours: orderData.processing_hours ?? null,
      note: orderData.note ?? null,
      product_name: orderData.product_name ?? null,
      qty: orderData.qty ?? null,
      start_date: orderData.start_date ?? null,
      sales: orderData.sales ?? null,
      estimated_material_cost: orderData.estimated_material_cost ?? null,
      std_time_per_unit: orderData.std_time_per_unit ?? null,
      status: orderData.status ?? 'pending',
      customer_name: orderData.customer_name ?? null,
      customer_code: orderData.customer_code ?? null,
      customer_zip: orderData.customer_zip ?? null,
      customer_address1: orderData.customer_address1 ?? null,
      customer_address2: orderData.customer_address2 ?? null,
      created_at: now,
      updated_at: now
    };

    const { error } = await supabase.from('orders').insert(row);
    if (error) throw new Error(`[createOrder] ${error.message}`);
    return orderId;
  }

  async getOrders(options: {
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ orders: Array<Order & { kpi: OrderKPI | null }>, total: number }> {
    const { from, to, search, page = 1, pageSize = 20 } = options;
    const offset = (page - 1) * pageSize;

    let query = supabase.from('orders').select('*', { count: 'exact' });

    if (from) query = query.gte('order_date', from);
    if (to) query = query.lte('order_date', to);
    if (search) {
      query = query.or(
        `order_id.ilike.%${search}%,client_name.ilike.%${search}%,project_title.ilike.%${search}%,client_order_no.ilike.%${search}%`
      );
    }

    query = query.order('order_date', { ascending: false }).order('order_id', { ascending: false });
    query = query.range(offset, offset + pageSize - 1);

    const { data: orders, count, error } = await query;
    if (error) throw new Error(`[getOrders] ${error.message}`);

    const orderList = (orders || []) as Order[];
    const orderIds = orderList.map(o => o.order_id);

    // KPI計算用バッチ取得
    let procurements: Procurement[] = [];
    let workerLogs: WorkerLog[] = [];
    if (orderIds.length > 0) {
      const [procRes, wlRes] = await Promise.all([
        supabase.from('procurements').select('*').in('order_id', orderIds),
        supabase.from('workers_log').select('*').in('order_id', orderIds)
      ]);
      procurements = (procRes.data || []) as Procurement[];
      workerLogs = (wlRes.data || []) as WorkerLog[];
    }

    const ordersWithKPI = orderList.map(order => {
      const orderProcs = procurements.filter(p => p.order_id === order.order_id);
      const orderWLogs = workerLogs.filter(w => w.order_id === order.order_id);
      return {
        ...order,
        kpi: calcOrderKPIFromData(order, orderProcs, orderWLogs)
      };
    });

    return { orders: ordersWithKPI, total: count ?? 0 };
  }

  async getOrderById(orderId: string): Promise<{
    order: Order | null;
    kpi: OrderKPI | null;
    procurements: Procurement[];
    workerLogs: WorkerLog[];
  }> {
    const [orderRes, procRes, wlRes] = await Promise.all([
      supabase.from('orders').select('*').eq('order_id', orderId).maybeSingle(),
      supabase.from('procurements').select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
      supabase.from('workers_log').select('*').eq('order_id', orderId).order('date', { ascending: false })
    ]);

    if (orderRes.error) throw new Error(`[getOrderById] ${orderRes.error.message}`);
    const order = orderRes.data as Order | null;
    if (!order) return { order: null, kpi: null, procurements: [], workerLogs: [] };

    const procurements = (procRes.data || []) as Procurement[];
    const workerLogs = (wlRes.data || []) as WorkerLog[];
    const kpi = calcOrderKPIFromData(order, procurements, workerLogs);

    return { order, kpi, procurements, workerLogs };
  }

  async updateOrder(orderId: string, updates: Partial<InsertOrder>): Promise<boolean> {
    const allowedColumns = [
      'order_date', 'client_name', 'manager', 'client_order_no', 'project_title',
      'is_delivered', 'has_shipping_fee', 'is_amount_confirmed', 'is_invoiced',
      'due_date', 'delivery_date', 'confirmed_date',
      'estimated_amount', 'invoiced_amount', 'invoice_month',
      'subcontractor', 'processing_hours', 'note',
      'product_name', 'qty', 'start_date', 'sales', 'estimated_material_cost',
      'std_time_per_unit', 'status', 'customer_name', 'customer_code',
      'customer_zip', 'customer_address1', 'customer_address2'
    ];

    const filtered: Record<string, any> = {};
    for (const key of Object.keys(updates)) {
      if (allowedColumns.includes(key)) {
        filtered[key] = (updates as any)[key];
      }
    }
    if (Object.keys(filtered).length === 0) return false;

    filtered.updated_at = new Date().toISOString();
    const { error } = await supabase.from('orders').update(filtered).eq('order_id', orderId);
    if (error) throw new Error(`[updateOrder] ${error.message}`);
    return true;
  }

  async deleteOrder(orderId: string): Promise<boolean> {
    const { error } = await supabase.from('orders').delete().eq('order_id', orderId);
    if (error) throw new Error(`[deleteOrder] ${error.message}`);
    return true;
  }

  // ========== Procurements CRUD ==========
  // NOTE: Supabase uses the OLD procurements schema (migration 001).
  // New fields (material_id, account_type, notes) are stored as JSON in the `vendor` column.
  // Column mapping: description→item_name, quantity→qty, amount→total_amount, order_date→eta.

  private _procToOld(procData: Partial<InsertProcurement>, now?: string): Record<string, any> {
    const extra = JSON.stringify({
      material_id: procData.material_id ?? null,
      account_type: procData.account_type ?? '外注費',
      notes: procData.notes ?? null,
    });
    const row: Record<string, any> = {
      vendor_id: procData.vendor_id ?? null,
      item_name: procData.description ?? null,
      qty: procData.quantity ?? null,
      unit_price: procData.unit_price ?? null,
      total_amount: procData.amount ?? null,
      eta: procData.order_date ?? null,
      status: procData.status ?? '発注中',
      vendor: extra,
    };
    if (procData.order_id !== undefined) row.order_id = procData.order_id;
    if (now) {
      row.kind = 'purchase';
      row.created_at = now;
    }
    return row;
  }

  private _procFromOld(row: any): Procurement {
    let extra: any = {};
    try { extra = JSON.parse(row.vendor || '{}'); } catch { /* ignore */ }
    return {
      id: row.id,
      order_id: row.order_id,
      vendor_id: row.vendor_id ?? null,
      material_id: extra.material_id ?? null,
      account_type: extra.account_type ?? '外注費',
      description: row.item_name ?? null,
      quantity: row.qty ?? null,
      unit_price: row.unit_price ?? null,
      amount: row.total_amount ?? null,
      order_date: row.eta ?? null,
      status: row.status ?? '発注中',
      notes: extra.notes ?? null,
      created_at: row.created_at,
    } as Procurement;
  }

  async createProcurement(procData: InsertProcurement): Promise<number> {
    const now = new Date().toISOString();
    const row = this._procToOld(procData, now);

    const { data, error } = await supabase.from('procurements').insert(row).select('id').single();
    if (error) throw new Error(`[createProcurement] ${error.message}`);
    return (data as any).id as number;
  }

  async getProcurements(options: {
    orderId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ procurements: Procurement[], total: number }> {
    const { orderId, status, page = 1, pageSize = 50 } = options;
    const offset = (page - 1) * pageSize;

    let countQuery = supabase.from('procurements').select('*', { count: 'exact', head: true });
    let dataQuery = supabase.from('procurements').select('*');

    if (orderId) {
      countQuery = countQuery.eq('order_id', orderId);
      dataQuery = dataQuery.eq('order_id', orderId);
    }
    if (status) {
      countQuery = countQuery.eq('status', status);
      dataQuery = dataQuery.eq('status', status);
    }

    dataQuery = dataQuery.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);

    const [{ count, error: ce }, { data, error: de }] = await Promise.all([countQuery, dataQuery]);
    if (ce) throw new Error(`[getProcurements count] ${ce.message}`);
    if (de) throw new Error(`[getProcurements data] ${de.message}`);

    const procs = (data || []).map((r: any) => this._procFromOld(r));

    return { procurements: procs, total: count ?? 0 };
  }

  async getProcurementById(procId: number): Promise<Procurement | null> {
    const { data, error } = await supabase.from('procurements').select('*').eq('id', procId).single();
    if (error) return null;
    return this._procFromOld(data);
  }

  async updateProcurement(procId: number, updates: Partial<InsertProcurement>): Promise<boolean> {
    const filtered = this._procToOld(updates);
    // Rebuild vendor JSON from existing + updates to preserve un-changed extra fields
    if (Object.keys(filtered).length === 0) return false;

    const { error } = await supabase.from('procurements').update(filtered).eq('id', procId);
    if (error) throw new Error(`[updateProcurement] ${error.message}`);
    return true;
  }

  async deleteProcurement(procId: number): Promise<boolean> {
    const { error } = await supabase.from('procurements').delete().eq('id', procId);
    if (error) throw new Error(`[deleteProcurement] ${error.message}`);
    return true;
  }

  // ========== Worker Logs CRUD ==========

  async createWorkerLog(logData: InsertWorkerLog): Promise<number> {
    const now = new Date().toISOString();
    const row = {
      order_id: logData.order_id,
      qty: logData.qty,
      act_time_per_unit: logData.act_time_per_unit,
      worker: logData.worker,
      date: logData.date,
      created_at: now
    };
    const { data, error } = await supabase.from('workers_log').insert(row).select('id').single();
    if (error) throw new Error(`[createWorkerLog] ${error.message}`);
    return (data as any).id as number;
  }

  async getWorkerLogs(options: {
    orderId?: string;
    worker?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ logs: WorkerLog[], total: number }> {
    const { orderId, worker, from, to, page = 1, pageSize = 50 } = options;
    const offset = (page - 1) * pageSize;

    let countQuery = supabase.from('workers_log').select('*', { count: 'exact', head: true });
    let dataQuery = supabase.from('workers_log').select('*');

    if (orderId) { countQuery = countQuery.eq('order_id', orderId); dataQuery = dataQuery.eq('order_id', orderId); }
    if (worker) { countQuery = countQuery.eq('worker', worker); dataQuery = dataQuery.eq('worker', worker); }
    if (from) { countQuery = countQuery.gte('date', from); dataQuery = dataQuery.gte('date', from); }
    if (to) { countQuery = countQuery.lte('date', to); dataQuery = dataQuery.lte('date', to); }

    dataQuery = dataQuery.order('date', { ascending: false }).range(offset, offset + pageSize - 1);

    const [{ count, error: ce }, { data, error: de }] = await Promise.all([countQuery, dataQuery]);
    if (ce) throw new Error(`[getWorkerLogs count] ${ce.message}`);
    if (de) throw new Error(`[getWorkerLogs data] ${de.message}`);

    const logs = (data || []) as WorkerLog[];

    // product_name取得
    const orderIds = [...new Set(logs.map(l => l.order_id).filter(Boolean) as string[])];
    let orderNameMap = new Map<string, string>();
    if (orderIds.length > 0) {
      const { data: orders } = await supabase
        .from('orders')
        .select('order_id,product_name')
        .in('order_id', orderIds);
      for (const o of orders || []) {
        orderNameMap.set(o.order_id, o.product_name || '');
      }
    }

    const logsWithName = logs.map(l => ({
      ...l,
      product_name: l.order_id ? orderNameMap.get(l.order_id) || '' : ''
    }));

    return { logs: logsWithName, total: count ?? 0 };
  }

  async deleteWorkerLog(logId: number): Promise<boolean> {
    const { error } = await supabase.from('workers_log').delete().eq('id', logId);
    if (error) throw new Error(`[deleteWorkerLog] ${error.message}`);
    return true;
  }

  // ========== KPI & Analytics ==========

  async getDashboardKPI(options: { from?: string; to?: string } = {}): Promise<DashboardKPI> {
    const { from, to } = options;

    let orderQuery = supabase.from('orders').select('*');
    if (from) orderQuery = orderQuery.gte('due_date', from);
    if (to) orderQuery = orderQuery.lte('due_date', to);

    const { data: orders, error: oe } = await orderQuery;
    if (oe) throw new Error(`[getDashboardKPI] ${oe.message}`);

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
      const orderProcs = procurements.filter(p => p.order_id === order.order_id);
      const orderWLogs = workerLogs.filter(w => w.order_id === order.order_id);
      const kpi = calcOrderKPIFromData(order, orderProcs, orderWLogs);
      totalSales += kpi.sales;
      totalGrossProfit += kpi.gross_profit;
      totalStdHours += kpi.qty * kpi.std_time_per_unit;
      totalActualHours += kpi.qty * kpi.actual_time_per_unit;
      if (kpi.variance_pct !== 0) { varianceSum += kpi.variance_pct; validVarianceCount++; }
    }

    const avgVariancePct = validVarianceCount > 0 ? varianceSum / validVarianceCount : 0;

    return {
      total_sales: totalSales, total_gross_profit: totalGrossProfit,
      total_std_hours: totalStdHours, total_actual_hours: totalActualHours,
      avg_variance_pct: avgVariancePct,
      purchase_completion_rate: 0,
      manufacture_completion_rate: 0
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

    if (orderIds.length > 0) {
      const { data: procs } = await supabase
        .from('procurements')
        .select('id,order_id,item_name,eta,status')
        .in('order_id', orderIds);

      for (const proc of (procs || []) as any[]) {
        if (proc.eta) {
          events.push({
            id: `proc-${proc.id}`,
            title: `発注: ${proc.item_name || ''}`,
            date: proc.eta,
            type: 'eta',
            status: proc.status === '完了' ? 'completed' : 'pending',
            order_id: proc.order_id,
            procurement_id: proc.id
          });
        }
      }
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getCSVData(options: { from?: string; to?: string } = {}): Promise<OrderKPI[]> {
    const { from, to } = options;

    let orderQuery = supabase.from('orders').select('*');
    if (from) orderQuery = orderQuery.gte('due_date', from);
    if (to) orderQuery = orderQuery.lte('due_date', to);
    orderQuery = orderQuery.order('due_date', { ascending: true });

    const { data: orders } = await orderQuery;
    const orderList = (orders || []) as Order[];
    const orderIds = orderList.map(o => o.order_id);
    if (orderIds.length === 0) return [];

    const [procRes, wlRes] = await Promise.all([
      supabase.from('procurements').select('*').in('order_id', orderIds),
      supabase.from('workers_log').select('*').in('order_id', orderIds)
    ]);

    const procurements = (procRes.data || []) as Procurement[];
    const workerLogs = (wlRes.data || []) as WorkerLog[];

    return orderList.map(order => {
      const orderProcs = procurements.filter(p => p.order_id === order.order_id);
      const orderWLogs = workerLogs.filter(w => w.order_id === order.order_id);
      return calcOrderKPIFromData(order, orderProcs, orderWLogs);
    });
  }

  // ========== Utility Methods ==========

  async getOrdersForDropdown(): Promise<{ order_id: string; client_name: string | null; project_title: string | null }[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('order_id,client_name,project_title')
      .order('order_id', { ascending: true });
    if (error) throw new Error(`[getOrdersForDropdown] ${error.message}`);
    return (data || []) as any[];
  }

  async getWorkers(): Promise<{ worker: string }[]> {
    const { data, error } = await supabase
      .from('workers_log')
      .select('worker')
      .not('worker', 'is', null);
    if (error) throw new Error(`[getWorkers] ${error.message}`);
    const unique = [...new Set((data || []).map((r: any) => r.worker).filter(Boolean))];
    return unique.sort().map(w => ({ worker: w }));
  }

  async getOrdersForGantt(): Promise<{
    id: string; name: string; start: string | null; end: string | null;
    progress: number; type: 'task' | 'procurement' | 'order';
  }[]> {
    const results: any[] = [];

    const [tasksRes, procsRes] = await Promise.all([
      supabase.from('tasks').select('id,task_name,planned_start,planned_end,status,order_id')
        .not('planned_start', 'is', null).not('planned_end', 'is', null)
        .order('planned_start', { ascending: true }),
      supabase.from('procurements').select('id,item_name,order_id,eta,status')
        .not('eta', 'is', null)
        .order('eta', { ascending: true, nullsFirst: false })
    ]);

    const tasks = (tasksRes.data || []) as any[];
    const orderIds = [...new Set([
      ...tasks.map((t: any) => t.order_id),
      ...(procsRes.data || []).map((p: any) => p.order_id)
    ].filter(Boolean) as string[])];

    let orderNameMap = new Map<string, string>();
    if (orderIds.length > 0) {
      const { data: orders } = await supabase
        .from('orders').select('order_id,project_title,product_name').in('order_id', orderIds);
      for (const o of orders || []) {
        orderNameMap.set(o.order_id, o.project_title || o.product_name || '');
      }
    }

    for (const task of tasks) {
      const progress = task.status === 'completed' ? 100 : task.status === 'in_progress' ? 50 : 0;
      results.push({
        id: `task-${task.id}`,
        name: `[${task.order_id}] ${task.task_name}`,
        start: task.planned_start,
        end: task.planned_end,
        progress,
        type: 'task'
      });
    }

    for (const proc of (procsRes.data || []) as any[]) {
      const orderDate = proc.eta;
      if (!orderDate) continue;
      const endDateObj = new Date(orderDate);
      endDateObj.setDate(endDateObj.getDate() + 7);
      const endDate = endDateObj.toISOString().split('T')[0];
      const isCompleted = proc.status === '完了';
      const displayName = proc.order_id
        ? `[${proc.order_id}] ${proc.item_name || '発注'} (調達)` : `${proc.item_name || '発注'} (調達)`;
      results.push({
        id: `proc-${proc.id}`,
        name: displayName,
        start: orderDate,
        end: endDate,
        progress: isCompleted ? 100 : 0,
        type: 'procurement'
      });
    }

    results.sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    return results;
  }

  async getGanttHierarchy(): Promise<{
    orderId: string; projectName: string;
    tasks: { id: string; taskName: string; startDate: string; endDate: string; progress: number; type: 'task' | 'procurement' }[];
  }[]> {
    const projectsMap = new Map<string, any>();

    const [tasksRes, wlTaskRes, wlOrderRes, procsRes] = await Promise.all([
      supabase.from('tasks').select('*')
        .not('planned_start', 'is', null).not('planned_end', 'is', null)
        .order('order_id').order('planned_start', { ascending: true }),
      supabase.from('work_logs').select('order_id,task_name,duration_hours')
        .not('order_id', 'is', null).not('task_name', 'is', null),
      supabase.from('workers_log').select('order_id,qty,act_time_per_unit')
        .not('order_id', 'is', null),
      supabase.from('procurements')
        .select('id,item_name,order_id,eta,status')
        .not('eta', 'is', null)
        .order('order_id').order('eta', { ascending: true, nullsFirst: false })
    ]);

    const tasks = (tasksRes.data || []) as any[];
    const allOrderIds = [...new Set([
      ...tasks.map((t: any) => t.order_id),
      ...(procsRes.data || []).map((p: any) => p.order_id)
    ].filter(Boolean) as string[])];

    let orderNameMap = new Map<string, string>();
    if (allOrderIds.length > 0) {
      const { data: orders } = await supabase
        .from('orders').select('order_id,project_title,product_name').in('order_id', allOrderIds);
      for (const o of orders || []) {
        orderNameMap.set(o.order_id, o.project_title || o.product_name || o.order_id);
      }
    }

    // task別作業実績集計
    const workLogsByTask = new Map<string, number>();
    const ordersWithTaskLogs = new Set<string>();
    for (const log of (wlTaskRes.data || []) as any[]) {
      if (!log.task_name || !log.task_name.trim()) continue;
      const key = `${log.order_id}|${log.task_name}`;
      workLogsByTask.set(key, (workLogsByTask.get(key) || 0) + (log.duration_hours || 0));
      ordersWithTaskLogs.add(log.order_id);
    }

    // 受注別実績時間（workers_log）
    const actualHoursByOrder = new Map<string, number>();
    for (const log of (wlOrderRes.data || []) as any[]) {
      const hours = (log.qty || 0) * (log.act_time_per_unit || 0);
      actualHoursByOrder.set(log.order_id, (actualHoursByOrder.get(log.order_id) || 0) + hours);
    }

    // 受注別計画時間
    const orderPlannedHours = new Map<string, number>();
    for (const task of tasks) {
      const plannedHours = (task.std_time_per_unit || 0) * (task.qty || 0);
      orderPlannedHours.set(task.order_id, (orderPlannedHours.get(task.order_id) || 0) + plannedHours);
    }

    for (const task of tasks) {
      const orderId = task.order_id || 'unknown';
      if (!projectsMap.has(orderId)) {
        projectsMap.set(orderId, {
          orderId,
          projectName: orderNameMap.get(orderId) || orderId,
          tasks: []
        });
      }

      const taskPlannedHours = (task.std_time_per_unit || 0) * (task.qty || 0);
      let progress = 0;
      if (task.status === 'completed') {
        progress = 100;
      } else {
        const taskKey = `${orderId}|${task.task_name}`;
        const taskSpecificHours = workLogsByTask.get(taskKey);
        if (taskSpecificHours !== undefined && taskPlannedHours > 0) {
          progress = Math.min(100, Math.round((taskSpecificHours / taskPlannedHours) * 100));
        } else if (!ordersWithTaskLogs.has(orderId)) {
          const orderActualHours = actualHoursByOrder.get(orderId) || 0;
          const totalOrderPlanned = orderPlannedHours.get(orderId) || 0;
          if (totalOrderPlanned > 0 && orderActualHours > 0) {
            progress = Math.min(100, Math.round((orderActualHours / totalOrderPlanned) * 100));
          } else if (task.status === 'in_progress') {
            progress = 50;
          }
        } else if (task.status === 'in_progress') {
          progress = 50;
        }
      }

      projectsMap.get(orderId)!.tasks.push({
        id: `task-${task.id}`,
        taskName: task.task_name,
        startDate: task.planned_start,
        endDate: task.planned_end,
        progress,
        type: 'task'
      });
    }

    for (const proc of (procsRes.data || []) as any[]) {
      const orderId = proc.order_id || 'unknown';
      const startDate = proc.eta;
      if (!startDate) continue;

      if (!projectsMap.has(orderId)) {
        projectsMap.set(orderId, {
          orderId,
          projectName: orderNameMap.get(orderId) || orderId,
          tasks: []
        });
      }

      const endDateObj = new Date(startDate);
      endDateObj.setDate(endDateObj.getDate() + 7);
      const endDate = endDateObj.toISOString().split('T')[0];
      const isCompleted = proc.status === '完了';

      projectsMap.get(orderId)!.tasks.push({
        id: `proc-${proc.id}`,
        taskName: `${proc.item_name || '発注'} (調達)`,
        startDate,
        endDate,
        progress: isCompleted ? 100 : 0,
        type: 'procurement'
      });
    }

    return Array.from(projectsMap.values()).sort((a, b) => {
      const aMin = a.tasks.length > 0 ? Math.min(...a.tasks.map((t: any) => new Date(t.startDate).getTime())) : Infinity;
      const bMin = b.tasks.length > 0 ? Math.min(...b.tasks.map((t: any) => new Date(t.startDate).getTime())) : Infinity;
      return aMin - bMin;
    });
  }

  // ========== Tasks CRUD ==========

  async createTask(taskData: InsertTask): Promise<number> {
    const now = new Date().toISOString();
    const row = {
      order_id: taskData.order_id,
      task_name: taskData.task_name,
      assignee: taskData.assignee || null,
      planned_start: taskData.planned_start,
      planned_end: taskData.planned_end,
      std_time_per_unit: taskData.std_time_per_unit,
      qty: taskData.qty,
      status: taskData.status || 'not_started',
      created_at: now
    };
    const { data, error } = await supabase.from('tasks').insert(row).select('id').single();
    if (error) throw new Error(`[createTask] ${error.message}`);
    return (data as any).id as number;
  }

  async getTasks(options: {
    order_id?: string; status?: string; from?: string; to?: string;
    page?: number; pageSize?: number;
  } = {}): Promise<{ tasks: Task[], total: number }> {
    const { order_id, status, from, to, page = 1, pageSize = 20 } = options;
    const offset = (page - 1) * pageSize;

    let countQuery = supabase.from('tasks').select('*', { count: 'exact', head: true });
    let dataQuery = supabase.from('tasks').select('*');

    if (order_id) { countQuery = countQuery.eq('order_id', order_id); dataQuery = dataQuery.eq('order_id', order_id); }
    if (status) { countQuery = countQuery.eq('status', status); dataQuery = dataQuery.eq('status', status); }
    if (from) { countQuery = countQuery.gte('planned_start', from); dataQuery = dataQuery.gte('planned_start', from); }
    if (to) { countQuery = countQuery.lte('planned_end', to); dataQuery = dataQuery.lte('planned_end', to); }

    dataQuery = dataQuery.order('planned_start', { ascending: true }).range(offset, offset + pageSize - 1);

    const [{ count, error: ce }, { data, error: de }] = await Promise.all([countQuery, dataQuery]);
    if (ce) throw new Error(`[getTasks count] ${ce.message}`);
    if (de) throw new Error(`[getTasks data] ${de.message}`);

    return { tasks: (data || []) as Task[], total: count ?? 0 };
  }

  async getTaskById(taskId: number): Promise<Task | null> {
    const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
    if (error) throw new Error(`[getTaskById] ${error.message}`);
    return data as Task | null;
  }

  async updateTask(taskId: number, updates: Partial<InsertTask>): Promise<boolean> {
    const allowedColumns = ['task_name', 'assignee', 'planned_start', 'planned_end', 'std_time_per_unit', 'qty', 'status'];
    const filtered: Record<string, any> = {};
    for (const key of Object.keys(updates)) {
      if (allowedColumns.includes(key)) filtered[key] = (updates as any)[key];
    }
    if (Object.keys(filtered).length === 0) return false;
    const { error } = await supabase.from('tasks').update(filtered).eq('id', taskId);
    if (error) throw new Error(`[updateTask] ${error.message}`);
    return true;
  }

  async deleteTask(taskId: number): Promise<boolean> {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw new Error(`[deleteTask] ${error.message}`);
    return true;
  }

  // ========== Work Logs CRUD ==========

  async createWorkLog(logData: InsertWorkLog): Promise<number> {
    const row: Record<string, any> = {};
    const addField = (k: string, v: any) => { if (v !== undefined && v !== null) row[k] = v; };

    addField('work_date', logData.work_date);
    addField('employee_name', logData.employee_name);
    addField('client_name', logData.client_name);
    addField('project_name', logData.project_name);
    addField('task_large', logData.task_large);
    addField('task_medium', logData.task_medium);
    addField('task_small', logData.task_small);
    addField('work_name', logData.work_name);
    addField('planned_time', logData.planned_time);
    addField('actual_time', logData.actual_time);
    addField('total_work_time', logData.total_work_time);
    addField('note', logData.note);
    addField('date', logData.date);
    addField('worker', logData.worker);
    addField('task_name', logData.task_name);
    addField('task_id', logData.task_id);
    addField('start_time', logData.start_time);
    addField('end_time', logData.end_time);
    addField('duration_hours', logData.duration_hours);
    addField('quantity', logData.quantity);
    addField('memo', logData.memo);
    addField('status', logData.status);
    addField('order_id', logData.order_id);
    addField('order_no', logData.order_no);
    row.match_status = logData.match_status || 'unlinked';
    row.source = logData.source || 'manual';

    const { data, error } = await supabase.from('work_logs').insert(row).select('id').single();
    if (error) throw new Error(`[createWorkLog] ${error.message}`);
    return (data as any).id as number;
  }

  async getWorkLogs(options: {
    date?: string; worker?: string; order_id?: string;
    from?: string; to?: string; page?: number; pageSize?: number;
  } = {}): Promise<{ logs: (WorkLog & { product_name?: string })[], total: number }> {
    const { date, worker, order_id, from, to, page = 1, pageSize = 50 } = options;
    const offset = (page - 1) * pageSize;

    let countQuery = supabase.from('work_logs').select('*', { count: 'exact', head: true });
    let dataQuery = supabase.from('work_logs').select('*');

    if (date) { countQuery = countQuery.eq('date', date); dataQuery = dataQuery.eq('date', date); }
    if (worker) { countQuery = countQuery.eq('worker', worker); dataQuery = dataQuery.eq('worker', worker); }
    if (order_id) { countQuery = countQuery.eq('order_id', order_id); dataQuery = dataQuery.eq('order_id', order_id); }
    if (from) { countQuery = countQuery.gte('date', from); dataQuery = dataQuery.gte('date', from); }
    if (to) { countQuery = countQuery.lte('date', to); dataQuery = dataQuery.lte('date', to); }

    dataQuery = dataQuery.order('date', { ascending: false }).order('start_time', { ascending: false }).range(offset, offset + pageSize - 1);

    const [{ count, error: ce }, { data, error: de }] = await Promise.all([countQuery, dataQuery]);
    if (ce) throw new Error(`[getWorkLogs count] ${ce.message}`);
    if (de) throw new Error(`[getWorkLogs data] ${de.message}`);

    const logs = (data || []) as (WorkLog & { product_name?: string })[];

    // product_name取得
    const orderIds = [...new Set(logs.map(l => l.order_id).filter(Boolean) as string[])];
    if (orderIds.length > 0) {
      const { data: orders } = await supabase
        .from('orders').select('order_id,product_name').in('order_id', orderIds);
      const nameMap = new Map<string, string>();
      for (const o of orders || []) nameMap.set(o.order_id, o.product_name || '');
      logs.forEach(l => { if (l.order_id) l.product_name = nameMap.get(l.order_id) || ''; });
    }

    return { logs, total: count ?? 0 };
  }

  async getWorkLogById(logId: number): Promise<WorkLog | null> {
    const { data, error } = await supabase.from('work_logs').select('*').eq('id', logId).maybeSingle();
    if (error) throw new Error(`[getWorkLogById] ${error.message}`);
    return data as WorkLog | null;
  }

  async updateWorkLog(logId: number, updates: Partial<InsertWorkLog>): Promise<boolean> {
    const allowedColumns = ['date', 'order_id', 'task_name', 'task_id', 'worker', 'start_time',
      'end_time', 'duration_hours', 'quantity', 'memo', 'status'];
    const filtered: Record<string, any> = {};
    for (const key of Object.keys(updates)) {
      if (allowedColumns.includes(key)) filtered[key] = (updates as any)[key];
    }
    if (Object.keys(filtered).length === 0) return false;
    const { error } = await supabase.from('work_logs').update(filtered).eq('id', logId);
    if (error) throw new Error(`[updateWorkLog] ${error.message}`);
    return true;
  }

  async deleteWorkLog(logId: number): Promise<boolean> {
    const { error } = await supabase.from('work_logs').delete().eq('id', logId);
    if (error) throw new Error(`[deleteWorkLog] ${error.message}`);
    return true;
  }

  async checkWorkLogOverlap(
    worker: string, date: string, startTime: string, endTime: string, excludeLogId?: number
  ): Promise<WorkLog[]> {
    // 時間重複チェック: start_time < endTime AND end_time > startTime
    let query = supabase.from('work_logs').select('*')
      .eq('worker', worker)
      .eq('date', date)
      .not('start_time', 'is', null)
      .not('end_time', 'is', null)
      .lt('start_time', endTime)
      .gt('end_time', startTime);

    if (excludeLogId) query = query.neq('id', excludeLogId);

    const { data, error } = await query;
    if (error) throw new Error(`[checkWorkLogOverlap] ${error.message}`);
    return (data || []) as WorkLog[];
  }

  async getTasksByOrderId(orderId: string): Promise<Task[]> {
    const { data, error } = await supabase.from('tasks').select('*')
      .eq('order_id', orderId).order('planned_start', { ascending: true });
    if (error) throw new Error(`[getTasksByOrderId] ${error.message}`);
    return (data || []) as Task[];
  }

  // ========== Materials Master CRUD ==========

  async getMaterials(options?: { material_type?: string; search?: string }): Promise<Material[]> {
    let query = supabase.from('materials').select('*');
    if (options?.material_type) query = query.eq('material_type', options.material_type);
    if (options?.search) {
      query = query.or(
        `name.ilike.%${options.search}%,size.ilike.%${options.search}%,remark.ilike.%${options.search}%`
      );
    }
    query = query.order('material_type').order('name').order('size');
    const { data, error } = await query;
    if (error) throw new Error(`[getMaterials] ${error.message}`);
    return (data || []) as Material[];
  }

  async getMaterialById(id: number): Promise<Material | undefined> {
    const { data, error } = await supabase.from('materials').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`[getMaterialById] ${error.message}`);
    return data as Material | undefined;
  }

  async createMaterial(data: InsertMaterial): Promise<number> {
    const now = new Date().toISOString();
    const row = {
      material_type: data.material_type,
      name: data.name,
      size: data.size,
      unit: data.unit,
      unit_weight: data.unit_weight ?? null,
      unit_price: data.unit_price ?? null,
      remark: data.remark ?? null,
      created_at: now
    };
    const { data: result, error } = await supabase.from('materials').insert(row).select('id').single();
    if (error) throw new Error(`[createMaterial] ${error.message}`);
    return (result as any).id as number;
  }

  async updateMaterial(id: number, data: Partial<InsertMaterial>): Promise<boolean> {
    const allowed = ['material_type', 'name', 'size', 'unit', 'unit_weight', 'unit_price', 'remark'];
    const filtered: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      if (allowed.includes(key)) filtered[key] = (data as any)[key];
    }
    if (Object.keys(filtered).length === 0) return false;
    const { error } = await supabase.from('materials').update(filtered).eq('id', id);
    if (error) throw new Error(`[updateMaterial] ${error.message}`);
    return true;
  }

  async deleteMaterial(id: number): Promise<boolean> {
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) throw new Error(`[deleteMaterial] ${error.message}`);
    return true;
  }

  async getMaterialTypes(): Promise<string[]> {
    const { data, error } = await supabase.from('materials').select('material_type');
    if (error) throw new Error(`[getMaterialTypes] ${error.message}`);
    const unique = [...new Set((data || []).map((r: any) => r.material_type).filter(Boolean))];
    return unique.sort() as string[];
  }

  // ========== Material Usages CRUD ==========

  async getMaterialUsages(options?: {
    project_id?: string; material_id?: number; area?: string; zone?: string;
  }): Promise<MaterialUsageWithMaterial[]> {
    let muQuery = supabase.from('material_usages').select('*');
    if (options?.project_id) muQuery = muQuery.eq('project_id', options.project_id);
    if (options?.material_id) muQuery = muQuery.eq('material_id', options.material_id);
    if (options?.area) muQuery = muQuery.eq('area', options.area);
    if (options?.zone) muQuery = muQuery.eq('zone', options.zone);
    muQuery = muQuery.order('project_id').order('area').order('zone');

    const { data: usages, error } = await muQuery;
    if (error) throw new Error(`[getMaterialUsages] ${error.message}`);

    return this._enrichMaterialUsages((usages || []) as MaterialUsage[]);
  }

  async getMaterialUsageById(id: number): Promise<MaterialUsageWithMaterial | undefined> {
    const { data, error } = await supabase.from('material_usages').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`[getMaterialUsageById] ${error.message}`);
    if (!data) return undefined;
    const enriched = await this._enrichMaterialUsages([data as MaterialUsage]);
    return enriched[0];
  }

  private async _enrichMaterialUsages(usages: MaterialUsage[]): Promise<MaterialUsageWithMaterial[]> {
    if (usages.length === 0) return [];
    const matIds = [...new Set(usages.map(u => u.material_id).filter(Boolean) as number[])];
    const { data: mats } = await supabase.from('materials').select('*').in('id', matIds);
    const matMap = new Map<number, any>();
    for (const m of mats || []) matMap.set(m.id, m);

    return usages.map(u => {
      const m = matMap.get(u.material_id as number);
      let totalWeight: number | null = null;
      if (m?.unit_weight != null) {
        if (u.length != null) {
          totalWeight = m.unit_weight * (u.length as number) * ((u.quantity as number) || 1);
        } else {
          totalWeight = m.unit_weight * ((u.quantity as number) || 1);
        }
      }
      return {
        ...u,
        material_type: m?.material_type ?? null,
        material_name: m?.name ?? null,
        material_size: m?.size ?? null,
        unit: m?.unit ?? null,
        unit_weight: m?.unit_weight ?? null,
        total_weight: totalWeight
      } as MaterialUsageWithMaterial;
    });
  }

  async createMaterialUsage(data: InsertMaterialUsage): Promise<number> {
    const now = new Date().toISOString();
    const row = {
      project_id: data.project_id,
      area: data.area ?? null,
      zone: data.zone ?? null,
      drawing_no: data.drawing_no ?? null,
      material_id: data.material_id,
      quantity: data.quantity ?? 1,
      length: data.length ?? null,
      remark: data.remark ?? null,
      created_at: now
    };
    const { data: result, error } = await supabase.from('material_usages').insert(row).select('id').single();
    if (error) throw new Error(`[createMaterialUsage] ${error.message}`);
    return (result as any).id as number;
  }

  async updateMaterialUsage(id: number, data: Partial<InsertMaterialUsage>): Promise<boolean> {
    const allowed = ['project_id', 'area', 'zone', 'drawing_no', 'material_id', 'quantity', 'length', 'remark'];
    const filtered: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      if (allowed.includes(key)) filtered[key] = (data as any)[key];
    }
    if (Object.keys(filtered).length === 0) return false;
    const { error } = await supabase.from('material_usages').update(filtered).eq('id', id);
    if (error) throw new Error(`[updateMaterialUsage] ${error.message}`);
    return true;
  }

  async deleteMaterialUsage(id: number): Promise<boolean> {
    const { error } = await supabase.from('material_usages').delete().eq('id', id);
    if (error) throw new Error(`[deleteMaterialUsage] ${error.message}`);
    return true;
  }

  async getMaterialUsageSummary(options?: {
    project_id?: string; group_by_material_type?: boolean;
  }): Promise<Array<{
    project_id: string; zone: string | null; material_type: string | null;
    total_quantity: number; total_weight: number | null; record_count: number;
  }>> {
    const grouped = options?.group_by_material_type ?? true;
    let usages = await this.getMaterialUsages();
    if (options?.project_id) {
      const filterLower = options.project_id.toLowerCase();
      usages = usages.filter(u => u.project_id?.toLowerCase().includes(filterLower));
    }

    // JS集計
    const summaryMap = new Map<string, any>();
    for (const u of usages) {
      const matType = grouped ? (u.material_type || null) : null;
      const key = grouped
        ? `${u.project_id}|${u.zone ?? 'null'}|${matType ?? 'null'}`
        : `${u.project_id}`;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          project_id: u.project_id,
          zone: u.zone ?? null,
          material_type: matType,
          total_quantity: 0,
          total_weight: 0,
          record_count: 0,
          has_weight: false
        });
      }
      const entry = summaryMap.get(key);
      entry.total_quantity += (u.quantity as number) || 0;
      if (u.total_weight != null) { entry.total_weight += u.total_weight; entry.has_weight = true; }
      entry.record_count++;
    }

    return Array.from(summaryMap.values()).map(e => ({
      project_id: e.project_id,
      zone: e.zone,
      material_type: e.material_type,
      total_quantity: e.total_quantity,
      total_weight: e.has_weight ? e.total_weight : null,
      record_count: e.record_count
    }));
  }

  // ========== Cost Settings CRUD ==========

  async getCostSettings(): Promise<CostSettings> {
    const { data, error } = await supabase.from('cost_settings').select('*').eq('id', 1).maybeSingle();
    if (error) throw new Error(`[getCostSettings] ${error.message}`);

    if (!data) {
      const now = new Date().toISOString();
      const defaults: CostSettings = { id: 1, labor_rate_per_hour: 3000, updated_at: now };
      const { error: ie } = await supabase.from('cost_settings').upsert(defaults, { onConflict: 'id' });
      if (ie) throw new Error(`[getCostSettings upsert] ${ie.message}`);
      return defaults;
    }

    return data as CostSettings;
  }

  async updateCostSettings(laborRatePerHour: number): Promise<CostSettings> {
    const now = new Date().toISOString();
    const { error } = await supabase.from('cost_settings').update({
      labor_rate_per_hour: laborRatePerHour,
      updated_at: now
    }).eq('id', 1);
    if (error) throw new Error(`[updateCostSettings] ${error.message}`);
    return this.getCostSettings();
  }

  // ========== Cost Aggregation ==========

  async getCostAggregation(): Promise<CostAggregationResponse> {
    const settings = await this.getCostSettings();
    const laborRate = settings.labor_rate_per_hour;

    // バッチ取得
    const [ordersRes, muRes, wlRes, wlogRes, procRes, outRes, workersRes] = await Promise.all([
      supabase.from('orders').select('order_id,project_title,client_name,estimated_amount'),
      supabase.from('material_usages').select('*'),
      supabase.from('work_logs').select('order_id,worker,employee_name,duration_hours')
        .not('order_id', 'is', null).not('duration_hours', 'is', null).gt('duration_hours', 0),
      supabase.from('workers_log').select('order_id,worker,qty,act_time_per_unit')
        .not('order_id', 'is', null),
      supabase.from('procurements').select('order_id,vendor,total_amount'),
      supabase.from('outsourcing_costs').select('project_id,amount'),
      supabase.from('workers_master').select('name,hourly_rate')
    ]);

    const orders = (ordersRes.data || []) as any[];
    const materialUsages = (muRes.data || []) as MaterialUsage[];
    const workLogs = (wlRes.data || []) as any[];
    const workersLogs = (wlogRes.data || []) as any[];
    const procurementsData = (procRes.data || []) as any[];
    const outsourcingData = (outRes.data || []) as any[];
    const workersMasterData = (workersRes.data || []) as any[];

    // 材料IDから材料情報を取得
    const matIds = [...new Set(materialUsages.map(u => u.material_id).filter(Boolean) as number[])];
    let matsMap = new Map<number, any>();
    if (matIds.length > 0) {
      const { data: mats } = await supabase.from('materials').select('id,unit,unit_weight,unit_price').in('id', matIds);
      for (const m of mats || []) matsMap.set(m.id, m);
    }

    // 作業者単価マップ
    const workerRatesMap = new Map<string, number>();
    for (const w of workersMasterData) workerRatesMap.set(w.name, w.hourly_rate);
    const defaultRate = laborRate;

    // 材料費集計（受注別・工区別）
    const materialCostByOrderZone = new Map<string, Map<string, { cost: number; hasMissing: boolean }>>();
    const materialCostByOrder = new Map<string, { cost: number; hasMissing: boolean }>();

    for (const mu of materialUsages) {
      const orderId = mu.project_id as string;
      if (!orderId) continue;
      const zone = (mu.zone as string) || '未設定';
      const m = matsMap.get(mu.material_id as number);

      let cost = 0;
      let hasMissing = false;

      if (m?.unit_price != null) {
        const qty = (mu.quantity as number) || 0;
        let factor = 1;
        if (m.unit === 'kg' && m.unit_weight != null && mu.length != null) {
          factor = (mu.length as number) * m.unit_weight;
        } else if (m.unit === 'm' && mu.length != null) {
          factor = mu.length as number;
        }
        cost = m.unit_price * qty * factor;
      } else {
        hasMissing = true;
      }

      // 工区別
      if (!materialCostByOrderZone.has(orderId)) materialCostByOrderZone.set(orderId, new Map());
      const zoneMap = materialCostByOrderZone.get(orderId)!;
      if (!zoneMap.has(zone)) zoneMap.set(zone, { cost: 0, hasMissing: false });
      const zEntry = zoneMap.get(zone)!;
      zEntry.cost += cost;
      if (hasMissing) zEntry.hasMissing = true;

      // 受注別
      if (!materialCostByOrder.has(orderId)) materialCostByOrder.set(orderId, { cost: 0, hasMissing: false });
      const oEntry = materialCostByOrder.get(orderId)!;
      oEntry.cost += cost;
      if (hasMissing) oEntry.hasMissing = true;
    }

    // 実績労務費（work_logs）
    const actualLaborMap = new Map<string, { totalHours: number; totalCost: number }>();
    for (const wl of workLogs) {
      const hours = wl.duration_hours || 0;
      const workerName = wl.worker || wl.employee_name || '不明';
      const rate = workerRatesMap.get(workerName) ?? defaultRate;
      const cost = hours * rate;
      if (!actualLaborMap.has(wl.order_id)) actualLaborMap.set(wl.order_id, { totalHours: 0, totalCost: 0 });
      const e = actualLaborMap.get(wl.order_id)!;
      e.totalHours += hours;
      e.totalCost += cost;
    }

    // 推定労務費（workers_log）
    const estimatedLaborMap = new Map<string, { totalHours: number; totalCost: number }>();
    for (const wl of workersLogs) {
      const hours = (wl.qty || 0) * (wl.act_time_per_unit || 0);
      const rate = workerRatesMap.get(wl.worker) ?? defaultRate;
      const cost = hours * rate;
      if (!estimatedLaborMap.has(wl.order_id)) estimatedLaborMap.set(wl.order_id, { totalHours: 0, totalCost: 0 });
      const e = estimatedLaborMap.get(wl.order_id)!;
      e.totalHours += hours;
      e.totalCost += cost;
    }

    // 外注費（procurements[account_type='外注費'] + outsourcing_costs）
    // NOTE: account_type is stored as JSON in old Supabase `vendor` column
    const outsourcingCostMap = new Map<string, number>();
    for (const p of procurementsData) {
      let accountType = '外注費';
      try { accountType = JSON.parse(p.vendor || '{}').account_type ?? '外注費'; } catch { /* ignore */ }
      const amount = p.total_amount;
      if (accountType === '外注費' && amount != null && p.order_id) {
        outsourcingCostMap.set(p.order_id, (outsourcingCostMap.get(p.order_id) || 0) + amount);
      }
    }
    for (const oc of outsourcingData) {
      if (oc.project_id && oc.amount != null) {
        outsourcingCostMap.set(oc.project_id, (outsourcingCostMap.get(oc.project_id) || 0) + oc.amount);
      }
    }

    const orderSummaries: OrderCostSummary[] = [];
    let totalMaterialCost = 0, totalLaborCost = 0, totalOutsourcingCost = 0;

    for (const order of orders) {
      const materialData = materialCostByOrder.get(order.order_id) || { cost: 0, hasMissing: false };
      const outsourcingCost = outsourcingCostMap.get(order.order_id) || 0;

      const actualLabor = actualLaborMap.get(order.order_id);
      const estimatedLabor = estimatedLaborMap.get(order.order_id);

      let laborHours: number, laborCost: number, laborSource: 'actual' | 'estimated' | 'none';
      if (actualLabor && actualLabor.totalHours > 0) {
        laborHours = actualLabor.totalHours; laborCost = actualLabor.totalCost; laborSource = 'actual';
      } else if (estimatedLabor && estimatedLabor.totalHours > 0) {
        laborHours = estimatedLabor.totalHours; laborCost = estimatedLabor.totalCost; laborSource = 'estimated';
      } else {
        laborHours = 0; laborCost = 0; laborSource = 'none';
      }

      const totalCost = materialData.cost + laborCost + outsourcingCost;
      const profit = order.estimated_amount != null ? order.estimated_amount - totalCost : null;
      const profitRate = order.estimated_amount != null && order.estimated_amount > 0
        ? Math.round((profit! / order.estimated_amount) * 100 * 10) / 10 : null;

      // 工区別サマリー
      const zones: ZoneCostSummary[] = [];
      const zoneMap = materialCostByOrderZone.get(order.order_id);
      if (zoneMap) {
        for (const [zone, zData] of zoneMap.entries()) {
          zones.push({ zone, area: null, material_cost: Math.round(zData.cost), has_missing_prices: zData.hasMissing });
        }
        zones.sort((a, b) => a.zone.localeCompare(b.zone));
      }

      if (materialData.cost > 0 || laborCost > 0 || outsourcingCost > 0) {
        orderSummaries.push({
          order_id: order.order_id,
          project_title: order.project_title,
          client_name: order.client_name,
          material_cost: Math.round(materialData.cost),
          labor_cost: Math.round(laborCost),
          labor_hours: Math.round(laborHours * 100) / 100,
          labor_source: laborSource,
          outsourcing_cost: Math.round(outsourcingCost),
          total_cost: Math.round(totalCost),
          estimated_amount: order.estimated_amount,
          profit: profit != null ? Math.round(profit) : null,
          profit_rate: profitRate,
          has_missing_prices: materialData.hasMissing,
          zones
        });
        totalMaterialCost += materialData.cost;
        totalLaborCost += laborCost;
        totalOutsourcingCost += outsourcingCost;
      }
    }

    orderSummaries.sort((a, b) => b.total_cost - a.total_cost);

    return {
      orders: orderSummaries,
      labor_rate_per_hour: laborRate,
      total_material_cost: Math.round(totalMaterialCost),
      total_labor_cost: Math.round(totalLaborCost),
      total_outsourcing_cost: Math.round(totalOutsourcingCost),
      total_cost: Math.round(totalMaterialCost + totalLaborCost + totalOutsourcingCost)
    };
  }

  // ========== Workers Master CRUD ==========

  async createWorkerMaster(data: InsertWorkerMaster): Promise<number> {
    const now = new Date().toISOString();
    const row = {
      name: data.name,
      hourly_rate: data.hourly_rate,
      is_active: data.is_active ?? true,
      created_at: now,
      updated_at: now
    };
    const { data: result, error } = await supabase.from('workers_master').insert(row).select('id').single();
    if (error) throw new Error(`[createWorkerMaster] ${error.message}`);
    return (result as any).id as number;
  }

  async getWorkersMaster(includeInactive: boolean = false): Promise<WorkerMaster[]> {
    let query = supabase.from('workers_master').select('*').order('name');
    if (!includeInactive) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw new Error(`[getWorkersMaster] ${error.message}`);
    return (data || []) as WorkerMaster[];
  }

  async getWorkerMasterById(id: number): Promise<WorkerMaster | null> {
    const { data, error } = await supabase.from('workers_master').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`[getWorkerMasterById] ${error.message}`);
    return data as WorkerMaster | null;
  }

  async getWorkerMasterByName(name: string): Promise<WorkerMaster | null> {
    const { data, error } = await supabase.from('workers_master').select('*').eq('name', name).maybeSingle();
    if (error) throw new Error(`[getWorkerMasterByName] ${error.message}`);
    return data as WorkerMaster | null;
  }

  async updateWorkerMaster(id: number, data: Partial<InsertWorkerMaster>): Promise<boolean> {
    const now = new Date().toISOString();
    const allowed = ['name', 'hourly_rate', 'is_active'];
    const filtered: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      if (allowed.includes(key)) filtered[key] = (data as any)[key];
    }
    if (Object.keys(filtered).length === 0) return false;
    filtered.updated_at = now;
    const { error } = await supabase.from('workers_master').update(filtered).eq('id', id);
    if (error) throw new Error(`[updateWorkerMaster] ${error.message}`);
    return true;
  }

  async deleteWorkerMaster(id: number): Promise<boolean> {
    const { error } = await supabase.from('workers_master').delete().eq('id', id);
    if (error) throw new Error(`[deleteWorkerMaster] ${error.message}`);
    return true;
  }

  async getWorkerHourlyRate(workerName: string): Promise<{ rate: number; source: 'worker' | 'default' }> {
    const worker = await this.getWorkerMasterByName(workerName);
    if (worker) return { rate: worker.hourly_rate, source: 'worker' };
    const settings = await this.getCostSettings();
    return { rate: settings.labor_rate_per_hour, source: 'default' };
  }

  async getWorkerRatesMap(): Promise<Map<string, number>> {
    const { data, error } = await supabase.from('workers_master').select('name,hourly_rate');
    if (error) throw new Error(`[getWorkerRatesMap] ${error.message}`);
    const map = new Map<string, number>();
    for (const w of (data || []) as any[]) map.set(w.name, w.hourly_rate);
    return map;
  }

  // ========== Vendors Master CRUD ==========

  async createVendorMaster(data: InsertVendorMaster): Promise<number> {
    const now = new Date().toISOString();
    const row = {
      name: data.name,
      contact_person: data.contact_person || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      note: data.note || null,
      is_active: data.is_active ?? true,
      created_at: now,
      updated_at: now
    };
    const { data: result, error } = await supabase.from('vendors_master').insert(row).select('id').single();
    if (error) throw new Error(`[createVendorMaster] ${error.message}`);
    return (result as any).id as number;
  }

  async getVendorsMaster(includeInactive: boolean = false): Promise<VendorMaster[]> {
    let query = supabase.from('vendors_master').select('*').order('name');
    if (!includeInactive) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw new Error(`[getVendorsMaster] ${error.message}`);
    return (data || []) as VendorMaster[];
  }

  async getVendorMasterById(id: number): Promise<VendorMaster | null> {
    const { data, error } = await supabase.from('vendors_master').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`[getVendorMasterById] ${error.message}`);
    return data as VendorMaster | null;
  }

  async updateVendorMaster(id: number, data: Partial<InsertVendorMaster>): Promise<boolean> {
    const now = new Date().toISOString();
    const allowed = ['name', 'contact_person', 'phone', 'email', 'address', 'note', 'is_active'];
    const filtered: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      if (allowed.includes(key)) filtered[key] = (data as any)[key] ?? null;
    }
    if (Object.keys(filtered).length === 0) return false;
    filtered.updated_at = now;
    const { error } = await supabase.from('vendors_master').update(filtered).eq('id', id);
    if (error) throw new Error(`[updateVendorMaster] ${error.message}`);
    return true;
  }

  async deleteVendorMaster(id: number): Promise<boolean> {
    const { error } = await supabase.from('vendors_master').delete().eq('id', id);
    if (error) throw new Error(`[deleteVendorMaster] ${error.message}`);
    return true;
  }

  // ========== Outsourcing Costs CRUD ==========

  async createOutsourcingCost(data: InsertOutsourcingCost): Promise<number> {
    const now = new Date().toISOString();
    const row = {
      project_id: data.project_id,
      vendor_id: data.vendor_id,
      description: data.description,
      amount: data.amount,
      date: data.date,
      note: data.note || null,
      created_at: now
    };
    const { data: result, error } = await supabase.from('outsourcing_costs').insert(row).select('id').single();
    if (error) throw new Error(`[createOutsourcingCost] ${error.message}`);
    return (result as any).id as number;
  }

  async getOutsourcingCosts(filters: { project_id?: string; vendor_id?: number }): Promise<OutsourcingCostWithVendor[]> {
    let query = supabase.from('outsourcing_costs').select('*').order('date', { ascending: false }).order('id', { ascending: false });
    if (filters.project_id) query = query.eq('project_id', filters.project_id);
    if (filters.vendor_id) query = query.eq('vendor_id', filters.vendor_id);

    const { data, error } = await query;
    if (error) throw new Error(`[getOutsourcingCosts] ${error.message}`);

    const costs = (data || []) as OutsourcingCost[];
    const vendorIds = [...new Set(costs.map(c => c.vendor_id).filter(Boolean) as number[])];
    const vendorMap = new Map<number, string>();
    if (vendorIds.length > 0) {
      const { data: vendors } = await supabase.from('vendors_master').select('id,name').in('id', vendorIds);
      for (const v of vendors || []) vendorMap.set(v.id, v.name);
    }

    return costs.map(c => ({ ...c, vendor_name: c.vendor_id ? vendorMap.get(c.vendor_id as number) || '' : '' })) as OutsourcingCostWithVendor[];
  }

  async getOutsourcingCostById(id: number): Promise<OutsourcingCostWithVendor | null> {
    const { data, error } = await supabase.from('outsourcing_costs').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`[getOutsourcingCostById] ${error.message}`);
    if (!data) return null;
    const cost = data as OutsourcingCost;
    let vendor_name = '';
    if (cost.vendor_id) {
      const { data: v } = await supabase.from('vendors_master').select('name').eq('id', cost.vendor_id).maybeSingle();
      vendor_name = (v as any)?.name || '';
    }
    return { ...cost, vendor_name } as OutsourcingCostWithVendor;
  }

  async updateOutsourcingCost(id: number, data: Partial<InsertOutsourcingCost>): Promise<boolean> {
    const allowed = ['project_id', 'vendor_id', 'description', 'amount', 'date', 'note'];
    const filtered: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      if (allowed.includes(key)) filtered[key] = (data as any)[key] ?? null;
    }
    if (Object.keys(filtered).length === 0) return false;
    const { error } = await supabase.from('outsourcing_costs').update(filtered).eq('id', id);
    if (error) throw new Error(`[updateOutsourcingCost] ${error.message}`);
    return true;
  }

  async deleteOutsourcingCost(id: number): Promise<boolean> {
    const { error } = await supabase.from('outsourcing_costs').delete().eq('id', id);
    if (error) throw new Error(`[deleteOutsourcingCost] ${error.message}`);
    return true;
  }

  // ========== Customers Master CRUD (Replit PostgreSQL) ==========

  async ensureCustomersMasterSeeded(): Promise<void> {
    const { sql } = await import('../lib/database.js');
    await sql`
      CREATE TABLE IF NOT EXISTS customers_master (
        id SERIAL PRIMARY KEY,
        code TEXT,
        name TEXT NOT NULL,
        zip TEXT,
        address1 TEXT,
        address2 TEXT,
        phone TEXT,
        note TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_customers_master_name ON customers_master(name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customers_master_code ON customers_master(code)`;

    await sql`
      CREATE TABLE IF NOT EXISTS order_customer_map (
        order_id TEXT PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers_master(id) ON DELETE CASCADE,
        updated_at TEXT NOT NULL
      )
    `;

    const existing = await sql`SELECT count(*)::int AS cnt FROM customers_master`;
    if (existing[0].cnt > 0) return;

    const now = '2025-01-01T00:00:00Z';
    const seed: Array<{ code?: string; name: string; zip?: string; address1?: string }> = [
      { code: '109', name: 'the HOUSE' },
      { code: '056', name: 'テイサ産業株式会社', zip: '569-0834', address1: '大阪府高槻市大字唐崎1270番地' },
      { code: '038', name: '三晃特殊金属工業株式会社', zip: '740-8535', address1: '山口県岩国市室の木町1丁目4番55号' },
      { code: '083', name: '光井商事\u3000有限会社', zip: '743-0001', address1: '光市室積西伊保木994の3' },
      { code: '096', name: '兼安石灰機工\u3000株式会社', zip: '746-0012', address1: '周南市政所3丁目7番2号' },
      { code: '024', name: '岐山化工機株式会社', zip: '745-0862', address1: '周南市江口3丁目1-8' },
      { code: '015', name: '川岸工業（株）山口工場', zip: '744-0061', address1: '山口県下松市葉山2丁目904-30' },
      { code: '014', name: '川崎エンジニアリング株式会社' },
      { code: '061', name: '徳機\u3000株式会社', zip: '746-0028', address1: '周南市港町11番1号' },
      { code: '063', name: '徳機\u3000株式会社\u3000エコ事業部', zip: '745-0802', address1: '周南市栗屋字奈切50-5' },
      { code: '062', name: '徳機工事株式会社', zip: '746-0028', address1: '山口県周南市港町12-18' },
      { code: '044', name: '新山陽剪断株式会社', zip: '746-0028', address1: '周南市港町12-26' },
      { code: '069', name: '有限会社\u3000日進工務所', zip: '746-0022', address1: '周南市野村1丁目17-4' },
      { code: '095', name: '有限会社\u3000環境造形', zip: '746-0024', address1: '周南市古泉3丁目8番25号' },
      { code: '078', name: '有限会社\u3000福田鉄工', zip: '746-0043', address1: '周南市新田2丁目3-5' },
      { code: '003', name: '株式会社\u3000アクシス', zip: '750-0323', address1: '下関市菊川町日新11142-1' },
      { code: '039', name: '株式会社\u3000サンライト', zip: '745-0631', address1: '周南市大字安田166-1' },
      { code: '108', name: '株式会社\u3000スティールフォース' },
      { code: '082', name: '株式会社\u3000ミヤハラ', zip: '745-0802', address1: '山口県周南市大字栗屋字奈切50番地-47' },
      { code: '066', name: '株式会社\u3000中村鉄工所', zip: '745-0056', address1: '山口県周南市新宿通3丁目8番地' },
      { code: '065', name: '株式会社\u3000徳機製作所\u3000ベンダ事業部', zip: '746-0028', address1: '周南市港町6-60' },
      { name: '株式会社\u3000河村工機' },
      { code: '026', name: '株式会社\u3000蔵澄鉄工所', zip: '746-0026', address1: '周南市浜田1-7-15' },
      { code: '018', name: '株式会社\u3000鹿野興産', zip: '745-0402', address1: '周南市大字金峰4300番地' },
      { code: '043', name: '白井興業\u3000株式会社', zip: '743-0063', address1: '山口県光市島田2-27-1' },
      { code: '071', name: '白鷺特殊鋼株式会社\u3000山口支店', zip: '754-0894', address1: '山口県山口市佐山字村山3-41山口テクノパーク' },
      { code: '059', name: '藤和工業株式会社', zip: '756-0021', address1: '山陽小野田市高畑77-107' },
      { code: '012', name: '長州産業株式会社' },
      { code: '102', name: '高橋産業\u3000株式会社', zip: '750-0086', address1: '山口県下関市彦島塩浜町1丁目8番3号' },
    ];

    for (const c of seed) {
      await sql`
        INSERT INTO customers_master (code, name, zip, address1, address2, phone, note, is_active, created_at, updated_at)
        VALUES (${c.code}, ${c.name}, ${c.zip || null}, ${c.address1 || null}, ${null}, ${null}, ${null}, ${true}, ${now}, ${now})
      `;
    }
    console.log(`[DAO] Seeded ${seed.length} customers into customers_master`);
  }

  async setOrderCustomerId(orderId: string, customerId: number | null): Promise<void> {
    const { sql } = await import('../lib/database.js');
    if (customerId === null) {
      await sql`DELETE FROM order_customer_map WHERE order_id = ${orderId}`;
    } else {
      const now = new Date().toISOString();
      await sql`
        INSERT INTO order_customer_map (order_id, customer_id, updated_at)
        VALUES (${orderId}, ${customerId}, ${now})
        ON CONFLICT (order_id) DO UPDATE SET customer_id = ${customerId}, updated_at = ${now}
      `;
    }
  }

  async getOrderCustomerId(orderId: string): Promise<number | null> {
    const { sql } = await import('../lib/database.js');
    const rows = await sql`SELECT customer_id FROM order_customer_map WHERE order_id = ${orderId} LIMIT 1`;
    return rows.length > 0 ? rows[0].customer_id : null;
  }

  async getOrderCustomerIds(orderIds: string[]): Promise<Record<string, number>> {
    if (orderIds.length === 0) return {};
    const { sql } = await import('../lib/database.js');
    const rows = await sql`SELECT order_id, customer_id FROM order_customer_map WHERE order_id = ANY(${orderIds})`;
    const map: Record<string, number> = {};
    for (const row of rows) {
      map[row.order_id] = row.customer_id;
    }
    return map;
  }

  async seedOrderCustomerMappings(): Promise<void> {
    const { sql } = await import('../lib/database.js');
    const customers = await this.getCustomersMaster(true);
    const { data: orders } = await supabase.from('orders').select('order_id, client_name');
    if (!orders || orders.length === 0) return;

    const existingMaps = await sql`SELECT order_id FROM order_customer_map`;
    const mappedOrderIds = new Set(existingMaps.map((r: { order_id: string }) => r.order_id));

    const now = new Date().toISOString();
    let linked = 0;
    for (const order of orders) {
      if (mappedOrderIds.has(order.order_id)) continue;
      const matched = customers.find(c => c.name === order.client_name);
      if (matched) {
        await sql`
          INSERT INTO order_customer_map (order_id, customer_id, updated_at)
          VALUES (${order.order_id}, ${matched.id}, ${now})
          ON CONFLICT (order_id) DO NOTHING
        `;
        linked++;
      }
    }
    if (linked > 0) {
      console.log(`[DAO] Linked ${linked} existing orders to customers`);
    }
  }

  async createCustomerMaster(data: InsertCustomerMaster): Promise<number> {
    const now = new Date().toISOString();
    const { sql } = await import('../lib/database.js');
    const rows = await sql`
      INSERT INTO customers_master (code, name, zip, address1, address2, phone, note, is_active, created_at, updated_at)
      VALUES (${data.code || null}, ${data.name}, ${data.zip || null}, ${data.address1 || null}, ${data.address2 || null}, ${data.phone || null}, ${data.note || null}, ${data.is_active ?? true}, ${now}, ${now})
      RETURNING id
    `;
    return rows[0].id as number;
  }

  async getCustomersMaster(includeInactive: boolean = false): Promise<CustomerMaster[]> {
    const { sql } = await import('../lib/database.js');
    let rows;
    if (includeInactive) {
      rows = await sql`SELECT * FROM customers_master ORDER BY name`;
    } else {
      rows = await sql`SELECT * FROM customers_master WHERE is_active = true ORDER BY name`;
    }
    return rows as CustomerMaster[];
  }

  async getCustomerMasterById(id: number): Promise<CustomerMaster | null> {
    const { sql } = await import('../lib/database.js');
    const rows = await sql`SELECT * FROM customers_master WHERE id = ${id} LIMIT 1`;
    return (rows[0] as CustomerMaster) || null;
  }

  async updateCustomerMaster(id: number, data: Partial<InsertCustomerMaster>): Promise<boolean> {
    const now = new Date().toISOString();
    const existing = await this.getCustomerMasterById(id);
    if (!existing) return false;
    const merged = {
      code: data.code !== undefined ? (data.code || null) : existing.code,
      name: data.name !== undefined ? data.name : existing.name,
      zip: data.zip !== undefined ? (data.zip || null) : existing.zip,
      address1: data.address1 !== undefined ? (data.address1 || null) : existing.address1,
      address2: data.address2 !== undefined ? (data.address2 || null) : existing.address2,
      phone: data.phone !== undefined ? (data.phone || null) : existing.phone,
      note: data.note !== undefined ? (data.note || null) : existing.note,
      is_active: data.is_active !== undefined ? data.is_active : existing.is_active
    };
    const { sql } = await import('../lib/database.js');
    await sql`
      UPDATE customers_master
      SET code = ${merged.code}, name = ${merged.name}, zip = ${merged.zip},
          address1 = ${merged.address1}, address2 = ${merged.address2},
          phone = ${merged.phone}, note = ${merged.note}, is_active = ${merged.is_active},
          updated_at = ${now}
      WHERE id = ${id}
    `;
    return true;
  }

  async deleteCustomerMaster(id: number): Promise<boolean> {
    const { sql } = await import('../lib/database.js');
    await sql`DELETE FROM customers_master WHERE id = ${id}`;
    return true;
  }

  close(): void {
    // Supabaseはコネクションプールを自動管理するため不要
  }
}
