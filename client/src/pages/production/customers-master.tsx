import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Users, Plus, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { insertCustomerMasterSchema, type CustomerMaster, type InsertCustomerMaster } from "@shared/production-schema";

export default function CustomersMasterPage() {
  const { toast } = useToast();
  const [showInactive, setShowInactive] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerMaster | null>(null);

  const form = useForm<InsertCustomerMaster>({
    resolver: zodResolver(insertCustomerMasterSchema),
    defaultValues: {
      code: "",
      name: "",
      zip: "",
      address1: "",
      address2: "",
      phone: "",
      note: "",
      is_active: true
    }
  });

  const { data: customers = [], isLoading } = useQuery<CustomerMaster[]>({
    queryKey: ['/api/customers-master', { include_inactive: showInactive }],
    queryFn: async () => {
      const res = await fetch(`/api/customers-master?include_inactive=${showInactive}`);
      if (!res.ok) throw new Error('Failed to fetch customers');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCustomerMaster) => {
      const res = await apiRequest('POST', '/api/customers-master', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers-master'] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "得意先を追加しました" });
    },
    onError: (error: any) => {
      toast({ 
        title: "エラー", 
        description: error.message || "得意先の追加に失敗しました",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCustomerMaster> }) => {
      const res = await apiRequest('PUT', `/api/customers-master/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers-master'] });
      setEditingCustomer(null);
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "得意先を更新しました" });
    },
    onError: (error: any) => {
      toast({ 
        title: "エラー", 
        description: error.message || "得意先の更新に失敗しました",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/customers-master/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers-master'] });
      toast({ title: "得意先を削除しました" });
    },
    onError: (error: any) => {
      toast({ 
        title: "エラー", 
        description: error.message || "得意先の削除に失敗しました",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: InsertCustomerMaster) => {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openAddDialog = () => {
    setEditingCustomer(null);
    form.reset({
      code: "",
      name: "",
      zip: "",
      address1: "",
      address2: "",
      phone: "",
      note: "",
      is_active: true
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (customer: CustomerMaster) => {
    setEditingCustomer(customer);
    form.reset({
      code: customer.code || "",
      name: customer.name,
      zip: customer.zip || "",
      address1: customer.address1 || "",
      address2: customer.address2 || "",
      phone: customer.phone || "",
      note: customer.note || "",
      is_active: Boolean(customer.is_active)
    });
    setIsDialogOpen(true);
  };

  const toggleActiveStatus = (customer: CustomerMaster) => {
    updateMutation.mutate({
      id: customer.id,
      data: { is_active: !customer.is_active }
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">得意先マスタ</h1>
        </div>
        <Button onClick={openAddDialog} data-testid="button-add-customer">
          <Plus className="h-4 w-4 mr-2" />
          得意先を追加
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              得意先一覧
              <Badge variant="secondary">{customers.length}件</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
                data-testid="switch-show-inactive"
              />
              <Label htmlFor="show-inactive" className="text-sm">非アクティブを表示</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              得意先が登録されていません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>コード</TableHead>
                  <TableHead>得意先名</TableHead>
                  <TableHead>郵便番号</TableHead>
                  <TableHead>住所</TableHead>
                  <TableHead>電話番号</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="w-[120px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} className={!customer.is_active ? "opacity-50" : ""}>
                    <TableCell className="text-sm text-muted-foreground">{customer.code || "-"}</TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.zip || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {[customer.address1, customer.address2].filter(Boolean).join(" ") || "-"}
                    </TableCell>
                    <TableCell>{customer.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={customer.is_active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleActiveStatus(customer)}
                        data-testid={`badge-status-${customer.id}`}
                      >
                        {customer.is_active ? (
                          <><Check className="h-3 w-3 mr-1" />アクティブ</>
                        ) : (
                          <><X className="h-3 w-3 mr-1" />非アクティブ</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEditDialog(customer)}
                          data-testid={`button-edit-${customer.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            if (confirm(`「${customer.name}」を削除しますか？`)) {
                              deleteMutation.mutate(customer.id);
                            }
                          }}
                          data-testid={`button-delete-${customer.id}`}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "得意先を編集" : "得意先を追加"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>得意先コード</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""}
                          placeholder="例: 001" 
                          data-testid="input-customer-code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>得意先名 <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="得意先名を入力" 
                          data-testid="input-customer-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="zip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>郵便番号</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""}
                          placeholder="例: 123-4567" 
                          data-testid="input-zip"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>電話番号</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""}
                          placeholder="電話番号を入力" 
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>住所1</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""}
                        placeholder="都道府県・市区町村" 
                        data-testid="input-address1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>住所2</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""}
                        placeholder="番地・建物名など" 
                        data-testid="input-address2"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>備考</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ""}
                        placeholder="備考を入力" 
                        data-testid="textarea-note"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  キャンセル
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingCustomer ? "更新" : "追加"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
