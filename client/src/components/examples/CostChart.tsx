import { CostChart } from '../CostChart';

export default function CostChartExample() {
  const mockData = [
    { category: "材料費", amount: 980000, color: "hsl(var(--chart-1))" },
    { category: "人件費", amount: 720000, color: "hsl(var(--chart-2))" },
    { category: "設備費", amount: 450000, color: "hsl(var(--chart-3))" },
    { category: "間接費", amount: 300000, color: "hsl(var(--chart-4))" },
  ];

  return (
    <div className="p-6">
      <CostChart data={mockData} />
    </div>
  );
}