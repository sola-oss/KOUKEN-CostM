import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const FACTORY_OPTIONS = [
  { value: 'laser', label: 'レーザー工場' },
  { value: 'factory1', label: '1工場' },
  { value: 'factory2', label: '2工場' },
  { value: 'machine', label: '機械加工場' },
];

export const FACTORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  laser:    { bg: 'bg-violet-500',  text: 'text-white', border: 'border-violet-600' },
  factory1: { bg: 'bg-sky-500',     text: 'text-white', border: 'border-sky-600' },
  factory2: { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600' },
  machine:  { bg: 'bg-amber-500',   text: 'text-white', border: 'border-amber-600' },
};

interface GanttFiltersProps {
  onReset: () => void;
  onShiftPeriod: (direction: number) => void;
  currentMonth?: string;
  projectFilter?: string;
  onProjectFilterChange?: (value: string) => void;
  factoryFilter?: string;
  onFactoryFilterChange?: (value: string) => void;
}

export const GanttFilters = ({
  onReset,
  onShiftPeriod,
  currentMonth,
  projectFilter = "",
  onProjectFilterChange,
  factoryFilter = "all",
  onFactoryFilterChange,
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

        {onFactoryFilterChange && (
          <Select value={factoryFilter} onValueChange={onFactoryFilterChange}>
            <SelectTrigger className="w-36 h-8 text-sm" data-testid="select-gantt-factory">
              <SelectValue placeholder="工事で絞り込み" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての工事</SelectItem>
              {FACTORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${FACTORY_COLORS[opt.value].bg}`} />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Factory legend */}
        <div className="flex items-center gap-3 ml-2" data-testid="gantt-factory-legend">
          {FACTORY_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center gap-1">
              <span className={`inline-block w-3 h-3 rounded-sm ${FACTORY_COLORS[opt.value].bg}`} />
              <span className="text-xs text-muted-foreground">{opt.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GanttFilters;
