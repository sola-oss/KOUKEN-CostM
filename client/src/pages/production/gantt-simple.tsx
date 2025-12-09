import { useEffect, useState } from "react";
import { GanttChart, GanttTask } from "../../components/GanttChart";

const GanttSimple = () => {
  const [tasks, setTasks] = useState<GanttTask[]>([]);

  useEffect(() => {
    fetch("/api/production/orders/gantt")
      .then((res) => res.json())
      .then((data) => {
        setTasks(
          data
            .map((t: any) => {
              let start = t.start;
              let end = t.end;

              // endがnullの場合、start + 14日をデフォルトに
              if (!end && start) {
                const startDate = new Date(start);
                startDate.setDate(startDate.getDate() + 14);
                end = startDate.toISOString().split("T")[0];
              }

              // start > end の場合、日付を入れ替え
              if (start && end && new Date(start) > new Date(end)) {
                [start, end] = [end, start];
              }

              return {
                id: t.id.toString(),
                name: t.name,
                start,
                end,
                progress: t.progress ?? 0,
              };
            })
            .filter((t: GanttTask) => t.start && t.end) // start/endが両方あるものだけ
        );
      });
  }, []);

  return (
    <div className="gantt-wrapper">
      <div
        style={{
          padding: 20,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <h2 style={{ marginBottom: 12 }}>案件別ガントチャート（frappe-gantt）</h2>

        <div
          style={{
            flex: 1,
            overflow: "auto",
          }}
        >
          <div style={{ minWidth: 1200 }}>
            {tasks.length === 0 ? (
              <p>読み込み中...</p>
            ) : (
              <GanttChart tasks={tasks} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttSimple;
