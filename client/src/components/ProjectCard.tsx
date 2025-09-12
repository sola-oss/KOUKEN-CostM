import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    budget: number;
    spent: number;
    status: "active" | "completed" | "on_hold";
  };
  onClick?: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      notation: "compact",
    }).format(amount);
  };

  const progressPercentage = (project.spent / project.budget) * 100;
  
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "on_hold":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "進行中";
      case "completed":
        return "完了";
      case "on_hold":
        return "保留";
      default:
        return status;
    }
  };

  return (
    <Card 
      className={`hover-elevate cursor-pointer transition-all ${onClick ? "hover:cursor-pointer" : ""}`}
      onClick={() => {
        console.log("Project clicked:", project.name);
        onClick?.();
      }}
      data-testid={`card-project-${project.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm" data-testid={`text-project-name-${project.id}`}>
            {project.name}
          </h4>
          <Badge variant={getStatusVariant(project.status)}>
            {getStatusText(project.status)}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>予算: {formatCurrency(project.budget)}</span>
            <span>使用: {formatCurrency(project.spent)}</span>
          </div>
          
          <Progress 
            value={progressPercentage} 
            className="h-2"
            data-testid={`progress-project-${project.id}`}
          />
          
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              使用率: {progressPercentage.toFixed(1)}%
            </span>
            <span className={progressPercentage > 90 ? "text-destructive" : "text-muted-foreground"}>
              残り: {formatCurrency(project.budget - project.spent)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}