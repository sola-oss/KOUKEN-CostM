// Production Management MVP - Material Summary (案件・工区別 集計)
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Package, Weight } from "lucide-react";

interface Order {
  id: number;
  order_id: string;
  project_title: string | null;
  client_name: string | null;
}

interface SummaryItem {
  project_id: string;
  zone: string | null;
  material_type: string;
  total_quantity: number;
  total_weight: number;
}

const ZONES = ["N工区", "S工区"] as const;

export default function MaterialSummary() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedZone, setSelectedZone] = useState<string>("");

  // Fetch orders for project selection
  const { data: ordersResponse } = useQuery({
    queryKey: ['/api/production/orders'],
    queryFn: async () => {
      const res = await fetch('/api/production/orders?page_size=200');
      return res.json();
    }
  });

  // Fetch summary data
  const { data: summaryResponse, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['/api/material-usages/summary', selectedProjectId, selectedZone],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedProjectId) params.append('project_id', selectedProjectId);
      if (selectedZone) params.append('zone', selectedZone);
      params.append('group_by_material_type', 'true');
      const res = await fetch(`/api/material-usages/summary?${params.toString()}`);
      return res.json();
    }
  });

  const orders: Order[] = ordersResponse?.data || [];
  const summaryData: SummaryItem[] = summaryResponse?.data || [];

  // Group summary data by project and zone for display
  const groupedData = useMemo(() => {
    const byProject: Record<string, {
      project_id: string;
      zones: Record<string, {
        zone: string | null;
        materials: SummaryItem[];
        totalWeight: number;
        totalQuantity: number;
      }>;
      totalWeight: number;
      totalQuantity: number;
    }> = {};

    summaryData.forEach(item => {
      if (!byProject[item.project_id]) {
        byProject[item.project_id] = {
          project_id: item.project_id,
          zones: {},
          totalWeight: 0,
          totalQuantity: 0
        };
      }
      
      const zoneKey = item.zone || '__none__';
      if (!byProject[item.project_id].zones[zoneKey]) {
        byProject[item.project_id].zones[zoneKey] = {
          zone: item.zone,
          materials: [],
          totalWeight: 0,
          totalQuantity: 0
        };
      }
      
      // Ensure numeric values (SQLite may return strings)
      const weight = Number(item.total_weight) || 0;
      const quantity = Number(item.total_quantity) || 0;
      
      byProject[item.project_id].zones[zoneKey].materials.push(item);
      byProject[item.project_id].zones[zoneKey].totalWeight += weight;
      byProject[item.project_id].zones[zoneKey].totalQuantity += quantity;
      byProject[item.project_id].totalWeight += weight;
      byProject[item.project_id].totalQuantity += quantity;
    });

    return Object.values(byProject);
  }, [summaryData]);

  // Grand totals
  const grandTotals = useMemo(() => {
    return summaryData.reduce(
      (acc, item) => ({
        quantity: acc.quantity + (Number(item.total_quantity) || 0),
        weight: acc.weight + (Number(item.total_weight) || 0)
      }),
      { quantity: 0, weight: 0 }
    );
  }, [summaryData]);

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">案件・工区別 集計</h1>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            絞り込み条件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">案件</label>
              <Select 
                value={selectedProjectId || "__all__"} 
                onValueChange={(v) => setSelectedProjectId(v === "__all__" ? "" : v)}
              >
                <SelectTrigger data-testid="select-project">
                  <SelectValue placeholder="すべての案件" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">すべての案件</SelectItem>
                  {orders.map((order) => (
                    <SelectItem key={order.order_id} value={order.order_id}>
                      {order.order_id} - {order.project_title || order.client_name || '(名称なし)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">工区</label>
              <Select 
                value={selectedZone || "__all__"} 
                onValueChange={(v) => setSelectedZone(v === "__all__" ? "" : v)}
              >
                <SelectTrigger data-testid="select-zone">
                  <SelectValue placeholder="すべての工区" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">すべての工区</SelectItem>
                  {ZONES.map((zone) => (
                    <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="h-4 w-4" />
              <span className="text-sm">総数量</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-total-quantity">
              {grandTotals.quantity.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Weight className="h-4 w-4" />
              <span className="text-sm">総重量</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-total-weight">
              {grandTotals.weight.toFixed(1)} kg
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">材料種別 集計</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingSummary ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : groupedData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              集計データがありません
            </div>
          ) : (
            <div className="space-y-6">
              {groupedData.map((projectGroup) => (
                <div key={projectGroup.project_id} className="border rounded-lg overflow-hidden">
                  {/* Project Header */}
                  <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{projectGroup.project_id}</Badge>
                    </div>
                    <div className="text-sm font-medium">
                      合計: {projectGroup.totalWeight.toFixed(1)} kg
                    </div>
                  </div>
                  
                  {/* Zones */}
                  {Object.values(projectGroup.zones).map((zoneGroup, idx) => (
                    <div key={zoneGroup.zone || 'none'} className={idx > 0 ? 'border-t' : ''}>
                      {/* Zone Header */}
                      <div className="px-4 py-2 bg-muted/20 flex items-center justify-between">
                        <Badge variant="outline">
                          {zoneGroup.zone || '工区未設定'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          小計: {zoneGroup.totalWeight.toFixed(1)} kg
                        </span>
                      </div>
                      
                      {/* Materials Table */}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>材料種別</TableHead>
                            <TableHead className="text-right">数量</TableHead>
                            <TableHead className="text-right">重量 (kg)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {zoneGroup.materials.map((item, i) => (
                            <TableRow key={i} data-testid={`row-summary-${projectGroup.project_id}-${item.material_type}`}>
                              <TableCell className="font-medium">{item.material_type}</TableCell>
                              <TableCell className="text-right">{item.total_quantity}</TableCell>
                              <TableCell className="text-right font-medium">
                                {(item.total_weight || 0).toFixed(1)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
