import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Package } from "lucide-react";
import { listProcurements, type Procurement } from "@/shared/production-api";

export default function WorkInstructions() {
  const [page, setPage] = useState(1);

  const { data: procurementsResponse, isLoading, error } = useQuery({
    queryKey: ['procurements', page],
    queryFn: () => listProcurements({ page, page_size: 20 }),
  });

  const procurements = procurementsResponse?.data || [];

  const formatCurrency = (amount: number | null) => {
    if (amount == null) return "-";
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ja-JP");
  };

  const getStatusVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case '発注中': return 'default';
      case '完了': return 'secondary';
      case 'キャンセル': return 'destructive';
      default: return 'outline';
    }
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
            <p>発注データの読み込みに失敗しました</p>
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

  const ProcurementCard = ({ procurement }: { procurement: Procurement }) => (
    <Card className="hover-elevate" data-testid={`card-procurement-${procurement.id}`}>
      <CardHeader>
        <div className="flex items-center justify-between gap-1">
          <CardTitle className="text-base">
            {procurement.description || `ID: ${procurement.id}`}
          </CardTitle>
          <Badge variant={getStatusVariant(procurement.status)}>
            {procurement.status || "-"}
          </Badge>
        </div>
        {procurement.order_id && (
          <p className="text-sm text-muted-foreground">
            受注 #{procurement.order_id}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">数量: {procurement.quantity ?? "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {formatCurrency(procurement.amount)}
            </span>
          </div>
        </div>
        {procurement.order_date && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">発注日: {formatDate(procurement.order_date)}</span>
          </div>
        )}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">単価</p>
          <p className="font-medium">{formatCurrency(procurement.unit_price)}</p>
        </div>
      </CardContent>
    </Card>
  );

  const meta = procurementsResponse?.meta;
  const totalPages = meta ? Math.ceil(meta.total / meta.page_size) : 1;

  return (
    <div className="p-6 space-y-6" data-testid="page-work-instructions">
      <div className="flex justify-between items-center flex-wrap gap-1">
        <div>
          <h1 className="text-2xl font-bold">発注一覧</h1>
          <p className="text-muted-foreground text-sm">{meta?.total ?? 0} 件</p>
        </div>
      </div>

      {procurements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            発注データがありません
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {procurements.map(proc => (
            <ProcurementCard key={proc.id} procurement={proc} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            前へ
          </Button>
          <span className="flex items-center text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            次へ
          </Button>
        </div>
      )}
    </div>
  );
}
