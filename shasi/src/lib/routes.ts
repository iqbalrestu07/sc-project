import { AppRole } from "@/contexts/AuthContext";

export const DEFAULT_ROUTES: Record<AppRole, string> = {
  admin: "/dashboard",
  doctor: "/appointments",
  therapist: "/appointments",
  cashier: "/pos",
};

export function getDefaultRoute(role: AppRole | null | undefined): string {
  if (!role) return "/dashboard";
  return DEFAULT_ROUTES[role] ?? "/dashboard";
}
