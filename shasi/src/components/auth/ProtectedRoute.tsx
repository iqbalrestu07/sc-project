import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { getDefaultRoute } from "@/lib/routes";
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
    return <Navigate to={getDefaultRoute(role)} replace />;
  }

  // Legacy role-based guard (fallback)
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultRoute(role)} replace />;
  }

  return <>{children}</>;
}
