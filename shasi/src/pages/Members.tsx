import { useState, useEffect } from "react";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Trash2, Search } from "lucide-react";

interface OrgMember {
  id: string;
  user_id: string;
  role: string;
  user_email: string;
  user_full_name: string;
}

interface UserLookup {
  id: string;
  email: string;
  full_name: string | null;
}

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "doctor", label: "Doctor" },
  { value: "therapist", label: "Therapist" },
  { value: "cashier", label: "Cashier" },
];

export default function MembersPage() {
  const { activeOrg, hasPermission } = useAuth();
  const canManage = hasPermission("organization:write");

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("cashier");
  const [searching, setSearching] = useState(false);

  const loadMembers = async () => {
    if (!activeOrg?.id) return;
    setLoading(true);
    try {
      const data = await apiClient.get<{ success: boolean; data: OrgMember[] }>(
        API_ENDPOINTS.ORGANIZATIONS.MEMBERS(activeOrg.id)
      );
      setMembers(data.data || []);
    } catch (err: any) {
      toast.error("Gagal memuat anggota: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [activeOrg?.id]);

  const handleRoleChange = async (member: OrgMember, newRole: string) => {
    if (!activeOrg?.id || !canManage) return;
    try {
      await apiClient.put(
        API_ENDPOINTS.ORGANIZATIONS.UPDATE_MEMBER(activeOrg.id, member.user_id),
        { role: newRole }
      );
      toast.success("Role diperbarui");
      loadMembers();
    } catch (err: any) {
      toast.error("Gagal memperbarui role: " + err.message);
    }
  };

  const handleRemove = async (member: OrgMember) => {
    if (!activeOrg?.id || !canManage) return;
    if (!confirm(`Hapus ${member.user_full_name || member.user_email} dari organisasi?`)) return;
    try {
      await apiClient.delete(
        API_ENDPOINTS.ORGANIZATIONS.REMOVE_MEMBER(activeOrg.id, member.user_id)
      );
      toast.success("Anggota dihapus");
      loadMembers();
    } catch (err: any) {
      toast.error("Gagal menghapus anggota: " + err.message);
    }
  };

  const handleAdd = async () => {
    if (!activeOrg?.id || !canManage) return;
    if (!email.trim()) {
      toast.error("Masukkan email");
      return;
    }
    setSearching(true);
    try {
      const userResp = await apiClient.get<{ success: boolean; data: UserLookup }>(
        API_ENDPOINTS.AUTH.USERS,
        { email: email.trim() }
      );
      if (!userResp.data?.id) {
        toast.error("User dengan email tersebut tidak ditemukan");
        return;
      }
      await apiClient.post(
        API_ENDPOINTS.ORGANIZATIONS.ADD_MEMBER(activeOrg.id),
        { user_id: userResp.data.id, role }
      );
      toast.success("Anggota berhasil ditambahkan");
      setEmail("");
      setRole("cashier");
      loadMembers();
    } catch (err: any) {
      toast.error("Gagal menambahkan anggota: " + err.message);
    } finally {
      setSearching(false);
    }
  };

  if (!activeOrg) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
        <PageHeader title="Manajemen Anggota" description="Pilih organisasi terlebih dahulu" />
        <div className="py-12 text-center text-muted-foreground">
          Tidak ada organisasi aktif. Pilih organisasi dari sidebar.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
      <PageHeader title="Manajemen Anggota" description={`Kelola user dalam organisasi ${activeOrg.name}`} />
      <div className="max-w-3xl space-y-6">
        {canManage && (
          <Card className="shadow-clinic">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Tambah Anggota
              </CardTitle>
              <CardDescription>Cari user yang sudah terdaftar berdasarkan email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="user@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAdd} disabled={searching || !email.trim()} className="gap-2">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Tambahkan
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-clinic">
          <CardHeader>
            <CardTitle>Daftar Anggota</CardTitle>
            <CardDescription>
              {members.length} anggota di {activeOrg.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Belum ada anggota.</p>
            ) : (
              members.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border">
                  <div className="space-y-1 min-w-0">
                    <p className="font-medium truncate">{member.user_full_name || member.user_email}</p>
                    <p className="text-sm text-muted-foreground truncate">{member.user_email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canManage ? (
                      <Select value={member.role} onValueChange={(value) => handleRoleChange(member, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className="capitalize">{member.role}</Badge>
                    )}
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleRemove(member)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
