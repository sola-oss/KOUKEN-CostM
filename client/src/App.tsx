import { type CSSProperties } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import Dashboard from "@/pages/dashboard";
import SalesOrders from "@/pages/sales-orders";
import NewSalesOrder from "@/pages/sales-orders-new";
import SalesOrderDetail from "@/pages/sales-orders-detail";
import TimeEntries from "@/pages/time-entries";
import TimeEntriesApprove from "@/pages/time-entries-approve";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/sales-orders" component={SalesOrders} />
      <Route path="/sales-orders/new" component={NewSalesOrder} />
      <Route path="/sales-orders/:id" component={SalesOrderDetail} />
      <Route path="/time-entries" component={TimeEntries} />
      <Route path="/time-entries/approve" component={TimeEntriesApprove} />
      <Route path="/reports" component={Reports} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="light" storageKey="production-management-theme">
          <SidebarProvider style={style as CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1">
                <header className="flex items-center justify-between px-4 py-3 border-b bg-background">
                  <div className="flex items-center gap-3">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <h1 className="text-lg font-semibold">生産管理システム</h1>
                  </div>
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto bg-muted/10">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
