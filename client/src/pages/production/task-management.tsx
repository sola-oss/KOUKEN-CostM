import { useState, useEffect, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  listTasks, createTask, updateTask, deleteTask,
  listWorkLogs, createWorkLog,
  type Task, type TaskPayload, type WorkLog,
} from "@/shared/production-api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  CheckSquare, Plus, Edit, Trash2, ChevronDown, ChevronRight,
  ChevronsUpDown, Check, ClipboardList, X,
} from "lucide-react";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

interface Order {
  order_id: string;
  client_name: string | null;
  project_title: string | null;
}

interface Worker {
  id: number;
  name: string;
  hourly_rate: number;
  is_active: boolean;
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 15) {
      const h = hour.toString().padStart(2, "0");
      const m = min.toString().padStart(2, "0");
      options.push(`${h}:${m}`);
    }
  }
  return options;
}

function calculateDuration(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin < startMin) endMin += 24 * 60;
  return Math.round(((endMin - startMin) / 60) * 100) / 100;
}

const STATUS_MAP: Record<string, { label: string; variant: "secondary" | "default" | "outline" }> = {
  not_started: { label: "未着手", variant: "secondary" },
  in_progress:  { label: "進行中",  variant: "default" },
  completed:    { label: "完了",    variant: "outline" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

const timeOptions = generateTimeOptions();
const TODAY = dayjs().format("YYYY-MM-DD");

// ─────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────

const taskFormSchema = z
  .object({
    order_id: z.string().min(1, "受注番号は必須です"),
    task_name: z.string().min(1, "作業名は必須です"),
    assignee: z.string().min(1, "担当者は必須です"),
    planned_start: z.string().min(1, "予定開始日は必須です"),
    planned_end: z.string().min(1, "予定終了日は必須です"),
    qty: z.coerce.number().min(1, "数量は1以上"),
    std_time_per_unit: z.coerce.number().min(0, "標準工数は0以上"),
    status: z.enum(["not_started", "in_progress", "completed"]).default("not_started"),
  })
  .refine((d) => new Date(d.planned_start) <= new Date(d.planned_end), {
    message: "予定開始日は予定終了日以前にしてください",
    path: ["planned_end"],
  });

type TaskFormData = z.infer<typeof taskFormSchema>;

const workLogFormSchema = z.object({
  date: z.string().min(1, "作業日は必須です"),
  start_time: z.string().min(1, "開始時刻は必須です"),
  end_time: z.string().min(1, "終了時刻は必須です"),
  duration_hours: z.coerce.number().gt(0, "実績時間は0より大きい値が必要です"),
  worker: z.string().min(1, "作業者は必須です"),
  quantity: z.coerce.number().min(0).default(0),
  memo: z.string().optional(),
});

type WorkLogFormData = z.infer<typeof workLogFormSchema>;

// ─────────────────────────────────────────
// WorkLogInlineForm component
// ─────────────────────────────────────────

interface WorkLogInlineFormProps {
  task: Task;
  workers: Worker[];
  onClose: () => void;
  onSuccess: () => void;
}

function WorkLogInlineForm({ task, workers, onClose, onSuccess }: WorkLogInlineFormProps) {
  const { toast } = useToast();

  const form = useForm<WorkLogFormData>({
    resolver: zodResolver(workLogFormSchema),
    defaultValues: {
      date: TODAY,
      start_time: "",
      end_time: "",
      duration_hours: 0,
      worker: "",
      quantity: 0,
      memo: "",
    },
  });

  const startTime = form.watch("start_time");
  const endTime = form.watch("end_time");

  useEffect(() => {
    if (startTime && endTime) {
      const dur = calculateDuration(startTime, endTime);
      form.setValue("duration_hours", dur);
    }
  }, [startTime, endTime, form]);

  const createMutation = useMutation({
    mutationFn: createWorkLog,
    onSuccess: async () => {
      await updateTask(task.id, { status: "in_progress" });
      queryClient.invalidateQueries({ queryKey: ["work-logs"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "実績を保存しました" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "エラー", description: "実績の保存に失敗しました", variant: "destructive" });
    },
  });

  const onSubmit = (data: WorkLogFormData) => {
    createMutation.mutate({
      date: data.date,
      order_id: task.order_id,
      task_id: task.id,
      task_name: task.task_name,
      worker: data.worker,
      start_time: data.start_time,
      end_time: data.end_time,
      duration_hours: data.duration_hours,
      quantity: data.quantity,
      memo: data.memo,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>作業日 *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="start_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>開始時刻 *</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="--:--" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>終了時刻 *</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="--:--" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="duration_hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>実績時間 (h)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="worker"
            render={({ field }) => (
              <FormItem>
                <FormLabel>作業者 *</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="作業者を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {workers.filter((w) => w.is_active).map((w) => (
                        <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>数量</FormLabel>
                <FormControl>
                  <Input type="number" step="1" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="memo"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>メモ</FormLabel>
                <FormControl>
                  <Textarea placeholder="任意のメモ" className="resize-none" rows={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex gap-2 mt-4">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "保存中..." : "保存"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            閉じる
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─────────────────────────────────────────
// Main page
// ─────────────────────────────────────────

export default function TaskManagement() {
  const { toast } = useToast();

  // Filter state
  const [filterOrderId, setFilterOrderId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Task CRUD state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);

  // Accordion state: one task can have its input OR its logs expanded (mutually exclusive)
  const [expandedInputId, setExpandedInputId] = useState<number | null>(null);
  const [expandedLogsId, setExpandedLogsId] = useState<number | null>(null);

  // Combobox state for order pickers
  const [createOrderComboOpen, setCreateOrderComboOpen] = useState(false);
  const [editOrderComboOpen, setEditOrderComboOpen] = useState(false);

  // ─── Data fetching ────────────────────

  const { data: tasksResponse, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => listTasks({ page_size: 500 }),
  });

  const { data: ordersResponse } = useQuery({
    queryKey: ["/api/orders-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/orders-dropdown");
      return res.json();
    },
  });

  const { data: workersData } = useQuery({
    queryKey: ["/api/workers-master"],
    queryFn: async () => {
      const res = await fetch("/api/workers-master");
      if (!res.ok) throw new Error("Failed to fetch workers");
      return res.json() as Promise<Worker[]>;
    },
  });

  const { data: workLogsResponse } = useQuery({
    queryKey: ["work-logs"],
    queryFn: () => listWorkLogs({}),
  });

  const tasks: Task[] = tasksResponse?.data ?? [];
  const orders: Order[] = ordersResponse?.data ?? [];
  const workers: Worker[] = workersData ?? [];
  const allWorkLogs: WorkLog[] = workLogsResponse?.data ?? [];

  // ─── Derived data ─────────────────────

  const filteredTasks = tasks.filter((t) => {
    if (filterOrderId !== "all" && t.order_id !== filterOrderId) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  });

  function workLogsForTask(taskId: number): WorkLog[] {
    return allWorkLogs.filter((l) => l.task_id === taskId);
  }

  // ─── Forms ───────────────────────────

  const createForm = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      order_id: "", task_name: "", assignee: "",
      planned_start: "", planned_end: "",
      qty: 1, std_time_per_unit: 0, status: "not_started",
    },
  });

  const editForm = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      order_id: "", task_name: "", assignee: "",
      planned_start: "", planned_end: "",
      qty: 1, std_time_per_unit: 0, status: "not_started",
    },
  });

  // ─── Mutations ───────────────────────

  const createMutation = useMutation({
    mutationFn: (data: TaskPayload) => createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "作業計画を登録しました" });
      createForm.reset({
        order_id: "", task_name: "", assignee: "",
        planned_start: "", planned_end: "",
        qty: 1, std_time_per_unit: 0, status: "not_started",
      });
    },
    onError: () => {
      toast({ title: "エラー", description: "登録に失敗しました", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TaskPayload> }) =>
      updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "作業計画を更新しました" });
      setIsEditDialogOpen(false);
      setEditingTask(null);
    },
    onError: () => {
      toast({ title: "エラー", description: "更新に失敗しました", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "作業計画を削除しました" });
      setDeletingTaskId(null);
    },
    onError: () => {
      toast({ title: "エラー", description: "削除に失敗しました", variant: "destructive" });
      setDeletingTaskId(null);
    },
  });

  // ─── Handlers ────────────────────────

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    editForm.reset({
      order_id: task.order_id,
      task_name: task.task_name,
      assignee: task.assignee ?? "",
      planned_start: format(new Date(task.planned_start), "yyyy-MM-dd"),
      planned_end: format(new Date(task.planned_end), "yyyy-MM-dd"),
      qty: task.qty,
      std_time_per_unit: task.std_time_per_unit,
      status: task.status,
    });
    setIsEditDialogOpen(true);
  };

  const toggleInputAccordion = (taskId: number) => {
    setExpandedLogsId(null);
    setExpandedInputId((prev) => (prev === taskId ? null : taskId));
  };

  const toggleLogsAccordion = (taskId: number) => {
    setExpandedInputId(null);
    setExpandedLogsId((prev) => (prev === taskId ? null : taskId));
  };

  // ─── Order label helpers ──────────────

  function orderLabel(orderId: string) {
    const o = orders.find((x) => x.order_id === orderId);
    if (!o) return `#${orderId}`;
    return `#${o.order_id}${o.client_name ? ` - ${o.client_name}` : ""}`;
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-task-management">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <CheckSquare className="h-8 w-8" />
          作業管理
        </h1>
        <p className="text-muted-foreground">作業計画の登録と実績入力</p>
      </div>

      {/* ── 新規作業計画登録フォーム ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            新規作業計画
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* 受注番号 */}
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
                              className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? orderLabel(field.value) : "受注を検索..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[380px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="受注番号・顧客名で検索..." />
                            <CommandList>
                              <CommandEmpty>該当なし</CommandEmpty>
                              <CommandGroup>
                                {orders.map((o) => (
                                  <CommandItem
                                    key={o.order_id}
                                    value={`${o.order_id} ${o.client_name ?? ""} ${o.project_title ?? ""}`}
                                    onSelect={() => { field.onChange(o.order_id); setCreateOrderComboOpen(false); }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", field.value === o.order_id ? "opacity-100" : "opacity-0")} />
                                    <span className="font-medium">#{o.order_id}</span>
                                    <span className="ml-2 text-muted-foreground truncate">{o.client_name ?? o.project_title ?? ""}</span>
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

                {/* 作業名 */}
                <FormField
                  control={createForm.control}
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

                {/* 担当者 */}
                <FormField
                  control={createForm.control}
                  name="assignee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>担当者 *</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="担当者を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {workers.filter((w) => w.is_active).map((w) => (
                              <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 予定開始日 */}
                <FormField
                  control={createForm.control}
                  name="planned_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>予定開始日 *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 予定終了日 */}
                <FormField
                  control={createForm.control}
                  name="planned_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>予定終了日 *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 数量 */}
                <FormField
                  control={createForm.control}
                  name="qty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>数量 *</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 標準工数 */}
                <FormField
                  control={createForm.control}
                  name="std_time_per_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>標準工数 (h/個) *</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ステータス */}
                <FormField
                  control={createForm.control}
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

              <Button type="submit" disabled={createMutation.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                {createMutation.isPending ? "登録中..." : "作業計画を登録"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* ── フィルター ── */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1 min-w-[200px]">
              <span className="text-sm font-medium">受注番号で絞り込み</span>
              <Select value={filterOrderId} onValueChange={setFilterOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {orders.map((o) => (
                    <SelectItem key={o.order_id} value={o.order_id}>
                      #{o.order_id}{o.client_name ? ` - ${o.client_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 min-w-[160px]">
              <span className="text-sm font-medium">ステータスで絞り込み</span>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
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
            {(filterOrderId !== "all" || filterStatus !== "all") && (
              <Button
                variant="outline"
                size="default"
                onClick={() => { setFilterOrderId("all"); setFilterStatus("all"); }}
              >
                <X className="h-4 w-4 mr-1" />
                クリア
              </Button>
            )}
            <div className="ml-auto text-sm text-muted-foreground self-end">
              {filteredTasks.length} 件
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 作業一覧テーブル ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            作業一覧
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>受注番号</TableHead>
                  <TableHead>作業名</TableHead>
                  <TableHead>担当者</TableHead>
                  <TableHead>予定開始</TableHead>
                  <TableHead>予定終了</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                  <TableHead className="text-right">標準工数</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      作業計画がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map((task) => {
                    const logs = workLogsForTask(task.id);
                    const isInputOpen = expandedInputId === task.id;
                    const isLogsOpen = expandedLogsId === task.id;

                    return (
                      <Fragment key={task.id}>
                        {/* ── Main task row ── */}
                        <TableRow className={isInputOpen || isLogsOpen ? "bg-muted/20" : ""}>
                          <TableCell className="font-medium">#{task.order_id}</TableCell>
                          <TableCell>{task.task_name}</TableCell>
                          <TableCell>{task.assignee}</TableCell>
                          <TableCell>
                            {task.planned_start
                              ? format(new Date(task.planned_start), "yyyy/MM/dd")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {task.planned_end
                              ? format(new Date(task.planned_end), "yyyy/MM/dd")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">{task.qty}</TableCell>
                          <TableCell className="text-right">{task.std_time_per_unit}h</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status={task.status} />
                              {logs.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleLogsAccordion(task.id)}
                                  className="focus:outline-none"
                                  aria-label="実績一覧を展開"
                                >
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "cursor-pointer whitespace-nowrap",
                                      isLogsOpen && "ring-1 ring-primary"
                                    )}
                                  >
                                    {isLogsOpen ? (
                                      <ChevronDown className="h-3 w-3 mr-1" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3 mr-1" />
                                    )}
                                    実績あり（{logs.length}件）
                                  </Badge>
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEditClick(task)}
                                title="編集"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeletingTaskId(task.id)}
                                title="削除"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="default"
                                variant={isInputOpen ? "secondary" : "outline"}
                                onClick={() => toggleInputAccordion(task.id)}
                              >
                                {isInputOpen ? (
                                  <>
                                    <X className="h-4 w-4 mr-1" />
                                    閉じる
                                  </>
                                ) : (
                                  <>
                                    <Plus className="h-4 w-4 mr-1" />
                                    実績入力
                                  </>
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* ── Work log input accordion ── */}
                        {isInputOpen && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={9} className="py-4 px-6">
                              <div className="mb-2 text-sm font-medium text-muted-foreground">
                                実績入力 — {task.task_name}（受注 #{task.order_id}）
                              </div>
                              <WorkLogInlineForm
                                task={task}
                                workers={workers}
                                onClose={() => setExpandedInputId(null)}
                                onSuccess={() => setExpandedInputId(null)}
                              />
                            </TableCell>
                          </TableRow>
                        )}

                        {/* ── Work log list accordion ── */}
                        {isLogsOpen && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={9} className="py-4 px-6">
                              <div className="mb-2 text-sm font-medium text-muted-foreground">
                                実績一覧 — {task.task_name}（{logs.length}件）
                              </div>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>作業日</TableHead>
                                    <TableHead>作業者</TableHead>
                                    <TableHead className="text-right">開始</TableHead>
                                    <TableHead className="text-right">終了</TableHead>
                                    <TableHead className="text-right">実績時間</TableHead>
                                    <TableHead className="text-right">数量</TableHead>
                                    <TableHead>メモ</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {logs.map((log) => (
                                    <TableRow key={log.id}>
                                      <TableCell>
                                        {log.date
                                          ? format(new Date(log.date), "yyyy/MM/dd")
                                          : "-"}
                                      </TableCell>
                                      <TableCell>{log.worker}</TableCell>
                                      <TableCell className="text-right">{log.start_time ?? "-"}</TableCell>
                                      <TableCell className="text-right">{log.end_time ?? "-"}</TableCell>
                                      <TableCell className="text-right">{log.duration_hours}h</TableCell>
                                      <TableCell className="text-right">{log.quantity}</TableCell>
                                      <TableCell className="text-muted-foreground">{log.memo ?? ""}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── 編集ダイアログ ── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>作業計画を編集</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((d) => {
                if (editingTask) updateMutation.mutate({ id: editingTask.id, data: d });
              })}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                {/* 受注番号 */}
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
                              className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? orderLabel(field.value) : "受注を検索..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[340px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="受注番号・顧客名で検索..." />
                            <CommandList>
                              <CommandEmpty>該当なし</CommandEmpty>
                              <CommandGroup>
                                {orders.map((o) => (
                                  <CommandItem
                                    key={o.order_id}
                                    value={`${o.order_id} ${o.client_name ?? ""} ${o.project_title ?? ""}`}
                                    onSelect={() => { field.onChange(o.order_id); setEditOrderComboOpen(false); }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", field.value === o.order_id ? "opacity-100" : "opacity-0")} />
                                    <span className="font-medium">#{o.order_id}</span>
                                    <span className="ml-2 text-muted-foreground truncate">{o.client_name ?? o.project_title ?? ""}</span>
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

                {/* 作業名 */}
                <FormField
                  control={editForm.control}
                  name="task_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>作業名 *</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 担当者 */}
                <FormField
                  control={editForm.control}
                  name="assignee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>担当者 *</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="担当者を選択" /></SelectTrigger>
                          <SelectContent>
                            {workers.filter((w) => w.is_active).map((w) => (
                              <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ステータス */}
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ステータス</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
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

                {/* 予定開始日 */}
                <FormField
                  control={editForm.control}
                  name="planned_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>予定開始日 *</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 予定終了日 */}
                <FormField
                  control={editForm.control}
                  name="planned_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>予定終了日 *</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 数量 */}
                <FormField
                  control={editForm.control}
                  name="qty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>数量 *</FormLabel>
                      <FormControl><Input type="number" min="1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 標準工数 */}
                <FormField
                  control={editForm.control}
                  name="std_time_per_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>標準工数 (h/個) *</FormLabel>
                      <FormControl><Input type="number" min="0" step="0.1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "更新中..." : "更新"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── 削除確認ダイアログ ── */}
      <AlertDialog open={deletingTaskId !== null} onOpenChange={(o) => { if (!o) setDeletingTaskId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>作業計画を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。関連する実績データには影響しません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deletingTaskId !== null) deleteMutation.mutate(deletingTaskId); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
