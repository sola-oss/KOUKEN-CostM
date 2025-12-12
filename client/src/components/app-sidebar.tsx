// Production Management System Sidebar
import { 
  Home, Package, Calendar, ClipboardCheck, FileText, 
  Truck, Receipt, Users, Settings, BarChart3, 
  ChevronRight, ChevronDown, Building2, Clock, Timer, CheckSquare,
  ListChecks, ShoppingCart, GanttChart
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
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
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Production Management MVP - Navigation Menu
const menuItems = [
  {
    title: "案件管理",
    url: "/projects",
    icon: Package,
    badge: null
  },
  {
    title: "作業実績入力",
    url: "/work-results",
    icon: Timer,
    badge: null
  },
  {
    title: "進捗カレンダー",
    url: "/calendar",
    icon: Calendar,
    badge: null
  },
  {
    title: "集計・承認",
    url: "/summary-approval",
    icon: CheckSquare,
    badge: null
  },
  {
    title: "原価・粗利分析",
    url: "/cost-analysis",
    icon: BarChart3,
    badge: null
  },
  {
    title: "ガントチャート",
    url: "/gantt",
    icon: GanttChart,
    badge: null
  }
];

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

const bottomMenuItems = [
  {
    title: "設定",
    url: "/settings",
    icon: Settings
  }
];

export function AppSidebar() {
  const [location] = useLocation();
  const [isWorkInstructionsOpen, setIsWorkInstructionsOpen] = useState(true);

  const isWorkInstructionsActive = workInstructionsSubItems.some(item => location === item.url);

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-4">
          <Package className="h-6 w-6 text-primary" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">生産管理ミニMVP</span>
            <span className="text-xs text-muted-foreground">Production Management MVP</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>メインメニュー</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* 1. 案件管理 */}
              {(() => {
                const item = menuItems[0];
                const Icon = item.icon;
                return (
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild
                      className={location === item.url ? 'bg-sidebar-accent' : ''}
                    >
                      <Link href={item.url}>
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="ml-auto">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })()}

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

              {/* 3-6. 残りのメニュー項目 */}
              {menuItems.slice(1).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={location === item.url ? 'bg-sidebar-accent' : ''}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t">
        <SidebarMenu>
          {bottomMenuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                asChild
                className={location === item.url ? 'bg-sidebar-accent' : ''}
              >
                <Link href={item.url}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}