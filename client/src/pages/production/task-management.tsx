import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  listWorkLogs, createWorkLog, deleteWorkLog,
  type WorkLog,
} from "@/shared/production-api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  CheckSquare, Plus, Trash2, ChevronsUpDown, Check,
  List, BarChart2, ChevronRight, ChevronDown,
} from "lucide-react";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

interface Order {
  order_id: string;
  client_name: string | null;
  project_title: string | null;
  product_name: string | null;
}

interface Worker {
  id: number;
  name: string;
  hourly_rate: number;
  is_active: boolean;
}

interface WorkerGroup {
  name: string;
  totalHours: number;
  count: number;
  logs: WorkLog[];
}

interface OrderGroup {
  order_id: string;
  totalHours: number;
  count: number;
  workers: WorkerGroup[];
}

interface OrderInWorkerGroup {
  order_id: string;
  totalHours: number;
  count: number;
  logs: WorkLog[];
}

interface WorkerTopGroup {
  name: string;
  totalHours: number;
  count: number;
  orders: OrderInWorkerGroup[];
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

const TODAY = dayjs().format("YYYY-MM-DD");

function fmtHours(h: number) {
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(2)}h`;
}

// ─────────────────────────────────────────
// Schema
// ─────────────────────────────────────────

const workLogFormSchema = z.object({
  date: z.string().min(1, "作業日は必須です"),
  order_id: z.string().min(1, "受注番号は必須です"),
  task_name: z.string().optional(),
  worker: z.string().min(1, "作業者は必須です"),
  duration_hours: z.coerce.number().gt(0, "実績時間は0より大きい値が必要です"),
  memo: z.string().optional(),
});

type WorkLogFormData = z.infer<typeof workLogFormSchema>;

// ─────────────────────────────────────────
// Main page
// ─────────────────────────────────────────

export default function TaskManagement() {
  const { toast } = useToast();
  const [orderComboOpen, setOrderComboOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filterOrderId, setFilterOrderId] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grouped" | "by_worker">("list");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [expandedWorkers, setExpandedWorkers] = useState<Set<string>>(new Set());
  const [expandedWorkerTops, setExpandedWorkerTops] = useState<Set<string>>(new Set());
  const [expandedOrdersInWorker, setExpandedOrdersInWorker] = useState<Set<string>>(new Set());

  // ─── Data fetching ────────────────────

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

  const { data: workLogsResponse, isLoading } = useQuery({
    queryKey: ["work-logs"],
    queryFn: () => listWorkLogs({ page_size: 200 }),
  });

  const orders: Order[] = ordersResponse?.data ?? [];
  const workers: Worker[] = workersData ?? [];
  const workLogs: WorkLog[] = workLogsResponse?.data ?? [];

  // Sort work logs by date desc
  const sortedLogs = useMemo(
    () => [...workLogs].sort((a, b) => b.date.localeCompare(a.date)),
    [workLogs]
  );

  const filteredLogs = useMemo(() =>
    filterOrderId.trim()
      ? sortedLogs.filter(log =>
          (log.order_id ?? "").toLowerCase().includes(filterOrderId.trim().toLowerCase())
        )
      : sortedLogs,
    [sortedLogs, filterOrderId]
  );

  const filteredTotalHours = useMemo(() =>
    filteredLogs.reduce((sum, log) => sum + (log.duration_hours ?? 0), 0),
    [filteredLogs]
  );

  // グループ集計: 受注番号 → 作業者 → 明細
  const groupedLogs = useMemo<OrderGroup[]>(() => {
    const orderMap = new Map<string, OrderGroup>();
    for (const log of sortedLogs) {
      const oid = log.order_id ?? "(受注なし)";
      if (!orderMap.has(oid)) {
        orderMap.set(oid, { order_id: oid, totalHours: 0, count: 0, workers: [] });
      }
      const og = orderMap.get(oid)!;
      og.totalHours += log.duration_hours ?? 0;
      og.count += 1;

      const workerName = log.worker ?? "(不明)";
      let wg = og.workers.find((w) => w.name === workerName);
      if (!wg) {
        wg = { name: workerName, totalHours: 0, count: 0, logs: [] };
        og.workers.push(wg);
      }
      wg.totalHours += log.duration_hours ?? 0;
      wg.count += 1;
      wg.logs.push(log);
    }
    return Array.from(orderMap.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [sortedLogs]);

  // グループ集計: 作業者 → 受注番号 → 明細
  const groupedByWorker = useMemo<WorkerTopGroup[]>(() => {
    const workerMap = new Map<string, WorkerTopGroup>();
    for (const log of sortedLogs) {
      const wname = log.worker ?? "(不明)";
      if (!workerMap.has(wname)) {
        workerMap.set(wname, { name: wname, totalHours: 0, count: 0, orders: [] });
      }
      const wg = workerMap.get(wname)!;
      wg.totalHours += log.duration_hours ?? 0;
      wg.count += 1;

      const oid = log.order_id ?? "(受注なし)";
      let og = wg.orders.find((o) => o.order_id === oid);
      if (!og) {
        og = { order_id: oid, totalHours: 0, count: 0, logs: [] };
        wg.orders.push(og);
      }
      og.totalHours += log.duration_hours ?? 0;
      og.count += 1;
      og.logs.push(log);
    }
    return Array.from(workerMap.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [sortedLogs]);

  // ─── Toggle helpers ───────────────────

  const toggleOrder = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      next.has(orderId) ? next.delete(orderId) : next.add(orderId);
      return next;
    });
  };

  const toggleWorker = (key: string) => {
    setExpandedWorkers((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleWorkerTop = (name: string) => {
    setExpandedWorkerTops((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const toggleOrderInWorker = (key: string) => {
    setExpandedOrdersInWorker((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ─── Form ─────────────────────────────

  const form = useForm<WorkLogFormData>({
    resolver: zodResolver(workLogFormSchema),
    defaultValues: {
      date: TODAY,
      order_id: "",
      task_name: "",
      worker: "",
      duration_hours: 0,
      memo: "",
    },
  });

  // ─── Mutations ───────────────────────

  const createMutation = useMutation({
    mutationFn: createWorkLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-logs"] });
      toast({ title: "日報を保存しました" });
      form.reset({
        date: form.getValues("date"),
        order_id: form.getValues("order_id"),
        task_name: "",
        worker: form.getValues("worker"),
        duration_hours: 0,
        memo: "",
      });
    },
    onError: () => {
      toast({ title: "エラー", description: "保存に失敗しました", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteWorkLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-logs"] });
      toast({ title: "削除しました" });
      setDeletingId(null);
    },
    onError: () => {
      toast({ title: "エラー", description: "削除に失敗しました", variant: "destructive" });
      setDeletingId(null);
    },
  });

  // ─── Helpers ─────────────────────────

  function orderLabel(orderId: string) {
    const o = orders.find((x) => x.order_id === orderId);
    if (!o) return orderId;
    const title = o.project_title || o.product_name;
    return `${o.order_id}${o.client_name ? ` / ${o.client_name}` : ""}${title ? ` / ${title}` : ""}`;
  }

  const onSubmit = (data: WorkLogFormData) => {
    createMutation.mutate({
      date: data.date,
      order_id: data.order_id,
      task_name: data.task_name,
      worker: data.worker,
      duration_hours: data.duration_hours,
      memo: data.memo,
    });
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-task-management">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <CheckSquare className="h-8 w-8" />
          日報
        </h1>
        <p className="text-muted-foreground">作業実績の入力</p>
      </div>

      {/* ── 実績入力フォーム ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            実績入力
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">

                {/* 作業日 */}
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

                {/* 受注番号 */}
                <FormField
                  control={form.control}
                  name="order_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>受注番号 *</FormLabel>
                      <Popover open={orderComboOpen} onOpenChange={setOrderComboOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn("w-full justify-between font-normal truncate", !field.value && "text-muted-foreground")}
                            >
                              <span className="truncate">
                                {field.value ? orderLabel(field.value) : "受注を選択..."}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="受注番号・得意先で検索..." />
                            <CommandList>
                              <CommandEmpty>該当なし</CommandEmpty>
                              <CommandGroup>
                                {orders.map((o) => (
                                  <CommandItem
                                    key={o.order_id}
                                    value={`${o.order_id} ${o.client_name || ""} ${o.project_title || o.product_name || ""}`}
                                    onSelect={() => { field.onChange(o.order_id); setOrderComboOpen(false); }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", field.value === o.order_id ? "opacity-100" : "opacity-0")} />
                                    <span className="font-medium">{o.order_id}</span>
                                    {o.client_name && <span className="ml-1 text-muted-foreground">{o.client_name}</span>}
                                    {(o.project_title || o.product_name) && <span className="ml-1 text-muted-foreground truncate">/ {o.project_title || o.product_name}</span>}
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
                  control={form.control}
                  name="task_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>作業名</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="例: 溶接、切断、組立"
                          data-testid="input-task-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 作業者 */}
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

                {/* 実績時間 */}
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

                {/* メモ */}
                <FormField
                  control={form.control}
                  name="memo"
                  render={({ field }) => (
                    <FormItem className="lg:col-span-3">
                      <FormLabel>メモ</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="任意のメモ"
                          className="resize-none"
                          rows={2}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* ── 実績一覧 ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>実績一覧</CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              {/* 表示切り替え */}
              <div className="flex items-center gap-1 border rounded-md p-0.5">
                <Button
                  size="sm"
                  variant={viewMode === "list" ? "default" : "ghost"}
                  onClick={() => setViewMode("list")}
                  className="h-7 gap-1.5 text-xs"
                >
                  <List className="h-3.5 w-3.5" />
                  明細一覧
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "grouped" ? "default" : "ghost"}
                  onClick={() => setViewMode("grouped")}
                  className="h-7 gap-1.5 text-xs"
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  受注別集計
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "by_worker" ? "default" : "ghost"}
                  onClick={() => setViewMode("by_worker")}
                  className="h-7 gap-1.5 text-xs"
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  作業者別集計
                </Button>
              </div>
              {/* 受注番号フィルター（一覧ビューのみ） */}
              {viewMode === "list" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">受注番号で絞り込み</span>
                  <Input
                    value={filterOrderId}
                    onChange={(e) => setFilterOrderId(e.target.value)}
                    placeholder="例: ko130843"
                    className="w-[180px]"
                  />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : sortedLogs.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">実績データがありません</p>
          ) : viewMode === "by_worker" ? (
            /* ─── 作業者別集計ビュー ─── */
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>作業者 / 受注番号</TableHead>
                  <TableHead className="text-right">件数</TableHead>
                  <TableHead className="text-right">合計時間</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedByWorker.map((wg) => {
                  const isWorkerExpanded = expandedWorkerTops.has(wg.name);
                  return (
                    <React.Fragment key={wg.name}>
                      {/* 作業者行（第1階層） */}
                      <TableRow
                        className="cursor-pointer hover-elevate"
                        onClick={() => toggleWorkerTop(wg.name)}
                      >
                        <TableCell className="pr-0">
                          {isWorkerExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-medium">{wg.name}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{wg.count}</TableCell>
                        <TableCell className="text-right font-medium">{fmtHours(wg.totalHours)}</TableCell>
                      </TableRow>

                      {/* 受注番号行（第2階層） */}
                      {isWorkerExpanded && wg.orders.map((og) => {
                        const orderKey = `${wg.name}|${og.order_id}`;
                        const isOrderExpanded = expandedOrdersInWorker.has(orderKey);
                        return (
                          <React.Fragment key={orderKey}>
                            <TableRow
                              className="cursor-pointer bg-muted/30 hover-elevate"
                              onClick={() => toggleOrderInWorker(orderKey)}
                            >
                              <TableCell className="pr-0 pl-6">
                                {isOrderExpanded
                                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                              </TableCell>
                              <TableCell className="text-sm pl-4 font-mono text-foreground">{og.order_id}</TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">{og.count}</TableCell>
                              <TableCell className="text-right text-sm font-medium">{fmtHours(og.totalHours)}</TableCell>
                            </TableRow>

                            {/* 明細行（第3階層） */}
                            {isOrderExpanded && og.logs.map((log) => (
                              <TableRow key={log.id} className="bg-muted/10">
                                <TableCell />
                                <TableCell className="pl-8 text-xs text-muted-foreground">
                                  <span className="font-mono">{log.date}</span>
                                  {log.task_name && (
                                    <span className="ml-2">{log.task_name}</span>
                                  )}
                                  {log.memo && (
                                    <span className="ml-2 opacity-60 truncate max-w-[200px] inline-block align-bottom">{log.memo}</span>
                                  )}
                                </TableCell>
                                <TableCell />
                                <TableCell className="text-right text-xs font-medium">
                                  {fmtHours(log.duration_hours ?? 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          ) : viewMode === "grouped" ? (
            /* ─── グループビュー ─── */
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>受注番号 / 作業者</TableHead>
                  <TableHead className="text-right">件数</TableHead>
                  <TableHead className="text-right">合計時間</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedLogs.map((og) => {
                  const isOrderExpanded = expandedOrders.has(og.order_id);
                  return (
                    <React.Fragment key={og.order_id}>
                      {/* 受注番号行（第1階層） */}
                      <TableRow
                        className="cursor-pointer hover-elevate"
                        onClick={() => toggleOrder(og.order_id)}
                      >
                        <TableCell className="pr-0">
                          {isOrderExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-medium">{og.order_id}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{og.count}</TableCell>
                        <TableCell className="text-right font-medium">{fmtHours(og.totalHours)}</TableCell>
                      </TableRow>

                      {/* 作業者行（第2階層） */}
                      {isOrderExpanded && og.workers.map((wg) => {
                        const workerKey = `${og.order_id}|${wg.name}`;
                        const isWorkerExpanded = expandedWorkers.has(workerKey);
                        return (
                          <React.Fragment key={workerKey}>
                            <TableRow
                              className="cursor-pointer bg-muted/30 hover-elevate"
                              onClick={() => toggleWorker(workerKey)}
                            >
                              <TableCell className="pr-0 pl-6">
                                {isWorkerExpanded
                                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                              </TableCell>
                              <TableCell className="text-sm pl-4 text-foreground">{wg.name}</TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">{wg.count}</TableCell>
                              <TableCell className="text-right text-sm font-medium">{fmtHours(wg.totalHours)}</TableCell>
                            </TableRow>

                            {/* 明細行（第3階層） */}
                            {isWorkerExpanded && wg.logs.map((log) => (
                              <TableRow key={log.id} className="bg-muted/10">
                                <TableCell />
                                <TableCell className="pl-8 text-xs text-muted-foreground">
                                  <span className="font-mono">{log.date}</span>
                                  {log.task_name && (
                                    <span className="ml-2">{log.task_name}</span>
                                  )}
                                  {log.memo && (
                                    <span className="ml-2 opacity-60 truncate max-w-[200px] inline-block align-bottom">{log.memo}</span>
                                  )}
                                </TableCell>
                                <TableCell />
                                <TableCell className="text-right text-xs font-medium">
                                  {fmtHours(log.duration_hours ?? 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            /* ─── 一覧ビュー ─── */
            <>
              <div className="flex justify-end px-4 py-2 text-sm text-muted-foreground border-b">
                {filterOrderId.trim() ? "絞り込み合計：" : "合計実績時間："}
                <span className="font-medium text-foreground ml-1">{fmtHours(filteredTotalHours)}</span>
              </div>
              {filteredLogs.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground text-sm">該当なし</p>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>作業日</TableHead>
                      <TableHead>受注番号</TableHead>
                      <TableHead>作業名</TableHead>
                      <TableHead>作業者</TableHead>
                      <TableHead className="text-right">実績時間</TableHead>
                      <TableHead>メモ</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">{log.date}</TableCell>
                        <TableCell className="font-mono text-sm whitespace-nowrap">{log.order_id || "-"}</TableCell>
                        <TableCell className="text-sm">{log.task_name || "-"}</TableCell>
                        <TableCell>{log.worker}</TableCell>
                        <TableCell className="text-right font-medium">
                          {log.duration_hours > 0 ? fmtHours(log.duration_hours) : "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                          {log.memo || ""}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingId(log.id)}
                            data-testid={`button-delete-log-${log.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete confirm dialog */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>実績を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>この操作は元に戻せません。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId !== null && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
