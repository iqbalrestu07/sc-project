import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import { useDynamicFavicon } from "@/hooks/useDynamicFavicon";

interface MainLayoutProps {
  children: ReactNode;
  onSignOut?: () => void;
}

export function MainLayout({ children, onSignOut }: MainLayoutProps) {
  const { settings } = useClinicSettings();
  useDynamicFavicon(settings?.favicon_url);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onSignOut={onSignOut} />
      <main className="lg:pl-64 transition-all duration-300">
        <div className="min-h-screen">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
