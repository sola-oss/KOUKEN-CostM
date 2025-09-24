// Production Management MVP - Calendar View
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarIcon, Package, ShoppingCart, Factory, ChevronLeft, ChevronRight } from "lucide-react";
import { getCalendarData } from "@/shared/production-api";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: calendarData, isLoading, error } = useQuery({
    queryKey: ['calendar', year, month],
    queryFn: () => getCalendarData({ year, month }),
  });

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long"
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {[...Array(35)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">エラーが発生しました</CardTitle>
          </CardHeader>
          <CardContent>
            <p>カレンダーデータの読み込みに失敗しました</p>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="mt-4"
            >
              再試行
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  // Generate calendar grid
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-calendar">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            進捗カレンダー
          </h1>
          <p className="text-muted-foreground">
            受注と調達の進捗を時系列で確認
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigateMonth('prev')}
            data-testid="button-prev-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigateMonth('next')}
            data-testid="button-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {formatMonthYear(currentDate)}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`
                  min-h-[80px] p-2 border rounded-md
                  ${day ? 'bg-background hover-elevate' : 'bg-muted/20'}
                  ${day && new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() 
                    ? 'border-primary bg-primary/5' : ''}
                `}
                data-testid={day ? `calendar-day-${day}` : `calendar-empty-${index}`}
              >
                {day && (
                  <>
                    <div className="font-medium text-sm mb-1">{day}</div>
                    {/* Sample events - in real implementation this would come from calendarData */}
                    <div className="space-y-1">
                      {day === 15 && (
                        <Badge variant="outline" className="bg-blue-50 text-xs">
                          <Package className="h-3 w-3 mr-1" />
                          受注納期
                        </Badge>
                      )}
                      {day === 20 && (
                        <Badge variant="outline" className="bg-green-50 text-xs">
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          材料入荷
                        </Badge>
                      )}
                      {day === 25 && (
                        <Badge variant="outline" className="bg-yellow-50 text-xs">
                          <Factory className="h-3 w-3 mr-1" />
                          製造完了
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">凡例</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50">
                <Package className="h-3 w-3 mr-1" />
                受注
              </Badge>
              <span className="text-sm text-muted-foreground">受注の納期と進捗</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50">
                <ShoppingCart className="h-3 w-3 mr-1" />
                購入
              </Badge>
              <span className="text-sm text-muted-foreground">購入材料の入荷予定</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-yellow-50">
                <Factory className="h-3 w-3 mr-1" />
                製造
              </Badge>
              <span className="text-sm text-muted-foreground">製造作業の予定</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">今月の受注</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12件</div>
            <p className="text-xs text-muted-foreground">納期予定: 8件</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">今月の調達</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">25件</div>
            <p className="text-xs text-muted-foreground">入荷予定: 15件</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">製造予定</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18作業</div>
            <p className="text-xs text-muted-foreground">完了予定: 12作業</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}