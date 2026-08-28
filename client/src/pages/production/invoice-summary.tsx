// 請求集計。月を選ぶと、その月に発行した請求書を客先ごとにまとめて出す。
// 数えるのは個別の請求書だけで、合計請求書は数えない。
// 合計請求書は個別の請求書をまとめたものなので、両方数えると同じ金額が二重になる。
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  BarChart3, ChevronRight, ChevronDown, Printer, FileStack, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { taxableAmount, taxAmount, totalWithTax, TAX_RATE_LABEL } from "@/lib/tax";
import { documentNumber, printPath } from "@/lib/documents";
import { format } from "date-fns";

interface Invoice {
  id: number;
  quote_number: string;
  issue_date: string | null;
  client_name: string;
  converted_order_id: string | null;
  source_quote_number: string | null;
  source_order_id: string | null;
  total_amount: number;
}

const currency = (n: number) =>
  new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(n);

const formatDate = (v: string | null) => {
  if (!v) return "—";
  try {
    return format(new Date(v), "yyyy/MM/dd");
  } catch {
    return v;
  }
};

/** 今月（JST）を YYYY-MM で返す */
const currentMonth = () =>
  new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);

/** YYYY-MM を「2026年8月」にする */
const monthLabel = (m: string) => {
  const parts = /^(\d{4})-(\d{2})$/.exec(m);
  return parts ? `${parts[1]}年${parseInt(parts[2], 10)}月` : m;
};

/** YYYY-MM を月単位でずらす */
const shiftMonth = (m: string, diff: number) => {
  const parts = /^(\d{4})-(\d{2})$/.exec(m);
  if (!parts) return m;
  const d = new Date(Number(parts[1]), Number(parts[2]) - 1 + diff, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function InvoiceSummary() {
  const [, setLocation] = useLocation();
  const [month, setMonth] = useState(currentMonth());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useQuery<{ data: Invoice[] }>({
    queryKey: ["/api/quotes", { kind: "invoice" }],
    queryFn: () => fetch("/api/quotes?kind=invoice").then((r) => r.json()),
    staleTime: 0,
  });

  const invoices = data?.data || [];

  const toggle = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  // その月に発行した請求書だけを客先ごとにまとめる。
  const groups = useMemo(() => {
    const inMonth = invoices.filter((v) => (v.issue_date || "").slice(0, 7) === month);
    const map = new Map<string, { client_name: string; docs: Invoice[]; subtotal: number }>();
    for (const v of inMonth) {
      const name = v.client_name || "（客先未設定）";
      const g = map.get(name) ?? { client_name: name, docs: [], subtotal: 0 };
      g.docs.push(v);
      g.subtotal += v.total_amount ?? 0;
      map.set(name, g);
    }
    return Array.from(map.values())
      .map((g) => ({
        ...g,
        docs: [...g.docs].sort((a, b) => (a.issue_date || "").localeCompare(b.issue_date || "")),
      }))
      .sort((a, b) => b.subtotal - a.subtotal);
  }, [invoices, month]);

  const grandSubtotal = groups.reduce((sum, g) => sum + g.subtotal, 0);
  const invoiceCount = groups.reduce((sum, g) => sum + g.docs.length, 0);

  // 発行実績のある月。月を選ぶ手がかりとして出す。
  const monthsWithData = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((v) => {
      const m = (v.issue_date || "").slice(0, 7);
      if (m) set.add(m);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [invoices]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">請求集計</h1>
        <p className="text-sm text-muted-foreground mt-1">
          その月に発行した請求書を客先ごとに集計します
        </p>
      </div>

      <div className="flex items-end justify-between flex-wrap gap-4">
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <span className="text-sm text-muted-foreground">対象月</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMonth((m) => shiftMonth(m, -1))}
                title="前の月"
                data-testid="button-prev-month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-[160px]"
                data-testid="input-month"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMonth((m) => shiftMonth(m, 1))}
                title="次の月"
                data-testid="button-next-month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {monthsWithData.length > 0 && (
            <div className="flex items-center gap-1 pb-0.5">
              {monthsWithData.slice(0, 4).map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={m === month ? "default" : "ghost"}
                  className="h-8 text-xs"
                  onClick={() => setMonth(m)}
                  data-testid={`button-month-${m}`}
                >
                  {monthLabel(m)}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">請求先</div>
            <div className="text-2xl font-bold" data-testid="stat-clients">
              {groups.length}社
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">請求書</div>
            <div className="text-2xl font-bold" data-testid="stat-invoices">
              {invoiceCount}件
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">
              {monthLabel(month)}の請求額（税込）
            </div>
            <div className="text-2xl font-bold" data-testid="stat-total">
              {currency(totalWithTax(grandSubtotal))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-md bg-card">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>客先名</TableHead>
                <TableHead className="text-right w-24">件数</TableHead>
                <TableHead className="text-right">小計（税別）</TableHead>
                <TableHead className="text-right">消費税（{TAX_RATE_LABEL}）</TableHead>
                <TableHead className="text-right">請求額（税込）</TableHead>
                <TableHead className="w-[150px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>データの取得に失敗しました</p>
                    <p className="text-sm">ページを再読み込みしてください</p>
                  </TableCell>
                </TableRow>
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>{monthLabel(month)}に発行した請求書はありません</p>
                    <p className="text-sm">
                      {monthsWithData.length > 0
                        ? `発行があるのは ${monthsWithData.slice(0, 3).map(monthLabel).join("・")} です`
                        : "請求書は見積書の画面から作成できます"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {groups.map((group) => {
                    const isOpen = expanded.has(group.client_name);
                    return (
                      <React.Fragment key={group.client_name}>
                        <TableRow
                          className="cursor-pointer hover-elevate"
                          onClick={() => toggle(group.client_name)}
                          data-testid={`row-client-${group.client_name}`}
                        >
                          <TableCell className="pr-0">
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{group.client_name}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {group.docs.length}件
                          </TableCell>
                          <TableCell className="text-right">
                            {currency(taxableAmount(group.subtotal))}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {currency(taxAmount(group.subtotal))}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {currency(totalWithTax(group.subtotal))}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                              title="この客先の合計請求書を作る"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation("/summary-invoices/new");
                              }}
                              data-testid={`button-make-summary-${group.client_name}`}
                            >
                              <FileStack className="h-3.5 w-3.5 mr-1.5" />
                              合計請求書へ
                            </Button>
                          </TableCell>
                        </TableRow>

                        {isOpen &&
                          group.docs.map((v) => (
                            <TableRow key={v.id} className="bg-muted/40">
                              <TableCell />
                              <TableCell className="font-mono text-sm pl-6">
                                {documentNumber("invoice", v)}
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {formatDate(v.issue_date)}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {currency(taxableAmount(v.total_amount ?? 0))}
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {currency(taxAmount(v.total_amount ?? 0))}
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium">
                                {currency(totalWithTax(v.total_amount ?? 0))}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  title="請求書を印刷"
                                  onClick={() => window.open(printPath(v.id), "_blank")}
                                  data-testid={`button-print-${v.id}`}
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </React.Fragment>
                    );
                  })}

                  <TableRow className="border-t-2 bg-muted/60 font-medium">
                    <TableCell />
                    <TableCell>合計</TableCell>
                    <TableCell className="text-right">{invoiceCount}件</TableCell>
                    <TableCell className="text-right">
                      {currency(taxableAmount(grandSubtotal))}
                    </TableCell>
                    <TableCell className="text-right">
                      {currency(taxAmount(grandSubtotal))}
                    </TableCell>
                    <TableCell className="text-right" data-testid="cell-grand-total">
                      {currency(totalWithTax(grandSubtotal))}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        数えているのは個別の請求書です。合計請求書はそれらをまとめたものなので、二重に数えないよう集計には含めていません。
      </p>
    </div>
  );
}
