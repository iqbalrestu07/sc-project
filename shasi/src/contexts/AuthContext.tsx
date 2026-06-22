import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";

type AppRole = "admin" | "doctor" | "therapist" | "cashier";

type AuthUser = {
  id: string;
  email: string;
  role: AppRole;
};

interface AuthContextType {
  user: AuthUser | null;
  role: AppRole | null;
  isLoading: boolean;
  signIn: (user: AuthUser) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = apiClient.getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiClient.get<{ success: boolean; data: AuthUser }>(
          API_ENDPOINTS.AUTH.ME
        );

        if (response?.data) {
          setUser(response.data);
          setRole(response.data.role);
        }
      } catch (error) {
        apiClient.clearTokens();
        setUser(null);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signIn = (authUser: AuthUser) => {
    setUser(authUser);
    setRole(authUser.role);
  };

  const signOut = async () => {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch {
      // ignore logout errors and clear local auth state anyway
    }

    apiClient.clearTokens();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, isLoading, signIn, signOut }}>
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
