import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CostChart } from "@/components/CostChart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function Analytics() {
  //todo: remove mock functionality
  const monthlyData = [
    { month: "1月", 材料費: 800000, 人件費: 600000, 設備費: 300000, 間接費: 200000 },
    { month: "2月", 材料費: 850000, 人件費: 650000, 設備費: 350000, 間接費: 250000 },
    { month: "3月", 材料費: 920000, 人件費: 700000, 設備費: 400000, 間接費: 280000 },
    { month: "4月", 材料費: 980000, 人件費: 720000, 設備費: 450000, 間接費: 300000 },
  ];

  const categoryData = [
    { category: "材料費", amount: 980000, color: "hsl(var(--chart-1))" },
    { category: "人件費", amount: 720000, color: "hsl(var(--chart-2))" },
    { category: "設備費", amount: 450000, color: "hsl(var(--chart-3))" },
    { category: "間接費", amount: 300000, color: "hsl(var(--chart-4))" },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      notation: "compact",
    }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">分析・レポート</h1>
        <p className="text-muted-foreground mt-1">詳細な原価分析と傾向レポート</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>月別原価推移</CardTitle>
            <CardDescription>過去4ヶ月の原価動向</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="材料費" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                <Line type="monotone" dataKey="人件費" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                <Line type="monotone" dataKey="設備費" stroke="hsl(var(--chart-3))" strokeWidth={2} />
                <Line type="monotone" dataKey="間接費" stroke="hsl(var(--chart-4))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>現在の原価構成</CardTitle>
            <CardDescription>カテゴリ別の原価分布</CardDescription>
          </CardHeader>
          <CardContent>
            <CostChart data={categoryData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>カテゴリ別比較</CardTitle>
          <CardDescription>月別カテゴリ原価の比較</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="材料費" fill="hsl(var(--chart-1))" />
              <Bar dataKey="人件費" fill="hsl(var(--chart-2))" />
              <Bar dataKey="設備費" fill="hsl(var(--chart-3))" />
              <Bar dataKey="間接費" fill="hsl(var(--chart-4))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}