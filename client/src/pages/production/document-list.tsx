// 見積書・請求書・納品書に共通の一覧。
// document_kind で絞り込んだレコードを並べる。3帳票は独立したレコードなので、
// それぞれ編集・削除できる。請求書と納品書は見積書の画面から作成する。
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, FileText, Printer, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { taxableAmount, totalWithTax } from "@/lib/tax";
import { DOCUMENT_CONFIG, documentNumber, editPath, printPath, type DocumentKind } from "@/lib/documents";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Quote {
  id: number;
  quote_number: string;
  issue_date: string | null;
  client_name: string;
  contact_person: string | null;
  client_request_no: string | null;
  status: "draft" | "issued" | "accepted" | "converted";
  converted_order_id: string | null;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "下書き", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  issued: { label: "発行済", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  accepted: { label: "承認済", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  converted: { label: "受注済", className: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
};

export default function DocumentList({ kind }: { kind: DocumentKind }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const config = DOCUMENT_CONFIG[kind];
  const isQuote = kind === "quote";

  const { data, isLoading, isError } = useQuery<{ data: Quote[] }>({
    queryKey: ["/api/quotes", { kind }],
    queryFn: () => fetch(`/api/quotes?kind=${kind}`).then((r) => r.json()),
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/quotes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: `${config.label}を削除しました` });
    },
    onError: (error) => {
      toast({ title: "削除に失敗しました", description: errorMessage(error), variant: "destructive" });
    },
  });

  const quotes = data?.data || [];

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

  const displayAmount = (total: number) =>
    config.taxIncluded ? totalWithTax(total) : taxableAmount(total);

  const columnCount = 6;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{config.label}</h1>
          <p className="text-sm text-muted-foreground mt-1">{config.listDescription}</p>
        </div>
        {isQuote && (
          <Button onClick={() => setLocation("/quotes/new")} data-testid="button-new-quote">
            <Plus className="h-4 w-4 mr-2" />
            新規作成
          </Button>
        )}
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{config.numberLabel}</TableHead>
              <TableHead>客先名</TableHead>
              <TableHead>発行日</TableHead>
              <TableHead className="text-right">{config.listAmountLabel}</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columnCount }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>データの取得に失敗しました</p>
                  <p className="text-sm">ページを再読み込みしてください</p>
                </TableCell>
              </TableRow>
            ) : quotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>{config.label}がありません</p>
                  <p className="text-sm">
                    {isQuote
                      ? "「新規作成」から見積書を作成してください"
                      : `見積書を開いて「${config.label}を作成」から作成してください`}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              quotes.map((quote) => {
                const statusCfg = statusConfig[quote.status] ?? statusConfig.draft;
                return (
                  <TableRow
                    key={quote.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setLocation(editPath(quote.id))}
                    data-testid={`row-quote-${quote.id}`}
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      {documentNumber(kind, quote)}
                    </TableCell>
                    <TableCell>{quote.client_name}</TableCell>
                    <TableCell>{formatDate(quote.issue_date)}</TableCell>
                    <TableCell className="text-right font-medium" data-testid={`col-total-${quote.id}`}>
                      {formatCurrency(displayAmount(quote.total_amount ?? 0))}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusCfg.className} variant="secondary">
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="icon"
                          variant="ghost"
                          title={`${config.label}を印刷`}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(printPath(quote.id), "_blank");
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
                            setLocation(editPath(quote.id));
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
                            if (confirm(`「${quote.quote_number}」を削除しますか？`)) {
                              deleteMutation.mutate(quote.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
