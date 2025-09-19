import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createSalesOrder, listCustomers, type SalesOrderPayload } from "@/shared/api";

export default function NewSalesOrder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [customerId, setCustomerId] = useState("");
  const [orderDate, setOrderDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch customers
  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: () => listCustomers({ page_size: 100 }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createSalesOrder,
    onSuccess: (data) => {
      toast({
        title: "受注を作成しました",
        description: `受注ID: ${data.id}`,
      });
      // Invalidate sales orders list
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      // Navigate to detail page
      setLocation(`/sales-orders/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "エラーが発生しました",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!customerId) {
      newErrors.customer_id = "顧客は必須です";
    }

    if (!orderDate) {
      newErrors.order_date = "受注日は必須です";
    }

    if (deliveryDate && orderDate && new Date(deliveryDate) < new Date(orderDate)) {
      newErrors.delivery_date = "納期は受注日以降の日付を設定してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload: SalesOrderPayload = {
      customer_id: parseInt(customerId),
      order_date: orderDate,
      delivery_date: deliveryDate || undefined,
      notes: notes.trim() || undefined,
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/sales-orders')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            新規受注作成
          </h1>
          <p className="text-muted-foreground">
            新しい受注を作成します
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>受注情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Selection */}
              <div className="space-y-2">
                <Label htmlFor="customer_id">
                  顧客 <span className="text-destructive">*</span>
                </Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger 
                    className={errors.customer_id ? "border-destructive" : ""}
                    data-testid="select-customer"
                  >
                    <SelectValue placeholder="顧客を選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {customersQuery.data?.data.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name} ({customer.code})
                      </SelectItem>
                    )) ?? []}
                  </SelectContent>
                </Select>
                {customersQuery.isLoading && (
                  <p className="text-sm text-muted-foreground">顧客一覧を読み込み中...</p>
                )}
                {errors.customer_id && (
                  <p className="text-sm text-destructive">{errors.customer_id}</p>
                )}
              </div>

              {/* Order Date */}
              <div className="space-y-2">
                <Label htmlFor="order_date">
                  受注日 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="order_date"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  data-testid="input-order-date"
                  className={errors.order_date ? "border-destructive" : ""}
                />
                {errors.order_date && (
                  <p className="text-sm text-destructive">{errors.order_date}</p>
                )}
              </div>

              {/* Delivery Date */}
              <div className="space-y-2">
                <Label htmlFor="delivery_date">納期</Label>
                <Input
                  id="delivery_date"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  placeholder="納期（任意）"
                  data-testid="input-delivery-date"
                  className={errors.delivery_date ? "border-destructive" : ""}
                />
                {errors.delivery_date && (
                  <p className="text-sm text-destructive">{errors.delivery_date}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">メモ</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="メモ（任意）"
                rows={4}
                data-testid="textarea-notes"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/sales-orders')}
                data-testid="button-cancel"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-submit"
              >
                {createMutation.isPending ? (
                  "作成中..."
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    作成
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}