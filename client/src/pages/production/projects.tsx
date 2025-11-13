// Production Management MVP - Orders Management (受注管理)
// Stage 1: Read-only order list with 19-field support
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Package, Search, Plus, ArrowUpDown, Edit, Trash2, Check } from "lucide-react";
import { listOrders, type Order } from "@/shared/production-api";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// ========== HELPER COMPONENTS ==========

/**
 * StatusIconCluster: Displays 4 boolean status flags as Check icons
 * - is_delivered (納品完了: *)
 * - has_shipping_fee (送料: #)
 * - is_amount_confirmed (金額確定: -)
 * - is_invoiced (請求済: +)
 * 
 * Visual: true=filled, false/null=muted outline
 * Semantics: null preserved internally to avoid accidental overwrites
 */
interface StatusIconClusterProps {
  is_delivered: boolean | null;
  has_shipping_fee: boolean | null;
  is_amount_confirmed: boolean | null;
  is_invoiced: boolean | null;
}

function StatusIconCluster({ is_delivered, has_shipping_fee, is_amount_confirmed, is_invoiced }: StatusIconClusterProps) {
  const iconClassName = (value: boolean | null) => 
    value === true 
      ? "h-4 w-4 fill-current text-green-600 dark:text-green-400" 
      : "h-4 w-4 text-muted-foreground/30";

  return (
    <div className="flex items-center gap-1.5" data-testid="status-icon-cluster">
      {/* 納品完了 (*) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Check className={iconClassName(is_delivered)} data-testid="icon-delivered" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>納品完了 (*)</p>
        </TooltipContent>
      </Tooltip>

      {/* 送料 (#) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Check className={iconClassName(has_shipping_fee)} data-testid="icon-shipping" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>送料 (#)</p>
        </TooltipContent>
      </Tooltip>

      {/* 金額確定 (-) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Check className={iconClassName(is_amount_confirmed)} data-testid="icon-amount-confirmed" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>金額確定 (-)</p>
        </TooltipContent>
      </Tooltip>

      {/* 請求済 (+) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Check className={iconClassName(is_invoiced)} data-testid="icon-invoiced" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>請求済 (+)</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// ========== MAIN COMPONENT ==========

type SortField = 'due_date' | 'invoiced_amount';
type SortOrder = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export default function Projects() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'due_date', order: 'asc' });
  const [newlyCreatedOrderId, setNewlyCreatedOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // Fetch orders
  const { data: ordersResponse, isLoading, error } = useQuery({
    queryKey: ['orders', page],
    queryFn: () => listOrders({ page, page_size: 20 }),
  });

  const orders = ordersResponse?.data || [];

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders;

    // Apply search filter (order_id, client_name, project_title)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = orders.filter(order => 
        order.order_id.toLowerCase().includes(query) ||
        (order.client_name && order.client_name.toLowerCase().includes(query)) ||
        (order.project_title && order.project_title.toLowerCase().includes(query))
      );
    }

    // Apply sorting with null-safe comparators (nulls always sort to bottom)
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0;
      
      // Determine null sentinel: +Infinity for asc, -Infinity for desc
      // This ensures nulls sink to bottom regardless of sort direction
      const nullSentinel = sortConfig.order === 'asc' ? Infinity : -Infinity;
      
      if (sortConfig.field === 'due_date') {
        const aDate = a.due_date ? new Date(a.due_date).getTime() : nullSentinel;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : nullSentinel;
        compareValue = aDate - bDate;
      } else if (sortConfig.field === 'invoiced_amount') {
        const aAmount = a.invoiced_amount ?? nullSentinel;
        const bAmount = b.invoiced_amount ?? nullSentinel;
        compareValue = aAmount - bAmount;
      }

      return sortConfig.order === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [orders, searchQuery, sortConfig]);

  // Clear highlight when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      setNewlyCreatedOrderId(null);
    }
  }, [searchQuery]);

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest('DELETE', `/api/orders/${orderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: "成功",
        description: "受注を削除しました",
      });
      setDeletingOrderId(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "エラー",
        description: error.message || "受注の削除に失敗しました",
      });
      setDeletingOrderId(null);
    }
  });

  const handleSort = (field: SortField) => {
    setNewlyCreatedOrderId(null);
    if (sortConfig.field === field) {
      setSortConfig({ field, order: sortConfig.order === 'asc' ? 'desc' : 'asc' });
    } else {
      setSortConfig({ field, order: 'asc' });
    }
  };

  const handleRowClick = (orderId: string) => {
    setNewlyCreatedOrderId(null);
    setLocation(`/project/${orderId}`);
  };

  const handleDelete = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingOrderId(orderId);
  };

  const confirmDelete = () => {
    if (deletingOrderId) {
      deleteOrderMutation.mutate(deletingOrderId);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat("ja-JP", {
      style: "currency", 
      currency: "JPY",
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString("ja-JP");
  };

  // ========== LOADING STATE ==========
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ========== ERROR STATE ==========
  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive p-6">
          <h2 className="text-lg font-semibold text-destructive mb-2">エラーが発生しました</h2>
          <p className="text-muted-foreground mb-4">受注データの読み込みに失敗しました</p>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            再試行
          </Button>
        </Card>
      </div>
    );
  }

  // ========== MAIN UI ==========
  return (
    <TooltipProvider>
      <div className="p-6 space-y-6" data-testid="page-projects">
        {/* Page Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            受注管理
          </h1>
          <p className="text-muted-foreground">
            受注登録と案件の管理
          </p>
        </div>
        <Button 
          onClick={() => toast({ title: "開発中", description: "受注登録フォームは次のステージで実装予定です" })}
          disabled
          data-testid="button-new-order"
        >
          <Plus className="h-4 w-4 mr-2" />
          受注登録
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="受注番号・客先名・件名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[100px]">受注番号</TableHead>
              <TableHead>客先名</TableHead>
              <TableHead>件名</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('due_date')}
                  className="hover-elevate -ml-3 h-8"
                  data-testid="button-sort-due-date"
                >
                  納期
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-center">ステータス</TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('invoiced_amount')}
                  className="hover-elevate -ml-3 h-8"
                  data-testid="button-sort-invoiced-amount"
                >
                  請求金額
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="h-8 w-8 mb-2" />
                    <p>該当する受注がありません</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedOrders.map((order) => (
                <TableRow 
                  key={order.order_id}
                  onClick={() => handleRowClick(order.order_id)}
                  className={`cursor-pointer hover-elevate ${order.order_id === newlyCreatedOrderId ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                  data-testid={`row-order-${order.order_id}`}
                >
                  {/* Order ID */}
                  <TableCell className="font-medium" data-testid={`cell-order-id-${order.order_id}`}>
                    #{order.order_id}
                  </TableCell>

                  {/* Client Name */}
                  <TableCell data-testid={`cell-client-name-${order.order_id}`}>
                    {order.client_name || '-'}
                  </TableCell>

                  {/* Project Title */}
                  <TableCell data-testid={`cell-project-title-${order.order_id}`}>
                    {order.project_title || '-'}
                  </TableCell>

                  {/* Due Date */}
                  <TableCell data-testid={`cell-due-date-${order.order_id}`}>
                    {formatDate(order.due_date)}
                  </TableCell>

                  {/* Status Icon Cluster */}
                  <TableCell className="text-center" data-testid={`cell-status-${order.order_id}`}>
                    <div className="flex items-center justify-center">
                      <StatusIconCluster
                        is_delivered={order.is_delivered}
                        has_shipping_fee={order.has_shipping_fee}
                        is_amount_confirmed={order.is_amount_confirmed}
                        is_invoiced={order.is_invoiced}
                      />
                    </div>
                  </TableCell>

                  {/* Invoiced Amount */}
                  <TableCell className="text-right font-medium" data-testid={`cell-invoiced-amount-${order.order_id}`}>
                    {formatCurrency(order.invoiced_amount)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled
                              data-testid={`button-edit-${order.order_id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Stage 2で実装予定</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(order.order_id, e)}
                        data-testid={`button-delete-${order.order_id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deletingOrderId !== null} onOpenChange={(open) => !open && setDeletingOrderId(null)}>
          <AlertDialogContent data-testid="dialog-delete-confirm">
            <AlertDialogHeader>
              <AlertDialogTitle>受注を削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                この操作は取り消せません。受注に関連するすべてのデータが削除されます。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                削除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
