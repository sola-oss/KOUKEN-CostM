import { useMemo, useRef, useEffect } from "react";
import type { GanttProject, DateColumn } from "../../types/gantt";

interface GanttGridProps {
  projects: GanttProject[];
  startDate: string;
  endDate: string;
  rowHeight: number;
  columnWidth: number;
  onTaskClick?: (taskId: string, orderId: string) => void;
  gridRef: React.RefObject<HTMLDivElement>;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getProgressColorClass = (progress: number): string => {
  if (progress >= 100) return 'progress-complete';
  if (progress >= 70) return 'progress-high';
  if (progress >= 30) return 'progress-medium';
  return 'progress-low';
};

export const GanttGrid = ({
  projects,
  startDate,
  endDate,
  rowHeight,
  columnWidth,
  onTaskClick,
  gridRef,
}: GanttGridProps) => {
  const todayStr = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const dateColumns = useMemo((): DateColumn[] => {
    const columns: DateColumn[] = [];
    
    // Parse YYYY-MM-DD strings as local time (not UTC)
    const parseDateLocal = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };
    
    // Format Date to YYYY-MM-DD in local time (not UTC)
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
        if (count > 0) {
          groups.push({ month: currentMonth, year: currentYear, count });
        }
        currentMonth = month;
        currentYear = year;
        count = 1;
      }
    }
    if (count > 0) {
      groups.push({ month: currentMonth, year: currentYear, count });
    }
    return groups;
  }, [dateColumns]);

  const totalWidth = dateColumns.length * columnWidth;

  const getBarPosition = (taskStart: string, taskEnd: string) => {
    const taskStartStr = taskStart.split('T')[0];
    const taskEndStr = taskEnd.split('T')[0];
    
    let startIdx = dateColumns.findIndex((c) => c.dateStr >= taskStartStr);
    let endIdx = dateColumns.findIndex((c) => c.dateStr >= taskEndStr);
    
    if (startIdx === -1) {
      startIdx = taskStartStr < dateColumns[0]?.dateStr ? 0 : dateColumns.length - 1;
    }
    
    if (endIdx === -1) {
      endIdx = taskEndStr > dateColumns[dateColumns.length - 1]?.dateStr 
        ? dateColumns.length - 1 
        : 0;
    }
    
    startIdx = Math.max(0, Math.min(startIdx, dateColumns.length - 1));
    endIdx = Math.max(0, Math.min(endIdx, dateColumns.length - 1));
    
    if (startIdx > endIdx) {
      [startIdx, endIdx] = [endIdx, startIdx];
    }
    
    const left = startIdx * columnWidth;
    const width = Math.max((endIdx - startIdx + 1) * columnWidth - 4, columnWidth - 4);
    return { left, width };
  };

  let rowIndex = 0;

  return (
    <div className="gantt-grid-wrapper" ref={gridRef}>
      <div className="gantt-grid" style={{ width: `${totalWidth}px` }}>
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

        <div className="gantt-grid-body">
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

          {projects.map((project) => {
            const projectRowIdx = rowIndex++;
            const projectTasks = project.isExpanded ? project.tasks : [];

            return (
              <div key={project.orderId} className="gantt-grid-project-group">
                <div
                  className="gantt-grid-row project-row"
                  style={{
                    top: `${projectRowIdx * rowHeight}px`,
                    height: `${rowHeight}px`,
                  }}
                />
                {projectTasks.map((task) => {
                  const taskRowIdx = rowIndex++;
                  const pos = getBarPosition(task.startDate, task.endDate);
                  if (!pos) return null;

                  const progressClass = getProgressColorClass(task.progress);
                  return (
                    <div
                      key={task.id}
                      className="gantt-grid-row task-row"
                      style={{
                        top: `${taskRowIdx * rowHeight}px`,
                        height: `${rowHeight}px`,
                      }}
                    >
                      <div
                        className={`gantt-bar-wrapper ${progressClass}`}
                        style={{
                          left: `${pos.left}px`,
                          width: `${pos.width}px`,
                        }}
                        onClick={() => onTaskClick?.(task.id, project.orderId)}
                        title={`${task.taskName} (進捗: ${task.progress}%)`}
                        data-testid={`gantt-bar-${task.id}`}
                      >
                        <div className="gantt-bar-plan" />
                        <div
                          className="gantt-bar-progress"
                          style={{ width: `${task.progress}%` }}
                        />
                        <span className="gantt-bar-label">
                          {task.taskName} {task.progress > 0 && `(${task.progress}%)`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GanttGrid;
