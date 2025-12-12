// Production Management MVP - Material Usages (材料使用管理)
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, Plus } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  project_id: z.string().min(1, "案件IDは必須です"),
  area: z.string().optional(),
  zone: z.string().optional(),
  drawing_no: z.string().optional(),
  material_id: z.coerce.number().min(1, "材料を選択してください"),
  quantity: z.coerce.number().min(1, "数量は1以上にしてください"),
  length: z.coerce.number().positive().optional().or(z.literal("")),
  remark: z.string().optional(),
});

type MaterialUsageFormData = z.infer<typeof materialUsageFormSchema>;

export default function MaterialUsages() {
  const { toast } = useToast();
  const [filterProjectId, setFilterProjectId] = useState<string>("");

  const { data: usagesResponse, isLoading: isLoadingUsages } = useQuery({
    queryKey: ['/api/material-usages', filterProjectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterProjectId) params.append('project_id', filterProjectId);
      const res = await fetch(`/api/material-usages?${params.toString()}`);
      return res.json();
    }
  });

  const { data: materialsResponse, isLoading: isLoadingMaterials } = useQuery({
    queryKey: ['/api/materials'],
    queryFn: async () => {
      const res = await fetch('/api/materials');
      return res.json();
    }
  });

  const usages: MaterialUsageWithMaterial[] = usagesResponse?.data || [];
  const materials: Material[] = materialsResponse?.data || [];

  const form = useForm<MaterialUsageFormData>({
    resolver: zodResolver(materialUsageFormSchema),
    defaultValues: {
      project_id: "",
      area: "",
      zone: "",
      drawing_no: "",
      material_id: 0,
      quantity: 1,
      length: "",
      remark: "",
    }
  });

  const watchMaterialId = form.watch("material_id");
  const watchLength = form.watch("length");
  const watchQuantity = form.watch("quantity");

  const calculatedWeight = useMemo(() => {
    if (!watchMaterialId || !watchLength || !watchQuantity) return null;
    const material = materials.find(m => m.id === Number(watchMaterialId));
    if (!material?.unit_weight) return null;
    const len = typeof watchLength === 'string' ? parseFloat(watchLength) : watchLength;
    if (isNaN(len) || len <= 0) return null;
    return material.unit_weight * len * watchQuantity;
  }, [watchMaterialId, watchLength, watchQuantity, materials]);

  const createMutation = useMutation({
    mutationFn: async (data: MaterialUsageFormData) => {
      const payload = {
        ...data,
        length: data.length === "" ? undefined : data.length,
      };
      const res = await apiRequest('POST', '/api/material-usages', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/material-usages'] });
      toast({
        title: "材料使用を登録しました",
        description: "新しい材料使用が作成されました"
      });
      form.reset({
        project_id: form.getValues("project_id"),
        area: "",
        zone: "",
        drawing_no: "",
        material_id: 0,
        quantity: 1,
        length: "",
        remark: "",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "材料使用の登録に失敗しました",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: MaterialUsageFormData) => {
    createMutation.mutate(data);
  };

  const selectedMaterial = materials.find(m => m.id === Number(watchMaterialId));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Layers className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">材料使用管理</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              材料使用登録
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="project_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>案件ID *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="例: ko130149" 
                          {...field} 
                          data-testid="input-project-id"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          {materials.map((material) => (
                            <SelectItem key={material.id} value={String(material.id)}>
                              {material.material_type} - {material.name} ({material.size})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedMaterial && (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    単位: {selectedMaterial.unit}
                    {selectedMaterial.unit_weight && (
                      <span className="ml-2">
                        単位重量: {selectedMaterial.unit_weight} kg/{selectedMaterial.unit}
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>エリア</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="例: 2F" 
                            {...field} 
                            data-testid="input-area"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>工区</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-zone">
                              <SelectValue placeholder="選択" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="N工区">N工区</SelectItem>
                            <SelectItem value="S工区">S工区</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="drawing_no"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>図面番号</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="例: A-001" 
                          {...field} 
                          data-testid="input-drawing-no"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
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
                        <FormLabel>長さ (m)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            min="0"
                            placeholder="例: 3.5"
                            {...field}
                            value={field.value === undefined ? "" : field.value}
                            data-testid="input-length"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {calculatedWeight !== null && (
                  <div className="text-sm font-medium bg-primary/10 text-primary p-3 rounded">
                    計算重量: {calculatedWeight.toFixed(2)} kg
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({selectedMaterial?.unit_weight} × {watchLength} × {watchQuantity})
                    </span>
                  </div>
                )}

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
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending ? "登録中..." : "登録"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>材料使用一覧</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="案件IDで絞込"
                  value={filterProjectId}
                  onChange={(e) => setFilterProjectId(e.target.value)}
                  className="w-40"
                  data-testid="input-filter-project"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingUsages ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : usages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                材料使用データがありません
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>案件ID</TableHead>
                      <TableHead>エリア</TableHead>
                      <TableHead>工区</TableHead>
                      <TableHead>図面番号</TableHead>
                      <TableHead>材料種別</TableHead>
                      <TableHead>材料名</TableHead>
                      <TableHead>サイズ</TableHead>
                      <TableHead className="text-right">数量</TableHead>
                      <TableHead className="text-right">長さ</TableHead>
                      <TableHead className="text-right">重量(kg)</TableHead>
                      <TableHead>備考</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usages.map((usage) => (
                      <TableRow key={usage.id} data-testid={`row-usage-${usage.id}`}>
                        <TableCell className="font-medium">{usage.project_id}</TableCell>
                        <TableCell>{usage.area || "-"}</TableCell>
                        <TableCell>{usage.zone || "-"}</TableCell>
                        <TableCell>{usage.drawing_no || "-"}</TableCell>
                        <TableCell>{usage.material_type}</TableCell>
                        <TableCell>{usage.material_name}</TableCell>
                        <TableCell className="text-xs">{usage.material_size}</TableCell>
                        <TableCell className="text-right">{usage.quantity}</TableCell>
                        <TableCell className="text-right">
                          {usage.length ? `${usage.length} ${usage.unit}` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {usage.total_weight ? usage.total_weight.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {usage.remark || "-"}
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
    </div>
  );
}
