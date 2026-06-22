import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Mail, Lock, Loader2 } from "lucide-react";
import { apiClient, API_ENDPOINTS, AuthResponse } from "@/integrations/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleAuthSuccess = (response: AuthResponse) => {
    const accessToken = response.access_token || response.data?.access_token;
    const refreshToken = response.refresh_token || response.data?.refresh_token;
    const user = response.user || response.data?.user;

    if (accessToken) apiClient.setAccessToken(accessToken);
    if (refreshToken) apiClient.setRefreshToken(refreshToken);

    if (user) {
      signIn({
        id: user.id,
        email: user.email,
        role: user.role as "admin" | "doctor" | "therapist" | "cashier",
      });
    }

    navigate("/dashboard");
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
        toast({
          variant: "destructive",
          title: "Sign in failed",
          description: response.error || "Email atau password salah",
        });
        return;
      }

      handleAuthSuccess(response);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error?.message || "Email atau password salah",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, {
        email,
        password,
      });

      if (!response.success) {
        const message = response.error || "Unable to register";
        toast({
          variant: "destructive",
          title: message.toLowerCase().includes("already registered")
            ? "Akun sudah ada"
            : "Sign up failed",
          description: message.toLowerCase().includes("already registered")
            ? "Email ini sudah terdaftar. Silakan sign in."
            : message,
        });
        return;
      }

      handleAuthSuccess(response);
    } catch (error: any) {
      const message: string = error?.message || "";
      toast({
        variant: "destructive",
        title: message.toLowerCase().includes("already registered")
          ? "Akun sudah ada"
          : "Sign up failed",
        description: message.toLowerCase().includes("already registered")
          ? "Email ini sudah terdaftar. Silakan sign in."
          : message || "Terjadi kesalahan",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-clinic-rose-light/30 to-clinic-beige flex items-center justify-center p-4">
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
              <TabsContent value="signin" className="mt-0">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@clinic.com"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@clinic.com"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Minimum 6 characters
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
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
