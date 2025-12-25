import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Building2, Plus, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { insertVendorMasterSchema, type VendorMaster, type InsertVendorMaster } from "@shared/production-schema";

export default function VendorsMasterPage() {
  const { toast } = useToast();
  const [showInactive, setShowInactive] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorMaster | null>(null);

  const form = useForm<InsertVendorMaster>({
    resolver: zodResolver(insertVendorMasterSchema),
    defaultValues: {
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      note: "",
      is_active: true
    }
  });

  const { data: vendors = [], isLoading } = useQuery<VendorMaster[]>({
    queryKey: ['/api/vendors-master', { include_inactive: showInactive }],
    queryFn: async () => {
      const res = await fetch(`/api/vendors-master?include_inactive=${showInactive}`);
      if (!res.ok) throw new Error('Failed to fetch vendors');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertVendorMaster) => {
      const res = await apiRequest('POST', '/api/vendors-master', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendors-master'] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "外注先を追加しました" });
    },
    onError: (error: any) => {
      toast({ 
        title: "エラー", 
        description: error.message || "外注先の追加に失敗しました",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertVendorMaster> }) => {
      const res = await apiRequest('PUT', `/api/vendors-master/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendors-master'] });
      setEditingVendor(null);
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "外注先を更新しました" });
    },
    onError: (error: any) => {
      toast({ 
        title: "エラー", 
        description: error.message || "外注先の更新に失敗しました",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/vendors-master/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendors-master'] });
      toast({ title: "外注先を削除しました" });
    },
    onError: (error: any) => {
      toast({ 
        title: "エラー", 
        description: error.message || "外注先の削除に失敗しました",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: InsertVendorMaster) => {
    if (editingVendor) {
      updateMutation.mutate({ id: editingVendor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openAddDialog = () => {
    setEditingVendor(null);
    form.reset({
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      note: "",
      is_active: true
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (vendor: VendorMaster) => {
    setEditingVendor(vendor);
    form.reset({
      name: vendor.name,
      contact_person: vendor.contact_person || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
      address: vendor.address || "",
      note: vendor.note || "",
      is_active: Boolean(vendor.is_active)
    });
    setIsDialogOpen(true);
  };

  const toggleActiveStatus = (vendor: VendorMaster) => {
    updateMutation.mutate({
      id: vendor.id,
      data: { is_active: !vendor.is_active }
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">外注先マスタ</h1>
        </div>
        <Button onClick={openAddDialog} data-testid="button-add-vendor">
          <Plus className="h-4 w-4 mr-2" />
          外注先を追加
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              外注先一覧
              <Badge variant="secondary">{vendors.length}件</Badge>
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
          ) : vendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              外注先が登録されていません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>外注先名</TableHead>
                  <TableHead>担当者</TableHead>
                  <TableHead>電話番号</TableHead>
                  <TableHead>メール</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="w-[120px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id} className={!vendor.is_active ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>{vendor.contact_person || "-"}</TableCell>
                    <TableCell>{vendor.phone || "-"}</TableCell>
                    <TableCell>{vendor.email || "-"}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={vendor.is_active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleActiveStatus(vendor)}
                        data-testid={`badge-status-${vendor.id}`}
                      >
                        {vendor.is_active ? (
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
                          onClick={() => openEditDialog(vendor)}
                          data-testid={`button-edit-${vendor.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            if (confirm(`「${vendor.name}」を削除しますか？`)) {
                              deleteMutation.mutate(vendor.id);
                            }
                          }}
                          data-testid={`button-delete-${vendor.id}`}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVendor ? "外注先を編集" : "外注先を追加"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>外注先名 *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="外注先名を入力" 
                        data-testid="input-vendor-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>担当者</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""}
                        placeholder="担当者名を入力" 
                        data-testid="input-contact-person"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>メールアドレス</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""}
                          type="email" 
                          placeholder="メールアドレスを入力" 
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>住所</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""}
                        placeholder="住所を入力" 
                        data-testid="input-address"
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
                  {editingVendor ? "更新" : "追加"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}