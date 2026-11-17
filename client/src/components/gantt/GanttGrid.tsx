import { useMemo, useRef, useState } from "react";
import type { GanttProject, DateColumn } from "../../types/gantt";

interface GanttGridProps {
  projects: GanttProject[];
  startDate: string;
  endDate: string;
  rowHeight: number;
  columnWidth: number;
  onTaskClick?: (taskId: string, orderId: string) => void;
  /** Called after the bar's left edge is dragged. null = back to 受注日 */
  onWorkStartChange?: (orderId: string, workStartDate: string | null) => void;
  gridRef: React.RefObject<HTMLDivElement>;
  onScroll?: () => void;
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const getProgressColorClass = (progress: number, actualHours: number): string => {
  if (actualHours > 0) return 'has-actual';
  if (progress >= 100) return 'progress-complete';
  if (progress >= 70) return 'progress-high';
  if (progress >= 30) return 'progress-medium';
  return 'progress-low';
};

const getFactoryBarStyle = (factory: string | null | undefined): React.CSSProperties => {
  switch (factory) {
    case 'laser':     return { backgroundColor: '#8b5cf6' };
    case 'factory1':  return { backgroundColor: '#0ea5e9' };
    case 'factory2':  return { backgroundColor: '#10b981' };
    case 'machine':   return { backgroundColor: '#f59e0b' };
    case 'outsource': return { backgroundColor: '#9ca3af' };
    default:          return {};
  }
};

export const GanttGrid = ({
  projects,
  startDate,
  endDate,
  rowHeight,
  columnWidth,
  onTaskClick,
  onWorkStartChange,
  gridRef,
  onScroll,
}: GanttGridProps) => {
  // Left-edge drag state: which order, where the pointer started, and the bar start at that time
  const [drag, setDrag] = useState<{ orderId: string; startX: number; baseStart: string; deltaDays: number } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  // Swallow the click that follows a drag
  const justDragged = useRef(false);

  const addDays = (dateStr: string, days: number): string => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d + days);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };
  const daysBetween = (a: string, b: string): number => {
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    return Math.round((new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86400000);
  };

  const todayStr = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const dateColumns = useMemo((): DateColumn[] => {
    const columns: DateColumn[] = [];

    const parseDateLocal = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const formatDateLocal = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const start = parseDateLocal(startDate);
    const end = parseDateLocal(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDateLocal(d);
      const dayOfWeek = d.getDay();
      columns.push({
        date: new Date(d),
        dateStr,
        dayOfWeek,
        dayNumber: d.getDate(),
        monthNumber: d.getMonth() + 1,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: dateStr === todayStr,
      });
    }
    return columns;
  }, [startDate, endDate, todayStr]);

  const monthGroups = useMemo(() => {
    const groups: { month: number; year: number; count: number }[] = [];
    let currentMonth = -1;
    let currentYear = -1;
    let count = 0;

    for (const col of dateColumns) {
      const month = col.date.getMonth() + 1;
      const year = col.date.getFullYear();
      if (month === currentMonth && year === currentYear) {
        count++;
      } else {
        if (count > 0) groups.push({ month: currentMonth, year: currentYear, count });
        currentMonth = month;
        currentYear = year;
        count = 1;
      }
    }
    if (count > 0) groups.push({ month: currentMonth, year: currentYear, count });
    return groups;
  }, [dateColumns]);

  const totalWidth = dateColumns.length * columnWidth;

  const getBarPosition = (barStart: string, barEnd: string) => {
    const startStr = barStart.split('T')[0];
    const endStr = barEnd.split('T')[0];

    let startIdx = dateColumns.findIndex((c) => c.dateStr >= startStr);
    let endIdx = dateColumns.findIndex((c) => c.dateStr >= endStr);

    if (startIdx === -1) {
      startIdx = startStr < (dateColumns[0]?.dateStr ?? '') ? 0 : dateColumns.length - 1;
    }
    if (endIdx === -1) {
      endIdx = endStr > (dateColumns[dateColumns.length - 1]?.dateStr ?? '')
        ? dateColumns.length - 1
        : 0;
    }

    startIdx = Math.max(0, Math.min(startIdx, dateColumns.length - 1));
    endIdx = Math.max(0, Math.min(endIdx, dateColumns.length - 1));
    if (startIdx > endIdx) [startIdx, endIdx] = [endIdx, startIdx];

    const left = startIdx * columnWidth;
    const width = Math.max((endIdx - startIdx + 1) * columnWidth - 4, columnWidth - 4);
    return { left, width };
  };

  return (
    <div className="gantt-grid-wrapper" ref={gridRef} onScroll={onScroll}>
      <div className="gantt-grid" style={{ width: `${totalWidth}px` }}>
        {/* Header */}
        <div className="gantt-grid-header" style={{ height: `${rowHeight * 2}px` }}>
          <div className="gantt-grid-header-months">
            {monthGroups.map((group, idx) => (
              <div
                key={idx}
                className="gantt-grid-month"
                style={{ width: `${group.count * columnWidth}px` }}
              >
                {group.year}/{group.month}
              </div>
            ))}
          </div>
          <div className="gantt-grid-header-days">
            {dateColumns.map((col, idx) => (
              <div
                key={idx}
                className={`gantt-grid-day ${col.isWeekend ? 'weekend' : ''} ${col.isToday ? 'today' : ''}`}
                style={{ width: `${columnWidth}px` }}
              >
                <span className="gantt-grid-weekday">{WEEKDAY_LABELS[col.dayOfWeek]}</span>
                <span className="gantt-grid-daynum">{col.dayNumber}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Body — one row per order */}
        <div className="gantt-grid-body" style={{ height: `${projects.length * rowHeight}px` }}>
          {/* Background column stripes */}
          {dateColumns.map((col, idx) => (
            <div
              key={idx}
              className={`gantt-grid-column ${col.isWeekend ? 'weekend' : ''} ${col.isToday ? 'today' : ''}`}
              style={{
                left: `${idx * columnWidth}px`,
                width: `${columnWidth}px`,
              }}
            />
          ))}

          {/* One row per order with its bar */}
          {projects.map((project, rowIndex) => {
            const bar = project.tasks[0];
            if (!bar) return null;

            const barStartStr = bar.startDate.split('T')[0];
            const barEndStr = bar.endDate.split('T')[0];
            const orderDateStr = bar.orderDate?.split('T')[0] ?? null;
            const isDragging = drag?.orderId === project.orderId;
            const shownStart = isDragging ? addDays(drag!.baseStart, drag!.deltaDays) : barStartStr;
            const pos = getBarPosition(shownStart, barEndStr);
            const progressClass = getProgressColorClass(bar.progress, bar.actualHours);
            const factoryStyle = getFactoryBarStyle(project.factory);
            const hasFactoryColor = !!project.factory;
            const actualHoursLabel = bar.actualHours > 0
              ? `  ${bar.actualHours % 1 === 0 ? bar.actualHours : bar.actualHours.toFixed(1)}h`
              : '';

            return (
              <div
                key={project.orderId}
                className="gantt-grid-row task-row"
                style={{
                  top: `${rowIndex * rowHeight}px`,
                  height: `${rowHeight}px`,
                }}
              >
                <div
                  className={`gantt-bar-wrapper ${hasFactoryColor ? 'factory-colored' : progressClass}${isDragging ? ' dragging' : ''}${bar.workStartDate ? ' has-work-start' : ''}`}
                  style={{
                    left: `${pos.left}px`,
                    width: `${pos.width}px`,
                    ...(hasFactoryColor ? factoryStyle : {}),
                  }}
                  onClick={() => {
                    if (justDragged.current) { justDragged.current = false; return; }
                    onTaskClick?.(bar.id, project.orderId);
                  }}
                  onDoubleClick={() => {
                    if (bar.workStartDate) onWorkStartChange?.(project.orderId, null);
                  }}
                  title={`${project.projectName}\n受注日: ${orderDateStr ?? '-'}${bar.workStartDate ? `\n着工日: ${bar.workStartDate}` : ''} → 納期: ${barEndStr}${bar.actualHours > 0 ? `\n実績: ${bar.actualHours.toFixed(1)}h` : ''}${onWorkStartChange ? `\n（左はしをつかんで着工日を変更${bar.workStartDate ? '・ダブルクリックで受注日に戻す' : ''}）` : ''}`}
                  data-testid={`gantt-bar-${project.orderId}`}
                >
                  <div className="gantt-bar-plan" />
                  <div
                    className="gantt-bar-progress"
                    style={{ width: `${bar.progress}%` }}
                  />
                  <span className="gantt-bar-label">
                    {isDragging ? `着工 ${shownStart.slice(5).replace('-', '/')}　` : ''}{project.projectName}{actualHoursLabel}
                  </span>
                  {onWorkStartChange && (
                    <div
                      className="gantt-bar-handle-left"
                      data-testid={`gantt-bar-handle-${project.orderId}`}
                      onPointerDown={(e) => {
                        if (e.button !== 0) return;
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setDrag({ orderId: project.orderId, startX: e.clientX, baseStart: barStartStr, deltaDays: 0 });
                      }}
                      onPointerMove={(e) => {
                        const cur = dragRef.current;
                        if (!cur || cur.orderId !== project.orderId) return;
                        let delta = Math.round((e.clientX - cur.startX) / columnWidth);
                        // Start can't go past 納期
                        const maxDelta = daysBetween(cur.baseStart, barEndStr);
                        if (delta > maxDelta) delta = maxDelta;
                        if (delta !== cur.deltaDays) setDrag({ ...cur, deltaDays: delta });
                      }}
                      onPointerUp={(e) => {
                        const cur = dragRef.current;
                        if (!cur || cur.orderId !== project.orderId) return;
                        e.currentTarget.releasePointerCapture(e.pointerId);
                        setDrag(null);
                        if (cur.deltaDays === 0) return;
                        justDragged.current = true;
                        const newStart = addDays(cur.baseStart, cur.deltaDays);
                        // Dropped back on 受注日 → clear 着工日
                        onWorkStartChange(project.orderId, newStart === orderDateStr ? null : newStart);
                      }}
                      onPointerCancel={() => setDrag(null)}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GanttGrid;
