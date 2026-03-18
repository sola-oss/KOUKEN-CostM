// Production Management MVP - Material Summary (材料集計)
import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, ChevronDown, ChevronRight } from "lucide-react";

interface MaterialUsageSummary {
  project_id: string;
  zone: string | null;
  material_type: string | null;
  total_quantity: number;
  total_weight: number | null;
  record_count: number;
}

interface MaterialUsageDetail {
  id: number;
  project_id: string;
  material_id: number | null;
  material_name: string | null;
  material_size: string | null;
  material_type: string | null;
  quantity: number | null;
  length: number | null;
  total_weight: number | null;
  unit_weight: number | null;
  remark: string | null;
  zone: string | null;
  area: string | null;
}

function DetailRows({ projectId }: { projectId: string }) {
  const { data: detailResponse, isLoading } = useQuery({
    queryKey: ['/api/material-usages', projectId],
    queryFn: async () => {
      const params = new URLSearchParams({ project_id: projectId });
      const res = await fetch(`/api/material-usages?${params.toString()}`);
      return res.json();
    }
  });

  const details: MaterialUsageDetail[] = detailResponse?.data || [];

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="py-3">
          <div className="space-y-2 px-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </TableCell>
      </TableRow>
    );
  }

  if (details.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground text-sm">
          明細データがありません
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      <TableRow className="bg-muted/30">
        <TableCell colSpan={5} className="py-0 px-4">
          <Table>
            <TableHeader>
              <TableRow className="border-b-0">
                <TableHead className="text-xs h-8 text-muted-foreground">材料名</TableHead>
                <TableHead className="text-xs h-8 text-muted-foreground">サイズ</TableHead>
                <TableHead className="text-xs h-8 text-muted-foreground">材料種別</TableHead>
                <TableHead className="text-xs h-8 text-right text-muted-foreground">数量</TableHead>
                <TableHead className="text-xs h-8 text-right text-muted-foreground">長さ (m)</TableHead>
                <TableHead className="text-xs h-8 text-right text-muted-foreground">重量 (kg)</TableHead>
                <TableHead className="text-xs h-8 text-muted-foreground">備考</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {details.map((d) => (
                <TableRow key={d.id} className="border-b-0 last:border-b">
                  <TableCell className="text-sm py-2">{d.material_name || "-"}</TableCell>
                  <TableCell className="text-sm py-2">{d.material_size || "-"}</TableCell>
                  <TableCell className="text-sm py-2">{d.material_type || "-"}</TableCell>
                  <TableCell className="text-sm py-2 text-right">{d.quantity ?? "-"}</TableCell>
                  <TableCell className="text-sm py-2 text-right">{d.length != null ? d.length : "-"}</TableCell>
                  <TableCell className="text-sm py-2 text-right font-medium">
                    {d.total_weight != null ? d.total_weight.toFixed(2) : "-"}
                  </TableCell>
                  <TableCell className="text-sm py-2">{d.remark || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function MaterialSummary() {
  const [filterProjectId, setFilterProjectId] = useState<string>("");
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const { data: summaryResponse, isLoading } = useQuery({
    queryKey: ['/api/material-usages/summary', filterProjectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterProjectId) params.append('project_id', filterProjectId);
      params.append('group_by_material_type', 'false');
      const res = await fetch(`/api/material-usages/summary?${params.toString()}`);
      return res.json();
    }
  });

  const summaryData: MaterialUsageSummary[] = summaryResponse?.data || [];

  const handleRowClick = (projectId: string) => {
    setExpandedProjectId(prev => prev === projectId ? null : projectId);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">材料集計</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>材料集計</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="filter-project">受注番号:</Label>
              <Input
                id="filter-project"
                placeholder="絞込..."
                value={filterProjectId}
                onChange={(e) => setFilterProjectId(e.target.value)}
                className="w-40"
                data-testid="input-filter-project"
              />
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>受注番号</TableHead>
                    <TableHead className="text-right">数量合計</TableHead>
                    <TableHead className="text-right">重量合計 (kg)</TableHead>
                    <TableHead className="text-right">件数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryData.map((row, index) => {
                    const isExpanded = expandedProjectId === row.project_id;
                    return (
                      <Fragment key={`group-${row.project_id}-${index}`}>
                        <TableRow
                          data-testid={`row-summary-${index}`}
                          className="cursor-pointer hover-elevate"
                          onClick={() => handleRowClick(row.project_id)}
                        >
                          <TableCell className="w-8">
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            }
                          </TableCell>
                          <TableCell className="font-medium">{row.project_id}</TableCell>
                          <TableCell className="text-right">{row.total_quantity}</TableCell>
                          <TableCell className="text-right font-medium">
                            {row.total_weight != null ? row.total_weight.toFixed(2) : "-"}
                          </TableCell>
                          <TableCell className="text-right">{row.record_count}</TableCell>
                        </TableRow>
                        {isExpanded && (
                          <DetailRows projectId={row.project_id} />
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
