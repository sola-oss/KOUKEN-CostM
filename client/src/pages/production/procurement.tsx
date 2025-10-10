// Production Management MVP - Procurement Management (調達管理)
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ShoppingCart, Plus, Factory, Filter, Edit, Trash2 } from "lucide-react";
import { listProcurements, createProcurement, updateProcurement, deleteProcurement, listOrders, type Procurement, type ProcurementPayload } from "@/shared/production-api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Form validation schema
const procurementFormSchema = z.object({
  order_id: z.coerce.number().min(1, "受注番号は必須です"),
  kind: z.enum(['purchase', 'manufacture']),
  item_name: z.string().min(1, "品目名は必須です"),
  qty: z.coerce.number().min(1, "数量は1以上である必要があります"),
  eta: z.string().min(1, "予定納期は必須です"),
  status: z.string().min(1, "ステータスは必須です"),
  vendor: z.string().optional(),
  unit_price: z.coerce.number().min(0, "単価は0以上である必要があります").optional(),
  std_time_per_unit: z.coerce.number().min(0, "標準工数は0以上である必要があります").optional(),
  act_time_per_unit: z.coerce.number().min(0, "実績工数は0以上である必要があります").optional(),
  worker: z.string().optional(),
  completed_at: z.string().optional()
});

type ProcurementFormData = z.infer<typeof procurementFormSchema>;

export default function ProcurementManagement() {
  const { toast } = useToast();
  const [selectedKind, setSelectedKind] = useState<'purchase' | 'manufacture'>('purchase');
  const [filterOrderId, setFilterOrderId] = useState<string>("all");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingProcurement, setEditingProcurement] = useState<Procurement | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingProcurementId, setDeletingProcurementId] = useState<number | null>(null);

  // Fetch procurements
  const { data: procurementsResponse, isLoading } = useQuery({
    queryKey: ['procurements'],
    queryFn: () => listProcurements({ page_size: 100 })
  });

  // Fetch orders for dropdown
  const { data: ordersResponse } = useQuery({
    queryKey: ['orders-dropdown'],
    queryFn: () => listOrders({ page_size: 100 })
  });

  const procurements = procurementsResponse?.data || [];
  const orders = ordersResponse?.data || [];

  // Create form
  const form = useForm<ProcurementFormData>({
    resolver: zodResolver(procurementFormSchema),
    defaultValues: {
      order_id: 0,
      kind: 'purchase',
      item_name: "",
      qty: 1,
      eta: "",
      status: "planned",
      vendor: "",
      unit_price: 0,
      std_time_per_unit: 0,
      act_time_per_unit: 0,
      worker: "",
      completed_at: ""
    }
  });

  // Edit form
  const editForm = useForm<ProcurementFormData>({
    resolver: zodResolver(procurementFormSchema),
    defaultValues: {
      order_id: 0,
      kind: 'purchase',
      item_name: "",
      qty: 1,
      eta: "",
      status: "planned",
      vendor: "",
      unit_price: 0,
      std_time_per_unit: 0,
      act_time_per_unit: 0,
      worker: "",
      completed_at: ""
    }
  });

  // Watch kind field to update form
  const watchKind = form.watch("kind");

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ProcurementPayload) => createProcurement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurements'] });
      toast({
        title: "調達を登録しました",
        description: "新しい調達手配が作成されました"
      });
      form.reset({
        order_id: 0,
        kind: selectedKind,
        item_name: "",
        qty: 1,
        eta: "",
        status: "planned",
        vendor: "",
        unit_price: 0,
        std_time_per_unit: 0,
        act_time_per_unit: 0,
        worker: "",
        completed_at: ""
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "調達の登録に失敗しました",
        variant: "destructive"
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProcurementPayload> }) => 
      updateProcurement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurements'] });
      toast({
        title: "調達を更新しました",
        description: "調達手配が正常に更新されました"
      });
      setIsEditDialogOpen(false);
      setEditingProcurement(null);
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "調達の更新に失敗しました",
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProcurement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurements'] });
      toast({
        title: "調達を削除しました",
        description: "調達手配が正常に削除されました"
      });
      setDeletingProcurementId(null);
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "調達の削除に失敗しました",
        variant: "destructive"
      });
      setDeletingProcurementId(null);
    }
  });

  const onSubmit = (data: ProcurementFormData) => {
    const payload: any = {
      order_id: data.order_id,
      kind: data.kind,
      item_name: data.item_name,
      qty: data.qty,
      eta: data.eta,
      status: data.status,
      unit_price: data.kind === 'purchase' ? (data.unit_price || 0) : 0
    };

    if (data.kind === 'purchase') {
      payload.vendor = data.vendor;
    } else {
      payload.std_time_per_unit = data.std_time_per_unit;
      payload.act_time_per_unit = data.act_time_per_unit;
      payload.worker = data.worker;
      if (data.completed_at) {
        payload.completed_at = data.completed_at;
      }
    }

    createMutation.mutate(payload);
  };

  const onEditSubmit = (data: ProcurementFormData) => {
    if (editingProcurement) {
      const payload: any = {
        order_id: data.order_id,
        kind: data.kind,
        item_name: data.item_name,
        qty: data.qty,
        eta: data.eta,
        status: data.status,
        unit_price: data.kind === 'purchase' ? (data.unit_price || 0) : 0
      };

      if (data.kind === 'purchase') {
        payload.vendor = data.vendor;
      } else {
        payload.std_time_per_unit = data.std_time_per_unit;
        payload.act_time_per_unit = data.act_time_per_unit;
        payload.worker = data.worker;
        if (data.completed_at) {
          payload.completed_at = data.completed_at;
        }
      }

      updateMutation.mutate({
        id: editingProcurement.id,
        data: payload
      });
    }
  };

  const handleEditClick = (proc: Procurement) => {
    setEditingProcurement(proc);
    editForm.reset({
      order_id: proc.order_id || 0,
      kind: proc.kind,
      item_name: proc.item_name,
      qty: proc.qty,
      eta: proc.eta ? format(new Date(proc.eta), 'yyyy-MM-dd') : '',
      status: proc.status || 'planned',
      vendor: proc.vendor || '',
      unit_price: proc.unit_price || 0,
      std_time_per_unit: proc.std_time_per_unit || 0,
      act_time_per_unit: proc.act_time_per_unit || 0,
      worker: proc.worker || '',
      completed_at: proc.completed_at ? format(new Date(proc.completed_at), 'yyyy-MM-dd') : ''
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (procId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingProcurementId(procId);
  };

  const confirmDelete = () => {
    if (deletingProcurementId !== null) {
      deleteMutation.mutate(deletingProcurementId);
    }
  };

  const getStatusBadge = (kind: string, status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      planned: { label: kind === 'purchase' ? '未発注' : '未着手', variant: "secondary" },
      ordered: { label: kind === 'purchase' ? '発注済' : '進行中', variant: "default" },
      received: { label: kind === 'purchase' ? '入荷済' : '完成', variant: "outline" },
      completed: { label: '完了', variant: "outline" }
    };
    const config = variants[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Filter procurements
  const filteredProcurements = procurements.filter(proc => {
    if (filterOrderId !== "all" && proc.order_id !== parseInt(filterOrderId)) {
      return false;
    }
    if (filterKind !== "all" && proc.kind !== filterKind) {
      return false;
    }
    if (filterStatus !== "all" && proc.status !== filterStatus) {
      return false;
    }
    return true;
  });

  const purchaseStatusOptions = [
    { value: 'planned', label: '未発注' },
    { value: 'ordered', label: '発注済' },
    { value: 'partial', label: '一部入荷' },
    { value: 'received', label: '入荷済' },
    { value: 'cancelled', label: 'キャンセル' }
  ];

  const manufactureStatusOptions = [
    { value: 'planned', label: '未着手' },
    { value: 'in_progress', label: '進行中' },
    { value: 'completed', label: '完成' },
    { value: 'cancelled', label: 'キャンセル' }
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-procurement">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
          <ShoppingCart className="h-8 w-8" />
          調達管理
        </h1>
        <p className="text-muted-foreground">
          購買手配と製造手配の管理
        </p>
      </div>

      {/* Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            新規調達手配
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedKind} onValueChange={(v) => {
            setSelectedKind(v as 'purchase' | 'manufacture');
            form.setValue('kind', v as 'purchase' | 'manufacture');
          }}>
            <TabsList className="mb-4">
              <TabsTrigger value="purchase" data-testid="tab-purchase">
                <ShoppingCart className="h-4 w-4 mr-2" />
                購買手配
              </TabsTrigger>
              <TabsTrigger value="manufacture" data-testid="tab-manufacture">
                <Factory className="h-4 w-4 mr-2" />
                製造手配
              </TabsTrigger>
            </TabsList>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <TabsContent value="purchase" className="mt-0">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="order_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>受注番号 *</FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value?.toString() || ""} 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <SelectTrigger data-testid="select-order-id">
                                <SelectValue placeholder="受注番号を選択" />
                              </SelectTrigger>
                              <SelectContent>
                                {orders.map(order => (
                                  <SelectItem key={order.order_id} value={order.order_id.toString()}>
                                    {order.order_id} - {order.product_name}
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
                      name="item_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>品目名 *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="品目名を入力" data-testid="input-item-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="qty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>数量 *</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="1" data-testid="input-qty" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="eta"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>予定納期 *</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-eta" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ステータス *</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {purchaseStatusOptions.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                      name="vendor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>発注先</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="発注先を入力" data-testid="input-vendor" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="unit_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>単価</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" step="0.01" data-testid="input-unit-price" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="manufacture" className="mt-0">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="order_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>受注番号 *</FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value?.toString() || ""} 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="受注番号を選択" />
                              </SelectTrigger>
                              <SelectContent>
                                {orders.map(order => (
                                  <SelectItem key={order.order_id} value={order.order_id.toString()}>
                                    {order.order_id} - {order.product_name}
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
                      name="item_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>品目名 *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="品目名を入力" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
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
                      control={form.control}
                      name="eta"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>予定納期 *</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ステータス *</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {manufactureStatusOptions.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                      name="std_time_per_unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>標準工数 (h/個)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" step="0.1" data-testid="input-std-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="act_time_per_unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>実績工数 (h/個)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" step="0.1" data-testid="input-act-time" />
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
                          <FormLabel>作業者</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="作業者名を入力" data-testid="input-worker" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="completed_at"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>完成日</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-completed-at" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  data-testid="button-submit-procurement"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {createMutation.isPending ? "登録中..." : "調達を登録"}
                </Button>
              </form>
            </Form>
          </Tabs>
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
                    {order.order_id} - {order.product_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">手配区分</label>
            <Select value={filterKind} onValueChange={setFilterKind}>
              <SelectTrigger data-testid="filter-kind">
                <SelectValue placeholder="すべて" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="purchase">購買</SelectItem>
                <SelectItem value="manufacture">製造</SelectItem>
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
                <SelectItem value="planned">未発注/未着手</SelectItem>
                <SelectItem value="ordered">発注済/進行中</SelectItem>
                <SelectItem value="received">入荷済/完成</SelectItem>
                <SelectItem value="completed">完了</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Procurement List Table */}
      <Card>
        <CardHeader>
          <CardTitle>調達一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>受注番号</TableHead>
                  <TableHead>区分</TableHead>
                  <TableHead>品目名</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>予定納期</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>発注先/作業者</TableHead>
                  <TableHead>単価/工数</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcurements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      該当する調達がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProcurements.map(proc => (
                    <TableRow 
                      key={proc.id} 
                      className="hover-elevate"
                      data-testid={`row-procurement-${proc.id}`}
                    >
                      <TableCell>{proc.order_id}</TableCell>
                      <TableCell>
                        <Badge variant={proc.kind === 'purchase' ? 'default' : 'secondary'}>
                          {proc.kind === 'purchase' ? '購買' : '製造'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{proc.item_name}</TableCell>
                      <TableCell>{proc.qty}</TableCell>
                      <TableCell>{proc.eta ? format(new Date(proc.eta), 'yyyy/MM/dd') : '-'}</TableCell>
                      <TableCell>{getStatusBadge(proc.kind, proc.status || 'planned')}</TableCell>
                      <TableCell>
                        {proc.kind === 'purchase' ? (proc.vendor || '-') : (proc.worker || '-')}
                      </TableCell>
                      <TableCell>
                        {proc.kind === 'purchase' 
                          ? `¥${proc.unit_price?.toLocaleString() || 0}` 
                          : `${proc.std_time_per_unit || 0}h`}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditClick(proc)}
                            data-testid={`button-edit-${proc.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleDeleteClick(proc.id, e)}
                            data-testid={`button-delete-${proc.id}`}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>調達手配を編集</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={editForm.control}
                  name="order_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>受注番号 *</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value?.toString() || ""} 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="受注番号を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {orders.map(order => (
                              <SelectItem key={order.order_id} value={order.order_id.toString()}>
                                {order.order_id} - {order.product_name}
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
                  name="kind"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>区分 *</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="purchase">購買</SelectItem>
                            <SelectItem value="manufacture">製造</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="item_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>品目名 *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="品目名を入力" />
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
                  name="eta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>予定納期 *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
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
                      <FormLabel>ステータス *</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {editingProcurement?.kind === 'purchase' ? (
                              purchaseStatusOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))
                            ) : (
                              manufactureStatusOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {editingProcurement?.kind === 'purchase' ? (
                  <>
                    <FormField
                      control={editForm.control}
                      name="vendor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>発注先</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="発注先を入力" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="unit_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>単価</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" step="0.01" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <>
                    <FormField
                      control={editForm.control}
                      name="std_time_per_unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>標準工数 (h/個)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" step="0.1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="act_time_per_unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>実績工数 (h/個)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" step="0.1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="worker"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>作業者</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="作業者名を入力" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="completed_at"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>完成日</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
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
      <AlertDialog open={deletingProcurementId !== null} onOpenChange={(open) => !open && setDeletingProcurementId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>調達手配を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。調達手配に関連するすべてのデータが削除されます。
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
