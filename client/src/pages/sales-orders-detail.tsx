import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Check, Calendar, User, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getSalesOrder, confirmSalesOrder, type SalesOrder } from "@/shared/api";

// Status colors and labels
const statusColors = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
  closed: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
};

const statusLabels = {
  draft: '下書き',
  confirmed: '確定済',
  closed: '完了'
};

export default function SalesOrderDetail() {
  const params = useParams();
  const orderId = params.id ? parseInt(params.id) : null;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sales order data
  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ['sales-order', orderId],
    queryFn: () => getSalesOrder(orderId!),
    enabled: !!orderId,
  });

  // Confirm mutation
  const confirmMutation = useMutation({
    mutationFn: confirmSalesOrder,
    onSuccess: (updatedOrder) => {
      toast({
        title: "受注を確定しました",
        description: `受注番号: ${updatedOrder.order_no}`,
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['sales-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      // Refetch to get updated data
      refetch();
    },
    onError: (error) => {
      let errorMessage = error.message;
      
      // Check for specific error codes
      if (error.message.includes('409')) {
        errorMessage = "すでに確定済みです";
      } else if (error.message.includes('400')) {
        errorMessage = "無効なリクエストです";
      } else if (error.message.includes('500')) {
        errorMessage = "サーバーエラーが発生しました";
      }
      
      toast({
        title: "エラーが発生しました",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Handle confirm order
  const handleConfirmOrder = () => {
    if (orderId) {
      confirmMutation.mutate(orderId);
    }
  };

  if (!orderId) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p>無効な受注IDです</p>
          </CardContent>
        </Card>
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
            <p>受注データの読み込みに失敗しました: {error.message}</p>
            <Button onClick={() => refetch()} className="mt-4">再試行</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/sales-orders')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            受注詳細
          </h1>
          <p className="text-muted-foreground">
            受注ID: {orderId}
          </p>
        </div>
        
        {/* Confirm Button - only show for draft status */}
        {order && order.status === 'draft' && (
          <Button
            onClick={handleConfirmOrder}
            disabled={confirmMutation.isPending}
            data-testid="button-confirm"
            className="bg-green-600 hover:bg-green-700"
          >
            {confirmMutation.isPending ? (
              "確定中..."
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                受注確認
              </>
            )}
          </Button>
        )}
      </div>

      {/* Order Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            受注情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            </div>
          ) : order ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Order Number */}
                <div className="space-y-2">
                  <Label>受注番号</Label>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm font-mono" data-testid="text-order-no">
                      {order.order_no || <span className="text-muted-foreground">未採番</span>}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label>ステータス</Label>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <Badge className={statusColors[order.status]} variant="secondary" data-testid="badge-status">
                      {statusLabels[order.status]}
                    </Badge>
                  </div>
                </div>

                {/* Customer Name */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    顧客名
                  </Label>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm" data-testid="text-customer-name">{order.customer_name}</p>
                  </div>
                </div>

                {/* Order Date */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    受注日
                  </Label>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm" data-testid="text-order-date">
                      {format(new Date(order.order_date), 'yyyy年MM月dd日')}
                    </p>
                  </div>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    納期
                  </Label>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm" data-testid="text-delivery-date">
                      {order.delivery_date 
                        ? format(new Date(order.delivery_date), 'yyyy年MM月dd日')
                        : <span className="text-muted-foreground">未設定</span>
                      }
                    </p>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    作成日時
                  </Label>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm" data-testid="text-created-at">
                      {format(new Date(order.created_at), 'yyyy年MM月dd日 HH:mm')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {order.notes && (
                <div className="space-y-2">
                  <Label>メモ</Label>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm whitespace-pre-wrap" data-testid="text-notes">{order.notes}</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Time Entries Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            関連工数
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>工数データの表示機能は実装予定です</p>
            <p className="text-sm">GET /api/time-entries?sales_order_id={orderId}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Label component (since it might not be imported)
function Label({ children, className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} {...props}>
      {children}
    </label>
  );
}