import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sprout, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess: () => void;
}

export const AuthModal = ({ open, onOpenChange, onAuthSuccess }: AuthModalProps) => {
  const [authMode, setAuthMode] = useState<"login" | "farmer-signup" | "startup-signup">("login");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Farmer signup state
  const [farmerName, setFarmerName] = useState("");
  const [farmerEmail, setFarmerEmail] = useState("");
  const [farmerPassword, setFarmerPassword] = useState("");
  const [farmerConfirmPassword, setFarmerConfirmPassword] = useState("");

  // Startup signup now uses external Google Form (no in-app credentials)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const apiBase = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL?.replace(/\/$/, '') ?? '';
      const response = await fetch(`${apiBase}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Login failed" }));
        throw new Error(err.message || "Login failed");
      }
      const result = await response.json();
      // Expecting { token, user: { name|company_name, role, email } }
      localStorage.setItem("authToken", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));

      toast({ title: "Welcome back!", description: "You have successfully logged in." });

      onAuthSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFarmerSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (farmerPassword !== farmerConfirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const apiBase = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL?.replace(/\/$/, '') ?? '';
      const response = await fetch(`${apiBase}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: farmerName,
          email: farmerEmail,
          password: farmerPassword,
          role: "farmer",
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Signup failed" }));
        throw new Error(err.message || "Signup failed");
      }
      const result = await response.json();
      localStorage.setItem("authToken", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));

      toast({ title: "Account created!", description: "Welcome to AgroScope. Your farmer account is ready." });

      onAuthSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStartupFormRedirect = () => {
    const url = "https://forms.gle/21u5BSxq9MBL3z647";
    window.open(url, "_blank", "noopener,noreferrer");
    toast({
      title: "Opening startup onboarding form",
      description: "Complete the Google Form to apply as a startup. We will review and onboard you from there.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[520px] max-h-[min(90vh,100dvh)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Join AgroScope</DialogTitle>
          <DialogDescription>
            The Circular Economy Platform
          </DialogDescription>
        </DialogHeader>

        <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="farmer-signup">Farmer</TabsTrigger>
            <TabsTrigger value="startup-signup">Startup</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 py-4">
              <p className="text-xs text-muted-foreground mb-2">Click to auto-fill demo credentials</p>
              <div className="grid grid-cols-2 gap-2 mb-4 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail("f1@gmail.com");
                    setLoginPassword("farmer");
                  }}
                  className="py-2 px-1 rounded-lg border border-primary/30 bg-primary/10 text-primary text-[10px] font-medium flex flex-col items-center justify-center gap-0.5 hover:bg-primary/20 transition-colors min-w-0"
                >
                  <span>🌾</span>
                  <span className="leading-tight truncate">Demo Farmer</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail("east@argo");
                    setLoginPassword("east@argo");
                  }}
                  className="py-2 px-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-medium flex flex-col items-center justify-center gap-0.5 hover:bg-amber-500/20 transition-colors min-w-0"
                >
                  <span>🚀</span>
                  <span className="leading-tight truncate">Demo Startup</span>
                </button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthMode("farmer-signup")}
                  className="text-primary font-semibold hover:underline"
                >
                  Register Here
                </button>
              </p>
            </form>
          </TabsContent>

          {/* Farmer Signup Tab */}
          <TabsContent value="farmer-signup">
            <form onSubmit={handleFarmerSignup} className="space-y-4 py-4">
              <div className="flex items-center gap-2 mb-4 p-3 bg-primary/10 rounded-lg">
                <Sprout className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold text-sm">Farmer Sign Up</p>
                  <p className="text-xs text-muted-foreground">100% Free Service</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="farmer-name">Full Name</Label>
                <Input
                  id="farmer-name"
                  placeholder="Amit Kumar"
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmer-email">Email</Label>
                <Input
                  id="farmer-email"
                  type="email"
                  placeholder="amit.kumar@farm.com"
                  value={farmerEmail}
                  onChange={(e) => setFarmerEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmer-password">Set Password</Label>
                <Input
                  id="farmer-password"
                  type="password"
                  placeholder="Create a password"
                  value={farmerPassword}
                  onChange={(e) => setFarmerPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmer-confirm">Confirm Password</Label>
                <Input
                  id="farmer-confirm"
                  type="password"
                  placeholder="Confirm your password"
                  value={farmerConfirmPassword}
                  onChange={(e) => setFarmerConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="cta" className="w-full" disabled={loading}>
                {loading ? "Creating Account..." : "Create Farmer Account"}
              </Button>
            </form>
          </TabsContent>

          {/* Startup Signup Tab — redirects to Google Form instead of in-app registration */}
          <TabsContent value="startup-signup">
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 mb-2 p-3 bg-secondary/10 rounded-lg">
                <Building2 className="w-5 h-5 text-secondary" />
                <div>
                  <p className="font-semibold text-sm">Startup Onboarding</p>
                  <p className="text-xs text-muted-foreground">
                    To avoid duplicate or fake startup listings, we use a verified Google Form for onboarding.
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Click the button below to open the official AgroScope Startup Onboarding Form. After submitting,
                our team will review your application and create credentials for approved startups.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleStartupFormRedirect}
              >
                Open Startup Onboarding Form
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
