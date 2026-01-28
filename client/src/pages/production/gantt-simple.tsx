import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { GanttFilters } from "../../components/gantt/GanttFilters";
import { GanttTaskList } from "../../components/gantt/GanttTaskList";
import { GanttGrid } from "../../components/gantt/GanttGrid";
import type { GanttProject } from "../../types/gantt";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import "../../styles/gantt-custom.css";

const ROW_HEIGHT = 36;
const COLUMN_WIDTH = 32;

const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateLocal = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getMonthDates = (year: number, month: number) => {
  // Handle month overflow/underflow
  const normalizedDate = new Date(year, month, 1);
  const normalizedYear = normalizedDate.getFullYear();
  const normalizedMonth = normalizedDate.getMonth();
  
  const start = new Date(normalizedYear, normalizedMonth, 1);
  const end = new Date(normalizedYear, normalizedMonth + 1, 0); // Last day of month
  return {
    start: formatDateLocal(start),
    end: formatDateLocal(end),
  };
};

const getCurrentMonthDates = () => {
  const today = new Date();
  return getMonthDates(today.getFullYear(), today.getMonth());
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
  const [rawProjects, setRawProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  
  // Sidebar toggle for full-screen Gantt view
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();
  
  // Track current display month explicitly
  const today = new Date();
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());
  
  const gridRef = useRef<HTMLDivElement>(null);
  const taskListRef = useRef<HTMLDivElement>(null);
  
  // Compute date range from year/month state
  const { start: startDate, end: endDate } = useMemo(() => {
    return getMonthDates(displayYear, displayMonth);
  }, [displayYear, displayMonth]);

  useEffect(() => {
    fetch("/api/production/gantt/hierarchy")
      .then((res) => res.json())
      .then((data: ApiProject[]) => {
        setRawProjects(data);
        const allOrderIds = new Set(data.map((p) => p.orderId));
        setExpandedProjects(allOrderIds);
        setLoading(false);
        
        // Auto-scroll to today after data loads
        setTimeout(() => {
          if (gridRef.current) {
            const todayColumn = gridRef.current.querySelector(`.gantt-grid-day.today`);
            if (todayColumn) {
              const columnRect = todayColumn.getBoundingClientRect();
              const gridRect = gridRef.current.getBoundingClientRect();
              const scrollLeft = gridRef.current.scrollLeft + (columnRect.left - gridRect.left) - (gridRect.width / 2);
              gridRef.current.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
            }
          }
        }, 100);
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
          
          const taskStart = parseDateLocal(task.startDate.split("T")[0]);
          const taskEnd = parseDateLocal(task.endDate.split("T")[0]);
          
          if (taskEnd.getFullYear() < minYear) return false;
          
          if (startDate) {
            const filterStart = parseDateLocal(startDate);
            if (taskEnd < filterStart) return false;
          }
          
          if (endDate) {
            const filterEnd = parseDateLocal(endDate);
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

  const handleReset = useCallback(() => {
    // Reset to current month
    const now = new Date();
    setDisplayYear(now.getFullYear());
    setDisplayMonth(now.getMonth());
    setProjectFilter("");
  }, []);

  const shiftPeriod = useCallback((direction: number) => {
    // Calculate new month, handling year rollover
    let newMonth = displayMonth + direction;
    let newYear = displayYear;
    
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    
    setDisplayYear(newYear);
    setDisplayMonth(newMonth);
  }, [displayYear, displayMonth]);

  const handleTaskClick = useCallback((taskId: string, orderId: string) => {
    console.log("Task clicked:", taskId, orderId);
  }, []);

  const displayStartDate = startDate || getCurrentMonthDates().start;
  const displayEndDate = endDate || getCurrentMonthDates().end;

  const currentMonthLabel = useMemo(() => {
    return `${displayYear}年${displayMonth + 1}月`;
  }, [displayYear, displayMonth]);

  return (
    <div className="gantt-page-container" data-testid="page-gantt">
      <header className="gantt-page-header">
        <div className="gantt-page-title flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "サイドバーを隠す" : "サイドバーを表示"}
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
          <div>
            <h1>案件別ガントチャート</h1>
            <p>プロジェクト・工程のタイムライン表示</p>
          </div>
        </div>

        <GanttFilters
          onReset={handleReset}
          onShiftPeriod={shiftPeriod}
          currentMonth={currentMonthLabel}
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
