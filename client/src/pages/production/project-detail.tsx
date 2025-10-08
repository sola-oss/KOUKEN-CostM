// Production Management MVP - Project Detail Page
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package, DollarSign, Calendar, Clock } from "lucide-react";

export default function ProjectDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const orderId = params.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      return response.json();
    },
    enabled: !!orderId,
  });

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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data?.order) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">エラーが発生しました</CardTitle>
          </CardHeader>
          <CardContent>
            <p>案件データの読み込みに失敗しました</p>
            <Button
              onClick={() => setLocation('/')}
              variant="outline"
              className="mt-4"
            >
              案件一覧に戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const order = data.order;

  return (
    <div className="p-6 space-y-6" data-testid="page-project-detail">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => setLocation('/')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          案件一覧に戻る
        </Button>
      </div>

      {/* Project Info */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-order-id">
              受注 #{order.order_id}
            </h1>
            <p className="text-xl text-muted-foreground mt-1" data-testid="text-product-name">
              {order.product_name}
            </p>
          </div>
          <Badge variant={getStatusBadgeVariant(order.status)} data-testid="badge-status">
            {getStatusLabel(order.status)}
          </Badge>
        </div>

        {/* Basic Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">数量</p>
                  <p className="text-lg font-medium" data-testid="text-qty">{order.qty}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">売上金額</p>
                  <p className="text-lg font-medium" data-testid="text-sales">
                    {formatCurrency(order.sales)}
                  </p>
                </div>
              </div>
              {order.customer_name && (
                <div>
                  <p className="text-sm text-muted-foreground">顧客名</p>
                  <p className="text-lg font-medium" data-testid="text-customer-name">
                    {order.customer_name}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">納期</p>
                  <p className="text-lg font-medium" data-testid="text-due-date">
                    {formatDate(order.due_date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">標準工数</p>
                  <p className="text-lg font-medium" data-testid="text-std-time">
                    {order.std_time_per_unit}時間/個
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">見込み材料費</p>
                <p className="text-lg font-medium" data-testid="text-material-cost">
                  {formatCurrency(order.estimated_material_cost)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Card */}
        {data.kpi && (
          <Card>
            <CardHeader>
              <CardTitle>原価・進捗情報</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">実績材料費</p>
                <p className="text-xl font-semibold" data-testid="text-actual-material">
                  {formatCurrency(data.kpi.actual_material_cost)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">実績人件費</p>
                <p className="text-xl font-semibold" data-testid="text-actual-labor">
                  {formatCurrency(data.kpi.actual_labor_cost)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">粗利</p>
                <p className="text-xl font-semibold" data-testid="text-gross-profit">
                  {formatCurrency(data.kpi.gross_profit)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
