import { useEffect, useState, useMemo } from "react";
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

              if (!end && start) {
                const startDateObj = new Date(start);
                startDateObj.setDate(startDateObj.getDate() + 14);
                end = startDateObj.toISOString().split("T")[0];
              }

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
            .filter((t: GanttTask) => t.start && t.end)
        );
      });
  }, []);

  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      const taskStartStr = task.start.split("T")[0];
      const taskEndStr = task.end.split("T")[0];
      const taskStart = new Date(taskStartStr);
      const taskEnd = new Date(taskEndStr);

      if (startDate) {
        const filterStart = new Date(startDate);
        if (taskEnd < filterStart) return false;
      }

      if (endDate) {
        const filterEndDate = new Date(endDate);
        if (taskStart > filterEndDate) return false;
      }

      if (projectFilter) {
        const keyword = projectFilter.toLowerCase();
        const name = (task.name || "").toLowerCase();
        if (!name.includes(keyword)) {
          return false;
        }
      }

      return true;
    });

    return filtered;
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
    <div className="gantt-page" data-testid="page-gantt">
      <header className="gantt-page-header">
        <div className="gantt-page-title">
          <h1>案件別ガントチャート</h1>
          <p>frappe-ganttで案件別タイムラインを表示</p>
        </div>

        <div className="gantt-toolbar" data-testid="gantt-toolbar">
          <div className="gantt-toolbar-left">
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-gantt-prev"
              title="前へ"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              data-testid="button-gantt-today"
            >
              Today
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              data-testid="button-gantt-reset"
            >
              すべて
            </Button>
          </div>

          <div className="gantt-toolbar-right">
            <div className="gantt-toolbar-filter">
              <label htmlFor="start-date" className="gantt-filter-label">
                開始日
              </label>
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
              <label htmlFor="end-date" className="gantt-filter-label">
                終了日
              </label>
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
      </header>

      <div className="gantt-wrapper">
        {tasks.length === 0 ? (
          <p className="gantt-loading">読み込み中...</p>
        ) : visibleTasks.length === 0 ? (
          <p className="gantt-empty">
            選択されたフィルター条件に一致するタスクがありません
          </p>
        ) : (
          <GanttChart tasks={visibleTasks} />
        )}
      </div>
    </div>
  );
};

export default GanttSimple;
