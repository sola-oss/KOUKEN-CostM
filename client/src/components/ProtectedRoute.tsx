import { Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

const WORKER_ALLOWED_ROUTES = ["/task-management", "/material-usages"];

interface ProtectedRouteProps {
  path: string;
  children: React.ReactNode;
}

export function ProtectedRoute({ path, children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground text-sm">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role === "worker" && !WORKER_ALLOWED_ROUTES.includes(path)) {
    return <Redirect to="/task-management" />;
  }

  return <>{children}</>;
}
