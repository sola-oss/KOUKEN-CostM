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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<Gantt | null>(null);

  // Capture wheel events BEFORE frappe-gantt can intercept them
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e: WheelEvent) => {
      // If vertical scroll is dominant, intercept it
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.stopImmediatePropagation(); // Stop frappe-gantt from receiving this event
        wrapper.scrollTop += e.deltaY;
      }
    };

    // Use capture phase to intercept BEFORE frappe-gantt's bubble phase handler
    wrapper.addEventListener("wheel", handleWheel, { capture: true, passive: false });

    return () => {
      wrapper.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (!mountRef.current || tasks.length === 0) return;

    const formattedTasks = tasks.map((task) => ({
      id: task.id,
      name: task.name,
      start: task.start,
      end: task.end,
      progress: task.progress,
      dependencies: task.dependencies || "",
    }));

    // Clear only the mount point, not the wrapper
    if (ganttRef.current && mountRef.current) {
      mountRef.current.innerHTML = "";
    }

    ganttRef.current = new Gantt(mountRef.current, formattedTasks, {
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
      if (mountRef.current) {
        mountRef.current.innerHTML = "";
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
      ref={wrapperRef}
      data-testid="gantt-chart-container"
      style={{ 
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overflowX: "auto",
        position: "relative"
      }}
    >
      {/* Isolated mount point for frappe-gantt - it can mutate this freely */}
      <div ref={mountRef} style={{ minWidth: "100%", minHeight: "100%" }} />
    </div>
  );
};

export default GanttChart;
