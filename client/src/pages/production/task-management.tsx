import { useState, useEffect } from "react";
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
import { CheckSquare, Plus, Trash2, ChevronsUpDown, Check } from "lucide-react";

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

const timeOptions = generateTimeOptions();
const TODAY = dayjs().format("YYYY-MM-DD");

// ─────────────────────────────────────────
// Schema
// ─────────────────────────────────────────

const workLogFormSchema = z.object({
  date: z.string().min(1, "作業日は必須です"),
  order_id: z.string().min(1, "受注番号は必須です"),
  worker: z.string().min(1, "作業者は必須です"),
  start_time: z.string().min(1, "開始時刻は必須です"),
  end_time: z.string().min(1, "終了時刻は必須です"),
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
  const sortedLogs = [...workLogs].sort((a, b) => b.date.localeCompare(a.date));

  // ─── Form ─────────────────────────────

  const form = useForm<WorkLogFormData>({
    resolver: zodResolver(workLogFormSchema),
    defaultValues: {
      date: TODAY,
      order_id: "",
      worker: "",
      start_time: "",
      end_time: "",
      duration_hours: 0,
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

  // ─── Mutations ───────────────────────

  const createMutation = useMutation({
    mutationFn: createWorkLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-logs"] });
      toast({ title: "日報を保存しました" });
      form.reset({
        date: form.getValues("date"),
        order_id: form.getValues("order_id"),
        worker: form.getValues("worker"),
        start_time: "",
        end_time: "",
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
    return `${o.order_id}${o.client_name ? ` / ${o.client_name}` : ""}${o.project_title ? ` / ${o.project_title}` : ""}`;
  }

  const onSubmit = (data: WorkLogFormData) => {
    createMutation.mutate({
      date: data.date,
      order_id: data.order_id,
      worker: data.worker,
      start_time: data.start_time,
      end_time: data.end_time,
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

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
                    <FormItem className="flex flex-col">
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
                                    value={`${o.order_id} ${o.client_name ?? ""} ${o.project_title ?? ""}`}
                                    onSelect={() => { field.onChange(o.order_id); setOrderComboOpen(false); }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", field.value === o.order_id ? "opacity-100" : "opacity-0")} />
                                    <span className="font-medium">{o.order_id}</span>
                                    {o.client_name && <span className="ml-1 text-muted-foreground">{o.client_name}</span>}
                                    {o.project_title && <span className="ml-1 text-muted-foreground truncate">/ {o.project_title}</span>}
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

                {/* 開始時刻 */}
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

                {/* 終了時刻 */}
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
          <CardTitle>実績一覧</CardTitle>
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
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>作業日</TableHead>
                  <TableHead>受注番号</TableHead>
                  <TableHead>作業者</TableHead>
                  <TableHead>開始</TableHead>
                  <TableHead>終了</TableHead>
                  <TableHead className="text-right">実績時間</TableHead>
                  <TableHead>メモ</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">{log.date}</TableCell>
                    <TableCell className="font-mono text-sm whitespace-nowrap">{log.order_id || "-"}</TableCell>
                    <TableCell>{log.worker}</TableCell>
                    <TableCell className="text-sm">{log.start_time || "-"}</TableCell>
                    <TableCell className="text-sm">{log.end_time || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {log.duration_hours > 0
                        ? `${log.duration_hours % 1 === 0 ? log.duration_hours : log.duration_hours.toFixed(2)}h`
                        : "-"}
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
