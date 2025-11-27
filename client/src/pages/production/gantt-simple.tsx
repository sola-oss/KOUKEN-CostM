import { useEffect, useState } from "react";
import { GanttChart, GanttTask } from "../../components/GanttChart";

const GanttSimple = () => {
  const [tasks, setTasks] = useState<GanttTask[]>([]);

  useEffect(() => {
    fetch("/api/production/orders/gantt")
      .then((res) => res.json())
      .then((data) => {
        setTasks(
          data.map((t: any) => ({
            id: t.id.toString(),
            name: t.name,
            start: t.start,
            end: t.end,
            progress: t.progress ?? 0,
          }))
        );
      });
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>案件別ガントチャート（frappe-gantt）</h2>
      {tasks.length === 0 ? (
        <p>読み込み中...</p>
      ) : (
        <GanttChart tasks={tasks} />
      )}
    </div>
  );
};

export default GanttSimple;
