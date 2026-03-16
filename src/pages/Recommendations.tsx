import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Leaf, Loader2, Package } from "lucide-react";
import { getRecommendations } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const WASTE_OPTIONS = ["Paddy Husk", "Wheat Straw", "Corn Stalks", "Sugarcane Bagasse", "Coconut Shells", "Organic", "Agricultural", "Plastic"];

export default function Recommendations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wasteType, setWasteType] = useState("Paddy Husk");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ wasteType: string; normalizedType: string; products: string[] } | null>(null);

  const fetchRecs = () => {
    if (!wasteType.trim()) return;
    setLoading(true);
    setData(null);
    getRecommendations(wasteType.trim())
      .then(setData)
      .catch((err) => toast({ title: "Error", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!wasteType.trim()) return;
    setLoading(true);
    setData(null);
    getRecommendations(wasteType.trim())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [wasteType]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <button onClick={() => navigate("/home")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-primary rounded-full p-2">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">AgroScope</span>
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Waste-to-Product Recommendations</h1>
          <p className="text-muted-foreground">See what your waste can be converted into</p>
        </div>

        <Card className="p-6 mb-6">
          <CardHeader>
            <CardTitle>Select waste type</CardTitle>
            <CardDescription>Choose a type to get product suggestions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={wasteType}
              onChange={(e) => setWasteType(e.target.value)}
            >
              {WASTE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <Button
              onClick={() => {
                if (!wasteType.trim()) return;
                setLoading(true);
                getRecommendations(wasteType.trim()).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
              }}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
          </CardContent>
        </Card>

        {data && (
          <Card className="p-6">
            <CardHeader>
              <CardTitle>{data.wasteType}</CardTitle>
              <CardDescription>Suggested products</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 sm:grid-cols-2">
                {data.products.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    {p}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
