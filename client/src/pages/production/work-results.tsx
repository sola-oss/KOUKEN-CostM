import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer } from "lucide-react";

export default function WorkResults() {
  return (
    <div className="p-6 space-y-6" data-testid="page-work-results">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          作業実績入力
        </h1>
        <p className="text-muted-foreground">
          作業実績の記録と工数入力
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            作業実績入力
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
