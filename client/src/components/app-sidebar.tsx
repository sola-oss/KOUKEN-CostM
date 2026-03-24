// Production Management System Sidebar
import { 
  Package, ClipboardCheck, BarChart3, 
  ChevronRight, ChevronDown,
  CheckSquare, ClipboardList, GanttChart, Database, FileSpreadsheet,
  Calculator, Users, Settings, Building2, Hammer, TrendingUp
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
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

// Section 1: 受注と計画
const orderPlanningItems = [
  { title: "受注管理", url: "/projects", icon: Package },
  { title: "作業管理", url: "/task-management", icon: CheckSquare },
  { title: "ガントチャート", url: "/gantt", icon: GanttChart }
];

// Section 2: 現場実績
const fieldWorkItems = [
  { title: "材料使用入力", url: "/material-usages", icon: FileSpreadsheet },
  { title: "発注管理", url: "/procurement", icon: ClipboardList }
];

// Section 3: 原価・分析
const costAnalysisItems = [
  { title: "原価集計", url: "/cost-summary", icon: Calculator },
  { title: "材料集計", url: "/material-summary", icon: BarChart3 }
];

// Section 4: マスタ
const masterItems = [
  { title: "材料マスタ", url: "/materials-master", icon: Database },
  { title: "作業者マスタ", url: "/workers-master", icon: Users },
  { title: "業者マスタ", url: "/vendors-master", icon: Building2 }
];

export function AppSidebar() {
  const [location] = useLocation();
  const [isOrderPlanningOpen, setIsOrderPlanningOpen] = useState(true);
  const [isFieldWorkOpen, setIsFieldWorkOpen] = useState(true);
  const [isCostAnalysisOpen, setIsCostAnalysisOpen] = useState(true);
  const [isMasterOpen, setIsMasterOpen] = useState(true);

  const isOrderPlanningActive = orderPlanningItems.some(item => location === item.url);
  const isFieldWorkActive = fieldWorkItems.some(item => location === item.url);
  const isCostAnalysisActive = costAnalysisItems.some(item => location === item.url);
  const isMasterActive = masterItems.some(item => location === item.url);

  return (
    <Sidebar>
      <SidebarHeader className="border-b bg-primary text-primary-foreground">
        <div className="flex items-center gap-2 px-2 py-4">
          <Package className="h-6 w-6" />
          <span className="text-sm font-semibold">生産管理システム</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Section 1: 受注と計画 */}
        <SidebarGroup>
          <Collapsible
            open={isOrderPlanningOpen}
            onOpenChange={setIsOrderPlanningOpen}
            className="group/collapsible"
          >
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between cursor-pointer hover:bg-sidebar-accent rounded px-2 py-1">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  <span>受注と計画</span>
                </div>
                {isOrderPlanningOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {orderPlanningItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild
                        className={location === item.url ? 'bg-primary/10 text-primary font-medium' : ''}
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

        {/* Section 2: 現場実績 */}
        <SidebarGroup>
          <Collapsible
            open={isFieldWorkOpen}
            onOpenChange={setIsFieldWorkOpen}
            className="group/collapsible"
          >
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between cursor-pointer hover:bg-sidebar-accent rounded px-2 py-1">
                <div className="flex items-center gap-2">
                  <Hammer className="h-4 w-4" />
                  <span>現場実績</span>
                </div>
                {isFieldWorkOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {fieldWorkItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild
                        className={location === item.url ? 'bg-primary/10 text-primary font-medium' : ''}
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

        {/* Section 3: 原価・分析 */}
        <SidebarGroup>
          <Collapsible
            open={isCostAnalysisOpen}
            onOpenChange={setIsCostAnalysisOpen}
            className="group/collapsible"
          >
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between cursor-pointer hover:bg-sidebar-accent rounded px-2 py-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>原価・分析</span>
                </div>
                {isCostAnalysisOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {costAnalysisItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild
                        className={location === item.url ? 'bg-primary/10 text-primary font-medium' : ''}
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
      </SidebarContent>
      {/* Section 4: マスタ (Footer) */}
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
                  className={isMasterActive ? 'bg-primary/10 text-primary font-medium' : ''}
                >
                  <Settings className="h-4 w-4" />
                  <span className="flex-1">マスター</span>
                  {isMasterOpen ? (
                    <ChevronDown className="h-4 w-4 transition-transform" />
                  ) : (
                    <ChevronRight className="h-4 w-4 transition-transform" />
                  )}
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {masterItems.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton 
                        asChild
                        className={location === subItem.url ? 'bg-primary/10 text-primary font-medium' : ''}
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
      </SidebarFooter>
    </Sidebar>
  );
}
