// Production Management System Sidebar
import { 
  Package, Calendar, ClipboardCheck, BarChart3, 
  ChevronRight, ChevronDown, Timer,
  ListChecks, ShoppingCart, GanttChart, Layers, Database, FileSpreadsheet,
  Calculator, TrendingUp, DollarSign
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type AppMode = "production" | "cost";

// Color themes for each mode (HSL format: H S% L%)
// Separate configs for light and dark modes
const modeColors = {
  production: {
    light: {
      primary: "215 70% 45%",
      primaryForeground: "215 10% 95%",
      ring: "215 70% 45%",
      sidebarPrimary: "215 70% 45%",
      sidebarPrimaryForeground: "215 10% 95%",
      sidebarRing: "215 70% 45%",
      chart1: "215 70% 45%",
    },
    dark: {
      primary: "215 60% 55%",
      primaryForeground: "215 10% 95%",
      ring: "215 60% 55%",
      sidebarPrimary: "215 60% 55%",
      sidebarPrimaryForeground: "215 10% 95%",
      sidebarRing: "215 60% 55%",
      chart1: "215 60% 65%",
    }
  },
  cost: {
    light: {
      primary: "160 60% 40%",
      primaryForeground: "160 10% 95%",
      ring: "160 60% 40%",
      sidebarPrimary: "160 60% 40%",
      sidebarPrimaryForeground: "160 10% 95%",
      sidebarRing: "160 60% 40%",
      chart1: "160 60% 40%",
    },
    dark: {
      primary: "160 55% 50%",
      primaryForeground: "160 10% 95%",
      ring: "160 55% 50%",
      sidebarPrimary: "160 55% 50%",
      sidebarPrimaryForeground: "160 10% 95%",
      sidebarRing: "160 55% 50%",
      chart1: "160 55% 60%",
    }
  }
};

// Work Instructions Sub-menu
const workInstructionsSubItems = [
  {
    title: "作業計画",
    url: "/task-planning",
    icon: ListChecks
  },
  {
    title: "調達管理",
    url: "/procurement",
    icon: ShoppingCart
  }
];

// Material Management Sub-menu (材料管理)
const materialManagementSubItems = [
  {
    title: "材料使用入力",
    url: "/material-usages",
    icon: FileSpreadsheet
  },
  {
    title: "案件・工区別 集計",
    url: "/material-summary",
    icon: BarChart3
  },
  {
    title: "材料マスタ",
    url: "/materials-master",
    icon: Database
  }
];

// Cost Management menu items (原価管理)
const costManagementItems = [
  {
    title: "予実比較",
    url: "/cost-comparison",
    icon: TrendingUp
  },
  {
    title: "単価マスタ",
    url: "/unit-prices",
    icon: DollarSign
  }
];

export function AppSidebar() {
  const [location] = useLocation();
  const [appMode, setAppMode] = useState<AppMode>("production");
  const [isWorkInstructionsOpen, setIsWorkInstructionsOpen] = useState(true);
  const [isMaterialManagementOpen, setIsMaterialManagementOpen] = useState(true);

  const isWorkInstructionsActive = workInstructionsSubItems.some(item => location === item.url);
  const isMaterialManagementActive = materialManagementSubItems.some(item => location === item.url);

  useEffect(() => {
    const applyColors = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const theme = isDark ? "dark" : "light";
      const colors = modeColors[appMode][theme];
      const root = document.documentElement;
      root.style.setProperty("--primary", colors.primary);
      root.style.setProperty("--primary-foreground", colors.primaryForeground);
      root.style.setProperty("--ring", colors.ring);
      root.style.setProperty("--sidebar-primary", colors.sidebarPrimary);
      root.style.setProperty("--sidebar-primary-foreground", colors.sidebarPrimaryForeground);
      root.style.setProperty("--sidebar-ring", colors.sidebarRing);
      root.style.setProperty("--chart-1", colors.chart1);
    };

    applyColors();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          applyColors();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, [appMode]);

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex flex-col gap-3 px-2 py-4">
          <div className="flex items-center gap-2">
            {appMode === "production" ? (
              <Package className="h-6 w-6 text-primary" />
            ) : (
              <Calculator className="h-6 w-6 text-primary" />
            )}
            <span className="text-sm font-semibold">
              {appMode === "production" ? "工数管理" : "原価管理"}
            </span>
          </div>
          <div className="flex rounded-md border border-sidebar-border overflow-hidden" data-testid="mode-toggle">
            <button
              onClick={() => setAppMode("production")}
              className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                appMode === "production"
                  ? "bg-primary text-primary-foreground"
                  : "bg-sidebar hover:bg-sidebar-accent"
              }`}
              data-testid="button-mode-production"
            >工数管理</button>
            <button
              onClick={() => setAppMode("cost")}
              className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                appMode === "cost"
                  ? "bg-primary text-primary-foreground"
                  : "bg-sidebar hover:bg-sidebar-accent"
              }`}
              data-testid="button-mode-cost"
            >
              原価管理
            </button>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {appMode === "production" ? "工数管理メニュー" : "原価管理メニュー"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {appMode === "production" ? (
                <>
                  {/* 1. 案件管理 */}
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild
                      className={location === '/projects' ? 'bg-sidebar-accent' : ''}
                    >
                      <Link href="/projects">
                        <Package className="h-4 w-4" />
                        <span className="flex-1">受注管理</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* 2. 作業指示 (Collapsible) */}
                  <Collapsible
                    open={isWorkInstructionsOpen}
                    onOpenChange={setIsWorkInstructionsOpen}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton 
                          className={isWorkInstructionsActive ? 'bg-sidebar-accent' : ''}
                        >
                          <ClipboardCheck className="h-4 w-4" />
                          <span className="flex-1">作業指示</span>
                          {isWorkInstructionsOpen ? (
                            <ChevronDown className="h-4 w-4 transition-transform" />
                          ) : (
                            <ChevronRight className="h-4 w-4 transition-transform" />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {workInstructionsSubItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton 
                                asChild
                                className={location === subItem.url ? 'bg-sidebar-accent' : ''}
                              >
                                <Link href={subItem.url}>
                                  <subItem.icon className="h-4 w-4" />
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  {/* 3. ガントチャート */}
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild
                      className={location === '/gantt' ? 'bg-sidebar-accent' : ''}
                    >
                      <Link href="/gantt">
                        <GanttChart className="h-4 w-4" />
                        <span className="flex-1">ガントチャート</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* 4. 作業実績入力 */}
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild
                      className={location === '/work-results' ? 'bg-sidebar-accent' : ''}
                    >
                      <Link href="/work-results">
                        <Timer className="h-4 w-4" />
                        <span className="flex-1">作業実績入力</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* 5. 進捗カレンダー */}
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild
                      className={location === '/calendar' ? 'bg-sidebar-accent' : ''}
                    >
                      <Link href="/calendar">
                        <Calendar className="h-4 w-4" />
                        <span className="flex-1">進捗カレンダー</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              ) : (
                <>
                  {/* 材料管理 (Collapsible) - 一番上 */}
                  <Collapsible
                    open={isMaterialManagementOpen}
                    onOpenChange={setIsMaterialManagementOpen}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton 
                          className={isMaterialManagementActive ? 'bg-sidebar-accent' : ''}
                        >
                          <Layers className="h-4 w-4" />
                          <span className="flex-1">材料管理</span>
                          {isMaterialManagementOpen ? (
                            <ChevronDown className="h-4 w-4 transition-transform" />
                          ) : (
                            <ChevronRight className="h-4 w-4 transition-transform" />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {materialManagementSubItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton 
                                asChild
                                className={location === subItem.url ? 'bg-sidebar-accent' : ''}
                              >
                                <Link href={subItem.url}>
                                  <subItem.icon className="h-4 w-4" />
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  {/* Cost Management Menu Items */}
                  {costManagementItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild
                        className={location === item.url ? 'bg-sidebar-accent' : ''}
                      >
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span className="flex-1">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
