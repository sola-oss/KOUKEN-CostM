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

// スクロール可能な親要素を探すヘルパー関数
const findScrollableParent = (element: HTMLElement | null): HTMLElement | null => {
  let current = element?.parentElement;
  while (current) {
    const style = getComputedStyle(current);
    const overflowY = style.overflowY;
    const isScrollable =
      (overflowY === "auto" || overflowY === "scroll") &&
      current.scrollHeight > current.clientHeight;
    if (isScrollable) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
};

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

    // ヘッダーを sticky にするための処理
    const setupStickyHeader = () => {
      if (!containerRef.current) return;
      const svgElement = containerRef.current.querySelector("svg");
      if (!svgElement) return;

      // SVG 内のヘッダー行を探す（最初の <g> グループがヘッダーの可能性が高い）
      const groups = svgElement.querySelectorAll("g");
      if (groups.length > 0) {
        const headerElement = groups[0] as SVGElement;
        
        // SVG 要素の場合は setAttribute を使用
        const currentClass = headerElement.getAttribute("class") || "";
        if (!currentClass.includes("gantt-header-sticky")) {
          headerElement.setAttribute("class", `${currentClass} gantt-header-sticky`);
        }
      }
    };

    // DOM の更新を待ってから sticky 処理を実行
    requestAnimationFrame(setupStickyHeader);

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
      style={{ 
        width: "100%",
        height: "100%",
        overflowX: "auto",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column"
      }}
    />
  );
};

export default GanttChart;
