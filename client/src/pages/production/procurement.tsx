// 発注管理ページ（簡略版）
import { useState } from "react";
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
import { ClipboardList, Plus, Edit, Trash2, ChevronsUpDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { listProcurements, deleteProcurement, type Procurement } from "@/shared/production-api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = [
  { value: "発注中", label: "発注中" },
  { value: "完了", label: "完了" },
  { value: "キャンセル", label: "キャンセル" },
];

interface Order {
  order_id: string;
  client_name: string | null;
  project_title: string | null;
  product_name: string | null;
}

const formSchema = z.object({
  order_id: z.string().min(1, "受注番号は必須です"),
  description: z.string().min(1, "内容は必須です"),
  total_amount: z.coerce.number({ required_error: "合計金額は必須です" }).min(0, "0以上の値を入力してください"),
  order_date: z.string().optional().nullable(),
  status: z.string().default("発注中"),
  notes: z.string().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

const defaultValues: FormData = {
  order_id: "",
  description: "",
  total_amount: 0,
  order_date: null,
  status: "発注中",
  notes: null,
};

function ProcurementForm({
  form,
  orders,
  onSubmit,
  isLoading,
  submitLabel,
  disableOrderId = false,
}: {
  form: ReturnType<typeof useForm<FormData>>;
  orders: Order[];
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
  submitLabel: string;
  disableOrderId?: boolean;
}) {
  const [orderComboOpen, setOrderComboOpen] = useState(false);

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
                        disabled={disableOrderId}
                        className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value
                          ? (() => {
                              const o = orders.find(o => o.order_id === field.value);
                              return o
                                ? `${o.order_id}${o.client_name ? ` / ${o.client_name}` : ""}${(o.project_title || o.product_name) ? ` / ${o.project_title || o.product_name}` : ""}`
                                : field.value;
                            })()
                          : "受注番号を選択..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="受注番号・得意先で検索..." />
                      <CommandList>
                        <CommandEmpty>該当なし</CommandEmpty>
                        <CommandGroup>
                          {orders.map(o => (
                            <CommandItem
                              key={o.order_id}
                              value={`${o.order_id} ${o.client_name || ""} ${o.project_title || o.product_name || ""}`}
                              onSelect={() => { field.onChange(o.order_id); setOrderComboOpen(false); }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", field.value === o.order_id ? "opacity-100" : "opacity-0")} />
                              <span className="font-medium">{o.order_id}</span>
                              {o.client_name && <span className="ml-1 text-muted-foreground">{o.client_name}</span>}
                              {(o.project_title || o.product_name) && <span className="ml-1 text-muted-foreground truncate">/ {o.project_title || o.product_name}</span>}
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

          {/* 内容 */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>内容 *</FormLabel>
                <FormControl>
                  <Input placeholder="内容を入力..." {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 合計金額 */}
          <FormField
            control={form.control}
            name="total_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>合計金額（円）*</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    {...field}
                    value={field.value ?? 0}
                    onChange={e => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
    "発注中": { variant: "default" },
    "完了": { variant: "secondary" },
    "キャンセル": { variant: "destructive" },
  };
  const c = config[status ?? ""] ?? { variant: "secondary" as const };
  return <Badge variant={c.variant}>{status ?? "-"}</Badge>;
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

  const procurements: Procurement[] = procurementsResponse?.data || [];
  const orders: Order[] = ordersResponse?.data || [];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const editForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const buildPayload = (data: FormData) => ({
    order_id: data.order_id,
    description: data.description,
    amount: data.total_amount,
    order_date: data.order_date || null,
    status: data.status,
    notes: data.notes || null,
    account_type: "外注費",
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("/api/procurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(data)),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurements"] });
      toast({ title: "発注を登録しました" });
      form.reset(defaultValues);
    },
    onError: (e: Error) => {
      toast({ title: "エラー", description: e.message || "登録に失敗しました", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const payload = buildPayload(data);
      const { order_id: _oid, ...updatePayload } = payload;
      const res = await fetch(`/api/procurements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurements"] });
      toast({ title: "発注を更新しました" });
      setIsEditDialogOpen(false);
      setEditingProcurement(null);
    },
    onError: (e: Error) => {
      toast({ title: "エラー", description: e.message || "更新に失敗しました", variant: "destructive" });
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
      toast({ title: "エラー", description: "削除に失敗しました", variant: "destructive" });
      setDeletingProcurementId(null);
    },
  });

  const handleEditClick = (proc: Procurement) => {
    setEditingProcurement(proc);
    editForm.reset({
      order_id: proc.order_id,
      description: proc.description ?? "",
      total_amount: proc.amount ?? 0,
      order_date: proc.order_date ?? null,
      status: proc.status ?? "発注中",
      notes: proc.notes ?? null,
    });
    setIsEditDialogOpen(true);
  };

  const filteredProcurements = procurements.filter(p =>
    !filterOrderId || p.order_id.toLowerCase().includes(filterOrderId.toLowerCase())
  );

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

      {/* 登録フォーム */}
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
            onSubmit={data => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
            submitLabel="登録"
          />
        </CardContent>
      </Card>

      {/* 一覧 */}
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
                    <TableHead>内容</TableHead>
                    <TableHead className="text-right">合計金額</TableHead>
                    <TableHead>発注日</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>備考</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProcurements.map(proc => (
                    <TableRow key={proc.id} data-testid={`row-procurement-${proc.id}`}>
                      <TableCell className="font-medium">{proc.order_id}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-muted-foreground">{proc.description || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(proc.amount)}</TableCell>
                      <TableCell>{proc.order_date ?? "-"}</TableCell>
                      <TableCell>{getStatusBadge(proc.status)}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-muted-foreground text-sm">{proc.notes || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEditClick(proc)} data-testid={`button-edit-${proc.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeletingProcurementId(proc.id)} data-testid={`button-delete-${proc.id}`}>
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

      {/* 編集ダイアログ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>発注を編集</DialogTitle>
          </DialogHeader>
          <ProcurementForm
            form={editForm}
            orders={orders}
            onSubmit={data => editingProcurement && updateMutation.mutate({ id: editingProcurement.id, data })}
            isLoading={updateMutation.isPending}
            submitLabel="更新"
            disableOrderId
          />
        </DialogContent>
      </Dialog>

      {/* 削除確認 */}
      <AlertDialog open={deletingProcurementId !== null} onOpenChange={open => { if (!open) setDeletingProcurementId(null); }}>
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
