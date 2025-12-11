import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { GanttTaskList } from "../../components/gantt/GanttTaskList";
import { GanttGrid } from "../../components/gantt/GanttGrid";
import type { GanttProject } from "../../types/gantt";
import "../../styles/gantt-custom.css";

const ROW_HEIGHT = 36;
const COLUMN_WIDTH = 32;
const PAST_DAYS_LIMIT = 30;

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

const GanttSimple = () => {
  const [rawProjects, setRawProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  
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

  const displayDates = useMemo(() => {
    const today = new Date();
    
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - PAST_DAYS_LIMIT);
    
    const allEndDates: Date[] = [];
    for (const project of projects) {
      for (const task of project.tasks) {
        if (task.endDate) allEndDates.push(new Date(task.endDate));
      }
    }
    
    let endDate: Date;
    if (allEndDates.length === 0) {
      endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 3);
    } else {
      const maxTaskDate = new Date(Math.max(...allEndDates.map((d) => d.getTime())));
      endDate = new Date(Math.max(today.getTime(), maxTaskDate.getTime()));
      endDate.setDate(endDate.getDate() + 14);
    }
    
    return {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    };
  }, [projects]);

  const scrollToToday = useCallback(() => {
    if (!gridRef.current) return;
    
    const today = new Date();
    const startDate = new Date(displayDates.start);
    
    const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const scrollLeft = Math.max(0, daysDiff * COLUMN_WIDTH - gridRef.current.clientWidth / 3);
    
    gridRef.current.scrollTo({
      left: scrollLeft,
      behavior: 'smooth'
    });
  }, [displayDates.start]);

  useEffect(() => {
    if (!loading && projects.length > 0 && !initialScrollDone) {
      let cancelled = false;
      let attempts = 0;
      const maxAttempts = 10;
      let rafHandle: number;
      
      const tryScroll = () => {
        if (cancelled) return;
        
        if (gridRef.current && gridRef.current.scrollWidth > 0) {
          scrollToToday();
          setInitialScrollDone(true);
        } else if (attempts < maxAttempts) {
          attempts++;
          rafHandle = requestAnimationFrame(tryScroll);
        }
      };
      
      rafHandle = requestAnimationFrame(tryScroll);
      
      return () => {
        cancelled = true;
        if (rafHandle) {
          cancelAnimationFrame(rafHandle);
        }
      };
    }
  }, [loading, projects.length, initialScrollDone, scrollToToday]);

  return (
    <div className="gantt-page-container" data-testid="page-gantt">
      <header className="gantt-page-header">
        <div className="gantt-page-title">
          <h1>案件別ガントチャート</h1>
          <p>プロジェクト・工程のタイムライン表示</p>
        </div>
        <div className="gantt-nav-buttons">
          <Button
            variant="outline"
            size="sm"
            onClick={scrollToToday}
            data-testid="button-gantt-today"
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
