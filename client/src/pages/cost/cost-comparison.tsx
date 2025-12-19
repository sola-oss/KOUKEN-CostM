import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function CostComparisonPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">予実比較</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>予算 vs 実績</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-center py-12">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>予実比較機能は準備中です</p>
            <p className="text-sm mt-2">
              案件ごとの予算と実績を比較し、差異分析を行います
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
