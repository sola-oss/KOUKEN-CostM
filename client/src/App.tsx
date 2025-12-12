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
// Production Management MVP - Main Pages
import Projects from "@/pages/production/projects";
import ProjectDetail from "@/pages/production/project-detail";
import WorkInstructions from "@/pages/production/work-instructions";
import TaskPlanning from "@/pages/production/task-planning";
import Procurement from "@/pages/production/procurement";
import WorkResults from "@/pages/production/work-results";
import Calendar from "@/pages/production/calendar";
import SummaryApproval from "@/pages/production/summary-approval";
import CostAnalysis from "@/pages/production/cost-analysis";
import GanttSimple from "@/pages/production/gantt-simple";
import MaterialUsages from "@/pages/production/material-usages";
import MaterialSummary from "@/pages/production/material-summary";
import MaterialsMaster from "@/pages/production/materials-master";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Projects} />
      <Route path="/projects" component={Projects} />
      <Route path="/project/:id" component={ProjectDetail} />
      <Route path="/work-instructions" component={WorkInstructions} />
      <Route path="/task-planning" component={TaskPlanning} />
      <Route path="/procurement" component={Procurement} />
      <Route path="/work-results" component={WorkResults} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/summary-approval" component={SummaryApproval} />
      <Route path="/cost-analysis" component={CostAnalysis} />
      <Route path="/gantt" component={GanttSimple} />
      <Route path="/material-usages" component={MaterialUsages} />
      <Route path="/material-summary" component={MaterialSummary} />
      <Route path="/materials-master" component={MaterialsMaster} />
      <Route path="/settings" component={Settings} />
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
          <SidebarProvider defaultOpen={true} style={style as CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1">
                <header className="flex items-center justify-between px-4 py-3 border-b bg-background">
                  <div className="flex items-center gap-3">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <h1 className="text-lg font-semibold">工数管理</h1>
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
