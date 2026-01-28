import { useState } from "react";
import { useLocation } from "wouter";
import {
  BarChart3,
  Clock,
  DollarSign,
  FolderOpen,
  Home,
  Package,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "ダッシュボード",
    url: "/",
    icon: Home,
  },
  {
    title: "受注管理",
    url: "/projects",
    icon: FolderOpen,
  },
  {
    title: "作業者管理",
    url: "/workers",
    icon: Users,
  },
  {
    title: "工数管理",
    url: "/work-hours",
    icon: Clock,
  },
  {
    title: "材料管理",
    url: "/materials",
    icon: Package,
  },
  {
    title: "原価分析",
    url: "/cost-analysis",
    icon: TrendingUp,
  },
  {
    title: "レポート",
    url: "/analytics",
    icon: BarChart3,
  },
];

const settingsItems = [
  {
    title: "設定",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location, navigate] = useLocation();

  const handleNavigation = (url: string) => {
    console.log("Navigating to:", url);
    navigate(url);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-2">
          <DollarSign className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">原価管理</h2>
            <p className="text-sm text-muted-foreground">Cost Management</p>
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
                  <SidebarMenuButton 
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase()}`}
                  >
                    <button 
                      onClick={() => handleNavigation(item.url)}
                      className="w-full flex items-center gap-2"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>システム</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase()}`}
                  >
                    <button 
                      onClick={() => handleNavigation(item.url)}
                      className="w-full flex items-center gap-2"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}