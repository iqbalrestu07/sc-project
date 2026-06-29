import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout";
import { ErrorBoundary } from "@/components/ui/error-boundary";

// Public Pages
import LandingPage from "./pages/LandingPage";

// Auth + Onboarding Pages
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";

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
import Members from "./pages/Members";
import SettingsPage from "./pages/Settings";
import CmsManagement from "./pages/CmsManagement";
import Categories from "./pages/Categories";
import RBACManagement from "./pages/RBACManagement";
import StockOpname from "./pages/StockOpname";
import ConsumableItems from "./pages/ConsumableItems";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status =
          (error as any)?.statusCode || (error as any)?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const { signOut } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/admin/login" element={<Auth />} />
      <Route path="/auth" element={<Navigate to="/admin/login" replace />} />

      {/* Onboarding — requires auth but no org */}
      <Route path="/onboarding" element={
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      } />

      {/* Protected routes with sidebar layout */}
      <Route path="/dashboard" element={
        <ProtectedRoute requirePermission="reports:read">
          <MainLayout onSignOut={signOut}><Dashboard /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/patients" element={
        <ProtectedRoute requirePermission="patients:read">
          <MainLayout onSignOut={signOut}><Patients /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/patients/:id" element={
        <ProtectedRoute requirePermission="patients:read">
          <MainLayout onSignOut={signOut}><PatientDetail /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/appointments" element={
        <ProtectedRoute requirePermission="appointments:read">
          <MainLayout onSignOut={signOut}><Appointments /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/services" element={
        <ProtectedRoute requirePermission="services:read">
          <MainLayout onSignOut={signOut}><Services /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/products" element={
        <ProtectedRoute requirePermission="products:read">
          <MainLayout onSignOut={signOut}><Products /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/categories" element={
        <ProtectedRoute requirePermission="categories:read">
          <MainLayout onSignOut={signOut}><Categories /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/stock-opname" element={
        <ProtectedRoute requirePermission="products:write">
          <MainLayout onSignOut={signOut}><StockOpname /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/consumable-items" element={
        <ProtectedRoute requirePermission="consumables:read">
          <MainLayout onSignOut={signOut}><ConsumableItems /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/pos" element={
        <ProtectedRoute requirePermission="transactions:write">
          <MainLayout onSignOut={signOut}><POS /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/transactions" element={
        <ProtectedRoute requirePermission="transactions:read">
          <MainLayout onSignOut={signOut}><Transactions /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/commissions" element={
        <ProtectedRoute requirePermission="commissions:read">
          <MainLayout onSignOut={signOut}><Commissions /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/staff" element={
        <ProtectedRoute requirePermission="staff:read">
          <MainLayout onSignOut={signOut}><Staff /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/members" element={
        <ProtectedRoute requirePermission="organization:write">
          <MainLayout onSignOut={signOut}><Members /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/whatsapp" element={
        <ProtectedRoute>
          <MainLayout onSignOut={signOut}><WhatsAppMessaging /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/rbac" element={
        <ProtectedRoute requirePermission="rbac:read">
          <MainLayout onSignOut={signOut}><RBACManagement /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/cms" element={
        <ProtectedRoute requirePermission="cms:read">
          <MainLayout onSignOut={signOut}><CmsManagement /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute requirePermission="settings:read">
          <MainLayout onSignOut={signOut}><SettingsPage /></MainLayout>
        </ProtectedRoute>
      } />

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
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
