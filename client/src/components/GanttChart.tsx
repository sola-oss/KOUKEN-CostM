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

    // カスタムwheelイベントハンドラ
    // frappe-ganttの内部ハンドラがdeltaYを横スクロールに変換してしまうので、
    // それを防いで縦/横スクロールを適切に振り分ける
    const container = containerRef.current;
    const svgElement = container.querySelector("svg");

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // 親のスクロール可能なコンテナを取得
      const scrollableParent = container.closest('[style*="overflow"]') as HTMLElement;
      
      // Shift+ホイール または 横方向の動きが大きい場合は横スクロール
      const isHorizontal = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);

      if (isHorizontal) {
        // 横スクロール（frappe-gantt内部のコンテナ）
        const ganttContainer = container.querySelector(".gantt-container") as HTMLElement;
        if (ganttContainer) {
          ganttContainer.scrollLeft += e.deltaX || e.deltaY;
        }
      } else {
        // 縦スクロール（親コンテナ）
        if (scrollableParent) {
          scrollableParent.scrollTop += e.deltaY;
        }
      }
    };

    if (svgElement) {
      svgElement.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    }

    return () => {
      if (svgElement) {
        svgElement.removeEventListener("wheel", handleWheel, { capture: true });
      }
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
