// 合計請求書の新規作成・編集
// 新規：得意先を選ぶ → 未計上の請求書が候補として並ぶ → チェックで選んで作成
// 編集：取り込んだ明細（適用・数量・単位・金額・備考）を個別に直せる
import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer, Trash2, Plus, Loader2, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { apiRequest } from "@/lib/queryClient";
import { cn, errorMessage } from "@/lib/utils";
import { TAX_RATE_LABEL, taxableAmount, taxAmount, totalWithTax } from "@/lib/tax";
import { useToast } from "@/hooks/use-toast";

interface CustomerMaster {
  id: number;
  name: string;
  is_active: boolean;
}

interface Candidate {
  invoice_id: number;
  quote_number: string;
  issue_date: string | null;
  order_id: string | null;
  order_date: string | null;
  description: string | null;
  amount: number;
}

interface SummaryItem {
  id?: number;
  sort_order: number;
  invoice_id: number | null;
  order_id: string | null;
  order_date: string | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  amount: number | null;
  notes: string | null;
}

interface SummaryInvoice {
  id: number;
  summary_number: string;
  issue_date: string | null;
  client_name: string;
  billing_month: string | null;
  status: string;
  items: SummaryItem[];
}

const todayJst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(amount);
}

export default function SummaryInvoiceEdit() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isNew = !params.id || params.id === "new";
  const summaryId = isNew ? null : parseInt(params.id!, 10);

  const [clientName, setClientName] = useState("");
  const [billingMonth, setBillingMonth] = useState(todayJst().slice(0, 7));
  const [issueDate, setIssueDate] = useState(todayJst());
  const [items, setItems] = useState<SummaryItem[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<number>>(new Set());
  const [clientComboOpen, setClientComboOpen] = useState(false);
  // 請求月を手で直したかどうか。直したあとは自動で上書きしない。
  const [billingMonthTouched, setBillingMonthTouched] = useState(false);

  const { data: customersData } = useQuery<CustomerMaster[]>({
    queryKey: ["/api/customers-master"],
    queryFn: () => fetch("/api/customers-master").then((r) => r.json()),
  });
  const customers = (Array.isArray(customersData) ? customersData : []).filter((c) => c.is_active);

  const { data: summaryData, isLoading } = useQuery<{ data: SummaryInvoice }>({
    queryKey: ["/api/summary-invoices", summaryId],
    queryFn: () => fetch(`/api/summary-invoices/${summaryId}`).then((r) => r.json()),
    enabled: !isNew && !!summaryId,
  });
  const summary = summaryData?.data;

  useEffect(() => {
    if (!summary) return;
    setClientName(summary.client_name);
    setBillingMonth(summary.billing_month || "");
    setIssueDate(summary.issue_date || "");
    setItems(summary.items || []);
  }, [summary]);

  // 候補の絞り込み期間（任意）。既定は絞り込まず、未計上の請求書をすべて出す。
  // 受注は月をまたぐので、期間で機械的に切ると載せ忘れに気づけなくなるため。
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const range = { from: filterFrom || undefined, to: filterTo || undefined };

  const { data: candidatesData, isFetching: loadingCandidates } = useQuery<{ data: Candidate[] }>({
    queryKey: ["/api/summary-invoices/candidates", clientName, range.from, range.to],
    queryFn: () => {
      const p = new URLSearchParams({ client_name: clientName });
      if (range.from) p.set("from", range.from);
      if (range.to) p.set("to", range.to);
      return fetch(`/api/summary-invoices/candidates?${p}`).then((r) => r.json());
    },
    enabled: isNew && !!clientName,
  });
  const candidates = candidatesData?.data || [];

  // 請求月は、選んだ請求書の発行月に合わせる。
  // 以前は作成した日の月が初期値だったので、月をまたいで作業すると実態とずれていた。
  // 手で直したあとは触らない。
  useEffect(() => {
    if (!isNew || billingMonthTouched) return;
    const months = candidates
      .filter((c) => selectedInvoiceIds.has(c.invoice_id))
      .map((c) => c.issue_date?.slice(0, 7))
      .filter((m): m is string => !!m);
    if (months.length === 0) return;
    // 一番多い発行月にする。同数なら新しいほう。
    const tally: Record<string, number> = {};
    months.forEach((m) => { tally[m] = (tally[m] ?? 0) + 1; });
    const best = Object.entries(tally).sort(
      (a, b) => b[1] - a[1] || b[0].localeCompare(a[0])
    )[0][0];
    setBillingMonth(best);
  }, [candidates, selectedInvoiceIds, isNew, billingMonthTouched]);

  const toggleCandidate = (invoiceId: number) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) next.delete(invoiceId);
      else next.add(invoiceId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedInvoiceIds((prev) =>
      prev.size === candidates.length ? new Set() : new Set(candidates.map((c) => c.invoice_id))
    );
  };

  const updateItem = (index: number, patch: Partial<SummaryItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, sort_order: i })));
  };

  const addBlankItem = () => {
    setItems((prev) => [
      ...prev,
      {
        sort_order: prev.length,
        invoice_id: null,
        order_id: "",
        order_date: "",
        description: "",
        quantity: 1,
        unit: "",
        amount: null,
        notes: "",
      },
    ]);
  };

  const subtotal = (isNew ? candidates.filter((c) => selectedInvoiceIds.has(c.invoice_id)) : items).reduce(
    (sum, row: any) => sum + Number(row.amount ?? 0),
    0
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const selected = candidates.filter((c) => selectedInvoiceIds.has(c.invoice_id));
      const res = await apiRequest("POST", "/api/summary-invoices", {
        client_name: clientName,
        billing_month: billingMonth || null,
        issue_date: issueDate || null,
        items: selected.map((c, i) => ({
          sort_order: i,
          invoice_id: c.invoice_id,
          order_id: c.order_id,
          order_date: c.order_date,
          description: null,
          quantity: 1,
          unit: null,
          amount: c.amount,
          notes: null,
        })),
      });
      return (await res.json()) as { data?: { id?: number } };
    },
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["/api/summary-invoices"] });
      toast({ title: "合計請求書を作成しました" });
      if (payload?.data?.id) setLocation(`/summary-invoices/${payload.data.id}/edit`);
    },
    onError: (error) => {
      toast({ title: "作成に失敗しました", description: errorMessage(error), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/summary-invoices/${summaryId}`, {
        client_name: clientName,
        billing_month: billingMonth || null,
        issue_date: issueDate || null,
        items: items.map((item, i) => ({ ...item, sort_order: i })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summary-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/summary-invoices", summaryId] });
      toast({ title: "保存しました" });
    },
    onError: (error) => {
      toast({ title: "保存に失敗しました", description: errorMessage(error), variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!clientName.trim()) {
      toast({ title: "得意先を選んでください", variant: "destructive" });
      return;
    }
    if (isNew) {
      if (selectedInvoiceIds.size === 0) {
        toast({ title: "請求書を1件以上選んでください", variant: "destructive" });
        return;
      }
      createMutation.mutate();
    } else {
      updateMutation.mutate();
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (!isNew && isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/summary-invoices")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight flex-1 min-w-0">
          {isNew ? "合計請求書 新規作成" : `合計請求書 ${summary?.summary_number || ""}`}
        </h1>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button
              variant="outline"
              onClick={() => window.open(`/summary-invoices/${summaryId}/print`, "_blank")}
            >
              <Printer className="h-4 w-4 mr-2" />
              印刷
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isNew ? "作成" : "保存"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">請求先と対象月</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>得意先 *</Label>
              <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between font-normal overflow-hidden",
                      !clientName && "text-muted-foreground"
                    )}
                    data-testid="select-client"
                  >
                    <span className="min-w-0 truncate text-left">
                      {clientName || "得意先を選択"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="得意先名で検索..." />
                    <CommandList>
                      <CommandEmpty>該当する得意先がありません</CommandEmpty>
                      <CommandGroup>
                        {customers.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.name}
                            onSelect={() => {
                              setClientName(c.name);
                              setSelectedInvoiceIds(new Set());
                              setClientComboOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", clientName === c.name ? "opacity-100" : "opacity-0")} />
                            <span className="truncate">{c.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>請求月</Label>
              <Input
                type="month"
                value={billingMonth}
                onChange={(e) => { setBillingMonth(e.target.value); setBillingMonthTouched(true); }}
                data-testid="input-billing-month"
              />
            </div>
            <div className="space-y-2">
              <Label>発行年月日</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {isNew ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              対象の請求書を選ぶ
              {candidates.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {selectedInvoiceIds.size} / {candidates.length} 件選択
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 flex-wrap mb-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">請求書の発行日で絞り込み（任意）</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    className="w-[160px]"
                    value={filterFrom}
                    onChange={(e) => setFilterFrom(e.target.value)}
                  />
                  <span className="text-muted-foreground">〜</span>
                  <Input
                    type="date"
                    className="w-[160px]"
                    value={filterTo}
                    onChange={(e) => setFilterTo(e.target.value)}
                  />
                  {(filterFrom || filterTo) && (
                    <Button variant="ghost" size="sm" onClick={() => { setFilterFrom(""); setFilterTo(""); }}>
                      クリア
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {!clientName ? (
              <p className="text-sm text-muted-foreground py-8 text-center">得意先を選んでください</p>
            ) : loadingCandidates ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                この得意先で、まだ合計請求書に載せていない請求書がありません
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedInvoiceIds.size === candidates.length && candidates.length > 0}
                        onCheckedChange={toggleAll}
                        aria-label="すべて選択"
                      />
                    </TableHead>
                    <TableHead>受注日</TableHead>
                    <TableHead>受注番号</TableHead>
                    <TableHead>件名</TableHead>
                    <TableHead>請求書番号</TableHead>
                    <TableHead className="text-right">金額（税抜）</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((c) => (
                    <TableRow
                      key={c.invoice_id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => toggleCandidate(c.invoice_id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedInvoiceIds.has(c.invoice_id)}
                          onCheckedChange={() => toggleCandidate(c.invoice_id)}
                        />
                      </TableCell>
                      <TableCell>{c.order_date || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{c.order_id || "—"}</TableCell>
                      <TableCell className="max-w-[260px] truncate text-muted-foreground">
                        {c.description || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{c.quote_number}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(c.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">明細</CardTitle>
              <Button size="sm" variant="outline" onClick={addBlankItem}>
                <Plus className="h-4 w-4 mr-1" />
                行を追加
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px]">受注日</TableHead>
                  <TableHead className="w-[130px]">受注番号</TableHead>
                  <TableHead>適用</TableHead>
                  <TableHead className="w-[80px]">数量</TableHead>
                  <TableHead className="w-[80px]">単位</TableHead>
                  <TableHead className="w-[140px]">金額</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id ?? `new-${index}`}>
                    <TableCell>
                      <Input
                        type="date"
                        value={item.order_date || ""}
                        onChange={(e) => updateItem(index, { order_date: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.order_id || ""}
                        onChange={(e) => updateItem(index, { order_id: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.description || ""}
                        onChange={(e) => updateItem(index, { description: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity ?? ""}
                        onChange={(e) =>
                          updateItem(index, { quantity: e.target.value === "" ? null : Number(e.target.value) })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.unit || ""}
                        onChange={(e) => updateItem(index, { unit: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.amount ?? ""}
                        onChange={(e) =>
                          updateItem(index, { amount: e.target.value === "" ? null : Number(e.target.value) })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.notes || ""}
                        onChange={(e) => updateItem(index, { notes: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => removeItem(index)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      明細がありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col items-end gap-1 border-t pt-4">
        <div className="flex gap-8 text-sm">
          <span className="text-muted-foreground">小計（{TAX_RATE_LABEL}対象）</span>
          <span className="font-medium tabular-nums w-36 text-right">{formatCurrency(taxableAmount(subtotal))}</span>
        </div>
        <div className="flex gap-8 text-sm">
          <span className="text-muted-foreground">消費税（{TAX_RATE_LABEL}）</span>
          <span className="font-medium tabular-nums w-36 text-right">{formatCurrency(taxAmount(subtotal))}</span>
        </div>
        <div className="flex gap-8 text-base font-bold border-t pt-1 mt-1">
          <span>当月合計請求額</span>
          <span className="tabular-nums w-36 text-right">{formatCurrency(totalWithTax(subtotal))}</span>
        </div>
      </div>
    </div>
  );
}
