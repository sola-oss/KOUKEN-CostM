// 合計請求書の一覧
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, FileText, Printer, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function SummaryInvoicesList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

      <div className="border rounded-md bg-card">
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
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>データの取得に失敗しました</p>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>合計請求書がありません</p>
                  <p className="text-sm">「新規作成」から得意先と期間を選んで作成してください</p>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
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
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="印刷"
                        onClick={() => window.open(`/summary-invoices/${row.id}/print`, "_blank")}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="編集"
                        onClick={() => setLocation(`/summary-invoices/${row.id}/edit`)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="削除"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (confirm(`「${row.summary_number}」を削除しますか？`)) {
                            deleteMutation.mutate(row.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
