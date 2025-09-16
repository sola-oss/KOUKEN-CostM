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

// Menu structure for production management system
const menuItems = [
  {
    title: "ダッシュボード",
    url: "/",
    icon: Home,
    badge: null
  },
  {
    title: "受注管理",
    icon: FileText,
    badge: "20",
    items: [
      { title: "受注一覧", url: "/sales-orders" },
      { title: "新規受注", url: "/sales-orders/new" },
      { title: "受注確認", url: "/sales-orders/confirm" }
    ]
  },
  {
    title: "工数管理",
    icon: Clock,
    badge: null,
    items: [
      { title: "工数入力", url: "/time-entries" },
      { title: "工数承認", url: "/time-entries/approve" },
      { title: "工数レポート", url: "/reports" }
    ]
  },
  {
    title: "製番管理",
    icon: Package,
    badge: "60",
    items: [
      { title: "製番一覧", url: "/production-orders" },
      { title: "製番計画", url: "/production-orders/planning" },
      { title: "進捗カレンダー", url: "/production-orders/calendar" }
    ]
  },
  {
    title: "発注・入荷",
    icon: ClipboardCheck,
    items: [
      { title: "発注一覧", url: "/purchase-orders" },
      { title: "入荷処理", url: "/receipts" },
      { title: "在庫確認", url: "/inventory" }
    ]
  },
  {
    title: "出荷・売上",
    icon: Truck,
    items: [
      { title: "出荷一覧", url: "/shipments" },
      { title: "出荷処理", url: "/shipments/new" },
      { title: "請求書", url: "/invoices" }
    ]
  },
  {
    title: "マスタ管理",
    icon: Building2,
    items: [
      { title: "顧客管理", url: "/customers" },
      { title: "業者管理", url: "/vendors" },
      { title: "品目管理", url: "/items" },
      { title: "従業員管理", url: "/employees" },
      { title: "カレンダー設定", url: "/calendars" }
    ]
  },
  {
    title: "レポート",
    icon: BarChart3,
    items: [
      { title: "生産進捗レポート", url: "/reports/production" },
      { title: "売上レポート", url: "/reports/sales" },
      { title: "月次CSV出力", url: "/reports/export" }
    ]
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
            <span className="text-sm font-semibold">生産管理システム</span>
            <span className="text-xs text-muted-foreground">Production Management</span>
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