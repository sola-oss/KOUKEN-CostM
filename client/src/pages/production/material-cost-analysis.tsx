import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getMaterialCostAnalysis, type MaterialCostAnalysis, listProcurements, createProcurement, updateProcurement, deleteProcurement, type Procurement, type ProcurementPayload } from '@/shared/production-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingDown, TrendingUp, Plus, Edit, Trash2, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const materialSchema = z.object({
  item_name: z.string().min(1, "材料名は必須です"),
  unit_price: z.coerce.number().min(0, "単価は0以上で入力してください"),
  qty: z.coerce.number().min(0, "数量は0以上で入力してください"),
  unit: z.string().min(1, "単位は必須です"),
});

type MaterialFormData = z.infer<typeof materialSchema>;

export default function MaterialCostAnalysisPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Procurement | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingMaterialId, setDeletingMaterialId] = useState<number | null>(null);
  const { toast } = useToast();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/production/material-costs'],
    queryFn: getMaterialCostAnalysis,
  });

  const selectedOrder = data?.data.find(order => order.order_id === selectedOrderId);

  const { data: materialsData, isLoading: materialsLoading } = useQuery({
    queryKey: ['/api/procurements', selectedOrderId],
    queryFn: () => listProcurements({ 
      order_id: selectedOrderId!, 
      kind: 'purchase',
      page_size: 100
    }),
    enabled: selectedOrderId !== null && isDialogOpen,
  });

  const materials = materialsData?.data || [];

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      item_name: '',
      unit_price: 0,
      qty: 0,
      unit: '個',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ProcurementPayload) => createProcurement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/procurements', selectedOrderId] });
      queryClient.invalidateQueries({ queryKey: ['/api/production/material-costs'] });
      toast({ title: "材料を追加しました" });
      setIsFormOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "エラー", description: "材料の追加に失敗しました", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProcurementPayload> }) => 
      updateProcurement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/procurements', selectedOrderId] });
      queryClient.invalidateQueries({ queryKey: ['/api/production/material-costs'] });
      toast({ title: "材料を更新しました" });
      setIsFormOpen(false);
      setEditingMaterial(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "エラー", description: "材料の更新に失敗しました", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProcurement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/procurements', selectedOrderId] });
      queryClient.invalidateQueries({ queryKey: ['/api/production/material-costs'] });
      toast({ title: "材料を削除しました" });
      setIsDeleteDialogOpen(false);
      setDeletingMaterialId(null);
    },
    onError: () => {
      toast({ title: "エラー", description: "材料の削除に失敗しました", variant: "destructive" });
    },
  });

  const handleRowClick = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSelectedOrderId(null);
      setIsFormOpen(false);
      setEditingMaterial(null);
      form.reset();
    }
  };

  const handleAddMaterial = () => {
    setEditingMaterial(null);
    form.reset({
      item_name: '',
      unit_price: 0,
      qty: 0,
      unit: '個',
    });
    setIsFormOpen(true);
  };

  const handleEditMaterial = (material: Procurement) => {
    setEditingMaterial(material);
    form.reset({
      item_name: material.item_name || '',
      unit_price: material.unit_price || 0,
      qty: material.qty || 0,
      unit: material.unit || '個',
    });
    setIsFormOpen(true);
  };

  const handleDeleteMaterial = (id: number) => {
    setDeletingMaterialId(id);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (data: MaterialFormData) => {
    if (editingMaterial) {
      updateMutation.mutate({ 
        id: editingMaterial.id, 
        data: {
          item_name: data.item_name,
          unit_price: data.unit_price,
          qty: data.qty,
          unit: data.unit,
        }
      });
    } else {
      createMutation.mutate({
        order_id: selectedOrderId!,
        kind: 'purchase',
        item_name: data.item_name,
        unit_price: data.unit_price,
        qty: data.qty,
        unit: data.unit,
        status: 'planned',
        eta: new Date().toISOString(),
      });
    }
  };

  const totalMaterialCost = materials.reduce((sum, m) => sum + ((m.unit_price || 0) * (m.qty || 0)), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getVarianceBadge = (variance_pct: number) => {
    if (Math.abs(variance_pct) < 5) {
      return <Badge variant="secondary" data-testid={`badge-variance-ok`}>許容範囲</Badge>;
    } else if (variance_pct > 0) {
      return <Badge variant="destructive" data-testid={`badge-variance-over`}>超過</Badge>;
    } else {
      return <Badge variant="default" data-testid={`badge-variance-under`}>削減</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      pending: { label: '未着手', variant: 'secondary' },
      in_progress: { label: '進行中', variant: 'default' },
      completed: { label: '完了', variant: 'outline' },
    };
    const config = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive" data-testid="alert-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            データの取得に失敗しました。ページを再読み込みしてください。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const analysisData = data?.data || [];
  
  // サマリー計算
  const totalEstimated = analysisData.reduce((sum, item) => sum + item.estimated_material_cost, 0);
  const totalActual = analysisData.reduce((sum, item) => sum + item.actual_material_cost, 0);
  const totalVariance = totalActual - totalEstimated;
  const totalVariancePct = totalEstimated > 0 ? (totalVariance / totalEstimated) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="heading-title">材料費分析</h1>
        <p className="text-muted-foreground" data-testid="text-description">
          案件ごとの見込み材料費と実際の購買費用を比較します
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>見込み材料費合計</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-estimated">
                {formatCurrency(totalEstimated)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>実際の購買費用合計</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-actual">
                {formatCurrency(totalActual)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>差異</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="flex items-center gap-2">
                {totalVariance > 0 ? (
                  <TrendingUp className="h-5 w-5 text-destructive" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-primary" />
                )}
                <div className={`text-2xl font-bold ${totalVariance > 0 ? 'text-destructive' : 'text-primary'}`} data-testid="text-total-variance">
                  {formatCurrency(Math.abs(totalVariance))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>差異率</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className={`text-2xl font-bold ${totalVariancePct > 0 ? 'text-destructive' : 'text-primary'}`} data-testid="text-total-variance-pct">
                {formatPercentage(totalVariancePct)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* データテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>案件別材料費詳細</CardTitle>
          <CardDescription>全{analysisData.length}件の案件</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20" data-testid="header-order-id">案件ID</TableHead>
                  <TableHead data-testid="header-product">製品名</TableHead>
                  <TableHead data-testid="header-customer">顧客</TableHead>
                  <TableHead className="text-right" data-testid="header-estimated">見込み材料費</TableHead>
                  <TableHead className="text-right" data-testid="header-actual">実際の購買費用</TableHead>
                  <TableHead className="text-right" data-testid="header-variance">差異</TableHead>
                  <TableHead className="text-right" data-testid="header-variance-pct">差異率</TableHead>
                  <TableHead className="text-center" data-testid="header-purchase-count">購買件数</TableHead>
                  <TableHead className="text-center" data-testid="header-status">ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysisData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground" data-testid="text-no-data">
                      データがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  analysisData.map((item: MaterialCostAnalysis) => (
                    <TableRow 
                      key={item.order_id} 
                      data-testid={`row-order-${item.order_id}`}
                      className="cursor-pointer hover-elevate"
                      onClick={() => handleRowClick(item.order_id)}
                    >
                      <TableCell className="font-medium" data-testid={`cell-order-id-${item.order_id}`}>
                        #{item.order_id}
                      </TableCell>
                      <TableCell data-testid={`cell-product-${item.order_id}`}>
                        {item.product_name}
                      </TableCell>
                      <TableCell data-testid={`cell-customer-${item.order_id}`}>
                        {item.customer_name || '-'}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-estimated-${item.order_id}`}>
                        {formatCurrency(item.estimated_material_cost)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-actual-${item.order_id}`}>
                        {formatCurrency(item.actual_material_cost)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-variance-${item.order_id}`}>
                        <div className="flex items-center justify-end gap-1">
                          {item.variance > 0 ? (
                            <TrendingUp className="h-4 w-4 text-destructive" />
                          ) : item.variance < 0 ? (
                            <TrendingDown className="h-4 w-4 text-primary" />
                          ) : null}
                          <span className={item.variance > 0 ? 'text-destructive' : item.variance < 0 ? 'text-primary' : ''}>
                            {formatCurrency(item.variance)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-variance-pct-${item.order_id}`}>
                        <div className="flex items-center justify-end gap-2">
                          <span className={item.variance_pct > 0 ? 'text-destructive' : item.variance_pct < 0 ? 'text-primary' : ''}>
                            {formatPercentage(item.variance_pct)}
                          </span>
                          {getVarianceBadge(item.variance_pct)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center" data-testid={`cell-purchase-count-${item.order_id}`}>
                        {item.purchase_count}件
                      </TableCell>
                      <TableCell className="text-center" data-testid={`cell-status-${item.order_id}`}>
                        {getStatusBadge(item.status)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 材料明細ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-material-details">
          <DialogHeader>
            <DialogTitle>
              案件#{selectedOrderId} - {selectedOrder?.product_name} - 材料費明細
            </DialogTitle>
            <DialogDescription>
              この案件の材料費を管理します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 案件情報サマリー */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">顧客：</span>
                    <span className="ml-2 font-medium">{selectedOrder?.customer_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">見込み材料費：</span>
                    <span className="ml-2 font-medium">{formatCurrency(selectedOrder?.estimated_material_cost || 0)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">実際の購買費用：</span>
                    <span className="ml-2 font-medium">{formatCurrency(totalMaterialCost)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 材料追加ボタン */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">材料一覧</h3>
              <Button onClick={handleAddMaterial} size="sm" data-testid="button-add-material">
                <Plus className="h-4 w-4 mr-1" />
                材料追加
              </Button>
            </div>

            {/* 材料一覧テーブル */}
            {materialsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead data-testid="header-material-name">材料名</TableHead>
                      <TableHead className="text-right" data-testid="header-unit-price">単価</TableHead>
                      <TableHead className="text-right" data-testid="header-quantity">数量</TableHead>
                      <TableHead className="text-center" data-testid="header-unit">単位</TableHead>
                      <TableHead className="text-right" data-testid="header-amount">金額</TableHead>
                      <TableHead className="w-24" data-testid="header-actions">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground" data-testid="text-no-materials">
                          材料が登録されていません
                        </TableCell>
                      </TableRow>
                    ) : (
                      materials.map((material) => {
                        const amount = (material.unit_price || 0) * (material.qty || 0);
                        return (
                          <TableRow key={material.id} data-testid={`row-material-${material.id}`}>
                            <TableCell data-testid={`cell-material-name-${material.id}`}>
                              {material.item_name || '-'}
                            </TableCell>
                            <TableCell className="text-right" data-testid={`cell-unit-price-${material.id}`}>
                              {formatCurrency(material.unit_price || 0)}
                            </TableCell>
                            <TableCell className="text-right" data-testid={`cell-quantity-${material.id}`}>
                              {material.qty || 0}
                            </TableCell>
                            <TableCell className="text-center" data-testid={`cell-unit-${material.id}`}>
                              {material.unit || '個'}
                            </TableCell>
                            <TableCell className="text-right font-medium" data-testid={`cell-amount-${material.id}`}>
                              {formatCurrency(amount)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditMaterial(material)}
                                  data-testid={`button-edit-${material.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteMaterial(material.id)}
                                  data-testid={`button-delete-${material.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                    {materials.length > 0 && (
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell colSpan={4} className="text-right" data-testid="cell-total-label">
                          合計
                        </TableCell>
                        <TableCell className="text-right" data-testid="cell-total-amount">
                          {formatCurrency(totalMaterialCost)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 材料追加・編集フォームダイアログ */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent data-testid="dialog-material-form">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? '材料を編集' : '材料を追加'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="item_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>材料名</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="例：アルミ板" data-testid="input-material-name" />
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
                          {...field} 
                          type="number" 
                          step="0.01"
                          placeholder="0"
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
                          {...field} 
                          type="number" 
                          step="0.01"
                          placeholder="0"
                          data-testid="input-quantity" 
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
                        <SelectItem value="個">個</SelectItem>
                        <SelectItem value="本">本</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="m">m</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="枚">枚</SelectItem>
                        <SelectItem value="箱">箱</SelectItem>
                        <SelectItem value="セット">セット</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsFormOpen(false)}
                  data-testid="button-cancel-form"
                >
                  キャンセル
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-form"
                >
                  {editingMaterial ? '更新' : '追加'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-confirm">
          <DialogHeader>
            <DialogTitle>材料を削除</DialogTitle>
            <DialogDescription>
              この材料を削除してもよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              キャンセル
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deletingMaterialId && deleteMutation.mutate(deletingMaterialId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
