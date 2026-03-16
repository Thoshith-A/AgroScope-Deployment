import { useState, useEffect, useMemo, useRef, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Newspaper,
  MapPin,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Globe,
  RefreshCw,
  Radio,
  Leaf,
  DollarSign,
  Shield,
  Zap,
  ExternalLink,
  Clock,
  Target,
  Loader2,
  Search,
  Bookmark,
  BookmarkCheck,
  Share2,
  Grid3x3,
  List,
  Moon,
  Sun,
  X,
  ArrowLeft,
} from "lucide-react";
import {
  getGlobalAgriNews,
  getLocationAgriNews,
  getLiveAgriNewsUpdate,
  fetchTrendingAgriNews,
  type AgriNewsItem,
  type LocationInfo,
  type TrendingTopic,
} from "@/lib/agroNewsApi";
import { Button } from "@/components/ui/button";

const DEMO_NEWS_FALLBACK: AgriNewsItem[] = [
  { id: "demo_1", headline: "India launches new scheme for crop residue management", summary: "The government has announced financial support for farmers who adopt non-burning alternatives for paddy stubble.", location: "Ministry of Agriculture", category: "Policy", impactScore: 8, opportunityAlert: null, timestamp: Date.now() - 86400000, tags: ["policy", "subsidy"], region: "Global", farmerInsight: "Check eligibility and apply through official channels.", imageUrl: "https://picsum.photos/800/600?random=1", url: "https://agriculture.gov.in" },
  { id: "demo_2", headline: "Wheat procurement crosses 26 million tonnes in Punjab", summary: "Procurement agencies have purchased record wheat. Market prices remain stable.", location: "FCI", category: "Market", impactScore: 7, opportunityAlert: "Complete e-NAM registration for direct sales.", timestamp: Date.now() - 172800000, tags: ["market", "price"], region: "Global", farmerInsight: "Monitor prices and complete registration.", imageUrl: "https://picsum.photos/800/600?random=2", url: "https://fci.gov.in" },
  { id: "demo_3", headline: "Agri-tech startups see 40% funding rise in Q1", summary: "Venture capital flow into farm technology and supply chain solutions has increased.", location: "AgriTech India", category: "Technology", impactScore: 6, opportunityAlert: null, timestamp: Date.now() - 259200000, tags: ["technology"], region: "Global", farmerInsight: "Explore digital mandi and FPO platforms.", imageUrl: "https://picsum.photos/800/600?random=3", url: "#" },
  { id: "demo_4", headline: "Monsoon forecast: Normal rainfall expected in central India", summary: "IMD predicts near-normal monsoon for 2025. Farmers can plan kharif sowing.", location: "IMD", category: "Environment", impactScore: 7, opportunityAlert: null, timestamp: Date.now() - 345600000, tags: ["climate"], region: "Global", farmerInsight: "Check weather forecast before field operations.", imageUrl: "https://picsum.photos/800/600?random=4", url: "https://mausam.imd.gov.in" },
  { id: "demo_5", headline: "PM-KISAN instalment credited to 9 crore farmers", summary: "Latest instalment of Rs 2,000 under PM-KISAN has been transferred.", location: "PM-KISAN", category: "Policy", impactScore: 8, opportunityAlert: "Verify Aadhaar-linked bank accounts.", timestamp: Date.now() - 432000000, tags: ["policy", "subsidy"], region: "Global", farmerInsight: "Verify your bank account for credit.", imageUrl: "https://picsum.photos/800/600?random=5", url: "https://pmkisan.gov.in" },
];
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const categoryStyles: Record<string, { bg: string; text: string; border: string; glow: string; badge: string }> = {
  "Crop Production": { bg: "bg-lime-500/10", text: "text-lime-700", border: "border-lime-500/30", glow: "hover:shadow-lime-500/20", badge: "bg-lime-600" },
  "Agricultural Waste": { bg: "bg-orange-500/10", text: "text-orange-700", border: "border-orange-500/30", glow: "hover:shadow-orange-500/20", badge: "bg-orange-600" },
  "Farming Technology": { bg: "bg-cyan-500/10", text: "text-cyan-700", border: "border-cyan-500/30", glow: "hover:shadow-cyan-500/20", badge: "bg-cyan-600" },
  "Market Trends": { bg: "bg-blue-500/10", text: "text-blue-700", border: "border-blue-500/30", glow: "hover:shadow-blue-500/20", badge: "bg-blue-600" },
  "Government Policy": { bg: "bg-indigo-500/10", text: "text-indigo-700", border: "border-indigo-500/30", glow: "hover:shadow-indigo-500/20", badge: "bg-indigo-600" },
  "Climate Impact": { bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-500/30", glow: "hover:shadow-emerald-500/20", badge: "bg-emerald-600" },
  // Additional fallbacks for demo / backend categories
  Policy: { bg: "bg-indigo-500/10", text: "text-indigo-700", border: "border-indigo-500/30", glow: "hover:shadow-indigo-500/20", badge: "bg-indigo-600" },
  Market: { bg: "bg-blue-500/10", text: "text-blue-700", border: "border-blue-500/30", glow: "hover:shadow-blue-500/20", badge: "bg-blue-600" },
  Technology: { bg: "bg-cyan-500/10", text: "text-cyan-700", border: "border-cyan-500/30", glow: "hover:shadow-cyan-500/20", badge: "bg-cyan-600" },
  Environment: { bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-500/30", glow: "hover:shadow-emerald-500/20", badge: "bg-emerald-600" },
};

const categoryIcons: Record<string, typeof Globe> = {
  "Crop Production": Leaf,
  "Agricultural Waste": Sparkles,
  "Farming Technology": Zap,
  "Market Trends": DollarSign,
  "Government Policy": Shield,
  "Climate Impact": Globe,
  // Demo / backend category labels
  Policy: Shield,
  Market: DollarSign,
  Technology: Zap,
  Environment: Globe,
};

function calculateReadingTime(text: string): number {
  return Math.ceil((text.split(/\s+/).length || 1) / 200);
}

function shareArticle(news: AgriNewsItem, platform: "twitter" | "facebook" | "linkedin") {
  const url = news.url || window.location.href;
  const text = `${news.headline} - #Agriculture #AgriTech`;
  const shareUrls = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  };
  window.open(shareUrls[platform], "_blank", "width=600,height=400");
}

interface NewsCardProps {
  news: AgriNewsItem;
  index: number;
  isLive?: boolean;
  isBookmarked: boolean;
  onBookmark: () => void;
  viewMode: "grid" | "list";
  isDarkMode: boolean;
}

function EnhancedNewsCard({ news, index, isLive = false, isBookmarked, onBookmark, viewMode, isDarkMode }: NewsCardProps) {
  const [showShare, setShowShare] = useState(false);
  const CategoryIcon = categoryIcons[news.category] || Globe;
  const style = categoryStyles[news.category] || categoryStyles["Market Trends"];
  const impactColor = (news.impactScore || 0) >= 8 ? "text-red-600" : (news.impactScore || 0) >= 6 ? "text-orange-600" : "text-blue-600";
  const readingTime = calculateReadingTime(news.summary + (news.farmerInsight || ""));
  const imageUrl = news.imageUrl || `https://picsum.photos/800/600?random=${(news.id || "").length % 20}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={viewMode === "list" ? "col-span-full" : ""}
    >
      <Card
        className={`group relative overflow-hidden h-full border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${style.glow} ${isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-white"} ${isLive ? "ring-2 ring-red-500" : ""}`}
      >
        <CardContent className={`p-0 h-full ${viewMode === "list" ? "flex flex-row gap-6" : "flex flex-col"}`}>
          <div className={`relative overflow-hidden ${viewMode === "list" ? "w-72 shrink-0" : "w-full h-48"}`}>
            <img
              src={imageUrl}
              alt={news.headline}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.src = "https://picsum.photos/800/600?random=1";
              }}
            />
            <div className="absolute top-2 left-2">
              <Badge className={`${style.badge} text-white px-2 py-1 text-xs`}>
                <CategoryIcon className="h-3 w-3 mr-1" />
                {news.category}
              </Badge>
            </div>
            {(news.impactScore || 0) >= 7 && (
              <div className="absolute top-2 right-2">
                <div className={`rounded-full p-1.5 ${isDarkMode ? "bg-gray-900/90" : "bg-white/90"}`}>
                  <TrendingUp className={`h-4 w-4 ${impactColor}`} />
                </div>
              </div>
            )}
            {isLive && (
              <Badge className="absolute bottom-2 left-2 bg-red-500 text-white px-2 py-1 text-xs flex items-center gap-1">
                <Radio className="h-3 w-3" /> LIVE
              </Badge>
            )}
          </div>
          <div className="flex-1 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{readingTime} min read</span>
                <span className="mx-1">·</span>
                <MapPin className="h-3.5 w-3.5" />
                <span>{news.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onBookmark}>
                  {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-amber-500 fill-amber-500" /> : <Bookmark className="h-4 w-4" />}
                </Button>
                <div className="relative">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowShare(!showShare)}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                  {showShare && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute right-0 top-10 z-10 flex gap-1 rounded-lg border bg-background p-2 shadow-lg"
                    >
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => shareArticle(news, "twitter")}>𝕏</Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => shareArticle(news, "facebook")}>f</Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => shareArticle(news, "linkedin")}>in</Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
            <h3 className={`text-lg font-bold leading-tight line-clamp-2 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>{news.headline}</h3>
            <p className={`text-sm leading-relaxed line-clamp-3 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>{news.summary}</p>
            {news.farmerInsight && (
              <div className="p-2 bg-green-500/10 border-l-4 border-green-500 rounded-r text-xs">
                <p className="font-semibold text-green-800 dark:text-green-400 mb-0.5 flex items-center gap-1"><Target className="h-3 w-3" /> For Farmers</p>
                <p className="text-green-700 dark:text-green-300 line-clamp-2">{news.farmerInsight}</p>
              </div>
            )}
            {news.opportunityAlert && (
              <div className="p-2 bg-amber-500/10 border-l-4 border-amber-500 rounded-r text-xs">
                <p className="font-semibold text-amber-800 dark:text-amber-400 mb-0.5 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Opportunity</p>
                <p className="text-amber-700 dark:text-amber-300 line-clamp-2">{news.opportunityAlert}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(news.tags || []).slice(0, 3).map((tag) => (
                <span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? "bg-gray-700 text-gray-300" : "bg-muted text-muted-foreground"}`}>#{tag}</span>
              ))}
            </div>
            {news.url && (
              <a href={news.url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                <Button size="sm" className="w-full gap-2">
                  Read Full Article <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AgroNewsLive() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [globalNews, setGlobalNews] = useState<AgriNewsItem[]>(DEMO_NEWS_FALLBACK);
  const [locationNews, setLocationNews] = useState<AgriNewsItem[]>([]);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveUpdate, setLiveUpdate] = useState<AgriNewsItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"latest" | "impact" | "alphabet">("latest");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);

  const categories = [
    { id: "all", name: "All", icon: Globe },
    { id: "Crop Production", name: "Crop Production", icon: Leaf },
    { id: "Agricultural Waste", name: "Agri Waste", icon: Sparkles },
    { id: "Farming Technology", name: "Farm Tech", icon: Zap },
    { id: "Market Trends", name: "Market", icon: DollarSign },
    { id: "Government Policy", name: "Policy", icon: Shield },
    { id: "Climate Impact", name: "Climate", icon: Globe },
  ];

  useEffect(() => {
    const saved = localStorage.getItem("agro-news-bookmarks");
    if (saved) try { setBookmarkedIds(new Set(JSON.parse(saved))); } catch {}
    const dark = localStorage.getItem("agro-news-dark") === "true";
    setIsDarkMode(dark);
  }, []);

  useEffect(() => {
    localStorage.setItem("agro-news-bookmarks", JSON.stringify([...bookmarkedIds]));
  }, [bookmarkedIds]);

  useEffect(() => {
    localStorage.setItem("agro-news-dark", isDarkMode.toString());
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const loadGlobalNews = async () => {
    try {
      setIsLoading(true);
      const response = await getGlobalAgriNews({
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        limit: 15,
      });
      let list = response.news || [];
      if (list.length === 0 && response.success) {
        const retry = await getGlobalAgriNews({ category: selectedCategory !== "all" ? selectedCategory : undefined, limit: 15 });
        list = retry.news || [];
      }
      if (list.length === 0) {
        list = DEMO_NEWS_FALLBACK;
        toast({ title: "Showing demo news", description: "Backend returned no articles. Start backend (port 5000) for live/Tavily news.", variant: "default" });
      } else {
        toast({ title: "Loaded", description: `${list.length} agriculture news updates`, variant: "default" });
      }
      setGlobalNews(list);
    } catch (error) {
      console.error("Failed to load global news:", error);
      setGlobalNews(DEMO_NEWS_FALLBACK);
      toast({ title: "Using demo news", description: "Could not reach backend (port 5000). Start server for live news.", variant: "default" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGlobalNews();
  }, []);

  const isFirstCategoryRun = useRef(true);
  useEffect(() => {
    if (isFirstCategoryRun.current) {
      isFirstCategoryRun.current = false;
      return;
    }
    loadGlobalNews();
  }, [selectedCategory]);

  const detectUserLocation = async () => {
    if (!navigator.geolocation) {
      toast({ title: "Not supported", description: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await getLocationAgriNews({ latitude, longitude });
          setLocationInfo(response.location);
          setLocationNews(response.news || []);
          toast({
            title: "Location detected",
            description: `${response.location.city}, ${response.location.state} · ${response.location.agricultureRegion || "Agriculture region"}`,
            variant: "default",
          });
        } catch (error) {
          console.error("Location news error:", error);
          toast({ title: "Error", description: "Failed to load local news.", variant: "destructive" });
        } finally {
          setIsLoadingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Showing global news",
          description: "Allow location in browser (over HTTPS) for local news, or browse below.",
          variant: "default",
        });
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    if (globalNews.length > 0 && !locationInfo) detectUserLocation();
  }, [globalNews.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      getLiveAgriNewsUpdate()
        .then((update) => {
          if (update?.news?.headline) {
            setLiveUpdate(update.news);
            setTimeout(() => setLiveUpdate(null), 10000);
          }
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchTrendingAgriNews(8)
      .then((data) => setTrendingTopics(data.topics || []))
      .catch(() => setTrendingTopics([]));
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadGlobalNews();
    if (locationInfo) await detectUserLocation();
    setIsRefreshing(false);
    toast({ title: "Refreshed", description: "News updated.", variant: "default" });
  };

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const processedNews = useMemo(() => {
    let combined = [...globalNews];
    if (locationNews.length > 0) combined = [...locationNews, ...globalNews];
    const seen = new Set<string>();
    combined = combined.filter((item) => {
      const id = String(item.id || "");
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      combined = combined.filter(
        (n) =>
          (n.headline || "").toLowerCase().includes(q) ||
          (n.summary || "").toLowerCase().includes(q) ||
          (n.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    switch (sortBy) {
      case "impact":
        combined.sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0));
        break;
      case "alphabet":
        combined.sort((a, b) => (a.headline || "").localeCompare(b.headline || ""));
        break;
      default:
        combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    return combined;
  }, [globalNews, locationNews, searchQuery, sortBy]);

  const localProcessedNews = useMemo(() => {
    let local = [...locationNews];
    const seen = new Set<string>();
    local = local.filter((item) => {
      const id = String(item.id || "");
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      local = local.filter((n) => (n.headline || "").toLowerCase().includes(q) || (n.summary || "").toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "impact":
        local.sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0));
        break;
      case "alphabet":
        local.sort((a, b) => (a.headline || "").localeCompare(b.headline || ""));
        break;
      default:
        local.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    return local;
  }, [locationNews, searchQuery, sortBy]);

  const globalProcessedNews = useMemo(() => {
    const localIds = new Set(localProcessedNews.map((i) => i.id));
    return processedNews.filter((i) => !localIds.has(i.id));
  }, [processedNews, localProcessedNews]);

  const stats = [
    { icon: Newspaper, value: processedNews.length, label: "Total News", color: "text-blue-600" },
    { icon: BookmarkCheck, value: bookmarkedIds.size, label: "Bookmarked", color: "text-amber-600" },
    { icon: TrendingUp, value: processedNews.filter((n) => (n.impactScore || 0) >= 8).length, label: "High Impact", color: "text-red-600" },
    { icon: Sparkles, value: processedNews.filter((n) => n.opportunityAlert).length, label: "Opportunities", color: "text-green-600" },
  ];

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? "bg-gray-900" : "bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50"}`}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Newspaper className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Agro News Live</h1>
                <p className="text-xs text-muted-foreground">Real-time agriculture intelligence</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh
            </Button>
            {!locationInfo && (
              <Button variant="outline" size="sm" onClick={detectUserLocation} disabled={isLoadingLocation}>
                {isLoadingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                <span className="ml-1 hidden sm:inline">Get Local News</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="container mx-auto px-4 py-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by headline, content, or tags..."
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-12 rounded-xl"
          />
          {searchQuery && (
            <Button variant="ghost" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0" onClick={() => setSearchQuery("")}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="container mx-auto px-4 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label} className={isDarkMode ? "bg-gray-800/50 border-gray-700" : ""}>
              <CardContent className="p-4 text-center">
                <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Location banner */}
      {locationInfo && (
        <div className="container mx-auto px-4 pb-4">
          <Card className={isDarkMode ? "bg-green-900/20 border-green-700" : "bg-green-50 border-green-200"}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">📍 {locationInfo.city}, {locationInfo.state}</p>
                  <p className="text-sm text-muted-foreground">🌾 {locationInfo.agricultureRegion}</p>
                  {locationInfo.insight && <p className="text-sm mt-2 whitespace-pre-line">{locationInfo.insight}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category + Sort + View */}
      <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className="gap-1.5"
              >
                <Icon className="h-4 w-4" /> {cat.name}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "latest" | "impact" | "alphabet")}
            className={`rounded-lg border px-3 py-2 text-sm ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-background"}`}
          >
            <option value="latest">Latest</option>
            <option value="impact">High Impact</option>
            <option value="alphabet">A–Z</option>
          </select>
          <div className="flex rounded-lg border overflow-hidden">
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("grid")}>
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("list")}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {trendingTopics.length > 0 && (
        <div className="container mx-auto px-4 pb-2">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Trending Topics</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingTopics.map((topic) => (
              <Badge key={topic.topic} variant="secondary" className="px-3 py-1 text-xs">
                #{topic.topic} · {topic.mentions}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Live banner */}
      <AnimatePresence>
        {liveUpdate && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="container mx-auto px-4 pb-4">
            <Card className="border-2 border-red-500 bg-red-50 dark:bg-red-900/20">
              <CardContent className="p-3 flex items-center gap-3">
                <Radio className="h-5 w-5 text-red-600 animate-pulse" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-red-600">LIVE</p>
                  <p className="text-sm font-semibold">{liveUpdate.headline}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* News grid */}
      <div className="container mx-auto px-4 py-6 pb-20">
        {isLoading && processedNews.length === 0 ? (
          <div className={`grid ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"} gap-6`}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className={`h-80 animate-pulse ${isDarkMode ? "bg-gray-800" : "bg-muted"}`} />
            ))}
          </div>
        ) : processedNews.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle className="h-14 w-14 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No news found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting filters or ensure the backend is running (port 5000).</p>
          </div>
        ) : (
          <div className="space-y-10">
            {localProcessedNews.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <h2 className="text-xl font-bold">Local Agriculture News</h2>
                  <Badge>{localProcessedNews.length}</Badge>
                </div>
                <div className={`grid ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"} gap-6`}>
                  {localProcessedNews.map((news, index) => (
                    <EnhancedNewsCard
                      key={`local_${news.id}_${index}`}
                      news={news}
                      index={index}
                      isBookmarked={bookmarkedIds.has(news.id)}
                      onBookmark={() => toggleBookmark(news.id)}
                      viewMode={viewMode}
                      isDarkMode={isDarkMode}
                    />
                  ))}
                </div>
              </section>
            )}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-bold">Global Agriculture News</h2>
                <Badge variant="secondary">{globalProcessedNews.length}</Badge>
              </div>
              <div className={`grid ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"} gap-6`}>
                {globalProcessedNews.map((news, index) => (
                  <EnhancedNewsCard
                    key={`global_${news.id}_${index}`}
                    news={news}
                    index={index}
                    isBookmarked={bookmarkedIds.has(news.id)}
                    onBookmark={() => toggleBookmark(news.id)}
                    viewMode={viewMode}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
