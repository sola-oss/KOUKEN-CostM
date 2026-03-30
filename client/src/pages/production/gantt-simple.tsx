import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { GanttFilters } from "../../components/gantt/GanttFilters";
import { GanttTaskList } from "../../components/gantt/GanttTaskList";
import { GanttGrid } from "../../components/gantt/GanttGrid";
import type { GanttProject } from "../../types/gantt";
import "../../styles/gantt-custom.css";

const ROW_HEIGHT = 36;
const COLUMN_WIDTH = 32;

const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthDates = (year: number, month: number) => {
  const normalizedDate = new Date(year, month, 1);
  const normalizedYear = normalizedDate.getFullYear();
  const normalizedMonth = normalizedDate.getMonth();
  const start = new Date(normalizedYear, normalizedMonth, 1);
  const end = new Date(normalizedYear, normalizedMonth + 1, 0);
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
    actualHours: number;
  }[];
}

const GanttSimple = () => {
  const [rawProjects, setRawProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [sortOrderId, setSortOrderId] = useState<'asc' | 'desc' | null>(null);

  const today = new Date();
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());

  const gridRef = useRef<HTMLDivElement>(null);
  const listBodyRef = useRef<HTMLDivElement>(null);

  // Prevent scroll sync re-entrancy
  const isSyncingList = useRef(false);
  const isSyncingGrid = useRef(false);

  const { start: startDate, end: endDate } = useMemo(() => {
    return getMonthDates(displayYear, displayMonth);
  }, [displayYear, displayMonth]);

  // Re-fetch whenever the display month changes
  useEffect(() => {
    setLoading(true);
    const monthStr = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}`;
    fetch(`/api/production/gantt/hierarchy?month=${monthStr}`)
      .then((res) => res.json())
      .then((data: ApiProject[]) => {
        setRawProjects(data);
        setLoading(false);

        // Auto-scroll to today after data loads (only if showing current month)
        const now = new Date();
        if (displayYear === now.getFullYear() && displayMonth === now.getMonth()) {
          setTimeout(() => {
            if (gridRef.current) {
              const todayColumn = gridRef.current.querySelector('.gantt-grid-day.today');
              if (todayColumn) {
                const columnRect = todayColumn.getBoundingClientRect();
                const gridRect = gridRef.current.getBoundingClientRect();
                const scrollLeft = gridRef.current.scrollLeft + (columnRect.left - gridRect.left) - (gridRect.width / 2);
                gridRef.current.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
              }
            }
          }, 100);
        }
      })
      .catch(() => setLoading(false));
  }, [displayYear, displayMonth]);

  // Apply keyword filter on client side (fast, no re-fetch needed)
  const filteredProjects = useMemo((): GanttProject[] => {
    const filtered = rawProjects
      .filter((project) => {
        if (!projectFilter) return true;
        const keyword = projectFilter.toLowerCase();
        const name = (project.projectName || "").toLowerCase();
        const orderId = (project.orderId || "").toLowerCase();
        return name.includes(keyword) || orderId.includes(keyword);
      })
      .map((project) => ({
        orderId: project.orderId,
        projectName: project.projectName,
        tasks: project.tasks
          .filter((t) => t.startDate && t.endDate)
          .map((t) => ({
            id: t.id,
            taskName: t.taskName,
            startDate: t.startDate!,
            endDate: t.endDate!,
            progress: t.progress,
            type: t.type,
            actualHours: t.actualHours ?? 0,
          })),
        isExpanded: true,
      }))
      .filter((p) => p.tasks.length > 0);

    if (sortOrderId) {
      return [...filtered].sort((a, b) => {
        const cmp = a.orderId.localeCompare(b.orderId, 'ja');
        return sortOrderId === 'asc' ? cmp : -cmp;
      });
    }
    return filtered;
  }, [rawProjects, projectFilter, sortOrderId]);

  const handleSortOrderId = useCallback(() => {
    setSortOrderId((prev) => {
      if (prev === null) return 'asc';
      if (prev === 'asc') return 'desc';
      return null;
    });
  }, []);

  // Scroll sync: list → grid
  const handleListScroll = useCallback(() => {
    if (isSyncingGrid.current) return;
    isSyncingList.current = true;
    if (gridRef.current && listBodyRef.current) {
      gridRef.current.scrollTop = listBodyRef.current.scrollTop;
    }
    isSyncingList.current = false;
  }, []);

  // Scroll sync: grid → list
  const handleGridScroll = useCallback(() => {
    if (isSyncingList.current) return;
    isSyncingGrid.current = true;
    if (listBodyRef.current && gridRef.current) {
      listBodyRef.current.scrollTop = gridRef.current.scrollTop;
    }
    isSyncingGrid.current = false;
  }, []);

  const handleReset = useCallback(() => {
    const now = new Date();
    setDisplayYear(now.getFullYear());
    setDisplayMonth(now.getMonth());
    setProjectFilter("");
    setSortOrderId(null);
  }, []);

  const shiftPeriod = useCallback((direction: number) => {
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
    console.log("Order clicked:", taskId, orderId);
  }, []);

  const displayStartDate = startDate || getCurrentMonthDates().start;
  const displayEndDate = endDate || getCurrentMonthDates().end;

  const currentMonthLabel = useMemo(() => {
    return `${displayYear}年${displayMonth + 1}月`;
  }, [displayYear, displayMonth]);

  return (
    <div className="gantt-page-container" data-testid="page-gantt">
      <header className="gantt-page-header">
        <div className="gantt-page-title">
          <h1>受注別ガントチャート</h1>
          <p>受注日〜納期のタイムライン表示（未出荷の受注のみ）</p>
        </div>

        <GanttFilters
          onReset={handleReset}
          onShiftPeriod={shiftPeriod}
          currentMonth={currentMonthLabel}
          projectFilter={projectFilter}
          onProjectFilterChange={setProjectFilter}
        />
      </header>

      {loading ? (
        <div className="gantt-loading">読み込み中...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="gantt-empty-message">
          該当する受注はありません
        </div>
      ) : (
        <div className="gantt-content">
          <GanttTaskList
            projects={filteredProjects}
            rowHeight={ROW_HEIGHT}
            sortOrderId={sortOrderId}
            onSortOrderId={handleSortOrderId}
            listBodyRef={listBodyRef}
            onScroll={handleListScroll}
          />
          <GanttGrid
            projects={filteredProjects}
            startDate={displayStartDate}
            endDate={displayEndDate}
            rowHeight={ROW_HEIGHT}
            columnWidth={COLUMN_WIDTH}
            onTaskClick={handleTaskClick}
            gridRef={gridRef}
            onScroll={handleGridScroll}
          />
        </div>
      )}
    </div>
  );
};

export default GanttSimple;
