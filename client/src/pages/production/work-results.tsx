import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  listWorkLogs, 
  createWorkLog, 
  updateWorkLog, 
  deleteWorkLog,
  listTasks,
  type WorkLog,
  type WorkLogPayload 
} from "@/shared/production-api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Order {
  order_id: string;
  client_name: string | null;
  project_title: string | null;
}
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Timer, Save, Plus, Pencil, Trash2, Upload, FileText } from "lucide-react";

// Form validation schema - 5 fields only
const workLogSchema = z.object({
  order_id: z.string({ required_error: "受注番号は必須です" }).min(1, "受注番号は必須です"),
  task_id: z.coerce.number().min(1, "作業を選択してください"),
  worker: z.string().min(1, "作業者は必須です"),
  date: z.string().min(1, "作業日は必須です"),
  duration_hours: z.coerce.number().gt(0, "実働時間は0より大きい値が必要です"),
});

type WorkLogFormData = z.infer<typeof workLogSchema>;

export default function WorkResults() {
  const { toast } = useToast();
  const [keepOrderTask, setKeepOrderTask] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);
  const [currentWorker, setCurrentWorker] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [orderComboOpen, setOrderComboOpen] = useState(false);
  
  const todayDate = dayjs().format('YYYY-MM-DD');

  // Form setup
  const form = useForm<WorkLogFormData>({
    resolver: zodResolver(workLogSchema),
    defaultValues: {
      date: todayDate,
      worker: "",
      task_id: 0,
      order_id: "",
      duration_hours: 0,
    },
  });

  // Fetch orders for dropdown (all orders without pagination)
  const { data: ordersResponse } = useQuery({
    queryKey: ['/api/orders-dropdown'],
    queryFn: async () => {
      const res = await fetch('/api/orders-dropdown');
      return res.json();
    }
  });
  const orders: Order[] = ordersResponse?.data || [];

  // Fetch workers from workers master
  const { data: workersData } = useQuery({
    queryKey: ['/api/workers-master'],
    queryFn: async () => {
      const res = await fetch('/api/workers-master');
      if (!res.ok) throw new Error('Failed to fetch workers');
      return res.json() as Promise<{ id: number; name: string; hourly_rate: number; is_active: boolean }[]>;
    },
  });

  // Update currentWorker when form worker changes (for filtering work logs)
  const workerValue = form.watch('worker');
  useEffect(() => {
    if (workerValue) {
      setCurrentWorker(workerValue);
    }
  }, [workerValue]);

  // Auto-select first active worker when workers load
  useEffect(() => {
    if (workersData && workersData.length > 0 && !currentWorker) {
      const firstActiveWorker = workersData.find(w => w.is_active);
      if (firstActiveWorker) {
        form.setValue('worker', firstActiveWorker.name);
        setCurrentWorker(firstActiveWorker.name);
      }
    }
  }, [workersData, currentWorker, form]);

  // Fetch today's work logs for current worker (only when worker is selected)
  const { data: workLogsData, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/work-logs', todayDate, currentWorker],
    queryFn: () => listWorkLogs({ date: todayDate, worker: currentWorker }),
    enabled: !!currentWorker,
  });

  // Fetch tasks for selected order
  const selectedOrderId = form.watch('order_id');
  const { data: tasksData } = useQuery({
    queryKey: ['/api/tasks', selectedOrderId],
    queryFn: () => listTasks({ order_id: selectedOrderId, page_size: 1000 }),
    enabled: !!selectedOrderId,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createWorkLog,
    onSuccess: () => {
      toast({ title: "作業実績を保存しました" });
      queryClient.invalidateQueries({ queryKey: ['/api/work-logs'] });
      
      // Reset form but keep order/task if toggle is on
      if (keepOrderTask) {
        form.reset({
          date: todayDate,
          worker: currentWorker,
          order_id: form.getValues('order_id'),
          task_id: form.getValues('task_id'),
          duration_hours: 0,
        });
      } else {
        form.reset({
          date: todayDate,
          worker: currentWorker,
          order_id: "",
          task_id: 0,
          duration_hours: 0,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message || "作業実績の保存に失敗しました",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<WorkLogPayload> }) => 
      updateWorkLog(id, data),
    onSuccess: () => {
      toast({ title: "作業実績を更新しました" });
      queryClient.invalidateQueries({ queryKey: ['/api/work-logs'] });
      setEditingLog(null);
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message || "更新に失敗しました",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteWorkLog,
    onSuccess: () => {
      toast({ title: "作業実績を削除しました" });
      queryClient.invalidateQueries({ queryKey: ['/api/work-logs'] });
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message || "削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: WorkLogFormData) => {
    if (editingLog) {
      updateMutation.mutate({ id: editingLog.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Load editing log into form
  const handleEdit = (log: WorkLog) => {
    setEditingLog(log);
    form.reset({
      date: dayjs(log.date).format('YYYY-MM-DD'),
      order_id: log.order_id,
      task_id: log.task_id || 0,
      worker: log.worker,
      duration_hours: log.duration_hours,
    });
  };

  // Handle delete
  const handleDelete = (id: number) => {
    if (confirm("この作業実績を削除してもよろしいですか？")) {
      deleteMutation.mutate(id);
    }
  };

  // Handle CSV file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast({
          title: "エラー",
          description: "CSVファイルを選択してください",
          variant: "destructive",
        });
        return;
      }
      setCsvFile(file);
    }
  };

  // Handle CSV upload
  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast({
        title: "エラー",
        description: "ファイルが選択されていません",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch('/api/work-logs/upload-csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('CSV upload failed');
      }

      const result = await response.json();

      toast({
        title: "CSVアップロード完了",
        description: `${result.summary.success}件の作業実績を登録しました（失敗: ${result.summary.failed}件）`,
      });

      // Reset file input
      setCsvFile(null);
      const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Refresh work logs list
      queryClient.invalidateQueries({ queryKey: ['/api/work-logs'] });

    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "CSVのアップロードに失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-work-results">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          作業実績入力（PC）
        </h1>
        <p className="text-muted-foreground">
          詳細な作業実績の記録と工数入力
        </p>
      </div>

      {/* CSV Upload Section */}
      <Card data-testid="card-csv-upload">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            ハーモスCSV取込
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                id="csv-file-input"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isUploading}
                data-testid="input-csv-file"
              />
              {csvFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  <FileText className="h-4 w-4 inline mr-1" />
                  選択中: {csvFile.name}
                </p>
              )}
            </div>
            <Button
              onClick={handleCsvUpload}
              disabled={!csvFile || isUploading}
              data-testid="button-upload-csv"
            >
              {isUploading ? "アップロード中..." : "アップロード"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            ハーモス勤怠管理システムからエクスポートしたCSVファイルをアップロードできます。
          </p>
        </CardContent>
      </Card>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            {editingLog ? "作業実績を編集" : "新規作業実績入力"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column */}
                <div className="space-y-4">
                  {/* 1. 受注番号 */}
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
                                aria-expanded={orderComboOpen}
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="select-order"
                              >
                                {field.value
                                  ? (() => {
                                      const order = orders.find(o => o.order_id === field.value);
                                      return order ? `#${order.order_id} - ${order.client_name || order.project_title || ""}` : field.value;
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
                                        setOrderComboOpen(false);
                                      }}
                                      data-testid={`option-order-${order.order_id}`}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === order.order_id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <span className="font-medium">#{order.order_id}</span>
                                      <span className="ml-2 text-muted-foreground truncate">
                                        {order.client_name || order.project_title || ""}
                                      </span>
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

                  {/* 2. 作業名（受注に紐付くDropdown） */}
                  <FormField
                    control={form.control}
                    name="task_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>作業名 *</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value, 10))}
                          value={field.value ? field.value.toString() : ""}
                          disabled={!selectedOrderId}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-task">
                              <SelectValue placeholder={selectedOrderId ? "作業を選択" : "先に受注を選択"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tasksData?.data?.map((task) => (
                              <SelectItem 
                                key={task.id} 
                                value={task.id.toString()}
                                data-testid={`option-task-${task.id}`}
                              >
                                {task.task_name}
                              </SelectItem>
                            ))}
                            {(!tasksData?.data || tasksData.data.length === 0) && selectedOrderId && (
                              <SelectItem value="no-tasks" disabled>
                                この受注にはタスクがありません
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 3. 担当者 */}
                  <FormField
                    control={form.control}
                    name="worker"
                    render={({ field }) => {
                      const activeWorkers = workersData?.filter(w => w.is_active) || [];
                      const editingWorkerName = editingLog?.worker;
                      const showEditingWorker = editingWorkerName && !activeWorkers.some(w => w.name === editingWorkerName);
                      
                      return (
                        <FormItem>
                          <FormLabel>担当者 *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-worker">
                                <SelectValue placeholder="担当者を選択" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {showEditingWorker && (
                                <SelectItem key={`editing-${editingWorkerName}`} value={editingWorkerName}>
                                  {editingWorkerName} (非アクティブ)
                                </SelectItem>
                              )}
                              {activeWorkers.map((worker) => (
                                <SelectItem key={worker.id} value={worker.name}>
                                  {worker.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  {/* 4. 日付 */}
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>日付 *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 5. 実働時間 */}
                  <FormField
                    control={form.control}
                    name="duration_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>実働時間（h）*</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            min="0.01"
                            {...field} 
                            data-testid="input-duration"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="keep-order-task"
                    checked={keepOrderTask}
                    onChange={(e) => setKeepOrderTask(e.target.checked)}
                    data-testid="switch-keep-order-task"
                    className="h-4 w-4"
                  />
                  <Label htmlFor="keep-order-task" className="cursor-pointer text-sm">
                    同じ受注・作業を保持（連続入力）
                  </Label>
                </div>

                <div className="flex gap-2">
                  {editingLog && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingLog(null);
                        form.reset({
                          date: todayDate,
                          worker: currentWorker,
                          order_id: "",
                          task_id: 0,
                          duration_hours: 0,
                        });
                      }}
                      data-testid="button-cancel-edit"
                    >
                      キャンセル
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingLog ? "更新" : "保存"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Today's Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>本日の作業実績（{currentWorker}）</CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
          ) : workLogsData?.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              本日の作業実績はまだありません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead>受注</TableHead>
                  <TableHead>作業名</TableHead>
                  <TableHead>担当者</TableHead>
                  <TableHead>実働時間</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workLogsData?.data.map((log) => (
                  <TableRow key={log.id} data-testid={`row-work-log-${log.id}`}>
                    <TableCell>{log.date || log.work_date || '-'}</TableCell>
                    <TableCell>
                      #{log.order_id} {log.product_name}
                    </TableCell>
                    <TableCell>{log.task_name}</TableCell>
                    <TableCell>{log.worker}</TableCell>
                    <TableCell>{log.duration_hours}h</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(log)}
                          data-testid={`button-edit-${log.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(log.id)}
                          data-testid={`button-delete-${log.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
