// Production Management MVP - Work Hours Management
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Clock, User, Package, Calendar } from "lucide-react";
import { listWorkerLogs, type WorkerLog } from "@/shared/production-api";

export default function WorkHours() {
  const [page, setPage] = useState(1);

  const { data: logsResponse, isLoading, error } = useQuery({
    queryKey: ['worker-logs', page],
    queryFn: () => listWorkerLogs({ page, page_size: 20 }),
  });

  const logs = logsResponse?.data || [];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short", 
      day: "numeric"
    });
  };

  const calculateTotalTime = (log: WorkerLog) => {
    return (log.qty * log.act_time_per_unit).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
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
          </CardHeader>
          <CardContent>
            <p>工数データの読み込みに失敗しました</p>
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
    <div className="p-6 space-y-6" data-testid="page-work-hours">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            工数管理
          </h1>
          <p className="text-muted-foreground">
            作業者の工数入力と実績管理
          </p>
        </div>
        <Button data-testid="button-add-work-log">
          <Plus className="mr-2 h-4 w-4" />
          工数入力
        </Button>
      </div>

      {/* Work Logs List */}
      <div className="space-y-4">
        {logs.map((log) => (
          <Card key={log.id} className="hover-elevate" data-testid={`card-work-log-${log.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {log.worker}
                </CardTitle>
                <Badge variant="outline" className="bg-green-50">
                  完了
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(log.date)}
                </div>
                {log.order_id && (
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    受注 #{log.order_id}
                  </div>
                )}
                {log.procurement_id && (
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    調達 #{log.procurement_id}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">作業数量</p>
                  <p className="text-lg font-semibold">{log.qty}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">単位時間</p>
                  <p className="text-lg font-semibold">{log.act_time_per_unit}h</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">合計時間</p>
                  <p className="text-lg font-semibold flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {calculateTotalTime(log)}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {logs.length === 0 && (
        <Card className="border-dashed border-2 border-muted">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">工数データがありません</h3>
            <p className="text-muted-foreground mb-4">作業工数を入力して始めましょう</p>
            <Button data-testid="button-add-first-work-log">
              <Plus className="mr-2 h-4 w-4" />
              最初の工数を入力
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}