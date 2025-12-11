import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { GanttFilters } from "../../components/gantt/GanttFilters";
import { GanttTaskList } from "../../components/gantt/GanttTaskList";
import { GanttGrid } from "../../components/gantt/GanttGrid";
import type { GanttProject } from "../../types/gantt";
import "../../styles/gantt-custom.css";

const ROW_HEIGHT = 36;
const COLUMN_WIDTH = 32;

const getDefaultDates = () => {
  const today = new Date();
  const oneMonthBefore = new Date(today);
  oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);
  const twoMonthsLater = new Date(today);
  twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);
  return {
    start: oneMonthBefore.toISOString().split("T")[0],
    end: twoMonthsLater.toISOString().split("T")[0],
  };
};

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
  const defaultDates = getDefaultDates();
  const [rawProjects, setRawProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>(defaultDates.start);
  const [endDate, setEndDate] = useState<string>(defaultDates.end);
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  
  const gridRef = useRef<HTMLDivElement>(null);
  const taskListRef = useRef<HTMLDivElement>(null);

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

  const filteredProjects = useMemo((): GanttProject[] => {
    const minYear = 2025;
    
    return rawProjects
      .filter((project) => {
        if (projectFilter) {
          const keyword = projectFilter.toLowerCase();
          const name = (project.projectName || "").toLowerCase();
          const orderId = (project.orderId || "").toLowerCase();
          if (!name.includes(keyword) && !orderId.includes(keyword)) {
            return false;
          }
        }
        return true;
      })
      .map((project) => {
        const filteredTasks = project.tasks.filter((task) => {
          if (!task.startDate || !task.endDate) return false;
          
          const taskStart = new Date(task.startDate.split("T")[0]);
          const taskEnd = new Date(task.endDate.split("T")[0]);
          
          if (taskEnd.getFullYear() < minYear) return false;
          
          if (startDate) {
            const filterStart = new Date(startDate);
            if (taskEnd < filterStart) return false;
          }
          
          if (endDate) {
            const filterEnd = new Date(endDate);
            if (taskStart > filterEnd) return false;
          }
          
          return true;
        });

        return {
          orderId: project.orderId,
          projectName: project.projectName,
          tasks: filteredTasks.map((t) => ({
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
  }, [rawProjects, startDate, endDate, projectFilter, expandedProjects]);

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

  const handleToday = useCallback(() => {
    const dates = getDefaultDates();
    setStartDate(dates.start);
    setEndDate(dates.end);
    setProjectFilter("");
    
    setTimeout(() => {
      if (gridRef.current) {
        const today = new Date();
        const start = new Date(dates.start);
        const daysDiff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const scrollLeft = Math.max(0, daysDiff * COLUMN_WIDTH - gridRef.current.clientWidth / 2);
        gridRef.current.scrollLeft = scrollLeft;
      }
    }, 100);
  }, []);

  const handleReset = useCallback(() => {
    setStartDate("");
    setEndDate("");
    setProjectFilter("");
  }, []);

  const shiftPeriod = useCallback((direction: number) => {
    if (!startDate || !endDate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const shiftDays = Math.max(7, Math.floor(daysInPeriod / 2));
    
    start.setDate(start.getDate() + direction * shiftDays);
    end.setDate(end.getDate() + direction * shiftDays);
    
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  }, [startDate, endDate]);

  const handleTaskClick = useCallback((taskId: string, orderId: string) => {
    console.log("Task clicked:", taskId, orderId);
  }, []);

  const displayStartDate = startDate || "2025-01-01";
  const displayEndDate = endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  return (
    <div className="gantt-page-container" data-testid="page-gantt">
      <header className="gantt-page-header">
        <div className="gantt-page-title">
          <h1>案件別ガントチャート</h1>
          <p>プロジェクト・工程のタイムライン表示</p>
        </div>

        <GanttFilters
          startDate={startDate}
          endDate={endDate}
          projectFilter={projectFilter}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onProjectFilterChange={setProjectFilter}
          onToday={handleToday}
          onReset={handleReset}
          onShiftPeriod={shiftPeriod}
        />
      </header>

      {loading ? (
        <div className="gantt-loading">読み込み中...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="gantt-empty-message">
          該当する案件はありません
        </div>
      ) : (
        <div className="gantt-content">
          <GanttTaskList
            projects={filteredProjects}
            onToggleProject={handleToggleProject}
            rowHeight={ROW_HEIGHT}
          />
          <GanttGrid
            projects={filteredProjects}
            startDate={displayStartDate}
            endDate={displayEndDate}
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
