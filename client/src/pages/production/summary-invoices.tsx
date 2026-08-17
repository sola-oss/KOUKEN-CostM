// 合計請求書の一覧。既定は客先ごとの折りたたみ表示。
import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Plus, FileText, Printer, ArrowRight, Trash2,
  List, FolderTree, ChevronRight, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage } from "@/lib/utils";
import { totalWithTax } from "@/lib/tax";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SummaryInvoice {
  id: number;
  summary_number: string;
  issue_date: string | null;
  client_name: string;
  billing_month: string | null;
  status: string;
  total_amount: number;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "yyyy/MM/dd");
  } catch {
    return dateStr;
  }
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(amount);

export default function SummaryInvoicesList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped");
  const [filterClient, setFilterClient] = useState("");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const toggleClient = (name: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const { data, isLoading, isError } = useQuery<{ data: SummaryInvoice[] }>({
    queryKey: ["/api/summary-invoices"],
    queryFn: () => fetch("/api/summary-invoices").then((r) => r.json()),
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/summary-invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summary-invoices"] });
      toast({ title: "合計請求書を削除しました" });
    },
    onError: (error) => {
      toast({ title: "削除に失敗しました", description: errorMessage(error), variant: "destructive" });
    },
  });

  const rows = data?.data || [];

  const filteredRows = useMemo(() => {
    const needle = filterClient.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => (r.client_name || "").toLowerCase().includes(needle));
  }, [rows, filterClient]);

  const groups = useMemo(() => {
    const map = new Map<string, { client_name: string; docs: SummaryInvoice[]; total: number }>();
    filteredRows.forEach((r) => {
      const name = r.client_name || "（客先未設定）";
      const g = map.get(name) ?? { client_name: name, docs: [], total: 0 };
      g.docs.push(r);
      g.total += totalWithTax(r.total_amount ?? 0);
      map.set(name, g);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredRows]);

  const renderActions = (row: SummaryInvoice) => (
    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      <Button
        size="icon"
        variant="ghost"
        title="印刷"
        onClick={(e) => {
          e.stopPropagation();
          window.open(`/summary-invoices/${row.id}/print`, "_blank");
        }}
      >
        <Printer className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        title="編集"
        onClick={(e) => {
          e.stopPropagation();
          setLocation(`/summary-invoices/${row.id}/edit`);
        }}
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        title="削除"
        disabled={deleteMutation.isPending}
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`「${row.summary_number}」を削除しますか？`)) {
            deleteMutation.mutate(row.id);
          }
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const emptyState = (colSpan: number) => (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
        {isError ? (
          <p>データの取得に失敗しました</p>
        ) : rows.length === 0 ? (
          <>
            <p>合計請求書がありません</p>
            <p className="text-sm">「新規作成」から得意先を選んで作成してください</p>
          </>
        ) : (
          <p>該当する客先がありません</p>
        )}
      </TableCell>
    </TableRow>
  );

  const hasRows = !isError && filteredRows.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">合計請求書</h1>
          <p className="text-sm text-muted-foreground mt-1">
            得意先ごとに、発行済みの請求書をまとめて請求する
          </p>
        </div>
        <Button onClick={() => setLocation("/summary-invoices/new")} data-testid="button-new-summary">
          <Plus className="h-4 w-4 mr-2" />
          新規作成
        </Button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 border rounded-md p-0.5">
          <Button
            size="sm"
            variant={viewMode === "grouped" ? "default" : "ghost"}
            onClick={() => setViewMode("grouped")}
            className="h-7 gap-1.5 text-xs"
            data-testid="button-view-grouped"
          >
            <FolderTree className="h-3.5 w-3.5" />
            客先別
          </Button>
          <Button
            size="sm"
            variant={viewMode === "list" ? "default" : "ghost"}
            onClick={() => setViewMode("list")}
            className="h-7 gap-1.5 text-xs"
            data-testid="button-view-list"
          >
            <List className="h-3.5 w-3.5" />
            一覧
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">客先で絞り込み</span>
          <Input
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            placeholder="得意先名"
            className="w-[220px]"
            data-testid="input-filter-client"
          />
        </div>
      </div>

      <div className="border rounded-md bg-card">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : viewMode === "grouped" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>得意先名</TableHead>
                <TableHead className="text-right w-24">件数</TableHead>
                <TableHead className="text-right">御請求金額（税込）</TableHead>
                <TableHead className="w-[140px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!hasRows
                ? emptyState(5)
                : groups.map((group) => {
                    const isExpanded = expandedClients.has(group.client_name);
                    return (
                      <React.Fragment key={group.client_name}>
                        <TableRow
                          className="cursor-pointer hover-elevate"
                          onClick={() => toggleClient(group.client_name)}
                        >
                          <TableCell className="pr-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{group.client_name}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {group.docs.length}件
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(group.total)}
                          </TableCell>
                          <TableCell />
                        </TableRow>

                        {isExpanded &&
                          group.docs.map((row) => (
                            <TableRow
                              key={row.id}
                              className="bg-muted/40 cursor-pointer hover-elevate"
                              onClick={() => setLocation(`/summary-invoices/${row.id}/edit`)}
                              data-testid={`row-summary-${row.id}`}
                            >
                              <TableCell />
                              <TableCell className="font-mono text-sm pl-6">
                                {row.summary_number}
                                {row.billing_month && (
                                  <span className="ml-2 text-xs text-muted-foreground font-sans">
                                    {row.billing_month}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {formatDate(row.issue_date)}
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium">
                                {formatCurrency(totalWithTax(row.total_amount ?? 0))}
                              </TableCell>
                              <TableCell>{renderActions(row)}</TableCell>
                            </TableRow>
                          ))}
                      </React.Fragment>
                    );
                  })}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>合計請求番号</TableHead>
                <TableHead>得意先名</TableHead>
                <TableHead>請求月</TableHead>
                <TableHead>発行日</TableHead>
                <TableHead className="text-right">御請求金額（税込）</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!hasRows
                ? emptyState(6)
                : filteredRows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setLocation(`/summary-invoices/${row.id}/edit`)}
                      data-testid={`row-summary-${row.id}`}
                    >
                      <TableCell className="font-mono text-sm font-medium">{row.summary_number}</TableCell>
                      <TableCell>{row.client_name}</TableCell>
                      <TableCell>{row.billing_month || "—"}</TableCell>
                      <TableCell>{formatDate(row.issue_date)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(totalWithTax(row.total_amount ?? 0))}
                      </TableCell>
                      <TableCell className="text-right">{renderActions(row)}</TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
