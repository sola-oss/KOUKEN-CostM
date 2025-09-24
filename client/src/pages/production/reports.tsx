// Production Management MVP - Reports & Export
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, FileSpreadsheet, BarChart3, Calendar, 
  TrendingUp, Package, ShoppingCart, Clock
} from "lucide-react";
import { exportCSV, getDashboardKPI } from "@/shared/production-api";

export default function Reports() {
  const { toast } = useToast();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reportType, setReportType] = useState<'orders' | 'procurements' | 'workers_log'>('orders');
  const [isExporting, setIsExporting] = useState(false);

  // Get dashboard KPI for report preview
  const { data: kpi, isLoading } = useQuery({
    queryKey: ['dashboard-kpi', fromDate, toDate],
    queryFn: () => getDashboardKPI({ 
      from: fromDate || undefined, 
      to: toDate || undefined 
    }),
  });

  const handleCSVExport = async () => {
    if (!fromDate || !toDate) {
      toast({
        title: "日付を選択してください",
        description: "開始日と終了日を設定してください",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const blob = await exportCSV({
        from: fromDate,
        to: toDate,
        type: reportType,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${reportType}_${fromDate}_${toDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "エクスポート完了",
        description: "CSVファイルのダウンロードが完了しました",
      });
    } catch (error) {
      toast({
        title: "エクスポートに失敗しました",
        description: "しばらくしてから再試行してください",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

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
    <div className="p-6 space-y-6" data-testid="page-reports">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          レポート
        </h1>
        <p className="text-muted-foreground">
          データ分析とCSVエクスポート機能
        </p>
      </div>

      {/* Export Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            データエクスポート
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="from-date">開始日</Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                data-testid="input-from-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-date">終了日</Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                data-testid="input-to-date"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="report-type">エクスポートタイプ</Label>
            <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
              <SelectTrigger data-testid="select-report-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orders">受注データ</SelectItem>
                <SelectItem value="procurements">調達データ</SelectItem>
                <SelectItem value="workers_log">工数データ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={handleCSVExport} 
            disabled={isExporting}
            className="w-full md:w-auto"
            data-testid="button-export-csv"
          >
            {isExporting ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                エクスポート中...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                CSVエクスポート
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Report Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            レポートプレビュー
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Orders Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    受注件数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-preview-orders">
                    {kpi?.total_orders || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    期間内の総受注数
                  </p>
                </CardContent>
              </Card>

              {/* Sales Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    売上合計
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-preview-sales">
                    {formatCurrency(kpi?.total_sales || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    期間内の売上実績
                  </p>
                </CardContent>
              </Card>

              {/* Procurement Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    調達件数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-preview-procurements">
                    {kpi?.total_procurements || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    期間内の調達実績
                  </p>
                </CardContent>
              </Card>

              {/* Profit Margin */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    利益率
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-preview-profit">
                    {formatPercentage(kpi?.profit_margin || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    期間内の利益率
                  </p>
                </CardContent>
              </Card>

              {/* Cost Breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">材料費</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-preview-material-cost">
                    {formatCurrency(kpi?.total_material_cost || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    期間内の材料費合計
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">人件費</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-preview-labor-cost">
                    {formatCurrency(kpi?.total_labor_cost || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    期間内の人件費合計
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">作業効率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-preview-efficiency">
                    {formatPercentage(kpi?.efficiency_rate || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    標準時間対実績時間
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">完了率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-preview-completion">
                    {formatPercentage(kpi?.orders_completion_rate || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    受注の完了率
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>レポート使用方法</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                受注データ
              </h4>
              <p className="text-sm text-muted-foreground">
                受注の詳細情報、売上、納期、材料費などをエクスポートします。
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                調達データ
              </h4>
              <p className="text-sm text-muted-foreground">
                購入・製造の詳細、業者情報、コスト、進捗状況をエクスポートします。
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                工数データ
              </h4>
              <p className="text-sm text-muted-foreground">
                作業者の工数実績、効率性、コスト分析データをエクスポートします。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}