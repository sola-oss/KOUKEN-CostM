import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Download, 
  Calendar,
  FileSpreadsheet,
  BarChart3,
  TrendingUp,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

// Type definitions
interface MonthlyReportData {
  sales_order_id: number;
  so_no: string;
  customer_name: string;
  total_minutes: number;
  entry_count: number;
}

export default function Reports() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM")
  );
  const [isDownloading, setIsDownloading] = useState(false);

  // Preview report data for the selected month
  const { data: reportData, isLoading } = useQuery<MonthlyReportData[]>({
    queryKey: [
      '/api/simple-time-entries',
      {
        status: 'approved',
        month: selectedMonth,
        page: 1,
        page_size: 1000,
      }
    ],
    enabled: !!selectedMonth,
    // We'll simulate the report data by fetching approved time entries
    // and grouping them by sales order
    select: (data: any) => {
      if (!data?.data) return [];
      
      // Group entries by sales order
      const grouped = data.data.reduce((acc: any, entry: any) => {
        const key = entry.sales_order_id;
        if (!acc[key]) {
          acc[key] = {
            sales_order_id: entry.sales_order_id,
            so_no: entry.order_no,
            customer_name: entry.customer_name,
            total_minutes: 0,
            entry_count: 0
          };
        }
        acc[key].total_minutes += entry.minutes || 0;
        acc[key].entry_count += 1;
        return acc;
      }, {});
      
      return Object.values(grouped) as MonthlyReportData[];
    }
  });

  const handleDownloadCSV = async () => {
    if (!selectedMonth) {
      toast({ title: "年月を選択してください", variant: "destructive" });
      return;
    }

    setIsDownloading(true);
    
    try {
      const response = await fetch(`/api/exports/monthly.csv?yyyymm=${selectedMonth}`);
      
      if (!response.ok) {
        throw new Error('CSV export failed');
      }

      // Get the blob and create a download URL
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `monthly_time_report_${selectedMonth}.csv`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast({ title: "CSVファイルをダウンロードしました" });
    } catch (error) {
      console.error('CSV download error:', error);
      toast({ 
        title: "ダウンロードに失敗しました", 
        description: "しばらくしてから再度お試しください", 
        variant: "destructive" 
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins}分`;
  };

  const calculateLaborCost = (minutes: number) => {
    const hourlyRate = 3000; // Default hourly rate (should match backend)
    const hours = minutes / 60;
    return Math.round(hours * hourlyRate);
  };

  const totalMinutes = reportData?.reduce((sum, item) => sum + item.total_minutes, 0) || 0;
  const totalEntries = reportData?.reduce((sum, item) => sum + item.entry_count, 0) || 0;
  const totalCost = calculateLaborCost(totalMinutes);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">工数レポート</h1>
          <p className="text-muted-foreground mt-1">月次工数集計とCSV出力</p>
        </div>
      </div>

      {/* Export Controls */}
      <Card>
        <CardHeader>
          <CardTitle>CSV出力</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-40"
                data-testid="input-month-select"
              />
            </div>
            <Button
              onClick={handleDownloadCSV}
              disabled={!selectedMonth || isDownloading}
              data-testid="button-download-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? "ダウンロード中..." : "CSVダウンロード"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            選択した月の承認済み工数を受注別に集計したCSVファイルをダウンロードします。
          </p>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">対象受注数</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-orders-count">
              {reportData?.length || 0}件
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総工数記録</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-total-entries">
              {totalEntries}件
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総工数時間</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-total-hours">
              {Math.round(totalMinutes / 60)}時間
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">工数原価</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600" data-testid="text-total-cost">
              ¥{totalCost.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Preview */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedMonth} 月次工数集計プレビュー
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>データを読み込み中...</p>
            </div>
          ) : reportData && reportData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>受注ID</TableHead>
                  <TableHead>受注番号</TableHead>
                  <TableHead>顧客名</TableHead>
                  <TableHead className="text-right">工数記録数</TableHead>
                  <TableHead className="text-right">総工数時間</TableHead>
                  <TableHead className="text-right">工数原価</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((item) => (
                  <TableRow key={item.sales_order_id} data-testid={`row-report-${item.sales_order_id}`}>
                    <TableCell className="font-medium">
                      {item.sales_order_id}
                    </TableCell>
                    <TableCell>{item.so_no}</TableCell>
                    <TableCell>{item.customer_name}</TableCell>
                    <TableCell className="text-right">
                      {item.entry_count}件
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMinutes(item.total_minutes)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      ¥{calculateLaborCost(item.total_minutes).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4" />
              <p>選択した月のデータがありません</p>
              <p className="text-sm">承認済みの工数記録が存在しません</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CSV Format Information */}
      <Card>
        <CardHeader>
          <CardTitle>CSVファイル形式について</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            出力されるCSVファイルには以下の列が含まれます：
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li><strong>sales_order_id</strong>: 受注ID</li>
            <li><strong>so_no</strong>: 受注番号</li>
            <li><strong>customer_name</strong>: 顧客名</li>
            <li><strong>total_minutes</strong>: 総工数（分）</li>
            <li><strong>labor_cost</strong>: 工数原価（円）</li>
            <li><strong>yyyymm</strong>: 対象年月</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            工数原価は時間単価3,000円/時間で計算されます。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}