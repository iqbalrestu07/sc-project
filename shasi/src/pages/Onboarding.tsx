import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import type { OrgInfo } from "@/contexts/AuthContext";

export default function Onboarding() {
  const { user, signIn, organizations } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama klinik/organisasi wajib diisi");
      return;
    }

    setIsLoading(true);
    try {
      const resp = await apiClient.post<{ success: boolean; data: OrgInfo }>(
        API_ENDPOINTS.ORGANIZATIONS.CREATE,
        { name: name.trim(), description: description.trim() }
      );

      if (resp?.data) {
        const newOrg: OrgInfo = { ...resp.data, role: "admin" };
        const updatedOrgs = [...organizations, newOrg];
        // Update context — signIn with updated orgs list
        if (user) {
          signIn(user, updatedOrgs);
        }
        toast.success(`Organisasi "${newOrg.name}" berhasil dibuat!`);
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal membuat organisasi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Buat Klinik Anda</CardTitle>
          <CardDescription>
            Selamat datang{user?.full_name ? `, ${user.full_name}` : ""}! Mulai dengan membuat
            profil klinik atau organisasi Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Nama Klinik / Organisasi *</Label>
              <Input
                id="org-name"
                placeholder="contoh: Klinik Cantik Sehat"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-desc">Deskripsi (opsional)</Label>
              <Textarea
                id="org-desc"
                placeholder="Klinik kecantikan dan perawatan kulit..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Membuat..." : "Buat Organisasi & Mulai"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
