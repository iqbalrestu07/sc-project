import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Mail, Lock, Loader2, User, Building2 } from "lucide-react";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import { useAuth, OrgInfo } from "@/contexts/AuthContext";
import { getDefaultRoute } from "@/lib/routes";
import { useToast } from "@/hooks/use-toast";

interface AuthResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    full_name?: string;
  };
  organizations?: OrgInfo[];
  needs_onboarding?: boolean;
  error?: string;
  data?: any;
}

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Sign-up extra fields
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");

  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleAuthSuccess = (response: AuthResponse) => {
    const accessToken = response.access_token ?? response.data?.access_token;
    const refreshToken = response.refresh_token ?? response.data?.refresh_token;
    const user = response.user ?? response.data?.user;
    const orgs: OrgInfo[] = response.organizations ?? response.data?.organizations ?? [];

    if (accessToken) apiClient.setAccessToken(accessToken);
    if (refreshToken) apiClient.setRefreshToken(refreshToken);

    if (user) {
      signIn(
        { id: user.id, email: user.email, role: user.role as any, full_name: user.full_name },
        orgs,
      );
    }

    if (response.needs_onboarding || orgs.length === 0) {
      navigate("/onboarding");
    } else {
      navigate(getDefaultRoute(orgs[0].role));
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, {
        email,
        password,
      });
      if (!response.success) {
        toast({ variant: "destructive", title: "Sign in gagal", description: response.error || "Email atau password salah" });
        return;
      }
      handleAuthSuccess(response);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sign in gagal", description: error?.message || "Email atau password salah" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      toast({ variant: "destructive", title: "Nama klinik wajib diisi", description: "Masukkan nama klinik/organisasi Anda untuk mendaftar." });
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, {
        email: signupEmail,
        password: signupPassword,
        full_name: fullName,
        organization_name: orgName,
      });
      if (!response.success) {
        const message = response.error || "Unable to register";
        toast({
          variant: "destructive",
          title: message.toLowerCase().includes("already registered") ? "Akun sudah ada" : "Sign up gagal",
          description: message.toLowerCase().includes("already registered")
            ? "Email ini sudah terdaftar. Silakan sign in."
            : message,
        });
        return;
      }
      toast({ title: "Akun berhasil dibuat!", description: `Selamat datang di ${orgName}!` });
      handleAuthSuccess(response);
    } catch (error: any) {
      const message: string = error?.message || "";
      toast({
        variant: "destructive",
        title: message.toLowerCase().includes("already registered") ? "Akun sudah ada" : "Sign up gagal",
        description: message.toLowerCase().includes("already registered")
          ? "Email ini sudah terdaftar. Silakan sign in."
          : message || "Terjadi kesalahan",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-clinic-maroon-light/30 to-clinic-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-clinic">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">AestheticPro</h1>
          <p className="text-muted-foreground mt-1">Clinic Management System</p>
        </div>

        <Card className="shadow-clinic border-0">
          <Tabs defaultValue="signin" className="w-full">
            <CardHeader className="pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="pt-4">
              {/* Sign In */}
              <TabsContent value="signin" className="mt-0">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signin-email" type="email" placeholder="you@clinic.com" className="pl-10"
                        value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signin-password" type="password" placeholder="••••••••" className="pl-10"
                        value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              {/* Sign Up */}
              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nama Lengkap</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-name" type="text" placeholder="Dr. Siti Rahayu" className="pl-10"
                        value={fullName} onChange={e => setFullName(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-org">Nama Klinik / Organisasi *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-org" type="text" placeholder="Klinik Cantik Sehat" className="pl-10"
                        value={orgName} onChange={e => setOrgName(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-email" type="email" placeholder="you@clinic.com" className="pl-10"
                        value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-password" type="password" placeholder="••••••••" className="pl-10"
                        value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required minLength={6} />
                    </div>
                    <p className="text-xs text-muted-foreground">Minimum 6 karakter</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Daftar &amp; Buat Klinik
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Enterprise Aesthetic Clinic Management
        </p>
      </div>
    </div>
  );
}
