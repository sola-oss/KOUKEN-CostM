import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Plus, 
  Calendar,
  FileText,
  Package,
  Clock,
  DollarSign,
  ChevronUp,
  ChevronDown
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

// Sales Order type based on backend schema
interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName?: string;
  orderDate: string;
  deliveryDate: string;
  status: 'pending' | 'confirmed' | 'in_production' | 'completed' | 'cancelled';
  totalAmount: number;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

// API Response wrapper
interface SalesOrdersResponse {
  data: SalesOrder[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_production: 'bg-orange-100 text-orange-800', 
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

const statusLabels = {
  pending: '未確定',
  confirmed: '確定済',
  in_production: '製造中',
  completed: '完了',
  cancelled: 'キャンセル'
};

const priorityLabels = {
  low: '低',
  medium: '中',
  high: '高'
};

export default function SalesOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [sortField, setSortField] = useState<keyof SalesOrder | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Fetch sales orders from API
  const { data: ordersResponse, isLoading, error } = useQuery<SalesOrdersResponse>({
    queryKey: ['/api/sales-orders'],
  });

  // Extract orders array from API response
  const orders = ordersResponse?.data || [];

  // Filter orders based on search and filters
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.description && order.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || order.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleViewOrder = (order: SalesOrder) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const handleSort = (field: keyof SalesOrder) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Apply sorting to filtered orders
  const sortedOrders = useMemo(() => {
    if (!sortField) return filteredOrders;

    return [...filteredOrders].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredOrders, sortField, sortDirection]);

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">エラーが発生しました</CardTitle>
          </CardHeader>
          <CardContent>
            <p>受注データの読み込みに失敗しました。</p>
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
            売上受注の管理と追跡
          </p>
        </div>
        <Button data-testid="button-new-order">
          <Plus className="h-4 w-4 mr-2" />
          新規受注
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">検索・フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="受注番号、顧客名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-orders"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのステータス</SelectItem>
                <SelectItem value="pending">未確定</SelectItem>
                <SelectItem value="confirmed">確定済</SelectItem>
                <SelectItem value="in_production">製造中</SelectItem>
                <SelectItem value="completed">完了</SelectItem>
                <SelectItem value="cancelled">キャンセル</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger data-testid="select-priority-filter">
                <SelectValue placeholder="優先度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての優先度</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setPriorityFilter("all");
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-orders">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">総受注数</p>
                <p className="text-2xl font-bold">{orders.length}件</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-orders">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">未確定受注</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {orders.filter(o => o.status === 'pending').length}件
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-in-production">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">製造中</p>
                <p className="text-2xl font-bold text-orange-600">
                  {orders.filter(o => o.status === 'in_production').length}件
                </p>
              </div>
              <Package className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-amount">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">総受注額</p>
                <p className="text-2xl font-bold">
                  ¥{(orders.reduce((sum, o) => sum + o.totalAmount, 0) / 1000000).toFixed(1)}M
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            受注一覧 ({sortedOrders.length}件)
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
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('orderNumber')}>
                    <div className="flex items-center gap-2">
                      受注番号
                      {sortField === 'orderNumber' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('customerName')}>
                    <div className="flex items-center gap-2">
                      顧客名
                      {sortField === 'customerName' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('orderDate')}>
                    <div className="flex items-center gap-2">
                      受注日
                      {sortField === 'orderDate' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('deliveryDate')}>
                    <div className="flex items-center gap-2">
                      納期
                      {sortField === 'deliveryDate' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-2">
                      ステータス
                      {sortField === 'status' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('priority')}>
                    <div className="flex items-center gap-2">
                      優先度
                      {sortField === 'priority' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50 text-right" onClick={() => handleSort('totalAmount')}>
                    <div className="flex items-center justify-end gap-2">
                      受注額
                      {sortField === 'totalAmount' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="w-20">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOrders.map((order) => (
                  <TableRow key={order.id} data-testid={`row-order-${order.orderNumber}`}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>{order.customerName || 'N/A'}</TableCell>
                    <TableCell>
                      {format(new Date(order.orderDate), 'yyyy/MM/dd')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(order.deliveryDate), 'yyyy/MM/dd')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status]} variant="secondary">
                        {statusLabels[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[order.priority]} variant="secondary">
                        {priorityLabels[order.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ¥{order.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewOrder(order)}
                          data-testid={`button-view-${order.orderNumber}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-edit-${order.orderNumber}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && sortedOrders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              条件に一致する受注が見つかりません
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>受注詳細</DialogTitle>
            <DialogDescription>
              受注 {selectedOrder?.orderNumber} の詳細情報
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">受注番号</label>
                  <p className="text-sm text-muted-foreground">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">顧客名</label>
                  <p className="text-sm text-muted-foreground">{selectedOrder.customerName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">受注日</label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedOrder.orderDate), 'yyyy年MM月dd日')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">納期</label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedOrder.deliveryDate), 'yyyy年MM月dd日')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">ステータス</label>
                  <Badge className={statusColors[selectedOrder.status]} variant="secondary">
                    {statusLabels[selectedOrder.status]}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">優先度</label>
                  <Badge className={priorityColors[selectedOrder.priority]} variant="secondary">
                    {priorityLabels[selectedOrder.priority]}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">受注額</label>
                  <p className="text-2xl font-bold">¥{selectedOrder.totalAmount.toLocaleString()}</p>
                </div>
                {selectedOrder.description && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium">説明</label>
                    <p className="text-sm text-muted-foreground">{selectedOrder.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}