import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, Sparkles, TrendingUp, Shield, Upload, BarChart3, Flame, Package, Newspaper, ChevronDown, CloudRain, Phone, Sun, Moon, FolderPlus, DollarSign } from "lucide-react";

/** WhatsApp Support hotline — same as whatsapp sandbox: opens customer care chat with pre-filled message. */
const SUPPORT_WHATSAPP_URL = "https://wa.me/918617888597?text=" + encodeURIComponent("Hi, I need support from customer care.");
import { AuthModal } from "@/components/AuthModal";
import OpeningAnimation from "@/components/OpeningAnimation";
import GlobalLanguageSelector from "@/components/GlobalLanguageSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const THEME_KEY = "agro-theme";
import { useWalletOptional } from "@/context/WalletContext";
import { WalletDropdown } from "@/components/WalletDropdown";
import { useTranslation } from "@/context/TranslationContext";
import { motion } from "framer-motion";

/** Catches errors from OpeningAnimation (e.g. R3F/drei) and skips intro so app never fails to load */
class IntroErrorBoundary extends React.Component<
  { onError: () => void; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: true } {
    return { hasError: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render(): React.ReactNode {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showAnimation, setShowAnimation] = useState(() => {
    const seen = sessionStorage.getItem("agroScope_intro_seen");
    return !seen;
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem(THEME_KEY) as "light" | "dark") || "light";
  });

  const handleAnimationComplete = () => {
    sessionStorage.setItem("agroScope_intro_seen", "true");
    setShowAnimation(false);
  };
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userFirstName, setUserFirstName] = useState("");
  const [userRole, setUserRole] = useState<"farmer" | "startup" | "admin" | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const heroBgRef = useRef<HTMLDivElement | null>(null);
  const wallet = useWalletOptional();
  const walletRef = useRef(wallet);
  walletRef.current = wallet;

  useEffect(() => {
    if (!isLoggedIn) return;
    const today = new Date().toDateString();
    if (sessionStorage.getItem("agro_last_login_bonus") === today) return;
    const w = walletRef.current;
    if (!w) return;
    w.earn("DAILY_LOGIN").then(() => sessionStorage.setItem("agro_last_login_bonus", today)).catch(() => {});
  }, [isLoggedIn]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userRaw = localStorage.getItem("user");
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw);
          setIsLoggedIn(true);
        const nameSource = user.name || user.company_name || user.email || "User";
        const firstName = String(nameSource).split(" ")[0];
        setUserFirstName(firstName);
        setUserRole(user.role === "startup" ? "startup" : user.role === "farmer" ? "farmer" : user.role === "admin" ? "admin" : null);
      } catch {
        setIsLoggedIn(false);
        setUserFirstName("");
        setUserRole(null);
      }
        } else {
          setIsLoggedIn(false);
          setUserFirstName("");
          setUserRole(null);
        }
  }, [authModalOpen]);

  const handleAuthSuccess = () => {
    const token = localStorage.getItem("authToken");
    const userRaw = localStorage.getItem("user");
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw);
        setIsLoggedIn(true);
        const nameSource = user.name || user.company_name || user.email || "User";
        const firstName = String(nameSource).split(" ")[0];
        setUserFirstName(firstName);
        const role = user.role === "startup" ? "startup" : user.role === "farmer" ? "farmer" : user.role === "admin" ? "admin" : null;
        setUserRole(role);
        if (role === "admin") navigate("/payments");
      } catch {}
    }
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as "light" | "dark" | null;
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  const setThemeAndApply = (next: "light" | "dark") => {
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const toggleTheme = () => {
    setThemeAndApply(theme === "light" ? "dark" : "light");
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUserFirstName("");
    setUserRole(null);
    toast({ title: t("home_logged_out"), description: t("home_logged_out_desc") });
    navigate("/home");
  };

  const handleCTAClick = () => {
    if (userRole === "farmer") navigate("/input");
    else if (userRole === "startup") navigate("/startup-input");
    else if (userRole === "admin") navigate("/payments");
    else setAuthModalOpen(true);
  };

  useEffect(() => {
    const hero = heroRef.current;
    const bg = heroBgRef.current;
    if (!hero || !bg) return;

    const onMove = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      bg.style.transform =
        `perspective(1400px) rotateX(${y * -8}deg) rotateY(${x * 10}deg)`;
    };

    const onLeave = () => {
      bg.style.transform =
        "perspective(1400px) rotateX(0deg) rotateY(0deg)";
    };

    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    return () => {
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <>
      {showAnimation && (
        <IntroErrorBoundary onError={handleAnimationComplete}>
          <OpeningAnimation onComplete={handleAnimationComplete} />
        </IntroErrorBoundary>
      )}
      <div
        style={{
          opacity: showAnimation ? 0 : 1,
          transition: "opacity 0.6s ease-in-out",
          transitionDelay: showAnimation ? "0s" : "0.1s",
          minHeight: "100vh",
          width: "100%",
        }}
      >
        <div
          className="min-h-screen w-full overflow-x-hidden bg-background"
          style={{ minHeight: "100vh" }}
        >
      {/* Header */}
      <header className="site-nav border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 dark:bg-black/95 dark:border-neutral-800">
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
          <div className="site-nav-actions flex items-center gap-3">
            <Button
              variant="outline"
              className="border-2 gap-2"
              onClick={() => window.open(SUPPORT_WHATSAPP_URL, "_blank", "noopener,noreferrer")}
              type="button"
            >
              <Phone className="h-4 w-4" />
              Support
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-2 gap-2"
                >
                  <Newspaper className="h-4 w-4" />
                  Live Data
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[200px]">
                <DropdownMenuItem onClick={() => navigate("/agro-news-live")} className="gap-2 cursor-pointer">
                  <Newspaper className="h-4 w-4" />
                  Agro News Live
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/weather-forecast")} className="gap-2 cursor-pointer">
                  <CloudRain className="h-4 w-4" />
                  Weather Forecast
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/live-prices")} className="gap-2 cursor-pointer">
                  <DollarSign className="h-4 w-4" />
                  Live Crop Price
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/verification")} className="gap-2 cursor-pointer">
                  <FolderPlus className="h-4 w-4" />
                  Add to Collection
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <GlobalLanguageSelector />
            {!isLoggedIn ? (
              <Button 
                variant="outline" 
                onClick={() => setAuthModalOpen(true)}
                className="border-2"
              >
                {t("nav_login")} / Sign Up
              </Button>
            ) : (
              <>
                {userRole === "admin" && (
                  <Button
                    variant="outline"
                    onClick={() => navigate("/payments")}
                    className="border-2 border-violet-500/50 text-violet-700 dark:text-violet-300"
                  >
                    Verify payments
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/notifications')}
                  className="border-2 gap-2"
                >
                  {t("nav_notifications")}
                </Button>
                <WalletDropdown role={userRole} />
                <Button 
                  variant="outline" 
                  onClick={handleProfileClick}
                  className="border-2"
                >
                  {t("nav_profile")} ({userFirstName})
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={toggleTheme}
              className="border-2 px-3"
              title="Theme"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section — full viewport */}
      <section
        className="hero-immersive"
        ref={heroRef}
        style={{
          margin: 0,
          width: "100%",
          minHeight: "100vh",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* ── 3D BG LAYER — mouse parallax target ── */}
        <div className="hero-bg" ref={heroBgRef}>
          {/* Counter-rotating rings */}
          <div className="hero-ring hero-ring--front" />
          <div className="hero-ring hero-ring--back" />

          {/* Floating glass cards */}
          <div className="hero-cards-wrapper">
            <div className="hero-card hero-card--left" />
            <div className="hero-card hero-card--right" />
          </div>

          {/* Rising particles */}
          <div className="hero-particles-wrapper">
            <span
              className="hero-particle"
              style={{
                top: "15%",
                left: "8%",
                animationDuration: "18s",
                animationDelay: "0s",
              }}
            />
            <span
              className="hero-particle"
              style={{
                top: "65%",
                left: "22%",
                animationDuration: "22s",
                animationDelay: "3s",
              }}
            />
            <span
              className="hero-particle"
              style={{
                top: "25%",
                left: "78%",
                animationDuration: "16s",
                animationDelay: "6s",
              }}
            />
            <span
              className="hero-particle"
              style={{
                top: "75%",
                left: "88%",
                animationDuration: "20s",
                animationDelay: "1.5s",
              }}
            />
            <span
              className="hero-particle"
              style={{
                top: "10%",
                left: "92%",
                animationDuration: "26s",
                animationDelay: "4.5s",
              }}
            />
            <span
              className="hero-particle"
              style={{
                top: "50%",
                left: "5%",
                animationDuration: "19s",
                animationDelay: "8s",
              }}
            />
            <span
              className="hero-particle"
              style={{
                top: "85%",
                left: "45%",
                animationDuration: "24s",
                animationDelay: "2s",
              }}
            />
          </div>
        </div>

        {/* ── CONTENT (z-index: 5) ── */}
        <div
          className="hero-content"
          style={{
            position: "relative",
            zIndex: 5,
            width: "100%",
            maxWidth: "860px",
            margin: "0 auto",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Kicker */}
          <div className="hero-kicker">
            AI-POWERED MARKETPLACE FOR FARMERS
          </div>

          {/* Title */}
          <h1 className="hero-title">
            {isLoggedIn && userRole === "farmer" && (
              <>
                <span>Your Crop Residue Is A New Source of Income.</span>
              </>
            )}
            {isLoggedIn && userRole === "startup" && (
              <>
                <span>Reliable Access to Agricultural Biomass.</span>
              </>
            )}
            {isLoggedIn && userRole === "admin" && (
              <>
                <span>Powering the Agricultural Waste Economy.</span>
              </>
            )}
            {!isLoggedIn && (
              <>
                <span>Agricultural Waste Has Value.</span>
                <br />
                <span className="highlight">
                  We Help You Unlock It.
                </span>
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle">
            {!isLoggedIn && (
              <>
                AgroScope is a digital marketplace that connects farmers with companies that use crop residue for bioenergy,
                materials, and industrial production. By turning unused agricultural waste into a tradable resource,
                AgroScope helps farmers earn more while reducing environmental waste.
              </>
            )}
            {isLoggedIn && userRole === "farmer" && (
              <>
                List your crop residue, receive demand from verified buyers, and track interest in your listings.
                AgroScope connects farmers directly with companies looking for agricultural biomass.
              </>
            )}
            {isLoggedIn && userRole === "startup" && (
              <>
                Discover agricultural residue from farmers across multiple regions. AgroScope helps companies source biomass
                efficiently while maintaining transparency in supply and availability.
              </>
            )}
            {isLoggedIn && userRole === "admin" && (
              <>
                Monitor platform activity, manage users, and oversee marketplace operations. The AgroScope admin dashboard
                provides full visibility into listings, demand, and transactions.
              </>
            )}
          </p>

          {/* CTA row */}
          <div className="hero-cta-row">
            <button
              className="hero-cta-main"
              onClick={handleCTAClick}
            >
              <span>
                {!isLoggedIn && "Monetize waste"}
                {isLoggedIn && userRole === "farmer" && "Let's Sell"}
                {isLoggedIn && userRole === "startup" && "Let's Buy"}
                {isLoggedIn && userRole === "admin" && "Monitor"}
              </span>
            </button>
          </div>

          {/* Trust badges */}
          <div className="hero-badges">
            <span>AI-Powered Matching</span>
            <span>Instant Valuations</span>
            <span>100% free for farmers</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        className="py-20 bg-white mt-10"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Why Choose AgroScope?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              AgroScope bridges the gap between agricultural waste and industrial demand, helping farmers monetize crop residue while providing companies with sustainable biomass resources.
            </p>
          </div>

          <div className="agro-carousel overflow-hidden">
            <div className="agro-carousel-track gap-6 py-4">
              {[
                { icon: <Sparkles className="w-7 h-7 text-primary" />, title: "AI Price Negotiation", desc: "Real-time AI negotiation for crop residue." },
                { icon: <TrendingUp className="w-7 h-7 text-secondary" />, title: "30-Day Forecast", desc: "Supply and demand prediction over 30 days." },
                { icon: <Shield className="w-7 h-7 text-accent" />, title: "Cold Storage Hubs", desc: "Access to cold storage locations across supported cities." },
                { icon: <Leaf className="w-7 h-7 text-primary" />, title: "Satellite Crop Detection", desc: "Satellite-based area and biomass estimation." },
                { icon: <Flame className="w-7 h-7 text-secondary" />, title: "AgroCredits & Dual Wallet", desc: "Earn/spend AgroCredits and manage farmer/startup wallets." },
                { icon: <Package className="w-7 h-7 text-accent" />, title: "AI Matchmaking", desc: "Intelligently match buyers and suppliers." },
                { icon: <BarChart3 className="w-7 h-7 text-primary" />, title: "Smart Weight Estimator", desc: "AI-assisted weight estimation from a single photo." },
                { icon: <Newspaper className="w-7 h-7 text-secondary" />, title: "Agri News Live", desc: "Near real-time agricultural news and signals." },
                { icon: <DollarSign className="w-7 h-7 text-accent" />, title: "Loyalty & Rewards", desc: "Loyalty program and rewards mechanics." },
              ].map((feature, index) => (
                <motion.div
                  key={`${feature.title}-${index}`}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{
                    delay: (index % 9) * 0.04,
                    duration: 0.55,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="w-72 shrink-0 px-2"
                >
                  <Card className="border-2 hover:shadow-card transition-all duration-300 hover:scale-[1.02] h-full">
                    <CardHeader>
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        {feature.icon}
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription className="text-base">
                        {feature.desc}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Tools: Forecast, Carbon, Recommendations */}
          <div className="mt-12 pt-12 border-t border-border">
            <h3 className="text-xl font-semibold mb-4 text-center text-foreground">Tools & Insights</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate("/forecast")}
              >
                <BarChart3 className="w-6 h-6" />
                <span>{t("nav_forecast")}</span>
                <span className="text-xs font-normal text-muted-foreground">Supply prediction</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate("/carbon")}
              >
                <Flame className="w-6 h-6" />
                <span>{t("nav_carbon")}</span>
                <span className="text-xs font-normal text-muted-foreground">CO₂ impact</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate("/recommendations")}
              >
                <Package className="w-6 h-6" />
                <span>Recommendations</span>
                <span className="text-xs font-normal text-muted-foreground">Waste to products</span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-white dark:bg-white dark:border-neutral-200">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 AgroScope. Transforming Waste into Value.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen}
        onAuthSuccess={handleAuthSuccess}
      />
        </div>
      </div>
    </>
  );
};

export default Home;
