// Production Management MVP - Gantt Chart
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GanttChart as GanttChartIcon, Calendar, User, Package } from "lucide-react";
import { listTasks, listProcurements, listOrders, type Task, type Procurement } from "@/shared/production-api";
import { format, parseISO, differenceInDays, addDays, startOfMonth, endOfMonth } from "date-fns";
import { ja } from "date-fns/locale";

interface TimelineItem {
  id: string;
  type: 'task' | 'procurement';
  order_id: number;
  name: string;
  start: Date;
  end: Date;
  status: string;
  assignee?: string;
  completedAt?: Date;
}

export default function GanttChart() {
  const [selectedOrderId, setSelectedOrderId] = useState<string>("all");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(addDays(new Date(), 30)), 'yyyy-MM-dd')
  });

  // Fetch data
  const { data: tasksResponse } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => listTasks({ page_size: 100 })
  });

  const { data: procurementsResponse } = useQuery({
    queryKey: ['procurements'],
    queryFn: () => listProcurements({ page_size: 100 })
  });

  const { data: ordersResponse } = useQuery({
    queryKey: ['orders-dropdown'],
    queryFn: () => listOrders({ page_size: 100 })
  });

  const tasks = tasksResponse?.data || [];
  const procurements = procurementsResponse?.data || [];
  const orders = ordersResponse?.data || [];

  // Convert data to timeline items
  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add tasks
    tasks.forEach(task => {
      items.push({
        id: `task-${task.id}`,
        type: 'task',
        order_id: task.order_id,
        name: task.task_name,
        start: parseISO(task.planned_start),
        end: parseISO(task.planned_end),
        status: task.status,
        assignee: task.assignee || undefined
      });
    });

    // Add manufacture procurements
    procurements
      .filter(p => p.kind === 'manufacture')
      .forEach(proc => {
        const start = proc.eta ? parseISO(proc.eta) : new Date();
        const end = proc.completed_at ? parseISO(proc.completed_at) : addDays(start, 7);
        
        items.push({
          id: `proc-${proc.id}`,
          type: 'procurement',
          order_id: proc.order_id || 0,
          name: proc.item_name || '製造手配',
          start,
          end,
          status: proc.status || 'planned',
          completedAt: proc.completed_at ? parseISO(proc.completed_at) : undefined
        });
      });

    return items;
  }, [tasks, procurements]);

  // Filter timeline items
  const filteredItems = useMemo(() => {
    return timelineItems.filter(item => {
      if (selectedOrderId !== "all" && item.order_id !== parseInt(selectedOrderId)) {
        return false;
      }
      if (selectedAssignee !== "all" && item.assignee !== selectedAssignee) {
        return false;
      }
      const itemStart = item.start;
      const itemEnd = item.end;
      const rangeStart = parseISO(dateRange.start);
      const rangeEnd = parseISO(dateRange.end);
      
      return itemStart <= rangeEnd && itemEnd >= rangeStart;
    });
  }, [timelineItems, selectedOrderId, selectedAssignee, dateRange]);

  // Group by order_id
  const groupedItems = useMemo(() => {
    const groups: Record<number, TimelineItem[]> = {};
    filteredItems.forEach(item => {
      if (!groups[item.order_id]) {
        groups[item.order_id] = [];
      }
      groups[item.order_id].push(item);
    });
    return groups;
  }, [filteredItems]);

  // Get unique assignees
  const assignees = useMemo(() => {
    const uniqueAssignees = new Set<string>();
    tasks.forEach(task => {
      if (task.assignee) uniqueAssignees.add(task.assignee);
    });
    return Array.from(uniqueAssignees);
  }, [tasks]);

  // Calculate timeline range
  const timelineStart = parseISO(dateRange.start);
  const timelineEnd = parseISO(dateRange.end);
  const totalDays = differenceInDays(timelineEnd, timelineStart);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started':
      case 'planned':
        return 'bg-gray-400';
      case 'in_progress':
      case 'ordered':
        return 'bg-blue-500';
      case 'completed':
      case 'received':
      case 'done':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'not_started': return '未着手';
      case 'in_progress': return '進行中';
      case 'completed': return '完成';
      case 'planned': return '計画';
      case 'ordered': return '発注済';
      case 'received': return '入荷済';
      case 'done': return '完了';
      default: return status;
    }
  };

  const calculatePosition = (date: Date) => {
    const days = differenceInDays(date, timelineStart);
    return (days / totalDays) * 100;
  };

  const calculateWidth = (start: Date, end: Date) => {
    const days = differenceInDays(end, start);
    return (days / totalDays) * 100;
  };

  if (!tasksResponse || !procurementsResponse) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-gantt-chart">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
          <GanttChartIcon className="h-8 w-8" />
          ガントチャート
        </h1>
        <p className="text-muted-foreground">
          作業計画と製造手配のタイムライン表示
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">フィルター</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="text-sm font-medium mb-2 block">期間開始</label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              data-testid="input-date-start"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">期間終了</label>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              data-testid="input-date-end"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">案件</label>
            <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
              <SelectTrigger data-testid="select-order">
                <SelectValue placeholder="すべて" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {orders.map(order => (
                  <SelectItem key={order.order_id} value={order.order_id.toString()}>
                    {order.order_id} - {order.product_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">担当者</label>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger data-testid="select-assignee">
                <SelectValue placeholder="すべて" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {assignees.map(assignee => (
                  <SelectItem key={assignee} value={assignee}>
                    {assignee}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            タイムライン
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedItems).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              該当するデータがありません
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([orderId, items]) => {
                const order = orders.find(o => o.order_id === parseInt(orderId));
                return (
                  <div key={orderId} className="space-y-2">
                    <div className="flex items-center gap-2 font-medium">
                      <Package className="h-4 w-4" />
                      案件 #{orderId} {order?.product_name && `- ${order.product_name}`}
                    </div>
                    <div className="relative bg-muted/30 rounded-lg p-4 min-h-[80px]">
                      {/* Timeline grid */}
                      <div className="absolute inset-0 flex">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex-1 border-r border-muted"
                            style={{ opacity: 0.3 }}
                          />
                        ))}
                      </div>
                      
                      {/* Timeline items */}
                      {items.map((item, idx) => {
                        const left = calculatePosition(item.start);
                        const width = calculateWidth(item.start, item.end);
                        
                        return (
                          <div
                            key={item.id}
                            className="absolute h-8 rounded px-2 flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity group"
                            style={{
                              left: `${Math.max(0, left)}%`,
                              width: `${Math.min(100 - left, width)}%`,
                              top: `${idx * 36 + 8}px`
                            }}
                            data-testid={`timeline-item-${item.id}`}
                          >
                            <div
                              className={`absolute inset-0 rounded ${getStatusColor(item.status)}`}
                              style={{ opacity: 0.7 }}
                            />
                            <div className="relative z-10 flex items-center gap-2 text-xs text-white font-medium truncate">
                              {item.type === 'task' ? '📋' : '🏭'}
                              <span className="truncate">{item.name}</span>
                            </div>
                            <Badge 
                              variant="secondary" 
                              className="relative z-10 text-xs bg-white/90"
                            >
                              {getStatusLabel(item.status)}
                            </Badge>
                            
                            {/* Tooltip */}
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-20 bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 min-w-[200px]">
                              <div className="text-sm font-medium mb-2">{item.name}</div>
                              <div className="space-y-1 text-xs">
                                <div>種別: {item.type === 'task' ? '作業計画' : '製造手配'}</div>
                                <div>開始: {format(item.start, 'yyyy/MM/dd', { locale: ja })}</div>
                                <div>終了: {format(item.end, 'yyyy/MM/dd', { locale: ja })}</div>
                                <div>状態: {getStatusLabel(item.status)}</div>
                                {item.assignee && <div>担当: {item.assignee}</div>}
                                {item.completedAt && (
                                  <div className="text-green-600 font-medium">
                                    完了: {format(item.completedAt, 'yyyy/MM/dd', { locale: ja })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">凡例</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-400" />
              <span className="text-sm">未着手/計画</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500" />
              <span className="text-sm">進行中</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span className="text-sm">完成/完了</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">📋 作業計画</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">🏭 製造手配</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
