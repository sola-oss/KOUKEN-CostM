import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/contexts/auth-context";

const WORKER_ALLOWED_PATHS = ["/task-management", "/material-usages"];

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role === "worker" && !WORKER_ALLOWED_PATHS.includes(location)) {
    return <Redirect to="/task-management" />;
  }

  return <>{children}</>;
}
