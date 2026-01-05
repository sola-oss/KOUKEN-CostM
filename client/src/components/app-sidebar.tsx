// Production Management System Sidebar - Lifecycle-oriented Navigation
import { 
  Package, Calendar, ClipboardCheck, 
  ChevronRight, ChevronDown, Timer,
  ListChecks, ShoppingCart, GanttChart, Layers, Database, FileSpreadsheet,
  Calculator, TrendingUp, Users, Settings, Building2, Truck, BarChart3, CheckCircle
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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

// Section definitions for lifecycle-oriented navigation
interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Section {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuItem[];
  color: string;
}

// 4 main sections based on manufacturing lifecycle
const sections: Section[] = [
  {
    id: "order-planning",
    title: "受注・計画",
    icon: Package,
    color: "text-blue-500 dark:text-blue-400",
    items: [
      { title: "受注管理", url: "/projects", icon: Package },
      { title: "作業計画", url: "/task-planning", icon: ListChecks },
      { title: "調達管理", url: "/procurement", icon: ShoppingCart },
      { title: "ガントチャート", url: "/gantt", icon: GanttChart },
      { title: "進捗カレンダー", url: "/calendar", icon: Calendar },
    ]
  },
  {
    id: "work-progress",
    title: "実績・進捗",
    icon: Timer,
    color: "text-emerald-500 dark:text-emerald-400",
    items: [
      { title: "作業実績入力", url: "/work-results", icon: Timer },
      { title: "日次承認", url: "/summary-approval", icon: CheckCircle },
      { title: "工数分析", url: "/cost-analysis", icon: BarChart3 },
    ]
  },
  {
    id: "materials-outsourcing",
    title: "資材・外注",
    icon: Layers,
    color: "text-amber-500 dark:text-amber-400",
    items: [
      { title: "材料使用入力", url: "/material-usages", icon: FileSpreadsheet },
      { title: "外注費入力", url: "/outsourcing-costs", icon: Truck },
    ]
  },
  {
    id: "cost-analysis",
    title: "原価分析",
    icon: Calculator,
    color: "text-violet-500 dark:text-violet-400",
    items: [
      { title: "原価集計", url: "/cost-summary", icon: Calculator },
      { title: "予実比較", url: "/cost-comparison", icon: TrendingUp },
    ]
  }
];

// Master data section (shown in footer)
const masterItems: MenuItem[] = [
  { title: "作業者マスタ", url: "/workers-master", icon: Users },
  { title: "材料マスタ", url: "/materials-master", icon: Database },
  { title: "外注先マスタ", url: "/vendors-master", icon: Building2 },
];

// Find current section and page info for header display
export function getCurrentPageInfo(pathname: string): { section: string; page: string } | null {
  for (const section of sections) {
    const item = section.items.find(i => i.url === pathname);
    if (item) {
      return { section: section.title, page: item.title };
    }
  }
  const masterItem = masterItems.find(i => i.url === pathname);
  if (masterItem) {
    return { section: "マスタ", page: masterItem.title };
  }
  return null;
}

export function AppSidebar() {
  const [location] = useLocation();
  
  // Track which sections are open (all open by default)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sections.forEach(s => { initial[s.id] = true; });
    return initial;
  });
  const [isMasterOpen, setIsMasterOpen] = useState(true);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Check if any item in a section is active
  const isSectionActive = (section: Section) => {
    return section.items.some(item => location === item.url);
  };

  const isMasterActive = masterItems.some(item => location === item.url);

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex flex-col gap-2 px-2 py-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="text-sm font-semibold">生産管理システム</span>
          </div>
          <p className="text-xs text-muted-foreground">工数・原価統合管理</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.id}>
            <Collapsible
              open={openSections[section.id]}
              onOpenChange={() => toggleSection(section.id)}
              className="group/collapsible"
            >
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger 
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                  data-testid={`section-${section.id}`}
                >
                  <section.icon className={`h-4 w-4 ${section.color}`} />
                  <span className="flex-1 text-left">{section.title}</span>
                  {openSections[section.id] ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton 
                          asChild
                          isActive={location === item.url}
                          data-testid={`menu-item-${item.url.replace('/', '')}`}
                        >
                          <Link href={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Master Menu at Bottom */}
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <Collapsible
            open={isMasterOpen}
            onOpenChange={setIsMasterOpen}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton 
                  className={isMasterActive ? 'bg-sidebar-accent' : ''}
                  data-testid="section-master"
                >
                  <Settings className="h-4 w-4" />
                  <span className="flex-1">共通マスタ</span>
                  {isMasterOpen ? (
                    <ChevronDown className="h-4 w-4 transition-transform" />
                  ) : (
                    <ChevronRight className="h-4 w-4 transition-transform" />
                  )}
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {masterItems.map((item) => (
                    <SidebarMenuSubItem key={item.url}>
                      <SidebarMenuSubButton 
                        asChild
                        isActive={location === item.url}
                        data-testid={`menu-item-${item.url.replace('/', '')}`}
                      >
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
