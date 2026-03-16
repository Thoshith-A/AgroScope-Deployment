import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Area,
  Bar,
  BarChart,
  AreaChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getWeatherForecast,
  getGeocodeSuggestions,
  type WeatherDay,
  type WeatherForecastResponse,
  type GeocodeResult,
} from "@/lib/weatherApi";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/context/TranslationContext";
import { getSpeechLangCode } from "@/lib/languages";

const CROPS: Record<string, string> = {
  paddy_husk: "Paddy Husk",
  wheat_straw: "Wheat Straw",
  corn_stalks: "Corn Stalks",
  sugarcane_bagasse: "Sugarcane Bagasse",
  coconut_shells: "Coconut Shells",
};

const WEATHER_EMOJI: Record<number, string> = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  53: "🌦️",
  55: "🌧️",
  61: "🌧️",
  63: "🌧️",
  65: "🌧️",
  71: "❄️",
  73: "❄️",
  75: "❄️",
  80: "🌦️",
  81: "🌧️",
  82: "⛈️",
  95: "⛈️",
  96: "⛈️",
  99: "⛈️",
};

function getWeatherEmoji(code: number): string {
  return (
    WEATHER_EMOJI[code] ??
    (code >= 80 ? "🌧️" : code >= 50 ? "🌦️" : "⛅")
  );
}

function getSuitability(day: WeatherDay): "Good" | "Moderate" | "Poor" {
  if (day.rainfall > 55 || day.tempMax > 40 || day.humidity > 88) return "Poor";
  if (
    day.rainfall >= 3 &&
    day.rainfall <= 25 &&
    day.tempMax >= 22 &&
    day.tempMax <= 36 &&
    day.humidity >= 45 &&
    day.humidity <= 78
  )
    return "Good";
  return "Moderate";
}

interface Advisory {
  icon: string;
  title: string;
  detail: string;
  severity: "good" | "warning" | "danger";
}

function generateFarmerAdvisories(
  days: WeatherDay[],
  cropKey: string,
  locale: string = "en"
): Advisory[] {
  const cropLabel = CROPS[cropKey] || cropKey;
  const advisories: Advisory[] = [];

  let bestRun = { start: 0, length: 0 };
  let currentRun = { start: 0, length: 0 };
  days.forEach((d, i) => {
    if (d.rainfall < 8 && d.humidity < 75 && d.tempMax < 37) {
      if (currentRun.length === 0) currentRun.start = i;
      currentRun.length++;
      if (currentRun.length > bestRun.length) bestRun = { ...currentRun };
    } else {
      currentRun = { start: 0, length: 0 };
    }
  });
  if (bestRun.length >= 2) {
    const start = new Date(days[bestRun.start].date).toLocaleDateString(
      locale,
      { day: "numeric", month: "short" }
    );
    const end = new Date(
      days[bestRun.start + bestRun.length - 1].date
    ).toLocaleDateString(locale, { day: "numeric", month: "short" });
    advisories.push({
      icon: "🌾",
      severity: "good",
      title: `Best Harvest Window: ${start} – ${end}`,
      detail: `${bestRun.length} consecutive days with low rainfall and moderate humidity. Ideal for cutting, threshing and field drying ${cropLabel}.`,
    });
  }

  let bestDispatch = { start: 0, total: Infinity };
  for (let i = 0; i <= days.length - 5; i++) {
    const total = days
      .slice(i, i + 5)
      .reduce((s, d) => s + d.rainfall, 0);
    if (total < bestDispatch.total)
      bestDispatch = { start: i, total: Math.round(total * 10) / 10 };
  }
  if (bestDispatch.total < 30) {
    const start = new Date(days[bestDispatch.start].date).toLocaleDateString(
      locale,
      { day: "numeric", month: "short" }
    );
    const end = new Date(
      days[bestDispatch.start + 4].date
    ).toLocaleDateString(locale, { day: "numeric", month: "short" });
    advisories.push({
      icon: "🚛",
      severity: "good",
      title: `Best Dispatch Window: ${start} – ${end}`,
      detail: `Only ${bestDispatch.total}mm rainfall expected across 5 days. Road and transport conditions are favourable for bulk movement of ${cropLabel}.`,
    });
  }

  let humidRun: number[] = [];
  for (let i = 0; i < days.length; i++) {
    if (days[i].humidity > 80) {
      humidRun.push(i);
      if (humidRun.length >= 3) {
        const start = new Date(
          days[humidRun[0]].date
        ).toLocaleDateString(locale, { day: "numeric", month: "short" });
        const end = new Date(
          days[humidRun[humidRun.length - 1]].date
        ).toLocaleDateString(locale, { day: "numeric", month: "short" });
        advisories.push({
          icon: "💧",
          severity: "warning",
          title: `Avoid Open-Air Drying: ${start} – ${end}`,
          detail: `Humidity stays above 80% for ${humidRun.length} days. Stored ${cropLabel} may develop mould. Use covered or cold storage.`,
        });
        break;
      }
    } else {
      humidRun = [];
    }
  }

  const hotDays = days.filter((d) => d.tempMax > 38);
  if (hotDays.length > 0) {
    const firstHot = new Date(hotDays[0].date).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    });
    advisories.push({
      icon: "🔥",
      severity: "warning",
      title: `Heat Stress Alert: ${hotDays.length} days above 38°C`,
      detail: `First occurrence on ${firstHot}. Move ${cropLabel} to shaded or cold storage. Avoid outdoor stacking during peak afternoon heat on these days.`,
    });
  }

  const next10 = days.slice(0, 10);
  for (let i = 0; i <= next10.length - 3; i++) {
    const window = next10.slice(i, i + 3);
    const total = window.reduce((s, d) => s + d.rainfall, 0);
    if (total > 40) {
      const date = new Date(window[0].date).toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
      });
      advisories.push({
        icon: "⛈️",
        severity: "danger",
        title: `Heavy Rain Alert: ${Math.round(total)}mm over 3 days from ${date}`,
        detail: `Complete outdoor collection and cover all stockpiles before ${date}. Delay open threshing and field drying until this passes.`,
      });
      break;
    }
  }

  return advisories;
}

type TooltipPayloadItem = { payload?: WeatherDay; value?: number; name?: string };
function ChartTooltip(
  props: {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string;
    unit?: string;
    valueKey?: string;
    dateFormatter?: (val: string) => string;
  }) {
  const { active, payload, label, unit = "", valueKey = "tempMax", dateFormatter } = props;
  const formatDate = dateFormatter ?? ((v: string) => new Date(v).toLocaleDateString("en", { day: "numeric", month: "short" }));
  if (!active || !payload?.length || !label) return null;
  const p = (payload[0] as TooltipPayloadItem)?.payload;
  if (!p) return null;
  const value =
    valueKey === "tempMax"
      ? `${p.tempMax}°C`
      : valueKey === "tempMin"
        ? `${p.tempMin}°C`
        : valueKey === "rainfall"
          ? `${p.rainfall}mm`
          : `${p.humidity}%`;
  const suitability = getSuitability(p);
  return (
    <div className="rounded-xl border border-green-500/20 bg-[#0d1f14] p-3 shadow-xl">
      <p className="text-sm font-medium text-white/90">
        {formatDate(label)}
      </p>
      <p className="mt-0.5 text-sm text-white">
        {value} {unit}
      </p>
      <span
        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
          suitability === "Good"
            ? "bg-green-500/20 text-green-300"
            : suitability === "Moderate"
              ? "bg-amber-500/20 text-amber-300"
              : "bg-red-500/20 text-red-300"
        }`}
      >
        {suitability}
      </span>
    </div>
  );
}

function getDayTip(day: WeatherDay): string {
  const s = getSuitability(day);
  if (s === "Poor") {
    if (day.rainfall > 30)
      return "Avoid field work and keep stockpiles covered. Plan indoor storage.";
    if (day.tempMax > 38)
      return "Shift work to early morning or evening. Keep material in shade.";
    if (day.humidity > 88)
      return "High moisture risk. Use covered drying or delay handling.";
  }
  if (s === "Good")
    return "Good day for harvesting, drying and light transport. Use this window.";
  return "Moderate conditions. Prefer morning for field work and cover stock if rain is likely.";
}

export default function WeatherForecast() {
  const navigate = useNavigate();
  const { currentLanguage } = useTranslation();
  const locale = getSpeechLangCode(currentLanguage?.code ?? "en");
  const [searchQuery, setSearchQuery] = useState("");
  const [resolvedPlaceLabel, setResolvedPlaceLabel] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<GeocodeResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState("paddy_husk");
  const [forecastData, setForecastData] =
    useState<WeatherForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [activeChart, setActiveChart] = useState<
    "temperature" | "rainfall" | "humidity"
  >("temperature");
  const searchRef = useRef<HTMLDivElement>(null);

  const days = forecastData?.forecast ?? [];
  const cropLabel = CROPS[selectedCrop] ?? selectedCrop;

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      const results = await getGeocodeSuggestions(
        searchQuery.trim(),
        currentLanguage?.code ?? "en"
      );
      setSearchSuggestions(results);
      setShowSuggestions(true);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, currentLanguage?.code]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchForecast = useCallback(async () => {
    const placeToUse = searchQuery.trim();
    if (placeToUse.length < 2) {
      setError("Enter a city or place (at least 2 characters) to get forecast.");
      return;
    }
    setLoading(true);
    setError(null);
    setShowSuggestions(false);
    try {
      const geocoded = await getGeocodeSuggestions(
        placeToUse,
        currentLanguage?.code ?? "en"
      );
      const bestMatch = geocoded[0];
      if (!bestMatch) {
        setForecastData(null);
        setResolvedPlaceLabel("");
        setError("Location not found. Try a nearby city, region, or country name.");
        return;
      }
      const placeLabel = bestMatch.country
        ? `${bestMatch.name}, ${bestMatch.country}`
        : bestMatch.name;
      const data = await getWeatherForecast({
        lat: bestMatch.latitude,
        lon: bestMatch.longitude,
        wasteType: selectedCrop,
        lang: currentLanguage?.code ?? "en",
      });
      setResolvedPlaceLabel(placeLabel);
      setForecastData({ ...data, city: placeLabel });
      setSelectedDayIndex(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load forecast");
    } finally {
      setLoading(false);
    }
  }, [selectedCrop, searchQuery, currentLanguage?.code]);

  const hasData = days.length > 0;
  const extrapolatedBoundaryIndex = days.findIndex((d) => d.extrapolated);
  const chartData = days.map((d) => ({
    ...d,
    date: d.date,
    suitability: getSuitability(d),
  }));

  const avgTemp = hasData
    ? Math.round(days.reduce((s, d) => s + d.tempMax, 0) / days.length)
    : 0;
  const totalRain = hasData
    ? Math.round(days.reduce((s, d) => s + d.rainfall, 0))
    : 0;
  const goodDays = hasData
    ? days.filter((d) => getSuitability(d) === "Good").length
    : 0;
  const heavyRainDays = hasData
    ? days.filter((d) => d.rainfall > 30).length
    : 0;
  const bestWindowStart = hasData
    ? days.find((d) => getSuitability(d) === "Good")?.date
    : null;
  const chartDateFormatter = useCallback(
    (val: string) =>
      new Date(val).toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
      }),
    [locale]
  );
  const advisories = generateFarmerAdvisories(days, selectedCrop, locale);
  const topAdvisoryTitle =
    advisories.length > 0 ? advisories[0].title : "No urgent risk";

  return (
    <div className="min-h-screen bg-[#050d08] text-white">
      <header
        className="w-full border-b border-green-500/10 px-6 py-10"
        style={{
          background:
            "radial-gradient(ellipse at 60% 0%, #0d3320 0%, #060f08 70%)",
        }}
      >
        <div className="mx-auto max-w-7xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4 -ml-2 text-white/70 hover:bg-green-500/20 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="mx-auto mt-2 flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-green-400/60">
              🌦️ WEATHER INTELLIGENCE
            </p>
            <h1 className="font-syne text-4xl font-bold text-white">
              30-Day Agricultural Forecast
            </h1>
            <p className="mt-2 text-sm text-white/40">
              Real weather data · Farmer-first insights · Zero guesswork
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div ref={searchRef} className="relative w-full min-w-[200px] md:w-56">
              <Input
                type="text"
                placeholder="Search city or place worldwide..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
                className="h-11 border-green-500/30 bg-[#0d1a10] text-white placeholder:text-white/40"
              />
              {showSuggestions && searchSuggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-green-500/30 bg-[#0d1a10] py-1 shadow-xl">
                  {searchSuggestions.map((r) => (
                    <li
                      key={`${r.id}-${r.latitude}-${r.longitude}`}
                      className="cursor-pointer px-3 py-2 text-sm text-white hover:bg-green-500/20"
                      onClick={() => {
                        setSearchQuery(r.country ? `${r.name}, ${r.country}` : r.name);
                        setShowSuggestions(false);
                      }}
                    >
                      {r.name}
                      {r.country ? `, ${r.country}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Select
              value={selectedCrop}
              onValueChange={(v) => setSelectedCrop(v)}
            >
              <SelectTrigger className="notranslate h-11 w-40 border-green-500/30 bg-[#0d1a10] text-white md:w-44">
                <SelectValue placeholder="Crop" />
              </SelectTrigger>
              <SelectContent className="notranslate">
                {Object.entries(CROPS).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="notranslate">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={fetchForecast}
              disabled={loading}
              className="bg-primary px-6 py-2.5 font-semibold text-white shadow-lg shadow-green-500/25 transition-all duration-200 hover:scale-[1.02] rounded-xl"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </span>
              ) : (
                "Get Forecast"
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {!loading && !hasData && !error && (
          <div className="rounded-2xl border border-green-500/10 bg-[#0a1a0f] p-12 text-center">
            <span className="text-6xl">🌾</span>
            <p className="mt-4 text-lg text-white/60">
              Search any place and select crop to get your weather forecast
            </p>
            <p className="mt-2 text-sm text-white/30">
              Real 30-day forecast · Farmer-first advisories · No account
              needed
            </p>
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-green-500/20 bg-[#0a1a0f] p-16 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-sm text-white/50">
              Fetching weather intelligence for {resolvedPlaceLabel || searchQuery.trim() || "your location"}...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-400" />
            <p className="mt-3 font-semibold text-amber-300">
              Unable to load forecast
            </p>
            <p className="mt-1 text-sm text-amber-400/60">
              {error}
            </p>
            <Button
              onClick={fetchForecast}
              className="mt-4 bg-amber-600 text-white hover:bg-amber-500"
            >
              Retry
            </Button>
          </div>
        )}

        {!loading && hasData && (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                {
                  icon: "🌡️",
                  value: `${avgTemp}°C`,
                  label: "Avg High Temperature",
                  sub: `Optimal for ${cropLabel}: 22–36°C`,
                  mono: true,
                },
                {
                  icon: "🌧️",
                  value: `${totalRain}mm`,
                  label: "Total Expected Rainfall",
                  sub: `Heavy rain days: ${heavyRainDays}`,
                  mono: true,
                },
                {
                  icon: "✅",
                  value: `${goodDays}/30`,
                  label: "Good Farming Days",
                  sub: `Best window from ${
                    bestWindowStart
                      ? new Date(bestWindowStart).toLocaleDateString(locale, {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"
                  }`,
                  mono: true,
                },
                {
                  icon: "⚠️",
                  value: topAdvisoryTitle,
                  label: "Top advisory",
                  sub: "Top risk",
                  mono: false,
                },
              ].map((card, index) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="rounded-2xl border border-green-500/20 bg-[#0d1f14] p-5"
                >
                  <span className="text-2xl">{card.icon}</span>
                  <p
                    className={`text-3xl font-bold text-white ${(card as { mono?: boolean }).mono !== false ? "font-dm-mono" : ""}`}
                  >
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-green-400/60">
                    {card.label}
                  </p>
                  <p className="mt-1 text-xs text-white/40">{card.sub}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-green-500/20 bg-[#0a1a0f] p-6">
              <div className="mb-4 flex flex-wrap gap-2">
                {(
                  [
                    ["temperature", "Temperature"],
                    ["rainfall", "Rainfall"],
                    ["humidity", "Humidity"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveChart(key)}
                    className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                      activeChart === key
                        ? "bg-primary text-white"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={300}>
                {activeChart === "temperature" ? (
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="tempMaxFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#16c76b"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="100%"
                          stopColor="#16c76b"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="tempMinFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#52b788"
                          stopOpacity={0.08}
                        />
                        <stop
                          offset="100%"
                          stopColor="#52b788"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={chartDateFormatter}
                      tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                      tickFormatter={(v) => `${v}°C`}
                      label={{
                        value: "°C",
                        angle: -90,
                        position: "insideLeft",
                        fill: "rgba(255,255,255,0.5)",
                      }}
                    />
                    <Tooltip
                      content={(p: unknown) => (
                        <ChartTooltip
                          {...(p as object)}
                          unit=""
                          valueKey="tempMax"
                          dateFormatter={chartDateFormatter}
                        />
                      )}
                    />
                    {extrapolatedBoundaryIndex >= 0 &&
                      chartData[extrapolatedBoundaryIndex] && (
                      <ReferenceLine
                        x={chartData[extrapolatedBoundaryIndex].date}
                        stroke="rgba(255,255,255,0.4)"
                        strokeDasharray="4 4"
                        label={{
                          value: "~Estimated beyond this point",
                          fill: "rgba(255,255,255,0.5)",
                          fontSize: 10,
                        }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="tempMax"
                      stroke="#16c76b"
                      fill="url(#tempMaxFill)"
                      strokeWidth={2}
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={3}
                            fill="#16c76b"
                            opacity={payload.extrapolated ? 0.5 : 1}
                          />
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="tempMin"
                      stroke="#52b788"
                      fill="url(#tempMinFill)"
                      strokeWidth={2}
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={3}
                            fill="#52b788"
                            opacity={payload.extrapolated ? 0.5 : 1}
                          />
                        );
                      }}
                    />
                  </AreaChart>
                ) : activeChart === "rainfall" ? (
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={chartDateFormatter}
                      tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                      tickFormatter={(v) => `${v}mm`}
                      label={{
                        value: "mm",
                        angle: -90,
                        position: "insideLeft",
                        fill: "rgba(255,255,255,0.5)",
                      }}
                    />
                    <Tooltip
                      content={(p: unknown) => (
                        <ChartTooltip
                          {...(p as object)}
                          unit="mm"
                          valueKey="rainfall"
                          dateFormatter={chartDateFormatter}
                        />
                      )}
                    />
                    {extrapolatedBoundaryIndex >= 0 &&
                      chartData[extrapolatedBoundaryIndex] && (
                      <ReferenceLine
                        x={chartData[extrapolatedBoundaryIndex].date}
                        stroke="rgba(255,255,255,0.4)"
                        strokeDasharray="4 4"
                        label={{
                          value: "~Estimated beyond this point",
                          fill: "rgba(255,255,255,0.5)",
                          fontSize: 10,
                        }}
                      />
                    )}
                    <Bar
                      dataKey="rainfall"
                      fill="rgba(96,165,250,0.7)"
                      stroke="#60a5fa"
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={entry.date}
                          fill={
                            entry.rainfall > 30
                              ? "#ef4444"
                              : entry.rainfall >= 5
                                ? "#60a5fa"
                                : "#93c5fd"
                          }
                          opacity={entry.extrapolated ? 0.5 : 1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="humidityFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#a78bfa"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="100%"
                          stopColor="#a78bfa"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={chartDateFormatter}
                      tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 100]}
                      label={{
                        value: "%",
                        angle: -90,
                        position: "insideLeft",
                        fill: "rgba(255,255,255,0.5)",
                      }}
                    />
                    <ReferenceLine
                      y={80}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{ value: "Mould Risk", fill: "#ef4444" }}
                    />
                    <Tooltip
                      content={(p: unknown) => (
                        <ChartTooltip
                          {...(p as object)}
                          unit="%"
                          valueKey="humidity"
                          dateFormatter={chartDateFormatter}
                        />
                      )}
                    />
                    {extrapolatedBoundaryIndex >= 0 &&
                      chartData[extrapolatedBoundaryIndex] && (
                      <ReferenceLine
                        x={chartData[extrapolatedBoundaryIndex].date}
                        stroke="rgba(255,255,255,0.4)"
                        strokeDasharray="4 4"
                        label={{
                          value: "~Estimated beyond this point",
                          fill: "rgba(255,255,255,0.5)",
                          fontSize: 10,
                        }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="humidity"
                      stroke="#a78bfa"
                      fill="url(#humidityFill)"
                      strokeWidth={2}
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={3}
                            fill="#a78bfa"
                            opacity={payload.extrapolated ? 0.5 : 1}
                          />
                        );
                      }}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
              {activeChart === "temperature" && (
                <p className="mt-2 text-center text-xs text-white/40">
                  Upper line: daily high (°C) · Lower line: daily low (°C)
                </p>
              )}
              {activeChart === "rainfall" && (
                <p className="mt-2 text-center text-xs text-white/40">
                  Bar height: precipitation (mm) per day
                </p>
              )}
              {activeChart === "humidity" && (
                <p className="mt-2 text-center text-xs text-white/40">
                  Line: daily max relative humidity (%) · Dashed line: mould risk (80%)
                </p>
              )}
            </div>

            <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6">
              <h2 className="font-syne text-xl font-bold text-amber-300">
                📋 What This Means For You
              </h2>
              <p className="mb-5 mt-1 text-xs uppercase tracking-wider text-amber-400/50">
                Actionable advice for {resolvedPlaceLabel || forecastData?.city || searchQuery.trim() || "your location"} · {cropLabel}
              </p>
              {advisories.length === 0 ? (
                <div className="rounded-xl border border-green-500/20 bg-green-950/40 p-4">
                  <p className="text-white/90 text-sm">
                    Weather conditions look stable. No urgent actions needed for
                    the forecast period.
                  </p>
                </div>
              ) : (
                advisories.map((a, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`mb-3 flex gap-4 rounded-xl border p-4 ${
                      a.severity === "good"
                        ? "border-green-500/20 bg-green-950/40"
                        : a.severity === "warning"
                          ? "border-amber-500/20 bg-amber-950/40"
                          : "border-red-500/20 bg-red-950/40"
                    }`}
                  >
                    <span className="mt-0.5 text-2xl">{a.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {a.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-white/50">
                        {a.detail}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <h2 className="font-syne mb-4 text-lg font-bold text-white">
              Day-by-Day Breakdown
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {days.map((d, i) => {
                const suitability = getSuitability(d);
                const isSelected = selectedDayIndex === i;
                return (
                  <motion.div
                    key={d.date}
                    onClick={() =>
                      setSelectedDayIndex(selectedDayIndex === i ? null : i)
                    }
                    className={`flex min-w-[118px] cursor-pointer flex-col rounded-xl border p-3 transition-all duration-150 hover:scale-[1.03] hover:shadow-lg hover:shadow-green-500/15 ${
                      isSelected
                        ? "border-primary shadow-green-500/20 shadow-lg"
                        : "border-green-500/15 bg-[#0d1a10]"
                    } ${d.extrapolated ? "opacity-60" : "opacity-100"}`}
                  >
                    <p className="text-[10px] uppercase text-white/40">
                      {d.dayLabel}
                    </p>
                    <p className="text-xs text-white/70">
                      {new Date(d.date).toLocaleDateString(locale, {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    <p className="my-1 text-center text-2xl">
                      {getWeatherEmoji(d.weatherCode)}
                    </p>
                    <p className="text-sm font-bold text-white">
                      {d.tempMax}° /{" "}
                      <span className="text-xs font-normal text-white/40">
                        {d.tempMin}°
                      </span>
                    </p>
                    <p className="text-xs text-blue-300">
                      🌧️ {d.rainfall}mm
                    </p>
                    <p className="text-xs text-white/40">💧 {d.humidity}%</p>
                    <span
                      className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        suitability === "Good"
                          ? "border border-green-500/30 bg-green-500/20 text-green-300"
                          : suitability === "Moderate"
                            ? "border border-amber-500/30 bg-amber-500/20 text-amber-300"
                            : "border border-red-500/30 bg-red-500/20 text-red-300"
                      }`}
                    >
                      {suitability}
                    </span>
                    {d.extrapolated && (
                      <span className="mt-0.5 text-[8px] italic text-white/20">
                        ~est
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {selectedDayIndex !== null && days[selectedDayIndex] && (
              <div className="mt-4 rounded-2xl border border-green-500/20 bg-[#0d1f14] p-5">
                <p className="text-sm font-semibold text-white">
                  {new Date(days[selectedDayIndex].date).toLocaleDateString(
                    locale,
                    { weekday: "long", day: "numeric", month: "short" }
                  )}
                </p>
                <p className="mt-2 text-xs text-white/60">
                  High {days[selectedDayIndex].tempMax}°C / Low{" "}
                  {days[selectedDayIndex].tempMin}°C · Rainfall{" "}
                  {days[selectedDayIndex].rainfall}mm · Humidity{" "}
                  {days[selectedDayIndex].humidity}% · Suitability:{" "}
                  {getSuitability(days[selectedDayIndex])}
                </p>
                <p className="mt-3 text-sm text-green-300">
                  {getDayTip(days[selectedDayIndex])}
                </p>
              </div>
            )}

            <p className="mt-8 pb-8 text-center text-xs text-white/20">
              Weather data from Open-Meteo · Days 1–16 are live forecasts ·
              Days 17–30 are trend estimates · Updated every 3 hours · Free &
              open data
            </p>
          </>
        )}
      </main>
    </div>
  );
}
