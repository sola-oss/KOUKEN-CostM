import { useEffect, useState, useMemo } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GanttChart, GanttTask } from "../../components/GanttChart";
import { ChevronLeft } from "lucide-react";

const GanttSimple = () => {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("");

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
                const startDateObj = new Date(start);
                startDateObj.setDate(startDateObj.getDate() + 14);
                end = startDateObj.toISOString().split("T")[0];
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

  // Filter tasks based on date range and project name
  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const taskStart = new Date(task.start);
      const taskEnd = new Date(task.end);

      // 日付範囲フィルター（開始日）
      if (startDate) {
        const filterStart = new Date(startDate);
        // 全くかぶっていない（タスクの終了が開始日より前）の場合は除外
        if (taskEnd < filterStart) return false;
      }

      // 日付範囲フィルター（終了日）
      if (endDate) {
        const filterEnd = new Date(endDate);
        // 全くかぶっていない（タスクの開始が終了日より後）の場合は除外
        if (taskStart > filterEnd) return false;
      }

      // 案件名フィルター
      if (projectFilter) {
        const keyword = projectFilter.toLowerCase();
        const name = (task.name || "").toLowerCase();
        if (!name.includes(keyword)) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, startDate, endDate, projectFilter]);

  const handleToday = () => {
    const today = new Date();
    const threeMonthsLater = new Date(today);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    
    setStartDate(today.toISOString().split("T")[0]);
    setEndDate(threeMonthsLater.toISOString().split("T")[0]);
    setProjectFilter("");
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setProjectFilter("");
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-4" data-testid="page-gantt">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">案件別ガントチャート</h1>
          <p className="text-muted-foreground">frappe-ganttで案件別タイムラインを表示</p>
        </div>

        {/* Gantt Toolbar */}
        <div className="gantt-toolbar">
          {/* Left side: Navigation buttons */}
          <div className="gantt-toolbar-left">
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
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="hover-elevate"
              data-testid="button-gantt-today"
            >
              Today
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="hover-elevate"
              data-testid="button-gantt-reset"
            >
              すべて
            </Button>
          </div>

          {/* Right side: Filter inputs */}
          <div className="gantt-toolbar-right">
            <div className="gantt-toolbar-filter">
              <label htmlFor="start-date" className="gantt-filter-label">開始日</label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="gantt-filter-input"
                data-testid="input-gantt-start-date"
              />
            </div>

            <div className="gantt-toolbar-filter">
              <label htmlFor="end-date" className="gantt-filter-label">終了日</label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="gantt-filter-input"
                data-testid="input-gantt-end-date"
              />
            </div>

            <Input
              type="text"
              placeholder="案件名で絞り込み"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="gantt-filter-input-text"
              data-testid="input-gantt-project-filter"
            />
          </div>
        </div>

        {/* Gantt Chart Container */}
        <div className="gantt-page-content">
          <div className="gantt-wrapper">
            {visibleTasks.length === 0 ? (
              <p className="p-6 text-muted-foreground">
                {tasks.length === 0 ? "読み込み中..." : "選択されたフィルター条件に一致するタスクがありません"}
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
