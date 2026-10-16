// 請求集計。年を選ぶと、その年の月ごとの請求額を客先別の積み上げグラフで出す。
// 月を選ぶと、その月に発行した請求書を客先ごとにまとめて表に出す。
// 数えるのは個別の請求書だけで、合計請求書は数えない。
// 合計請求書は個別の請求書をまとめたものなので、両方数えると同じ金額が二重になる。
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
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
  project_title: string | null;
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

/** グラフで会社名を出す社数。残りは「その他」にまとめる。 */
const TOP_CLIENTS = 5;
const OTHERS_KEY = "その他";
// 上位から順に固定で割り当てる（色覚の違いでも隣どうしが見分けられる組み合わせ）。
const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
const OTHERS_COLOR = "#a3a29c";

const manYen = (n: number) => `${Math.round(n / 10000).toLocaleString("ja-JP")}万`;

type ChartRow = { month: string; label: string } & Record<string, number | string>;

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const rows = payload.filter((p) => (p.value ?? 0) > 0);
  const total = rows.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium mb-1">{label}</div>
      {rows.length === 0 ? (
        <div className="text-muted-foreground">請求なし</div>
      ) : (
        <>
          {[...rows].reverse().map((p) => (
            <div key={p.name} className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color }} />
              <span className="flex-1">{p.name}</span>
              <span className="tabular-nums">{currency(p.value)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t mt-1 pt-1 font-medium">
            <span>合計</span>
            <span className="tabular-nums">{currency(total)}</span>
          </div>
        </>
      )}
    </div>
  );
}

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

  // 年は選んでいる月から決める。月を年またぎで動かせば年も一緒に変わる。
  const year = month.slice(0, 4);

  // 発行実績のある月（選んでいる年の分だけ）。月を選ぶ手がかりとして出す。
  const monthsWithData = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((v) => {
      const m = (v.issue_date || "").slice(0, 7);
      if (m.startsWith(`${year}-`)) set.add(m);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [invoices, year]);

  // 年を切り替えたら、その年の発行がある一番新しい月を開く。無ければ同じ月のまま。
  const shiftYear = (diff: number) => {
    const nextYear = String(Number(year) + diff);
    const months = invoices
      .map((v) => (v.issue_date || "").slice(0, 7))
      .filter((m) => m.startsWith(`${nextYear}-`))
      .sort((a, b) => b.localeCompare(a));
    setMonth(months[0] ?? `${nextYear}-${month.slice(5, 7)}`);
  };

  // グラフ用。その年の請求額（税込）が大きい順に上位の客先を出し、残りは「その他」にまとめる。
  const chart = useMemo(() => {
    const inYear = invoices.filter((v) => (v.issue_date || "").startsWith(`${year}-`));
    const byClient = new Map<string, number>();
    for (const v of inYear) {
      const name = v.client_name || "（客先未設定）";
      byClient.set(name, (byClient.get(name) ?? 0) + (v.total_amount ?? 0));
    }
    const ranked = Array.from(byClient.entries()).sort((a, b) => b[1] - a[1]).map(([n]) => n);
    const top = ranked.slice(0, TOP_CLIENTS);
    const hasOthers = ranked.length > TOP_CLIENTS;

    const rows: ChartRow[] = Array.from({ length: 12 }, (_, i) => {
      const m = `${year}-${String(i + 1).padStart(2, "0")}`;
      const row: ChartRow = { month: m, label: `${i + 1}月` };
      for (const name of top) row[name] = 0;
      if (hasOthers) row[OTHERS_KEY] = 0;
      return row;
    });
    for (const v of inYear) {
      const idx = Number((v.issue_date || "").slice(5, 7)) - 1;
      if (idx < 0 || idx > 11) continue;
      const name = v.client_name || "（客先未設定）";
      const key = top.includes(name) ? name : OTHERS_KEY;
      rows[idx][key] = (rows[idx][key] as number) + totalWithTax(v.total_amount ?? 0);
    }
    const series = [
      ...top.map((name, i) => ({ key: name, color: SERIES_COLORS[i] })),
      ...(hasOthers ? [{ key: OTHERS_KEY, color: OTHERS_COLOR }] : []),
    ];
    const yearTotal = inYear.reduce((s, v) => s + totalWithTax(v.total_amount ?? 0), 0);
    return { rows, series, yearTotal, count: inYear.length };
  }, [invoices, year]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">請求集計</h1>
        <p className="text-sm text-muted-foreground mt-1">
          その年・その月に発行した請求書を客先ごとに集計します
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => shiftYear(-1)}
          title="前の年"
          data-testid="button-prev-year"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="w-[96px] text-center text-lg font-semibold" data-testid="text-year">
          {year}年
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => shiftYear(1)}
          title="次の年"
          data-testid="button-next-year"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
            <div className="text-sm font-medium">{year}年の請求額の推移（税込）</div>
            <div className="text-sm text-muted-foreground">
              年間 <span className="font-semibold text-foreground" data-testid="stat-year-total">{currency(chart.yearTotal)}</span>
              <span className="ml-2">{chart.count}件</span>
            </div>
          </div>
          {chart.count === 0 ? (
            <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground text-sm">
              <BarChart3 className="h-10 w-10 mb-2 opacity-30" />
              {year}年に発行した請求書はありません
            </div>
          ) : (
            <div className="h-[300px]" data-testid="chart-yearly">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chart.rows}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  onClick={(e) => {
                    const row = e?.activePayload?.[0]?.payload as ChartRow | undefined;
                    if (row) setMonth(row.month);
                  }}
                >
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickFormatter={manYen} tickLine={false} axisLine={false} fontSize={12} width={56} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    iconType="square"
                    iconSize={10}
                    formatter={(value: string) => (
                      <span className="text-foreground whitespace-nowrap mr-2">{value}</span>
                    )}
                  />
                  {chart.series.map((s) => (
                    <Bar
                      key={s.key}
                      dataKey={s.key}
                      name={s.key}
                      stackId="total"
                      fill={s.color}
                      stroke="hsl(var(--card))"
                      strokeWidth={1}
                      maxBarSize={48}
                      className="cursor-pointer"
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            上位{TOP_CLIENTS}社は会社ごと、それ以外は「その他」にまとめています。棒を押すとその月の内訳が下の表に出ます。
          </p>
        </CardContent>
      </Card>

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
                              <TableCell className="text-sm pl-6">
                                <span className="font-mono">{documentNumber("invoice", v)}</span>
                                {v.project_title && (
                                  <span className="ml-3 text-muted-foreground">{v.project_title}</span>
                                )}
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
