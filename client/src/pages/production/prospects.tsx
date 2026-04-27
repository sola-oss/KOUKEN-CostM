import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ArrowRightCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CustomerMaster {
  id: number;
  name: string;
  code: string | null;
}

interface Prospect {
  id: number;
  deal_name: string;
  customer_id: number | null;
  customer_name: string | null;
  rank: "A" | "B" | "C";
  expected_amount: number | null;
  expected_order_date: string | null;
  manager: string | null;
  notes: string | null;
  status: "active" | "won" | "lost";
  created_at: string;
}

interface ConvertResponse {
  data: {
    order_id: string;
    message: string;
  };
}

interface ProspectFormData {
  deal_name: string;
  customer_id: string;
  rank: "A" | "B" | "C";
  expected_amount: string;
  expected_order_date: string;
  manager: string;
  notes: string;
  status: "active" | "won" | "lost";
}

const defaultForm: ProspectFormData = {
  deal_name: "",
  customer_id: "",
  rank: "C",
  expected_amount: "",
  expected_order_date: "",
  manager: "",
  notes: "",
  status: "active",
};

const rankConfig = {
  A: { label: "A ランク", className: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
  B: { label: "B ランク", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  C: { label: "C ランク", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
};

const statusConfig = {
  active: { label: "進行中", className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
  won: { label: "受注済み", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
  lost: { label: "失注", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

function formatAmount(amount: number | null): string {
  if (amount == null) return "—";
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export default function ProspectsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [rankFilter, setRankFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProspectFormData>(defaultForm);

  const queryParams = new URLSearchParams();
  if (rankFilter !== "all") queryParams.set("rank", rankFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  const queryString = queryParams.toString();

  const { data: prospectsData, isLoading } = useQuery<{ data: Prospect[] }>({
    queryKey: ["/api/prospects", rankFilter, statusFilter],
    queryFn: async () => {
      const url = queryString ? `/api/prospects?${queryString}` : "/api/prospects";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: allProspectsData } = useQuery<{ data: Prospect[] }>({
    queryKey: ["/api/prospects"],
    queryFn: async () => {
      const res = await fetch("/api/prospects", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: customersData } = useQuery<CustomerMaster[]>({
    queryKey: ["/api/customers-master"],
    queryFn: async () => {
      const res = await fetch("/api/customers-master", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const prospects = prospectsData?.data ?? [];
  const allProspects = allProspectsData?.data ?? [];
  const customers = customersData ?? [];

  const summaryByRank = (rank: "A" | "B" | "C") => {
    const active = allProspects.filter(p => p.rank === rank && p.status === "active");
    const total = active.reduce((sum, p) => sum + (p.expected_amount ?? 0), 0);
    return { count: active.length, total };
  };

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/prospects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      setIsFormOpen(false);
      setForm(defaultForm);
      toast({ title: "案件を登録しました" });
    },
    onError: () => toast({ title: "登録に失敗しました", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/prospects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      setIsFormOpen(false);
      setEditingProspect(null);
      setForm(defaultForm);
      toast({ title: "案件を更新しました" });
    },
    onError: () => toast({ title: "更新に失敗しました", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/prospects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      setDeletingId(null);
      toast({ title: "案件を削除しました" });
    },
    onError: () => toast({ title: "削除に失敗しました", variant: "destructive" }),
  });

  const convertMutation = useMutation<ConvertResponse, Error, number>({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/prospects/${id}/convert`, {});
      return res.json() as Promise<ConvertResponse>;
    },
    onSuccess: (json) => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      setConvertingId(null);
      const orderId = json?.data?.order_id;
      toast({ title: `受注転換完了${orderId ? `（受注番号: ${orderId}）` : ""}` });
    },
    onError: (err) => {
      setConvertingId(null);
      toast({ title: "受注転換に失敗しました", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingProspect(null);
    setForm(defaultForm);
    setIsFormOpen(true);
  };

  const openEdit = (p: Prospect) => {
    setEditingProspect(p);
    setForm({
      deal_name: p.deal_name,
      customer_id: p.customer_id ? String(p.customer_id) : "",
      rank: p.rank,
      expected_amount: p.expected_amount != null ? String(p.expected_amount) : "",
      expected_order_date: p.expected_order_date ?? "",
      manager: p.manager ?? "",
      notes: p.notes ?? "",
      status: p.status,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = () => {
    const payload: Record<string, unknown> = {
      deal_name: form.deal_name,
      rank: form.rank,
      status: form.status,
      customer_id: form.customer_id ? parseInt(form.customer_id, 10) : null,
      expected_amount: form.expected_amount ? parseFloat(form.expected_amount) : null,
      expected_order_date: form.rank === "A" && form.expected_order_date ? form.expected_order_date : null,
      manager: form.manager || null,
      notes: form.notes || null,
    };

    if (editingProspect) {
      updateMutation.mutate({ id: editingProspect.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const summaryA = summaryByRank("A");
  const summaryB = summaryByRank("B");
  const summaryC = summaryByRank("C");

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">受注状況管理</h1>
          <p className="text-sm text-muted-foreground mt-1">見込み案件のパイプライン管理</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          見込み案件を登録
        </Button>
      </div>

      {/* Pipeline Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">A ランク（高確度）</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryA.count} 件</div>
            <div className="text-sm text-muted-foreground">{formatAmount(summaryA.total)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">B ランク（中確度）</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryB.count} 件</div>
            <div className="text-sm text-muted-foreground">{formatAmount(summaryB.total)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">C ランク（低確度）</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryC.count} 件</div>
            <div className="text-sm text-muted-foreground">{formatAmount(summaryC.total)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={rankFilter} onValueChange={setRankFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="ランク" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全ランク</SelectItem>
            <SelectItem value="A">A ランク</SelectItem>
            <SelectItem value="B">B ランク</SelectItem>
            <SelectItem value="C">C ランク</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全ステータス</SelectItem>
            <SelectItem value="active">進行中</SelectItem>
            <SelectItem value="won">受注済み</SelectItem>
            <SelectItem value="lost">失注</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Prospects Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : prospects.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              見込み案件がありません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>案件名</TableHead>
                  <TableHead>顧客</TableHead>
                  <TableHead>ランク</TableHead>
                  <TableHead>期待金額</TableHead>
                  <TableHead>期待受注日</TableHead>
                  <TableHead>担当者</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.map((p) => (
                  <TableRow key={p.id} className={p.status === "won" ? "opacity-70" : ""}>
                    <TableCell className="font-medium">{p.deal_name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.customer_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={rankConfig[p.rank].className}>
                        {rankConfig[p.rank].label}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatAmount(p.expected_amount)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.expected_order_date ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.manager ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusConfig[p.status].className}>
                        {statusConfig[p.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {p.rank === "A" && p.status === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConvertingId(p.id)}
                            title="受注転換"
                          >
                            <ArrowRightCircle className="h-4 w-4 mr-1" />
                            受注転換
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(p)}
                          title="編集"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingId(p.id)}
                          title="削除"
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

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) { setIsFormOpen(false); setEditingProspect(null); setForm(defaultForm); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProspect ? "見込み案件を編集" : "見込み案件を登録"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="deal_name">案件名 <span className="text-destructive">*</span></Label>
              <Input
                id="deal_name"
                value={form.deal_name}
                onChange={(e) => setForm({ ...form, deal_name: e.target.value })}
                placeholder="案件名を入力"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="customer_id">顧客</Label>
              <Select
                value={form.customer_id || "none"}
                onValueChange={(v) => setForm({ ...form, customer_id: v === "none" ? "" : v })}
              >
                <SelectTrigger id="customer_id">
                  <SelectValue placeholder="顧客を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未選択</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.code ? `[${c.code}] ` : ""}{c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="rank">ランク <span className="text-destructive">*</span></Label>
                <Select
                  value={form.rank}
                  onValueChange={(v) => setForm({ ...form, rank: v as "A" | "B" | "C", expected_order_date: v !== "A" ? "" : form.expected_order_date })}
                >
                  <SelectTrigger id="rank">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A（高確度）</SelectItem>
                    <SelectItem value="B">B（中確度）</SelectItem>
                    <SelectItem value="C">C（低確度）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="expected_amount">期待金額（円）</Label>
                <Input
                  id="expected_amount"
                  type="number"
                  min={0}
                  value={form.expected_amount}
                  onChange={(e) => setForm({ ...form, expected_amount: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            {form.rank === "A" && (
              <div className="space-y-1">
                <Label htmlFor="expected_order_date">期待受注日</Label>
                <Input
                  id="expected_order_date"
                  type="date"
                  value={form.expected_order_date}
                  onChange={(e) => setForm({ ...form, expected_order_date: e.target.value })}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="manager">担当者</Label>
                <Input
                  id="manager"
                  value={form.manager}
                  onChange={(e) => setForm({ ...form, manager: e.target.value })}
                  placeholder="担当者名"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="status">ステータス</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as "active" | "won" | "lost" })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">進行中</SelectItem>
                    <SelectItem value="won">受注済み</SelectItem>
                    <SelectItem value="lost">失注</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">メモ（次アクション・備考）</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="次のアクションや備考を入力"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsFormOpen(false); setEditingProspect(null); setForm(defaultForm); }}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving || !form.deal_name.trim()}>
              {isSaving ? "保存中..." : editingProspect ? "更新" : "登録"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>案件を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。見込み案件を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId !== null && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert Confirmation */}
      <AlertDialog open={convertingId !== null} onOpenChange={(open) => { if (!open) setConvertingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>受注転換しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この案件を受注管理に登録し、ステータスを「受注済み」に変更します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => convertingId !== null && convertMutation.mutate(convertingId)}
              disabled={convertMutation.isPending}
            >
              {convertMutation.isPending ? "処理中..." : "受注転換する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
