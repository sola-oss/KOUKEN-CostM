import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Plus, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Type definitions
interface SimpleTimeEntry {
  id: number;
  employee_name: string;
  sales_order_id: number;
  start_at: string | null;
  end_at: string | null;
  minutes: number | null;
  note: string | null;
  status: 'draft' | 'approved';
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  order_no: string;
  customer_name: string;
}

interface SalesOrder {
  id: number;
  order_no: string;
  customer_name: string;
  status: string;
}

// Form schema
const timeEntrySchema = z.object({
  employee_name: z.string().min(1, "従業員名は必須です"),
  sales_order_id: z.number().min(1, "受注を選択してください"),
  entry_type: z.enum(["minutes", "time_range"]),
  minutes: z.number().min(1).optional(),
  start_at: z.string().optional(),
  end_at: z.string().optional(),
  note: z.string().optional(),
}).refine((data) => {
  if (data.entry_type === "minutes") {
    return data.minutes && data.minutes > 0;
  }
  return data.start_at && data.end_at;
}, {
  message: "工数または開始・終了時刻を入力してください",
});

type TimeEntryFormData = z.infer<typeof timeEntrySchema>;

export default function TimeEntries() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderFilter, setOrderFilter] = useState("all");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SimpleTimeEntry | null>(null);

  // Form setup
  const form = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      employee_name: "",
      sales_order_id: 0,
      entry_type: "minutes",
      minutes: undefined,
      start_at: "",
      end_at: "",
      note: "",
    },
  });

  // Fetch time entries
  const { data: entriesResponse, isLoading, error } = useQuery<{ data: SimpleTimeEntry[]; meta: any }>({
    queryKey: [
      '/api/simple-time-entries',
      {
        status: statusFilter === 'all' ? undefined : statusFilter,
        sales_order_id: orderFilter === 'all' ? undefined : Number(orderFilter),
        query: searchTerm || undefined,
        page: 1,
        page_size: 50,
      },
    ],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch sales orders for dropdown
  const { data: ordersResponse } = useQuery<{ data: SalesOrder[] }>({
    queryKey: ['/api/sales-orders'],
  });

  // Create time entry mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/simple-time-entries', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to create time entry');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "工数を登録しました" });
      queryClient.invalidateQueries({ queryKey: ['/api/simple-time-entries'] });
      setIsFormDialogOpen(false);
      setEditingEntry(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "エラーが発生しました", description: error.message, variant: "destructive" });
    },
  });

  // Update time entry mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/simple-time-entries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to update time entry');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "工数を更新しました" });
      queryClient.invalidateQueries({ queryKey: ['/api/simple-time-entries'] });
      setIsFormDialogOpen(false);
      setEditingEntry(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "エラーが発生しました", description: error.message, variant: "destructive" });
    },
  });

  // Delete time entry mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/simple-time-entries/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete time entry');
      return response.status === 204 ? null : response.json();
    },
    onSuccess: () => {
      toast({ title: "工数を削除しました" });
      queryClient.invalidateQueries({ queryKey: ['/api/simple-time-entries'] });
    },
    onError: (error: any) => {
      toast({ title: "エラーが発生しました", description: error.message, variant: "destructive" });
    },
  });

  // Extract entries array from API response
  const entries = entriesResponse?.data || [];
  const salesOrders = ordersResponse?.data || [];

  // Filter entries based on search and filters
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = 
        entry.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.note && entry.note.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
      const matchesOrder = orderFilter === "all" || entry.sales_order_id.toString() === orderFilter;
      
      return matchesSearch && matchesStatus && matchesOrder;
    });
  }, [entries, searchTerm, statusFilter, orderFilter]);

  const handleSubmit = (data: TimeEntryFormData) => {
    const requestData: any = {
      employee_name: data.employee_name,
      sales_order_id: data.sales_order_id,
      note: data.note,
    };

    if (data.entry_type === "minutes") {
      requestData.minutes = data.minutes;
    } else {
      // Convert local time to UTC for API
      requestData.start_at = new Date(data.start_at!).toISOString();
      requestData.end_at = new Date(data.end_at!).toISOString();
    }

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: requestData });
    } else {
      createMutation.mutate(requestData);
    }
  };

  const handleEdit = (entry: SimpleTimeEntry) => {
    setEditingEntry(entry);
    
    form.reset({
      employee_name: entry.employee_name,
      sales_order_id: entry.sales_order_id,
      entry_type: entry.minutes ? "minutes" : "time_range",
      minutes: entry.minutes || undefined,
      start_at: entry.start_at ? new Date(entry.start_at).toISOString().slice(0, 16) : "",
      end_at: entry.end_at ? new Date(entry.end_at).toISOString().slice(0, 16) : "",
      note: entry.note || "",
    });
    
    setIsFormDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("この工数記録を削除してもよろしいですか？")) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">下書き</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">承認済</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "MM/dd HH:mm");
  };

  const formatMinutes = (minutes: number | null) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins}分`;
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">データの読み込みに失敗しました</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">工数管理</h1>
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingEntry(null);
              form.reset();
            }} data-testid="button-new-entry">
              <Plus className="h-4 w-4 mr-2" />
              工数登録
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" data-testid="dialog-time-entry-form">
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? "工数編集" : "工数登録"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="employee_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>従業員名</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="従業員名を入力" data-testid="input-employee-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sales_order_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>受注</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger data-testid="select-sales-order">
                            <SelectValue placeholder="受注を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {salesOrders.map((order) => (
                              <SelectItem key={order.id} value={order.id.toString()}>
                                {order.order_no} - {order.customer_name}
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
                  control={form.control}
                  name="entry_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>工数入力方法</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger data-testid="select-entry-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">分数で直接入力</SelectItem>
                            <SelectItem value="time_range">開始・終了時刻で入力</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("entry_type") === "minutes" ? (
                  <FormField
                    control={form.control}
                    name="minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>工数（分）</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            placeholder="分数を入力"
                            data-testid="input-minutes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_at"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>開始時刻</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                              data-testid="input-start-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="end_at"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>終了時刻</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                              data-testid="input-end-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>メモ</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="作業内容やメモを入力"
                          rows={3}
                          data-testid="textarea-note"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsFormDialogOpen(false);
                      setEditingEntry(null);
                      form.reset();
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-entry"
                  >
                    {createMutation.isPending || updateMutation.isPending ? "保存中..." : "保存"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="従業員名、受注番号、顧客名で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全ステータス</SelectItem>
                  <SelectItem value="draft">下書き</SelectItem>
                  <SelectItem value="approved">承認済</SelectItem>
                </SelectContent>
              </Select>

              <Select value={orderFilter} onValueChange={setOrderFilter}>
                <SelectTrigger className="w-60" data-testid="select-order-filter">
                  <SelectValue placeholder="受注フィルター" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全受注</SelectItem>
                  {salesOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id.toString()}>
                      {order.order_no} - {order.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setOrderFilter("all");
                }}
                data-testid="button-clear-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                クリア
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総工数記録</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-entries">
              {filteredEntries.length}件
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">下書き</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-draft-entries">
              {filteredEntries.filter(e => e.status === 'draft').length}件
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">承認済</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-approved-entries">
              {filteredEntries.filter(e => e.status === 'approved').length}件
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総工数時間</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-total-hours">
              {Math.round(filteredEntries.reduce((sum, e) => sum + (e.minutes || 0), 0) / 60)}時間
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            工数記録一覧 ({filteredEntries.length}件)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>従業員名</TableHead>
                  <TableHead>受注番号</TableHead>
                  <TableHead>顧客名</TableHead>
                  <TableHead>開始時刻</TableHead>
                  <TableHead>終了時刻</TableHead>
                  <TableHead>工数</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>登録日</TableHead>
                  <TableHead className="w-20">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                    <TableCell className="font-medium">
                      {entry.employee_name}
                    </TableCell>
                    <TableCell>{entry.order_no}</TableCell>
                    <TableCell>{entry.customer_name}</TableCell>
                    <TableCell>{formatTime(entry.start_at)}</TableCell>
                    <TableCell>{formatTime(entry.end_at)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatMinutes(entry.minutes)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(entry.status)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(entry.created_at), "MM/dd HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {entry.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(entry)}
                            data-testid={`button-edit-${entry.id}`}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        {entry.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-${entry.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && filteredEntries.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              条件に一致する工数記録が見つかりません
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}