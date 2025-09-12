import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/ProjectCard";
import { Plus } from "lucide-react";

export default function Projects() {
  //todo: remove mock functionality
  const [projects] = useState([
    { id: "1", name: "製品A開発", budget: 500000, spent: 320000, status: "active" as const },
    { id: "2", name: "工場設備更新", budget: 1200000, spent: 850000, status: "active" as const },
    { id: "3", name: "品質管理システム", budget: 300000, spent: 300000, status: "completed" as const },
    { id: "4", name: "マーケティング戦略", budget: 800000, spent: 200000, status: "on_hold" as const },
  ]);

  const handleNewProject = () => {
    console.log("Create new project");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">プロジェクト管理</h1>
          <p className="text-muted-foreground mt-1">プロジェクト別の予算と進捗を管理</p>
        </div>
        <Button onClick={handleNewProject} data-testid="button-new-project">
          <Plus className="h-4 w-4 mr-2" />
          新規プロジェクト
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard 
            key={project.id} 
            project={project}
            onClick={() => console.log("Viewing project:", project.name)}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>プロジェクト概要</CardTitle>
          <CardDescription>全体の統計情報</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {projects.filter(p => p.status === "active").length}
              </div>
              <div className="text-sm text-muted-foreground">進行中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-chart-2">
                {projects.filter(p => p.status === "completed").length}
              </div>
              <div className="text-sm text-muted-foreground">完了</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-chart-3">
                {projects.filter(p => p.status === "on_hold").length}
              </div>
              <div className="text-sm text-muted-foreground">保留</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}