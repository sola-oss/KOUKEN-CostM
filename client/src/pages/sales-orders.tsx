import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import { 
  Search, 
  Filter, 
  Eye, 
  Plus, 
  Calendar,
  FileText,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { listSalesOrders, type SalesOrder } from "@/shared/api";

// Status colors and labels for the simplified sales order system
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

export default function SalesOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Fetch sales orders from API using our custom API client
  const { data: ordersResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['sales-orders', { 
      q: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined 
    }],
    queryFn: () => listSalesOrders({ 
      q: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined 
    }),
  });

  // Extract orders array from API response
  const orders = ordersResponse?.data || [];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            受注管理
          </h1>
          <p className="text-muted-foreground">
            受注の作成・確認・管理
          </p>
        </div>
        <Link href="/sales-orders/new">
          <Button data-testid="button-new-order">
            <Plus className="h-4 w-4 mr-2" />
            新規受注
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">検索・フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search by Customer Name */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="顧客名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-orders"
              />
            </div>

            {/* Date From */}
            <div>
              <Input
                type="date"
                placeholder="開始日"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                data-testid="input-date-from"
              />
            </div>

            {/* Date To */}
            <div>
              <Input
                type="date"
                placeholder="終了日"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                data-testid="input-date-to"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのステータス</SelectItem>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="confirmed">確定済</SelectItem>
                <SelectItem value="closed">完了</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setDateFrom("");
                setDateTo("");
              }}
              data-testid="button-clear-filters"
            >
              <Filter className="h-4 w-4 mr-2" />
              クリア
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-orders">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">総受注数</p>
                <p className="text-2xl font-bold">{ordersResponse?.meta.total || 0}件</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-draft-orders">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">下書き</p>
                <p className="text-2xl font-bold text-gray-600">
                  {orders.filter(o => o.status === 'draft').length}件
                </p>
              </div>
              <Clock className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-confirmed-orders">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">確定済</p>
                <p className="text-2xl font-bold text-green-600">
                  {orders.filter(o => o.status === 'confirmed').length}件
                </p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            受注一覧 ({orders.length}件)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>受注日</TableHead>
                  <TableHead>顧客名</TableHead>
                  <TableHead>受注番号</TableHead>
                  <TableHead>納期</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="w-20">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(order.order_date), 'yyyy/MM/dd')}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{order.customer_name}</TableCell>
                    <TableCell>
                      {order.so_no || <span className="text-muted-foreground">未採番</span>}
                    </TableCell>
                    <TableCell>
                      {order.due_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(order.due_date), 'yyyy/MM/dd')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">未設定</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status]} variant="secondary">
                        {statusLabels[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/sales-orders/${order.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-view-${order.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && orders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              条件に一致する受注が見つかりません
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}