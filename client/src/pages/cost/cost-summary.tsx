import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, AlertTriangle, TrendingUp, TrendingDown, Loader2, Settings } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CostAggregationResponse } from "@shared/production-schema";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function CostSummaryPage() {
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [laborRate, setLaborRate] = useState<string>("");

  const { data, isLoading, error } = useQuery<CostAggregationResponse>({
    queryKey: ['/api/cost-aggregation'],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newLaborRate: number) => {
      return apiRequest('PUT', '/api/cost-settings', { labor_rate_per_hour: newLaborRate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cost-aggregation'] });
      toast({
        title: "設定を更新しました",
        description: "労務単価を更新しました",
      });
      setSettingsOpen(false);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "設定の更新に失敗しました",
        variant: "destructive",
      });
    }
  });

  const handleSaveSettings = () => {
    const rate = parseFloat(laborRate);
    if (isNaN(rate) || rate <= 0) {
      toast({
        title: "入力エラー",
        description: "労務単価は0より大きい数値を入力してください",
        variant: "destructive",
      });
      return;
    }
    updateSettingsMutation.mutate(rate);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return "-";
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-destructive">データの取得に失敗しました</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">原価集計</h1>
        </div>
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLaborRate(String(data?.labor_rate_per_hour || 3000))}
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4 mr-2" />
              設定
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>原価設定</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="labor-rate">労務単価（円/時間）</Label>
                <Input
                  id="labor-rate"
                  type="number"
                  value={laborRate}
                  onChange={(e) => setLaborRate(e.target.value)}
                  placeholder="3000"
                  data-testid="input-labor-rate"
                />
              </div>
              <Button 
                onClick={handleSaveSettings} 
                disabled={updateSettingsMutation.isPending}
                className="w-full"
                data-testid="button-save-settings"
              >
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                保存
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">材料費合計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-material-cost">
              {formatCurrency(data?.total_material_cost || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">労務費合計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-labor-cost">
              {formatCurrency(data?.total_labor_cost || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              単価: {formatCurrency(data?.labor_rate_per_hour || 3000)}/時間
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">総原価</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary" data-testid="text-total-cost">
              {formatCurrency(data?.total_cost || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">案件数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-order-count">
              {data?.orders.length || 0}件
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>案件別原価集計</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.orders && data.orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>受注番号</TableHead>
                  <TableHead>案件名</TableHead>
                  <TableHead>顧客</TableHead>
                  <TableHead className="text-right">材料費</TableHead>
                  <TableHead className="text-right">労務費</TableHead>
                  <TableHead className="text-right">総原価</TableHead>
                  <TableHead className="text-right">見積金額</TableHead>
                  <TableHead className="text-right">利益</TableHead>
                  <TableHead className="text-right">利益率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.orders.map((order) => (
                  <TableRow key={order.order_id} data-testid={`row-order-${order.order_id}`}>
                    <TableCell className="font-medium">
                      {order.order_id}
                      {order.has_missing_prices && (
                        <Badge variant="outline" className="ml-2 text-amber-600 border-amber-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          単価未設定
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{order.project_title || "-"}</TableCell>
                    <TableCell>{order.client_name || "-"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.material_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.labor_cost)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(order.total_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.estimated_amount)}</TableCell>
                    <TableCell className="text-right">
                      {order.profit !== null ? (
                        <span className={order.profit >= 0 ? "text-green-600" : "text-red-600"}>
                          {order.profit >= 0 ? (
                            <TrendingUp className="h-4 w-4 inline mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 inline mr-1" />
                          )}
                          {formatCurrency(order.profit)}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.profit_rate !== null ? (
                        <Badge variant={order.profit_rate >= 0 ? "default" : "destructive"}>
                          {formatPercent(order.profit_rate)}
                        </Badge>
                      ) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-muted-foreground text-center py-12">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>原価データがありません</p>
              <p className="text-sm mt-2">
                材料使用実績や作業実績を入力すると、ここに原価集計が表示されます
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
