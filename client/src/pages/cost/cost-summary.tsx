import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

export default function CostSummaryPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Calculator className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">原価集計</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>案件別原価集計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-center py-12">
            <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>原価集計機能は準備中です</p>
            <p className="text-sm mt-2">
              材料費・労務費・経費を案件別に集計し、原価分析を行います
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
