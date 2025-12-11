import { ChevronDown, ChevronRight } from "lucide-react";
import type { GanttProject } from "../../types/gantt";

interface GanttTaskListProps {
  projects: GanttProject[];
  onToggleProject: (orderId: string) => void;
  rowHeight: number;
}

export const GanttTaskList = ({
  projects,
  onToggleProject,
  rowHeight,
}: GanttTaskListProps) => {
  return (
    <div className="gantt-task-list" data-testid="gantt-task-list">
      <div className="gantt-task-list-header" style={{ height: `${rowHeight * 2}px` }}>
        <div className="gantt-task-list-header-cell">案件 / 工程</div>
        <div className="gantt-task-list-header-cell">開始日</div>
        <div className="gantt-task-list-header-cell">終了日</div>
        <div className="gantt-task-list-header-cell">進捗</div>
      </div>
      <div className="gantt-task-list-body">
        {projects.map((project) => (
          <div key={project.orderId} className="gantt-project-group">
            <div
              className="gantt-project-row"
              style={{ height: `${rowHeight}px` }}
              onClick={() => onToggleProject(project.orderId)}
              data-testid={`gantt-project-${project.orderId}`}
            >
              <div className="gantt-project-toggle">
                {project.isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
              <div className="gantt-project-name" title={project.projectName}>
                {project.projectName}
              </div>
              <div className="gantt-project-dates">
                {project.tasks.length > 0 && (
                  <>
                    <span>{project.tasks[0]?.startDate?.split('T')[0] || '-'}</span>
                    <span>~</span>
                    <span>{project.tasks[project.tasks.length - 1]?.endDate?.split('T')[0] || '-'}</span>
                  </>
                )}
              </div>
              <div className="gantt-project-progress">
                {project.tasks.length > 0
                  ? Math.round(
                      project.tasks.reduce((sum, t) => sum + t.progress, 0) /
                        project.tasks.length
                    )
                  : 0}
                %
              </div>
            </div>
            {project.isExpanded &&
              project.tasks.map((task) => (
                <div
                  key={task.id}
                  className="gantt-task-row"
                  style={{ height: `${rowHeight}px` }}
                  data-testid={`gantt-task-${task.id}`}
                >
                  <div className="gantt-task-indent" />
                  <div className="gantt-task-name" title={task.taskName}>
                    {task.taskName}
                  </div>
                  <div className="gantt-task-start">
                    {task.startDate?.split('T')[0] || '-'}
                  </div>
                  <div className="gantt-task-end">
                    {task.endDate?.split('T')[0] || '-'}
                  </div>
                  <div className="gantt-task-progress">{task.progress}%</div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GanttTaskList;
