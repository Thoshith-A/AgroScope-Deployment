import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/context/TranslationContext";
import GlobalLanguageSelector from "@/components/GlobalLanguageSelector";
import {
  ArrowLeft,
  Leaf,
  TrendingUp,
  Loader2,
  MapPin,
  Wheat,
  ChevronDown,
  Check,
  BarChart3,
} from "lucide-react";
import { getForecastNext30Days } from "@/lib/api";
import { useWallet } from "@/context/WalletContext";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

const AVAILABLE_CITIES = [
  { name: "Chennai", state: "Tamil Nadu", hub: "Chennai Port Cold Chain Facility" },
  { name: "Mumbai", state: "Maharashtra", hub: "Mumbai APMC Vashi Cold Hub" },
  { name: "Delhi", state: "Delhi NCR", hub: "Delhi Azadpur Cold Chain Terminal" },
  { name: "Bengaluru", state: "Karnataka", hub: "Bengaluru APMC Yeshwanthpur Cold Hub" },
  { name: "Hyderabad", state: "Telangana", hub: "Hyderabad Bowenpally Cold Chain" },
  { name: "Kolkata", state: "West Bengal", hub: "Kolkata Hooghly Cold Chain Terminal" },
  { name: "Pune", state: "Maharashtra", hub: "Pune Agri Logistics Cold Hub" },
  { name: "Ahmedabad", state: "Gujarat", hub: "Ahmedabad Sabarmati Agri Cold Chain" },
  { name: "Jaipur", state: "Rajasthan", hub: "Jaipur Muhana Mandi Cold Storage" },
  { name: "Surat", state: "Gujarat", hub: "Surat Diamond & Agri Cold Hub" },
] as const;

const CROPS = [
  { key: "paddy_husk", label: "Paddy Husk", icon: "🌾", color: "#22c55e" },
  { key: "wheat_straw", label: "Wheat Straw", icon: "🌿", color: "#d4a843" },
  { key: "corn_stalks", label: "Corn Stalks", icon: "🌽", color: "#fb923c" },
  { key: "sugarcane_bagasse", label: "Sugarcane Bagasse", icon: "🎋", color: "#86c35e" },
  { key: "coconut_shells", label: "Coconut Shells", icon: "🥥", color: "#7dd3fc" },
] as const;

type CropKey = (typeof CROPS)[number]["key"];

export default function Forecast() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { earn } = useWallet();
  const [searchParams] = useSearchParams();
  const cityParam = searchParams.get("city") || "Chennai";
  const wasteTypeParam = searchParams.get("wasteType") || "paddy_husk";

  const [selectedCity, setSelectedCity] = useState<typeof AVAILABLE_CITIES[number]>(() => {
    const found = AVAILABLE_CITIES.find((c) => c.name === cityParam);
    return found ?? AVAILABLE_CITIES[0];
  });
  const [selectedCrop, setSelectedCrop] = useState<CropKey>(() => {
    const valid = CROPS.some((c) => c.key === wasteTypeParam);
    return (valid ? wasteTypeParam : "paddy_husk") as CropKey;
  });
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [cropDropdownOpen, setCropDropdownOpen] = useState(false);
  const cityDropdownRef = useRef<HTMLDivElement | null>(null);
  const cropDropdownRef = useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof getForecastNext30Days>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialParamsSynced = useRef(false);

  const city = selectedCity.name;
  const wasteType = selectedCrop;

  useEffect(() => {
    if (!initialParamsSynced.current) {
      initialParamsSynced.current = true;
      const c = AVAILABLE_CITIES.find((x) => x.name === cityParam);
      if (c) setSelectedCity(c);
      if (CROPS.some((x) => x.key === wasteTypeParam)) setSelectedCrop(wasteTypeParam as CropKey);
    }
  }, [cityParam, wasteTypeParam]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getForecastNext30Days({ city, wasteType })
      .then((res) => {
        setData(res);
        const today = new Date().toDateString();
        if (sessionStorage.getItem("forecast_earned_today") !== today) {
          earn("FORECAST_VIEW").then(() => sessionStorage.setItem("forecast_earned_today", today)).catch(() => {});
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load forecast");
        setData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [city, wasteType]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) setCityDropdownOpen(false);
      if (cropDropdownRef.current && !cropDropdownRef.current.contains(e.target as Node)) setCropDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedCropMeta = CROPS.find((c) => c.key === selectedCrop) ?? CROPS[0];
  const trendUpper = (data?.trend ?? "stable").toUpperCase();
  const trendColor =
    trendUpper === "RISING" ? "#22c55e" : trendUpper === "FALLING" ? "#f97373" : trendUpper === "VOLATILE" ? "#f59e0b" : "#93c5fd";
  const cropAccentColor = selectedCropMeta.color;

  const chartData = (data?.dailyBreakdown ?? []).map((d) => ({
    day: `Day ${d.day}`,
    date: `Day ${d.day}`,
    predicted: d.predictedKg,
    upper: d.upperBound ?? d.predictedKg * 1.1,
    lower: d.lowerBound ?? d.predictedKg * 0.9,
  }));

  const confidencePercent =
    data?.confidenceLevel != null
      ? typeof data.confidenceLevel === "number" && data.confidenceLevel <= 1
        ? Math.round(data.confidenceLevel * 100)
        : Math.round(Number(data.confidenceLevel) || 0)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-card/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 max-w-5xl">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <button onClick={() => navigate("/home")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="bg-primary rounded-full p-2 shadow-sm">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold tracking-wide">AgroScope</span>
            </button>
          </div>
          <GlobalLanguageSelector />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-1 text-[10px] font-medium text-emerald-700 shadow-sm">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="tracking-[0.18em] uppercase">Forecast engine · Active</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            {t("forecast_title")}
          </h1>
          <p className="text-sm md:text-[15px] text-muted-foreground max-w-xl">
            {t("forecast_subtitle")}
          </p>
        </div>

        {/* City + Crop selectors */}
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] uppercase text-emerald-800">
              <MapPin className="h-4 w-4 text-emerald-500" />
              Forecast city
            </p>
            <div ref={cityDropdownRef} className="relative">
              <div
                onClick={() => setCityDropdownOpen((prev) => !prev)}
                className="cursor-pointer select-none rounded-xl border border-emerald-100 bg-card px-4 py-3 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[18px] font-semibold text-foreground">{selectedCity.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{selectedCity.hub}</div>
                  </div>
                  <ChevronDown size={16} className={`text-emerald-600 transition-transform duration-200 ${cityDropdownOpen ? "rotate-180" : ""}`} />
                </div>
              </div>
              <AnimatePresence>
                {cityDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute top-full left-0 right-0 mt-2 z-50 overflow-hidden rounded-xl border border-emerald-100 bg-card shadow-lg"
                  >
                    {AVAILABLE_CITIES.map((c) => (
                      <div
                        key={c.name}
                        onClick={() => {
                          setSelectedCity(c);
                          setCityDropdownOpen(false);
                        }}
                        className={`flex items-center justify-between px-4 py-2.5 cursor-pointer border-l-4 transition-colors ${
                          selectedCity.name === c.name ? "bg-emerald-500/10 dark:bg-emerald-500/20" : "bg-card hover:bg-muted/50"
                        }`}
                        style={{
                          borderColor: selectedCity.name === c.name ? "#22c55e" : "transparent",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {selectedCity.name === c.name ? <Check size={14} className="text-emerald-500" /> : <span className="w-[14px]" />}
                          <span className="text-sm font-medium text-foreground">{c.name}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">{c.state}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] uppercase text-emerald-800">
              <Wheat className="h-4 w-4 text-emerald-500" />
              Crop residue
            </p>
            <div ref={cropDropdownRef} className="relative">
              <div
                onClick={() => setCropDropdownOpen((prev) => !prev)}
                className="cursor-pointer select-none rounded-xl border border-emerald-100 bg-card px-4 py-3 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[18px] font-semibold text-foreground flex items-center gap-1.5">
                      <span>{selectedCropMeta.icon}</span>
                      <span>{selectedCropMeta.label}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{data?.wasteTypeLabel ?? selectedCropMeta.label}</div>
                  </div>
                  <ChevronDown size={16} className={`text-emerald-600 transition-transform duration-200 ${cropDropdownOpen ? "rotate-180" : ""}`} />
                </div>
              </div>
              <AnimatePresence>
                {cropDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute top-full left-0 right-0 mt-2 z-50 overflow-hidden rounded-xl border border-emerald-100 bg-card shadow-lg"
                  >
                    {CROPS.map((crop) => (
                      <div
                        key={crop.key}
                        onClick={() => {
                          setSelectedCrop(crop.key);
                          setCropDropdownOpen(false);
                        }}
                        className={`flex items-center justify-between px-4 py-2.5 cursor-pointer border-l-4 transition-colors ${
                          selectedCrop === crop.key ? "bg-emerald-500/10 dark:bg-emerald-500/20" : "bg-card hover:bg-muted/50"
                        }`}
                        style={{
                          borderColor: selectedCrop === crop.key ? "#22c55e" : "transparent",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {selectedCrop === crop.key ? <Check size={14} className="text-emerald-500" /> : <span className="w-[14px]" />}
                          <span className="text-base">{crop.icon}</span>
                          <span className="text-sm font-medium text-foreground">{crop.label}</span>
                        </div>
                        <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: crop.color }} />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="my-6 h-px bg-gradient-to-r from-transparent via-emerald-200 to-transparent" />

        {loading && (
          <Card className="p-8 md:p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
              <p className="text-sm text-muted-foreground">Loading forecast…</p>
            </div>
          </Card>
        )}

        {error && !loading && (
          <Card className="p-6 border-destructive bg-red-50/80">
            <p className="text-destructive">{error}</p>
            <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </Card>
        )}

        {!loading && !error && data && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-4 md:grid-cols-3 mb-8"
            >
              <Card className="border border-emerald-100/70 bg-card shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-[11px] tracking-[0.16em] uppercase text-emerald-700">
                    Predicted (30 days)
                  </CardDescription>
                  <CardTitle className="mt-1 text-[26px] font-semibold text-emerald-700">
                    {(data.predictedQuantityKg ?? 0).toLocaleString("en-IN")}{" "}
                    <span className="text-sm text-muted-foreground font-normal">kg</span>
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="border border-amber-100 bg-card shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-[11px] tracking-[0.16em] uppercase text-amber-700">
                    Confidence
                  </CardDescription>
                  <CardTitle className="mt-1 text-[26px] font-semibold text-amber-700">
                    {confidencePercent}
                    <span className="text-sm text-muted-foreground font-normal ml-1">%</span>
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="border border-slate-200 bg-card shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-[11px] tracking-[0.16em] uppercase text-slate-600">
                    Trend
                  </CardDescription>
                  <CardTitle className="mt-1 flex items-center gap-2 text-[22px] font-semibold" style={{ color: trendColor }}>
                    <TrendingUp className="h-5 w-5" />
                    {trendUpper}
                  </CardTitle>
                </CardHeader>
              </Card>
            </motion.div>

            {chartData.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100">
                        <BarChart3 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <CardTitle className="text-base font-semibold">Daily supply trend</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      {selectedCropMeta.icon} {selectedCropMeta.label} · {selectedCity.hub} · 30-day window
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="cropGradientF" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={cropAccentColor} stopOpacity={0.35} />
                              <stop offset="95%" stopColor={cropAccentColor} stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="bandGradientF" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#86c35e" stopOpacity={0.12} />
                              <stop offset="100%" stopColor="#86c35e" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            tickLine={false}
                            axisLine={{ stroke: "rgba(148,163,184,0.55)" }}
                            interval={4}
                          />
                          <YAxis
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
                            width={40}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "white",
                              border: "1px solid rgba(148,163,184,0.4)",
                              borderRadius: 12,
                              boxShadow: "0 10px 30px rgba(15,23,42,0.16)",
                              padding: "10px 12px",
                            }}
                            formatter={(value: number, name: string) => [
                              `${Number(value).toLocaleString("en-IN")} kg`,
                              name === "predicted" ? "Forecast" : name === "upper" ? "Upper bound" : "Lower bound",
                            ]}
                            labelStyle={{ color: "#0f172a", fontWeight: 500, marginBottom: 4, fontSize: 12 }}
                            itemStyle={{ color: "#0f172a", fontSize: 12 }}
                            cursor={{ stroke: "rgba(148,163,184,0.6)", strokeWidth: 1, strokeDasharray: "4 4" }}
                          />
                          <Area type="monotone" dataKey="upper" stroke="none" fill="url(#bandGradientF)" fillOpacity={1} />
                          <Area
                            type="monotone"
                            dataKey="predicted"
                            stroke={cropAccentColor}
                            strokeWidth={2.2}
                            fill="url(#cropGradientF)"
                            fillOpacity={1}
                            dot={false}
                            activeDot={{ r: 5, fill: cropAccentColor, stroke: "#fff", strokeWidth: 2 }}
                          />
                          <Area type="monotone" dataKey="lower" stroke="none" fill="url(#bandGradientF)" fillOpacity={0.4} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="h-[3px] w-6 rounded-sm" style={{ backgroundColor: cropAccentColor }} />
                          <span>Predicted supply</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-[8px] w-6 rounded-sm bg-emerald-200/70 border border-emerald-300/80" />
                          <span>Confidence range</span>
                        </div>
                      </div>
                      <span>
                        Forecast generated ·{" "}
                        {new Date().toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {(!data.dailyBreakdown || data.dailyBreakdown.length === 0) && (
              <Card className="p-6 mt-4">
                <p className="text-muted-foreground">
                  {data.message ?? "Insufficient data for chart. Add provisions and orders to see trends."}
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
