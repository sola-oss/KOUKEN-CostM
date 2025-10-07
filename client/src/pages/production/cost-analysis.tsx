import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function CostAnalysis() {
  return (
    <div className="p-6 space-y-6" data-testid="page-cost-analysis">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          原価・粗利分析
        </h1>
        <p className="text-muted-foreground">
          原価分析と粗利益の可視化
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            原価・粗利分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            このページは準備中です
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
