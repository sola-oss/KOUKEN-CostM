import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, FolderOpen, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Material, Project } from "@shared/schema";

export default function Materials() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("all");

  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["/api/materials", selectedProject !== "all" ? selectedProject : undefined].filter(Boolean),
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/materials/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete material");
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
      toast({
        title: "材料を削除しました",
        description: "材料の削除が完了しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "材料の削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleNewMaterial = () => {
    console.log("Create new material");
    // TODO: Open material creation dialog
  };

  const handleEditMaterial = (material: Material) => {
    console.log("Edit material:", material.name);
    // TODO: Open material edit dialog
  };

  const handleDeleteMaterial = (id: string) => {
    if (confirm("この材料を削除してもよろしいですか？")) {
      deleteMutation.mutate(id);
    }
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || "Unknown";
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(Number(amount));
  };

  const calculateTotalCost = () => {
    return materials.reduce((sum, material) => sum + Number(material.totalCost), 0);
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
          <h1 className="text-3xl font-semibold text-foreground">材料管理</h1>
          <p className="text-muted-foreground mt-1">プロジェクト別の材料費管理</p>
        </div>
        <Button onClick={handleNewMaterial} data-testid="button-new-material">
          <Plus className="h-4 w-4 mr-2" />
          材料追加
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>材料費概要</CardTitle>
          <CardDescription>全プロジェクトの材料費統計</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(calculateTotalCost().toString())}
              </div>
              <div className="text-sm text-muted-foreground">総材料費</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-chart-2">
                {materials.length}
              </div>
              <div className="text-sm text-muted-foreground">材料種類数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-chart-3">
                {materials.length > 0 
                  ? formatCurrency((calculateTotalCost() / materials.length).toString())
                  : "¥0"
                }
              </div>
              <div className="text-sm text-muted-foreground">平均単価</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">材料一覧</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">プロジェクト:</label>
            <select 
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="all">全て</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {materials.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">材料が登録されていません</h3>
              <p className="text-muted-foreground text-center mb-4">
                最初の材料を登録して材料費管理を開始しましょう
              </p>
              <Button onClick={handleNewMaterial}>
                <Plus className="h-4 w-4 mr-2" />
                材料を追加
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {materials.map((material) => (
              <Card key={material.id} className="hover-elevate">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-lg">{material.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {getProjectName(material.projectId)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">数量</div>
                          <div className="font-medium">
                            {Number(material.quantity).toLocaleString()} {material.unit}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">単価</div>
                          <div className="font-medium">
                            {formatCurrency(material.unitCost)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">総額</div>
                          <div className="font-semibold text-primary">
                            {formatCurrency(material.totalCost)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">購入日</div>
                          <div className="font-medium">
                            {material.purchaseDate 
                              ? format(new Date(material.purchaseDate), "yyyy/MM/dd", { locale: ja })
                              : "未設定"
                            }
                          </div>
                        </div>
                      </div>
                      
                      {material.supplier && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">供給元: </span>
                          <Badge variant="outline">{material.supplier}</Badge>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditMaterial(material)}
                        data-testid={`button-edit-material-${material.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteMaterial(material.id)}
                        data-testid={`button-delete-material-${material.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}