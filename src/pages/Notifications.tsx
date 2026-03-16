import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, Home, Bell, Package, Clock, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NotificationItem {
  _id: string;
  status: string;
  message?: string | null;
  createdAt: string;
  provision?: {
    _id: string;
    wasteType: string;
    quantityTons: number;
    location: string;
  } | null;
}

const Notifications = () => {
  const API_BASE = ((import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || "").replace(/\/$/, "");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'farmer' | 'startup' | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate('/home');
      return;
    }
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      setRole(u?.role || null);
    } catch {}
    fetch(`${API_BASE}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load notifications");
        const data = await r.json();
        setItems(data.notifications || []);
      })
      .catch((e) => toast({ title: "Error", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/home')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-primary rounded-full p-2">
              <Leaf className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">AgroScope</span>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/home')}>
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            {role === 'farmer' && (
              <Button variant="outline" size="sm" onClick={() => navigate('/farmer-inventory')}>
                Check Inventory
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" /> Notifications
        </h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <Card className="border-2"><CardContent className="p-8">No notifications yet.</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {items.map((n) => (
              <Card key={n._id} className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" /> {n.provision?.wasteType || 'Provision'} — {n.provision?.quantityTons} tons
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  {n.provision?.location && (
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {n.provision.location}</div>
                  )}
                  <div>Status: <span className="font-semibold capitalize">{n.status}</span></div>
                  {n.message && <div>Message: {n.message}</div>}
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> {new Date(n.createdAt).toLocaleString()}</div>
                  {role === 'farmer' && n.status === 'pending' && (
                    <div className="pt-2">
                      <Button
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('authToken');
                            const resp = await fetch(`${API_BASE}/api/orders/${n._id}/accept`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (!resp.ok) {
                              const err = await resp.json().catch(() => ({}));
                              throw new Error(err.message || 'Failed to accept');
                            }
                            toast({ title: 'Accepted', description: 'Deal locked.' });
                            // refresh
                            setLoading(true);
                            const r = await fetch(`${API_BASE}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
                            const d = await r.json();
                            setItems(d.notifications || []);
                            setLoading(false);
                          } catch (e: any) {
                            toast({ title: 'Error', description: e.message, variant: 'destructive' });
                          }
                        }}
                      >
                        Accept
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;


