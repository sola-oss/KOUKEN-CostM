import { useQuery } from "@tanstack/react-query";
import Plot from "react-plotly.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import dayjs from "dayjs";

interface GanttItem {
  id: string;
  name: string;
  start: string | null;
  end: string | null;
  progress: number;
}

export default function GanttSimple() {
  const { data: ganttData, isLoading, error } = useQuery<GanttItem[]>({
    queryKey: ['/api/production/orders/gantt'],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">ガントチャート</h1>
        <Card>
          <CardHeader>
            <CardTitle>案件スケジュール</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">ガントチャート</h1>
        <Card className="mt-4">
          <CardContent className="pt-6">
            <p className="text-destructive" data-testid="text-error">
              データの取得に失敗しました
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validItems = (ganttData || []).filter(item => item.start && item.end);

  if (validItems.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">ガントチャート</h1>
        <Card className="mt-4">
          <CardContent className="pt-6">
            <p className="text-muted-foreground" data-testid="text-empty">
              表示可能なスケジュールがありません
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const yLabels = validItems.map(item => `${item.id}: ${item.name}`);
  const startDates = validItems.map(item => dayjs(item.start).format('YYYY-MM-DD'));
  const endDates = validItems.map(item => dayjs(item.end).format('YYYY-MM-DD'));
  const durations = validItems.map(item => {
    const start = dayjs(item.start);
    const end = dayjs(item.end);
    return end.diff(start, 'day') + 1;
  });
  const colors = validItems.map(item => {
    if (item.progress === 100) return '#22c55e';
    if (item.progress > 0) return '#3b82f6';
    return '#94a3b8';
  });
  const hoverTexts = validItems.map(item => 
    `${item.name}<br>開始: ${dayjs(item.start).format('YYYY/MM/DD')}<br>終了: ${dayjs(item.end).format('YYYY/MM/DD')}<br>進捗: ${item.progress}%`
  );

  const chartHeight = Math.max(300, validItems.length * 30 + 100);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold" data-testid="text-page-title">ガントチャート</h1>
      <Card>
        <CardHeader>
          <CardTitle>案件スケジュール</CardTitle>
        </CardHeader>
        <CardContent>
          <div data-testid="gantt-chart-container">
            <Plot
              data={[
                {
                  type: 'bar',
                  orientation: 'h',
                  y: yLabels,
                  x: durations,
                  base: startDates,
                  marker: {
                    color: colors,
                  },
                  text: hoverTexts,
                  hoverinfo: 'text',
                  textposition: 'none',
                } as any,
              ]}
              layout={{
                height: chartHeight,
                margin: { l: 200, r: 30, t: 30, b: 50 },
                xaxis: {
                  type: 'date',
                  title: { text: '日付' },
                  tickformat: '%Y/%m/%d',
                  showgrid: true,
                  gridcolor: '#e2e8f0',
                },
                yaxis: {
                  autorange: 'reversed',
                  tickfont: { size: 11 },
                },
                bargap: 0.3,
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                showlegend: false,
              } as any}
              config={{
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                responsive: true,
              }}
              style={{ width: '100%' }}
            />
          </div>
          <div className="mt-4 flex gap-4 text-sm" data-testid="gantt-legend">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
              <span>完了</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
              <span>進行中</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#94a3b8' }}></div>
              <span>未着手</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
