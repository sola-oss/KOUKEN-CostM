import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, AlertTriangle, TrendingUp, TrendingDown, Loader2, Settings, Clock, ArrowUpDown, ArrowUp, ArrowDown, Users, List, Search, X } from "lucide-react";
import { FACTORY_LABELS } from "@/shared/api";

const factoryColors: Record<string, string> = {
  laser:     'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100',
  factory1:  'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100',
  factory2:  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
  machine:   'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  outsource: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};
const factoryRowColors: Record<string, string> = {
  laser:     'bg-violet-50 dark:bg-violet-950/30',
  factory1:  'bg-sky-50 dark:bg-sky-950/30',
  factory2:  'bg-emerald-50 dark:bg-emerald-950/30',
  machine:   'bg-amber-50 dark:bg-amber-950/30',
  outsource: 'bg-gray-50 dark:bg-gray-900/30',
};
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CostAggregationResponse, OrderCostSummary } from "@shared/production-schema";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface CustomerGroup {
  client_name: string;
  orders: OrderCostSummary[];
}

function OrderRow({ 
  order, 
  formatCurrency, 
  formatPercent 
}: { 
  order: OrderCostSummary;
  formatCurrency: (value: number | null) => string;
  formatPercent: (value: number | null) => string;
}) {
  const rowColorClass = order.factory ? (factoryRowColors[order.factory] ?? '') : '';

  return (
    <>
      <TableRow 
        key={order.order_id} 
        data-testid={`row-order-${order.order_id}`}
        className={rowColorClass}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <span>{order.order_id}</span>
            {order.factory && (
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${factoryColors[order.factory] || 'bg-gray-100 text-gray-600'}`}>
                {FACTORY_LABELS[order.factory] || order.factory}
              </span>
            )}
            {order.has_missing_prices && (
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                単価未設定
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>{order.project_title || "-"}</TableCell>
        <TableCell>{order.client_name || "-"}</TableCell>
        <TableCell className="text-right">{formatCurrency(order.material_cost)}</TableCell>
        <TableCell className="text-right">{formatCurrency(order.purchased_cost)}</TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <span>{formatCurrency(order.labor_cost)}</span>
            {order.labor_source === 'actual' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Clock className="h-3 w-3 text-green-600" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>実績時間: {order.labor_hours}h</p>
                    <p className="text-xs text-muted-foreground">作業者別単価で計算</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right">{formatCurrency(order.outsourcing_cost)}</TableCell>
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
            <Badge className={order.profit_rate >= 0 ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
              {formatPercent(order.profit_rate)}
            </Badge>
          ) : "-"}
        </TableCell>
      </TableRow>
    </>
  );
}


type SortKey = 'order_id' | 'client_name' | 'estimated_amount' | 'profit';
type SortDir = 'asc' | 'desc' | null;
type ViewMode = 'order' | 'customer';

function SortIcon({ sortKey, currentKey, currentDir }: { sortKey: SortKey; currentKey: SortKey | null; currentDir: SortDir }) {
  if (currentKey !== sortKey || currentDir === null) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
  if (currentDir === 'asc') return <ArrowUp className="h-3 w-3 ml-1" />;
  return <ArrowDown className="h-3 w-3 ml-1" />;
}

export default function CostSummaryPage() {
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [laborRate, setLaborRate] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('order');
  const [keyword, setKeyword] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedFactory, setSelectedFactory] = useState('__ALL__');
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);

  const hasActiveFilter = keyword.trim() !== '' || selectedCustomers.length > 0 || selectedFactory !== '__ALL__';

  const resetFilters = () => {
    setKeyword('');
    setSelectedCustomers([]);
    setSelectedFactory('__ALL__');
  };

  const toggleCustomer = (name: string) => {
    setSelectedCustomers(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir(null);
    }
  };

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

  const sortedOrders = (() => {
    const orders = data?.orders ?? [];
    if (!sortKey || !sortDir) return orders;
    return [...orders].sort((a, b) => {
      let aVal: string | number | null;
      let bVal: string | number | null;
      if (sortKey === 'order_id') {
        aVal = String(a.order_id ?? '');
        bVal = String(b.order_id ?? '');
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else if (sortKey === 'client_name') {
        aVal = a.client_name ?? '';
        bVal = b.client_name ?? '';
        return sortDir === 'asc' ? (aVal as string).localeCompare(bVal as string) : (bVal as string).localeCompare(aVal as string);
      } else if (sortKey === 'estimated_amount') {
        aVal = a.estimated_amount ?? 0;
        bVal = b.estimated_amount ?? 0;
      } else {
        aVal = a.profit ?? 0;
        bVal = b.profit ?? 0;
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  })();

  const customerNames = useMemo(() => {
    const names = new Set<string>();
    for (const o of data?.orders ?? []) {
      if (o.client_name) names.add(o.client_name);
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'ja'));
  }, [data?.orders]);

  const filteredOrders = useMemo(() => {
    let orders = sortedOrders;
    const kw = keyword.trim().toLowerCase();
    if (kw) {
      orders = orders.filter(o =>
        (o.order_id ?? '').toLowerCase().includes(kw) ||
        (o.project_title ?? '').toLowerCase().includes(kw) ||
        (o.client_name ?? '').toLowerCase().includes(kw)
      );
    }
    if (selectedCustomers.length > 0) {
      orders = orders.filter(o => selectedCustomers.includes(o.client_name ?? ''));
    }
    if (selectedFactory !== '__ALL__') {
      orders = orders.filter(o => (o.factory ?? '') === selectedFactory);
    }
    return orders;
  }, [sortedOrders, keyword, selectedCustomers, selectedFactory]);

  const customerGroups = useMemo<CustomerGroup[]>(() => {
    const map = new Map<string, CustomerGroup>();
    for (const order of filteredOrders) {
      const key = order.client_name || '（未設定）';
      if (!map.has(key)) map.set(key, { client_name: key, orders: [] });
      map.get(key)!.orders.push(order);
    }
    return [...map.values()].sort((a, b) =>
      a.client_name.localeCompare(b.client_name, 'ja')
    );
  }, [filteredOrders]);

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

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">購入品合計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-purchased-cost">
              {formatCurrency(data?.total_purchased_cost || 0)}
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
              計算式: 作業時間 × 作業者単価
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-green-600" />
                日報実績から計算
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">外注費合計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-outsourcing-cost">
              {formatCurrency(data?.total_outsourcing_cost || 0)}
            </div>
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
            <p className="text-xs text-muted-foreground mt-1">材料費 + 購入品 + 労務費 + 外注費</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">受注数</CardTitle>
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>
              {viewMode === 'order' ? '受注別原価集計' : '顧客別原価集計'}
            </CardTitle>
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'order' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('order')}
                data-testid="tab-order-view"
              >
                <List className="h-4 w-4 mr-1.5" />
                受注別
              </Button>
              <Button
                variant={viewMode === 'customer' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('customer')}
                data-testid="tab-customer-view"
              >
                <Users className="h-4 w-4 mr-1.5" />
                顧客別
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="受注番号・受注名・顧客名で検索"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-8"
                data-testid="filter-keyword"
              />
            </div>
            <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-44 justify-between font-normal"
                  data-testid="filter-customer"
                >
                  <span className="truncate">
                    {selectedCustomers.length === 0
                      ? '全顧客'
                      : `${selectedCustomers.length}社選択中`}
                  </span>
                  <Users className="h-4 w-4 ml-2 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder="顧客名で検索..." />
                  <CommandList className="max-h-60">
                    <CommandEmpty>該当する顧客がありません</CommandEmpty>
                    {customerNames.map(name => (
                      <CommandItem
                        key={name}
                        value={name}
                        onSelect={() => toggleCustomer(name)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedCustomers.includes(name)}
                          onCheckedChange={() => toggleCustomer(name)}
                          onClick={e => e.stopPropagation()}
                        />
                        <span className="truncate">{name}</span>
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Select value={selectedFactory} onValueChange={setSelectedFactory}>
              <SelectTrigger className="w-40" data-testid="filter-factory">
                <SelectValue placeholder="全工場" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">全工場</SelectItem>
                {Object.entries(FACTORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="filter-reset">
                <X className="h-4 w-4 mr-1" />
                リセット
              </Button>
            )}
            <span className="ml-auto text-sm text-muted-foreground whitespace-nowrap">
              {hasActiveFilter
                ? `${(data?.orders ?? []).length}件中 ${filteredOrders.length}件表示`
                : `${filteredOrders.length}件`}
            </span>
          </div>

          {viewMode === 'order' ? (
            filteredOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground transition-colors"
                        onClick={() => handleSort('order_id')}
                        data-testid="sort-order-id"
                      >
                        受注番号
                        <SortIcon sortKey="order_id" currentKey={sortKey} currentDir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead>受注名</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground transition-colors"
                        onClick={() => handleSort('client_name')}
                        data-testid="sort-client-name"
                      >
                        顧客
                        <SortIcon sortKey="client_name" currentKey={sortKey} currentDir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">材料費</TableHead>
                    <TableHead className="text-right">購入品</TableHead>
                    <TableHead className="text-right">労務費</TableHead>
                    <TableHead className="text-right">外注費</TableHead>
                    <TableHead className="text-right">総原価</TableHead>
                    <TableHead className="text-right">
                      <button
                        className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                        onClick={() => handleSort('estimated_amount')}
                        data-testid="sort-estimated-amount"
                      >
                        見積金額
                        <SortIcon sortKey="estimated_amount" currentKey={sortKey} currentDir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                        onClick={() => handleSort('profit')}
                        data-testid="sort-profit"
                      >
                        利益
                        <SortIcon sortKey="profit" currentKey={sortKey} currentDir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">利益率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <OrderRow 
                      key={order.order_id}
                      order={order}
                      formatCurrency={formatCurrency}
                      formatPercent={formatPercent}
                    />
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-muted-foreground text-center py-12">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                {hasActiveFilter ? (
                  <>
                    <p>条件に一致する受注はありません</p>
                    <p className="text-sm mt-2">フィルター条件を変更するか、リセットしてください</p>
                  </>
                ) : (
                  <>
                    <p>原価データがありません</p>
                    <p className="text-sm mt-2">材料使用実績や作業実績を入力すると、ここに原価集計が表示されます</p>
                  </>
                )}
              </div>
            )
          ) : (
            customerGroups.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>受注番号</TableHead>
                    <TableHead>受注名</TableHead>
                    <TableHead className="text-right">材料費</TableHead>
                    <TableHead className="text-right">購入品</TableHead>
                    <TableHead className="text-right">労務費</TableHead>
                    <TableHead className="text-right">外注費</TableHead>
                    <TableHead className="text-right">総原価</TableHead>
                    <TableHead className="text-right">見積金額</TableHead>
                    <TableHead className="text-right">利益</TableHead>
                    <TableHead className="text-right">利益率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerGroups.map((group) => (
                    <React.Fragment key={group.client_name}>
                      <TableRow className="bg-muted/60 border-t-2">
                        <TableCell colSpan={10} className="py-2 font-semibold text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{group.client_name}</span>
                            <Badge variant="secondary" className="font-normal">{group.orders.length}件</Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                      {group.orders.map((order) => (
                        <TableRow
                          key={order.order_id}
                          data-testid={`row-order-${order.order_id}`}
                          className={order.factory ? (factoryRowColors[order.factory] ?? '') : ''}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{order.order_id}</span>
                              {order.factory && (
                                <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${factoryColors[order.factory] || 'bg-gray-100 text-gray-600'}`}>
                                  {FACTORY_LABELS[order.factory] || order.factory}
                                </span>
                              )}
                              {order.has_missing_prices && (
                                <Badge variant="outline" className="text-amber-600 border-amber-600">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  単価未設定
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{order.project_title || "-"}</TableCell>
                          <TableCell className="text-right">{formatCurrency(order.material_cost)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(order.purchased_cost)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span>{formatCurrency(order.labor_cost)}</span>
                              {order.labor_source === 'actual' && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Clock className="h-3 w-3 text-green-600" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>実績時間: {order.labor_hours}h</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(order.outsourcing_cost)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(order.total_cost)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(order.estimated_amount)}</TableCell>
                          <TableCell className="text-right">
                            {order.profit !== null ? (
                              <span className={order.profit >= 0 ? "text-green-600" : "text-red-600"}>
                                {order.profit >= 0 ? <TrendingUp className="h-4 w-4 inline mr-1" /> : <TrendingDown className="h-4 w-4 inline mr-1" />}
                                {formatCurrency(order.profit)}
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {order.profit_rate !== null ? (
                              <Badge className={order.profit_rate >= 0 ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                                {formatPercent(order.profit_rate)}
                              </Badge>
                            ) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-muted-foreground text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>原価データがありません</p>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
