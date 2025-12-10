import { useEffect, useRef, useState } from "react";
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
  viewMode = "Month",
  onDateChange,
  onProgressChange,
  onClick,
}: GanttChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<Gantt | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (wrapperRef.current) {
        setContainerWidth(wrapperRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    if (!containerRef.current || tasks.length === 0 || containerWidth === 0) return;

    const formattedTasks = tasks.map((task) => ({
      id: task.id,
      name: task.name,
      start: task.start,
      end: task.end,
      progress: task.progress,
      dependencies: task.dependencies || "",
    }));

    const dates = tasks.flatMap((t) => [new Date(t.start), new Date(t.end)]);
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const daysDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

    const sidebarWidth = 200;
    const availableWidth = containerWidth - sidebarWidth;

    let columnWidth: number;
    let effectiveViewMode = viewMode;

    if (viewMode === "Month") {
      const monthsDiff = Math.max(1, Math.ceil(daysDiff / 30));
      columnWidth = Math.max(30, Math.floor(availableWidth / (monthsDiff + 2)));
    } else if (viewMode === "Week") {
      const weeksDiff = Math.max(1, Math.ceil(daysDiff / 7));
      columnWidth = Math.max(20, Math.floor(availableWidth / (weeksDiff + 2)));
    } else if (viewMode === "Day") {
      columnWidth = Math.max(15, Math.floor(availableWidth / (daysDiff + 2)));
    } else {
      columnWidth = 50;
    }

    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }

    ganttRef.current = new Gantt(containerRef.current, formattedTasks, {
      view_mode: effectiveViewMode,
      date_format: "YYYY-MM-DD",
      language: "ja",
      today_button: false,
      view_mode_select: false,
      column_width: columnWidth,
      bar_height: 20,
      bar_corner_radius: 3,
      padding: 14,
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
  }, [tasks, viewMode, containerWidth, onDateChange, onProgressChange, onClick]);

  useEffect(() => {
    if (ganttRef.current && viewMode) {
      ganttRef.current.change_view_mode(viewMode);
    }
  }, [viewMode]);

  return (
    <div ref={wrapperRef} className="gantt-chart-wrapper">
      <div
        ref={containerRef}
        data-testid="gantt-chart-container"
        className="gantt-chart-mount"
      />
    </div>
  );
};

export default GanttChart;
