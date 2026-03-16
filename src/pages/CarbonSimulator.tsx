import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Leaf, TreePine, Loader2, Flame } from "lucide-react";
import { simulateCarbon } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/context/WalletContext";

const WASTE_TYPES = ["Paddy Husk", "Wheat Straw", "Corn Stalks", "Sugarcane Bagasse", "Coconut Shells", "Organic", "Agricultural"];

export default function CarbonSimulator() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { earn } = useWallet();
  const [wasteType, setWasteType] = useState("Paddy Husk");
  const [quantityTons, setQuantityTons] = useState("5");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    co2SavedTons: number;
    equivalentTrees: number;
    carbonCreditsEarned: number;
    wasteType: string;
    quantityTons: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = Number(quantityTons);
    if (!wasteType.trim() || Number.isNaN(q) || q <= 0) {
      toast({ title: "Invalid input", description: "Enter waste type and positive quantity (tons).", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await simulateCarbon(wasteType.trim(), q);
      setResult(res);
      earn("CARBON_SIMULATE").catch(() => {});
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Simulation failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold mb-2">Carbon Credit Simulator</h1>
          <p className="text-muted-foreground">See how much CO₂ you save by diverting waste</p>
        </div>

        <Card className="p-6 mb-6">
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <CardDescription>Waste type and quantity in tons</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Waste type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={wasteType}
                  onChange={(e) => setWasteType(e.target.value)}
                >
                  {WASTE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Quantity (tons)</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={quantityTons}
                  onChange={(e) => setQuantityTons(e.target.value)}
                  placeholder="e.g. 10"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Flame className="h-4 w-4 mr-2" />}
                Calculate
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <Card className="p-6 border-primary/50">
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>{result.quantityTons} tons of {result.wasteType}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Flame className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">CO₂ saved</p>
                  <p className="text-2xl font-bold">{result.co2SavedTons} tons</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <TreePine className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Equivalent trees</p>
                  <p className="text-2xl font-bold">{result.equivalentTrees.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <span className="text-2xl">🌱</span>
                <div>
                  <p className="text-sm text-muted-foreground">Carbon credits earned</p>
                  <p className="text-2xl font-bold">{result.carbonCreditsEarned}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
