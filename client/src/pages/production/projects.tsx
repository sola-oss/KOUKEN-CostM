// Production Management MVP - Orders Management
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Package, DollarSign, Calendar, Users } from "lucide-react";
import { listOrders, createOrder, type Order, type OrderPayload } from "@/shared/production-api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form validation schema - simplified to match user requirements
const orderFormSchema = z.object({
  order_id: z.union([
    z.string().regex(/^\d+$/, "受注番号は数値で入力してください").transform(Number),
    z.literal("")
  ]).optional(),
  product_name: z.string().min(1, "案件名は必須です"),
  qty: z.coerce.number().min(1, "数量は1以上である必要があります"),
  due_date: z.string().min(1, "納期は必須です"),
  std_time_per_unit: z.coerce.number().min(0, "標準工数は0以上である必要があります"),
  sales: z.coerce.number().min(0, "売上金額は0以上である必要があります"),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

export default function Projects() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("registration");

  const { data: ordersResponse, isLoading, error } = useQuery({
    queryKey: ['orders', page],
    queryFn: () => listOrders({ page, page_size: 20 }),
  });

  const orders = ordersResponse?.data || [];

  // Form setup
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      order_id: "",
      product_name: "",
      qty: 1,
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
        due_date: data.due_date,
        std_time_per_unit: data.std_time_per_unit,
        sales: data.sales,
        estimated_material_cost: 0,
        status: 'pending',
        customer_name: ''
      };
      // Include order_id only if it's provided
      if (data.order_id && data.order_id !== "") {
        payload.order_id = data.order_id;
      }
      return createOrder(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      form.reset();
      toast({
        title: "成功",
        description: "受注が正常に登録されました",
      });
      // Switch to list tab after successful registration
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          案件管理
        </h1>
        <p className="text-muted-foreground">
          受注登録と案件の管理
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
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
            <CardHeader>
              <CardTitle>受注登録</CardTitle>
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
          {/* Orders Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <Card key={order.order_id} className="hover-elevate" data-testid={`card-order-${order.order_id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      受注 #{order.order_id}
                    </CardTitle>
                    <Badge 
                      variant={order.status === 'completed' ? 'default' : order.status === 'in_progress' ? 'secondary' : 'outline'}
                      data-testid={`badge-status-${order.order_id}`}
                    >
                      {order.status === 'pending' ? '未着手' : order.status === 'in_progress' ? '進行中' : '完了'}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {order.product_name}
                    </p>
                    {order.customer_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {order.customer_name}
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">数量: {order.qty}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formatCurrency(order.sales)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">納期: {formatDate(order.due_date)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">見込み材料費</p>
                      <p className="font-medium" data-testid={`text-material-cost-${order.order_id}`}>
                        {formatCurrency(order.estimated_material_cost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">標準作業時間</p>
                      <p className="font-medium" data-testid={`text-std-time-${order.order_id}`}>
                        {order.std_time_per_unit}時間/個
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {orders.length === 0 && (
            <Card className="border-dashed border-2 border-muted">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">案件がありません</h3>
                <p className="text-muted-foreground mb-4">受注登録タブから新規案件を追加してください</p>
                <Button 
                  onClick={() => setActiveTab("registration")}
                  data-testid="button-go-to-registration"
                >
                  受注登録へ
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
