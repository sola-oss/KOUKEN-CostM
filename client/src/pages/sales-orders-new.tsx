import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createSalesOrder, type SalesOrderPayload } from "@/shared/api";

export default function NewSalesOrder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [orderDate, setOrderDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      // Navigate back to list page
      setLocation('/sales-orders');
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

    if (!customerName.trim()) {
      newErrors.customer_name = "顧客名は必須です";
    }

    if (!orderDate) {
      newErrors.order_date = "受注日は必須です";
    }

    if (dueDate && orderDate && new Date(dueDate) < new Date(orderDate)) {
      newErrors.due_date = "納期は受注日以降の日付を設定してください";
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
      customer_name: customerName.trim(),
      order_date: orderDate,
      due_date: dueDate || undefined,
      note: note.trim() || undefined,
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
              {/* Customer Name */}
              <div className="space-y-2">
                <Label htmlFor="customer_name">
                  顧客名 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customer_name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="顧客名を入力してください"
                  data-testid="input-customer-name"
                  className={errors.customer_name ? "border-destructive" : ""}
                />
                {errors.customer_name && (
                  <p className="text-sm text-destructive">{errors.customer_name}</p>
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

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="due_date">納期</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  placeholder="納期（任意）"
                  data-testid="input-due-date"
                  className={errors.due_date ? "border-destructive" : ""}
                />
                {errors.due_date && (
                  <p className="text-sm text-destructive">{errors.due_date}</p>
                )}
              </div>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">メモ</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="メモ（任意）"
                rows={4}
                data-testid="textarea-note"
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