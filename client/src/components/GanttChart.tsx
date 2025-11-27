import { useEffect, useRef } from "react";
import Gantt from "frappe-gantt";
import "../styles/frappe-gantt.css";

export interface GanttTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies?: string;
}

interface GanttChartProps {
  tasks: GanttTask[];
  viewMode?: "Day" | "Week" | "Month" | "Year";
  onDateChange?: (task: GanttTask, start: Date, end: Date) => void;
  onProgressChange?: (task: GanttTask, progress: number) => void;
  onClick?: (task: GanttTask) => void;
}

export const GanttChart = ({
  tasks,
  viewMode = "Week",
  onDateChange,
  onProgressChange,
  onClick,
}: GanttChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<Gantt | null>(null);

  useEffect(() => {
    if (!containerRef.current || tasks.length === 0) return;

    const formattedTasks = tasks.map((task) => ({
      id: task.id,
      name: task.name,
      start: task.start,
      end: task.end,
      progress: task.progress,
      dependencies: task.dependencies || "",
    }));

    if (ganttRef.current) {
      containerRef.current.innerHTML = "";
    }

    ganttRef.current = new Gantt(containerRef.current, formattedTasks, {
      view_mode: viewMode,
      date_format: "YYYY-MM-DD",
      language: "ja",
      on_date_change: onDateChange
        ? (task: any, start: Date, end: Date) => {
            onDateChange(task as GanttTask, start, end);
          }
        : undefined,
      on_progress_change: onProgressChange
        ? (task: any, progress: number) => {
            onProgressChange(task as GanttTask, progress);
          }
        : undefined,
      on_click: onClick
        ? (task: any) => {
            onClick(task as GanttTask);
          }
        : undefined,
    });

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [tasks, viewMode, onDateChange, onProgressChange, onClick]);

  useEffect(() => {
    if (ganttRef.current && viewMode) {
      ganttRef.current.change_view_mode(viewMode);
    }
  }, [viewMode]);

  return (
    <div
      ref={containerRef}
      data-testid="gantt-chart-container"
      style={{ width: "100%", overflowX: "auto" }}
    />
  );
};

export default GanttChart;
