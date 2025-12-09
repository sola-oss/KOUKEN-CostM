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

    // カスタムwheelイベントハンドラ
    // frappe-ganttの内部ハンドラがdeltaYを横スクロールに変換してしまうので、
    // それを防いで縦/横スクロールを適切に振り分ける
    const container = containerRef.current;
    const svgElement = container.querySelector("svg");

    const handleWheel = (e: WheelEvent) => {
      const ganttContainer = container.querySelector(".gantt-container") as HTMLElement;
      
      // 縦スクロール用のヘルパー関数
      const applyVerticalScroll = (delta: number): boolean => {
        const scrollableParent = findScrollableParent(container);
        if (scrollableParent) {
          scrollableParent.scrollTop += delta;
          return true;
        }
        const parent = container.parentElement;
        if (parent && parent.scrollHeight > parent.clientHeight) {
          parent.scrollTop += delta;
          return true;
        }
        return false;
      };
      
      // トラックパッドの横スクロール（deltaXが0でない場合）
      if (e.deltaX !== 0) {
        let handled = false;
        if (ganttContainer) {
          ganttContainer.scrollLeft += e.deltaX;
          handled = true;
        }
        // deltaYも同時にある場合は縦スクロールも適用
        if (e.deltaY !== 0) {
          if (applyVerticalScroll(e.deltaY)) {
            handled = true;
          }
        }
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      // Shift+ホイールで横スクロール
      if (e.shiftKey) {
        if (ganttContainer) {
          e.preventDefault();
          e.stopPropagation();
          ganttContainer.scrollLeft += e.deltaY;
        }
        return;
      }

      // 通常のホイール → 縦スクロール
      if (applyVerticalScroll(e.deltaY)) {
        e.preventDefault();
        e.stopPropagation();
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
