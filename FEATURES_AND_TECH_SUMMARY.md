# AgroScope — Features, Tools & Tech Stack Summary

**Purpose:** Share this document with your friend so they can understand the full product, analyze it, and add a **Features** tab/section on the homepage.

---

## 1. Project Overview

**AgroScope** is an **AI-powered crop residue marketplace** that connects farmers with startups across multiple cities. Farmers list agricultural waste (paddy husk, wheat straw, sugarcane bagasse, etc.); startups discover supply and negotiate. The app provides instant pricing, carbon impact, forecasts, and AI-driven tools (crop detection via camera, live market prices, negotiation chat).

- **Tagline:** *Turn Crop Waste Into Revenue*
- **Target users:** Farmers, Startups/Buyers, Admin
- **Differentiation:** AI price negotiation, live market oracle (DeepSeek + Tavily), camera-based crop/weight detection, 30-day supply forecast, carbon credits, loyalty program, multi-language support (57 languages)

---

## 2. Tech Stack

### Frontend
| Category | Technology |
|----------|------------|
| **Framework** | React 18 |
| **Build** | Vite 5, TypeScript |
| **Routing** | React Router v6 |
| **UI** | Tailwind CSS, Radix UI (dialogs, selects, dropdowns, etc.), shadcn-style components |
| **State** | React state + context (Wallet, Translation, Auth) |
| **Data** | TanStack React Query, Axios |
| **Animation** | Framer Motion, Three.js / React Three Fiber (opening animation) |
| **Charts** | Recharts |
| **Maps** | Leaflet |
| **Icons** | Lucide React |
| **Forms** | React Hook Form, Zod |
| **Real-time** | Socket.io client |

### Backend
| Category | Technology |
|----------|------------|
| **Runtime** | Node.js (≥20) |
| **Framework** | Express.js |
| **Database** | MongoDB (Mongoose) — Atlas in production |
| **Auth** | JWT, bcryptjs |
| **File upload** | Multer |
| **Real-time** | Socket.io |
| **API docs** | Swagger (swagger-jsdoc, swagger-ui-express) |

### External APIs & Services
| Service | Use |
|---------|-----|
| **Google Cloud Vision API** | Crop type detection from camera/image |
| **Google Gemini (Vision)** | Vision-based weight estimation from pile images |
| **Tavily API** | Web search for live market prices and news |
| **DeepSeek API** | Live market price extraction, price negotiation chat, sell-now/hold advice, 30-day forecast, agro news enrichment |
| **Open-Meteo** | Weather forecast (global, 57 languages) |
| **Geocoding** | Backend geocode service for weather (place → lat/lon) |

### Environment / DevOps
- **Frontend port:** 5173 (Vite dev)
- **Backend port:** 5000 (default)
- **Proxy:** Vite proxies `/api` to backend (see `vite.config.ts`)
- **Env:** `server/.env` — `MONGODB_URI`, `GOOGLE_VISION_API_KEY` or `GOOGLE_APPLICATION_CREDENTIALS`, `DEEPSEEK_API_KEY`, `TAVILY_API_KEY`, `OPEN_METEO_*`, etc.

---

## 3. All Application Routes (Pages)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Redirect | Redirects to `/home` |
| `/home` | Home | Landing: hero, features, tools & insights, CTA, auth |
| `/input` | Input (Farmer) | List crop waste: waste type, quantity, location, price, carbon, forecast; camera crop detect; weight estimator; negotiate with AI; save to inventory |
| `/startup-input` | Startup Input | Startups post demand (same structure as farmer input for discovery) |
| `/profile` | Profile | User profile, wallet (AgroCredits, AgroCoins), transactions |
| `/farmer-inventory` | Farmer Inventory | List of farmer provisions; startups browse and request |
| `/startup-matches` | Startup Matches | AI-matched farmers for startup demand |
| `/notifications` | Notifications | Order requests, matches, alerts |
| `/forecast` | Forecast | 30-day supply prediction by waste type and location |
| `/carbon` | Carbon Simulator | Waste type + quantity → CO₂ saved, trees equivalent, carbon credits |
| `/recommendations` | Recommendations | Waste-to-products suggestions by waste type |
| `/agro-news-live` | Agro News Live | Agri news feed (search, categories, 57 languages) |
| `/weather-forecast` | Weather Forecast | Global weather by search + crop waste context |
| `/loyalty` | Loyalty Program | Tiers, companies, tier pages |
| `/loyalty/tier/:tier` | Loyalty Tier Page | Per-tier details |
| `/results` | Results | Results view |
| `/dashboard` | Dashboard | Dashboard view |
| `/payments` | Payments | Admin: verify payments |
| `*` | NotFound | 404 page |

---

## 4. Features & Tools (for Features Tab / Homepage)

### Core Marketplace
- **List crop waste (Farmer)** — Waste type (50+ international types, searchable), quantity (tons), location, optional price; save to inventory and sync to network.
- **Post demand (Startup)** — Same flow for startups to post what they need.
- **Farmer Inventory** — Browse farmer provisions; request/order.
- **Startup Matches** — AI matchmaking: startups see matched farmers for their demand.
- **Notifications** — Order requests, matches, and alerts.
- **Cold storage hubs** — 10 cities (e.g. Chennai, Mumbai, Delhi, Bengaluru, Hyderabad, Kolkata, Pune, Ahmedabad, Jaipur, Surat).

### AI & Pricing
- **Live market price** — Shown on Input/Startup Input (below “Price per kg”). Powered by **Tavily + DeepSeek**; optional fallback if APIs not set.
- **Negotiation Arena (Negotiate with AI)** — Chat-based price negotiation using **DeepSeek**; market context and suggestions.
- **Quick check price** — Instant price evaluation vs market (evaluate API).
- **CRDT (Challenge-Response Debug Token)** — For debug firmware / secure trace (advanced).

### Vision & Estimation
- **Detect crop type via camera** — Upload or drag-drop image; **Google Cloud Vision** detects crop type and auto-fills waste type (50+ types supported).
- **Estimate weight via camera** — **Google Vision + Gemini**: upload pile image, get weight estimate (kg/tonnes); can run crop detection first and auto-apply waste type.
- **Satellite-based detection** — Optional satellite view / detect (crop monitor analyze).
- **Weight estimator (non-vision)** — Alternative weight estimation API (e.g. form-based).

### Forecasts & Insights
- **30-day supply forecast** — By waste type and location; AI/backend forecast; link from Input.
- **Market price forecast** — 30-day price outlook (market-price forecast API).
- **Sell now vs hold** — Recommendation and chart (sell-now-hold API, Tavily + DeepSeek).

### Carbon & Sustainability
- **Carbon simulator** — Enter waste type + quantity → CO₂ saved, trees equivalent, carbon credits.
- **Carbon impact on Input** — Shown when listing waste (prevented burning, credits).
- **Carbon credits** — Earned and reflected in wallet (AgroCredits).

### Content & Weather
- **Agro News Live** — Agri news feed: search, categories, global/location-based; **57 languages**; powered by Tavily/backend.
- **Weather forecast** — Worldwide; search by place (no city dropdown); optional crop waste context; **57 languages** for labels; Open-Meteo + backend geocode.

### Loyalty & Gamification
- **Loyalty program** — Tiers, companies, tier pages.
- **AgroCredits & AgroCoins** — In-app wallet (profile); daily login bonus, earn on actions; transfer, history, leaderboard.

### User & Admin
- **Auth** — Register, login (JWT); roles: farmer, startup, admin.
- **Profile** — Name, role, wallet (AgroCredits, AgroCoins), transactions.
- **Payments** — Admin: verify payments (payments routes).
- **57 languages** — Website translation (TranslationContext + translation API).
- **Day/Night theme** — Toggle on header; persisted in localStorage.

### UX
- **Searchable waste type** — Search bar in waste type selector (50+ types).
- **Icon buttons** — Edit (pencil), Delete (trash), View (eye), Status, Evidence, Revoke (API keys), etc.
- **Compact tables** — e.g. test cases table more compact and presentable.
- **Help / Agro Guide** — Contextual help; “open Agro Guide” events.
- **WhatsApp Support** — Link to pre-filled customer care chat.

---

## 5. Backend API Summary (by domain)

- **Auth:** `/api/auth` — register, login.
- **Profile:** `/api/profile` — get, update.
- **Provisions:** `/api/provisions` — create, list, my.
- **Matchmaking:** `/api/matchmaking/search`.
- **Waste:** `/api/waste/matches`.
- **Notifications:** `/api/notifications`.
- **Orders:** `/api/orders` — create, accept.
- **Crops:** `/api/crops/types`.
- **Price:** `/api/price` — evaluate (quick check).
- **Forecast:** `/api/forecast` — AI 30-day, etc.
- **Carbon:** `/api/carbon` — simulate.
- **Recommendations:** `/api/recommendations`.
- **Market price:** `/api/market-price` — live, forecast, sell-now-hold, compare, CRUD.
- **Cold storage:** `/api/cold-storage`.
- **Crop monitor:** `/api/crop-monitor/analyze`.
- **Weight estimator:** `/api/...` (weight estimation).
- **Price negotiation:** `/api/price-negotiation` — agro-guide-status, market-price, chat.
- **Translate:** `/api/translate/website`.
- **Agri news:** `/api/agri-news` — global, location, trending, live.
- **Wallet:** `/api/wallet` — get, earn, transactions, transfer, users, leaderboard.
- **Weather:** `/api/weather-forecast` — geocode, forecast.
- **Loyalty:** `/api/loyalty` — status, companies.
- **Payments:** `/api/payments` — submit, list, get by id.
- **Vision:** `/api/vision/detect-crop`, `/api/vision/estimate-weight`, Gemini status.
- **Health:** `/api/health`.

(Exact paths and methods are in `server/server.js` and each `server/routes/*.js`.)

---

## 6. Suggested “Features” Section for Homepage

Your friend can add a **Features** tab or section that:

1. **Lists all tools in one place**  
   - Marketplace (list waste, post demand, inventory, matches, notifications).  
   - AI (live price, negotiation chat, quick price check).  
   - Vision (crop detection, weight estimation, satellite).  
   - Forecasts (30-day supply, price forecast, sell now/hold).  
   - Carbon (simulator, impact on input, credits).  
   - Content (Agro News Live, Weather).  
   - Loyalty & wallet (tiers, AgroCredits, AgroCoins).  
   - UX (57 languages, theme, searchable waste types, support).

2. **Uses this doc**  
   - Copy the feature bullets and tool names from **Section 4** into cards or a grid (e.g. “Tools & Insights” expanded).

3. **Optional “Tech” subsection**  
   - Short line: “Built with React, Node, MongoDB, Google Vision, Tavily, DeepSeek, Open-Meteo” and link to this file or a short “Technology” paragraph.

4. **Keep existing “Why Choose AgroScope?”**  
   - The current three cards (AI Price Negotiation, 30-Day Forecast, Carbon Credits) can stay; the new **Features** section can sit below or in a tab and list **all** features and tools so nothing is missed.

---

## 7. File Hints for Your Friend

- **Home page:** `src/pages/Home.tsx` — hero, “Why Choose AgroScope?”, “Tools & Insights” (Forecast, Carbon, Recommendations), CTA, footer.
- **Routes:** `src/App.tsx` — all `<Route path=...>`.
- **Translation keys:** `src/lib/translationStrings.ts` — e.g. `home_feature1_title`, `nav_forecast`, `nav_carbon`.
- **Backend routes:** `server/server.js` — all `app.use('/api/...', ...)` and `server/routes/*.js`.

---

**End of summary.** Use this to add a comprehensive Features tab/section on the homepage and to align wording with the actual product and tech stack.
