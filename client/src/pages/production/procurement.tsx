// 発注管理ページ
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ClipboardList, Plus, Edit, Trash2, ChevronsUpDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { listProcurements, createProcurement, updateProcurement, deleteProcurement, type Procurement, type ProcurementPayload } from "@/shared/production-api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const ACCOUNT_TYPES = ["外注費"];

const STATUS_OPTIONS = [
  { value: "発注中", label: "発注中" },
  { value: "完了", label: "完了" },
  { value: "キャンセル", label: "キャンセル" },
];

interface Order {
  order_id: string;
  client_name: string | null;
  project_title: string | null;
}

interface Vendor {
  id: number;
  name: string;
  is_active: boolean;
}

interface Material {
  id: number;
  material_type: string;
  name: string;
  size: string;
  unit: string;
  unit_price: number | null;
}

const procurementFormSchema = z.object({
  order_id: z.string().min(1, "受注番号は必須です"),
  vendor_id: z.coerce.number().optional().nullable(),
  account_type: z.string().default("外注費"),
  content_mode: z.enum(["material", "text"]).default("text"),
  material_id: z.coerce.number().optional().nullable(),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().min(0, "数量は0以上です").default(1),
  unit_price: z.coerce.number().min(0, "単価は0以上です").optional().nullable(),
  order_date: z.string().optional().nullable(),
  status: z.string().default("発注中"),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.content_mode === "material") return data.material_id != null;
    return data.description != null && data.description.trim().length > 0;
  },
  {
    message: "内容は材料マスタから選択するか、テキストで入力してください",
    path: ["description"],
  }
);

type FormData = z.infer<typeof procurementFormSchema>;

function ProcurementForm({
  form,
  orders,
  vendors,
  materials,
  onSubmit,
  isLoading,
  submitLabel,
  disableOrderId = false,
}: {
  form: ReturnType<typeof useForm<FormData>>;
  orders: Order[];
  vendors: Vendor[];
  materials: Material[];
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
  submitLabel: string;
  disableOrderId?: boolean;
}) {
  const [orderComboOpen, setOrderComboOpen] = useState(false);
  const contentMode = form.watch("content_mode");
  const quantity = form.watch("quantity");
  const unitPrice = form.watch("unit_price");
  const computedAmount = (Number(quantity) || 0) * (Number(unitPrice) || 0);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* 受注番号 */}
          <FormField
            control={form.control}
            name="order_id"
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
                        disabled={disableOrderId}
                        className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                      >
                        {field.value
                          ? (() => {
                              const order = orders.find(o => o.order_id === field.value);
                              return order
                                ? `${order.order_id} - ${order.client_name || order.project_title || ""}`
                                : field.value;
                            })()
                          : "受注番号を選択..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="受注番号・顧客名で検索..." />
                      <CommandList>
                        <CommandEmpty>該当する受注がありません</CommandEmpty>
                        <CommandGroup>
                          {orders.map(order => (
                            <CommandItem
                              key={order.order_id}
                              value={`${order.order_id} ${order.client_name || ""} ${order.project_title || ""}`}
                              onSelect={() => {
                                field.onChange(order.order_id);
                                setOrderComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn("mr-2 h-4 w-4", field.value === order.order_id ? "opacity-100" : "opacity-0")}
                              />
                              <span className="font-medium">{order.order_id}</span>
                              <span className="ml-2 text-muted-foreground truncate">
                                {order.client_name || order.project_title || ""}
                              </span>
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

          {/* 発注先 */}
          <FormField
            control={form.control}
            name="vendor_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>発注先</FormLabel>
                <Select
                  value={field.value != null ? String(field.value) : "none"}
                  onValueChange={val => field.onChange(val === "none" ? null : Number(val))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="業者を選択" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">指定なし</SelectItem>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 科目 */}
          <FormField
            control={form.control}
            name="account_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>科目</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 内容（入力方式切替） */}
          <div className="space-y-2 lg:col-span-3">
            <FormField
              control={form.control}
              name="content_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>内容の入力方法</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={val => {
                        field.onChange(val);
                        form.setValue("material_id", null);
                        form.setValue("description", null);
                      }}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="material" id="mode-material" />
                        <Label htmlFor="mode-material">材料マスタから選択</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="text" id="mode-text" />
                        <Label htmlFor="mode-text">テキスト入力</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {contentMode === "material" ? (
              <FormField
                control={form.control}
                name="material_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>材料</FormLabel>
                    <Select
                      value={field.value != null ? String(field.value) : "none"}
                      onValueChange={val => {
                        const id = val === "none" ? null : Number(val);
                        field.onChange(id);
                        if (id) {
                          const mat = materials.find(m => m.id === id);
                          if (mat?.unit_price) form.setValue("unit_price", mat.unit_price);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="材料を選択" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">選択なし</SelectItem>
                        {materials.map(m => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.material_type} - {m.name} - {m.size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>内容</FormLabel>
                    <FormControl>
                      <Input placeholder="内容を入力..." {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* 数量 */}
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>数量</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="1"
                    {...field}
                    value={field.value ?? 1}
                    onChange={e => field.onChange(e.target.value === "" ? 1 : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 単価 */}
          <FormField
            control={form.control}
            name="unit_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>単価（円）</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    {...field}
                    value={field.value ?? ""}
                    onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 金額（自動計算） */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">金額（自動計算）</Label>
            <Input
              value={new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(computedAmount)}
              readOnly
              className="bg-muted text-muted-foreground"
            />
          </div>

          {/* 発注日 */}
          <FormField
            control={form.control}
            name="order_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>発注日</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* ステータス */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ステータス</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 備考 */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="lg:col-span-3">
                <FormLabel>備考</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="備考を入力..."
                    rows={2}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "処理中..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function getStatusBadge(status: string | null) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    "発注中": { label: "発注中", variant: "default" },
    "完了": { label: "完了", variant: "secondary" },
    "キャンセル": { label: "キャンセル", variant: "destructive" },
  };
  const c = config[status ?? ""] ?? { label: status ?? "-", variant: "secondary" };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function formatCurrency(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(value);
}

export default function ProcurementManagement() {
  const { toast } = useToast();
  const [filterOrderId, setFilterOrderId] = useState("");
  const [editingProcurement, setEditingProcurement] = useState<Procurement | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingProcurementId, setDeletingProcurementId] = useState<number | null>(null);

  const { data: procurementsResponse, isLoading } = useQuery({
    queryKey: ["procurements"],
    queryFn: () => listProcurements({ page_size: 200 }),
  });

  const { data: ordersResponse } = useQuery({
    queryKey: ["/api/orders-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/orders-dropdown");
      return res.json();
    },
  });

  const { data: vendorsData } = useQuery({
    queryKey: ["/api/vendors-master"],
    queryFn: async () => {
      const res = await fetch("/api/vendors-master");
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return res.json() as Promise<Vendor[]>;
    },
  });

  const { data: materialsData } = useQuery({
    queryKey: ["/api/materials"],
    queryFn: async () => {
      const res = await fetch("/api/materials");
      if (!res.ok) throw new Error("Failed to fetch materials");
      return res.json() as Promise<{ data: Material[] }>;
    },
  });

  const procurements: Procurement[] = procurementsResponse?.data || [];
  const orders: Order[] = ordersResponse?.data || [];
  const vendors: Vendor[] = (vendorsData || []).filter((v: Vendor) => v.is_active);
  const materials: Material[] = materialsData?.data || [];

  const defaultFormValues: FormData = {
    order_id: "",
    vendor_id: null,
    account_type: "外注費",
    content_mode: "text",
    material_id: null,
    description: null,
    quantity: 1,
    unit_price: null,
    order_date: null,
    status: "発注中",
    notes: null,
  };

  const form = useForm<FormData>({
    resolver: zodResolver(procurementFormSchema),
    defaultValues: defaultFormValues,
  });

  const editForm = useForm<FormData>({
    resolver: zodResolver(procurementFormSchema),
    defaultValues: defaultFormValues,
  });

  const createMutation = useMutation({
    mutationFn: (data: ProcurementPayload) => createProcurement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurements"] });
      toast({ title: "発注を登録しました" });
      form.reset(defaultFormValues);
    },
    onError: () => {
      toast({ title: "エラー", description: "発注の登録に失敗しました", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProcurementPayload> }) =>
      updateProcurement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurements"] });
      toast({ title: "発注を更新しました" });
      setIsEditDialogOpen(false);
      setEditingProcurement(null);
    },
    onError: () => {
      toast({ title: "エラー", description: "発注の更新に失敗しました", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProcurement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurements"] });
      toast({ title: "発注を削除しました" });
      setDeletingProcurementId(null);
    },
    onError: () => {
      toast({ title: "エラー", description: "発注の削除に失敗しました", variant: "destructive" });
      setDeletingProcurementId(null);
    },
  });

  const buildCreatePayload = (data: FormData): ProcurementPayload => ({
    order_id: data.order_id,
    vendor_id: data.vendor_id,
    material_id: data.content_mode === "material" ? data.material_id : null,
    account_type: data.account_type,
    description: data.content_mode === "text" ? data.description : null,
    quantity: data.quantity,
    unit_price: data.unit_price,
    order_date: data.order_date,
    status: data.status,
    notes: data.notes,
  });

  const buildUpdatePayload = (data: FormData): Omit<ProcurementPayload, 'order_id'> => ({
    vendor_id: data.vendor_id,
    material_id: data.content_mode === "material" ? data.material_id : null,
    account_type: data.account_type,
    description: data.content_mode === "text" ? data.description : null,
    quantity: data.quantity,
    unit_price: data.unit_price,
    order_date: data.order_date,
    status: data.status,
    notes: data.notes,
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(buildCreatePayload(data));
  };

  const onEditSubmit = (data: FormData) => {
    if (editingProcurement) {
      updateMutation.mutate({ id: editingProcurement.id, data: buildUpdatePayload(data) });
    }
  };

  const handleEditClick = (proc: Procurement) => {
    setEditingProcurement(proc);
    editForm.reset({
      order_id: proc.order_id,
      vendor_id: proc.vendor_id,
      account_type: proc.account_type || "外注費",
      content_mode: proc.material_id ? "material" : "text",
      material_id: proc.material_id,
      description: proc.description,
      quantity: proc.quantity ?? 1,
      unit_price: proc.unit_price,
      order_date: proc.order_date,
      status: proc.status || "発注中",
      notes: proc.notes,
    });
    setIsEditDialogOpen(true);
  };

  const getContentLabel = (proc: Procurement) => {
    if (proc.material_id) {
      const mat = materials.find(m => m.id === proc.material_id);
      return mat ? `${mat.material_type} - ${mat.name} - ${mat.size}` : `材料ID: ${proc.material_id}`;
    }
    return proc.description || "-";
  };

  const getVendorName = (vendorId: number | null) => {
    if (!vendorId) return "-";
    const v = vendors.find(v => v.id === vendorId) ?? (vendorsData || []).find((v: Vendor) => v.id === vendorId);
    return v ? v.name : String(vendorId);
  };

  const filteredProcurements = procurements.filter(p => {
    if (!filterOrderId) return true;
    return p.order_id.toLowerCase().includes(filterOrderId.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-procurement">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
          <ClipboardList className="h-8 w-8" />
          発注管理
        </h1>
        <p className="text-muted-foreground">外注費の記録・集計</p>
      </div>

      {/* Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            新規発注登録
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProcurementForm
            form={form}
            orders={orders}
            vendors={vendors}
            materials={materials}
            onSubmit={onSubmit}
            isLoading={createMutation.isPending}
            submitLabel="登録"
          />
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle>発注一覧</CardTitle>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="受注番号で絞り込み..."
              value={filterOrderId}
              onChange={e => setFilterOrderId(e.target.value)}
              className="w-48"
              data-testid="input-filter-order-id"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredProcurements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>発注データがありません</p>
              <p className="text-sm mt-2">上のフォームから発注を登録してください</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>受注番号</TableHead>
                    <TableHead>発注先</TableHead>
                    <TableHead>科目</TableHead>
                    <TableHead>内容</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead className="text-right">単価</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                    <TableHead>発注日</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProcurements.map(proc => (
                    <TableRow key={proc.id} data-testid={`row-procurement-${proc.id}`}>
                      <TableCell className="font-medium">{proc.order_id}</TableCell>
                      <TableCell>{getVendorName(proc.vendor_id)}</TableCell>
                      <TableCell>{proc.account_type}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{getContentLabel(proc)}</TableCell>
                      <TableCell className="text-right">{proc.quantity ?? "-"}</TableCell>
                      <TableCell className="text-right">{proc.unit_price != null ? formatCurrency(proc.unit_price) : "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(proc.amount)}</TableCell>
                      <TableCell>{proc.order_date ?? "-"}</TableCell>
                      <TableCell>{getStatusBadge(proc.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditClick(proc)}
                            data-testid={`button-edit-${proc.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeletingProcurementId(proc.id)}
                            data-testid={`button-delete-${proc.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>発注を編集</DialogTitle>
          </DialogHeader>
          <ProcurementForm
            form={editForm}
            orders={orders}
            vendors={vendors}
            materials={materials}
            onSubmit={onEditSubmit}
            isLoading={updateMutation.isPending}
            submitLabel="更新"
            disableOrderId
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={deletingProcurementId !== null}
        onOpenChange={open => { if (!open) setDeletingProcurementId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>発注を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>この操作は元に戻せません。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deletingProcurementId !== null) deleteMutation.mutate(deletingProcurementId); }}
              className="bg-destructive text-destructive-foreground"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
