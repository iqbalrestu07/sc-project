import { useAuth, OrgInfo } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronDown, Check, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function OrgSwitcher() {
  const { activeOrg, organizations, switchOrg } = useAuth();
  const navigate = useNavigate();

  const handleSwitch = async (org: OrgInfo) => {
    if (org.id === activeOrg?.id) return;
    await switchOrg(org);
    toast.success(`Beralih ke "${org.name}"`);
    // Reload current page to refresh data
    window.location.reload();
  };

  if (!activeOrg) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 px-2 h-10 text-left"
        >
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{activeOrg.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{activeOrg.role}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Organisasi Anda
        </DropdownMenuLabel>
        {organizations.map(org => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitch(org)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{org.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{org.role}</p>
            </div>
            {org.id === activeOrg.id && (
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate("/onboarding")}
          className="flex items-center gap-2 cursor-pointer text-muted-foreground"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="text-sm">Tambah Organisasi Baru</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
