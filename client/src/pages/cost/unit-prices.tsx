import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export default function UnitPricesPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">単価マスタ</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>労務単価・材料単価管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-center py-12">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>単価マスタ機能は準備中です</p>
            <p className="text-sm mt-2">
              作業員の時間単価、材料の単価を管理します
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
