import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Calendar, Sparkles, Package, Tag,
  ShoppingCart, DollarSign, UserCog, Settings, Menu, X, LogOut,
  ChevronLeft, Globe, MessageCircle, Shield,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { OrgSwitcher } from "./OrgSwitcher";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  permission?: string;
}

const navItems: NavItem[] = [
  { to: "/dashboard",    icon: LayoutDashboard, label: "Dashboard",    permission: "reports:read" },
  { to: "/patients",     icon: Users,           label: "Patients",     permission: "patients:read" },
  { to: "/appointments", icon: Calendar,        label: "Appointments", permission: "appointments:read" },
  { to: "/services",     icon: Sparkles,        label: "Services",     permission: "services:read" },
  { to: "/products",     icon: Package,         label: "Products",     permission: "products:read" },
  { to: "/categories",   icon: Tag,             label: "Categories",   permission: "categories:read" },
  { to: "/pos",          icon: ShoppingCart,    label: "Transactions", permission: "transactions:read" },
  { to: "/commissions",  icon: DollarSign,      label: "Commissions",  permission: "commissions:read" },
  { to: "/whatsapp",     icon: MessageCircle,   label: "WhatsApp" },
  { to: "/staff",        icon: UserCog,         label: "Staff",        permission: "staff:read" },
  { to: "/rbac",         icon: Shield,          label: "Roles & Permissions", permission: "rbac:read" },
  { to: "/cms",          icon: Globe,           label: "Website CMS",  permission: "cms:read" },
  { to: "/settings",     icon: Settings,        label: "Settings",     permission: "settings:read" },
];

interface SidebarProps {
  onSignOut?: () => void;
}

export function Sidebar({ onSignOut }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { hasPermission, activeOrg } = useAuth();

  // Only show nav items the user has permission to see
  // Items without a permission requirement are always shown
  const visibleNavItems = navItems.filter(item =>
    !item.permission || hasPermission(item.permission)
  );

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col",
        collapsed ? "w-[72px]" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-clinic-gold">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sidebar-foreground truncate">
                {activeOrg?.name ?? "Shasi Beauty Care"}
              </span>
            </div>
          )}

          {/* Close button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Collapse button for desktop */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>

        {/* Org Switcher (only when not collapsed) */}
        {!collapsed && activeOrg && (
          <div className="px-2 py-2 border-b border-sidebar-border">
            <OrgSwitcher />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          <ul className="space-y-1">
            {visibleNavItems.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                    collapsed && "justify-center px-2"
                  )}
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-2"
            )}
            onClick={onSignOut}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}
