import { useRef } from "react";
import type { GanttProject } from "../../types/gantt";
import { ArrowUpDown } from "lucide-react";

interface GanttTaskListProps {
  projects: GanttProject[];
  rowHeight: number;
  sortOrderId: 'asc' | 'desc' | null;
  onSortOrderId: () => void;
  listBodyRef: React.RefObject<HTMLDivElement>;
  onScroll: () => void;
}

export const GanttTaskList = ({
  projects,
  rowHeight,
  sortOrderId,
  onSortOrderId,
  listBodyRef,
  onScroll,
}: GanttTaskListProps) => {
  return (
    <div className="gantt-task-list" data-testid="gantt-task-list">
      <div className="gantt-task-list-header" style={{ height: `${rowHeight * 2}px` }}>
        <div className="gantt-task-list-header-cell" style={{ display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', userSelect: 'none' }} onClick={onSortOrderId} title="受注番号でソート">
          受注番号
          <ArrowUpDown
            size={11}
            style={{ opacity: sortOrderId ? 1 : 0.4, color: sortOrderId ? 'hsl(var(--primary))' : undefined }}
          />
        </div>
        <div className="gantt-task-list-header-cell">得意先 / 受注件名</div>
        <div className="gantt-task-list-header-cell">受注日</div>
        <div className="gantt-task-list-header-cell">納期</div>
        <div className="gantt-task-list-header-cell">実績</div>
      </div>
      <div className="gantt-task-list-body" ref={listBodyRef} onScroll={onScroll}>
        {projects.map((project) => {
          const bar = project.tasks[0];
          const startDateStr = bar?.startDate?.split('T')[0] || '-';
          const endDateStr = bar?.endDate?.split('T')[0] || '-';
          const actualHours = bar?.actualHours ?? 0;
          const actualHoursStr = actualHours > 0
            ? `${actualHours % 1 === 0 ? actualHours : actualHours.toFixed(1)}h`
            : '-';
          return (
            <div
              key={project.orderId}
              className="gantt-project-row"
              style={{ height: `${rowHeight}px` }}
              data-testid={`gantt-project-${project.orderId}`}
            >
              <div className="gantt-project-id" title={project.orderId}>
                {project.orderId}
              </div>
              <div className="gantt-project-name" title={project.projectName}>
                {project.projectName}
              </div>
              <div className="gantt-task-start">{startDateStr}</div>
              <div className="gantt-task-end">{endDateStr}</div>
              <div className="gantt-task-actual">{actualHoursStr}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GanttTaskList;
