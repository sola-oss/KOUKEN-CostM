export interface GanttTaskItem {
  id: string;
  taskName: string;
  startDate: string;
  endDate: string;
  progress: number;
  type: 'task' | 'procurement';
}

export interface GanttProject {
  orderId: string;
  projectName: string;
  tasks: GanttTaskItem[];
  isExpanded: boolean;
}

export interface GanttRow {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  progress: number;
  isProjectHeader: boolean;
  orderId: string;
  type: 'task' | 'procurement' | 'project';
}

export interface GanttFiltersState {
  startDate: string;
  endDate: string;
  projectFilter: string;
}

export interface DateColumn {
  date: Date;
  dateStr: string;
  dayOfWeek: number;
  dayNumber: number;
  monthNumber: number;
  isWeekend: boolean;
  isToday: boolean;
}
