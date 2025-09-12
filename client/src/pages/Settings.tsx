import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const handleExport = () => {
    console.log("Exporting data...");
  };

  const handleImport = () => {
    console.log("Importing data...");
  };

  const handleBackup = () => {
    console.log("Creating backup...");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">設定</h1>
        <p className="text-muted-foreground mt-1">アプリケーションの設定と管理</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>外観設定</CardTitle>
            <CardDescription>テーマとディスプレイ設定</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">ダークモード</h4>
                <p className="text-sm text-muted-foreground">明るい/暗いテーマの切り替え</p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>データ管理</CardTitle>
            <CardDescription>データのインポート・エクスポート</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={handleExport} className="w-full" data-testid="button-export">
              データエクスポート
            </Button>
            <Button variant="outline" onClick={handleImport} className="w-full" data-testid="button-import">
              データインポート
            </Button>
            <Button variant="outline" onClick={handleBackup} className="w-full" data-testid="button-backup">
              バックアップ作成
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>システム情報</CardTitle>
            <CardDescription>アプリケーションの詳細情報</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">バージョン</span>
              <Badge variant="secondary">1.0.0</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">最終更新</span>
              <span className="text-sm text-muted-foreground">2024年12月</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">データベース</span>
              <Badge variant="outline">In-Memory</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>通知設定</CardTitle>
            <CardDescription>アラートと通知の管理</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">予算超過アラート</h4>
                <p className="text-sm text-muted-foreground">プロジェクト予算を超過した際の通知</p>
              </div>
              <Badge variant="default">有効</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">週次レポート</h4>
                <p className="text-sm text-muted-foreground">週次の原価サマリーレポート</p>
              </div>
              <Badge variant="secondary">無効</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}