import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Check, Receipt, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Order {
  order_id: string;
  client_name: string | null;
  project_title: string | null;
}

interface MaterialCost {
  id: number;
  order_id: string;
  description: string | null;
  total_amount: string;
  created_at: string;
}

const schema = z.object({
  order_id: z.string({ required_error: "受注番号は必須です" }).min(1, "受注番号は必須です"),
  description: z.string().optional(),
  total_amount: z.coerce.number({ required_error: "合計金額は必須です" }).int("整数を入力してください").positive("0より大きい値を入力してください"),
});

type FormData = z.infer<typeof schema>;

export default function MaterialCostsPage() {
  const { toast } = useToast();
  const [editingRow, setEditingRow] = useState<MaterialCost | null>(null);
  const [orderComboOpen, setOrderComboOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      order_id: "",
      description: "",
      total_amount: 0,
    },
  });

  const { data: ordersResponse } = useQuery({
    queryKey: ["/api/orders-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/orders-dropdown");
      return res.json();
    },
  });
  const orders: Order[] = ordersResponse?.data || [];

  const { data: mcResponse, isLoading } = useQuery({
    queryKey: ["/api/material-costs"],
    queryFn: async () => {
      const res = await fetch("/api/material-costs");
      return res.json();
    },
  });
  const rows: MaterialCost[] = mcResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("/api/material-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-costs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cost-aggregation"] });
      toast({ title: "登録しました" });
      form.reset({ order_id: "", description: "", total_amount: 0 });
    },
    onError: () => {
      toast({ title: "エラー", description: "登録に失敗しました", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const res = await fetch(`/api/material-costs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-costs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cost-aggregation"] });
      toast({ title: "更新しました" });
      setEditingRow(null);
      form.reset({ order_id: "", description: "", total_amount: 0 });
    },
    onError: () => {
      toast({ title: "エラー", description: "更新に失敗しました", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/material-costs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-costs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cost-aggregation"] });
      toast({ title: "削除しました" });
    },
    onError: () => {
      toast({ title: "エラー", description: "削除に失敗しました", variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => {
    if (editingRow) {
      updateMutation.mutate({ id: editingRow.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (row: MaterialCost) => {
    setEditingRow(row);
    form.reset({
      order_id: row.order_id,
      description: row.description || "",
      total_amount: parseInt(row.total_amount, 10),
    });
  };

  const handleCancel = () => {
    setEditingRow(null);
    form.reset({ order_id: "", description: "", total_amount: 0 });
  };

  const formatCurrency = (val: string | number) =>
    new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(Number(val));

  const selectedOrder = orders.find((o) => o.order_id === form.watch("order_id"));
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Receipt className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">材料費入力</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editingRow ? "材料費を編集" : "材料費を登録"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                              className={cn("justify-between font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value
                                ? `${field.value}${selectedOrder?.client_name ? ` (${selectedOrder.client_name})` : ""}`
                                : "受注番号を選択"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0">
                          <Command>
                            <CommandInput placeholder="受注番号・得意先で検索..." />
                            <CommandList>
                              <CommandEmpty>見つかりません</CommandEmpty>
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
                                      className={cn("mr-2 h-4 w-4", field.value === order.order_id ? "opacity-100" : "opacity-0")}
                                    />
                                    <span className="font-medium">{order.order_id}</span>
                                    {order.client_name && (
                                      <span className="ml-2 text-muted-foreground text-sm">{order.client_name}</span>
                                    )}
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

                {/* 明細 */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>明細</FormLabel>
                      <FormControl>
                        <Input placeholder="鋼材・部品費 など" {...field} />
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
                          min={1}
                          step={1}
                          placeholder="50000"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {editingRow ? "更新" : "登録"}
                </Button>
                {editingRow && (
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    キャンセル
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">登録済み材料費</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>まだ材料費が登録されていません</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>受注番号</TableHead>
                  <TableHead>明細</TableHead>
                  <TableHead className="text-right">合計金額</TableHead>
                  <TableHead>登録日時</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.order_id}</TableCell>
                    <TableCell className="text-muted-foreground">{row.description || "-"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(row.total_amount)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(row.created_at).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(row)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(row.id)}
                          disabled={deleteMutation.isPending}
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
    </div>
  );
}
