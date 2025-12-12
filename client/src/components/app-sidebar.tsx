// Production Management System Sidebar
import { 
  Package, Calendar, ClipboardCheck, BarChart3, 
  ChevronRight, ChevronDown, Timer,
  ListChecks, ShoppingCart, GanttChart, Layers, Database, FileSpreadsheet
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
  SidebarHeader
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

export function AppSidebar() {
  const [location] = useLocation();
  const [isWorkInstructionsOpen, setIsWorkInstructionsOpen] = useState(true);
  const [isMaterialManagementOpen, setIsMaterialManagementOpen] = useState(true);

  const isWorkInstructionsActive = workInstructionsSubItems.some(item => location === item.url);
  const isMaterialManagementActive = materialManagementSubItems.some(item => location === item.url);

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-4">
          <Package className="h-6 w-6 text-primary" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">工数管理</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>メインメニュー</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
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

              {/* 6. 材料管理 (Collapsible) */}
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
