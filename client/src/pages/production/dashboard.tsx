// Production Management MVP - Dashboard
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardKPI, type DashboardKPI } from "@/shared/production-api";
import { 
  Package, TrendingUp, Clock, DollarSign, 
  Users, Calendar, CheckCircle, AlertTriangle,
  BarChart3, Activity
} from "lucide-react";

export default function Dashboard() {
  const { data: kpi, isLoading, error } = useQuery({
    queryKey: ['dashboard-kpi'],
    queryFn: () => getDashboardKPI(),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
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
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              エラーが発生しました
            </CardTitle>
            <CardDescription>ダッシュボードデータの読み込みに失敗しました</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="mt-2"
              data-testid="button-retry"
            >
              再試行
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-dashboard">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          ダッシュボード
        </h1>
        <p className="text-muted-foreground">
          生産管理ミニMVPの概要と重要指標
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Total Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総受注数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-orders">
              -
            </div>
            <p className="text-xs text-muted-foreground">
              情報なし
            </p>
          </CardContent>
        </Card>

        {/* Total Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総売上</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-sales">
              {formatCurrency(kpi?.total_sales ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              今月の売上実績
            </p>
          </CardContent>
        </Card>

        {/* Total Procurements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総調達数</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-procurements">
              -
            </div>
            <p className="text-xs text-muted-foreground">
              情報なし
            </p>
          </CardContent>
        </Card>

        {/* Material Cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">材料費</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-material-cost">
              {formatCurrency(kpi?.total_gross_profit ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              今月の材料費合計
            </p>
          </CardContent>
        </Card>

        {/* Labor Cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">人件費</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-labor-cost">
              {formatCurrency((kpi?.total_sales ?? 0) - (kpi?.total_gross_profit ?? 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              今月の人件費合計
            </p>
          </CardContent>
        </Card>

        {/* Profit Margin */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">利益率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-profit-margin">
              {formatPercentage((kpi?.total_gross_profit ?? 0) / Math.max(kpi?.total_sales ?? 1, 1))}
            </div>
            <p className="text-xs text-muted-foreground">
              {((kpi?.total_gross_profit ?? 0) / Math.max(kpi?.total_sales ?? 1, 1)) > 0.2 ? '良好' : '要改善'}
            </p>
          </CardContent>
        </Card>

        {/* Efficiency Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">作業効率</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-efficiency-rate">
              {Math.abs(kpi?.avg_variance_pct ?? 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              標準時間に対する実績
            </p>
          </CardContent>
        </Card>

        {/* Orders Completion Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">受注完了率</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-orders-completion">
              {(((kpi?.purchase_completion_rate ?? 0) + (kpi?.manufacture_completion_rate ?? 0)) / 2).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              受注の完了状況
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">クイックアクション</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              className="w-full justify-start" 
              variant="ghost"
              data-testid="button-quick-order"
            >
              <Package className="mr-2 h-4 w-4" />
              新規受注
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="ghost"
              data-testid="button-quick-workhour"
            >
              <Clock className="mr-2 h-4 w-4" />
              工数入力
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="ghost"
              data-testid="button-quick-procurement"
            >
              <Calendar className="mr-2 h-4 w-4" />
              調達管理
            </Button>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">今日の予定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50">
                納期
              </Badge>
              <span className="text-sm">2件の受注完了予定</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50">
                入荷
              </Badge>
              <span className="text-sm">3件の材料入荷予定</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-yellow-50">
                作業
              </Badge>
              <span className="text-sm">5時間の製造作業</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">アラート</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">納期遅延リスク: 1件</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm">在庫不足: 2品目</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">その他問題なし</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">最近の活動</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground">
              • 10:30 新規受注が登録されました
            </div>
            <div className="text-sm text-muted-foreground">
              • 09:45 工数が入力されました  
            </div>
            <div className="text-sm text-muted-foreground">
              • 09:15 材料入荷が完了しました
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}