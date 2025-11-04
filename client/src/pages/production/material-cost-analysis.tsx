import { useQuery } from '@tanstack/react-query';
import { getMaterialCostAnalysis, type MaterialCostAnalysis } from '@/shared/production-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MaterialCostAnalysisPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/production/material-costs'],
    queryFn: getMaterialCostAnalysis,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getVarianceBadge = (variance_pct: number) => {
    if (Math.abs(variance_pct) < 5) {
      return <Badge variant="secondary" data-testid={`badge-variance-ok`}>許容範囲</Badge>;
    } else if (variance_pct > 0) {
      return <Badge variant="destructive" data-testid={`badge-variance-over`}>超過</Badge>;
    } else {
      return <Badge variant="default" data-testid={`badge-variance-under`}>削減</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      pending: { label: '未着手', variant: 'secondary' },
      in_progress: { label: '進行中', variant: 'default' },
      completed: { label: '完了', variant: 'outline' },
    };
    const config = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive" data-testid="alert-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            データの取得に失敗しました。ページを再読み込みしてください。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const analysisData = data?.data || [];
  
  // サマリー計算
  const totalEstimated = analysisData.reduce((sum, item) => sum + item.estimated_material_cost, 0);
  const totalActual = analysisData.reduce((sum, item) => sum + item.actual_material_cost, 0);
  const totalVariance = totalActual - totalEstimated;
  const totalVariancePct = totalEstimated > 0 ? (totalVariance / totalEstimated) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="heading-title">材料費分析</h1>
        <p className="text-muted-foreground" data-testid="text-description">
          案件ごとの見込み材料費と実際の購買費用を比較します
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>見込み材料費合計</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-estimated">
                {formatCurrency(totalEstimated)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>実際の購買費用合計</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-actual">
                {formatCurrency(totalActual)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>差異</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="flex items-center gap-2">
                {totalVariance > 0 ? (
                  <TrendingUp className="h-5 w-5 text-destructive" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-primary" />
                )}
                <div className={`text-2xl font-bold ${totalVariance > 0 ? 'text-destructive' : 'text-primary'}`} data-testid="text-total-variance">
                  {formatCurrency(Math.abs(totalVariance))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>差異率</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className={`text-2xl font-bold ${totalVariancePct > 0 ? 'text-destructive' : 'text-primary'}`} data-testid="text-total-variance-pct">
                {formatPercentage(totalVariancePct)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* データテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>案件別材料費詳細</CardTitle>
          <CardDescription>全{analysisData.length}件の案件</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20" data-testid="header-order-id">案件ID</TableHead>
                  <TableHead data-testid="header-product">製品名</TableHead>
                  <TableHead data-testid="header-customer">顧客</TableHead>
                  <TableHead className="text-right" data-testid="header-estimated">見込み材料費</TableHead>
                  <TableHead className="text-right" data-testid="header-actual">実際の購買費用</TableHead>
                  <TableHead className="text-right" data-testid="header-variance">差異</TableHead>
                  <TableHead className="text-right" data-testid="header-variance-pct">差異率</TableHead>
                  <TableHead className="text-center" data-testid="header-purchase-count">購買件数</TableHead>
                  <TableHead className="text-center" data-testid="header-status">ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysisData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground" data-testid="text-no-data">
                      データがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  analysisData.map((item: MaterialCostAnalysis) => (
                    <TableRow key={item.order_id} data-testid={`row-order-${item.order_id}`}>
                      <TableCell className="font-medium" data-testid={`cell-order-id-${item.order_id}`}>
                        #{item.order_id}
                      </TableCell>
                      <TableCell data-testid={`cell-product-${item.order_id}`}>
                        {item.product_name}
                      </TableCell>
                      <TableCell data-testid={`cell-customer-${item.order_id}`}>
                        {item.customer_name || '-'}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-estimated-${item.order_id}`}>
                        {formatCurrency(item.estimated_material_cost)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-actual-${item.order_id}`}>
                        {formatCurrency(item.actual_material_cost)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-variance-${item.order_id}`}>
                        <div className="flex items-center justify-end gap-1">
                          {item.variance > 0 ? (
                            <TrendingUp className="h-4 w-4 text-destructive" />
                          ) : item.variance < 0 ? (
                            <TrendingDown className="h-4 w-4 text-primary" />
                          ) : null}
                          <span className={item.variance > 0 ? 'text-destructive' : item.variance < 0 ? 'text-primary' : ''}>
                            {formatCurrency(item.variance)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-variance-pct-${item.order_id}`}>
                        <div className="flex items-center justify-end gap-2">
                          <span className={item.variance_pct > 0 ? 'text-destructive' : item.variance_pct < 0 ? 'text-primary' : ''}>
                            {formatPercentage(item.variance_pct)}
                          </span>
                          {getVarianceBadge(item.variance_pct)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center" data-testid={`cell-purchase-count-${item.order_id}`}>
                        {item.purchase_count}件
                      </TableCell>
                      <TableCell className="text-center" data-testid={`cell-status-${item.order_id}`}>
                        {getStatusBadge(item.status)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
