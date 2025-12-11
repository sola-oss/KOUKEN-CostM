import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { GanttTaskList } from "../../components/gantt/GanttTaskList";
import { GanttGrid } from "../../components/gantt/GanttGrid";
import { Button } from "@/components/ui/button";
import type { GanttProject } from "../../types/gantt";
import "../../styles/gantt-custom.css";

const ROW_HEIGHT = 36;
const COLUMN_WIDTH = 32;
const PADDING_DAYS_BEFORE = 14;
const PADDING_DAYS_AFTER = 14;

interface ApiProject {
  orderId: string;
  projectName: string;
  tasks: {
    id: string;
    taskName: string;
    startDate: string | null;
    endDate: string | null;
    progress: number;
    type: 'task' | 'procurement';
  }[];
}

interface DisplayWindow {
  start: string;
  end: string;
}

function calculateDisplayWindow(
  projects: GanttProject[],
  paddingBefore: number = PADDING_DAYS_BEFORE,
  paddingAfter: number = PADDING_DAYS_AFTER
): DisplayWindow {
  const allDates: Date[] = [];
  
  for (const project of projects) {
    for (const task of project.tasks) {
      if (task.startDate) allDates.push(new Date(task.startDate.split("T")[0]));
      if (task.endDate) allDates.push(new Date(task.endDate.split("T")[0]));
    }
  }
  
  if (allDates.length === 0) {
    const today = new Date();
    const threeMonthsLater = new Date(today);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    return {
      start: today.toISOString().split("T")[0],
      end: threeMonthsLater.toISOString().split("T")[0],
    };
  }
  
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
  
  minDate.setDate(minDate.getDate() - paddingBefore);
  maxDate.setDate(maxDate.getDate() + paddingAfter);
  
  return {
    start: minDate.toISOString().split("T")[0],
    end: maxDate.toISOString().split("T")[0],
  };
}

const GanttSimple = () => {
  const [rawProjects, setRawProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/production/gantt/hierarchy")
      .then((res) => res.json())
      .then((data: ApiProject[]) => {
        setRawProjects(data);
        const allOrderIds = new Set(data.map((p) => p.orderId));
        setExpandedProjects(allOrderIds);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const projects = useMemo((): GanttProject[] => {
    const minYear = 2025;
    
    return rawProjects
      .map((project) => {
        const validTasks = project.tasks.filter((task) => {
          if (!task.startDate || !task.endDate) return false;
          const taskEnd = new Date(task.endDate.split("T")[0]);
          if (taskEnd.getFullYear() < minYear) return false;
          return true;
        });

        return {
          orderId: project.orderId,
          projectName: project.projectName,
          tasks: validTasks.map((t) => ({
            id: t.id,
            taskName: t.taskName,
            startDate: t.startDate!,
            endDate: t.endDate!,
            progress: t.progress,
            type: t.type,
          })),
          isExpanded: expandedProjects.has(project.orderId),
        };
      })
      .filter((project) => project.tasks.length > 0);
  }, [rawProjects, expandedProjects]);

  const displayDates = useMemo(() => {
    return calculateDisplayWindow(projects);
  }, [projects]);

  const handleToggleProject = useCallback((orderId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }, []);

  const handleTaskClick = useCallback((taskId: string, orderId: string) => {
    console.log("Task clicked:", taskId, orderId);
  }, []);

  const handleScrollToToday = useCallback(() => {
    if (!gridRef.current) return;
    
    const today = new Date();
    const start = new Date(displayDates.start);
    const daysDiff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    const targetScrollLeft = daysDiff * COLUMN_WIDTH - gridRef.current.clientWidth / 2;
    const maxScrollLeft = gridRef.current.scrollWidth - gridRef.current.clientWidth;
    
    gridRef.current.scrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScrollLeft));
  }, [displayDates.start]);

  return (
    <div className="gantt-page-container" data-testid="page-gantt">
      <header className="gantt-page-header">
        <div className="gantt-header-content">
          <div className="gantt-page-title">
            <h1>案件別ガントチャート</h1>
            <p>プロジェクト・工程のタイムライン表示</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleScrollToToday}
            data-testid="button-scroll-today"
          >
            今日
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="gantt-loading">読み込み中...</div>
      ) : projects.length === 0 ? (
        <div className="gantt-empty-message">
          該当する案件はありません
        </div>
      ) : (
        <div className="gantt-content">
          <GanttTaskList
            projects={projects}
            onToggleProject={handleToggleProject}
            rowHeight={ROW_HEIGHT}
          />
          <GanttGrid
            projects={projects}
            startDate={displayDates.start}
            endDate={displayDates.end}
            rowHeight={ROW_HEIGHT}
            columnWidth={COLUMN_WIDTH}
            onTaskClick={handleTaskClick}
            gridRef={gridRef}
          />
        </div>
      )}
    </div>
  );
};

export default GanttSimple;
