import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout";

// Public Pages
import LandingPage from "./pages/LandingPage";

// Auth Pages
import Auth from "./pages/Auth";

// Admin Pages
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import Appointments from "./pages/Appointments";
import Services from "./pages/Services";
import Products from "./pages/Products";
import POS from "./pages/POS";
import Commissions from "./pages/Commissions";
import Transactions from "./pages/Transactions";
import WhatsAppMessaging from "./pages/WhatsAppMessaging";
import Staff from "./pages/Staff";
import SettingsPage from "./pages/Settings";
import CmsManagement from "./pages/CmsManagement";
import Categories from "./pages/Categories";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { signOut } = useAuth();

  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Admin login route */}
      <Route path="/admin/login" element={<Auth />} />
      
      {/* Legacy auth route - redirect to new path */}
      <Route path="/auth" element={<Navigate to="/admin/login" replace />} />
      
      {/* Protected admin routes with layout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout onSignOut={signOut}>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients"
        element={
          <ProtectedRoute allowedRoles={["admin", "doctor", "therapist"]}>
            <MainLayout onSignOut={signOut}>
              <Patients />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:id"
        element={
          <ProtectedRoute allowedRoles={["admin", "doctor", "therapist"]}>
            <MainLayout onSignOut={signOut}>
              <PatientDetail />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <MainLayout onSignOut={signOut}>
              <Appointments />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/services"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <MainLayout onSignOut={signOut}>
              <Services />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <MainLayout onSignOut={signOut}>
              <Products />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pos"
        element={
          <ProtectedRoute>
            <MainLayout onSignOut={signOut}>
              <POS />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute allowedRoles={["admin", "cashier"]}>
            <MainLayout onSignOut={signOut}>
              <Transactions />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/commissions"
        element={
          <ProtectedRoute allowedRoles={["admin", "doctor", "therapist"]}>
            <MainLayout onSignOut={signOut}>
              <Commissions />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <MainLayout onSignOut={signOut}>
              <Staff />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <MainLayout onSignOut={signOut}>
              <SettingsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/whatsapp"
        element={
          <ProtectedRoute allowedRoles={["admin", "cashier"]}>
            <MainLayout onSignOut={signOut}>
              <WhatsAppMessaging />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cms"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <MainLayout onSignOut={signOut}>
              <CmsManagement />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <MainLayout onSignOut={signOut}>
              <Categories />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
