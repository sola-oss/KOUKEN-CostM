import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GanttFiltersProps {
  onReset: () => void;
  onShiftPeriod: (direction: number) => void;
  currentMonth?: string;
  projectFilter?: string;
  onProjectFilterChange?: (value: string) => void;
}

export const GanttFilters = ({
  onReset,
  onShiftPeriod,
  currentMonth,
  projectFilter = "",
  onProjectFilterChange,
}: GanttFiltersProps) => {
  return (
    <div className="gantt-filters mt-[3px] mb-[3px]" data-testid="gantt-filters">
      <div className="gantt-filters-left flex items-center gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onShiftPeriod(-1)}
          data-testid="button-gantt-prev"
          title="前月"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {currentMonth && (
          <span className="text-sm font-medium min-w-[100px] text-center" data-testid="text-current-month">
            {currentMonth}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onShiftPeriod(1)}
          data-testid="button-gantt-next"
          title="翌月"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          data-testid="button-gantt-reset"
        >
          今月
        </Button>

        {onProjectFilterChange && (
          <Input
            className="w-48 h-8 text-sm"
            placeholder="得意先・受注件名で絞り込み"
            value={projectFilter}
            onChange={(e) => onProjectFilterChange(e.target.value)}
            data-testid="input-gantt-filter"
          />
        )}
      </div>
    </div>
  );
};

export default GanttFilters;
