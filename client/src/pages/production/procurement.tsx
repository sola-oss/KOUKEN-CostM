// Production Management MVP - Procurement Management (調達管理)
import { useState, useEffect } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingCart, Plus, Filter, Edit, Trash2 } from "lucide-react";
import { listProcurements, createProcurement, updateProcurement, deleteProcurement, listOrders, type Procurement, type ProcurementPayload } from "@/shared/production-api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Form validation schema
const procurementFormSchema = z.object({
  order_id: z.string().min(1, "受注番号は必須です"),
  kind: z.literal('purchase').default('purchase'),
  item_name: z.string().min(1, "品目名は必須です"),
  qty: z.coerce.number().min(1, "数量は1以上である必要があります"),
  eta: z.string().min(1, "予定納期は必須です"),
  status: z.string().min(1, "ステータスは必須です"),
  vendor: z.string().optional(),
  vendor_id: z.coerce.number().optional().nullable(),
  unit_price: z.coerce.number().min(0, "単価は0以上である必要があります").optional(),
  total_amount: z.coerce.number().min(0, "合計金額は0以上である必要があります").optional().nullable(),
  is_approved: z.boolean().default(false),
  std_time_per_unit: z.coerce.number().min(0, "標準工数は0以上である必要があります").optional(),
  act_time_per_unit: z.coerce.number().min(0, "実績工数は0以上である必要があります").optional(),
  worker: z.string().optional(),
  completed_at: z.string().optional()
});

type ProcurementFormData = z.infer<typeof procurementFormSchema>;

export default function ProcurementManagement() {
  const { toast } = useToast();
  const [filterOrderId, setFilterOrderId] = useState<string>("all");
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

  // Fetch vendors from vendors master
  const { data: vendorsData } = useQuery({
    queryKey: ['/api/vendors-master'],
    queryFn: async () => {
      const res = await fetch('/api/vendors-master');
      if (!res.ok) throw new Error('Failed to fetch vendors');
      return res.json() as Promise<{ id: number; name: string; is_active: boolean }[]>;
    }
  });

  // Fetch materials from materials master
  const { data: materialsData } = useQuery({
    queryKey: ['/api/materials'],
    queryFn: async () => {
      const res = await fetch('/api/materials');
      if (!res.ok) throw new Error('Failed to fetch materials');
      return res.json() as Promise<{ data: { id: number; material_type: string; name: string; size: string; unit: string; unit_price: number | null }[] }>;
    }
  });

  const procurements = procurementsResponse?.data || [];
  const orders = ordersResponse?.data || [];
  const vendors = (vendorsData || []).filter(v => v.is_active);
  const materials = materialsData?.data || [];

  // Create form
  const form = useForm<ProcurementFormData>({
    resolver: zodResolver(procurementFormSchema),
    defaultValues: {
      order_id: "",
      kind: 'purchase',
      item_name: "",
      qty: 1,
      eta: "",
      status: "planned",
      vendor: "",
      vendor_id: null,
      unit_price: 0,
      total_amount: null,
      is_approved: false,
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
      order_id: "",
      kind: 'purchase',
      item_name: "",
      qty: 1,
      eta: "",
      status: "planned",
      vendor: "",
      vendor_id: null,
      unit_price: 0,
      total_amount: null,
      is_approved: false,
      std_time_per_unit: 0,
      act_time_per_unit: 0,
      worker: "",
      completed_at: ""
    }
  });

  // Watch kind field to update form
  const watchKind = form.watch("kind");

  // Auto-calculate total_amount for create form
  const watchCreateUnitPrice = form.watch("unit_price");
  const watchCreateQty = form.watch("qty");
  useEffect(() => {
    const unitPrice = Number(watchCreateUnitPrice) || 0;
    const qty = Number(watchCreateQty) || 0;
    form.setValue("total_amount", unitPrice * qty);
  }, [watchCreateUnitPrice, watchCreateQty, form]);

  // Auto-calculate total_amount for edit form
  const watchEditUnitPrice = editForm.watch("unit_price");
  const watchEditQty = editForm.watch("qty");
  useEffect(() => {
    const unitPrice = Number(watchEditUnitPrice) || 0;
    const qty = Number(watchEditQty) || 0;
    editForm.setValue("total_amount", unitPrice * qty);
  }, [watchEditUnitPrice, watchEditQty, editForm]);

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
        order_id: "",
        kind: 'purchase',
        item_name: "",
        qty: 1,
        eta: "",
        status: "planned",
        vendor: "",
        vendor_id: null,
        unit_price: 0,
        total_amount: null,
        is_approved: false,
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
      payload.vendor_id = data.vendor_id || null;
      payload.total_amount = data.total_amount || null;
      payload.is_approved = Boolean(data.is_approved);
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
        payload.vendor_id = data.vendor_id || null;
        payload.total_amount = data.total_amount || null;
        payload.is_approved = Boolean(data.is_approved);
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
      order_id: proc.order_id || '',
      kind: 'purchase',
      item_name: proc.item_name,
      qty: proc.qty,
      eta: proc.eta ? format(new Date(proc.eta), 'yyyy-MM-dd') : '',
      status: proc.status || 'planned',
      vendor: proc.vendor || '',
      vendor_id: (proc as any).vendor_id || null,
      unit_price: proc.unit_price || 0,
      total_amount: (proc as any).total_amount || null,
      is_approved: Boolean((proc as any).is_approved),
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      planned: { label: '未発注', className: '' },
      ordered: { label: '発注済', className: 'bg-info text-info-foreground' },
      partial: { label: '一部入荷', className: 'bg-warning text-warning-foreground' },
      received: { label: '入荷済', className: 'bg-success text-success-foreground' },
      cancelled: { label: 'キャンセル', className: 'bg-destructive text-destructive-foreground' }
    };
    const config = statusConfig[status] || { label: status, className: '' };
    if (config.className) {
      return <Badge className={config.className}>{config.label}</Badge>;
    }
    return <Badge variant="secondary">{config.label}</Badge>;
  };

  // Filter procurements (purchase only)
  const filteredProcurements = procurements.filter(proc => {
    if (proc.kind !== 'purchase') return false;
    if (filterOrderId !== "all" && proc.order_id !== filterOrderId) {
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
          購買手配の管理
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="order_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>受注番号 *</FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value || ""} 
                              onValueChange={field.onChange}
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
                          <FormLabel>品目（材料マスタ） *</FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value || ""} 
                              onValueChange={(value) => {
                                field.onChange(value);
                                const selectedMaterial = materials.find(m => 
                                  `${m.material_type} - ${m.name} - ${m.size}` === value
                                );
                                if (selectedMaterial?.unit_price) {
                                  form.setValue('unit_price', selectedMaterial.unit_price);
                                }
                              }}
                            >
                              <SelectTrigger data-testid="select-item-name">
                                <SelectValue placeholder="材料を選択" />
                              </SelectTrigger>
                              <SelectContent>
                                {materials.map(material => {
                                  const displayName = `${material.material_type} - ${material.name} - ${material.size}`;
                                  return (
                                    <SelectItem key={material.id} value={displayName}>
                                      {displayName} ({material.unit})
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
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

                    <FormField
                      control={form.control}
                      name="vendor_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>発注先（業者マスタ）</FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value?.toString() || "__none__"} 
                              onValueChange={(value) => field.onChange(value === "__none__" ? null : parseInt(value))}
                            >
                              <SelectTrigger data-testid="select-vendor-id">
                                <SelectValue placeholder="業者を選択" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">未選択</SelectItem>
                                {vendors.map(vendor => (
                                  <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                    {vendor.name}
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
                      name="total_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>合計金額</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="0" 
                              step="0.01" 
                              value={field.value ?? ''} 
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                              data-testid="input-total-amount" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_approved"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-is-approved"
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            承認済み
                          </FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
              </div>

              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                data-testid="button-submit-procurement"
              >
                <Plus className="h-4 w-4 mr-2" />
                {createMutation.isPending ? "登録中..." : "購買を登録"}
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
        <CardContent className="grid gap-4 md:grid-cols-2">
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
            <label className="text-sm font-medium mb-2 block">ステータス</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger data-testid="filter-status">
                <SelectValue placeholder="すべて" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {purchaseStatusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
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
                  <TableHead>品目名</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>予定納期</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>発注先</TableHead>
                  <TableHead>単価</TableHead>
                  <TableHead>合計金額</TableHead>
                  <TableHead>承認</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcurements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      該当する購買手配がありません
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
                      <TableCell className="font-medium">{proc.item_name}</TableCell>
                      <TableCell>{proc.qty}</TableCell>
                      <TableCell>{proc.eta ? format(new Date(proc.eta), 'yyyy/MM/dd') : '-'}</TableCell>
                      <TableCell>{getStatusBadge(proc.status || 'planned')}</TableCell>
                      <TableCell>{proc.vendor || '-'}</TableCell>
                      <TableCell>¥{proc.unit_price?.toLocaleString() || 0}</TableCell>
                      <TableCell>
                        {(proc as any).total_amount != null ? `¥${(proc as any).total_amount?.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        {(proc as any).is_approved ? (
                          <Badge className="bg-success text-success-foreground">承認済</Badge>
                        ) : (
                          <Badge variant="secondary">未承認</Badge>
                        )}
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
                          value={field.value || ""} 
                          onValueChange={field.onChange}
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
                  name="item_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>品目（材料マスタ） *</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value || ""} 
                          onValueChange={(value) => {
                            field.onChange(value);
                            const selectedMaterial = materials.find(m => 
                              `${m.material_type} - ${m.name} - ${m.size}` === value
                            );
                            if (selectedMaterial?.unit_price) {
                              editForm.setValue('unit_price', selectedMaterial.unit_price);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="材料を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {materials.map(material => {
                              const displayName = `${material.material_type} - ${material.name} - ${material.size}`;
                              return (
                                <SelectItem key={material.id} value={displayName}>
                                  {displayName} ({material.unit})
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
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
                  control={editForm.control}
                  name="vendor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>発注先（業者マスタ）</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value?.toString() || "__none__"} 
                          onValueChange={(value) => field.onChange(value === "__none__" ? null : parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="業者を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">未選択</SelectItem>
                            {vendors.map(vendor => (
                              <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                {vendor.name}
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

                <FormField
                  control={editForm.control}
                  name="total_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>合計金額</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          value={field.value ?? ''} 
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="is_approved"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        承認済み
                      </FormLabel>
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
