// Production Management MVP - Task Planning (作業計画)
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ListChecks, Plus, Edit, Filter, Trash2, ChevronsUpDown, Check } from "lucide-react";
import { listTasks, createTask, updateTask, deleteTask, type Task, type TaskPayload } from "@/shared/production-api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Order {
  order_id: string;
  client_name: string | null;
  project_title: string | null;
  product_name: string | null;
}

// Form validation schema
const taskFormSchema = z.object({
  order_id: z.string().min(1, "受注番号は必須です"),
  task_name: z.string().min(1, "作業名は必須です"),
  assignee: z.string().min(1, "担当者は必須です"),  // 必須フィールド
  planned_start: z.string().min(1, "予定開始日は必須です"),
  planned_end: z.string().min(1, "予定終了日は必須です"),
  qty: z.coerce.number().min(1, "数量は1以上である必要があります"),
  std_time_per_unit: z.coerce.number().min(0, "標準工数は0以上である必要があります"),
  status: z.enum(['not_started', 'in_progress', 'completed']).default('not_started')
}).refine(data => new Date(data.planned_start) <= new Date(data.planned_end), {
  message: "予定開始日は予定終了日以前である必要があります",
  path: ["planned_end"]
});

type TaskFormData = z.infer<typeof taskFormSchema>;

export default function TaskPlanning() {
  const { toast } = useToast();
  const [filterOrderId, setFilterOrderId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const [createOrderComboOpen, setCreateOrderComboOpen] = useState(false);
  const [editOrderComboOpen, setEditOrderComboOpen] = useState(false);

  // Fetch tasks
  const { data: tasksResponse, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => listTasks({ page_size: 100 })
  });

  // Fetch orders for dropdown (all orders without pagination)
  const { data: ordersResponse } = useQuery({
    queryKey: ['/api/orders-dropdown'],
    queryFn: async () => {
      const res = await fetch('/api/orders-dropdown');
      return res.json();
    }
  });

  // Fetch workers from workers master
  const { data: workersData } = useQuery({
    queryKey: ['/api/workers-master'],
    queryFn: async () => {
      const res = await fetch('/api/workers-master');
      if (!res.ok) throw new Error('Failed to fetch workers');
      return res.json() as Promise<{ id: number; name: string; hourly_rate: number; is_active: boolean }[]>;
    }
  });

  const tasks = tasksResponse?.data || [];
  const orders: Order[] = ordersResponse?.data || [];
  const workers = (workersData || []).filter(w => w.is_active);

  // Create task form
  const createForm = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      order_id: "",
      task_name: "",
      assignee: "",
      planned_start: "",
      planned_end: "",
      qty: 1,
      std_time_per_unit: 0,
      status: 'not_started'
    }
  });

  // Edit task form
  const editForm = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      order_id: "",
      task_name: "",
      assignee: "",
      planned_start: "",
      planned_end: "",
      qty: 1,
      std_time_per_unit: 0,
      status: 'not_started'
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: TaskPayload) => createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "作業計画を登録しました",
        description: "新しい作業計画が作成されました"
      });
      createForm.reset();
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "作業計画の登録に失敗しました",
        variant: "destructive"
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TaskPayload> }) => 
      updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "作業計画を更新しました",
        description: "作業計画が正常に更新されました"
      });
      setIsEditDialogOpen(false);
      setEditingTask(null);
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "作業計画の更新に失敗しました",
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "作業計画を削除しました",
        description: "作業計画が正常に削除されました"
      });
      setDeletingTaskId(null);
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "作業計画の削除に失敗しました",
        variant: "destructive"
      });
      setDeletingTaskId(null);
    }
  });

  const onCreateSubmit = (data: TaskFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: TaskFormData) => {
    if (editingTask) {
      updateMutation.mutate({
        id: editingTask.id,
        data
      });
    }
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    editForm.reset({
      order_id: task.order_id,
      task_name: task.task_name,
      assignee: task.assignee || "",
      planned_start: format(new Date(task.planned_start), 'yyyy-MM-dd'),
      planned_end: format(new Date(task.planned_end), 'yyyy-MM-dd'),
      qty: task.qty,
      std_time_per_unit: task.std_time_per_unit,
      status: task.status
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingTaskId(taskId);
  };

  const confirmDelete = () => {
    if (deletingTaskId !== null) {
      deleteMutation.mutate(deletingTaskId);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      not_started: { label: "未着手", variant: "secondary" },
      in_progress: { label: "進行中", variant: "default" },
      completed: { label: "完了", variant: "outline" }
    };
    const config = variants[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filterOrderId !== "all" && task.order_id !== filterOrderId) {
      return false;
    }
    if (filterStatus !== "all" && task.status !== filterStatus) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-task-planning">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
          <ListChecks className="h-8 w-8" />
          作業計画
        </h1>
        <p className="text-muted-foreground">
          作業分解と担当者決定
        </p>
      </div>

      {/* Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            新規作業計画
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <FormField
                  control={createForm.control}
                  name="order_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>受注番号 *</FormLabel>
                      <Popover open={createOrderComboOpen} onOpenChange={setCreateOrderComboOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={createOrderComboOpen}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="select-order-id"
                            >
                              {field.value
                                ? (() => {
                                    const order = orders.find(o => o.order_id === field.value);
                                    return order ? `${order.order_id}${order.client_name ? ` / ${order.client_name}` : ""}${(order.project_title || order.product_name) ? ` / ${order.project_title || order.product_name}` : ""}` : field.value;
                                  })()
                                : "受注を検索..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="受注番号・顧客名で検索..." />
                            <CommandList>
                              <CommandEmpty>該当する受注がありません</CommandEmpty>
                              <CommandGroup>
                                {orders.map((order) => (
                                  <CommandItem
                                    key={order.order_id}
                                    value={`${order.order_id} ${order.client_name || ""} ${order.project_title || ""}`}
                                    onSelect={() => {
                                      field.onChange(order.order_id);
                                      setCreateOrderComboOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === order.order_id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="font-medium">#{order.order_id}</span>
                                    {order.client_name && <span className="ml-1 text-muted-foreground">{order.client_name}</span>}
                                    {(order.project_title || order.product_name) && <span className="ml-1 text-muted-foreground truncate">/ {order.project_title || order.product_name}</span>}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="task_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>作業名 *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="例：組立/塗装/検査" 
                          data-testid="input-task-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="assignee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>担当者</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger data-testid="select-assignee">
                            <SelectValue placeholder="担当者を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {workers.map(worker => (
                              <SelectItem key={worker.id} value={worker.name}>
                                {worker.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="planned_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>予定開始日 *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="date" 
                          data-testid="input-planned-start"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="planned_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>予定終了日 *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="date" 
                          data-testid="input-planned-end"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="qty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>数量 *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="1"
                          data-testid="input-qty"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="std_time_per_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>標準工数 (h/個) *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="0" 
                          step="0.1"
                          data-testid="input-std-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ステータス</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">未着手</SelectItem>
                            <SelectItem value="in_progress">進行中</SelectItem>
                            <SelectItem value="completed">完了</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                data-testid="button-submit-task"
              >
                <Plus className="h-4 w-4 mr-2" />
                {createMutation.isPending ? "登録中..." : "作業計画を登録"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            フィルター
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium mb-2 block">受注番号</label>
            <Select value={filterOrderId} onValueChange={setFilterOrderId}>
              <SelectTrigger data-testid="filter-order">
                <SelectValue placeholder="すべて" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {orders.map(order => (
                  <SelectItem key={order.order_id} value={order.order_id.toString()}>
                    {order.order_id}{order.client_name ? ` / ${order.client_name}` : ""}{(order.project_title || order.product_name) ? ` / ${order.project_title || order.product_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">ステータス</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger data-testid="filter-status">
                <SelectValue placeholder="すべて" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="not_started">未着手</SelectItem>
                <SelectItem value="in_progress">進行中</SelectItem>
                <SelectItem value="completed">完了</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Task List Table */}
      <Card>
        <CardHeader>
          <CardTitle>作業計画一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>受注番号</TableHead>
                  <TableHead>作業名</TableHead>
                  <TableHead>担当者</TableHead>
                  <TableHead>予定開始日</TableHead>
                  <TableHead>予定終了日</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>標準工数</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      該当する作業計画がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map(task => (
                    <TableRow 
                      key={task.id} 
                      className="cursor-pointer hover-elevate"
                      data-testid={`row-task-${task.id}`}
                    >
                      <TableCell>{task.order_id}</TableCell>
                      <TableCell className="font-medium">{task.task_name}</TableCell>
                      <TableCell>{task.assignee || "-"}</TableCell>
                      <TableCell>{format(new Date(task.planned_start), 'yyyy/MM/dd')}</TableCell>
                      <TableCell>{format(new Date(task.planned_end), 'yyyy/MM/dd')}</TableCell>
                      <TableCell>{task.qty}</TableCell>
                      <TableCell>{task.std_time_per_unit}h</TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditClick(task)}
                            data-testid={`button-edit-${task.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleDeleteClick(task.id, e)}
                            data-testid={`button-delete-${task.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>作業計画を編集</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={editForm.control}
                  name="order_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>受注番号 *</FormLabel>
                      <Popover open={editOrderComboOpen} onOpenChange={setEditOrderComboOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={editOrderComboOpen}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? (() => {
                                    const order = orders.find(o => o.order_id === field.value);
                                    return order ? `${order.order_id}${order.client_name ? ` / ${order.client_name}` : ""}${(order.project_title || order.product_name) ? ` / ${order.project_title || order.product_name}` : ""}` : field.value;
                                  })()
                                : "受注を検索..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="受注番号・顧客名で検索..." />
                            <CommandList>
                              <CommandEmpty>該当する受注がありません</CommandEmpty>
                              <CommandGroup>
                                {orders.map((order) => (
                                  <CommandItem
                                    key={order.order_id}
                                    value={`${order.order_id} ${order.client_name || ""} ${order.project_title || ""}`}
                                    onSelect={() => {
                                      field.onChange(order.order_id);
                                      setEditOrderComboOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === order.order_id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="font-medium">#{order.order_id}</span>
                                    {order.client_name && <span className="ml-1 text-muted-foreground">{order.client_name}</span>}
                                    {(order.project_title || order.product_name) && <span className="ml-1 text-muted-foreground truncate">/ {order.project_title || order.product_name}</span>}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="task_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>作業名 *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="例：組立/塗装/検査" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="assignee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>担当者</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="担当者を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {workers.map(worker => (
                              <SelectItem key={worker.id} value={worker.name}>
                                {worker.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="planned_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>予定開始日 *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="planned_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>予定終了日 *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="qty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>数量 *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="std_time_per_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>標準工数 (h/個) *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" step="0.1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ステータス</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">未着手</SelectItem>
                            <SelectItem value="in_progress">進行中</SelectItem>
                            <SelectItem value="completed">完了</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  キャンセル
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "更新中..." : "更新"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingTaskId !== null} onOpenChange={(open) => !open && setDeletingTaskId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>作業計画を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。作業計画に関連するすべてのデータが削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
