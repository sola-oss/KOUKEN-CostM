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
  listOrders,
  listTasks,
  type WorkLog,
  type WorkLogPayload 
} from "@/shared/production-api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Timer, Save, Plus, Pencil, Trash2, AlertTriangle, Upload, FileText } from "lucide-react";

// Form validation schema
const workLogSchema = z.object({
  date: z.string().min(1, "作業日は必須です"),
  order_id: z.string({ required_error: "受注番号は必須です" }).min(1, "受注番号は必須です"),
  task_name: z.string().min(1, "作業名は必須です"),
  worker: z.string().min(1, "作業者は必須です"),
  start_time: z.string().min(1, "開始時刻は必須です"),
  end_time: z.string().min(1, "終了時刻は必須です"),
  duration_hours: z.coerce.number().gt(0, "実績時間は0より大きい値が必要です"),
  quantity: z.coerce.number().min(0, "数量は0以上である必要があります").default(0),
  memo: z.string().optional(),
  status: z.string().default("下書き"),
});

type WorkLogFormData = z.infer<typeof workLogSchema>;

// Generate time options for 15-minute intervals
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 15) {
      const h = hour.toString().padStart(2, '0');
      const m = min.toString().padStart(2, '0');
      options.push(`${h}:${m}`);
    }
  }
  return options;
}

// Calculate duration from start and end time
function calculateDuration(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;
  
  // Handle overnight work (end < start means next day)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours
  }
  
  const durationMinutes = endMinutes - startMinutes;
  return Math.round((durationMinutes / 60) * 100) / 100; // Round to 2 decimals
}

export default function WorkResults() {
  const { toast } = useToast();
  const [useDurationInput, setUseDurationInput] = useState(false);
  const [keepOrderTask, setKeepOrderTask] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<WorkLog[]>([]);
  const [currentWorker] = useState("田中"); // TODO: Get from auth/session
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const timeOptions = generateTimeOptions();
  const todayDate = dayjs().format('YYYY-MM-DD');

  // Form setup
  const form = useForm<WorkLogFormData>({
    resolver: zodResolver(workLogSchema),
    defaultValues: {
      date: todayDate,
      worker: currentWorker,
      start_time: "",
      end_time: "",
      quantity: 0,
      duration_hours: 0,
      status: "下書き",
    },
  });

  // Fetch today's work logs for current worker
  const { data: workLogsData, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/work-logs', todayDate, currentWorker],
    queryFn: () => listWorkLogs({ date: todayDate, worker: currentWorker }),
  });

  // Fetch orders for dropdown
  const { data: ordersData } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: () => listOrders({ page_size: 1000 }),
  });

  // Fetch tasks for selected order
  const selectedOrderId = form.watch('order_id');
  const { data: tasksData } = useQuery({
    queryKey: ['/api/tasks', selectedOrderId],
    queryFn: () => listTasks({ order_id: selectedOrderId, page_size: 1000 }),
    enabled: !!selectedOrderId,
  });

  // Calculate duration when time changes
  const startTime = form.watch('start_time');
  const endTime = form.watch('end_time');

  useEffect(() => {
    if (!useDurationInput && startTime && endTime) {
      const duration = calculateDuration(startTime, endTime);
      form.setValue('duration_hours', duration);
    }
  }, [startTime, endTime, useDurationInput, form]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createWorkLog,
    onSuccess: (response) => {
      toast({
        title: "作業実績を保存しました",
        description: response.hasOverlap ? "⚠️ 時間が重複している実績があります" : undefined,
      });
      
      if (response.hasOverlap) {
        setOverlapWarning(response.overlappingLogs);
      } else {
        setOverlapWarning([]);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/work-logs'] });
      
      // Reset form but keep order/task if toggle is on
      if (keepOrderTask) {
        const keepValues = {
          order_id: form.getValues('order_id'),
          task_name: form.getValues('task_name'),
        };
        form.reset({
          date: todayDate,
          worker: currentWorker,
          start_time: "",
          end_time: "",
          quantity: 0,
          duration_hours: 0,
          status: "下書き",
          ...keepValues,
        });
      } else {
        form.reset({
          date: todayDate,
          worker: currentWorker,
          start_time: "",
          end_time: "",
          quantity: 0,
          duration_hours: 0,
          status: "下書き",
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
      task_name: log.task_name,
      worker: log.worker,
      start_time: log.start_time || "",
      end_time: log.end_time || "",
      duration_hours: log.duration_hours,
      quantity: log.quantity,
      memo: log.memo || undefined,
      status: log.status,
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

      {/* Overlap Warning */}
      {overlapWarning.length > 0 && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950" data-testid="alert-overlap-warning">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <strong>時間重複警告:</strong> 同じ作業者・同じ日付で時間が重複している実績が{overlapWarning.length}件あります
          </AlertDescription>
        </Alert>
      )}

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
              {/* 2-column layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>作業日 *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="order_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>受注番号 *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-order">
                              <SelectValue placeholder="受注を選択" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ordersData?.data.map((order) => (
                              <SelectItem 
                                key={order.order_id} 
                                value={order.order_id}
                                data-testid={`option-order-${order.order_id}`}
                              >
                                #{order.order_id} - {order.product_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="task_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>作業名 *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="作業名を入力"
                            data-testid="input-task-name" 
                          />
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
                          <Input {...field} data-testid="input-worker" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>開始時刻 *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-start-time">
                              <SelectValue placeholder="選択" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timeOptions.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-end-time">
                              <SelectValue placeholder="選択" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timeOptions.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Time input mode toggle */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <Label htmlFor="duration-mode" className="cursor-pointer text-sm">
                      実績時間を手動調整
                    </Label>
                    <Switch
                      id="duration-mode"
                      checked={useDurationInput}
                      onCheckedChange={setUseDurationInput}
                      data-testid="switch-duration-mode"
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="duration_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>実績時間（h）*</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            {...field} 
                            readOnly={!useDurationInput}
                            data-testid="input-duration"
                          />
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
                          <Input type="number" step="1" {...field} data-testid="input-quantity" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Full width memo field */}
              <FormField
                control={form.control}
                name="memo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>メモ</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="作業メモ（任意）"
                        rows={3}
                        data-testid="input-memo"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-3">
                  <Switch
                    id="keep-order-task"
                    checked={keepOrderTask}
                    onCheckedChange={setKeepOrderTask}
                    data-testid="switch-keep-order-task"
                  />
                  <Label htmlFor="keep-order-task" className="cursor-pointer text-sm">
                    同じ案件・作業を保持（連続入力）
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
                          start_time: "",
                          end_time: "",
                          quantity: 0,
                          duration_hours: 0,
                          status: "下書き",
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
                  <TableHead>時刻</TableHead>
                  <TableHead>案件</TableHead>
                  <TableHead>作業</TableHead>
                  <TableHead>実績時間</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>メモ</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workLogsData?.data.map((log) => (
                  <TableRow key={log.id} data-testid={`row-work-log-${log.id}`}>
                    <TableCell>
                      {log.start_time && log.end_time 
                        ? `${log.start_time} - ${log.end_time}`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      #{log.order_id} {log.product_name}
                    </TableCell>
                    <TableCell>{log.task_name}</TableCell>
                    <TableCell>{log.duration_hours}h</TableCell>
                    <TableCell>{log.quantity}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.memo || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(log)}
                          data-testid={`button-edit-${log.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
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
