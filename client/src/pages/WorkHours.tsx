import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, User, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import type { WorkHours, Worker, Project } from "@shared/schema";

export default function WorkHours() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const { data: workHours = [], isLoading } = useQuery<WorkHours[]>({
    queryKey: ["/api/work-hours"],
  });

  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const handleNewWorkHour = () => {
    console.log("Create new work hour entry");
    // TODO: Open work hour creation dialog
  };

  const getWorkerName = (workerId: string) => {
    const worker = workers.find((w) => w.id === workerId);
    return worker?.name || "Unknown";
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || "Unknown";
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(Number(amount));
  };

  const calculateTotalHours = () => {
    return workHours.reduce((sum, wh) => sum + Number(wh.hoursWorked), 0);
  };

  const calculateTotalCost = () => {
    return workHours.reduce((sum, wh) => {
      const worker = workers.find((w) => w.id === wh.workerId);
      if (worker) {
        return sum + (Number(wh.hoursWorked) * Number(worker.hourlyRate));
      }
      return sum;
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">工数管理</h1>
          <p className="text-muted-foreground mt-1">作業時間の記録と管理</p>
        </div>
        <Button onClick={handleNewWorkHour} data-testid="button-new-work-hour">
          <Plus className="h-4 w-4 mr-2" />
          工数登録
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>今日の工数概要</CardTitle>
          <CardDescription>本日の作業時間と人件費</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {calculateTotalHours().toFixed(1)}時間
              </div>
              <div className="text-sm text-muted-foreground">総作業時間</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-chart-2">
                {formatCurrency(calculateTotalCost().toString())}
              </div>
              <div className="text-sm text-muted-foreground">総人件費</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-chart-3">
                {workHours.length}
              </div>
              <div className="text-sm text-muted-foreground">作業記録数</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">作業記録</h2>
        
        {workHours.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">工数記録がありません</h3>
              <p className="text-muted-foreground text-center mb-4">
                最初の作業時間を記録して工数管理を開始しましょう
              </p>
              <Button onClick={handleNewWorkHour}>
                <Plus className="h-4 w-4 mr-2" />
                工数を登録
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {workHours.map((workHour) => (
              <Card key={workHour.id} className="hover-elevate">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{getWorkerName(workHour.workerId)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {getProjectName(workHour.projectId)}
                          </span>
                        </div>
                        {workHour.taskType && (
                          <Badge variant="outline">{workHour.taskType}</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {format(new Date(workHour.workDate), "yyyy/MM/dd", { locale: ja })}
                          </span>
                        </div>
                        <div>
                          作業時間: {Number(workHour.hoursWorked).toFixed(1)}時間
                        </div>
                        {workHour.startTime && workHour.endTime && (
                          <div>
                            {format(new Date(workHour.startTime), "HH:mm", { locale: ja })} - 
                            {format(new Date(workHour.endTime), "HH:mm", { locale: ja })}
                          </div>
                        )}
                      </div>
                      
                      {workHour.description && (
                        <p className="text-sm text-muted-foreground">
                          {workHour.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-semibold text-primary">
                        {(() => {
                          const worker = workers.find((w) => w.id === workHour.workerId);
                          if (worker) {
                            const cost = Number(workHour.hoursWorked) * Number(worker.hourlyRate);
                            return formatCurrency(cost.toString());
                          }
                          return "¥0";
                        })()}
                      </div>
                      <div className="text-sm text-muted-foreground">人件費</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}