import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, Home, Package, MapPin, Clock } from "lucide-react";

const StartupMatches = () => {
  const API_BASE = ((import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || "").replace(/\/$/, "");
  const navigate = useNavigate();
  const { toast } = useToast();
  const locationNav = useLocation() as any;
  const results = locationNav?.state?.results || [];
  const needType = locationNav?.state?.needType;
  const quantity = locationNav?.state?.quantity;
  const locationTxt = locationNav?.state?.location;

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
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <h1 className="text-3xl font-bold mb-2">Matched Farmers</h1>
        <p className="text-muted-foreground mb-8">Request: {needType} • {quantity} tons • {locationTxt}</p>
        {results.length === 0 ? (
          <Card className="border-2"><CardContent className="p-8">No matches found. Try adjusting your request.</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {results.map((m: any) => (
              <Card key={m._id} className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" /> {m.wasteType} — {m.quantityTons} tons
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {m.location}</div>
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> {new Date(m.createdAt).toLocaleString()}</div>
                  <div className="pt-2">
                    <Button
                      variant="cta"
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem("authToken");
                          if (!token) {
                            toast({ title: "Login required", description: "Please log in as a startup.", variant: "destructive" });
                            return;
                          }
                          const resp = await fetch(`${API_BASE}/api/orders`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ provisionId: m._id }),
                          });
                          if (!resp.ok) {
                            const err = await resp.json().catch(() => ({}));
                            throw new Error(err.message || "Failed to send request");
                          }
                          toast({ title: "Request sent", description: "The farmer has been notified." });
                        } catch (e: any) {
                          toast({ title: "Error", description: e.message, variant: "destructive" });
                        }
                      }}
                    >
                      Request
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StartupMatches;


