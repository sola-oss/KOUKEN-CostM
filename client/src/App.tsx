import { type CSSProperties } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import Login from "@/pages/login";
import Projects from "@/pages/production/projects";
import ProjectDetail from "@/pages/production/project-detail";
import TaskPlanning from "@/pages/production/task-planning";
import TaskManagement from "@/pages/production/task-management";
import Procurement from "@/pages/production/procurement";
import WorkResults from "@/pages/production/work-results";
import GanttSimple from "@/pages/production/gantt-simple";
import MaterialUsages from "@/pages/production/material-usages";
import MaterialSummary from "@/pages/production/material-summary";
import MaterialsMaster from "@/pages/production/materials-master";
import CostSummary from "@/pages/cost/cost-summary";
import WorkersMaster from "@/pages/cost/workers-master";
import VendorsMaster from "@/pages/cost/vendors-master";
import CustomersMaster from "@/pages/production/customers-master";
import UserManagement from "@/pages/user-management";
import NotFound from "@/pages/not-found";

function AppLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider defaultOpen={true} style={style as CSSProperties}>
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
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const [location] = useLocation();
  const { loading } = useAuth();

  if (location === "/login") {
    return (
      <Switch>
        <Route path="/login" component={Login} />
      </Switch>
    );
  }

  // While auth is resolving, show a blank screen instead of the sidebar
  // to avoid briefly flashing the wrong role's menu items.
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <AppLayout>
      <ProtectedRoute>
        <Switch>
          <Route path="/" component={Projects} />
          <Route path="/projects" component={Projects} />
          <Route path="/project/:id" component={ProjectDetail} />
          <Route path="/task-planning" component={TaskPlanning} />
          <Route path="/task-management" component={TaskManagement} />
          <Route path="/procurement" component={Procurement} />
          <Route path="/work-results" component={WorkResults} />
          <Route path="/gantt" component={GanttSimple} />
          <Route path="/material-usages" component={MaterialUsages} />
          <Route path="/material-summary" component={MaterialSummary} />
          <Route path="/materials-master" component={MaterialsMaster} />
          <Route path="/cost-summary" component={CostSummary} />
          <Route path="/workers-master" component={WorkersMaster} />
          <Route path="/vendors-master" component={VendorsMaster} />
          <Route path="/customers-master" component={CustomersMaster} />
          <Route path="/user-management" component={UserManagement} />
          <Route component={NotFound} />
        </Switch>
      </ProtectedRoute>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="light" storageKey="production-management-theme">
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
