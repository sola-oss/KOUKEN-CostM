import { lazy, Suspense, type CSSProperties } from "react";
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

// Pages — lazy loaded for code splitting
const Login = lazy(() => import("@/pages/login"));
const Projects = lazy(() => import("@/pages/production/projects"));
const ProjectDetail = lazy(() => import("@/pages/production/project-detail"));
const TaskPlanning = lazy(() => import("@/pages/production/task-planning"));
const TaskManagement = lazy(() => import("@/pages/production/task-management"));
const Procurement = lazy(() => import("@/pages/production/procurement"));
const WorkResults = lazy(() => import("@/pages/production/work-results"));
const GanttSimple = lazy(() => import("@/pages/production/gantt-simple"));
const MaterialUsages = lazy(() => import("@/pages/production/material-usages"));
const MaterialSummary = lazy(() => import("@/pages/production/material-summary"));
const MaterialsMaster = lazy(() => import("@/pages/production/materials-master"));
const CostSummary = lazy(() => import("@/pages/cost/cost-summary"));
const WorkersMaster = lazy(() => import("@/pages/cost/workers-master"));
const VendorsMaster = lazy(() => import("@/pages/cost/vendors-master"));
const CustomersMaster = lazy(() => import("@/pages/production/customers-master"));
const MaterialCosts = lazy(() => import("@/pages/production/material-costs"));
const UserManagement = lazy(() => import("@/pages/user-management"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-muted-foreground">読み込み中...</p>
    </div>
  );
}

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
      <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path="/login" component={Login} />
        </Switch>
      </Suspense>
    );
  }

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
        <Suspense fallback={<PageFallback />}>
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
            <Route path="/material-costs" component={MaterialCosts} />
            <Route path="/user-management" component={UserManagement} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
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
