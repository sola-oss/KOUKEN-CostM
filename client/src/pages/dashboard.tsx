// Production Management System - Dashboard Page
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Package, Clock, AlertTriangle, TrendingUp, 
  Truck, FileText, Users, ArrowRight,
  Activity, Calendar
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Dashboard data type
interface DashboardMetrics {
  pendingOrders: number;
  inProgressProduction: number;
  pendingTimeApprovals: number;
  delayedOrders: number;
  todayShipments: number;
  monthRevenue: number;
}

export default function Dashboard() {
  const { data: metrics, isLoading, error } = useQuery<DashboardMetrics>({
    queryKey: ['/api/dashboard'],
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
            <CardTitle className="text-destructive">エラーが発生しました</CardTitle>
            <CardDescription>ダッシュボードデータの読み込みに失敗しました</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          ダッシュボード
        </h1>
        <p className="text-muted-foreground">
          生産管理システムの概要と重要指標
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        
        {/* Pending Orders */}
        <Card data-testid="card-pending-orders">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未確定受注</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.pendingOrders || 0}件</div>
            <p className="text-xs text-muted-foreground">
              確認待ちの受注
            </p>
            {metrics && metrics.pendingOrders > 10 && (
              <Badge variant="secondary" className="mt-2">要対応</Badge>
            )}
          </CardContent>
        </Card>

        {/* Production In Progress */}
        <Card data-testid="card-production-progress">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">進行中製番</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.inProgressProduction || 0}件</div>
            <p className="text-xs text-muted-foreground">
              製造中の製番数
            </p>
            <Progress value={65} className="mt-2 h-2" />
          </CardContent>
        </Card>

        {/* Time Approvals */}
        <Card data-testid="card-time-approvals">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">承認待ち工数</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics?.pendingTimeApprovals || 0}件
            </div>
            <p className="text-xs text-muted-foreground">
              承認が必要な工数入力
            </p>
            {metrics && metrics.pendingTimeApprovals > 500 && (
              <Badge variant="destructive" className="mt-2">至急確認</Badge>
            )}
          </CardContent>
        </Card>

        {/* Delayed Orders */}
        <Card data-testid="card-delayed-orders">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">遅延アラート</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {metrics?.delayedOrders || 0}件
            </div>
            <p className="text-xs text-muted-foreground">
              納期遅延の可能性
            </p>
            {metrics && metrics.delayedOrders > 0 && (
              <Button variant="destructive" size="sm" className="mt-2 h-7">
                <ArrowRight className="h-3 w-3 mr-1" />
                詳細確認
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Today's Shipments */}
        <Card data-testid="card-today-shipments">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本日出荷</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.todayShipments || 0}件</div>
            <p className="text-xs text-muted-foreground">
              本日の出荷予定数
            </p>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card data-testid="card-month-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月売上</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{((metrics?.monthRevenue || 0) / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground">
              今月の売上高
            </p>
            <div className="flex items-center mt-2 text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              前月比 +12.5%
            </div>
          </CardContent>
        </Card>

        {/* Production Efficiency */}
        <Card data-testid="card-production-efficiency">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">生産効率</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87.5%</div>
            <p className="text-xs text-muted-foreground">
              稼働率
            </p>
            <Progress value={87.5} className="mt-2 h-2" />
          </CardContent>
        </Card>

        {/* Capacity Utilization */}
        <Card data-testid="card-capacity">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">能力使用率</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground">
              今週の能力使用率
            </p>
            <Progress value={78} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>クイックアクション</CardTitle>
          <CardDescription>よく使う機能への素早いアクセス</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" data-testid="button-new-order">
            <FileText className="h-4 w-4 mr-2" />
            新規受注
          </Button>
          <Button variant="outline" size="sm" data-testid="button-time-entry">
            <Clock className="h-4 w-4 mr-2" />
            工数入力
          </Button>
          <Button variant="outline" size="sm" data-testid="button-production-plan">
            <Package className="h-4 w-4 mr-2" />
            製番計画
          </Button>
          <Button variant="outline" size="sm" data-testid="button-shipment">
            <Truck className="h-4 w-4 mr-2" />
            出荷処理
          </Button>
          <Button variant="outline" size="sm" data-testid="button-approve-time">
            <Users className="h-4 w-4 mr-2" />
            工数承認
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>最近の活動</CardTitle>
          <CardDescription>システム内の最新の更新情報</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-blue-100 p-2">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">受注 SO20240123 が確認されました</p>
                <p className="text-xs text-muted-foreground">5分前</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-green-100 p-2">
                <Package className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">製番 PO20240456 が完了しました</p>
                <p className="text-xs text-muted-foreground">1時間前</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-orange-100 p-2">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">50件の工数が承認待ちです</p>
                <p className="text-xs text-muted-foreground">2時間前</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-purple-100 p-2">
                <Truck className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">出荷 SH20240789 が完了しました</p>
                <p className="text-xs text-muted-foreground">3時間前</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}