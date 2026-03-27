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
  type WorkLog,
} from "@/shared/production-api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Timer, Save, Pencil, Trash2, Upload, FileText } from "lucide-react";

// フォームスキーマ - 3項目のみ
const workLogSchema = z.object({
  date: z.string().min(1, "作業日は必須です"),
  worker: z.string().min(1, "作業者は必須です"),
  duration_hours: z.coerce.number().gt(0, "実働時間は0より大きい値が必要です"),
});

type WorkLogFormData = z.infer<typeof workLogSchema>;

export default function WorkResults() {
  const { toast } = useToast();
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const todayDate = dayjs().format("YYYY-MM-DD");

  const form = useForm<WorkLogFormData>({
    resolver: zodResolver(workLogSchema),
    defaultValues: {
      date: todayDate,
      worker: "",
      duration_hours: 0,
    },
  });

  // 作業者マスタ取得
  const { data: workersData } = useQuery({
    queryKey: ["/api/workers-master"],
    queryFn: async () => {
      const res = await fetch("/api/workers-master");
      if (!res.ok) throw new Error("Failed to fetch workers");
      return res.json() as Promise<{ id: number; name: string; hourly_rate: number; is_active: boolean }[]>;
    },
  });

  // 最初のアクティブ作業者を自動選択
  const activeWorkers = workersData?.filter(w => w.is_active) || [];
  useEffect(() => {
    if (activeWorkers.length > 0 && !form.getValues("worker")) {
      form.setValue("worker", activeWorkers[0].name);
    }
  }, [activeWorkers.length]);

  // 作業実績一覧取得（最新200件）
  const { data: workLogsData, isLoading: logsLoading } = useQuery({
    queryKey: ["/api/work-logs"],
    queryFn: () => listWorkLogs({ page_size: 200 }),
  });

  // 作成
  const createMutation = useMutation({
    mutationFn: createWorkLog,
    onSuccess: () => {
      toast({ title: "作業実績を保存しました" });
      queryClient.invalidateQueries({ queryKey: ["/api/work-logs"] });
      const currentWorker = form.getValues("worker");
      form.reset({ date: todayDate, worker: currentWorker, duration_hours: 0 });
    },
    onError: (error: any) => {
      toast({ title: "エラー", description: error.message || "保存に失敗しました", variant: "destructive" });
    },
  });

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<WorkLogFormData> }) =>
      updateWorkLog(id, data),
    onSuccess: () => {
      toast({ title: "作業実績を更新しました" });
      queryClient.invalidateQueries({ queryKey: ["/api/work-logs"] });
      setEditingLog(null);
      form.reset({ date: todayDate, worker: form.getValues("worker"), duration_hours: 0 });
    },
    onError: (error: any) => {
      toast({ title: "エラー", description: error.message || "更新に失敗しました", variant: "destructive" });
    },
  });

  // 削除
  const deleteMutation = useMutation({
    mutationFn: deleteWorkLog,
    onSuccess: () => {
      toast({ title: "作業実績を削除しました" });
      queryClient.invalidateQueries({ queryKey: ["/api/work-logs"] });
    },
    onError: (error: any) => {
      toast({ title: "エラー", description: error.message || "削除に失敗しました", variant: "destructive" });
    },
  });

  const onSubmit = (data: WorkLogFormData) => {
    if (editingLog) {
      updateMutation.mutate({ id: editingLog.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (log: WorkLog) => {
    setEditingLog(log);
    form.reset({
      date: dayjs(log.date).format("YYYY-MM-DD"),
      worker: log.worker,
      duration_hours: log.duration_hours,
    });
  };

  const handleCancelEdit = () => {
    setEditingLog(null);
    form.reset({ date: todayDate, worker: form.getValues("worker"), duration_hours: 0 });
  };

  const handleDelete = (id: number) => {
    if (confirm("この作業実績を削除してもよろしいですか？")) {
      deleteMutation.mutate(id);
    }
  };

  // CSV取込
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast({ title: "エラー", description: "CSVファイルを選択してください", variant: "destructive" });
        return;
      }
      setCsvFile(file);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      const response = await fetch("/api/work-logs/upload-csv", { method: "POST", body: formData });
      if (!response.ok) throw new Error("CSV upload failed");
      const result = await response.json();
      toast({
        title: "CSVアップロード完了",
        description: `${result.summary.success}件登録しました（失敗: ${result.summary.failed}件）`,
      });
      setCsvFile(null);
      const fileInput = document.getElementById("csv-file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      queryClient.invalidateQueries({ queryKey: ["/api/work-logs"] });
    } catch (error: any) {
      toast({ title: "エラー", description: error.message || "アップロードに失敗しました", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const logs: WorkLog[] = workLogsData?.data || [];

  return (
    <div className="p-6 space-y-6" data-testid="page-work-results">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
          <Timer className="h-8 w-8" />
          作業実績入力
        </h1>
        <p className="text-muted-foreground">日々の作業時間を記録します</p>
      </div>

      {/* CSVアップロード */}
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
            <Button onClick={handleCsvUpload} disabled={!csvFile || isUploading} data-testid="button-upload-csv">
              {isUploading ? "アップロード中..." : "アップロード"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            ハーモス勤怠管理システムからエクスポートしたCSVファイルをアップロードできます。
          </p>
        </CardContent>
      </Card>

      {/* 入力フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            {editingLog ? "作業実績を編集" : "新規作業実績入力"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 作業日 */}
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

                {/* 作業者 */}
                <FormField
                  control={form.control}
                  name="worker"
                  render={({ field }) => {
                    const editingWorkerName = editingLog?.worker;
                    const showEditingWorker = editingWorkerName && !activeWorkers.some(w => w.name === editingWorkerName);
                    return (
                      <FormItem>
                        <FormLabel>作業者 *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-worker">
                              <SelectValue placeholder="作業者を選択" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {showEditingWorker && (
                              <SelectItem value={editingWorkerName}>{editingWorkerName}（非アクティブ）</SelectItem>
                            )}
                            {activeWorkers.map(w => (
                              <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* 実働時間 */}
                <FormField
                  control={form.control}
                  name="duration_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>実働時間（h）*</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.25"
                          min="0.25"
                          placeholder="例: 8"
                          {...field}
                          value={field.value === 0 ? "" : field.value}
                          onChange={e => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                          data-testid="input-duration"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {editingLog && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit} data-testid="button-cancel-edit">
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
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* 作業実績一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>作業実績一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">作業実績はまだありません</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>作業日</TableHead>
                    <TableHead>作業者</TableHead>
                    <TableHead className="text-right">実働時間</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id} data-testid={`row-work-log-${log.id}`}>
                      <TableCell>{log.date ? dayjs(log.date).format("YYYY-MM-DD") : "-"}</TableCell>
                      <TableCell>{log.worker}</TableCell>
                      <TableCell className="text-right font-medium">{log.duration_hours}h</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(log)} data-testid={`button-edit-${log.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(log.id)} data-testid={`button-delete-${log.id}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
