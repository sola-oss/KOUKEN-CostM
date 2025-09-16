import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Worker } from "@shared/schema";

export default function Workers() {
  const { toast } = useToast();
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  const { data: workers = [], isLoading } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/workers/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete worker");
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workers"] });
      toast({
        title: "作業者を削除しました",
        description: "作業者の削除が完了しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "作業者の削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleNewWorker = () => {
    console.log("Create new worker");
    // TODO: Open worker creation dialog
  };

  const handleEditWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    console.log("Edit worker:", worker.name);
    // TODO: Open worker edit dialog
  };

  const handleDeleteWorker = (id: string) => {
    if (confirm("この作業者を削除してもよろしいですか？")) {
      deleteMutation.mutate(id);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(Number(amount));
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
          <h1 className="text-3xl font-semibold text-foreground">作業者管理</h1>
          <p className="text-muted-foreground mt-1">作業者情報と時給の管理</p>
        </div>
        <Button onClick={handleNewWorker} data-testid="button-new-worker">
          <Plus className="h-4 w-4 mr-2" />
          新規作業者
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.map((worker) => (
          <Card key={worker.id} className="hover-elevate">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{worker.name}</CardTitle>
                    <CardDescription>{worker.role || "作業者"}</CardDescription>
                  </div>
                </div>
                <Badge variant={worker.isActive === "true" ? "default" : "secondary"}>
                  {worker.isActive === "true" ? "稼働中" : "非稼働"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">時給</div>
                  <div className="text-xl font-semibold text-primary">
                    {formatCurrency(worker.hourlyRate)}
                  </div>
                </div>
                {worker.department && (
                  <div>
                    <div className="text-sm text-muted-foreground">部署</div>
                    <div className="text-sm font-medium">{worker.department}</div>
                  </div>
                )}
                <div className="flex gap-2 pt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEditWorker(worker)}
                    data-testid={`button-edit-worker-${worker.id}`}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    編集
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDeleteWorker(worker.id)}
                    data-testid={`button-delete-worker-${worker.id}`}
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

      {workers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">作業者が登録されていません</h3>
            <p className="text-muted-foreground text-center mb-4">
              最初の作業者を登録して工数管理を開始しましょう
            </p>
            <Button onClick={handleNewWorker}>
              <Plus className="h-4 w-4 mr-2" />
              作業者を追加
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>作業者概要</CardTitle>
          <CardDescription>全体の統計情報</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {workers.filter((w) => w.isActive === "true").length}
              </div>
              <div className="text-sm text-muted-foreground">稼働中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-chart-2">
                {workers.length}
              </div>
              <div className="text-sm text-muted-foreground">総作業者数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-chart-3">
                {workers.length > 0 
                  ? formatCurrency(
                      (workers.reduce((sum, w) => sum + Number(w.hourlyRate), 0) / workers.length).toString()
                    ).replace("¥", "¥")
                  : "¥0"
                }
              </div>
              <div className="text-sm text-muted-foreground">平均時給</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}