// Production Management MVP - Orders Management
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Package, DollarSign, Calendar, Users } from "lucide-react";
import { listOrders, type Order } from "@/shared/production-api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Orders() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);

  const { data: ordersResponse, isLoading, error } = useQuery({
    queryKey: ['orders', page],
    queryFn: () => listOrders({ page, page_size: 20 }),
  });

  const orders = ordersResponse?.data || [];

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
        <Button data-testid="button-add-order">
          <Plus className="mr-2 h-4 w-4" />
          新規受注
        </Button>
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
                <Badge variant="outline" className="bg-blue-50">
                  進行中
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {order.product_name}
              </p>
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
                  <p className="text-xs text-muted-foreground">材料単価</p>
                  <p className="font-medium">{formatCurrency(order.material_unit_cost)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">時給</p>
                  <p className="font-medium">{formatCurrency(order.wage_rate)}</p>
                </div>
              </div>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">標準作業時間</p>
                <p className="font-medium">{order.std_time_per_unit}時間/単位</p>
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