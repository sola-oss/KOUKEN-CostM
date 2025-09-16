import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle,
  Clock,
  User,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Type definitions
interface SimpleTimeEntry {
  id: number;
  employee_name: string;
  sales_order_id: number;
  start_at: string | null;
  end_at: string | null;
  minutes: number | null;
  note: string | null;
  status: 'draft' | 'approved';
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  order_no: string;
  customer_name: string;
}

interface SalesOrder {
  id: number;
  order_no: string;
  customer_name: string;
  status: string;
}

export default function TimeEntriesApprove() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [selectedEntries, setSelectedEntries] = useState<number[]>([]);
  const [approverName, setApproverName] = useState("");

  // Fetch pending time entries (draft status only)
  const { data: entriesResponse, isLoading, error } = useQuery<{ data: SimpleTimeEntry[]; meta: any }>({
    queryKey: [
      '/api/simple-time-entries',
      {
        status: 'draft',
        sales_order_id: orderFilter === 'all' ? undefined : Number(orderFilter),
        query: searchTerm || undefined,
        employee_name: employeeFilter === 'all' ? undefined : employeeFilter,
        page: 1,
        page_size: 50,
      },
    ],
    refetchInterval: 15000, // Refresh every 15 seconds for pending approvals
  });

  // Fetch sales orders for dropdown
  const { data: ordersResponse } = useQuery<{ data: SalesOrder[] }>({
    queryKey: ['/api/sales-orders'],
  });

  // Approve entries mutation
  const approveMutation = useMutation({
    mutationFn: async ({ ids, approver }: { ids: number[]; approver: string }) => {
      // Approve each entry individually
      const promises = ids.map(async id => {
        const response = await fetch(`/api/simple-time-entries/${id}/approve`, {
          method: 'PATCH',
          body: JSON.stringify({ approver }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error(`Failed to approve entry ${id}`);
        return response.json();
      });
      return Promise.all(promises);
    },
    onSuccess: (_, { ids }) => {
      toast({ 
        title: `${ids.length}件の工数を承認しました`, 
        description: `承認者: ${approverName}` 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/simple-time-entries'] });
      setSelectedEntries([]);
      setApproverName("");
    },
    onError: (error: any) => {
      toast({ 
        title: "承認処理でエラーが発生しました", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Extract entries array from API response
  const entries = entriesResponse?.data || [];
  const salesOrders = ordersResponse?.data || [];

  // Get unique employees from entries
  const uniqueEmployees = useMemo(() => {
    const employeeSet = new Set(entries.map(e => e.employee_name));
    const employees = Array.from(employeeSet);
    return employees.sort();
  }, [entries]);

  // Filter entries based on search and filters
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = 
        entry.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.note && entry.note.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesOrder = orderFilter === "all" || entry.sales_order_id.toString() === orderFilter;
      const matchesEmployee = employeeFilter === "all" || entry.employee_name === employeeFilter;
      
      return matchesSearch && matchesOrder && matchesEmployee && entry.status === 'draft';
    });
  }, [entries, searchTerm, orderFilter, employeeFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEntries(filteredEntries.map(e => e.id));
    } else {
      setSelectedEntries([]);
    }
  };

  const handleSelectEntry = (entryId: number, checked: boolean) => {
    if (checked) {
      setSelectedEntries(prev => [...prev, entryId]);
    } else {
      setSelectedEntries(prev => prev.filter(id => id !== entryId));
    }
  };

  const handleApprove = () => {
    if (selectedEntries.length === 0) {
      toast({ 
        title: "承認する工数を選択してください", 
        variant: "destructive" 
      });
      return;
    }

    if (!approverName.trim()) {
      toast({ 
        title: "承認者名を入力してください", 
        variant: "destructive" 
      });
      return;
    }

    approveMutation.mutate({ 
      ids: selectedEntries, 
      approver: approverName.trim() 
    });
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "MM/dd HH:mm");
  };

  const formatMinutes = (minutes: number | null) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins}分`;
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">データの読み込みに失敗しました</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">工数承認</h1>
          <p className="text-muted-foreground mt-1">承認待ちの工数記録を確認・承認します</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="従業員名、受注番号、顧客名で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-40" data-testid="select-employee-filter">
                  <SelectValue placeholder="従業員" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全従業員</SelectItem>
                  {uniqueEmployees.map((employee) => (
                    <SelectItem key={employee} value={employee}>
                      {employee}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={orderFilter} onValueChange={setOrderFilter}>
                <SelectTrigger className="w-60" data-testid="select-order-filter">
                  <SelectValue placeholder="受注フィルター" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全受注</SelectItem>
                  {salesOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id.toString()}>
                      {order.order_no} - {order.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setOrderFilter("all");
                  setEmployeeFilter("all");
                }}
                data-testid="button-clear-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                クリア
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">承認待ち</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-pending-entries">
              {filteredEntries.length}件
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">従業員数</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-employee-count">
              {uniqueEmployees.length}人
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">選択中</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-selected-count">
              {selectedEntries.length}件
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">承認対象工数</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-selected-hours">
              {Math.round(
                filteredEntries
                  .filter(e => selectedEntries.includes(e.id))
                  .reduce((sum, e) => sum + (e.minutes || 0), 0) / 60
              )}時間
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approval Actions */}
      {filteredEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>承認操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  placeholder="承認者名を入力"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  data-testid="input-approver-name"
                />
              </div>
              <Button
                onClick={handleApprove}
                disabled={selectedEntries.length === 0 || !approverName.trim() || approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-approve-selected"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {approveMutation.isPending ? "承認中..." : `選択した${selectedEntries.length}件を承認`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            承認待ち工数一覧 ({filteredEntries.length}件)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredEntries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedEntries.length === filteredEntries.length && filteredEntries.length > 0}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead>従業員名</TableHead>
                  <TableHead>受注番号</TableHead>
                  <TableHead>顧客名</TableHead>
                  <TableHead>開始時刻</TableHead>
                  <TableHead>終了時刻</TableHead>
                  <TableHead>工数</TableHead>
                  <TableHead>メモ</TableHead>
                  <TableHead>登録日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedEntries.includes(entry.id)}
                        onCheckedChange={(checked) => handleSelectEntry(entry.id, checked as boolean)}
                        data-testid={`checkbox-entry-${entry.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.employee_name}
                    </TableCell>
                    <TableCell>{entry.order_no}</TableCell>
                    <TableCell>{entry.customer_name}</TableCell>
                    <TableCell>{formatTime(entry.start_at)}</TableCell>
                    <TableCell>{formatTime(entry.end_at)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatMinutes(entry.minutes)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {entry.note || "-"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(entry.created_at), "MM/dd HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>承認待ちの工数記録はありません</p>
              <p className="text-sm">全ての工数が承認済みです</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}