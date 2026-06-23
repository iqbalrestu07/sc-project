import { useState, useEffect } from "react";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, User, RefreshCw, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string;
}

interface RolePermissionsMap {
  [role: string]: string[];
}

interface OrgMember {
  id: string;
  user_id: string;
  org_id: string;
  role: string;
  user_email: string;
  user_full_name: string;
}

interface UserPermission {
  id: string;
  permission_id: string;
  permission_description: string;
}

const ROLES = ["admin", "doctor", "therapist", "cashier"] as const;
type Role = typeof ROLES[number];

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  doctor: "Dokter",
  therapist: "Terapis",
  cashier: "Kasir",
};

const RESOURCE_LABELS: Record<string, string> = {
  patients: "Pasien",
  appointments: "Appointment",
  services: "Layanan",
  products: "Produk",
  categories: "Kategori",
  transactions: "Transaksi",
  commissions: "Komisi",
  staff: "Staff",
  reports: "Laporan",
  settings: "Pengaturan",
  cms: "CMS",
  rbac: "RBAC",
  organization: "Organisasi",
};

export default function RBACManagement() {
  const { hasPermission, activeOrg } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionsMap>({});
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);
  const [userExtraPerms, setUserExtraPerms] = useState<UserPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const canManageRBAC = hasPermission("rbac:write");

  useEffect(() => {
    loadData();
  }, [activeOrg?.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [permsResp, rolePermsResp, membersResp] = await Promise.all([
        apiClient.get<{ success: boolean; data: Permission[] }>(API_ENDPOINTS.RBAC.PERMISSIONS),
        apiClient.get<{ success: boolean; data: RolePermissionsMap }>(API_ENDPOINTS.RBAC.ALL_ROLE_PERMISSIONS),
        activeOrg ? apiClient.get<{ success: boolean; data: OrgMember[] }>(
          API_ENDPOINTS.ORGANIZATIONS.MEMBERS(activeOrg.id)
        ) : Promise.resolve({ data: [] }),
      ]);

      setPermissions(permsResp?.data ?? []);
      setRolePermissions(rolePermsResp?.data ?? {});
      setMembers(membersResp?.data ?? []);
    } catch (err: any) {
      toast.error("Gagal memuat data RBAC: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserExtraPerms = async (userId: string) => {
    try {
      const resp = await apiClient.get<{ success: boolean; data: UserPermission[] }>(
        API_ENDPOINTS.RBAC.USER_PERMISSIONS(userId)
      );
      setUserExtraPerms(resp?.data ?? []);
    } catch {
      setUserExtraPerms([]);
    }
  };

  const handleSelectMember = (userId: string) => {
    const member = members.find(m => m.user_id === userId) ?? null;
    setSelectedMember(member);
    if (member) loadUserExtraPerms(member.user_id);
  };

  // ── Role permission management ────────────────────────────────────────────

  const isRolePermGranted = (role: string, permId: string) =>
    (rolePermissions[role] ?? []).includes(permId);

  const toggleRolePermission = async (role: string, permId: string) => {
    if (!canManageRBAC) {
      toast.error("Anda tidak memiliki akses untuk mengubah role permissions");
      return;
    }
    const current = rolePermissions[role] ?? [];
    const updated = current.includes(permId)
      ? current.filter(p => p !== permId)
      : [...current, permId];

    // Optimistic update
    setRolePermissions(prev => ({ ...prev, [role]: updated }));

    try {
      await apiClient.put(API_ENDPOINTS.RBAC.ROLE_PERMISSIONS(role), {
        permissions: updated,
      });
      toast.success(`Role "${ROLE_LABELS[role as Role] ?? role}" diperbarui`);
    } catch (err: any) {
      // Rollback
      setRolePermissions(prev => ({ ...prev, [role]: current }));
      toast.error("Gagal memperbarui role permissions: " + err.message);
    }
  };

  // ── User extra permission management ─────────────────────────────────────

  const isUserPermGranted = (permId: string) =>
    userExtraPerms.some(p => p.permission_id === permId);

  const toggleUserPermission = async (permId: string) => {
    if (!selectedMember) return;
    if (!canManageRBAC) {
      toast.error("Anda tidak memiliki akses untuk mengubah user permissions");
      return;
    }

    const granted = isUserPermGranted(permId);
    try {
      if (granted) {
        await apiClient.delete(API_ENDPOINTS.RBAC.REVOKE_PERMISSION(selectedMember.user_id, permId));
        setUserExtraPerms(prev => prev.filter(p => p.permission_id !== permId));
        toast.success("Permission dicabut");
      } else {
        await apiClient.post(API_ENDPOINTS.RBAC.GRANT_PERMISSION(selectedMember.user_id), {
          permission_id: permId,
        });
        setUserExtraPerms(prev => [...prev, { id: "", permission_id: permId, permission_description: "" }]);
        toast.success("Permission diberikan");
      }
    } catch (err: any) {
      toast.error("Gagal: " + err.message);
    }
  };

  // Group permissions by resource
  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.resource]) acc[p.resource] = [];
    acc[p.resource].push(p);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen RBAC</h1>
          <p className="text-muted-foreground">
            Kelola hak akses berdasarkan role dan permission individual per user
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={isSaving}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="role-permissions">
        <TabsList>
          <TabsTrigger value="role-permissions">
            <Shield className="w-4 h-4 mr-2" />
            Default Role Permissions
          </TabsTrigger>
          <TabsTrigger value="user-permissions">
            <User className="w-4 h-4 mr-2" />
            User Extra Permissions
          </TabsTrigger>
        </TabsList>

        {/* ── Role Permissions Tab ───────────────────────────────────────────── */}
        <TabsContent value="role-permissions" className="mt-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Permission default yang diberikan kepada setiap role. Perubahan berlaku untuk semua
              user dengan role tersebut di semua organisasi.
            </p>
            {!canManageRBAC && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                Anda hanya bisa melihat pengaturan ini. Butuh permission{" "}
                <code className="font-mono">rbac:write</code> untuk mengubah.
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium w-48">Resource</th>
                    <th className="text-left p-3 font-medium w-32">Action</th>
                    {ROLES.map(role => (
                      <th key={role} className="text-center p-3 font-medium w-28">
                        <Badge variant="outline">{ROLE_LABELS[role]}</Badge>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grouped).map(([resource, perms]) =>
                    perms.map((perm, pIdx) => (
                      <tr key={perm.id} className="border-t hover:bg-muted/20">
                        {pIdx === 0 && (
                          <td
                            rowSpan={perms.length}
                            className="p-3 font-medium border-r align-top"
                          >
                            {RESOURCE_LABELS[resource] ?? resource}
                          </td>
                        )}
                        <td className="p-3 text-muted-foreground capitalize">{perm.action}</td>
                        {ROLES.map(role => (
                          <td key={role} className="p-3 text-center">
                            <Checkbox
                              checked={isRolePermGranted(role, perm.id)}
                              onCheckedChange={() => toggleRolePermission(role, perm.id)}
                              disabled={!canManageRBAC}
                            />
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── User Extra Permissions Tab ─────────────────────────────────────── */}
        <TabsContent value="user-permissions" className="mt-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Berikan permission tambahan kepada user tertentu di luar default role mereka. Ini
              memungkinkan akses yang lebih granular per user di organisasi ini.
            </p>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pilih User</CardTitle>
                <CardDescription>
                  Pilih anggota organisasi untuk mengelola extra permissions-nya
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select onValueChange={handleSelectMember}>
                  <SelectTrigger className="w-full max-w-sm">
                    <SelectValue placeholder="Pilih anggota..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map(m => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        <span className="flex items-center gap-2">
                          {m.user_full_name || m.user_email}
                          <Badge variant="outline" className="text-xs ml-1">
                            {m.role}
                          </Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedMember && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{selectedMember.user_full_name || selectedMember.user_email}</p>
                    <p className="text-sm text-muted-foreground">
                      Role: <Badge variant="secondary">{selectedMember.role}</Badge>
                    </p>
                  </div>
                </div>

                {!canManageRBAC && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                    Anda hanya bisa melihat. Butuh permission{" "}
                    <code className="font-mono">rbac:write</code> untuk mengubah.
                  </div>
                )}

                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium w-48">Resource</th>
                        <th className="text-left p-3 font-medium w-32">Action</th>
                        <th className="text-center p-3 font-medium w-40">Extra Access</th>
                        <th className="text-left p-3 font-medium">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(grouped).map(([resource, perms]) =>
                        perms.map((perm, pIdx) => {
                          const hasFromRole = isRolePermGranted(selectedMember.role, perm.id);
                          const hasExtra = isUserPermGranted(perm.id);
                          return (
                            <tr key={perm.id} className="border-t hover:bg-muted/20">
                              {pIdx === 0 && (
                                <td
                                  rowSpan={perms.length}
                                  className="p-3 font-medium border-r align-top"
                                >
                                  {RESOURCE_LABELS[resource] ?? resource}
                                </td>
                              )}
                              <td className="p-3 text-muted-foreground capitalize">{perm.action}</td>
                              <td className="p-3 text-center">
                                <Checkbox
                                  checked={hasExtra}
                                  onCheckedChange={() => toggleUserPermission(perm.id)}
                                  disabled={!canManageRBAC || hasFromRole}
                                  title={hasFromRole ? "Sudah termasuk dari default role" : ""}
                                />
                              </td>
                              <td className="p-3 text-xs text-muted-foreground">
                                {hasFromRole ? (
                                  <Badge variant="outline" className="text-xs">dari role</Badge>
                                ) : hasExtra ? (
                                  <Badge variant="default" className="text-xs">extra</Badge>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
