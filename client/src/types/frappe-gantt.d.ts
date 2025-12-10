declare module 'frappe-gantt' {
  export interface Task {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    dependencies?: string;
    custom_class?: string;
  }

  export interface GanttOptions {
    header_height?: number;
    column_width?: number;
    step?: number;
    view_modes?: string[];
    bar_height?: number;
    bar_corner_radius?: number;
    arrow_curve?: number;
    padding?: number;
    view_mode?: 'Day' | 'Week' | 'Month' | 'Year' | 'Quarter Day' | 'Half Day';
    date_format?: string;
    popup_trigger?: string;
    custom_popup_html?: (task: Task) => string;
    language?: string;
    today_button?: boolean;
    view_mode_select?: boolean;
    on_click?: (task: Task) => void;
    on_date_change?: (task: Task, start: Date, end: Date) => void;
    on_progress_change?: (task: Task, progress: number) => void;
    on_view_change?: (mode: string) => void;
  }

  export default class Gantt {
    constructor(wrapper: string | HTMLElement, tasks: Task[], options?: GanttOptions);
    change_view_mode(mode: string): void;
    refresh(tasks: Task[]): void;
  }
}

declare module 'frappe-gantt/dist/frappe-gantt.css';
