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
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "@/pages/login";
// Production Management MVP - Main Pages
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
import NotFound from "@/pages/not-found";

function MainLayout() {
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
            <Switch>
              <Route path="/">
                <ProtectedRoute path="/"><Projects /></ProtectedRoute>
              </Route>
              <Route path="/projects">
                <ProtectedRoute path="/projects"><Projects /></ProtectedRoute>
              </Route>
              <Route path="/project/:id">
                <ProtectedRoute path="/project/:id"><ProjectDetail /></ProtectedRoute>
              </Route>
              <Route path="/task-planning">
                <ProtectedRoute path="/task-planning"><TaskPlanning /></ProtectedRoute>
              </Route>
              <Route path="/task-management">
                <ProtectedRoute path="/task-management"><TaskManagement /></ProtectedRoute>
              </Route>
              <Route path="/procurement">
                <ProtectedRoute path="/procurement"><Procurement /></ProtectedRoute>
              </Route>
              <Route path="/work-results">
                <ProtectedRoute path="/work-results"><WorkResults /></ProtectedRoute>
              </Route>
              <Route path="/gantt">
                <ProtectedRoute path="/gantt"><GanttSimple /></ProtectedRoute>
              </Route>
              <Route path="/material-usages">
                <ProtectedRoute path="/material-usages"><MaterialUsages /></ProtectedRoute>
              </Route>
              <Route path="/material-summary">
                <ProtectedRoute path="/material-summary"><MaterialSummary /></ProtectedRoute>
              </Route>
              <Route path="/materials-master">
                <ProtectedRoute path="/materials-master"><MaterialsMaster /></ProtectedRoute>
              </Route>
              <Route path="/cost-summary">
                <ProtectedRoute path="/cost-summary"><CostSummary /></ProtectedRoute>
              </Route>
              <Route path="/workers-master">
                <ProtectedRoute path="/workers-master"><WorkersMaster /></ProtectedRoute>
              </Route>
              <Route path="/vendors-master">
                <ProtectedRoute path="/vendors-master"><VendorsMaster /></ProtectedRoute>
              </Route>
              <Route>
                <ProtectedRoute path="*"><NotFound /></ProtectedRoute>
              </Route>
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="light" storageKey="production-management-theme">
          <AuthProvider>
            <Switch>
              <Route path="/login" component={Login} />
              <Route>
                {() => <MainLayout />}
              </Route>
            </Switch>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
