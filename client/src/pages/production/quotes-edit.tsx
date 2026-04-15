import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowLeft, Printer, ShoppingCart, ExternalLink, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CustomerMaster {
  id: number;
  name: string;
  code: string | null;
  zip: string | null;
  address1: string | null;
  address2: string | null;
}

interface WorkerMaster {
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
  unit_weight: number | null;
  unit_price: number | null;
}

interface QuoteItem {
  id?: number;
  sort_order: number;
  material_id: number | null;
  product_name: string;
  model_number: string;
  quantity: number | null;
  unit: string;
  unit_price: number | null;
  notes: string;
}

interface Quote {
  id: number;
  quote_number: string;
  issue_date: string | null;
  client_name: string;
  contact_person: string | null;
  client_request_no: string | null;
  status: "draft" | "issued" | "accepted" | "converted";
  converted_order_id: string | null;
  items: QuoteItem[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "下書き", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  issued: { label: "発行済", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  accepted: { label: "承認済", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  converted: { label: "受注済", className: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
};

const statusOptions = [
  { value: "draft", label: "下書き" },
  { value: "issued", label: "発行済" },
  { value: "accepted", label: "承認済" },
];

function newItem(sortOrder: number): QuoteItem {
  return {
    sort_order: sortOrder,
    material_id: null,
    product_name: "",
    model_number: "",
    quantity: null,
    unit: "式",
    unit_price: null,
    notes: "",
  };
}

function materialLabel(m: Material): string {
  const parts = [m.material_type, m.name, m.size].filter(Boolean);
  return parts.join(" / ");
}

export default function QuotesEdit() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isNew = !params.id || params.id === "new";
  const quoteId = isNew ? null : parseInt(params.id!, 10);

  const { data: quoteData, isLoading } = useQuery<{ data: Quote }>({
    queryKey: ["/api/quotes", quoteId],
    queryFn: () => fetch(`/api/quotes/${quoteId}`).then(r => r.json()),
    enabled: !isNew && !!quoteId,
  });

  const { data: customersData } = useQuery<CustomerMaster[]>({
    queryKey: ["/api/customers-master"],
    queryFn: () => fetch("/api/customers-master").then(r => r.json()),
  });

  const { data: workersData } = useQuery<WorkerMaster[]>({
    queryKey: ["/api/workers-master"],
    queryFn: () => fetch("/api/workers-master").then(r => r.json()),
  });

  const { data: materialsResponse } = useQuery<{ data: Material[] }>({
    queryKey: ["/api/materials"],
    queryFn: () => fetch("/api/materials").then(r => r.json()),
  });

  const customers: CustomerMaster[] = Array.isArray(customersData) ? customersData : [];
  const workers: WorkerMaster[] = Array.isArray(workersData) ? workersData.filter(w => w.is_active) : [];
  const materials: Material[] = materialsResponse?.data || [];

  const quote = quoteData?.data;

  // Form state
  const [quoteNumber, setQuoteNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [clientName, setClientName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [clientRequestNo, setClientRequestNo] = useState("");
  const [status, setStatus] = useState<"draft" | "issued" | "accepted" | "converted">("draft");
  const [items, setItems] = useState<QuoteItem[]>([newItem(0)]);

  // Combobox open states
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const [workerComboOpen, setWorkerComboOpen] = useState(false);
  const [materialComboOpen, setMaterialComboOpen] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (quote) {
      setQuoteNumber(quote.quote_number || "");
      setIssueDate(quote.issue_date || new Date().toISOString().slice(0, 10));
      setClientName(quote.client_name || "");
      setContactPerson(quote.contact_person || "");
      setClientRequestNo(quote.client_request_no || "");
      setStatus(quote.status || "draft");
      setItems(
        quote.items && quote.items.length > 0
          ? quote.items.map((item) => ({
              ...item,
              material_id: item.material_id ?? null,
              product_name: item.product_name || "",
              model_number: item.model_number || "",
              unit: item.unit || "式",
              notes: item.notes || "",
            }))
          : [newItem(0)]
      );
    }
  }, [quote]);

  const subtotal = items.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unit_price || 0);
  }, 0);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(n);

  const handleAddItem = () => {
    setItems((prev) => [...prev, newItem(prev.length)]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof QuoteItem, value: string | number | null) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSelectMaterial = (index: number, material: Material) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              material_id: material.id,
              product_name: [material.name, material.size].filter(Boolean).join(" "),
              unit: material.unit || "式",
              unit_price: material.unit_price ?? null,
            }
          : item
      )
    );
    setMaterialComboOpen((prev) => ({ ...prev, [index]: false }));
  };

  const handleClearMaterial = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, material_id: null, product_name: "", unit: "式", unit_price: null }
          : item
      )
    );
  };

  const buildPayload = () => ({
    quote_number: quoteNumber || undefined,
    issue_date: issueDate || undefined,
    client_name: clientName,
    contact_person: contactPerson || undefined,
    client_request_no: clientRequestNo || undefined,
    status,
    items: items.map((item, idx) => ({
      sort_order: idx,
      material_id: item.material_id ?? null,
      product_name: item.product_name || null,
      model_number: item.model_number || null,
      quantity: item.quantity !== null && item.quantity !== undefined ? Number(item.quantity) : null,
      unit: item.unit || null,
      unit_price: item.unit_price !== null && item.unit_price !== undefined ? Number(item.unit_price) : null,
      notes: item.notes || null,
    })),
  });

  type QuotePayload = ReturnType<typeof buildPayload>;

  const createMutation = useMutation({
    mutationFn: (payload: QuotePayload) => apiRequest("POST", "/api/quotes", payload),
    onSuccess: async (res: Response) => {
      const data = await res.json() as { data?: { id?: number } };
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "見積書を作成しました" });
      if (data?.data?.id) {
        setLocation(`/quotes/${data.data.id}/edit`);
      } else {
        setLocation("/quotes");
      }
    },
    onError: () => {
      toast({ title: "作成に失敗しました", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: QuotePayload) => apiRequest("PATCH", `/api/quotes/${quoteId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId] });
      toast({ title: "見積書を保存しました" });
    },
    onError: () => {
      toast({ title: "保存に失敗しました", variant: "destructive" });
    },
  });

  const convertMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/quotes/${quoteId}/convert`),
    onSuccess: async (res: Response) => {
      const data = await res.json() as { data?: { order_id?: string } };
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId] });
      toast({
        title: "受注を作成しました",
        description: `受注番号: ${data?.data?.order_id ?? ""}`,
      });
    },
    onError: () => {
      toast({ title: "受注作成に失敗しました", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!clientName.trim()) {
      toast({ title: "客先会社名を入力してください", variant: "destructive" });
      return;
    }
    const payload = buildPayload();
    if (isNew) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isConverted = quote?.status === "converted";

  if (!isNew && isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const currentStatus = isNew ? "draft" : (quote?.status || status);
  const statusCfg = statusConfig[currentStatus] || statusConfig.draft;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/quotes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">
              {isNew ? "見積書 新規作成" : `見積書 ${quote?.quote_number || ""}`}
            </h1>
            {!isNew && (
              <Badge className={statusCfg.className} variant="secondary">
                {statusCfg.label}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isNew && (
            <Button
              variant="outline"
              onClick={() => window.open(`/quotes/${quoteId}/print`, "_blank")}
              data-testid="button-print"
            >
              <Printer className="h-4 w-4 mr-2" />
              見積書を印刷
            </Button>
          )}
          {!isNew && !isConverted && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isConverted || convertMutation.isPending}
                  data-testid="button-convert"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  受注を作成
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>受注を作成しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    この見積書の内容から受注データを生成します。見積書のステータスが「受注済」に変わります。この操作は元に戻せません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={() => convertMutation.mutate()}>
                    受注を作成
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={handleSave} disabled={isSaving} data-testid="button-save">
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {isConverted && quote?.converted_order_id && (
        <Card className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-sm font-medium text-purple-800 dark:text-purple-200">受注済み</p>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  受注番号: <span className="font-mono font-semibold">{quote.converted_order_id}</span>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => setLocation(`/project/${quote.converted_order_id}`)}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                受注を表示
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>見積番号</Label>
            <Input
              value={quoteNumber}
              onChange={(e) => setQuoteNumber(e.target.value)}
              placeholder="自動採番（空欄で自動生成）"
              disabled={isConverted}
              data-testid="input-quote-number"
            />
          </div>
          <div className="space-y-2">
            <Label>発行日</Label>
            <Input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              disabled={isConverted}
              data-testid="input-issue-date"
            />
          </div>

          {/* 客先会社名: free-text input + master selector */}
          <div className="space-y-2">
            <Label>客先会社名 <span className="text-destructive">*</span></Label>
            {isConverted ? (
              <Input value={clientName} disabled data-testid="input-client-name" />
            ) : (
              <div className="flex gap-1">
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="株式会社○○（直接入力可）"
                  data-testid="input-client-name"
                  className="flex-1"
                />
                <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      type="button"
                      title="得意先マスタから選択"
                      aria-label="得意先マスタから選択"
                    >
                      <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="会社名で検索..." />
                      <CommandList>
                        <CommandEmpty>
                          <p className="py-3 px-4 text-sm text-muted-foreground">
                            該当する得意先がありません
                          </p>
                        </CommandEmpty>
                        <CommandGroup>
                          {customers.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.name}
                              onSelect={() => {
                                setClientName(c.name);
                                setClientComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn("mr-2 h-4 w-4", clientName === c.name ? "opacity-100" : "opacity-0")}
                              />
                              <span>{c.name}</span>
                              {c.code && <span className="ml-2 text-xs text-muted-foreground">{c.code}</span>}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* 担当者名 combobox from 作業者マスタ */}
          <div className="space-y-2">
            <Label>担当者名</Label>
            {isConverted ? (
              <Input value={contactPerson} disabled data-testid="input-contact-person" />
            ) : (
              <Popover open={workerComboOpen} onOpenChange={setWorkerComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={workerComboOpen}
                    className={cn("w-full justify-between", !contactPerson && "text-muted-foreground")}
                    data-testid="input-contact-person"
                  >
                    <span className="truncate">{contactPerson || "担当者を選択..."}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="担当者名で検索..." />
                    <CommandList>
                      <CommandEmpty>
                        <div className="py-3 px-4 space-y-2">
                          <p className="text-sm text-muted-foreground">該当する担当者がいません</p>
                          <p className="text-xs text-muted-foreground">直接入力することもできます：</p>
                          <Input
                            placeholder="担当者名を入力"
                            value={contactPerson}
                            onChange={(e) => setContactPerson(e.target.value)}
                            className="h-8 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setWorkerComboOpen(false);
                            }}
                          />
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {contactPerson && !workers.find(w => w.name === contactPerson) && (
                          <CommandItem
                            value={contactPerson}
                            onSelect={() => {
                              setWorkerComboOpen(false);
                            }}
                          >
                            <Check className="mr-2 h-4 w-4 opacity-100" />
                            <span>{contactPerson}</span>
                            <span className="ml-2 text-xs text-muted-foreground">（入力値）</span>
                          </CommandItem>
                        )}
                        {workers.map((w) => (
                          <CommandItem
                            key={w.id}
                            value={w.name}
                            onSelect={() => {
                              setContactPerson(w.name);
                              setWorkerComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn("mr-2 h-4 w-4", contactPerson === w.name ? "opacity-100" : "opacity-0")}
                            />
                            <span>{w.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="space-y-2">
            <Label>貴見積依頼番号</Label>
            <Input
              value={clientRequestNo}
              onChange={(e) => setClientRequestNo(e.target.value)}
              placeholder="（任意）"
              disabled={isConverted}
              data-testid="input-client-request-no"
            />
          </div>
          {!isNew && !isConverted && (
            <div className="space-y-2">
              <Label>ステータス</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as Quote["status"])}
                disabled={isConverted}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>明細</CardTitle>
            {!isConverted && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                data-testid="button-add-item"
              >
                <Plus className="h-4 w-4 mr-1" />
                行を追加
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] text-center">整番</TableHead>
                  <TableHead className="w-[240px]">品名（材料マスタから選択）</TableHead>
                  <TableHead className="w-[130px]">型番</TableHead>
                  <TableHead className="w-[70px]">単位</TableHead>
                  <TableHead className="w-[120px] text-right">単価</TableHead>
                  <TableHead className="w-[90px] text-right">数量</TableHead>
                  <TableHead className="w-[120px] text-right">金額</TableHead>
                  <TableHead className="w-[140px]">備考</TableHead>
                  {!isConverted && <TableHead className="w-[48px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const selectedMaterial = item.material_id
                    ? materials.find(m => m.id === item.material_id)
                    : null;

                  return (
                    <TableRow key={index}>
                      {/* 整番 - row number */}
                      <TableCell className="text-center text-sm text-muted-foreground font-mono">
                        {index + 1}
                      </TableCell>

                      {/* 品名 - material picker */}
                      <TableCell>
                        {isConverted ? (
                          <span className="text-sm">{item.product_name || "—"}</span>
                        ) : (
                          <Popover
                            open={materialComboOpen[index] ?? false}
                            onOpenChange={(open) =>
                              setMaterialComboOpen((prev) => ({ ...prev, [index]: open }))
                            }
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between h-8 text-sm font-normal",
                                  !item.product_name && "text-muted-foreground"
                                )}
                              >
                                <span className="truncate">
                                  {selectedMaterial
                                    ? materialLabel(selectedMaterial)
                                    : item.product_name || "材料を選択..."}
                                </span>
                                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[340px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="品名・種別・サイズで検索..." />
                                <CommandList>
                                  <CommandEmpty>
                                    <p className="text-sm text-muted-foreground py-2 px-4">
                                      該当する材料がありません
                                    </p>
                                  </CommandEmpty>
                                  {item.material_id && (
                                    <CommandGroup heading="選択解除">
                                      <CommandItem
                                        value="__clear__"
                                        onSelect={() => handleClearMaterial(index)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">選択を解除する</span>
                                      </CommandItem>
                                    </CommandGroup>
                                  )}
                                  <CommandGroup heading="材料マスタ">
                                    {materials.map((m) => (
                                      <CommandItem
                                        key={m.id}
                                        value={`${m.material_type} ${m.name} ${m.size}`}
                                        onSelect={() => handleSelectMaterial(index, m)}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            item.material_id === m.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <span className="text-sm font-medium">
                                            {m.name} {m.size}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            {m.material_type} · {m.unit}
                                            {m.unit_price != null && ` · ¥${m.unit_price.toLocaleString()}`}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                      </TableCell>

                      {/* 型番 - free input */}
                      <TableCell>
                        {isConverted ? (
                          <span className="text-sm">{item.model_number || "—"}</span>
                        ) : (
                          <Input
                            value={item.model_number}
                            onChange={(e) => handleItemChange(index, "model_number", e.target.value)}
                            placeholder="型番・品番"
                            disabled={isConverted}
                            className="h-8 text-sm"
                          />
                        )}
                      </TableCell>

                      {/* 単位 - read-only from material */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{item.unit || "—"}</span>
                      </TableCell>

                      {/* 単価 - read-only from material */}
                      <TableCell className="text-right">
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {item.unit_price != null ? `¥${item.unit_price.toLocaleString()}` : "—"}
                        </span>
                      </TableCell>

                      {/* 数量 - free input */}
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity ?? ""}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "quantity",
                              e.target.value === "" ? null : parseFloat(e.target.value)
                            )
                          }
                          placeholder="0"
                          disabled={isConverted}
                          className="h-8 text-sm text-right"
                        />
                      </TableCell>

                      {/* 金額 */}
                      <TableCell className="text-right text-sm font-medium">
                        {(item.quantity && item.unit_price)
                          ? formatCurrency((item.quantity || 0) * (item.unit_price || 0))
                          : "—"}
                      </TableCell>

                      {/* 備考 - free input */}
                      <TableCell>
                        <Input
                          value={item.notes}
                          onChange={(e) => handleItemChange(index, "notes", e.target.value)}
                          placeholder="備考"
                          disabled={isConverted}
                          className="h-8 text-sm"
                        />
                      </TableCell>

                      {!isConverted && (
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveItem(index)}
                            disabled={items.length <= 1}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col items-end gap-1 border-t pt-4">
            <div className="flex gap-8 text-sm">
              <span className="text-muted-foreground">小計</span>
              <span className="font-medium tabular-nums w-32 text-right">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex gap-8 text-base font-bold">
              <span>合計（消費税別）</span>
              <span className="tabular-nums w-32 text-right">{formatCurrency(subtotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
