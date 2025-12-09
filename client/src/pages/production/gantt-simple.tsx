import { useEffect, useState, useMemo } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { GanttChart, GanttTask } from "../../components/GanttChart";
import { ChevronLeft } from "lucide-react";

type GanttRange = "ALL" | "THREE_MONTHS" | "SIX_MONTHS";

const GanttSimple = () => {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [range, setRange] = useState<GanttRange>("ALL");

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

  // Filter tasks based on selected date range
  const visibleTasks = useMemo(() => {
    const today = new Date();
    let startRange: Date | null = null;
    let endRange: Date | null = null;

    if (range === "THREE_MONTHS") {
      // 今日〜3ヶ月先までを表示
      startRange = new Date(today);
      endRange = new Date(today);
      endRange.setMonth(endRange.getMonth() + 3);
    } else if (range === "SIX_MONTHS") {
      // 今日〜6ヶ月先までを表示
      startRange = new Date(today);
      endRange = new Date(today);
      endRange.setMonth(endRange.getMonth() + 6);
    } else {
      // "ALL" の場合は全件
      startRange = null;
      endRange = null;
    }

    return tasks.filter((task) => {
      if (!startRange || !endRange) return true;
      const taskStart = new Date(task.start);
      const taskEnd = new Date(task.end);
      // 期間が少しでもかぶっていれば表示
      return taskEnd >= startRange && taskStart <= endRange;
    });
  }, [tasks, range]);

  const handleToday = () => {
    setRange("THREE_MONTHS");
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-4" data-testid="page-gantt">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">案件別ガントチャート</h1>
          <p className="text-muted-foreground">frappe-ganttで案件別タイムラインを表示</p>
        </div>

        {/* Filter and Navigation Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="hover-elevate"
            data-testid="button-gantt-prev"
            title="前へ"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant={range === "THREE_MONTHS" ? "default" : "outline"}
            size="sm"
            onClick={handleToday}
            className="hover-elevate"
            data-testid="button-gantt-today"
          >
            Today
          </Button>

          <Button
            variant={range === "THREE_MONTHS" ? "default" : "outline"}
            size="sm"
            onClick={() => setRange("THREE_MONTHS")}
            className="hover-elevate"
            data-testid="button-gantt-three-months"
          >
            3ヶ月
          </Button>

          <Button
            variant={range === "SIX_MONTHS" ? "default" : "outline"}
            size="sm"
            onClick={() => setRange("SIX_MONTHS")}
            className="hover-elevate"
            data-testid="button-gantt-six-months"
          >
            6ヶ月
          </Button>

          <Button
            variant={range === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setRange("ALL")}
            className="hover-elevate"
            data-testid="button-gantt-all"
          >
            すべて
          </Button>
        </div>

        {/* Gantt Chart Container */}
        <div className="gantt-page-content">
          <div className="gantt-wrapper">
            {visibleTasks.length === 0 ? (
              <p className="p-6 text-muted-foreground">
                {tasks.length === 0 ? "読み込み中..." : "選択された期間にはタスクがありません"}
              </p>
            ) : (
              <GanttChart tasks={visibleTasks} />
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default GanttSimple;
