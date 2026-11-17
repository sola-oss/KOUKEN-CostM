import { useEffect, useLayoutEffect, useState, useMemo, useRef, useCallback } from "react";
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

// Month index = year * 12 + month(0-11)
const toMonthIndex = (year: number, month: number) => year * 12 + month;
const monthIndexStart = (idx: number) => new Date(Math.floor(idx / 12), idx % 12, 1);
const monthIndexEnd = (idx: number) => new Date(Math.floor(idx / 12), (idx % 12) + 1, 0);

// How many months to add when scrolling near an edge
const EXTEND_MONTHS = 2;
// Pixels from the edge that trigger loading more months
const EDGE_THRESHOLD = 300;

const formatLabel = (d: Date) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;

interface ApiProject {
  orderId: string;
  projectName: string;
  factory?: string | null;
  tasks: {
    id: string;
    taskName: string;
    startDate: string | null;
    endDate: string | null;
    orderDate: string | null;
    workStartDate: string | null;
    progress: number;
    type: 'task' | 'procurement';
    actualHours: number;
  }[];
}

const GanttSimple = () => {
  const [rawProjects, setRawProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [factoryFilter, setFactoryFilter] = useState<string>("all");
  const [sortOrderId, setSortOrderId] = useState<'asc' | 'desc' | null>(null);

  // Loaded range (month indexes, inclusive). Starts at last month .. 2 months ahead.
  const nowMonthIdx = useMemo(() => {
    const t = new Date();
    return toMonthIndex(t.getFullYear(), t.getMonth());
  }, []);
  const [rangeStartIdx, setRangeStartIdx] = useState(nowMonthIdx - 1);
  const [rangeEndIdx, setRangeEndIdx] = useState(nowMonthIdx + 2);
  const [visibleLabel, setVisibleLabel] = useState("");

  const gridRef = useRef<HTMLDivElement>(null);
  const listBodyRef = useRef<HTMLDivElement>(null);

  // Prevent scroll sync re-entrancy
  const isSyncingList = useRef(false);
  const isSyncingGrid = useRef(false);

  // Columns added on the left that still need a scroll correction
  const pendingLeftShift = useRef(0);
  // True while a range extension is waiting to be rendered
  const extending = useRef(false);
  const fetchSeq = useRef(0);
  const didInitialScroll = useRef(false);

  const startDate = useMemo(() => formatDateLocal(monthIndexStart(rangeStartIdx)), [rangeStartIdx]);
  const endDate = useMemo(() => formatDateLocal(monthIndexEnd(rangeEndIdx)), [rangeEndIdx]);

  // Re-fetch whenever the loaded range changes (keep showing old rows meanwhile)
  useEffect(() => {
    const seq = ++fetchSeq.current;
    fetch(`/api/production/gantt/hierarchy?from=${startDate}&to=${endDate}`)
      .then((res) => res.json())
      .then((data: ApiProject[]) => {
        if (seq !== fetchSeq.current) return;
        setRawProjects(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        if (seq === fetchSeq.current) setLoading(false);
      });
  }, [startDate, endDate]);

  const scrollToDate = useCallback((dateStr: string, behavior: ScrollBehavior = 'smooth') => {
    const grid = gridRef.current;
    if (!grid) return;
    const start = monthIndexStart(rangeStartIdx);
    const [y, m, d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    const days = Math.round((target.getTime() - start.getTime()) / 86400000);
    const left = days * COLUMN_WIDTH - grid.clientWidth / 2 + COLUMN_WIDTH / 2;
    grid.scrollTo({ left: Math.max(0, left), behavior });
  }, [rangeStartIdx]);

  const updateVisibleLabel = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const start = monthIndexStart(rangeStartIdx);
    const firstIdx = Math.floor(grid.scrollLeft / COLUMN_WIDTH);
    const lastIdx = Math.max(firstIdx, Math.floor((grid.scrollLeft + grid.clientWidth) / COLUMN_WIDTH) - 1);
    const first = new Date(start.getFullYear(), start.getMonth(), start.getDate() + firstIdx);
    const last = new Date(start.getFullYear(), start.getMonth(), start.getDate() + lastIdx);
    const end = monthIndexEnd(rangeEndIdx);
    setVisibleLabel(`${formatLabel(first)} 〜 ${formatLabel(last > end ? end : last)}`);
  }, [rangeStartIdx, rangeEndIdx]);

  // After months were added on the left, keep the same dates on screen
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (grid && pendingLeftShift.current > 0) {
      grid.scrollLeft += pendingLeftShift.current * COLUMN_WIDTH;
      pendingLeftShift.current = 0;
    }
    extending.current = false;
    updateVisibleLabel();
  }, [rangeStartIdx, rangeEndIdx, updateVisibleLabel]);

  // First load: bring today into the middle
  useEffect(() => {
    if (loading || didInitialScroll.current || !gridRef.current) return;
    didInitialScroll.current = true;
    scrollToDate(formatDateLocal(new Date()), 'auto');
    updateVisibleLabel();
  }, [loading, scrollToDate, updateVisibleLabel]);

  // Keep the period label right when the window size changes
  useEffect(() => {
    const grid = gridRef.current;
    if (loading || !grid || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => updateVisibleLabel());
    ro.observe(grid);
    return () => ro.disconnect();
  }, [loading, updateVisibleLabel]);

  // Load more months when the user scrolls close to either edge
  const maybeExtendRange = useCallback(() => {
    const grid = gridRef.current;
    if (!grid || extending.current || !didInitialScroll.current) return;
    if (grid.scrollLeft < EDGE_THRESHOLD) {
      extending.current = true;
      const newStart = rangeStartIdx - EXTEND_MONTHS;
      const addedDays = Math.round(
        (monthIndexStart(rangeStartIdx).getTime() - monthIndexStart(newStart).getTime()) / 86400000
      );
      pendingLeftShift.current = addedDays;
      setRangeStartIdx(newStart);
    } else if (grid.scrollLeft + grid.clientWidth > grid.scrollWidth - EDGE_THRESHOLD) {
      extending.current = true;
      setRangeEndIdx(rangeEndIdx + EXTEND_MONTHS);
    }
  }, [rangeStartIdx, rangeEndIdx]);

  // Apply keyword filter on client side (fast, no re-fetch needed)
  const filteredProjects = useMemo((): GanttProject[] => {
    const filtered = rawProjects
      .filter((project) => {
        if (projectFilter) {
          const keyword = projectFilter.toLowerCase();
          const name = (project.projectName || "").toLowerCase();
          const orderId = (project.orderId || "").toLowerCase();
          if (!name.includes(keyword) && !orderId.includes(keyword)) return false;
        }
        if (factoryFilter && factoryFilter !== 'all') {
          return project.factory === factoryFilter;
        }
        return true;
      })
      .map((project) => ({
        orderId: project.orderId,
        projectName: project.projectName,
        factory: project.factory ?? null,
        tasks: project.tasks
          .filter((t) => t.startDate && t.endDate)
          .map((t) => ({
            id: t.id,
            taskName: t.taskName,
            startDate: t.startDate!,
            endDate: t.endDate!,
            orderDate: t.orderDate ?? null,
            workStartDate: t.workStartDate ?? null,
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
  }, [rawProjects, projectFilter, sortOrderId, factoryFilter]);

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
    updateVisibleLabel();
    maybeExtendRange();
  }, [updateVisibleLabel, maybeExtendRange]);

  // 「今日」: scroll back to today (filters stay as they are)
  const handleReset = useCallback(() => {
    scrollToDate(formatDateLocal(new Date()));
  }, [scrollToDate]);

  // ◀ ▶: scroll by about one month
  const shiftPeriod = useCallback((direction: number) => {
    gridRef.current?.scrollBy({ left: direction * 30 * COLUMN_WIDTH, behavior: 'smooth' });
  }, []);

  // Bar left edge dragged (or double-clicked): save 着工日. null = back to 受注日.
  // 受注日 and 納期 are not changed.
  const handleWorkStartChange = useCallback(async (orderId: string, workStartDate: string | null) => {
    const toBarStart = (p: ApiProject, w: string | null) => ({
      ...p,
      tasks: p.tasks.map((t) => ({
        ...t,
        workStartDate: w,
        startDate: w ? `${w}T00:00:00+09:00` : (t.orderDate || t.endDate),
      })),
    });
    const before = rawProjects.find((p) => p.orderId === orderId);
    setRawProjects((prev) => prev.map((p) => (p.orderId === orderId ? toBarStart(p, workStartDate) : p)));
    try {
      const res = await fetch(`/api/production/gantt/work-start/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workStartDate }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      console.error('着工日の保存に失敗:', e);
      if (before) setRawProjects((prev) => prev.map((p) => (p.orderId === orderId ? before : p)));
      alert('着工日を保存できませんでした。もう一度お試しください。');
    }
  }, [rawProjects]);

  const handleTaskClick = useCallback((taskId: string, orderId: string) => {
    console.log("Order clicked:", taskId, orderId);
  }, []);

  return (
    <div className="gantt-page-container" data-testid="page-gantt">
      <header className="gantt-page-header">
        <div className="gantt-page-title">
          <h1>受注別ガントチャート</h1>
          <p>受注日（着工日）〜納期のタイムライン表示（未出荷の受注のみ）。横にスクロールすると前後の月も見られます。バーの左はしをつかんで動かすと着工日を決められます（ダブルクリックで受注日に戻る）</p>
        </div>

        <GanttFilters
          onReset={handleReset}
          onShiftPeriod={shiftPeriod}
          currentMonth={visibleLabel}
          projectFilter={projectFilter}
          onProjectFilterChange={setProjectFilter}
          factoryFilter={factoryFilter}
          onFactoryFilterChange={setFactoryFilter}
        />
      </header>

      {loading ? (
        <div className="gantt-loading">読み込み中...</div>
      ) : (
        <>
        {filteredProjects.length === 0 && (
          <div className="gantt-empty-message" style={{ flex: 'none', padding: '0.5rem' }}>
            この期間に該当する受注はありません
          </div>
        )}
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
            startDate={startDate}
            endDate={endDate}
            rowHeight={ROW_HEIGHT}
            columnWidth={COLUMN_WIDTH}
            onTaskClick={handleTaskClick}
            onWorkStartChange={handleWorkStartChange}
            gridRef={gridRef}
            onScroll={handleGridScroll}
          />
        </div>
        </>
      )}
    </div>
  );
};

export default GanttSimple;
