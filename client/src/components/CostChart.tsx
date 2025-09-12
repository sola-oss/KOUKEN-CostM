import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface CostChartProps {
  data: Array<{
    category: string;
    amount: number;
    color: string;
  }>;
}

export function CostChart({ data }: CostChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      notation: "compact",
    }).format(value);
  };

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  const pieData = data.map(item => ({
    name: item.category,
    value: item.amount,
    percentage: ((item.amount / total) * 100).toFixed(1),
    color: item.color,
  }));

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            paddingAngle={2}
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => [formatCurrency(value), "金額"]}
            labelFormatter={(label) => `${label}`}
          />
          <Legend 
            formatter={(value, entry: any) => (
              <span style={{ color: entry.color }}>
                {value} ({entry.payload.percentage}%)
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}