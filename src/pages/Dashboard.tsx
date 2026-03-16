import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, Home, MapPin, Package, TrendingDown, Clock, Loader2, RefreshCw } from "lucide-react";
import FarmerNotifications from "@/components/FarmerNotifications";
import UPIPaymentFlowModal from "@/components/UPIPaymentFlowModal";
import { WalletDropdown } from "@/components/WalletDropdown";

const API_BASE = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? "";

/** Platform fee: 30% on top of farmer's listing price when showing to startups */
const PLATFORM_FEE_MULTIPLIER = 1.30;

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export interface ProvisionItem {
  _id: string;
  userId?: string;
  farmerName?: string;
  farmerUpiId?: string | null;
  wasteType: string;
  quantityTons: number;
  location?: string;
  price?: number | null;
  display_price?: number | null;
  wasteQualityGrade?: string | null;
  createdAt?: string;
  status?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const userRole = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      const user = JSON.parse(raw);
      return user?.role === "startup" ? "startup" : user?.role === "farmer" ? "farmer" : user?.role === "admin" ? "admin" : null;
    } catch {
      return null;
    }
  }, []);
  const [provisions, setProvisions] = useState<ProvisionItem[]>([]);
  const [provisionsLoading, setProvisionsLoading] = useState(true);
  const [payingProvision, setPayingProvision] = useState<{
    _id?: string;
    id?: string;
    wasteType: string;
    quantityTons: number;
    pricePerKg: number;
    leastPrice?: number;
    farmerName: string;
    farmerUpiId: string;
  } | null>(null);

  const fetchProvisions = useCallback(async () => {
    setProvisionsLoading(true);
    try {
      const res = await fetch(API_BASE + "/api/provisions", { headers: getAuthHeaders() });
      const data = await res.json();
      setProvisions(Array.isArray(data?.provisions) ? data.provisions : []);
    } catch {
      setProvisions([]);
    } finally {
      setProvisionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProvisions();
  }, [fetchProvisions]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
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
            <FarmerNotifications />
            <Button variant="ghost" size="sm" onClick={() => navigate('/notifications')}>Notifications</Button>
            <WalletDropdown role={userRole} />
            <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>Profile</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/payments')}>
              💳 Payments
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            The Repurposer's Hub
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Access verified, localized agricultural feedstock from farmers in your area
          </p>

          {/* Value Proposition Banner */}
          <Card className="border-2 border-secondary bg-gradient-to-r from-secondary/10 to-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Why Choose AgroScope for Sourcing?
                  </h3>
                  <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-secondary" />
                      <span>Reduce logistics costs by 40%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-secondary" />
                      <span>Verified quality & quantity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-secondary" />
                      <span>Direct from source pricing</span>
                    </div>
                  </div>
                </div>
                <Badge className="bg-secondary text-secondary-foreground text-sm px-4 py-2 whitespace-nowrap">
                  {provisionsLoading ? "..." : `${provisions.length} New Leads Available`}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Supplies — real farmer provisions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-foreground">
              Available Supplies Near You
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchProvisions()}
              disabled={provisionsLoading}
              type="button"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${provisionsLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {provisionsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
          ) : provisions.length === 0 ? (
            <Card className="border-2 border-dashed bg-muted/30">
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No supplies yet</h3>
                <p className="text-muted-foreground">
                  When farmers list their crop waste, new supplies will appear here for you to buy.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {provisions.map((provision) => {
                const farmerPricePerKg = Number(provision.price ?? provision.display_price ?? 0);
                const displayPricePerKg = farmerPricePerKg * PLATFORM_FEE_MULTIPLIER;
                const totalDisplay = Number(provision.quantityTons) * 1000 * displayPricePerKg;
                const qualityLabel =
                  provision.wasteQualityGrade === "A"
                    ? "Premium Grade"
                    : provision.wasteQualityGrade
                      ? `Grade ${provision.wasteQualityGrade}`
                      : "Standard Grade";
                return (
                  <Card
                    key={provision._id}
                    className="border-2 hover:shadow-card transition-all duration-300 hover:border-primary"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Package className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl mb-1">{provision.wasteType}</CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span>
                                {provision.createdAt
                                  ? timeAgo(provision.createdAt)
                                  : "Recently"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            provision.wasteQualityGrade === "A"
                              ? "border-primary text-primary"
                              : ""
                          }
                        >
                          {qualityLabel}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="grid md:grid-cols-4 gap-6 mb-6">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Quantity</div>
                          <div className="text-xl font-bold text-foreground">
                            {Number(provision.quantityTons)} Tons
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Location</div>
                          <div className="text-xl font-bold text-foreground flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-secondary" />
                            {provision.location || "Not specified"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Price (incl. 30% platform fee)</div>
                          <div className="text-xl font-bold text-secondary">
                            {totalDisplay > 0
                              ? `₹${Math.round(totalDisplay).toLocaleString("en-IN")}`
                              : displayPricePerKg > 0
                                ? `₹${displayPricePerKg.toFixed(2)}/kg`
                                : "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Seller</div>
                          <div className="text-sm font-semibold text-foreground">
                            {provision.farmerName || "Farmer"}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="cta"
                          size="lg"
                          className="flex-1"
                          onClick={() =>
                            setPayingProvision({
                              _id: provision._id,
                              id: provision._id,
                              wasteType: provision.wasteType,
                              quantityTons: Number(provision.quantityTons),
                              pricePerKg: displayPricePerKg,
                              leastPrice:
                                totalDisplay > 0 ? Math.round(totalDisplay) : undefined,
                              farmerName: provision.farmerName || "Farmer",
                              farmerUpiId:
                                provision.farmerUpiId || "77998026466@ybl",
                            })
                          }
                        >
                          🤝 Express Interest & Secure Supply
                        </Button>
                        <Button variant="outline" size="lg">
                          View Details
                        </Button>
                      </div>

                      <p className="text-xs text-center text-muted-foreground mt-3">
                        Pay only when you connect • Transparent commission structure • Direct
                        farmer contact
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Empty State Message */}
        <div className="mt-12 text-center">
          <Card className="border-2 border-dashed bg-muted/30">
            <CardContent className="p-12">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Looking for something specific?
              </h3>
              <p className="text-muted-foreground mb-6">
                Set up custom alerts for specific materials, quantities, or locations
              </p>
              <Button variant="outline" size="lg">
                Create Custom Alert
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {payingProvision && (
        <UPIPaymentFlowModal
          provision={payingProvision}
          buyerName={
            (() => {
              try {
                const u = localStorage.getItem("user");
                if (u) {
                  const parsed = JSON.parse(u);
                  return parsed.name ?? parsed.email ?? "Startup";
                }
              } catch {
                // ignore
              }
              return "Startup";
            })()
          }
          buyerId={
            (() => {
              try {
                const u = localStorage.getItem("user");
                if (u) {
                  const parsed = JSON.parse(u);
                  return String(parsed.id ?? parsed._id ?? "anon");
                }
              } catch {
                // ignore
              }
              return "anon";
            })()
          }
          onClose={() => setPayingProvision(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
