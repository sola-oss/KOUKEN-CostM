import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Truck, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OutsourcingCostWithVendor, VendorMaster, Order } from "@shared/production-schema";

export default function OutsourcingCostsPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<OutsourcingCostWithVendor | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    project_id: "",
    vendor_id: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    note: ""
  });

  const { data: outsourcingCosts = [], isLoading } = useQuery<OutsourcingCostWithVendor[]>({
    queryKey: ['/api/outsourcing-costs', selectedProjectFilter],
    queryFn: async () => {
      const params = selectedProjectFilter !== "all" ? `?project_id=${selectedProjectFilter}` : '';
      const res = await fetch(`/api/outsourcing-costs${params}`);
      if (!res.ok) throw new Error('Failed to fetch outsourcing costs');
      return res.json();
    }
  });

  const { data: vendorsData = [] } = useQuery<VendorMaster[]>({
    queryKey: ['/api/vendors-master'],
    queryFn: async () => {
      const res = await fetch('/api/vendors-master?include_inactive=false');
      if (!res.ok) throw new Error('Failed to fetch vendors');
      return res.json();
    }
  });

  const { data: ordersData } = useQuery<{ data: Order[] }>({
    queryKey: ['/api/production/orders'],
    queryFn: async () => {
      const res = await fetch('/api/production/orders?page_size=1000');
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    }
  });

  const orders = ordersData?.data || [];

  const createMutation = useMutation({
    mutationFn: async (data: {
      project_id: string;
      vendor_id: number;
      description: string;
      amount: number;
      date: string;
      note?: string;
    }) => {
      return apiRequest('POST', '/api/outsourcing-costs', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/outsourcing-costs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-aggregation'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({ title: "外注費を追加しました" });
    },
    onError: (error: any) => {
      toast({ 
        title: "エラー", 
        description: error.message || "外注費の追加に失敗しました",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<{
      project_id: string;
      vendor_id: number;
      description: string;
      amount: number;
      date: string;
      note?: string;
    }> }) => {
      return apiRequest('PUT', `/api/outsourcing-costs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/outsourcing-costs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-aggregation'] });
      setEditingCost(null);
      resetForm();
      toast({ title: "外注費を更新しました" });
    },
    onError: (error: any) => {
      toast({ 
        title: "エラー", 
        description: error.message || "外注費の更新に失敗しました",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/outsourcing-costs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/outsourcing-costs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-aggregation'] });
      toast({ title: "外注費を削除しました" });
    },
    onError: (error: any) => {
      toast({ 
        title: "エラー", 
        description: error.message || "外注費の削除に失敗しました",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      project_id: "",
      vendor_id: "",
      description: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
      note: ""
    });
  };

  const handleAddCost = () => {
    const amount = parseFloat(formData.amount);
    if (!formData.project_id || !formData.vendor_id || !formData.description.trim() || isNaN(amount) || amount <= 0) {
      toast({ 
        title: "入力エラー", 
        description: "案件、外注先、内容、金額は必須です",
        variant: "destructive"
      });
      return;
    }
    createMutation.mutate({
      project_id: formData.project_id,
      vendor_id: parseInt(formData.vendor_id),
      description: formData.description.trim(),
      amount,
      date: formData.date,
      note: formData.note || undefined
    });
  };

  const handleUpdateCost = () => {
    if (!editingCost) return;
    const amount = parseFloat(formData.amount);
    if (!formData.project_id || !formData.vendor_id || !formData.description.trim() || isNaN(amount) || amount <= 0) {
      toast({ 
        title: "入力エラー", 
        description: "案件、外注先、内容、金額は必須です",
        variant: "destructive"
      });
      return;
    }
    updateMutation.mutate({ 
      id: editingCost.id, 
      data: {
        project_id: formData.project_id,
        vendor_id: parseInt(formData.vendor_id),
        description: formData.description.trim(),
        amount,
        date: formData.date,
        note: formData.note || undefined
      }
    });
  };

  const openEditDialog = (cost: OutsourcingCostWithVendor) => {
    setEditingCost(cost);
    setFormData({
      project_id: cost.project_id,
      vendor_id: cost.vendor_id.toString(),
      description: cost.description,
      amount: cost.amount.toString(),
      date: cost.date,
      note: cost.note || ""
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP');
  };

  const getProjectName = (projectId: string) => {
    const order = orders.find(o => o.order_id === projectId);
    return order ? `${order.order_id} - ${order.product_name}` : projectId;
  };

  const totalAmount = outsourcingCosts.reduce((sum, cost) => sum + cost.amount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">外注費入力</h1>
        </div>
        <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }} data-testid="button-add-cost">
          <Plus className="h-4 w-4 mr-2" />
          外注費を追加
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              外注費一覧
              <Badge variant="secondary">{outsourcingCosts.length}件</Badge>
              <Badge variant="outline">{formatCurrency(totalAmount)}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="project-filter" className="text-sm whitespace-nowrap">案件で絞込:</Label>
              <Select value={selectedProjectFilter} onValueChange={setSelectedProjectFilter}>
                <SelectTrigger className="w-[250px]" data-testid="select-project-filter">
                  <SelectValue placeholder="すべての案件" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての案件</SelectItem>
                  {orders.map((order) => (
                    <SelectItem key={order.order_id} value={order.order_id}>
                      {order.order_id} - {order.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : outsourcingCosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              外注費が登録されていません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead>案件</TableHead>
                  <TableHead>外注先</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outsourcingCosts.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell>{formatDate(cost.date)}</TableCell>
                    <TableCell className="font-medium">{getProjectName(cost.project_id)}</TableCell>
                    <TableCell>{cost.vendor_name || "-"}</TableCell>
                    <TableCell>{cost.description}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(cost.amount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEditDialog(cost)}
                          data-testid={`button-edit-${cost.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            if (confirm("この外注費を削除しますか？")) {
                              deleteMutation.mutate(cost.id);
                            }
                          }}
                          data-testid={`button-delete-${cost.id}`}
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

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>外注費を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project">案件 *</Label>
              <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
                <SelectTrigger data-testid="select-project">
                  <SelectValue placeholder="案件を選択" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((order) => (
                    <SelectItem key={order.order_id} value={order.order_id}>
                      {order.order_id} - {order.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">外注先 *</Label>
              <Select value={formData.vendor_id} onValueChange={(v) => setFormData({ ...formData, vendor_id: v })}>
                <SelectTrigger data-testid="select-vendor">
                  <SelectValue placeholder="外注先を選択" />
                </SelectTrigger>
                <SelectContent>
                  {vendorsData.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">内容 *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="外注内容を入力"
                data-testid="input-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">金額 *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="金額を入力"
                  data-testid="input-amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">日付</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  data-testid="input-date"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">備考</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="備考を入力"
                data-testid="input-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              キャンセル
            </Button>
            <Button 
              onClick={handleAddCost} 
              disabled={createMutation.isPending}
              data-testid="button-save-cost"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingCost} onOpenChange={() => setEditingCost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>外注費を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project">案件 *</Label>
              <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="案件を選択" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((order) => (
                    <SelectItem key={order.order_id} value={order.order_id}>
                      {order.order_id} - {order.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-vendor">外注先 *</Label>
              <Select value={formData.vendor_id} onValueChange={(v) => setFormData({ ...formData, vendor_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="外注先を選択" />
                </SelectTrigger>
                <SelectContent>
                  {vendorsData.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">内容 *</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="外注内容を入力"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-amount">金額 *</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="金額を入力"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date">日付</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-note">備考</Label>
              <Textarea
                id="edit-note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="備考を入力"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCost(null)}>
              キャンセル
            </Button>
            <Button 
              onClick={handleUpdateCost} 
              disabled={updateMutation.isPending}
              data-testid="button-update-cost"
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
