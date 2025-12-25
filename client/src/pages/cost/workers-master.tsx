import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import type { WorkerMaster } from "@shared/production-schema";

export default function WorkersMasterPage() {
  const { toast } = useToast();
  const [showInactive, setShowInactive] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<WorkerMaster | null>(null);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerRate, setNewWorkerRate] = useState("");

  const { data: workers = [], isLoading } = useQuery<WorkerMaster[]>({
    queryKey: ['/api/workers-master', showInactive],
    queryFn: async () => {
      const res = await fetch(`/api/workers-master?include_inactive=${showInactive}`);
      if (!res.ok) throw new Error('Failed to fetch workers');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; hourly_rate: number }) => {
      return apiRequest('POST', '/api/workers-master', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workers-master'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-aggregation'] });
      setIsAddDialogOpen(false);
      setNewWorkerName("");
      setNewWorkerRate("");
      toast({ title: "作業者を追加しました" });
    },
    onError: (error: any) => {
      toast({ 
        title: "エラー", 
        description: error.message || "作業者の追加に失敗しました",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<{ name: string; hourly_rate: number; is_active: boolean }> }) => {
      return apiRequest('PUT', `/api/workers-master/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workers-master'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-aggregation'] });
      setEditingWorker(null);
      setNewWorkerName("");
      setNewWorkerRate("");
      toast({ title: "作業者を更新しました" });
    },
    onError: (error: any) => {
      toast({ 
        title: "エラー", 
        description: error.message || "作業者の更新に失敗しました",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/workers-master/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workers-master'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-aggregation'] });
      toast({ title: "作業者を削除しました" });
    },
    onError: (error: any) => {
      toast({ 
        title: "エラー", 
        description: error.message || "作業者の削除に失敗しました",
        variant: "destructive"
      });
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
  };

  const handleAddWorker = () => {
    const rate = parseFloat(newWorkerRate);
    if (!newWorkerName.trim() || isNaN(rate) || rate <= 0) {
      toast({ 
        title: "入力エラー", 
        description: "作業者名と有効な時間単価を入力してください",
        variant: "destructive"
      });
      return;
    }
    createMutation.mutate({ name: newWorkerName.trim(), hourly_rate: rate });
  };

  const handleUpdateWorker = () => {
    if (!editingWorker) return;
    const rate = parseFloat(newWorkerRate);
    if (!newWorkerName.trim() || isNaN(rate) || rate <= 0) {
      toast({ 
        title: "入力エラー", 
        description: "作業者名と有効な時間単価を入力してください",
        variant: "destructive"
      });
      return;
    }
    updateMutation.mutate({ 
      id: editingWorker.id, 
      data: { name: newWorkerName.trim(), hourly_rate: rate } 
    });
  };

  const handleToggleActive = (worker: WorkerMaster) => {
    updateMutation.mutate({ 
      id: worker.id, 
      data: { is_active: !worker.is_active } 
    });
  };

  const openEditDialog = (worker: WorkerMaster) => {
    setEditingWorker(worker);
    setNewWorkerName(worker.name);
    setNewWorkerRate(worker.hourly_rate.toString());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">作業者マスタ</h1>
            <p className="text-sm text-muted-foreground">作業者別の時間単価を管理します</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
              data-testid="switch-show-inactive"
            />
            <Label htmlFor="show-inactive">非アクティブを表示</Label>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-worker">
                <Plus className="h-4 w-4 mr-2" />
                作業者を追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>作業者を追加</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="worker-name">作業者名</Label>
                  <Input
                    id="worker-name"
                    placeholder="例: 田中太郎"
                    value={newWorkerName}
                    onChange={(e) => setNewWorkerName(e.target.value)}
                    data-testid="input-worker-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourly-rate">時間単価（円/時間）</Label>
                  <Input
                    id="hourly-rate"
                    type="number"
                    placeholder="例: 3000"
                    value={newWorkerRate}
                    onChange={(e) => setNewWorkerRate(e.target.value)}
                    data-testid="input-hourly-rate"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">キャンセル</Button>
                </DialogClose>
                <Button 
                  onClick={handleAddWorker}
                  disabled={createMutation.isPending}
                  data-testid="button-save-worker"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  追加
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">登録済み作業者</CardTitle>
        </CardHeader>
        <CardContent>
          {workers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              作業者が登録されていません。「作業者を追加」ボタンから追加してください。
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>作業者名</TableHead>
                  <TableHead className="text-right">時間単価</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((worker) => (
                  <TableRow key={worker.id} data-testid={`row-worker-${worker.id}`}>
                    <TableCell className="font-medium">{worker.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(worker.hourly_rate)}/時間</TableCell>
                    <TableCell>
                      {worker.is_active ? (
                        <Badge variant="default" className="bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          アクティブ
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <X className="h-3 w-3 mr-1" />
                          非アクティブ
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(worker)}
                          data-testid={`button-edit-worker-${worker.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleToggleActive(worker)}
                          data-testid={`button-toggle-worker-${worker.id}`}
                        >
                          {worker.is_active ? (
                            <X className="h-4 w-4 text-amber-600" />
                          ) : (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(worker.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-worker-${worker.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">労務費計算について</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>労務費は以下の式で計算されます：</p>
          <p className="font-mono bg-muted p-2 rounded">労務費 = 作業時間 × 作業者単価</p>
          <ul className="list-disc list-inside space-y-1">
            <li>作業者マスタに登録された作業者は、その作業者専用の時間単価が適用されます</li>
            <li>マスタ未登録の作業者は、デフォルト単価（単価マスタで設定）が適用されます</li>
            <li>非アクティブな作業者でも、過去の作業記録には登録時の単価が適用されます</li>
          </ul>
        </CardContent>
      </Card>

      <Dialog open={!!editingWorker} onOpenChange={(open) => !open && setEditingWorker(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>作業者を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-worker-name">作業者名</Label>
              <Input
                id="edit-worker-name"
                placeholder="例: 田中太郎"
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
                data-testid="input-edit-worker-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-hourly-rate">時間単価（円/時間）</Label>
              <Input
                id="edit-hourly-rate"
                type="number"
                placeholder="例: 3000"
                value={newWorkerRate}
                onChange={(e) => setNewWorkerRate(e.target.value)}
                data-testid="input-edit-hourly-rate"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWorker(null)}>
              キャンセル
            </Button>
            <Button 
              onClick={handleUpdateWorker}
              disabled={updateMutation.isPending}
              data-testid="button-update-worker"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
