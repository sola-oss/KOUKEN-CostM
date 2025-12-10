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

// Calculate date span in days
const calculateDateSpan = (tasks: GanttTask[]): number => {
  if (tasks.length === 0) return 30;
  
  let minDate = new Date(tasks[0].start);
  let maxDate = new Date(tasks[0].end);
  
  tasks.forEach(task => {
    const start = new Date(task.start);
    const end = new Date(task.end);
    if (start < minDate) minDate = start;
    if (end > maxDate) maxDate = end;
  });
  
  const diffTime = maxDate.getTime() - minDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 7); // Minimum 7 days
};

export const GanttChart = ({
  tasks,
  viewMode = "Week",
  onDateChange,
  onProgressChange,
  onClick,
}: GanttChartProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountNodeRef = useRef<HTMLDivElement | null>(null);
  const ganttRef = useRef<Gantt | null>(null);

  // Capture wheel events BEFORE frappe-gantt can intercept them
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e: WheelEvent) => {
      // If vertical scroll is dominant, intercept it completely
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) * 0.5) {
        e.preventDefault(); // Stop browser's default scroll behavior
        e.stopImmediatePropagation(); // Stop frappe-gantt from receiving this event
        wrapper.scrollTop += e.deltaY;
        wrapper.scrollLeft = 0; // Reset any horizontal drift
      }
    };

    // Use capture phase to intercept BEFORE frappe-gantt's bubble phase handler
    wrapper.addEventListener("wheel", handleWheel, { capture: true, passive: false });

    return () => {
      wrapper.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || tasks.length === 0) return;

    const formattedTasks = tasks.map((task) => ({
      id: task.id,
      name: task.name,
      start: task.start,
      end: task.end,
      progress: task.progress,
      dependencies: task.dependencies || "",
    }));

    // Clean up existing mount node if it exists
    if (mountNodeRef.current) {
      mountNodeRef.current.remove();
      mountNodeRef.current = null;
      ganttRef.current = null;
    }

    // Create a new detached mount node - frappe-gantt can mutate this freely
    const mountNode = document.createElement("div");
    mountNode.style.width = "100%";
    mountNode.style.minHeight = "100%";
    wrapper.appendChild(mountNode);
    mountNodeRef.current = mountNode;

    // Calculate column width to fit viewport
    const wrapperWidth = wrapper.clientWidth || 800;
    const dateSpan = calculateDateSpan(tasks);
    
    // Calculate column width based on view mode and available width
    let baseColumnWidth: number;
    switch (viewMode) {
      case "Day":
        baseColumnWidth = Math.max(20, Math.min(50, (wrapperWidth - 200) / dateSpan));
        break;
      case "Week":
        baseColumnWidth = Math.max(30, Math.min(80, (wrapperWidth - 200) / Math.ceil(dateSpan / 7)));
        break;
      case "Month":
        baseColumnWidth = Math.max(80, Math.min(200, (wrapperWidth - 200) / Math.ceil(dateSpan / 30)));
        break;
      case "Year":
        baseColumnWidth = Math.max(150, Math.min(300, (wrapperWidth - 200) / Math.ceil(dateSpan / 365)));
        break;
      default:
        baseColumnWidth = 40;
    }

    ganttRef.current = new Gantt(mountNode, formattedTasks, {
      view_mode: viewMode,
      date_format: "YYYY-MM-DD",
      language: "ja",
      column_width: baseColumnWidth,
      bar_height: 24,
      bar_corner_radius: 3,
      padding: 18,
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
      if (mountNodeRef.current) {
        mountNodeRef.current.remove();
        mountNodeRef.current = null;
      }
      ganttRef.current = null;
    };
  }, [tasks, viewMode, onDateChange, onProgressChange, onClick]);

  return (
    <div
      ref={wrapperRef}
      data-testid="gantt-chart-container"
      style={{ 
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden", // Hide horizontal scroll completely
        position: "relative"
      }}
    />
  );
};

export default GanttChart;
