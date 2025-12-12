// Production Management MVP - Material Summary (案件・工区別 集計)
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BarChart3 } from "lucide-react";

interface MaterialUsageSummary {
  project_id: string;
  zone: string | null;
  material_type: string | null;
  total_quantity: number;
  total_weight: number | null;
  record_count: number;
}

export default function MaterialSummary() {
  const [filterProjectId, setFilterProjectId] = useState<string>("");
  const [groupByMaterialType, setGroupByMaterialType] = useState<boolean>(true);

  const { data: summaryResponse, isLoading } = useQuery({
    queryKey: ['/api/material-usages/summary', filterProjectId, groupByMaterialType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterProjectId) params.append('project_id', filterProjectId);
      params.append('group_by_material_type', String(groupByMaterialType));
      const res = await fetch(`/api/material-usages/summary?${params.toString()}`);
      return res.json();
    }
  });

  const summaryData: MaterialUsageSummary[] = summaryResponse?.data || [];

  const totalWeight = summaryData.reduce((sum, row) => sum + (row.total_weight || 0), 0);
  const totalQuantity = summaryData.reduce((sum, row) => sum + row.total_quantity, 0);
  const totalRecords = summaryData.reduce((sum, row) => sum + row.record_count, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">案件・工区別 集計</h2>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>重量集計</CardTitle>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Label htmlFor="filter-project">案件ID:</Label>
                <Input
                  id="filter-project"
                  placeholder="絞込..."
                  value={filterProjectId}
                  onChange={(e) => setFilterProjectId(e.target.value)}
                  className="w-32"
                  data-testid="input-filter-project"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="group-material-type"
                  checked={groupByMaterialType}
                  onCheckedChange={setGroupByMaterialType}
                  data-testid="switch-group-material-type"
                />
                <Label htmlFor="group-material-type">材料種別で分類</Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : summaryData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              集計データがありません
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">総重量</div>
                    <div className="text-2xl font-bold">{totalWeight.toFixed(2)} kg</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">総数量</div>
                    <div className="text-2xl font-bold">{totalQuantity}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">レコード数</div>
                    <div className="text-2xl font-bold">{totalRecords}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>案件ID</TableHead>
                      <TableHead>工区</TableHead>
                      {groupByMaterialType && <TableHead>材料種別</TableHead>}
                      <TableHead className="text-right">数量</TableHead>
                      <TableHead className="text-right">重量 (kg)</TableHead>
                      <TableHead className="text-right">件数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryData.map((row, index) => (
                      <TableRow key={`${row.project_id}-${row.zone}-${row.material_type}-${index}`} data-testid={`row-summary-${index}`}>
                        <TableCell className="font-medium">{row.project_id}</TableCell>
                        <TableCell>{row.zone || "-"}</TableCell>
                        {groupByMaterialType && <TableCell>{row.material_type || "-"}</TableCell>}
                        <TableCell className="text-right">{row.total_quantity}</TableCell>
                        <TableCell className="text-right font-medium">
                          {row.total_weight !== null ? row.total_weight.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-right">{row.record_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
