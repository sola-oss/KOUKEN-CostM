import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Package, Users, Settings } from "lucide-react";
import { CostChart } from "./CostChart";
import { ProjectCard } from "./ProjectCard";

interface DashboardProps {
  //todo: remove mock functionality
  totalCosts?: number;
  monthlyChange?: number;
  projects?: Array<{
    id: string;
    name: string;
    budget: number;
    spent: number;
    status: "active" | "completed" | "on_hold";
  }>;
  categoryCosts?: Array<{
    category: string;
    amount: number;
    color: string;
  }>;
}

export function Dashboard({ 
  //todo: remove mock functionality
  totalCosts = 2450000,
  monthlyChange = 8.2,
  projects = [
    { id: "1", name: "製品A開発", budget: 500000, spent: 320000, status: "active" },
    { id: "2", name: "工場設備更新", budget: 1200000, spent: 850000, status: "active" },
    { id: "3", name: "品質管理システム", budget: 300000, spent: 300000, status: "completed" },
  ],
  categoryCosts = [
    { category: "材料費", amount: 980000, color: "hsl(var(--chart-1))" },
    { category: "人件費", amount: 720000, color: "hsl(var(--chart-2))" },
    { category: "設備費", amount: 450000, color: "hsl(var(--chart-3))" },
    { category: "間接費", amount: 300000, color: "hsl(var(--chart-4))" },
  ]
}: DashboardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">原価管理ダッシュボード</h1>
          <p className="text-muted-foreground mt-1">プロジェクト別原価とコスト分析</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総原価</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-cost">
              {formatCurrency(totalCosts)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {monthlyChange > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-destructive" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-chart-2" />
              )}
              前月比 {Math.abs(monthlyChange)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">稼働プロジェクト</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-projects">
              {projects.filter(p => p.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">
              進行中のプロジェクト
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">予算使用率</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-budget-usage">
              {((projects.reduce((sum, p) => sum + p.spent, 0) / projects.reduce((sum, p) => sum + p.budget, 0)) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              全体予算に対する使用率
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最大カテゴリ</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-top-category">
              {categoryCosts.reduce((max, cat) => cat.amount > max.amount ? cat : max).category}
            </div>
            <p className="text-xs text-muted-foreground">
              最も高い原価カテゴリ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>原価構成</CardTitle>
            <CardDescription>カテゴリ別の原価分布</CardDescription>
          </CardHeader>
          <CardContent>
            <CostChart data={categoryCosts} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>プロジェクト一覧</CardTitle>
            <CardDescription>進行中および完了プロジェクト</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}