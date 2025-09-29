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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus, Package, DollarSign, Calendar, Users } from "lucide-react";
import { listOrders, createOrder, type Order, type OrderPayload } from "@/shared/production-api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form validation schema with type coercion
const orderFormSchema = z.object({
  product_name: z.string().min(1, "製品名は必須です").max(100, "製品名は100文字以内で入力してください"),
  qty: z.coerce.number().min(1, "数量は1以上である必要があります").max(10000, "数量は10000以下である必要があります"),
  due_date: z.string().min(1, "納期は必須です"),
  sales: z.coerce.number().min(0, "売上は0以上である必要があります").max(100000000, "売上は1億円以下である必要があります"),
  estimated_material_cost: z.coerce.number().min(0, "見込み材料費は0以上である必要があります").max(10000000, "見込み材料費は1000万円以下である必要があります"),
  std_time_per_unit: z.coerce.number().min(0, "標準作業時間は0以上である必要があります").max(1000, "標準作業時間は1000時間以下である必要があります"),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  customer_name: z.string().optional()
});

type OrderFormData = z.infer<typeof orderFormSchema>;

export default function Orders() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: ordersResponse, isLoading, error } = useQuery({
    queryKey: ['orders', page],
    queryFn: () => listOrders({ page, page_size: 20 }),
  });

  const orders = ordersResponse?.data || [];

  // Form setup
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      product_name: "",
      qty: 1,
      due_date: "",
      sales: 0,
      estimated_material_cost: 0,
      std_time_per_unit: 0,
      status: 'pending' as const,
      customer_name: ""
    }
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: (data: OrderPayload) => createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "成功",
        description: "新規受注が正常に作成されました",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "エラー",
        description: error.message || "受注の作成に失敗しました",
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
    <div className="p-6 space-y-6" data-testid="page-orders">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            受注管理
          </h1>
          <p className="text-muted-foreground">
            製品受注の管理と進捗追跡
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-order">
              <Plus className="mr-2 h-4 w-4" />
              新規受注
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新規受注作成</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="product_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>製品名 <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="例: 精密部品A" 
                            {...field}
                            data-testid="input-product-name"
                          />
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  
                  <FormField
                    control={form.control}
                    name="sales"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>売上 (円) <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="100000" 
                            {...field}
                            data-testid="input-sales"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="estimated_material_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>見込み材料費 (円)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="50000" 
                            {...field}
                            data-testid="input-estimated-material-cost"
                          />
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
                        <FormLabel>標準作業時間 (時間/個)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="2.5" 
                            {...field}
                            data-testid="input-std-time"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ステータス <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <select 
                            {...field}
                            className="w-full p-2 border border-input rounded-md bg-background"
                            data-testid="select-status"
                          >
                            <option value="pending">未着手</option>
                            <option value="in_progress">進行中</option>
                            <option value="completed">完了</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="customer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>顧客名</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="株式会社〇〇" 
                            {...field}
                            data-testid="input-customer-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel-order"
                  >
                    キャンセル
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createOrderMutation.isPending}
                    data-testid="button-submit-order"
                  >
                    {createOrderMutation.isPending ? "作成中..." : "受注作成"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

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
            <h3 className="text-lg font-semibold mb-2">受注がありません</h3>
            <p className="text-muted-foreground mb-4">新規受注を追加して始めましょう</p>
            <Button data-testid="button-add-first-order">
              <Plus className="mr-2 h-4 w-4" />
              最初の受注を追加
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}