import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
  onSignOut?: () => void;
}

export function MainLayout({ children, onSignOut }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar onSignOut={onSignOut} />
      <main className="lg:pl-64 transition-all duration-300">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
