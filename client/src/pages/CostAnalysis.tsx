import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, AlertTriangle, Target } from "lucide-react";

export default function CostAnalysis() {
  const [selectedPeriod, setSelectedPeriod] = useState("current");

  //todo: remove mock functionality
  const analysisData = {
    profitMargin: 18.5,
    targetMargin: 25.0,
    costEfficiency: 82.3,
    budgetVariance: -7.2,
    recommendations: [
      {
        category: "材料費",
        issue: "原材料コストが予算を12%上回っています",
        action: "サプライヤーとの価格交渉を検討",
        priority: "high",
        impact: "¥120,000/月の削減可能性"
      },
      {
        category: "人件費", 
        issue: "残業時間の増加により人件費が上昇",
        action: "業務プロセスの効率化",
        priority: "medium",
        impact: "¥80,000/月の削減可能性"
      },
      {
        category: "設備費",
        issue: "機械メンテナンス費用が計画より高い",
        action: "予防保全スケジュールの見直し",
        priority: "low",
        impact: "¥30,000/月の削減可能性"
      }
    ]
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "high": return "高";
      case "medium": return "中";
      case "low": return "低";
      default: return priority;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">原価分析</h1>
          <p className="text-muted-foreground mt-1">詳細な原価分析と改善提案</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48" data-testid="select-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">今月</SelectItem>
            <SelectItem value="last_month">先月</SelectItem>
            <SelectItem value="quarter">四半期</SelectItem>
            <SelectItem value="year">年間</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">利益率</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-profit-margin">
              {analysisData.profitMargin}%
            </div>
            <div className="flex items-center text-xs">
              <span className="text-muted-foreground">目標: {analysisData.targetMargin}%</span>
            </div>
            <Progress 
              value={(analysisData.profitMargin / analysisData.targetMargin) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">コスト効率性</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-cost-efficiency">
              {analysisData.costEfficiency}%
            </div>
            <div className="flex items-center text-xs text-chart-2">
              <TrendingUp className="h-3 w-3 mr-1" />
              効率的な原価管理
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">予算差異</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="text-budget-variance">
              {analysisData.budgetVariance}%
            </div>
            <div className="flex items-center text-xs text-destructive">
              <TrendingDown className="h-3 w-3 mr-1" />
              予算超過
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">改善ポテンシャル</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-2" data-testid="text-improvement-potential">
              ¥230K
            </div>
            <div className="text-xs text-muted-foreground">
              月間削減可能額
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>改善提案</CardTitle>
          <CardDescription>原価削減のための具体的な提案</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysisData.recommendations.map((rec, index) => (
              <div 
                key={index} 
                className="border rounded-lg p-4 hover-elevate"
                data-testid={`recommendation-${index}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{rec.category}</h4>
                    <Badge variant={getPriorityColor(rec.priority) as any}>
                      優先度: {getPriorityText(rec.priority)}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium text-chart-2">{rec.impact}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{rec.issue}</p>
                <p className="text-sm font-medium">{rec.action}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button 
          onClick={() => console.log("Generating detailed report...")}
          data-testid="button-generate-report"
        >
          詳細レポート生成
        </Button>
        <Button 
          variant="outline"
          onClick={() => console.log("Exporting analysis...")}
          data-testid="button-export-analysis"
        >
          分析結果エクスポート
        </Button>
        <Button 
          variant="outline"
          onClick={() => console.log("Setting up alerts...")}
          data-testid="button-setup-alerts"
        >
          アラート設定
        </Button>
      </div>
    </div>
  );
}