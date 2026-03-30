// Production Management MVP - Material Usages (材料使用管理)
import { useState, useMemo, useEffect } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Layers, Plus, Trash2, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Order {
  order_id: string;
  client_name: string | null;
  project_title: string | null;
  product_name: string | null;
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
  project_id: z.string().min(1, "受注番号は必須です"),
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
  const [selectedUsage, setSelectedUsage] = useState<MaterialUsageWithMaterial | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const { data: ordersResponse } = useQuery({
    queryKey: ['/api/orders-dropdown'],
    queryFn: async () => {
      const res = await fetch('/api/orders-dropdown');
      return res.json();
    }
  });
  
  const [orderComboOpen, setOrderComboOpen] = useState(false);
  const [editOrderComboOpen, setEditOrderComboOpen] = useState(false);

  const usages: MaterialUsageWithMaterial[] = usagesResponse?.data || [];
  const materials: Material[] = materialsResponse?.data || [];
  const orders: Order[] = ordersResponse?.data || [];

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

  const editForm = useForm<MaterialUsageFormData>({
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

  useEffect(() => {
    if (selectedUsage) {
      editForm.reset({
        project_id: selectedUsage.project_id,
        area: selectedUsage.area || "",
        zone: selectedUsage.zone || "",
        drawing_no: selectedUsage.drawing_no || "",
        material_id: selectedUsage.material_id,
        quantity: selectedUsage.quantity,
        length: selectedUsage.length ?? "",
        remark: selectedUsage.remark || "",
      });
    }
  }, [selectedUsage, editForm]);

  const watchMaterialId = form.watch("material_id");
  const watchLength = form.watch("length");
  const watchQuantity = form.watch("quantity");

  const editWatchMaterialId = editForm.watch("material_id");
  const editWatchLength = editForm.watch("length");
  const editWatchQuantity = editForm.watch("quantity");

  const calculatedWeight = useMemo(() => {
    if (!watchMaterialId || !watchLength || !watchQuantity) return null;
    const material = materials.find(m => m.id === Number(watchMaterialId));
    if (!material?.unit_weight) return null;
    const len = typeof watchLength === 'string' ? parseFloat(watchLength) : watchLength;
    if (isNaN(len) || len <= 0) return null;
    return material.unit_weight * len * watchQuantity;
  }, [watchMaterialId, watchLength, watchQuantity, materials]);

  const editCalculatedWeight = useMemo(() => {
    if (!editWatchMaterialId || !editWatchLength || !editWatchQuantity) return null;
    const material = materials.find(m => m.id === Number(editWatchMaterialId));
    if (!material?.unit_weight) return null;
    const len = typeof editWatchLength === 'string' ? parseFloat(editWatchLength) : editWatchLength;
    if (isNaN(len) || len <= 0) return null;
    return material.unit_weight * len * editWatchQuantity;
  }, [editWatchMaterialId, editWatchLength, editWatchQuantity, materials]);

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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: MaterialUsageFormData }) => {
      const payload = {
        ...data,
        length: data.length === "" ? null : data.length,
      };
      const res = await apiRequest('PATCH', `/api/material-usages/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/material-usages'] });
      toast({
        title: "材料使用を更新しました",
        description: "変更が保存されました"
      });
      setIsDialogOpen(false);
      setSelectedUsage(null);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "材料使用の更新に失敗しました",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/material-usages/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/material-usages'] });
      toast({
        title: "材料使用を削除しました",
        description: "データが削除されました"
      });
      setIsDialogOpen(false);
      setSelectedUsage(null);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "材料使用の削除に失敗しました",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: MaterialUsageFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: MaterialUsageFormData) => {
    if (selectedUsage) {
      updateMutation.mutate({ id: selectedUsage.id, data });
    }
  };

  const handleDelete = () => {
    if (selectedUsage && confirm("この材料使用を削除しますか？")) {
      deleteMutation.mutate(selectedUsage.id);
    }
  };

  const handleRowClick = (usage: MaterialUsageWithMaterial) => {
    setSelectedUsage(usage);
    setIsDialogOpen(true);
  };

  const selectedMaterial = materials.find(m => m.id === Number(watchMaterialId));
  const editSelectedMaterial = materials.find(m => m.id === Number(editWatchMaterialId));

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
                    <FormItem className="flex flex-col">
                      <FormLabel>受注番号 *</FormLabel>
                      <Popover open={orderComboOpen} onOpenChange={setOrderComboOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={orderComboOpen}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="select-project-id"
                            >
                              {field.value
                                ? (() => {
                                    const order = orders.find(o => o.order_id === field.value);
                                    return order ? `${order.order_id}${order.client_name ? ` / ${order.client_name}` : ""}${(order.project_title || order.product_name) ? ` / ${order.project_title || order.product_name}` : ""}` : field.value;
                                  })()
                                : "受注を検索..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="受注番号・顧客名・受注件名で検索..." />
                            <CommandList>
                              <CommandEmpty>該当する受注がありません</CommandEmpty>
                              <CommandGroup>
                                {orders.map((order) => (
                                  <CommandItem
                                    key={order.order_id}
                                    value={`${order.order_id} ${order.client_name || ""} ${order.project_title || ""}`}
                                    onSelect={() => {
                                      field.onChange(order.order_id);
                                      setOrderComboOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === order.order_id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="font-medium">{order.order_id}</span>
                                    {order.client_name && <span className="ml-1 text-muted-foreground">{order.client_name}</span>}
                                    {(order.project_title || order.product_name) && <span className="ml-1 text-muted-foreground truncate">/ {order.project_title || order.product_name}</span>}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
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
                  placeholder="受注番号で絞込"
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
                      <TableHead>受注番号</TableHead>
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
                      <TableRow 
                        key={usage.id} 
                        data-testid={`row-usage-${usage.id}`}
                        className="cursor-pointer hover-elevate"
                        onClick={() => handleRowClick(usage)}
                      >
                        <TableCell className="font-medium">{usage.project_id}</TableCell>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>材料使用 詳細・編集</DialogTitle>
          </DialogHeader>
          {selectedUsage && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="project_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>受注番号 *</FormLabel>
                      <Popover open={editOrderComboOpen} onOpenChange={setEditOrderComboOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={editOrderComboOpen}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="edit-select-project-id"
                            >
                              {field.value
                                ? (() => {
                                    const order = orders.find(o => o.order_id === field.value);
                                    return order ? `${order.order_id}${order.client_name ? ` / ${order.client_name}` : ""}${(order.project_title || order.product_name) ? ` / ${order.project_title || order.product_name}` : ""}` : field.value;
                                  })()
                                : "受注を検索..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="受注番号・顧客名で検索..." />
                            <CommandList>
                              <CommandEmpty>該当する受注がありません</CommandEmpty>
                              <CommandGroup>
                                {orders.map((order) => (
                                  <CommandItem
                                    key={order.order_id}
                                    value={`${order.order_id} ${order.client_name || ""} ${order.project_title || ""}`}
                                    onSelect={() => {
                                      field.onChange(order.order_id);
                                      setEditOrderComboOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === order.order_id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="font-medium">{order.order_id}</span>
                                    {order.client_name && <span className="ml-1 text-muted-foreground">{order.client_name}</span>}
                                    {(order.project_title || order.product_name) && <span className="ml-1 text-muted-foreground truncate">/ {order.project_title || order.product_name}</span>}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="material_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>材料 *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value ? String(field.value) : ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="edit-select-material">
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

                {editSelectedMaterial && (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    単位: {editSelectedMaterial.unit}
                    {editSelectedMaterial.unit_weight && (
                      <span className="ml-2">
                        単位重量: {editSelectedMaterial.unit_weight} kg/{editSelectedMaterial.unit}
                      </span>
                    )}
                  </div>
                )}


                <FormField
                  control={editForm.control}
                  name="drawing_no"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>図面番号</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="例: A-001" 
                          {...field} 
                          data-testid="edit-input-drawing-no"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>数量 *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            {...field} 
                            data-testid="edit-input-quantity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
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
                            data-testid="edit-input-length"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {editCalculatedWeight !== null && (
                  <div className="text-sm font-medium bg-primary/10 text-primary p-3 rounded">
                    計算重量: {editCalculatedWeight.toFixed(2)} kg
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({editSelectedMaterial?.unit_weight} × {editWatchLength} × {editWatchQuantity})
                    </span>
                  </div>
                )}

                <FormField
                  control={editForm.control}
                  name="remark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>備考</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="備考" 
                          {...field} 
                          data-testid="edit-input-remark"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    削除
                  </Button>
                  <Button 
                    type="submit"
                    disabled={updateMutation.isPending}
                    data-testid="button-update"
                  >
                    {updateMutation.isPending ? "更新中..." : "更新"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
