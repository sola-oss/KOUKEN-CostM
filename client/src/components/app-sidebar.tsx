// Production Management System Sidebar
import { 
  Home, Package, Calendar, ClipboardCheck, FileText, 
  Truck, Receipt, Users, Settings, BarChart3, 
  ChevronRight, Building2, Clock, Timer, CheckSquare
} from "lucide-react";
import { Link, useLocation } from "wouter";
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

// Production Management MVP - Simplified 6-Screen Navigation
const menuItems = [
  {
    title: "ダッシュボード",
    url: "/",
    icon: Home,
    badge: null
  },
  {
    title: "受注管理",
    url: "/orders",
    icon: Package,
    badge: null
  },
  {
    title: "工数管理", 
    url: "/work-hours",
    icon: Clock,
    badge: null
  },
  {
    title: "調達管理",
    url: "/procurement",
    icon: ClipboardCheck,
    badge: null
  },
  {
    title: "進捗カレンダー",
    url: "/calendar",
    icon: Calendar,
    badge: null
  },
  {
    title: "レポート",
    url: "/reports",
    icon: BarChart3,
    badge: null
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
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.items ? (
                    <>
                      <SidebarMenuButton className="w-full">
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="ml-auto">
                            {item.badge}
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4" />
                      </SidebarMenuButton>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.url}>
                            <SidebarMenuSubButton 
                              asChild
                              className={location === subItem.url ? 'bg-sidebar-accent' : ''}
                            >
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </>
                  ) : (
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
                  )}
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