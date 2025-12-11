import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GanttFiltersProps {
  startDate: string;
  endDate: string;
  projectFilter: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onProjectFilterChange: (filter: string) => void;
  onToday: () => void;
  onReset: () => void;
  onShiftPeriod: (direction: number) => void;
  onPeriodPreset: (months: number) => void;
}

export const GanttFilters = ({
  startDate,
  endDate,
  projectFilter,
  onStartDateChange,
  onEndDateChange,
  onProjectFilterChange,
  onToday,
  onReset,
  onShiftPeriod,
  onPeriodPreset,
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
          onClick={onToday}
          data-testid="button-gantt-today"
        >
          今日
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

        <div className="gantt-period-presets">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPeriodPreset(1)}
            data-testid="button-gantt-1month"
          >
            1ヶ月
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPeriodPreset(3)}
            data-testid="button-gantt-3months"
          >
            3ヶ月
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPeriodPreset(6)}
            data-testid="button-gantt-6months"
          >
            半年
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPeriodPreset(12)}
            data-testid="button-gantt-1year"
          >
            1年
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          data-testid="button-gantt-reset"
        >
          リセット
        </Button>
      </div>
      <div className="gantt-filters-right">
        <div className="gantt-filter-group">
          <label htmlFor="start-date" className="gantt-filter-label">
            開始日
          </label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="gantt-filter-input"
            data-testid="input-gantt-start-date"
          />
        </div>

        <div className="gantt-filter-group">
          <label htmlFor="end-date" className="gantt-filter-label">
            終了日
          </label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="gantt-filter-input"
            data-testid="input-gantt-end-date"
          />
        </div>

        <Input
          type="text"
          placeholder="案件名で絞り込み"
          value={projectFilter}
          onChange={(e) => onProjectFilterChange(e.target.value)}
          className="gantt-filter-text"
          data-testid="input-gantt-project-filter"
        />
      </div>
    </div>
  );
};

export default GanttFilters;
