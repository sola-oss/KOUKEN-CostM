// Production Management MVP - Orders Management (受注管理)
// Stage 2: Full CRUD with 19-field form support
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Package, Search, Plus, ArrowUpDown, Edit, Trash2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { listOrders, type Order } from "@/shared/production-api";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// ========== FORM VALIDATION SCHEMA ==========

// Order form validation schema
const orderFormSchema = z.object({
  order_id: z.string().optional(),
  order_date: z.string().optional(),
  client_name: z.string().min(1, "客先名は必須です"),
  manager: z.string().optional(),
  client_order_no: z.string().optional(),
  project_title: z.string().min(1, "件名は必須です"),
  due_date: z.string().min(1, "納期は必須です"),
  delivery_date: z.string().optional(),
  confirmed_date: z.string().optional(),
  estimated_amount: z.string().optional(),
  invoiced_amount: z.string().optional(),
  invoice_month: z.string().optional(),
  note: z.string().optional(),
  subcontractor: z.string().optional(),
  processing_hours: z.string().optional(),
  is_delivered: z.boolean().optional(),
  has_shipping_fee: z.boolean().optional(),
  is_amount_confirmed: z.boolean().optional(),
  is_invoiced: z.boolean().optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

// ========== HELPER COMPONENTS ==========

/**
 * StatusIconCluster: Displays status flags as Japanese labeled badges
 * Only shows badges for true values, making it easy to see active statuses at a glance
 */
interface StatusIconClusterProps {
  is_delivered: boolean | null;
  has_shipping_fee: boolean | null;
  is_amount_confirmed: boolean | null;
  is_invoiced: boolean | null;
}

function StatusIconCluster({ is_delivered, has_shipping_fee, is_amount_confirmed, is_invoiced }: StatusIconClusterProps) {
  const statuses = [
    { value: is_delivered, label: "納品済み", testId: "badge-delivered" },
    { value: has_shipping_fee, label: "送料あり", testId: "badge-shipping" },
    { value: is_amount_confirmed, label: "金額確定", testId: "badge-amount-confirmed" },
    { value: is_invoiced, label: "請求済み", testId: "badge-invoiced" },
  ];

  const activeStatuses = statuses.filter(status => status.value === true);

  if (activeStatuses.length === 0) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  return (
    <div className="flex flex-col items-start gap-0.5" data-testid="status-badge-cluster">
      {activeStatuses.map((status) => (
        <Badge 
          key={status.label}
          variant="default"
          className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/40 text-xs"
          data-testid={status.testId}
        >
          <Check className="h-3 w-3 mr-1" />
          {status.label}
        </Badge>
      ))}
    </div>
  );
}

// ========== MAIN COMPONENT ==========

type SortField = 'due_date' | 'invoiced_amount';
type SortOrder = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export default function Projects() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'due_date', order: 'asc' });
  const [newlyCreatedOrderId, setNewlyCreatedOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  
  // Form Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  // Form hook
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      order_id: "",
      order_date: "",
      client_name: "",
      manager: "",
      client_order_no: "",
      project_title: "",
      due_date: "",
      delivery_date: "",
      confirmed_date: "",
      estimated_amount: "",
      invoiced_amount: "",
      invoice_month: "",
      note: "",
      subcontractor: "",
      processing_hours: "",
      is_delivered: false,
      has_shipping_fee: false,
      is_amount_confirmed: false,
      is_invoiced: false,
    },
  });

  // Fetch orders (with server-side search)
  const { data: ordersResponse, isLoading, error } = useQuery({
    queryKey: ['orders', page, searchQuery],
    queryFn: () => listOrders({ 
      page, 
      page_size: 30,
      search: searchQuery.trim() || undefined
    }),
  });

  const orders = ordersResponse?.data || [];

  // Create Order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: Partial<Order>) => {
      const response = await apiRequest('POST', '/api/production/orders', data);
      return await response.json() as Order;
    },
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setNewlyCreatedOrderId(newOrder.order_id);
      toast({
        title: "成功",
        description: "受注を登録しました",
      });
      setIsFormOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "エラー",
        description: error.message || "受注の登録に失敗しました",
      });
    }
  });

  // Update Order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: Partial<Order> }) => {
      const response = await apiRequest('PATCH', `/api/production/orders/${orderId}`, data);
      return await response.json() as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: "成功",
        description: "受注を更新しました",
      });
      setIsFormOpen(false);
      setEditingOrder(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "エラー",
        description: error.message || "受注の更新に失敗しました",
      });
    }
  });

  // Sort orders (search is handled server-side)
  const filteredAndSortedOrders = useMemo(() => {
    // No client-side filtering needed - server handles search
    // Apply sorting with null-safe comparators (nulls always sort to bottom)
    const sorted = [...orders].sort((a, b) => {
      let compareValue = 0;
      
      // Determine null sentinel: +Infinity for asc, -Infinity for desc
      // This ensures nulls sink to bottom regardless of sort direction
      const nullSentinel = sortConfig.order === 'asc' ? Infinity : -Infinity;
      
      if (sortConfig.field === 'due_date') {
        const aDate = a.due_date ? new Date(a.due_date).getTime() : nullSentinel;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : nullSentinel;
        compareValue = aDate - bDate;
      } else if (sortConfig.field === 'invoiced_amount') {
        const aAmount = a.invoiced_amount ?? nullSentinel;
        const bAmount = b.invoiced_amount ?? nullSentinel;
        compareValue = aAmount - bAmount;
      }

      return sortConfig.order === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [orders, sortConfig]);

  // Clear highlight and reset page when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      setNewlyCreatedOrderId(null);
    }
    setPage(1); // Reset to page 1 when search changes
  }, [searchQuery]);

  // Sync local page state with server page when data changes
  useEffect(() => {
    if (ordersResponse?.meta?.page && ordersResponse.meta.page !== page) {
      setPage(ordersResponse.meta.page);
    }
  }, [ordersResponse?.meta?.page]);

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest('DELETE', `/api/production/orders/${orderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: "成功",
        description: "受注を削除しました",
      });
      setDeletingOrderId(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "エラー",
        description: error.message || "受注の削除に失敗しました",
      });
      setDeletingOrderId(null);
    }
  });

  const handleSort = (field: SortField) => {
    setNewlyCreatedOrderId(null);
    if (sortConfig.field === field) {
      setSortConfig({ field, order: sortConfig.order === 'asc' ? 'desc' : 'asc' });
    } else {
      setSortConfig({ field, order: 'asc' });
    }
  };

  const handleRowClick = (orderId: string) => {
    setNewlyCreatedOrderId(null);
    setLocation(`/project/${orderId}`);
  };

  const handleDelete = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingOrderId(orderId);
  };

  const confirmDelete = () => {
    if (deletingOrderId) {
      deleteOrderMutation.mutate(deletingOrderId);
    }
  };

  // Form handlers
  const handleCreateOrder = () => {
    setEditingOrder(null);
    form.reset({
      order_id: "",
      order_date: new Date().toISOString().split('T')[0],
      client_name: "",
      manager: "",
      client_order_no: "",
      project_title: "",
      due_date: "",
      delivery_date: "",
      confirmed_date: "",
      estimated_amount: "",
      invoiced_amount: "",
      invoice_month: "",
      note: "",
      subcontractor: "",
      processing_hours: "",
      is_delivered: false,
      has_shipping_fee: false,
      is_amount_confirmed: false,
      is_invoiced: false,
    });
    setIsFormOpen(true);
  };

  const handleEditOrder = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOrder(order);
    form.reset({
      order_id: order.order_id,
      order_date: order.order_date || "",
      client_name: order.client_name || "",
      manager: order.manager || "",
      client_order_no: order.client_order_no || "",
      project_title: order.project_title || "",
      due_date: order.due_date || "",
      delivery_date: order.delivery_date || "",
      confirmed_date: order.confirmed_date || "",
      estimated_amount: order.estimated_amount?.toString() || "",
      invoiced_amount: order.invoiced_amount?.toString() || "",
      invoice_month: order.invoice_month || "",
      note: order.note || "",
      subcontractor: order.subcontractor || "",
      processing_hours: order.processing_hours?.toString() || "",
      is_delivered: !!order.is_delivered,
      has_shipping_fee: !!order.has_shipping_fee,
      is_amount_confirmed: !!order.is_amount_confirmed,
      is_invoiced: !!order.is_invoiced,
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = (values: OrderFormValues) => {
    // Convert form values to API format
    // Note: Empty strings are sent as empty strings (not null) to satisfy backend validation
    const orderData: Partial<Order> = {
      order_id: values.order_id || undefined,
      order_date: values.order_date || "",
      client_name: values.client_name,
      manager: values.manager || "",
      client_order_no: values.client_order_no || "",
      project_title: values.project_title,
      due_date: values.due_date,
      delivery_date: values.delivery_date || "",
      confirmed_date: values.confirmed_date || "",
      estimated_amount: values.estimated_amount ? parseFloat(values.estimated_amount) : null,
      invoiced_amount: values.invoiced_amount ? parseFloat(values.invoiced_amount) : null,
      invoice_month: values.invoice_month || "",
      note: values.note || "",
      subcontractor: values.subcontractor || "",
      processing_hours: values.processing_hours ? parseFloat(values.processing_hours) : null,
      is_delivered: values.is_delivered === true,
      has_shipping_fee: values.has_shipping_fee === true,
      is_amount_confirmed: values.is_amount_confirmed === true,
      is_invoiced: values.is_invoiced === true,
    };

    if (editingOrder) {
      // Update existing order
      updateOrderMutation.mutate({ orderId: editingOrder.order_id, data: orderData });
    } else {
      // Create new order
      createOrderMutation.mutate(orderData);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat("ja-JP", {
      style: "currency", 
      currency: "JPY",
    }).format(amount);
  };

  // ========== LOADING STATE ==========
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ========== ERROR STATE ==========
  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive p-6">
          <h2 className="text-lg font-semibold text-destructive mb-2">エラーが発生しました</h2>
          <p className="text-muted-foreground mb-4">受注データの読み込みに失敗しました</p>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            再試行
          </Button>
        </Card>
      </div>
    );
  }

  // ========== MAIN UI ==========
  return (
    <TooltipProvider>
      <div className="p-6 space-y-6" data-testid="page-projects">
        {/* Page Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            受注管理
          </h1>
          <p className="text-muted-foreground">
            受注登録と案件の管理
          </p>
        </div>
        <Button 
          onClick={handleCreateOrder}
          data-testid="button-new-order"
        >
          <Plus className="h-4 w-4 mr-2" />
          受注登録
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="受注番号・客先名・件名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[100px]">受注番号</TableHead>
              <TableHead>受注日</TableHead>
              <TableHead>客先名</TableHead>
              <TableHead>担当者</TableHead>
              <TableHead>件名</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('due_date')}
                  className="hover-elevate -ml-3 h-8"
                  data-testid="button-sort-due-date"
                >
                  納期
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('invoiced_amount')}
                  className="hover-elevate -ml-3 h-8"
                  data-testid="button-sort-invoiced-amount"
                >
                  請求金額
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>請求月</TableHead>
              <TableHead className="text-center">ステータス</TableHead>
              <TableHead className="text-right w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="h-8 w-8 mb-2" />
                    <p>該当する受注がありません</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedOrders.map((order) => (
                <TableRow 
                  key={order.order_id}
                  onClick={() => handleRowClick(order.order_id)}
                  className={`cursor-pointer hover-elevate ${order.order_id === newlyCreatedOrderId ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                  data-testid={`row-order-${order.order_id}`}
                >
                  {/* Order ID */}
                  <TableCell className="font-medium" data-testid={`cell-order-id-${order.order_id}`}>
                    #{order.order_id}
                  </TableCell>

                  {/* Order Date */}
                  <TableCell data-testid={`cell-order-date-${order.order_id}`}>
                    {formatDate(order.order_date)}
                  </TableCell>

                  {/* Client Name */}
                  <TableCell data-testid={`cell-client-name-${order.order_id}`}>
                    {order.client_name || '-'}
                  </TableCell>

                  {/* Manager */}
                  <TableCell data-testid={`cell-manager-${order.order_id}`}>
                    {order.manager || '-'}
                  </TableCell>

                  {/* Project Title */}
                  <TableCell data-testid={`cell-project-title-${order.order_id}`}>
                    {order.project_title || '-'}
                  </TableCell>

                  {/* Due Date */}
                  <TableCell data-testid={`cell-due-date-${order.order_id}`}>
                    {formatDate(order.due_date)}
                  </TableCell>

                  {/* Invoiced Amount */}
                  <TableCell className="text-right font-medium" data-testid={`cell-invoiced-amount-${order.order_id}`}>
                    {formatCurrency(order.invoiced_amount)}
                  </TableCell>

                  {/* Invoice Month */}
                  <TableCell data-testid={`cell-invoice-month-${order.order_id}`}>
                    {order.invoice_month || '-'}
                  </TableCell>

                  {/* Status Icon Cluster */}
                  <TableCell data-testid={`cell-status-${order.order_id}`}>
                    <StatusIconCluster
                      is_delivered={order.is_delivered}
                      has_shipping_fee={order.has_shipping_fee}
                      is_amount_confirmed={order.is_amount_confirmed}
                      is_invoiced={order.is_invoiced}
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleEditOrder(order, e)}
                        data-testid={`button-edit-${order.order_id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(order.order_id, e)}
                        data-testid={`button-delete-${order.order_id}`}
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
      </Card>

      {/* Pagination Controls */}
      {ordersResponse?.meta && ordersResponse.meta.total > 0 && (
        <div className="flex items-center justify-between px-2 py-4">
          {/* Left: Showing X-Y of Z items */}
          <div className="text-sm text-muted-foreground">
            {(() => {
              const { total, page: currentPage, page_size } = ordersResponse.meta;
              const startItem = (currentPage - 1) * page_size + 1;
              const endItem = Math.min(currentPage * page_size, total);
              return `全${total}件中 ${startItem}-${endItem}件を表示`;
            })()}
          </div>

          {/* Right: Page navigation */}
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              ページ {ordersResponse.meta.page} / {ordersResponse.meta.total_pages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(ordersResponse.meta.page - 1)}
                disabled={ordersResponse.meta.page === 1}
                data-testid="button-previous-page"
              >
                <ChevronLeft className="h-4 w-4" />
                前へ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(ordersResponse.meta.page + 1)}
                disabled={ordersResponse.meta.page >= ordersResponse.meta.total_pages}
                data-testid="button-next-page"
              >
                次へ
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deletingOrderId !== null} onOpenChange={(open) => !open && setDeletingOrderId(null)}>
          <AlertDialogContent data-testid="dialog-delete-confirm">
            <AlertDialogHeader>
              <AlertDialogTitle>受注を削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                この操作は取り消せません。受注に関連するすべてのデータが削除されます。
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

        {/* Create/Edit Order Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-order-form">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">
                {editingOrder ? "受注編集" : "受注登録"}
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                {/* Section 1: Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">基本情報</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="order_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>受注番号</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="空欄で自動採番" 
                              data-testid="input-order-id"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="order_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>受注日</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="date" 
                              data-testid="input-order-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="client_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>客先名 <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="客先名を入力" 
                              data-testid="input-client-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="manager"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>担当者</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="担当者名を入力" 
                              data-testid="input-manager"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="client_order_no"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>客先注番</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="客先注文番号を入力" 
                              data-testid="input-client-order-no"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="project_title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>件名 <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="案件の件名を入力" 
                              data-testid="input-project-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Section 2: Schedule */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">スケジュール</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>納期 <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="date" 
                              data-testid="input-due-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="delivery_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>納品日</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="date" 
                              data-testid="input-delivery-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmed_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>確定日</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="date" 
                              data-testid="input-confirmed-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Section 3: Amount Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">金額情報</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="estimated_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>見積金額</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              placeholder="0" 
                              data-testid="input-estimated-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="invoiced_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>請求金額</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              placeholder="0" 
                              data-testid="input-invoiced-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="invoice_month"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>請求月</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="month" 
                              data-testid="input-invoice-month"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Section 4: Management Memo & Status */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">管理メモ・ステータス</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subcontractor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>外注/自社</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="外注先または自社を入力" 
                              data-testid="input-subcontractor"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="processing_hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>加工時間（時間）</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              step="0.1"
                              placeholder="0" 
                              data-testid="input-processing-hours"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="note"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>備考</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="備考を入力"
                              className="min-h-[80px]"
                              data-testid="input-note"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Status Checkboxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <FormField
                      control={form.control}
                      name="is_delivered"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-is-delivered"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">納品完了 (*)</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="has_shipping_fee"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-has-shipping-fee"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">送料 (#)</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_amount_confirmed"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-is-amount-confirmed"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">金額確定 (-)</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_invoiced"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-is-invoiced"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">請求済 (+)</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsFormOpen(false)}
                    data-testid="button-cancel-form"
                  >
                    キャンセル
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createOrderMutation.isPending || updateOrderMutation.isPending}
                    data-testid="button-submit-form"
                  >
                    {editingOrder ? "更新" : "登録"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
