import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

// Material (Procurement) schema
const materialSchema = z.object({
  item_name: z.string().min(1, "材料名は必須です"),
  qty: z.coerce.number().min(0.001, "数量は0より大きい値が必要です"),
  unit: z.string().min(1, "単位は必須です"),
  unit_price: z.coerce.number().min(0, "単価は0以上である必要があります"),
  vendor: z.string().optional(),
});

type MaterialFormData = z.infer<typeof materialSchema>;

interface Material {
  id: number;
  item_name: string;
  qty: number;
  unit: string | null;
  unit_price: number;
  vendor: string | null;
}

const UNIT_OPTIONS = ["個", "本", "kg", "m", "L", "枚", "箱", "セット"];

export default function MaterialManagement() {
  const { toast } = useToast();
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deletingMaterialId, setDeletingMaterialId] = useState<number | null>(null);

  // Fetch orders
  const { data: ordersData } = useQuery<{ data: any[] }>({
    queryKey: ["/api/orders"],
    enabled: true,
  });

  // Fetch materials for selected order
  const { data: materialsData, isLoading: materialsLoading } = useQuery<{ data: any[] }>({
    queryKey: ["/api/procurements", selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return { data: [] };
      const response = await fetch(`/api/procurements?order_id=${selectedOrderId}&kind=purchase`);
      if (!response.ok) throw new Error("Failed to fetch materials");
      return response.json();
    },
    enabled: !!selectedOrderId,
  });

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      item_name: "",
      qty: 1,
      unit: "個",
      unit_price: 0,
      vendor: "",
    },
  });

  // Create/Update material mutation
  const saveMutation = useMutation({
    mutationFn: async (data: MaterialFormData) => {
      const payload = {
        order_id: parseInt(selectedOrderId),
        kind: "purchase" as const,
        item_name: data.item_name,
        qty: data.qty,
        unit: data.unit,
        unit_price: data.unit_price,
        vendor: data.vendor || null,
        eta: new Date().toISOString(),
        status: "planned" as const,
      };

      const url = editingMaterial 
        ? `/api/procurements/${editingMaterial.id}`
        : "/api/procurements";
      
      const method = editingMaterial ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save material");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurements", selectedOrderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/production/material-costs"] });
      toast({
        title: editingMaterial ? "材料を更新しました" : "材料を追加しました",
        description: editingMaterial ? "材料情報が正常に更新されました" : "新しい材料が追加されました",
      });
      setIsAddDialogOpen(false);
      setEditingMaterial(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: editingMaterial ? "材料の更新に失敗しました" : "材料の追加に失敗しました",
        variant: "destructive",
      });
    },
  });

  // Delete material mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/procurements/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete material");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurements", selectedOrderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/production/material-costs"] });
      toast({
        title: "材料を削除しました",
        description: "材料が正常に削除されました",
      });
      setDeletingMaterialId(null);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "材料の削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleAddMaterial = () => {
    if (!selectedOrderId) {
      toast({
        title: "案件を選択してください",
        description: "材料を追加する前に案件を選択してください",
        variant: "destructive",
      });
      return;
    }
    setEditingMaterial(null);
    form.reset({
      item_name: "",
      qty: 1,
      unit: "個",
      unit_price: 0,
      vendor: "",
    });
    setIsAddDialogOpen(true);
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    form.reset({
      item_name: material.item_name,
      qty: material.qty,
      unit: material.unit || "個",
      unit_price: material.unit_price,
      vendor: material.vendor || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = (data: MaterialFormData) => {
    saveMutation.mutate(data);
  };

  const materials = materialsData?.data || [];
  const totalCost = materials.reduce((sum, m) => sum + (m.qty * m.unit_price), 0);

  const orders = ordersData?.data || [];
  const selectedOrder = orders.find(o => o && o.id && String(o.id) === selectedOrderId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">材料費管理</h1>
          <p className="text-muted-foreground mt-1">
            案件ごとの材料を管理します
          </p>
        </div>
        <Package className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Order Selection */}
      <Card data-testid="card-order-select">
        <CardHeader>
          <CardTitle>案件選択</CardTitle>
          <CardDescription>材料を管理する案件を選択してください</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
            <SelectTrigger data-testid="select-order" className="w-full">
              <SelectValue placeholder="案件を選択..." />
            </SelectTrigger>
            <SelectContent>
              {orders.filter(order => order && order.id).map((order) => (
                <SelectItem 
                  key={order.id} 
                  value={String(order.id)}
                  data-testid={`option-order-${order.id}`}
                >
                  {order.id} - {order.product_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Materials List */}
      {selectedOrderId && (
        <Card data-testid="card-materials-list">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>材料リスト</CardTitle>
                <CardDescription>
                  {selectedOrder && `${selectedOrder.product_name}の材料一覧`}
                </CardDescription>
              </div>
              <Button onClick={handleAddMaterial} data-testid="button-add-material">
                <Plus className="h-4 w-4 mr-2" />
                材料を追加
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {materialsLoading ? (
              <p className="text-center text-muted-foreground py-8">読み込み中...</p>
            ) : materials.length === 0 ? (
              <p className="text-center text-muted-foreground py-8" data-testid="text-no-materials">
                まだ材料が登録されていません
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>材料名</TableHead>
                      <TableHead className="text-right">単価</TableHead>
                      <TableHead className="text-right">数量</TableHead>
                      <TableHead className="w-20">単位</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead>仕入先</TableHead>
                      <TableHead className="w-24">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((material, index) => (
                      <TableRow key={material.id} data-testid={`row-material-${material.id}`}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium" data-testid={`text-material-name-${material.id}`}>
                          {material.item_name}
                        </TableCell>
                        <TableCell className="text-right">
                          ¥{material.unit_price.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">{material.qty}</TableCell>
                        <TableCell>{material.unit || "個"}</TableCell>
                        <TableCell className="text-right font-semibold" data-testid={`text-material-total-${material.id}`}>
                          ¥{(material.qty * material.unit_price).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {material.vendor || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditMaterial(material)}
                              data-testid={`button-edit-${material.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingMaterialId(material.id)}
                              data-testid={`button-delete-${material.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Total */}
                <div className="mt-6 flex justify-end">
                  <Card className="w-64">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">合計：</span>
                        <span className="text-2xl font-bold" data-testid="text-total-cost">
                          ¥{totalCost.toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-material-form">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? "材料を編集" : "材料を追加"}
            </DialogTitle>
            <DialogDescription>
              材料の詳細情報を入力してください
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="item_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>材料名</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="プラスチック部品A" 
                        {...field} 
                        data-testid="input-item-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unit_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>単価（円）</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="500" 
                          {...field} 
                          data-testid="input-unit-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>数量</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.001" 
                          placeholder="10" 
                          {...field} 
                          data-testid="input-qty"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>単位</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-unit">
                          <SelectValue placeholder="単位を選択" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNIT_OPTIONS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>仕入先（任意）</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ABC商事" 
                        {...field} 
                        data-testid="input-vendor"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  キャンセル
                </Button>
                <Button 
                  type="submit" 
                  disabled={saveMutation.isPending}
                  data-testid="button-save"
                >
                  {saveMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={deletingMaterialId !== null} 
        onOpenChange={(open) => !open && setDeletingMaterialId(null)}
      >
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>材料を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。本当にこの材料を削除しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingMaterialId && deleteMutation.mutate(deletingMaterialId)}
              data-testid="button-delete-confirm"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
