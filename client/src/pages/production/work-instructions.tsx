// Production Management MVP - Procurement Management  
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ShoppingCart, Factory, Calendar, Package, Truck } from "lucide-react";
import { listProcurements, type Procurement } from "@/shared/production-api";

export default function Procurement() {
  const [page, setPage] = useState(1);

  const { data: procurementsResponse, isLoading, error } = useQuery({
    queryKey: ['procurements', page],
    queryFn: () => listProcurements({ page, page_size: 20 }),
  });

  const procurements = procurementsResponse?.data || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ja-JP");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-gray-50';
      case 'ordered': return 'bg-blue-50'; 
      case 'received': return 'bg-yellow-50';
      case 'completed': return 'bg-green-50';
      default: return 'bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planned': return '計画';
      case 'ordered': return '発注済';
      case 'received': return '入荷済';
      case 'completed': return '完了';
      default: return status;
    }
  };

  const purchaseItems = procurements.filter(p => p.kind === 'purchase');
  const manufactureItems = procurements.filter(p => p.kind === 'manufacture');

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
            <p>調達データの読み込みに失敗しました</p>
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {procurement.kind === 'purchase' ? (
              <ShoppingCart className="h-5 w-5" />
            ) : (
              <Factory className="h-5 w-5" />
            )}
            {procurement.item_name}
          </CardTitle>
          <Badge variant="outline" className={getStatusColor(procurement.status)}>
            {getStatusLabel(procurement.status)}
          </Badge>
        </div>
        {procurement.order_id && (
          <p className="text-sm text-muted-foreground">
            受注 #{procurement.order_id} 関連
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">数量: {procurement.qty}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {formatCurrency(procurement.unit_price * procurement.qty)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">予定日: {formatDate(procurement.eta)}</span>
        </div>
        {procurement.vendor && (
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">業者: {procurement.vendor}</span>
          </div>
        )}
        {procurement.worker && (
          <div className="flex items-center gap-2">
            <span className="text-sm">担当: {procurement.worker}</span>
          </div>
        )}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">単価</p>
          <p className="font-medium">{formatCurrency(procurement.unit_price)}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6" data-testid="page-work-instructions">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            作業指示
          </h1>
          <p className="text-muted-foreground">
            作業指示の管理と進捗
          </p>
        </div>
        <Button data-testid="button-add-work-instruction">
          <Plus className="mr-2 h-4 w-4" />
          新規作業指示
        </Button>
      </div>

      {/* Procurement Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">すべて ({procurements.length})</TabsTrigger>
          <TabsTrigger value="purchase">購入 ({purchaseItems.length})</TabsTrigger>
          <TabsTrigger value="manufacture">製造 ({manufactureItems.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {procurements.map((procurement) => (
              <ProcurementCard key={procurement.id} procurement={procurement} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="purchase" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {purchaseItems.map((procurement) => (
              <ProcurementCard key={procurement.id} procurement={procurement} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="manufacture" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {manufactureItems.map((procurement) => (
              <ProcurementCard key={procurement.id} procurement={procurement} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {procurements.length === 0 && (
        <Card className="border-dashed border-2 border-muted">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">調達データがありません</h3>
            <p className="text-muted-foreground mb-4">新規調達を追加して始めましょう</p>
            <Button data-testid="button-add-first-procurement">
              <Plus className="mr-2 h-4 w-4" />
              最初の調達を追加
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}