// Production Management MVP - Material Usages Input (材料使用入力)
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, Plus, Weight, Package } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: number;
  order_id: string;
  project_title: string | null;
  client_name: string | null;
}

interface Material {
  id: number;
  material_type: string;
  name: string;
  size: string;
  unit: string;
  unit_weight: number | null;
  remark: string | null;
}

interface MaterialUsageWithMaterial {
  id: number;
  project_id: string;
  area: string | null;
  zone: string | null;
  drawing_no: string | null;
  material_id: number;
  quantity: number;
  length: number | null;
  remark: string | null;
  created_at: string;
  material_type: string;
  material_name: string;
  material_size: string;
  unit: string;
  unit_weight: number | null;
  total_weight: number | null;
}

const materialUsageFormSchema = z.object({
  material_id: z.coerce.number().min(1, "材料を選択してください"),
  quantity: z.coerce.number().min(1, "数量は1以上にしてください"),
  length: z.coerce.number().positive("長さを入力してください"),
  drawing_no: z.string().optional(),
  remark: z.string().optional(),
});

type MaterialUsageFormData = z.infer<typeof materialUsageFormSchema>;

const ZONES = ["N工区", "S工区"] as const;

export default function MaterialUsages() {
  const { toast } = useToast();
  
  // Step 1: Project and Zone selection (sticky context)
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedZone, setSelectedZone] = useState<string>("");

  // Fetch orders for project selection
  const { data: ordersResponse } = useQuery({
    queryKey: ['/api/production/orders'],
    queryFn: async () => {
      const res = await fetch('/api/production/orders?page_size=200');
      return res.json();
    }
  });

  // Fetch materials
  const { data: materialsResponse, isLoading: isLoadingMaterials } = useQuery({
    queryKey: ['/api/materials'],
    queryFn: async () => {
      const res = await fetch('/api/materials');
      return res.json();
    }
  });

  // Fetch usages filtered by selected project
  const { data: usagesResponse, isLoading: isLoadingUsages } = useQuery({
    queryKey: ['/api/material-usages', selectedProjectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedProjectId) params.append('project_id', selectedProjectId);
      const res = await fetch(`/api/material-usages?${params.toString()}`);
      return res.json();
    },
    enabled: !!selectedProjectId
  });

  const orders: Order[] = ordersResponse?.data || [];
  const materials: Material[] = materialsResponse?.data || [];
  const allUsages: MaterialUsageWithMaterial[] = usagesResponse?.data || [];
  
  // Filter usages by zone as well
  const usages = useMemo(() => {
    if (!selectedZone) return allUsages;
    return allUsages.filter(u => u.zone === selectedZone);
  }, [allUsages, selectedZone]);

  // Group materials by type for easier selection
  const materialsByType = useMemo(() => {
    const grouped: Record<string, Material[]> = {};
    materials.forEach(m => {
      if (!grouped[m.material_type]) grouped[m.material_type] = [];
      grouped[m.material_type].push(m);
    });
    return grouped;
  }, [materials]);

  const form = useForm<MaterialUsageFormData>({
    resolver: zodResolver(materialUsageFormSchema),
    defaultValues: {
      material_id: 0,
      quantity: 1,
      length: undefined,
      drawing_no: "",
      remark: "",
    }
  });

  const watchMaterialId = form.watch("material_id");
  const watchLength = form.watch("length");
  const watchQuantity = form.watch("quantity");

  const selectedMaterial = materials.find(m => m.id === Number(watchMaterialId));

  const calculatedWeight = useMemo(() => {
    if (!watchMaterialId || !watchLength || !watchQuantity) return null;
    const material = materials.find(m => m.id === Number(watchMaterialId));
    if (!material?.unit_weight) return null;
    const len = typeof watchLength === 'number' ? watchLength : parseFloat(String(watchLength));
    if (isNaN(len) || len <= 0) return null;
    return material.unit_weight * len * watchQuantity;
  }, [watchMaterialId, watchLength, watchQuantity, materials]);

  // Calculate summary for current selection
  const summary = useMemo(() => {
    const totalWeight = usages.reduce((sum, u) => sum + (u.total_weight || 0), 0);
    const totalQuantity = usages.reduce((sum, u) => sum + u.quantity, 0);
    return { totalWeight, totalQuantity, count: usages.length };
  }, [usages]);

  const createMutation = useMutation({
    mutationFn: async (data: MaterialUsageFormData) => {
      const payload = {
        project_id: selectedProjectId,
        zone: selectedZone || undefined,
        material_id: data.material_id,
        quantity: data.quantity,
        length: data.length,
        drawing_no: data.drawing_no || undefined,
        remark: data.remark || undefined,
      };
      const res = await apiRequest('POST', '/api/material-usages', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/material-usages'] });
      toast({
        title: "登録完了",
        description: "材料使用を登録しました"
      });
      // Reset form but keep material selection for continuous entry
      form.reset({
        material_id: 0,
        quantity: 1,
        length: undefined,
        drawing_no: "",
        remark: "",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "登録に失敗しました",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: MaterialUsageFormData) => {
    if (!selectedProjectId) {
      toast({
        title: "案件を選択してください",
        variant: "destructive"
      });
      return;
    }
    createMutation.mutate(data);
  };

  const isContextSet = !!selectedProjectId;

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Layers className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">材料使用入力</h1>
      </div>

      {/* Step 1: Context Selection - Always visible at top */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            案件・工区を選択
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">案件 *</label>
              <Select 
                value={selectedProjectId} 
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger data-testid="select-project">
                  <SelectValue placeholder="案件を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((order) => (
                    <SelectItem key={order.order_id} value={order.order_id}>
                      {order.order_id} - {order.project_title || order.client_name || '(名称なし)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">工区</label>
              <Select 
                value={selectedZone || "__all__"} 
                onValueChange={(v) => setSelectedZone(v === "__all__" ? "" : v)}
              >
                <SelectTrigger data-testid="select-zone">
                  <SelectValue placeholder="工区を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">すべて</SelectItem>
                  {ZONES.map((zone) => (
                    <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isContextSet && (
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="secondary">{selectedProjectId}</Badge>
              {selectedZone && <Badge variant="outline">{selectedZone}</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main content - only show when context is set */}
      {isContextSet ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Input Form */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                材料を登録
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="material_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>材料 *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value ? String(field.value) : ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-material">
                              <SelectValue placeholder="材料を選択" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(materialsByType).map(([type, mats]) => (
                              <div key={type}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                                  {type}
                                </div>
                                {mats.map((material) => (
                                  <SelectItem key={material.id} value={String(material.id)}>
                                    {material.name} ({material.size})
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedMaterial && (
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      <div>単位: {selectedMaterial.unit}</div>
                      {selectedMaterial.unit_weight && (
                        <div>単位重量: {selectedMaterial.unit_weight} kg/{selectedMaterial.unit}</div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>数量 *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              {...field} 
                              data-testid="input-quantity"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="length"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>長さ (m) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              min="0.01"
                              placeholder="3.5"
                              {...field}
                              value={field.value ?? ""}
                              data-testid="input-length"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Weight display - prominent */}
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Weight className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">計算重量</span>
                    </div>
                    <div className="text-2xl font-bold text-primary" data-testid="text-calculated-weight">
                      {calculatedWeight !== null 
                        ? `${calculatedWeight.toFixed(2)} kg`
                        : "--- kg"
                      }
                    </div>
                    {calculatedWeight !== null && selectedMaterial?.unit_weight && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {selectedMaterial.unit_weight} × {watchLength} × {watchQuantity}
                      </div>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="drawing_no"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>図面番号</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="A-001" 
                            {...field} 
                            data-testid="input-drawing-no"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="remark"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>備考</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="備考" 
                            {...field} 
                            data-testid="input-remark"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full"
                    size="lg"
                    disabled={createMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending ? "登録中..." : "登録"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Usage List */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">登録済み一覧</CardTitle>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {summary.count}件
                  </span>
                  <Badge variant="secondary" className="font-mono">
                    合計: {summary.totalWeight.toFixed(1)} kg
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingUsages ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : usages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  この案件{selectedZone ? `・${selectedZone}` : ''}にはまだ材料使用データがありません
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>工区</TableHead>
                        <TableHead>材料</TableHead>
                        <TableHead>サイズ</TableHead>
                        <TableHead className="text-right">数量</TableHead>
                        <TableHead className="text-right">長さ</TableHead>
                        <TableHead className="text-right">重量</TableHead>
                        <TableHead>図番</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usages.map((usage) => (
                        <TableRow key={usage.id} data-testid={`row-usage-${usage.id}`}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {usage.zone || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{usage.material_name}</div>
                            <div className="text-xs text-muted-foreground">{usage.material_type}</div>
                          </TableCell>
                          <TableCell className="text-xs">{usage.material_size}</TableCell>
                          <TableCell className="text-right">{usage.quantity}</TableCell>
                          <TableCell className="text-right">
                            {usage.length ? `${usage.length}m` : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {usage.total_weight ? `${usage.total_weight.toFixed(1)}kg` : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {usage.drawing_no || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>案件を選択すると、材料使用を入力できます</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
