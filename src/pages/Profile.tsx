import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Home, LogOut, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getFarmerRating, getStartupRating } from "@/lib/api";
import { StarRating } from "@/components/StarRating";
import { useWallet } from "@/context/WalletContext";

function formatTxTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dDate.getTime() === today.getTime()) return "Today";
  if (dDate.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
}

/** Format Agro Coins for display (supports decimals like 0.06, 0.008). */
function formatAgroCoins(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n % 1 === 0) return String(n);
  return Number(n.toFixed(8)).toString();
}

const Profile = () => {
  const API_BASE = ((import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || "").replace(/\/$/, "");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [role, setRole] = useState<"farmer" | "startup" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState<{ final_rating: number } | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const { isLoading: walletLoading } = useWallet();

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    toast({ title: "Logged out", description: "You have been successfully logged out." });
    navigate('/home');
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userRaw = localStorage.getItem("user");
    if (!token || !userRaw) {
      navigate("/home");
      return;
    }
    try {
      const u = JSON.parse(userRaw);
      setRole(u.role);
      setUserId(u.id || null);
      setEmail(u.email || "");
      setName(u.name || "");
      setCompanyName(u.company_name || "");
    } catch {}
  }, [navigate]);

  useEffect(() => {
    if (!userId || !role) return;
    setRatingLoading(true);
    (role === "farmer" ? getFarmerRating(userId) : getStartupRating(userId))
      .then((r) => setRating(r))
      .catch(() => setRating(null))
      .finally(() => setRatingLoading(false));
  }, [userId, role]);

  const save = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    setSaving(true);
    try {
      const resp = await fetch(`${API_BASE}/api/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, name, company_name: companyName }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update profile");
      }
      const data = await resp.json();
      localStorage.setItem("user", JSON.stringify(data.user));
      toast({ title: "Saved", description: "Profile updated successfully" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 safe-area-inset-top">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <button onClick={() => navigate('/home')} className="flex items-center gap-2 hover:opacity-80 transition-opacity min-h-[44px] touch-manipulation">
            <div className="bg-primary rounded-full p-2">
              <Leaf className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <span className="text-lg sm:text-2xl font-bold text-foreground truncate">AgroScope</span>
          </button>
          <Button variant="outline" size="sm" className="min-h-[44px] touch-manipulation" onClick={() => navigate('/home')}>
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 max-w-xl space-y-6 w-full min-w-0">
        <Card className="border-2 overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Edit Profile</CardTitle>
              {ratingLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              {!ratingLoading && rating != null && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rating</span>
                  <StarRating rating={rating.final_rating ?? 0} size="md" />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {role === 'farmer' ? (
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
            )}
            <div className="pt-2 grid grid-cols-1 gap-3">
              <Button onClick={save} disabled={saving} className="w-full min-h-[48px] touch-manipulation">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={handleLogout} className="w-full min-h-[48px] touch-manipulation">
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;


