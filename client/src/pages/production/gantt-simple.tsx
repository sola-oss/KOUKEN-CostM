import { useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GanttChart, GanttTask } from "../../components/GanttChart";

const GanttSimple = () => {
  const [tasks, setTasks] = useState<GanttTask[]>([]);

  useEffect(() => {
    fetch("/api/production/orders/gantt")
      .then((res) => res.json())
      .then((data) => {
        setTasks(
          data
            .map((t: any) => {
              let start = t.start;
              let end = t.end;

              // endがnullの場合、start + 14日をデフォルトに
              if (!end && start) {
                const startDate = new Date(start);
                startDate.setDate(startDate.getDate() + 14);
                end = startDate.toISOString().split("T")[0];
              }

              // start > end の場合、日付を入れ替え
              if (start && end && new Date(start) > new Date(end)) {
                [start, end] = [end, start];
              }

              return {
                id: t.id.toString(),
                name: t.name,
                start,
                end,
                progress: t.progress ?? 0,
              };
            })
            .filter((t: GanttTask) => t.start && t.end) // start/endが両方あるものだけ
        );
      });
  }, []);

  return (
    <TooltipProvider>
      <div className="p-6 space-y-4" data-testid="page-gantt">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">案件別ガントチャート</h1>
          <p className="text-muted-foreground">frappe-ganttで案件別タイムラインを表示</p>
        </div>

        {/* Gantt Chart Container */}
        <div className="gantt-page-content">
          <div className="gantt-wrapper">
            {tasks.length === 0 ? (
              <p className="p-6 text-muted-foreground">読み込み中...</p>
            ) : (
              <GanttChart tasks={tasks} />
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default GanttSimple;
