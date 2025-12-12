import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GanttFiltersProps {
  onReset: () => void;
  onShiftPeriod: (direction: number) => void;
}

export const GanttFilters = ({
  onReset,
  onShiftPeriod,
}: GanttFiltersProps) => {
  return (
    <div className="gantt-filters mt-[3px] mb-[3px]" data-testid="gantt-filters">
      <div className="gantt-filters-left">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onShiftPeriod(-1)}
          data-testid="button-gantt-prev"
          title="前へ"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          data-testid="button-gantt-reset"
        >
          リセット
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onShiftPeriod(1)}
          data-testid="button-gantt-next"
          title="次へ"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default GanttFilters;
