import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare } from "lucide-react";

export default function SummaryApproval() {
  return (
    <div className="p-6 space-y-6" data-testid="page-summary-approval">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          集計・承認
        </h1>
        <p className="text-muted-foreground">
          作業実績の集計と承認処理
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            集計・承認
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
