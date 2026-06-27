import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Calendar, Sparkles, Package, Tag,
  ShoppingCart, DollarSign, UserCog, Settings, Menu, X, LogOut,
  ChevronLeft, Globe, MessageCircle, Shield, Building2, ChevronDown,
  FolderOpen, ClipboardList,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { OrgSwitcher } from "./OrgSwitcher";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  permission?: string;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

type NavEntry =
  | { kind: "item";  item: NavItem }
  | { kind: "group"; group: NavGroup };

// ─── Navigation definition ────────────────────────────────────────────────────

const NAV_STRUCTURE: NavEntry[] = [
  {
    kind: "item",
    item: { to: "/dashboard",    icon: LayoutDashboard, label: "Dashboard",    permission: "reports:read" },
  },
  {
    kind: "item",
    item: { to: "/patients",     icon: Users,           label: "Patients",     permission: "patients:read" },
  },
  {
    kind: "item",
    item: { to: "/appointments", icon: Calendar,        label: "Appointments", permission: "appointments:read" },
  },
  {
    kind: "item",
    item: { to: "/pos",          icon: ShoppingCart,    label: "Transactions", permission: "transactions:read" },
  },

  // ── Group 1: Katalog ──────────────────────────────────────────────────────
  {
    kind: "group",
    group: {
      label: "Inventory Management",
      icon: FolderOpen,
      items: [
        { to: "/services",      icon: Sparkles,      label: "Services",      permission: "services:read" },
        { to: "/products",      icon: Package,       label: "Products",      permission: "products:read" },
        { to: "/categories",    icon: Tag,           label: "Categories",    permission: "categories:read" },
        { to: "/stock-opname",  icon: ClipboardList, label: "Stock Opname",  permission: "products:write" },
      ],
    },
  },

  // ── Group 2: SDM ──────────────────────────────────────────────────────────
  {
    kind: "group",
    group: {
      label: "Management User",
      icon: UserCog,
      items: [
        { to: "/staff",       icon: UserCog,    label: "Staff",       permission: "staff:read" },
        { to: "/commissions", icon: DollarSign, label: "Commissions", permission: "commissions:read" },
        { to: "/members",     icon: Building2,  label: "Members",     permission: "organization:write" },
      ],
    },
  },

  // ── Group 3: Pengaturan & Konten ──────────────────────────────────────────
  {
    kind: "group",
    group: {
      label: "Konten & Akses",
      icon: Globe,
      items: [
        { to: "/cms",      icon: Globe,          label: "Website CMS",       permission: "cms:read" },
        { to: "/rbac",     icon: Shield,         label: "Roles & Permissions", permission: "rbac:read" },
        { to: "/whatsapp", icon: MessageCircle,  label: "WhatsApp" },
      ],
    },
  },

  {
    kind: "item",
    item: { to: "/settings", icon: Settings, label: "Settings", permission: "settings:read" },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useItemVisible(permission?: string) {
  const { hasPermission } = useAuth();
  return !permission || hasPermission(permission);
}

// ─── CollapsibleGroup ─────────────────────────────────────────────────────────

interface CollapsibleGroupProps {
  group: NavGroup;
  collapsed: boolean;            // sidebar is icon-only mode
  onNavigate: () => void;
}

function CollapsibleGroup({ group, collapsed, onNavigate }: CollapsibleGroupProps) {
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);

  const visibleItems = group.items.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  if (visibleItems.length === 0) return null;

  const GroupIcon = group.icon;

  // In collapsed (icon-only) mode: just render the child items as icons stacked
  if (collapsed) {
    return (
      <li>
        <ul className="space-y-1">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className="flex items-center justify-center px-2 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                onClick={onNavigate}
                title={item.label}
              >
                <item.icon className="h-5 w-5 shrink-0" />
              </NavLink>
            </li>
          ))}
        </ul>
      </li>
    );
  }

  return (
    <li>
      {/* Group header button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors text-sm font-semibold uppercase tracking-wider select-none"
      >
        <GroupIcon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {/* Group items */}
      {open && (
        <ul className="mt-1 ml-3 pl-3 border-l border-sidebar-border space-y-0.5">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                onClick={onNavigate}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── SingleNavItem ─────────────────────────────────────────────────────────────

interface SingleNavItemProps {
  item: NavItem;
  collapsed: boolean;
  onNavigate: () => void;
}

function SingleNavItem({ item, collapsed, onNavigate }: SingleNavItemProps) {
  const visible = useItemVisible(item.permission);
  if (!visible) return null;

  return (
    <li>
      <NavLink
        to={item.to}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
          collapsed && "justify-center px-2"
        )}
        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    </li>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  onSignOut?: () => void;
}

export function Sidebar({ onSignOut }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { activeOrg } = useAuth();

  const handleNavigate = () => setMobileOpen(false);

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

        {/* Org Switcher */}
        {!collapsed && activeOrg && (
          <div className="px-2 py-2 border-b border-sidebar-border">
            <OrgSwitcher />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          <ul className="space-y-1">
            {NAV_STRUCTURE.map((entry, idx) =>
              entry.kind === "item" ? (
                <SingleNavItem
                  key={entry.item.to}
                  item={entry.item}
                  collapsed={collapsed}
                  onNavigate={handleNavigate}
                />
              ) : (
                <CollapsibleGroup
                  key={`group-${idx}`}
                  group={entry.group}
                  collapsed={collapsed}
                  onNavigate={handleNavigate}
                />
              )
            )}
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
