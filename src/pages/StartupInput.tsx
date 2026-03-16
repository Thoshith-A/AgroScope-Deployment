import { ReactNode, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input as InputField } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CropDetectButton from "@/components/CropDetectButton";
import SatelliteDetectModal from "@/components/SatelliteDetectModal";
import type { SatelliteResult } from "@/components/SatelliteDetectModal";
import WeightEstimator from "@/components/WeightEstimator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import NegotiationArena from "@/components/NegotiationArena";
import AgroSaveBeforeModal from "@/components/AgroSaveBeforeModal";
import AgroSaveAfterModal from "@/components/AgroSaveAfterModal";
import type { AgroSaveProvision } from "@/components/AgroSaveBeforeModal";
import {
  ArrowLeft,
  Leaf,
  MapPin,
  Loader2,
  Flame,
  Package,
  Wheat,
  Package2,
  BadgeIndianRupee,
  IndianRupee,
  Scale,
  Weight,
  Star,
  Droplets,
  Map,
  Thermometer,
  Upload,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/context/TranslationContext";
import { useWallet } from "@/context/WalletContext";
import GlobalLanguageSelector from "@/components/GlobalLanguageSelector";
import { evaluatePrice, getRecommendations, simulateCarbon, getForecastByWasteType } from "@/lib/api";
import { CROP_WASTE_CONFIG } from "@/lib/cropIcons";
import { IconBox } from "@/components/ui/IconBox";
import { WasteTypeSearchSelect } from "@/components/WasteTypeSearchSelect";
import { useLivePrice } from "@/hooks/useLivePrice";

function wasteTypeLabelToKey(label: string): string {
  const entry = Object.entries(CROP_WASTE_CONFIG).find(([, c]) => c.label === label);
  return entry ? entry[0] : "paddy_husk";
}

function buildForecastParams(wasteTypeLabel: string, city: string, quantityStr: string) {
  const wasteType = wasteTypeLabelToKey(wasteTypeLabel);
  const cityVal = (city || "Chennai").trim();
  const q = parseFloat(quantityStr);
  const quantity = (Number.isFinite(q) && q > 0 ? q : 1).toString();
  return new URLSearchParams({ wasteType, city: cityVal, quantity });
}

function openGuideWith(message: string) {
  window.dispatchEvent(new CustomEvent("openAgroGuidePanel"));
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent("openAgroGuide", { detail: { message } }));
  }, 300);
}

const COLD_STORAGE_HUBS = ["Chennai", "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat"];

/** Crop types shown in Waste Type dropdown — from CROP_WASTE_CONFIG. */
const CROP_TYPES_FOR_INPUT = Object.values(CROP_WASTE_CONFIG).map((c) => c.label);

/** Final display values by crop (fallback when API fails). */
const FORECAST_BY_CROP: Record<string, { tons: number; confidence: number }> = {
  "Paddy Husk": { tons: 5.50, confidence: 85 },
  "Wheat Straw": { tons: 4.20, confidence: 80 },
  "Corn Stalks": { tons: 3.80, confidence: 78 },
  "Sugarcane Bagasse": { tons: 8.90, confidence: 88 },
  "Coconut Shells": { tons: 2.60, confidence: 75 },
  "Rice Straw": { tons: 5.20, confidence: 84 },
  "Rice Husk": { tons: 4.80, confidence: 82 },
  "Barley Straw": { tons: 3.50, confidence: 77 },
  "Oat Straw": { tons: 3.20, confidence: 76 },
  "Groundnut Shell": { tons: 2.20, confidence: 78 },
  "Cotton Stalk": { tons: 4.50, confidence: 80 },
  "Mustard Stalk": { tons: 3.00, confidence: 75 },
  "Soybean Stalk": { tons: 3.40, confidence: 79 },
  "Sunflower Stalk": { tons: 2.80, confidence: 74 },
  "Palm Empty Fruit Bunch": { tons: 6.00, confidence: 86 },
  "Coffee Husk": { tons: 1.80, confidence: 72 },
  "Tea Waste": { tons: 2.00, confidence: 73 },
  "Banana Waste": { tons: 4.00, confidence: 78 },
  "Mango Waste": { tons: 3.50, confidence: 76 },
  "Vegetable Waste": { tons: 3.80, confidence: 75 },
  "Fruit Waste": { tons: 3.20, confidence: 74 },
  "Jute Stalk": { tons: 4.20, confidence: 80 },
  "Castor Stalk": { tons: 2.60, confidence: 76 },
  "Sesame Stalk": { tons: 1.80, confidence: 72 },
  "Potato Vine": { tons: 3.50, confidence: 77 },
  "Tomato Waste": { tons: 2.80, confidence: 75 },
  "Gram / Chickpea Stalk": { tons: 2.90, confidence: 78 },
  "Tur / Pigeon Pea Stalk": { tons: 3.10, confidence: 77 },
  "Maize Cob": { tons: 4.00, confidence: 80 },
  "Oilseed Waste": { tons: 2.50, confidence: 74 },
  "Brewery Spent Grains": { tons: 2.00, confidence: 82 },
  "Sorghum Stalk": { tons: 3.80, confidence: 78 },
  "Rye Straw": { tons: 3.20, confidence: 76 },
  "Millet Straw": { tons: 2.90, confidence: 75 },
  "Lentil Stalk": { tons: 2.40, confidence: 77 },
  "Cowpea / Black-Eyed Pea Stalk": { tons: 2.60, confidence: 76 },
  "Bean Stalk": { tons: 2.80, confidence: 78 },
  "Rapeseed / Canola Stalk": { tons: 3.00, confidence: 76 },
  "Olive Pomace": { tons: 2.20, confidence: 80 },
  "Cocoa Pod Husk": { tons: 1.80, confidence: 74 },
  "Tobacco Stalk": { tons: 2.50, confidence: 75 },
  "Hemp Stalk": { tons: 3.40, confidence: 77 },
  "Cassava Peel / Residue": { tons: 4.00, confidence: 79 },
  "Citrus Waste": { tons: 3.20, confidence: 76 },
  "Grape Pomace": { tons: 2.00, confidence: 82 },
  "Almond Shell": { tons: 1.50, confidence: 78 },
  "Cashew Shell": { tons: 1.60, confidence: 77 },
  "Pea Stalk": { tons: 2.70, confidence: 78 },
  "Other Agricultural Waste": { tons: 3.00, confidence: 70 },
};

function resolveCropKeyFromLabel(label: string) {
  const lower = label.trim().toLowerCase();
  const entry = Object.values(CROP_WASTE_CONFIG).find(
    (c) => c.label.toLowerCase() === lower
  );
  return entry;
}

function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 0 6px",
        borderBottom: "1px solid rgba(134,195,94,0.12)",
        marginBottom: 16,
        marginTop: 24,
      }}
    >
      <IconBox icon={icon} size="sm" />
      <span
        style={{
          fontFamily: "'Syne', system-ui, sans-serif",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#15803d",
        }}
      >
        {title}
      </span>
    </div>
  );
}

function getForecastFallback(wasteType: string) {
  const key = Object.keys(FORECAST_BY_CROP).find((k) => k.toLowerCase() === wasteType.trim().toLowerCase());
  const entry = key ? FORECAST_BY_CROP[key] : { tons: 5.5, confidence: 85 };
  return { predictedNext30Days: entry.tons, confidenceLevel: "HIGH" as const, confidencePercent: entry.confidence, isDemo: true };
}

const StartupInput = () => {
  const API_BASE = ((import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || "").replace(/\/$/, "");
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [wasteType, setWasteType] = useState(CROP_TYPES_FOR_INPUT[0] ?? "Paddy Husk");
  const [quantity, setQuantity] = useState("5");
  const [location, setLocation] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [categories] = useState<string[]>(() => [...CROP_TYPES_FOR_INPUT]);
  const [priceResult, setPriceResult] = useState<{
    status: string;
    label: string;
    color: string;
    marketPrice: number | null;
    market_status?: string;
    source: string | null;
    lastUpdated: string | null;
    isDemoPrice?: boolean;
  } | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState(false);
  const [carbonResult, setCarbonResult] = useState<{ co2SavedTons: number; equivalentTrees: number; carbonCreditsEarned: number } | null>(null);
  const [carbonLoading, setCarbonLoading] = useState(false);
  const [forecast, setForecast] = useState<{ predictedNext30Days: number; confidenceLevel: string; confidencePercent?: number; isDemo?: boolean } | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [nearestHub, setNearestHub] = useState<string>("Chennai");
  const [showNegotiationArena, setShowNegotiationArena] = useState(false);
  const [dealBuyerName, setDealBuyerName] = useState("");
  const [dealNote, setDealNote] = useState("");
  const [farmerRating, setFarmerRating] = useState<number | null>(null);
  const [wasteQualityGrade, setWasteQualityGrade] = useState<string>("B");
  const [moisturePercentage, setMoisturePercentage] = useState<string>("12");
  const [showSatellite, setShowSatellite] = useState(false);
  const [showWeightEstimator, setShowWeightEstimator] = useState(false);
  const [quantityFromAi, setQuantityFromAi] = useState(false);
  const [showSaveBeforeModal, setShowSaveBeforeModal] = useState(false);
  const [showSaveAfterModal, setShowSaveAfterModal] = useState(false);
  const [savePosting, setSavePosting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [provisionForModal, setProvisionForModal] = useState<AgroSaveProvision | null>(null);
  const [saveEarnResult, setSaveEarnResult] = useState<{ creditsEarned: number; coinsEarned: number } | null>(null);
  const enableContinueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { earn } = useWallet();
  const wasteTypeRef = useRef(wasteType);
  wasteTypeRef.current = wasteType;

  const wasteTypeKey = wasteTypeLabelToKey(wasteType);
  const cityForLive = (location && location.trim()) || nearestHub;
  const quantityTonsNum = (() => { const q = parseFloat(quantity); return Number.isFinite(q) && q > 0 ? q : 1; })();
  const { data: livePriceData, loading: livePriceLoading, error: livePriceError } = useLivePrice(wasteTypeKey, cityForLive, quantityTonsNum);

  const userRole = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u?.role ?? "farmer";
    } catch {
      return "farmer";
    }
  })();
  const isStartup = userRole === "startup";

  /** Market status from price per kg (direct input): < 50 Below, 50–100 Current, > 100 Above */
  const priceNum = Number(pricePerKg);
  const hasValidPrice = !Number.isNaN(priceNum) && priceNum >= 0;
  const marketStatusFromInput = hasValidPrice
    ? priceNum < 50
      ? "Below Market Price"
      : priceNum > 100
        ? "Above Market Price"
        : "Current Market Price"
    : null;
  const marketStatusColor = marketStatusFromInput
    ? marketStatusFromInput === "Below Market Price"
      ? "blue"
      : marketStatusFromInput === "Above Market Price"
        ? "red"
        : "green"
    : null;

  useEffect(() => {
    return () => {
      if (enableContinueTimeoutRef.current) {
        clearTimeout(enableContinueTimeoutRef.current);
        enableContinueTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!wasteType.trim()) return;
    setRecsLoading(true);
    setRecsError(false);
    getRecommendations(wasteType)
      .then((r) => { setRecommendations(r.products || []); setRecsError(false); })
      .catch(() => { setRecommendations([]); setRecsError(true); })
      .finally(() => setRecsLoading(false));
  }, [wasteType]);

  useEffect(() => {
    if (!wasteType.trim()) return;
    const requestedWasteType = wasteType;
    setForecastLoading(true);
    setForecast(null);
    getForecastByWasteType(requestedWasteType)
      .then((r) => {
        if (wasteTypeRef.current !== requestedWasteType) return;
        const tons = r.predictedTonsNext30Days ?? r.predictedNext30Days ?? 0;
        const confidencePercent = (r as { confidencePercent?: number }).confidencePercent;
        setForecast({
          predictedNext30Days: tons,
          confidenceLevel: r.confidenceLevel ?? "LOW",
          confidencePercent,
          isDemo: (r as { isDemo?: boolean }).isDemo,
        });
      })
      .catch(() => {
        if (wasteTypeRef.current !== requestedWasteType) return;
        setForecast(getForecastFallback(requestedWasteType));
      })
      .finally(() => setForecastLoading(false));
  }, [wasteType]);

  const handleCheckPrice = async () => {
    const p = Number(pricePerKg);
    if (!wasteType.trim() || Number.isNaN(p) || p < 0) {
      toast({ title: "Enter waste type and price (₹/kg)", variant: "destructive" });
      return;
    }
    setPriceLoading(true);
    setPriceResult(null);
    try {
      const res = await evaluatePrice(wasteType, p, location || undefined, wasteQualityGrade || undefined);
      setPriceResult({
        status: res.status,
        label: res.label,
        color: res.color,
        marketPrice: res.marketPrice ?? null,
        market_status: (res as { market_status?: string }).market_status,
        source: res.source ?? null,
        lastUpdated: res.lastUpdated ?? null,
        isDemoPrice: res.isDemoPrice,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Price check failed";
      const description = msg.includes("fetch") || msg.includes("Failed to fetch")
        ? "Ensure the backend is running (port 5000) and try again."
        : msg;
      toast({ title: "Price check failed", description, variant: "destructive" });
      setPriceResult({
        status: "unknown",
        label: "Unable to check price. Ensure the backend is running (port 5000).",
        color: "gray",
        marketPrice: null,
        source: null,
        lastUpdated: null,
      });
    } finally {
      setPriceLoading(false);
    }
  };

  const handleCarbonSimulate = async () => {
    const q = Number(quantity);
    if (!wasteType.trim() || Number.isNaN(q) || q <= 0) {
      toast({ title: "Enter waste type and quantity", variant: "destructive" });
      return;
    }
    setCarbonLoading(true);
    setCarbonResult(null);
    try {
      const res = await simulateCarbon(wasteType, q);
      setCarbonResult({ co2SavedTons: res.co2SavedTons, equivalentTrees: res.equivalentTrees, carbonCreditsEarned: res.carbonCreditsEarned });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Carbon simulation failed";
      toast({ title: "Carbon simulation failed", description: msg.includes("fetch") ? "Ensure the backend is running (port 5000)." : msg, variant: "destructive" });
    } finally {
      setCarbonLoading(false);
    }
  };

  const handleSatelliteApply = (result: SatelliteResult) => {
    setWasteQualityGrade(result.grade);
    setMoisturePercentage(String(result.moisture));
    setLocation(result.location);
    if (result.nearestHub) setNearestHub(result.nearestHub);
    earn("SATELLITE_SCAN").catch(() => {});
  };

  const handleWeightApply = (tonnes: number) => {
    setQuantity(tonnes.toString());
  };
  const handleApplyWeightKg = (weightKg: number) => {
    const tons = (weightKg / 1000).toFixed(3);
    setQuantity(tons);
    toast({
      title: "Weight applied",
      description: `${weightKg.toLocaleString("en-IN")} kg (${tons} tons)`,
    });
    earn("WEIGHT_ESTIMATE").catch(() => {});
  };

  const { toast } = useToast();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStartup) {
      navigate("/dashboard");
      return;
    }
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast({ title: "Login required", description: "Please log in as a farmer to post.", variant: "destructive" });
      return;
    }

    const wasteTypeVal = String(wasteType || "").trim();
    const quantityVal = Number(quantity);
    const locationVal = String(location || "").trim();
    if (!wasteTypeVal) {
      toast({ title: "Required", description: "Please select a waste type.", variant: "destructive" });
      return;
    }
    if (Number.isNaN(quantityVal) || quantityVal <= 0) {
      toast({ title: "Required", description: "Please enter a quantity (tons) greater than 0.", variant: "destructive" });
      return;
    }
    if (!locationVal) {
      toast({ title: "Required", description: "Please enter your location.", variant: "destructive" });
      return;
    }

    const provision: AgroSaveProvision = {
      wasteType: wasteTypeLabelToKey(wasteTypeVal),
      wasteTypeLabel: wasteTypeVal,
      quantityTons: quantityVal,
      location: locationVal || "Chennai",
    };
    setProvisionForModal(provision);
    setShowSaveBeforeModal(true);
    setSavePosting(true);
    setSaveSuccess(false);

    if (enableContinueTimeoutRef.current) clearTimeout(enableContinueTimeoutRef.current);
    enableContinueTimeoutRef.current = setTimeout(() => {
      setSavePosting(false);
      setSaveSuccess(true);
      enableContinueTimeoutRef.current = null;
    }, 500);

    try {
      const body: Record<string, unknown> = {
        wasteType: wasteTypeVal,
        quantityTons: quantityVal,
        location: locationVal,
        ...(pricePerKg && !Number.isNaN(Number(pricePerKg)) && { price: Number(pricePerKg) }),
      };
      const q = wasteQualityGrade?.trim();
      const m = Number(moisturePercentage);
      if (q && ["A", "B", "C"].includes(q.toUpperCase())) body.wasteQualityGrade = q.toUpperCase();
      if (!Number.isNaN(m) && m >= 0 && m <= 100) body.moisturePercentage = m;

      const resp = await fetch(`${API_BASE}/api/provisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const message = (data as { message?: string }).message || "Failed to save";
        toast({ title: "Error saving provision", description: message, variant: "destructive" });
        setShowSaveBeforeModal(false);
        setSavePosting(false);
        if (enableContinueTimeoutRef.current) {
          clearTimeout(enableContinueTimeoutRef.current);
          enableContinueTimeoutRef.current = null;
        }
        return;
      }
      try {
        let equivalentTrees: number;
        if (carbonResult?.equivalentTrees != null) {
          equivalentTrees = carbonResult.equivalentTrees;
        } else {
          try {
            const carbon = await simulateCarbon(wasteTypeVal, quantityVal);
            equivalentTrees = carbon.equivalentTrees;
          } catch {
            equivalentTrees = Math.round(quantityVal * 1.4 * 50);
          }
        }
        const result = await earn("LIST_WASTE", {
          wasteType: wasteTypeVal,
          quantity: quantityVal,
          city: locationVal,
          equivalentTrees,
        });
        setSaveEarnResult({ creditsEarned: result.creditsEarned, coinsEarned: result.coinsEarned });
      } catch {
        setSaveEarnResult(null);
      }
      toast({ title: "Saved", description: "Provision recorded.", variant: "default" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      toast({ title: "Error saving provision", description: msg, variant: "destructive" });
      setShowSaveBeforeModal(false);
      setSavePosting(false);
      if (enableContinueTimeoutRef.current) {
        clearTimeout(enableContinueTimeoutRef.current);
        enableContinueTimeoutRef.current = null;
      }
    }
  };

  const handleSaveContinueToImpact = () => {
    setShowSaveBeforeModal(false);
    setShowSaveAfterModal(true);
  };

  const handleViewInventory = () => {
    setShowSaveAfterModal(false);
    setProvisionForModal(null);
    setSaveEarnResult(null);
    navigate("/farmer-inventory");
  };

  const handleShareImpact = () => {
    if (!provisionForModal) return;
    const co2 = (provisionForModal.quantityTons * 1.4).toFixed(1);
    const credits = saveEarnResult?.creditsEarned ?? Math.round(provisionForModal.quantityTons * 1.4 * 50);
    const text = [
      `I just saved ${provisionForModal.quantityTons}t of ${provisionForModal.wasteTypeLabel} from burning.`,
      `${co2}t CO2eq prevented · +${credits} AgroCredits · Location: ${provisionForModal.location}`,
    ].join("\n");
    navigator.clipboard.writeText(text).then(
      () => toast({ title: "Copied", description: "Impact summary copied to clipboard.", variant: "default" }),
      () => toast({ title: "Copy failed", description: "Could not copy to clipboard.", variant: "destructive" }),
    );
  };

  const goToInventory = () => navigate("/farmer-inventory");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
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
          <GlobalLanguageSelector />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {t("input_page_title")}
            </h1>
            <p className="text-muted-foreground">
              {t("input_waste_type_placeholder")}
            </p>
          </div>

          <Card className="p-6 md:p-8 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              <SectionHeader
                icon={<Package2 size={18} color="#16a34a" />}
                title="Waste Details"
              />
              <div className="space-y-2">
                <Label htmlFor="waste-type" className="text-base font-semibold flex items-center gap-2">
                  <Wheat size={14} color="#16a34a" />
                  <span>{t("input_waste_type_label")}</span>
                  <button
                    type="button"
                    onClick={() => openGuideWith("What crop waste types can I list and what are the differences?")}
                    className="w-[18px] h-[18px] rounded-full inline-flex items-center justify-center text-[9px] font-bold cursor-pointer transition-all duration-150 ml-1 border border-gray-300 text-gray-500 hover:bg-green-500/15 hover:text-green-600 hover:border-green-500/40"
                    title="Help"
                  >
                    ?
                  </button>
                </Label>
                <WasteTypeSearchSelect
                  id="waste-type"
                  value={wasteType}
                  onValueChange={setWasteType}
                  options={categories}
                  placeholder="Select waste type"
                  searchPlaceholder="Search waste type (e.g. rice, coconut, cotton)..."
                />
                <CropDetectButton onDetected={(cropType) => setWasteType(cropType)} />
                <p className="text-sm text-muted-foreground">
                  Paddy husk has high demand for industrial applications
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-base font-semibold flex items-center gap-2">
                  <Scale size={14} color="#16a34a" />
                  <span>{t("input_quantity_label")}</span>
                </Label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground">
                    <Weight size={16} color="#16a34a" />
                  </div>
                  <InputField
                    id="quantity"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(e.target.value);
                      setQuantityFromAi(false);
                    }}
                    className="h-12 text-lg pl-10"
                    placeholder="Enter quantity"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center gap-2">
                    {quantityFromAi && (
                      <span className="text-[10px] font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded">AI estimated</span>
                    )}
                    tons
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Average farm produces 3-8 tons of waste per season
                </p>
                <p className="text-xs text-muted-foreground">
                  Weight estimation uses your selected <strong>Waste Type</strong> above for density — select it first for accurate estimates.
                </p>
                <button
                  type="button"
                  onClick={() => setShowWeightEstimator(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-1 w-fit text-xs font-semibold rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-600 hover:border-green-500 text-gray-300 hover:text-green-400 transition-all duration-150"
                  title={`Estimate weight using selected waste type: ${wasteType}`}
                >
                  📷 Estimate Weight via Camera <span className="text-green-400/90">(uses {wasteType})</span>
                </button>
                <button
                  type="button"
                  onClick={() => openGuideWith("How does the AI weight estimator work step by step?")}
                  className="w-[18px] h-[18px] rounded-full inline-flex items-center justify-center text-[9px] font-bold cursor-pointer ml-1.5 border border-gray-300 text-gray-500 hover:bg-green-500/15 hover:text-green-600 hover:border-green-500/40"
                  title="Help"
                >
                  ?
                </button>
                <div id="forecastBox" className="mt-2.5 rounded-md bg-muted/50 p-3 text-sm">
                  {forecastLoading ? (
                    <p className="text-muted-foreground">Loading forecast…</p>
                  ) : forecast ? (
                    <>
                      <p className="font-medium">
                        <span className="inline-flex items-center gap-0.5">
                          <strong>Predicted Next 30 Days Supply:</strong>
                          <button
                            type="button"
                            onClick={() => navigate(`/forecast?${buildForecastParams(wasteType, location, quantity)}`)}
                            title="View Full Forecast"
                            className="inline-flex items-center justify-center p-1 rounded-md ml-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors duration-150"
                          >
                            <ExternalLink size={13} />
                          </button>
                        </span>
                        {" "}
                        <span id="forecastTons">{forecast.predictedNext30Days.toFixed(2)}</span> tons
                      </p>
                      <p className="text-muted-foreground mt-1">
                        <span className="inline-flex items-center gap-0.5">
                          <strong>Confidence:</strong>
                          <button
                            type="button"
                            onClick={() => navigate(`/forecast?${buildForecastParams(wasteType, location, quantity)}`)}
                            title="View Full Forecast"
                            className="inline-flex items-center justify-center p-1 rounded-md ml-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors duration-150"
                          >
                            <ExternalLink size={13} />
                          </button>
                        </span>
                        {" "}
                        <span id="forecastConfidence">
                          {forecast.confidencePercent != null ? `${forecast.confidencePercent}%` : forecast.confidenceLevel}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">
                        <span className="inline-flex items-center gap-0.5">
                          <strong>Predicted Next 30 Days Supply:</strong>
                          <button
                            type="button"
                            onClick={() => navigate(`/forecast?${buildForecastParams(wasteType, location, quantity)}`)}
                            title="View Full Forecast"
                            className="inline-flex items-center justify-center p-1 rounded-md ml-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors duration-150"
                          >
                            <ExternalLink size={13} />
                          </button>
                        </span>
                        {" "}
                        <span id="forecastTons" className="text-muted-foreground">—</span>
                        <span className="text-muted-foreground"> Select waste type above</span>
                      </p>
                      <p className="text-muted-foreground mt-1">
                        <span className="inline-flex items-center gap-0.5">
                          <strong>Confidence:</strong>
                          <button
                            type="button"
                            onClick={() => navigate(`/forecast?${buildForecastParams(wasteType, location, quantity)}`)}
                            title="View Full Forecast"
                            className="inline-flex items-center justify-center p-1 rounded-md ml-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors duration-150"
                          >
                            <ExternalLink size={13} />
                          </button>
                        </span>
                        {" "}
                        <span id="forecastConfidence" className="text-muted-foreground">—</span>
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <SectionHeader
                  icon={<BadgeIndianRupee size={18} color="#d4a843" />}
                  title="Pricing & Quality"
                />
                <Label htmlFor="price" className="text-base font-semibold flex items-center gap-2">
                  <IndianRupee size={14} color="#d4a843" />
                  <span>Price per kg (optional)</span>
                </Label>
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-2 items-stretch">
                    <div className="relative flex flex-1 items-center">
                      <span className="pointer-events-none absolute left-3 text-[#d4a843] font-medium">₹</span>
                      <InputField
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={pricePerKg}
                        onChange={(e) => { setPricePerKg(e.target.value); setPriceResult(null); }}
                        className="h-12 flex-1 pl-8 rounded-xl border-green-500/20 bg-background"
                        placeholder="e.g. 1.85"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => setShowNegotiationArena(true)}
                      disabled={!wasteType.trim()}
                      title={!wasteType.trim() ? "Select a waste type first" : "Negotiate price with AI"}
                      className="h-12 shrink-0 gap-2 rounded-xl font-semibold bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      💬 Negotiate Price with AI
                    </Button>
                    <button
                      type="button"
                      onClick={() => openGuideWith("How does the AI price negotiation work and how do I get the best price?")}
                      className="w-[18px] h-[18px] rounded-full inline-flex items-center justify-center text-[9px] font-bold cursor-pointer ml-1.5 border border-gray-300 text-gray-500 hover:bg-green-500/15 hover:text-green-600 hover:border-green-500/40"
                      title="Help"
                    >
                      ?
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs min-h-[1.5rem]" aria-live="polite">
                    {livePriceLoading && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                        Loading live price…
                      </span>
                    )}
                    {!livePriceLoading && livePriceError && (
                      <span className="text-muted-foreground">Live price unavailable</span>
                    )}
                    {!livePriceLoading && !livePriceError && livePriceData != null && typeof livePriceData.pricePerKg === 'number' && (
                      <>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          Live market price: ₹{Number(livePriceData.pricePerKg).toFixed(2)}/kg
                        </span>
                        <span className="text-muted-foreground">· DeepSeek + Tavily</span>
                      </>
                    )}
                    {!livePriceLoading && !livePriceError && (livePriceData == null || typeof livePriceData.pricePerKg !== 'number') && (
                      <span className="text-muted-foreground">Set TAVILY_API_KEY & DEEPSEEK_API_KEY for live rates</span>
                    )}
                  </div>
                </div>
                {(dealBuyerName || dealNote) && (
                  <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 space-y-1">
                    {dealBuyerName && <p className="text-sm text-muted-foreground">Buyer: {dealBuyerName}</p>}
                    {dealNote && <p className="text-xs text-muted-foreground">{dealNote}</p>}
                  </div>
                )}
                <div className="flex gap-2 mt-1">
                  <Button type="button" variant="secondary" size="sm" onClick={handleCheckPrice} disabled={priceLoading}>
                    {priceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Quick check price"}
                  </Button>
                </div>
                {hasValidPrice && marketStatusFromInput && (
                  <div className="space-y-1.5">
                    <p className="text-sm text-muted-foreground">
                      Price per kg: ₹{priceNum.toFixed(2)}
                    </p>
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                        marketStatusColor === "green" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                        marketStatusColor === "red" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      {marketStatusFromInput}
                    </span>
                  </div>
                )}
                {priceResult?.marketPrice != null && (
                  <p className="text-sm text-muted-foreground">
                    Reference market price: ₹{priceResult.marketPrice.toFixed(2)} per kg
                    {priceResult.isDemoPrice && <span className="ml-1 text-xs">(AI-generated estimate)</span>}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quality-grade" className="text-base font-semibold flex items-center gap-2">
                    <Star size={14} color="#d4a843" />
                    <span>Waste quality grade</span>
                    <button
                      type="button"
                      onClick={() => openGuideWith("How do I determine quality grade A, B, or C for my crop waste?")}
                      className="w-[18px] h-[18px] rounded-full inline-flex items-center justify-center text-[9px] font-bold cursor-pointer transition-all duration-150 ml-1 border border-gray-300 text-gray-500 hover:bg-green-500/15 hover:text-green-600 hover:border-green-500/40"
                      title="Help"
                    >
                      ?
                    </button>
                  </Label>
                  <Select value={wasteQualityGrade} onValueChange={setWasteQualityGrade}>
                    <SelectTrigger id="quality-grade" className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => setShowSatellite(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-1 w-fit text-xs font-semibold rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-600 hover:border-green-500 text-gray-300 hover:text-green-400 transition-all duration-150"
                  >
                    🛰️ Detect Now
                  </button>
                  <button
                    type="button"
                    onClick={() => openGuideWith("How does the satellite crop detection feature work?")}
                    className="w-[18px] h-[18px] rounded-full inline-flex items-center justify-center text-[9px] font-bold cursor-pointer ml-1.5 border border-gray-300 text-gray-500 hover:bg-green-500/15 hover:text-green-600 hover:border-green-500/40"
                    title="Help"
                  >
                    ?
                  </button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moisture" className="text-base font-semibold flex items-center gap-2">
                    <Droplets size={14} color="#0ea5e9" />
                    <span>Moisture %</span>
                    <button
                      type="button"
                      onClick={() => openGuideWith("What moisture percentage is ideal for selling crop waste?")}
                      className="w-[18px] h-[18px] rounded-full inline-flex items-center justify-center text-[9px] font-bold cursor-pointer transition-all duration-150 ml-1 border border-gray-300 text-gray-500 hover:bg-green-500/15 hover:text-green-600 hover:border-green-500/40"
                      title="Help"
                    >
                      ?
                    </button>
                  </Label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                      <Droplets size={16} color="#0ea5e9" />
                    </div>
                    <InputField
                      id="moisture"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={moisturePercentage}
                      onChange={(e) => setMoisturePercentage(e.target.value)}
                      className="h-12 pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <SectionHeader
                  icon={<Map size={18} color="#0ea5e9" />}
                  title="Location & Logistics"
                />
                <Label htmlFor="location" className="text-base font-semibold flex items-center gap-2">
                  <MapPin size={14} color="#0ea5e9" />
                  <span>Location</span>
                </Label>
                <div className="space-y-3">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <InputField
                      id="location"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="h-12 pl-11"
                      placeholder="Enter your location"
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-3">
                  <Label htmlFor="nearest-hub" className="text-base font-semibold flex items-center gap-2">
                    <Thermometer size={14} color="#0ea5e9" />
                    <span>Nearest Cold Storage Hub</span>
                  </Label>
                  <Select value={nearestHub} onValueChange={setNearestHub}>
                    <SelectTrigger id="nearest-hub" className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLD_STORAGE_HUBS.map((hub) => (
                        <SelectItem key={hub} value={hub}>
                          {hub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card className="p-4 bg-muted/30">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <SectionHeader
                      icon={<Leaf size={18} color="#16a34a" />}
                      title="Carbon & Impact"
                    />
                    <p className="font-medium flex items-center gap-2 mt-1">
                      <Flame className="h-4 w-4 text-emerald-600" />
                      <span>Carbon impact</span>
                      <a
                        href="/carbon"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View Carbon Simulator"
                        className="inline-flex items-center justify-center p-1 rounded-md ml-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors duration-150"
                      >
                        <ExternalLink size={13} />
                      </a>
                      <button
                        type="button"
                        onClick={() => openGuideWith("How is my carbon impact and tree equivalent calculated?")}
                        className="w-[18px] h-[18px] rounded-full inline-flex items-center justify-center text-[9px] font-bold cursor-pointer ml-1 border border-gray-300 text-gray-500 hover:bg-green-500/15 hover:text-green-600 hover:border-green-500/40"
                        title="Help"
                      >
                        ?
                      </button>
                    </p>
                    <p className="text-sm text-muted-foreground">Estimate CO₂ saved for your quantity</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleCarbonSimulate} disabled={carbonLoading}>
                    {carbonLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calculate"}
                  </Button>
                </div>
                {carbonResult && (
                  <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center text-sm">
                    <div><span className="font-semibold">{carbonResult.co2SavedTons}</span> t CO₂ saved</div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Leaf className="h-4 w-4 text-emerald-600" />
                        {carbonResult.equivalentTrees}
                      </span>
                      <span className="text-xs text-muted-foreground">trees equivalent · AgroCredits</span>
                      <button
                        type="button"
                        onClick={() => openGuideWith("How are AgroCredits calculated and how do I convert them to AgroCoins?")}
                        className="w-[18px] h-[18px] rounded-full inline-flex items-center justify-center text-[9px] font-bold cursor-pointer mt-0.5 border border-gray-300 text-gray-500 hover:bg-green-500/15 hover:text-green-600 hover:border-green-500/40"
                        title="Help"
                      >
                        ?
                      </button>
                    </div>
                    <div><span className="font-semibold">{carbonResult.carbonCreditsEarned}</span> credits</div>
                  </div>
                )}
              </Card>

              <Card className="p-4 bg-muted/30">
                <p className="font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-700" />
                  <span>Suggested products</span>
                  <a
                    href="/recommendations"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View All Recommendations"
                    className="inline-flex items-center justify-center p-1 rounded-md ml-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors duration-150"
                  >
                    <ExternalLink size={13} />
                  </a>
                </p>
                <p className="text-sm text-muted-foreground mb-2">What this waste can be converted into</p>
                {recsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : recommendations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {recommendations.map((p, i) => (
                      <span key={i} className="rounded-full bg-primary/10 px-3 py-1 text-sm">{p}</span>
                    ))}
                  </div>
                ) : recsError ? (
                  <p className="text-sm text-destructive">Couldn&apos;t load suggestions. Ensure the backend is running (port 5000).</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a waste type above</p>
                )}
              </Card>

              {farmerRating != null && (
                <div className="rounded-lg border bg-muted/30 p-3 text-center space-y-2">
                  <p className="text-sm font-medium">⭐ Farmer Rating: {farmerRating.toFixed(1)} / 5</p>
                  <Button type="button" variant="outline" size="sm" onClick={goToInventory}>Go to my inventory</Button>
                </div>
              )}

              <div className="pt-4">
                {isStartup ? (
                  <Button
                    type="button"
                    variant="cta"
                    size="lg"
                    className="w-full text-lg"
                    onClick={() => navigate("/dashboard")}
                  >
                    <Package className="mr-2 h-5 w-5" />
                    View Farmer Provisions
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="cta"
                    size="lg"
                    className="w-full text-lg"
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Save &amp; Sync to Network 🚀
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>
      </div>
      <Dialog open={showWeightEstimator} onOpenChange={setShowWeightEstimator}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <WeightEstimator
            wasteTypeLabel={wasteType}
            onEstimateConfirmed={(weightKg) => {
              setQuantity((weightKg / 1000).toFixed(3));
              setQuantityFromAi(true);
              setShowWeightEstimator(false);
            }}
            onClose={() => setShowWeightEstimator(false)}
            onCropDetected={(label) => setWasteType(label)}
          />
        </DialogContent>
      </Dialog>
      {showSatellite && (
        <SatelliteDetectModal
          onApply={handleSatelliteApply}
          onClose={() => setShowSatellite(false)}
        />
      )}
      {showNegotiationArena && (
        <NegotiationArena
          wasteType={wasteType}
          quantityTons={parseFloat(quantity) || 1}
          city={location || "Chennai"}
          farmerPricePerKg={priceNum > 0 ? priceNum : null}
          onApplyDeal={({ agreedPrice, buyerName, note }) => {
            setPricePerKg(agreedPrice.toFixed(2));
            setDealBuyerName(buyerName);
            setDealNote(note);
            setShowNegotiationArena(false);
            toast({ title: "Deal applied to your listing", description: `₹${agreedPrice.toFixed(2)}/kg · ${buyerName}`, variant: "default" });
            earn("NEGOTIATE_SUCCESS", { price: agreedPrice }).catch(() => {});
          }}
          onClose={() => setShowNegotiationArena(false)}
        />
      )}
      {showSaveBeforeModal && provisionForModal && (
        <AgroSaveBeforeModal
          provision={provisionForModal}
          isPosting={savePosting}
          canContinue={saveSuccess}
          onContinue={handleSaveContinueToImpact}
        />
      )}
      {showSaveAfterModal && provisionForModal && (
        <AgroSaveAfterModal
          provision={provisionForModal}
          pricePerKg={priceNum > 0 ? priceNum : null}
          creditsEarned={saveEarnResult?.creditsEarned ?? null}
          coinsEarned={saveEarnResult?.coinsEarned ?? null}
          onViewInventory={handleViewInventory}
          onShare={handleShareImpact}
        />
      )}
    </div>
  );
};

export default StartupInput;
