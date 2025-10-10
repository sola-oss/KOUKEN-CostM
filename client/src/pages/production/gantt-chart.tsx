// Production Management MVP - Gantt Chart (Project-based)
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Plot from "react-plotly.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { GanttChart as GanttChartIcon, Calendar, CheckSquare, Square } from "lucide-react";
import { listTasks, listProcurements, listOrders, updateTask, updateProcurement, type Task, type Procurement, type Order } from "@/shared/production-api";
import { format, parseISO, addDays, startOfMonth, endOfMonth } from "date-fns";
import { ja } from "date-fns/locale";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TimelineItem {
  id: string;
  type: 'task' | 'procurement';
  order_id: number;
  order_name: string;
  name: string;
  start: string;
  end: string;
  status: string;
  assignee?: string;
  originalData: Task | Procurement;
}

export default function GanttChart() {
  const { toast } = useToast();
  
  // State
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [displayMode, setDisplayMode] = useState<'both' | 'tasks' | 'procurements'>('both');
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(addDays(new Date(), 30)), 'yyyy-MM-dd')
  });
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    item: TimelineItem | null;
  }>({ open: false, item: null });

  // Fetch data
  const { data: tasksResponse, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => listTasks({ page_size: 1000 })
  });

  const { data: procurementsResponse, isLoading: procurementsLoading } = useQuery({
    queryKey: ['procurements'],
    queryFn: () => listProcurements({ page_size: 1000 })
  });

  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders-dropdown'],
    queryFn: () => listOrders({ page_size: 1000 })
  });

  const tasks = tasksResponse?.data || [];
  const procurements = procurementsResponse?.data || [];
  const orders = ordersResponse?.data || [];

  // Initialize with all orders selected
  useMemo(() => {
    if (orders.length > 0 && selectedOrderIds.size === 0) {
      setSelectedOrderIds(new Set(orders.map(o => o.order_id)));
    }
  }, [orders, selectedOrderIds.size]);

  // Convert data to timeline items
  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add tasks
    if (displayMode === 'both' || displayMode === 'tasks') {
      tasks.forEach(task => {
        const order = orders.find(o => o.order_id === task.order_id);
        items.push({
          id: `task-${task.id}`,
          type: 'task',
          order_id: task.order_id,
          order_name: order?.product_name || `案件${task.order_id}`,
          name: task.task_name,
          start: task.planned_start,
          end: task.planned_end,
          status: task.status,
          assignee: task.assignee,
          originalData: task
        });
      });
    }

    // Add manufacture procurements
    if (displayMode === 'both' || displayMode === 'procurements') {
      procurements
        .filter(p => p.kind === 'manufacture')
        .forEach(proc => {
          const order = orders.find(o => o.order_id === proc.order_id);
          const start = proc.eta; // For manufacture, use eta as both start and end
          const end = proc.completed_at || proc.eta;
          
          if (start && end) {
            items.push({
              id: `proc-${proc.id}`,
              type: 'procurement',
              order_id: proc.order_id || 0,
              order_name: order?.product_name || `案件${proc.order_id}`,
              name: proc.item_name || '製造手配',
              start,
              end,
              status: proc.status || 'planned',
              originalData: proc
            });
          }
        });
    }

    return items;
  }, [tasks, procurements, orders, displayMode]);

  // Filter timeline items
  const filteredItems = useMemo(() => {
    return timelineItems.filter(item => {
      // Filter by selected orders
      if (!selectedOrderIds.has(item.order_id)) {
        return false;
      }
      
      // Filter by assignee
      if (selectedAssignee !== "all" && item.assignee !== selectedAssignee) {
        return false;
      }
      
      // Filter by date range
      const itemStart = parseISO(item.start);
      const itemEnd = parseISO(item.end);
      const rangeStart = parseISO(dateRange.start);
      const rangeEnd = parseISO(dateRange.end);
      
      return itemStart <= rangeEnd && itemEnd >= rangeStart;
    });
  }, [timelineItems, selectedOrderIds, selectedAssignee, dateRange]);

  // Get unique assignees
  const assignees = useMemo(() => {
    const uniqueAssignees = new Set<string>();
    tasks.forEach(task => {
      if (task.assignee) uniqueAssignees.add(task.assignee);
    });
    return Array.from(uniqueAssignees);
  }, [tasks]);

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started':
      case 'planned':
        return '#9CA3AF'; // gray
      case 'in_progress':
      case 'ordered':
        return '#3B82F6'; // blue
      case 'completed':
      case 'received':
      case 'done':
        return '#10B981'; // green
      case 'cancelled':
        return '#FCA5A5'; // light red
      default:
        return '#9CA3AF';
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
      case 'cancelled': return 'キャンセル';
      default: return status;
    }
  };

  // Prepare Plotly data
  const plotlyData = useMemo(() => {
    if (filteredItems.length === 0) return [];

    return [{
      type: 'bar' as const,
      orientation: 'h' as const,
      x: filteredItems.map(item => {
        const start = new Date(item.start);
        const end = new Date(item.end);
        return end.getTime() - start.getTime();
      }),
      y: filteredItems.map(item => item.name),
      base: filteredItems.map(item => new Date(item.start)),
      marker: {
        color: filteredItems.map(item => getStatusColor(item.status))
      },
      text: filteredItems.map(item => 
        `${item.order_name}<br>${item.name}<br>${format(parseISO(item.start), 'yyyy/MM/dd')} ~ ${format(parseISO(item.end), 'yyyy/MM/dd')}<br>担当: ${item.assignee || 'なし'}<br>状態: ${getStatusLabel(item.status)}`
      ),
      hovertemplate: '%{text}<extra></extra>',
      customdata: filteredItems.map(item => item.id)
    }];
  }, [filteredItems]);

  // Plotly layout
  const plotlyLayout = useMemo(() => {
    const today = new Date();
    
    return {
      xaxis: {
        type: 'date' as const,
        title: { text: '日付' },
        tickformat: '%m/%d',
        dtick: 86400000, // 1 day in milliseconds
        gridcolor: '#E5E7EB',
        showgrid: true,
        range: [dateRange.start, dateRange.end]
      },
      yaxis: {
        title: { text: 'タスク' },
        autorange: 'reversed' as const
      },
      shapes: [
        {
          type: 'line' as const,
          x0: today,
          x1: today,
          y0: 0,
          y1: 1,
          yref: 'paper' as const,
          line: {
            color: '#EF4444',
            width: 2,
            dash: 'dash' as const
          }
        }
      ],
      margin: { l: 200, r: 50, t: 50, b: 80 },
      height: Math.max(400, filteredItems.length * 40 + 100),
      hovermode: 'closest' as const
    };
  }, [dateRange, filteredItems.length]);

  // Handle bar click
  const handlePlotClick = (data: any) => {
    if (data.points && data.points[0]) {
      const itemId = data.points[0].customdata;
      const item = filteredItems.find(i => i.id === itemId);
      if (item) {
        setEditDialog({ open: true, item });
      }
    }
  };

  // Toggle all orders
  const handleToggleAll = () => {
    if (selectedOrderIds.size === orders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(orders.map(o => o.order_id)));
    }
  };

  // Toggle single order
  const handleToggleOrder = (orderId: number) => {
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setSelectedOrderIds(newSet);
  };

  // Handle edit dialog submit
  const handleEditSubmit = async () => {
    if (!editDialog.item) return;

    try {
      if (editDialog.item.type === 'task') {
        const task = editDialog.item.originalData as Task;
        await updateTask(task.id, {
          order_id: task.order_id,
          task_name: task.task_name,
          assignee: task.assignee,
          planned_start: task.planned_start,
          planned_end: task.planned_end,
          qty: task.qty,
          std_time_per_unit: task.std_time_per_unit,
          status: task.status
        });
      } else {
        const proc = editDialog.item.originalData as Procurement;
        await updateProcurement(proc.id, {
          order_id: proc.order_id || undefined,
          item_name: proc.item_name,
          kind: proc.kind,
          qty: proc.qty,
          unit_price: proc.unit_price,
          vendor: proc.vendor || undefined,
          eta: proc.eta,
          completed_at: proc.completed_at || undefined,
          status: proc.status
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      await queryClient.invalidateQueries({ queryKey: ['procurements'] });
      
      toast({
        title: "更新成功",
        description: "データを更新しました"
      });
      
      setEditDialog({ open: false, item: null });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "更新に失敗しました"
      });
    }
  };

  const isLoading = tasksLoading || procurementsLoading || ordersLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen" data-testid="page-gantt-chart">
        <div className="w-64 border-r p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="flex-1 p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" data-testid="page-gantt-chart">
      {/* Left Sidebar - Project List */}
      <div className="w-64 border-r p-4 space-y-4 overflow-y-auto">
        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            案件リスト
          </h2>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={handleToggleAll}
              data-testid="button-toggle-all"
            >
              {selectedOrderIds.size === orders.length ? (
                <CheckSquare className="h-4 w-4 mr-2" />
              ) : (
                <Square className="h-4 w-4 mr-2" />
              )}
              {selectedOrderIds.size === orders.length ? '全解除' : '全選択'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {orders.map(order => (
            <div key={order.order_id} className="flex items-center space-x-2">
              <Checkbox
                id={`order-${order.order_id}`}
                checked={selectedOrderIds.has(order.order_id)}
                onCheckedChange={() => handleToggleOrder(order.order_id)}
                data-testid={`checkbox-order-${order.order_id}`}
              />
              <label
                htmlFor={`order-${order.order_id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                #{order.order_id} {order.product_name}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
            <GanttChartIcon className="h-8 w-8" />
            ガントチャート（案件別）
          </h1>
          <p className="text-muted-foreground">
            作業計画と製造手配のタイムライン表示
          </p>
        </div>

        {/* Filters */}
        <div className="p-6 border-b">
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <Label htmlFor="date-start" className="mb-2 block">期間開始</Label>
              <Input
                id="date-start"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                data-testid="input-date-start"
              />
            </div>
            <div>
              <Label htmlFor="date-end" className="mb-2 block">期間終了</Label>
              <Input
                id="date-end"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                data-testid="input-date-end"
              />
            </div>
            <div>
              <Label htmlFor="assignee-filter" className="mb-2 block">担当者</Label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger id="assignee-filter" data-testid="select-assignee">
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
            <div>
              <Label htmlFor="display-mode" className="mb-2 block">表示切替</Label>
              <Select value={displayMode} onValueChange={(v) => setDisplayMode(v as typeof displayMode)}>
                <SelectTrigger id="display-mode" data-testid="select-display-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">両方</SelectItem>
                  <SelectItem value="tasks">作業計画のみ</SelectItem>
                  <SelectItem value="procurements">製造手配のみ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 overflow-auto p-6">
          {filteredItems.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg text-muted-foreground" data-testid="text-empty-message">
                  選択された条件に一致する予定はありません
                </p>
              </div>
            </div>
          ) : (
            <div data-testid="plotly-chart">
              <Plot
                data={plotlyData}
                layout={plotlyLayout}
                config={{ responsive: true, displayModeBar: true }}
                onClick={handlePlotClick}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-6 border-t">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-400" />
              <span className="text-sm">未着手/計画</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500" />
              <span className="text-sm">進行中/発注済</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span className="text-sm">完成/入荷済</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-300" />
              <span className="text-sm">キャンセル</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4 bg-red-500" />
              <span className="text-sm">今日</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent data-testid="dialog-edit">
          <DialogHeader>
            <DialogTitle>
              {editDialog.item?.type === 'task' ? '作業計画編集' : '製造手配編集'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>名前</Label>
              <p className="text-sm mt-1">{editDialog.item?.name}</p>
            </div>
            <div>
              <Label>案件</Label>
              <p className="text-sm mt-1">{editDialog.item?.order_name}</p>
            </div>
            <div>
              <Label>期間</Label>
              <p className="text-sm mt-1">
                {editDialog.item && format(parseISO(editDialog.item.start), 'yyyy/MM/dd')} 
                {' ～ '}
                {editDialog.item && format(parseISO(editDialog.item.end), 'yyyy/MM/dd')}
              </p>
            </div>
            <div>
              <Label>状態</Label>
              <p className="text-sm mt-1">
                <Badge>{editDialog.item && getStatusLabel(editDialog.item.status)}</Badge>
              </p>
            </div>
            {editDialog.item?.assignee && (
              <div>
                <Label>担当者</Label>
                <p className="text-sm mt-1">{editDialog.item.assignee}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditDialog({ open: false, item: null })}>
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
