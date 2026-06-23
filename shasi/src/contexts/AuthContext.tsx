import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";

export type AppRole = "admin" | "doctor" | "therapist" | "cashier";

export type AuthUser = {
  id: string;
  email: string;
  role: AppRole;
  full_name?: string;
  avatar_url?: string;
};

export type OrgInfo = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  role: AppRole; // user's role in this org
};

interface AuthContextType {
  user: AuthUser | null;
  role: AppRole | null;
  /** Active organization */
  activeOrg: OrgInfo | null;
  /** All organizations the user belongs to */
  organizations: OrgInfo[];
  /** Effective permissions for user in activeOrg */
  permissions: string[];
  isLoading: boolean;
  /** Called after login/register — sets auth state and auto-picks first org */
  signIn: (user: AuthUser, orgs: OrgInfo[]) => void;
  /** Switch to a different organization */
  switchOrg: (org: OrgInfo) => Promise<void>;
  signOut: () => Promise<void>;
  /** Check if user has a given permission in the active org */
  hasPermission: (permission: string) => boolean;
  /** Check if user has a given role in the active org */
  hasRole: (...roles: AppRole[]) => boolean;
  /** True if user has no organizations yet (needs onboarding) */
  needsOnboarding: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [activeOrg, setActiveOrg] = useState<OrgInfo | null>(null);
  const [organizations, setOrganizations] = useState<OrgInfo[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    if (!apiClient.getActiveOrgId()) return;
    try {
      const resp = await apiClient.get<{ success: boolean; data: { permissions: string[] } }>(
        API_ENDPOINTS.RBAC.MY_PERMISSIONS
      );
      if (resp?.data?.permissions) {
        setPermissions(resp.data.permissions);
      }
    } catch {
      setPermissions([]);
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = apiClient.getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiClient.get<{
          success: boolean;
          data: AuthUser & {
            org_id?: string;
            org_role?: AppRole;
            permissions?: string[];
          };
        }>(API_ENDPOINTS.AUTH.ME);

        if (response?.data) {
          const u = response.data;
          setUser({ id: u.id, email: u.email, role: u.role, full_name: u.full_name, avatar_url: u.avatar_url });
          setRole(u.role);

          if (u.permissions) {
            setPermissions(u.permissions);
          }

          // Restore active org from localStorage
          const savedOrgId = apiClient.getActiveOrgId();
          if (savedOrgId) {
            // Load orgs list to find the saved org
            try {
              const orgResp = await apiClient.get<{ success: boolean; data: OrgInfo[] }>(
                API_ENDPOINTS.ORGANIZATIONS.MY
              );
              const orgs = orgResp?.data ?? [];
              setOrganizations(orgs);
              const savedOrg = orgs.find(o => o.id === savedOrgId);
              if (savedOrg) {
                setActiveOrg(savedOrg);
                setRole(savedOrg.role);
              } else if (orgs.length > 0) {
                setActiveOrg(orgs[0]);
                apiClient.setActiveOrgId(orgs[0].id);
                setRole(orgs[0].role as AppRole);
              }
            } catch {
              // ignore
            }
          }
        }
      } catch (error) {
        apiClient.clearTokens();
        setUser(null);
        setRole(null);
        setActiveOrg(null);
        setOrganizations([]);
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signIn = useCallback((authUser: AuthUser, orgs: OrgInfo[]) => {
    setUser(authUser);
    setOrganizations(orgs);

    if (orgs.length > 0) {
      const first = orgs[0];
      setActiveOrg(first);
      setRole(first.role as AppRole);
      apiClient.setActiveOrgId(first.id);
      // Load permissions async
      loadPermissions();
    } else {
      setRole(authUser.role);
      setActiveOrg(null);
    }
  }, [loadPermissions]);

  const switchOrg = useCallback(async (org: OrgInfo) => {
    setActiveOrg(org);
    setRole(org.role as AppRole);
    apiClient.setActiveOrgId(org.id);
    // Reload permissions for new org
    await loadPermissions();
  }, [loadPermissions]);

  const signOut = async () => {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch {
      // ignore
    }
    apiClient.clearTokens();
    setUser(null);
    setRole(null);
    setActiveOrg(null);
    setOrganizations([]);
    setPermissions([]);
  };

  const hasPermission = useCallback((permission: string) => {
    return permissions.includes(permission);
  }, [permissions]);

  const hasRole = useCallback((...roles: AppRole[]) => {
    if (!role) return false;
    return roles.includes(role);
  }, [role]);

  const needsOnboarding = !isLoading && !!user && organizations.length === 0;

  return (
    <AuthContext.Provider value={{
      user,
      role,
      activeOrg,
      organizations,
      permissions,
      isLoading,
      signIn,
      switchOrg,
      signOut,
      hasPermission,
      hasRole,
      needsOnboarding,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
