// Production Management MVP - Orders Management
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Package, Search, Plus, ArrowUpDown, ArrowLeft } from "lucide-react";
import { listOrders, createOrder, type Order, type OrderPayload } from "@/shared/production-api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Form validation schema - simplified to match user requirements
const orderFormSchema = z.object({
  order_id: z.union([
    z.string().regex(/^\d+$/, "受注番号は数値で入力してください").transform(Number),
    z.literal("")
  ]).optional(),
  product_name: z.string().min(1, "案件名は必須です"),
  customer_name: z.string().optional(),
  qty: z.coerce.number().min(1, "数量は1以上である必要があります"),
  start_date: z.string().min(1, "開始予定日は必須です"),
  due_date: z.string().min(1, "納期は必須です"),
  std_time_per_unit: z.coerce.number().min(0, "標準工数は0以上である必要があります"),
  sales: z.coerce.number().min(0, "売上金額は0以上である必要があります"),
}).refine(data => new Date(data.start_date) <= new Date(data.due_date), {
  message: "開始予定日は納期以前である必要があります",
  path: ["due_date"]
});

type OrderFormData = z.infer<typeof orderFormSchema>;

type SortField = 'due_date' | 'sales' | 'status';
type SortOrder = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export default function Projects() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'due_date', order: 'asc' });
  const [newlyCreatedOrderId, setNewlyCreatedOrderId] = useState<number | null>(null);

  const { data: ordersResponse, isLoading, error } = useQuery({
    queryKey: ['orders', page],
    queryFn: () => listOrders({ page, page_size: 20 }),
  });

  const orders = ordersResponse?.data || [];

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = orders.filter(order => 
        order.product_name.toLowerCase().includes(query) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(query)) ||
        order.order_id.toString().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0;
      
      if (sortConfig.field === 'due_date') {
        compareValue = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      } else if (sortConfig.field === 'sales') {
        compareValue = a.sales - b.sales;
      } else if (sortConfig.field === 'status') {
        const statusOrder = { pending: 0, in_progress: 1, completed: 2 };
        compareValue = statusOrder[a.status] - statusOrder[b.status];
      }

      return sortConfig.order === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [orders, searchQuery, sortConfig]);

  // Clear highlight when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      setNewlyCreatedOrderId(null);
    }
  }, [searchQuery]);

  // Form setup
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      order_id: "",
      product_name: "",
      customer_name: "",
      qty: 1,
      start_date: "",
      due_date: "",
      std_time_per_unit: 0,
      sales: 0,
    }
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: (data: OrderFormData) => {
      // Add required fields with default values
      const payload: any = {
        product_name: data.product_name,
        qty: data.qty,
        start_date: data.start_date,
        due_date: data.due_date,
        std_time_per_unit: data.std_time_per_unit,
        sales: data.sales,
        estimated_material_cost: 0,
        status: 'pending',
        customer_name: data.customer_name || ''
      };
      // Include order_id only if it's provided (after transformation, it's a number or undefined)
      if (typeof data.order_id === 'number') {
        payload.order_id = data.order_id;
      }
      return createOrder(payload);
    },
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      form.reset();
      toast({
        title: "成功",
        description: "受注が正常に登録されました",
      });
      // Save newly created order ID for highlighting
      setNewlyCreatedOrderId(newOrder.order_id);
      // Return to list tab after successful registration
      setActiveTab("list");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "エラー",
        description: error.message || "受注の登録に失敗しました",
      });
    }
  });

  const onSubmit = (data: OrderFormData) => {
    createOrderMutation.mutate(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency", 
      currency: "JPY",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ja-JP");
  };

  const getStatusBadgeVariant = (status: string) => {
    if (status === 'completed') return 'default';
    if (status === 'in_progress') return 'secondary';
    return 'outline';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'pending') return '未着手';
    if (status === 'in_progress') return '進行中';
    return '完了';
  };

  const handleSort = (field: SortField) => {
    setNewlyCreatedOrderId(null); // Clear highlight on sort
    if (sortConfig.field === field) {
      setSortConfig({ field, order: sortConfig.order === 'asc' ? 'desc' : 'asc' });
    } else {
      setSortConfig({ field, order: 'asc' });
    }
  };

  const handleRowClick = (orderId: number) => {
    setNewlyCreatedOrderId(null); // Clear highlight on row click
    setLocation(`/project/${orderId}`);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">エラーが発生しました</CardTitle>
          </CardHeader>
          <CardContent>
            <p>受注データの読み込みに失敗しました</p>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="mt-4"
            >
              再試行
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-projects">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            案件管理
          </h1>
          <p className="text-muted-foreground">
            受注登録と案件の管理
          </p>
        </div>
        {activeTab === "list" && (
          <Button 
            onClick={() => {
              setNewlyCreatedOrderId(null); // Clear highlight when opening registration form
              setActiveTab("registration");
            }}
            data-testid="button-new-order"
          >
            <Plus className="h-4 w-4 mr-2" />
            受注登録
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="hidden">
          <TabsTrigger value="registration" data-testid="tab-registration">
            受注登録
          </TabsTrigger>
          <TabsTrigger value="list" data-testid="tab-list">
            案件一覧
          </TabsTrigger>
        </TabsList>

        {/* Registration Form Tab */}
        <TabsContent value="registration" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle>受注登録</CardTitle>
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab("list")}
                data-testid="button-back-to-list"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                案件一覧に戻る
              </Button>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* 受注番号 */}
                  <FormField
                    control={form.control}
                    name="order_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>受注番号</FormLabel>
                        <FormControl>
                          <Input 
                            type="text"
                            placeholder="空欄で自動採番" 
                            {...field}
                            data-testid="input-order-id"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 案件名 */}
                  <FormField
                    control={form.control}
                    name="product_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>案件名 <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="案件名を入力してください" 
                            {...field}
                            data-testid="input-project-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 顧客名 */}
                  <FormField
                    control={form.control}
                    name="customer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>顧客名</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="顧客名を入力してください" 
                            {...field}
                            data-testid="input-customer-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 数量 */}
                  <FormField
                    control={form.control}
                    name="qty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>数量 <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="1" 
                            {...field}
                            data-testid="input-qty"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 開始予定日 */}
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>開始予定日 <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            data-testid="input-start-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 納期 */}
                  <FormField
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>納期 <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            data-testid="input-due-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 標準工数 (h/個) */}
                  <FormField
                    control={form.control}
                    name="std_time_per_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>標準工数 (h/個) <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="0" 
                            {...field}
                            data-testid="input-std-time"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 売上金額（単価×数量） */}
                  <FormField
                    control={form.control}
                    name="sales"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>売上金額（単価×数量） <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field}
                            data-testid="input-sales"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => form.reset()}
                      data-testid="button-reset"
                    >
                      リセット
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createOrderMutation.isPending}
                      data-testid="button-submit-order"
                    >
                      {createOrderMutation.isPending ? "登録中..." : "登録"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project List Tab */}
        <TabsContent value="list" className="space-y-4 mt-6">
          {/* Search Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="案件名・顧客名・受注番号で検索..."
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
                  <TableHead>案件名</TableHead>
                  <TableHead>顧客名</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('sales')}
                      className="hover-elevate -ml-3 h-8"
                      data-testid="button-sort-sales"
                    >
                      売上金額
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
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
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('status')}
                      className="hover-elevate -ml-3 h-8"
                      data-testid="button-sort-status"
                    >
                      ステータス
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Package className="h-8 w-8 mb-2" />
                        <p>該当する案件がありません</p>
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
                      <TableCell className="font-medium" data-testid={`cell-order-id-${order.order_id}`}>
                        #{order.order_id}
                      </TableCell>
                      <TableCell data-testid={`cell-product-name-${order.order_id}`}>
                        {order.product_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`cell-customer-name-${order.order_id}`}>
                        {order.customer_name || '-'}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-qty-${order.order_id}`}>
                        {order.qty}
                      </TableCell>
                      <TableCell className="text-right font-medium" data-testid={`cell-sales-${order.order_id}`}>
                        {formatCurrency(order.sales)}
                      </TableCell>
                      <TableCell data-testid={`cell-due-date-${order.order_id}`}>
                        {formatDate(order.due_date)}
                      </TableCell>
                      <TableCell data-testid={`cell-status-${order.order_id}`}>
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
