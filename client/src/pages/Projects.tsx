import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen, Edit, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@shared/schema";

export default function Projects() {
  const { toast } = useToast();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete project");
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "プロジェクトを削除しました",
        description: "プロジェクトの削除が完了しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "プロジェクトの削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleNewProject = () => {
    console.log("Create new project");
    // TODO: Open project creation dialog
  };

  const handleEditProject = (project: Project) => {
    console.log("Edit project:", project.name);
    // TODO: Open project edit dialog
  };

  const handleDeleteProject = (id: string) => {
    if (confirm("このプロジェクトを削除してもよろしいですか？")) {
      deleteMutation.mutate(id);
    }
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return "¥0";
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(Number(amount));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">進行中</Badge>;
      case "completed":
        return <Badge className="bg-green-500 hover:bg-green-600">完了</Badge>;
      case "on_hold":
        return <Badge variant="secondary">保留</Badge>;
      case "planning":
        return <Badge variant="outline">計画中</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">プロジェクト管理</h1>
          <p className="text-muted-foreground mt-1">製造プロジェクトの予算と進捗を管理</p>
        </div>
        <Button onClick={handleNewProject} data-testid="button-new-project">
          <Plus className="h-4 w-4 mr-2" />
          新規プロジェクト
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">プロジェクトが登録されていません</h3>
            <p className="text-muted-foreground text-center mb-4">
              最初のプロジェクトを作成して原価管理を開始しましょう
            </p>
            <Button onClick={handleNewProject}>
              <Plus className="h-4 w-4 mr-2" />
              プロジェクトを作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="hover-elevate">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg mb-1">{project.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {project.description || "説明なし"}
                      </CardDescription>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">予算</div>
                        <div className="font-semibold text-primary">
                          {formatCurrency(project.estimatedBudget)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">見積工数</div>
                        <div className="font-semibold">
                          {project.estimatedHours ? `${Number(project.estimatedHours).toFixed(1)}h` : "-"}
                        </div>
                      </div>
                    </div>
                    
                    {project.clientName && (
                      <div className="text-sm">
                        <div className="text-muted-foreground">顧客</div>
                        <div className="font-medium">{project.clientName}</div>
                      </div>
                    )}

                    {(project.startDate || project.endDate) && (
                      <div className="text-sm">
                        <div className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          期間
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {project.startDate && format(new Date(project.startDate), "yyyy/MM/dd", { locale: ja })}
                          {project.startDate && project.endDate && " - "}
                          {project.endDate && format(new Date(project.endDate), "yyyy/MM/dd", { locale: ja })}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditProject(project)}
                        data-testid={`button-edit-project-${project.id}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        編集
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteProject(project.id)}
                        data-testid={`button-delete-project-${project.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        削除
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>プロジェクト概要</CardTitle>
              <CardDescription>全体の統計情報</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    {projects.filter(p => p.status === "planning").length}
                  </div>
                  <div className="text-sm text-muted-foreground">計画中</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-chart-4">
                    {projects.filter(p => p.status === "on_hold").length}
                  </div>
                  <div className="text-sm text-muted-foreground">保留</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}