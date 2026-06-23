import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Legacy role check — used for admin-only pages */
  allowedRoles?: AppRole[];
  /** Permission check — e.g. "patients:read" */
  requirePermission?: string;
}

export function ProtectedRoute({ children, allowedRoles, requirePermission }: ProtectedRouteProps) {
  const { user, role, isLoading, needsOnboarding, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Redirect to onboarding if the user has no org yet
  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // Permission-based guard
  if (requirePermission && !hasPermission(requirePermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-semibold mb-2">Akses Ditolak</h1>
          <p className="text-muted-foreground mb-4">
            Anda tidak memiliki permission <code className="font-mono text-sm bg-muted px-1 py-0.5 rounded">{requirePermission}</code> untuk mengakses halaman ini.
          </p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    );
  }

  // Legacy role-based guard (fallback)
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
