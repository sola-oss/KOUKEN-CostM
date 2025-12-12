// Production Management MVP - Materials Master (材料マスタ)
import { useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Database, Plus, Edit, Trash2 } from "lucide-react";
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
  created_at: string;
}

const materialFormSchema = z.object({
  material_type: z.string().min(1, "材料種別は必須です"),
  name: z.string().min(1, "材料名は必須です"),
  size: z.string().min(1, "サイズは必須です"),
  unit: z.string().min(1, "単位は必須です"),
  unit_weight: z.coerce.number().positive().optional().or(z.literal("")),
  remark: z.string().optional(),
});

type MaterialFormData = z.infer<typeof materialFormSchema>;

const MATERIAL_TYPES = ["鋼材", "ボルト", "ナット", "配管", "電材", "その他"];
const UNITS = ["m", "本", "個", "kg", "セット", "箱"];

export default function MaterialsMaster() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deletingMaterialId, setDeletingMaterialId] = useState<number | null>(null);

  const { data: materialsResponse, isLoading } = useQuery({
    queryKey: ['/api/materials'],
    queryFn: async () => {
      const res = await fetch('/api/materials');
      return res.json();
    }
  });

  const materials: Material[] = materialsResponse?.data || [];

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      material_type: "",
      name: "",
      size: "",
      unit: "m",
      unit_weight: "",
      remark: "",
    }
  });

  const editForm = useForm<MaterialFormData>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      material_type: "",
      name: "",
      size: "",
      unit: "m",
      unit_weight: "",
      remark: "",
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: MaterialFormData) => {
      const payload = {
        ...data,
        unit_weight: data.unit_weight === "" ? null : data.unit_weight,
      };
      const res = await apiRequest('POST', '/api/materials', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
      toast({ title: "材料を登録しました" });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "エラー", description: "材料の登録に失敗しました", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: MaterialFormData }) => {
      const payload = {
        ...data,
        unit_weight: data.unit_weight === "" ? null : data.unit_weight,
      };
      const res = await apiRequest('PATCH', `/api/materials/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
      toast({ title: "材料を更新しました" });
      setEditingMaterial(null);
    },
    onError: () => {
      toast({ title: "エラー", description: "材料の更新に失敗しました", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/materials/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
      toast({ title: "材料を削除しました" });
      setDeletingMaterialId(null);
    },
    onError: () => {
      toast({ title: "エラー", description: "材料の削除に失敗しました（使用中の可能性があります）", variant: "destructive" });
    }
  });

  const onCreateSubmit = (data: MaterialFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: MaterialFormData) => {
    if (editingMaterial) {
      updateMutation.mutate({ id: editingMaterial.id, data });
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    editForm.reset({
      material_type: material.material_type,
      name: material.name,
      size: material.size,
      unit: material.unit,
      unit_weight: material.unit_weight ?? "",
      remark: material.remark ?? "",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">材料マスタ</h2>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create">
          <Plus className="h-4 w-4 mr-2" />
          新規登録
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>材料一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              材料データがありません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>材料種別</TableHead>
                    <TableHead>材料名</TableHead>
                    <TableHead>サイズ</TableHead>
                    <TableHead>単位</TableHead>
                    <TableHead className="text-right">単位重量 (kg)</TableHead>
                    <TableHead>備考</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => (
                    <TableRow key={material.id} data-testid={`row-material-${material.id}`}>
                      <TableCell>{material.id}</TableCell>
                      <TableCell>{material.material_type}</TableCell>
                      <TableCell className="font-medium">{material.name}</TableCell>
                      <TableCell>{material.size}</TableCell>
                      <TableCell>{material.unit}</TableCell>
                      <TableCell className="text-right">
                        {material.unit_weight !== null ? material.unit_weight : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {material.remark || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(material)}
                            data-testid={`button-edit-${material.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>材料を登録</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="material_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>材料種別 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-material-type">
                          <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MATERIAL_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>材料名 *</FormLabel>
                    <FormControl>
                      <Input placeholder="例: H形鋼" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>サイズ *</FormLabel>
                    <FormControl>
                      <Input placeholder="例: 200×100×5.5×8" {...field} data-testid="input-size" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>単位 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-unit">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit_weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>単位重量 (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="例: 10.5"
                          {...field}
                          value={field.value === undefined ? "" : field.value}
                          data-testid="input-unit-weight"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>備考</FormLabel>
                    <FormControl>
                      <Input placeholder="備考" {...field} data-testid="input-remark" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-create">
                {createMutation.isPending ? "登録中..." : "登録"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingMaterial} onOpenChange={(open) => !open && setEditingMaterial(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>材料を編集</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="material_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>材料種別 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MATERIAL_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>材料名 *</FormLabel>
                    <FormControl>
                      <Input placeholder="例: H形鋼" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>サイズ *</FormLabel>
                    <FormControl>
                      <Input placeholder="例: 200×100×5.5×8" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>単位 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="unit_weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>単位重量 (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="例: 10.5"
                          {...field}
                          value={field.value === undefined ? "" : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>備考</FormLabel>
                    <FormControl>
                      <Input placeholder="備考" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "更新中..." : "更新"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingMaterialId} onOpenChange={(open) => !open && setDeletingMaterialId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>材料を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。使用中の材料は削除できません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingMaterialId && deleteMutation.mutate(deletingMaterialId)}
              data-testid="button-confirm-delete"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
