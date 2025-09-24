import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, User, Bell, Shield, Database } from "lucide-react";

export default function Settings() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">設定</h1>
          <p className="text-muted-foreground">システム設定とユーザー設定を管理</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              ユーザー設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">ユーザー名</Label>
              <Input 
                id="username" 
                placeholder="ユーザー名を入力" 
                defaultValue="生産管理者"
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="email@example.com"
                data-testid="input-email" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">所属部署</Label>
              <Input 
                id="department" 
                placeholder="生産管理部"
                data-testid="input-department"
              />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              システム設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>ダークモード</Label>
                <p className="text-sm text-muted-foreground">
                  ダークテーマを使用する
                </p>
              </div>
              <Switch data-testid="switch-darkmode" />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>自動保存</Label>
                <p className="text-sm text-muted-foreground">
                  データを自動的に保存する
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-autosave" />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>リアルタイム更新</Label>
                <p className="text-sm text-muted-foreground">
                  KPIデータをリアルタイムで更新
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-realtime" />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              通知設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>メール通知</Label>
                <p className="text-sm text-muted-foreground">
                  重要なイベントをメールで通知
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-email-notifications" />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>期限アラート</Label>
                <p className="text-sm text-muted-foreground">
                  納期が近づいたときに通知
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-deadline-alerts" />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>在庫アラート</Label>
                <p className="text-sm text-muted-foreground">
                  在庫が少なくなったときに通知
                </p>
              </div>
              <Switch data-testid="switch-inventory-alerts" />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              セキュリティ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">現在のパスワード</Label>
              <Input 
                id="current-password" 
                type="password" 
                placeholder="現在のパスワード"
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">新しいパスワード</Label>
              <Input 
                id="new-password" 
                type="password" 
                placeholder="新しいパスワード"
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">パスワード確認</Label>
              <Input 
                id="confirm-password" 
                type="password" 
                placeholder="パスワードを再入力"
                data-testid="input-confirm-password"
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>二要素認証</Label>
                <p className="text-sm text-muted-foreground">
                  セキュリティを強化する
                </p>
              </div>
              <Switch data-testid="switch-2fa" />
            </div>
          </CardContent>
        </Card>

        {/* Database Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              データベース設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>データベース種別</Label>
                <p className="text-sm font-medium">SQLite</p>
                <p className="text-sm text-muted-foreground">ローカルファイルベース</p>
              </div>
              <div className="space-y-2">
                <Label>データベースファイル</Label>
                <p className="text-sm font-mono">./server/db/production.sqlite</p>
                <p className="text-sm text-muted-foreground">3つのテーブル: orders, procurements, workers_log</p>
              </div>
              <div className="space-y-2">
                <Label>最終バックアップ</Label>
                <p className="text-sm font-medium">2024-09-24 08:30:00</p>
                <p className="text-sm text-muted-foreground">自動バックアップ有効</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex gap-2">
              <Button variant="outline" data-testid="button-backup-now">
                今すぐバックアップ
              </Button>
              <Button variant="outline" data-testid="button-restore-backup">
                バックアップから復元
              </Button>
              <Button variant="outline" data-testid="button-export-data">
                データエクスポート
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Settings */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" data-testid="button-reset-settings">
          設定をリセット
        </Button>
        <Button data-testid="button-save-settings">
          設定を保存
        </Button>
      </div>
    </div>
  );
}