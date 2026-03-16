# AgroScope — Full Project & Integration Guide

**Purpose:** Share this document with your friend (and with Claude) so they can:
1. Understand the entire AgroScope project.
2. Get prompts from Claude to build new features on a computer that doesn’t have AgroScope.
3. Integrate those new features into your existing AgroScope repo without breaking anything.

Use this file as the **single source of truth** when asking an AI to add or change features.

---

## 1. What AgroScope Is

**AgroScope** is a **crop waste marketplace and insights platform** for India. It connects **farmers** (who supply crop residue) with **startups/buyers**, and provides:

- **Farmer input form** — Waste type, quantity (tons), location, optional price; forecast strip, satellite “Detect Now”, **AI weight estimation from photos** (Puter.js vision), carbon impact, suggested products, cold storage hub, **Save & Sync to Network** (saves provision then navigates to inventory).
- **30-day supply forecast** — By city and crop (paddy husk, wheat straw, etc.).
- **Satellite-style crop health** — Leaflet map; “Analyze Sector” → mock NDVI by lat/lon.
- **Weight estimator** — **Client-side only**: Puter.js (GPT-4o / Gemini 2.5); user signs in to Puter once; no API keys; result applied to Quantity on Input form.
- **Carbon impact** and **product recommendations** for crop waste.
- **Cold storage hub** selection (10 Indian cities).
- **Auth** — JWT in `localStorage`; demo users (farmer vs startup).
- **Provisions / inventory** — Farmers post provisions; startups see all; list at `/farmer-inventory`.

Target: hackathon/demo. Runs without MongoDB (in-memory/demo mode). Frontend: **Vite + React + TypeScript**. Backend: **Node.js + Express (ESM)**.

---

## 2. Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, Vite 5, TypeScript, React Router 6, Tailwind CSS, Radix UI (shadcn), Framer Motion, Recharts, Leaflet, TanStack Query, Sonner toasts |
| **Weight estimation** | **Puter.js** (script `https://js.puter.com/v2/` in `index.html`). Client-side only; `puter.ai.chat(prompt, image, { model, temperature })`; user-pays sign-in at puter.com. No server route. |
| **Backend** | Node.js, Express (ESM), optional Mongoose/MongoDB Atlas |
| **Auth** | JWT in `localStorage` key `authToken`. Demo users: `f1@gmail.com` / `farmer`, `east@argo` / `east@argo` (startup). |
| **Proxy** | Vite dev: `/api`, `/login`, `/register` → `http://localhost:5000` |

---

## 3. Repo Structure (Important Paths)

```
AgroScope_Project_Final/
├── index.html                    # Puter.js script in <head>: https://js.puter.com/v2/
├── vite.config.ts                # port 5173, proxy /api, /login, /register → 5000
├── package.json                  # Frontend (React, Vite, Leaflet, Recharts, etc.)
│
├── src/
│   ├── main.tsx
│   ├── App.tsx                   # All routes (see Section 4)
│   ├── lib/
│   │   ├── api.ts                # Central API client (forecast, price, carbon, recommendations, cold storage, etc.)
│   │   └── cropIcons.tsx         # CROP_WASTE_CONFIG (keys + labels), CropBadge
│   ├── pages/
│   │   ├── Home.tsx              # Landing + opening animation
│   │   ├── Input.tsx             # Farmer form; Save & Sync = type="submit" → handleSubmit → POST /api/provisions → navigate /farmer-inventory
│   │   ├── StartupInput.tsx      # Startup “find farmer” → /farmer-inventory
│   │   ├── Forecast.tsx         # 30-day supply by city + crop
│   │   ├── CarbonSimulator.tsx
│   │   ├── Recommendations.tsx
│   │   ├── FarmerInventory.tsx   # GET /api/provisions or /api/provisions/my
│   │   ├── Profile.tsx, Notifications.tsx, StartupMatches.tsx, Results.tsx, Dashboard.tsx, NotFound.tsx, Login.tsx, Index.tsx
│   ├── components/
│   │   ├── WeightEstimatorModal.tsx  # Puter.js: estimateWithPuter(), estimateWithBestModel(); sign-in check; no backend call
│   │   ├── SatelliteDetectModal.tsx  # Leaflet; POST /api/crop-monitor/analyze
│   │   ├── AuthModal.tsx
│   │   ├── NegotiationArena.tsx, PriceNegotiationModal.tsx, NegotiationChat.tsx, DealCard.tsx
│   │   ├── PriceOracle.tsx, CropDetectButton.tsx, OpeningAnimation.tsx, HeroText.tsx, MagneticButton.tsx, StarRating.tsx
│   │   ├── 3d/ HeroScene.tsx, ForecastChartScene.tsx
│   │   └── ui/                   # shadcn (button, card, input, select, dialog, toast, etc.)
│
└── server/
    ├── server.js                 # Express, CORS, route mounts, health, optional Swagger
    ├── .env                      # Optional: MONGODB_URI, PORT, etc.
    ├── package.json              # express, mongoose, bcryptjs, jsonwebtoken, multer, node-fetch, etc.
    ├── config/
    │   └── demoMode.js           # DEMO_MODE (env)
    ├── middleware/
    │   └── auth.js               # requireAuth, JWT
    ├── routes/
    │   ├── auth.js               # POST /login, /register (also mounted at /)
    │   ├── provisions.js         # GET /, GET /my, POST / (in-memory DEMO_PROVISIONS)
    │   ├── forecast.js           # GET /next-30-days, etc.
    │   ├── cropMonitor.js        # POST /analyze (mock NDVI)
    │   ├── weightEstimator.js    # POST /estimate-weight (Gemini image → weight; optional; frontend mainly uses Puter)
    │   ├── coldStorage.js        # GET /nearest?location=
    │   ├── price.js, marketPrice.js, carbon.js, recommendations.js, profile.js, notifications.js
    │   ├── matchmaking.js, orders.js, waste.js, crops.js, startupRating.js, farmerRating.js, startups.js, farmers.js
    │   └── priceNegotiation.js
    ├── services/                 # forecastService, marketPriceService, farmerRatingService, etc.
    ├── data/                     # locationForecastData.js (cities, waste keys, calculateForecast)
    └── scripts/                  # seed, seedCropWasteHistory, seedPriceDataset, seedSupplyForecast
```

---

## 4. Frontend Routes (App.tsx)

| Path | Page | Purpose |
|------|------|---------|
| `/` | Redirect | → `/home` |
| `/home` | Home | Landing, opening animation (once per session) |
| `/input` | Input | Farmer: waste form; forecast strip; satellite; weight estimator (Puter); carbon; recommendations; cold storage; **Save & Sync** = submit form → POST /api/provisions → on success navigate to /farmer-inventory |
| `/startup-input` | StartupInput | Startup form; “Find Nearest Farmer” → /farmer-inventory |
| `/forecast` | Forecast | City + crop → 30-day chart (GET /api/forecast/next-30-days) |
| `/carbon` | CarbonSimulator | Carbon simulation |
| `/recommendations` | Recommendations | Product suggestions by waste type |
| `/farmer-inventory` | FarmerInventory | Provisions list (role-based: farmer = /my, startup = all) |
| `/profile` | Profile | User profile |
| `/notifications` | Notifications | Notifications |
| `/startup-matches` | StartupMatches | Matches |
| `/results` | Results | Results |
| `/dashboard` | Dashboard | Dashboard |
| `*` | NotFound | 404 |

**Adding a new page:** Create `src/pages/YourPage.tsx`, then in `App.tsx` add `<Route path="/your-path" element={<YourPage />} />` **above** the catch-all `<Route path="*" element={<NotFound />} />`.

---

## 5. Backend API (Mount Points in server.js)

All under `/api` unless noted.

- **Auth:** `app.use('/api/auth', authRoutes)` and `app.use('/', authRoutes)` for `/login`, `/register`.
- **Provisions:** `app.use('/api/provisions', provisionsRoutes)` → GET `/`, GET `/my`, POST `/` (requireAuth, farmer only).
- **Forecast:** `app.use('/api/forecast', forecastRoutes)` → e.g. GET `/next-30-days?city=Chennai&wasteType=paddy_husk`.
- **Crop monitor:** `app.use('/api/crop-monitor', cropMonitorRouter)` → POST `/analyze` body `{ lat, lon }`.
- **Weight estimator (optional):** `app.use('/api', weightEstimatorRouter)` → POST `/estimate-weight` (Gemini). **Frontend weight estimation is Puter.js in the browser; this route is optional.**
- **Cold storage:** `app.use('/api/cold-storage', coldStorageRoutes)` → GET `/nearest?location=...`.
- **Price, market price, carbon, recommendations:** `app.use('/api/price', ...)`, `app.use('/api/market-price', ...)`, `app.use('/api/carbon', ...)`, `app.use('/api/recommendations', ...)`.
- **Health:** GET `/api/health` → `{ status: 'OK', ... }`.

**Adding a new API:** Create `server/routes/yourRoute.js` (Express router), mount in `server.js` with `app.use('/api/your-prefix', yourRoute)`, then in `src/lib/api.ts` add a function that calls `fetch(\`${base}/api/your-prefix/...\`, { ... getAuthHeaders() })`.

---

## 6. Data Conventions (Critical for Integration)

- **Crop waste keys (backend & API):** Always use **snake_case keys**: `paddy_husk`, `wheat_straw`, `corn_stalks`, `sugarcane_bagasse`, `coconut_shells`.  
  **Labels (UI only):** “Paddy Husk”, “Wheat Straw”, etc.  
  Mapping lives in `src/lib/cropIcons.tsx` (`CROP_WASTE_CONFIG`) and in backend config (e.g. `server/data/locationForecastData.js`). If the frontend sends a label instead of a key (e.g. `"Paddy Husk"`), backend lookups can fail and return zeros.
- **Cities:** Chennai, Mumbai, Delhi, Bengaluru, Hyderabad, Kolkata, Pune, Ahmedabad, Jaipur, Surat. Must match keys in backend location/forecast config.
- **Auth:** Token in `localStorage.getItem('authToken')`. Send as `Authorization: Bearer <token>` for protected routes. Demo users: farmer `f1@gmail.com` / `farmer`, startup `east@argo` / `east@argo`.

---

## 7. Key Features (How They Work)

- **Save & Sync to Network (Input page):** The button is **type="submit"** inside the form. Submitting calls `handleSubmit`: validates token, waste type, quantity, location; POSTs to `/api/provisions` with body `{ wasteType, quantityTons, location, ... }`; on success navigates to `/farmer-inventory` and shows “Saved” toast.
- **Weight estimator:** Opens `WeightEstimatorModal`. User uploads/captures image. If not signed in to Puter, `puter.auth.signIn()` is called (popup). Then `estimateWithBestModel(imageFile, wasteType)` runs **entirely in the browser** (Puter.js: gpt-4o → gemini-2.5-flash → claude-sonnet-4-5 with 8s timeout each). Result has `estimatedWeightKg`, `confidencePercent`, `method`, `reasoning`, `source: 'puter_gpt4o' | 'puter_gemini'`. “Apply to Form” sets quantity (kg → tons) on Input. No server route required for this flow.
- **30-day forecast:** Input strip and Forecast page use `getForecastNext30Days({ city, wasteType })` (wasteType = key). Backend uses `locationForecastData.calculateForecast(city, wasteType)`.
- **Satellite Detect:** Modal → Leaflet map → “Analyze Sector” → POST `/api/crop-monitor/analyze` with `{ lat, lon }` → mock NDVI/health → “Apply to Form” fills quality/moisture/location on Input.
- **Carbon & recommendations:** Input page calls `simulateCarbon`, `getRecommendations` from `api.ts`; backend routes under `/api/carbon`, `/api/recommendations`.

---

## 8. How to Run the Project

- **Backend:** `cd server` then `npm run dev` (or `npm start`). Runs on **port 5000**. Requires Node 18+.
- **Frontend:** In project root, `npm run dev`. Vite runs on **port 5173** and proxies `/api`, `/login`, `/register` to `http://localhost:5000`.
- Both must run for full functionality (auth, provisions, forecast, etc.). Weight estimation works without backend (Puter.js in browser).

---

## 9. How to Integrate a New Feature (For Your Friend + Claude)

### A. Building the feature elsewhere (no AgroScope repo)

- Describe the feature and the **contract**: e.g. “A new page that shows X; it needs GET /api/xyz with response shape { … }.”
- Use this doc: **tech stack** (React 18, Vite, TS, Tailwind, shadcn), **data conventions** (crop keys, cities), **auth** (Bearer token, demo users). Ask Claude to generate the feature (e.g. a standalone page + API route + types) so it matches AgroScope’s style and contracts.

### B. Integrating into AgroScope

1. **New page:** Add `src/pages/NewPage.tsx`. In `App.tsx`, add `<Route path="/new-page" element={<NewPage />} />` above the `*` route.
2. **New API:** Add `server/routes/newFeature.js` (router with GET/POST), in `server.js` add `import newFeatureRoutes from './routes/newFeature.js';` and `app.use('/api/new-feature', newFeatureRoutes);`.
3. **New API client:** In `src/lib/api.ts`, add a function that uses `fetch(\`${base}/api/new-feature/...\`)` and optionally `getAuthHeaders()`. Define TypeScript interfaces for request/response if needed.
4. **New component:** Add under `src/components/` and import where needed (e.g. in a page). Use existing UI from `src/components/ui/` (shadcn) and Tailwind.
5. **Crop/location data:** Use `CROP_WASTE_CONFIG` and crop **keys** for any API calls; use **labels** only for display. Use the same city list as the rest of the app for consistency.

### C. Checklist before submitting a merge / patch

- [ ] New routes (frontend and backend) documented in this file or in PROJECT_OVERVIEW_FOR_IMPROVEMENTS.md.
- [ ] API uses crop **keys** (e.g. `paddy_husk`) when talking to backend.
- [ ] Protected routes send `Authorization: Bearer <token>`.
- [ ] No removal or rename of existing routes/keys used by Input, FarmerInventory, Forecast, or WeightEstimatorModal without updating this guide and the overview.

---

## 10. Important Files to Touch When Integrating

| Goal | File(s) |
|------|--------|
| Add a new page | `src/App.tsx`, `src/pages/YourPage.tsx` |
| Add a new API endpoint | `server/server.js`, `server/routes/yourRoute.js` |
| Call new API from frontend | `src/lib/api.ts` (new function + types) |
| Add a reusable UI component | `src/components/YourComponent.tsx`, then use in page |
| Change crop list or labels | `src/lib/cropIcons.tsx` (CROP_WASTE_CONFIG); backend config in `server/data/` or equivalent |
| Change auth/demo users | `server/routes/auth.js` |

---

## 11. Recent Changes (So Claude Stays in Sync)

- **Weight estimation:** No longer uses Google Vision or DeepSeek on the server. It uses **Puter.js** in the browser only (`WeightEstimatorModal.tsx`). Script in `index.html`; no `/api/weight-estimator/vision` (that route was removed). User signs in to Puter once; models tried: gpt-4o, google/gemini-2.5-flash, claude-sonnet-4-5.
- **Save & Sync:** The “Save & Sync to Network” button on the Input page is the form’s **submit** button (`type="submit"`). Submitting saves the provision via POST `/api/provisions` and then navigates to `/farmer-inventory` on success.

---

## 12. Visual & UX Design System (Immersive, Cinematic, High-End)

AgroScope uses a **natural green + harvest gold** palette and cinematic patterns. New features must follow these so the app feels cohesive and premium.

### Colour palette (use these, don’t invent new ones)

- **Primary green:** `hsl(var(--primary))` ≈ `#16c76b` — CTAs, key actions, success. Tailwind: `bg-primary`, `text-primary`, `border-primary`, `ring-primary`.
- **Green spectrum (CSS vars in `src/index.css`):** `--green-dim`, `--green-muted`, `--green-mid` (#52b788), `--green-base` (#74c69d), `--green-bright`, `--green-text`, `--green-glow`. Use for backgrounds, borders, subtle emphasis.
- **Harvest gold / accent:** `hsl(var(--accent))` ≈ amber (#f0a500). Tailwind: `bg-amber-50`, `border-amber-200`, `text-amber-800` for hints; `--gold-bright`, `--gold-text` for hero highlights. Used for “kicker” text, badges, secondary emphasis.
- **Surfaces:** `--bg-void` (#060f08), `--bg-deep`, `--bg-surface`, `--bg-raised`, `--bg-overlay` for dark immersive sections. Light: `background`, `card`, `muted` (Tailwind / CSS vars).
- **Borders:** `--border-dim` to `--border-bright` (green-tinted rgba). Tailwind: `border-border`, `border-green-500/20`, `border-amber-200`.
- **Text hierarchy:** `--text-primary`, `--text-secondary`, `--text-muted`, `--text-ghost`. Tailwind: `text-foreground`, `text-muted-foreground`.
- **Glows:** `--glow-green-sm/md/lg`, `--glow-gold-sm` for focus/active states and hero elements.

### Typography

- **Fonts:** Syne (headings), DM Sans (body), DM Mono (numbers/code) — see `index.html` Google Fonts. Negotiation-style screens use Bebas Neue (display) + DM Sans + JetBrains Mono.
- **Hero / high-impact:** Large, bold titles; letter-spacing; optional `.font-display` for numbers or short labels.

### Motion & immersion

- **Entrance:** Staggered fade-up (`fade-up`, `agro-fadeUp`), subtle translateY + opacity. Use Framer Motion `initial={{ opacity: 0, y: 12 }}` `animate={{ opacity: 1, y: 0 }}` with short stagger on list items.
- **Loading / live:** Subtle pulse (`pulse-dot`, `agro-pulse`, `arena-live-dot`), small bounce on typing indicators. Prefer `animate-spin` for spinners with `text-primary` or `text-green-600`.
- **Glow on focus/CTA:** Soft green glow on primary buttons (`agro-glow`, `hero-cta-main`). Hover: slight scale (e.g. `scale(1.02)`), stronger shadow.
- **Full-screen hero:** Use `.hero-immersive` for landing-style sections: radial green gradient, light sweep (`heroLightSweep`), optional rings/cards/particles. Content in `.hero-content` with `.hero-title`, `.hero-kicker`, `.hero-subtitle`, `.hero-cta-main`, `.hero-pill`.
- **Modals / overlays:** `backdrop-blur-sm` or `backdrop-blur-md`, `bg-black/65` or `bg-black/50`, rounded-2xl cards, border with green/amber tint. Match WeightEstimatorModal: green-50/200 result cards, amber for tips/warnings.

### Technical polish

- **Radii:** Use `--radius`, `rounded-lg`, `rounded-xl`, `rounded-2xl`; pills with `rounded-full`.
- **Shadows:** `--shadow-elegant`, `--shadow-card`; or Tailwind `shadow-lg shadow-green-500/25` for primary CTAs.
- **Focus:** Visible focus ring (`ring-2 ring-ring ring-offset-2` or `focus-within:ring-2 focus-within:ring-green-500`).
- **Transitions:** 150–300 ms for hover/focus; 400–800 ms for layout/numbers (e.g. `agro-countUp`, gauge fill). Prefer `ease-out` or `cubic-bezier(0.34, 1.56, 0.64, 1)` for “pop.”

### Don’t

- Introduce new primary colours (no random blue/purple/red for main actions).
- Use flat, low-contrast blocks without depth (prefer gradient or soft shadow).
- Skip motion on key actions (entrance, success, loading); keep it subtle, not noisy.

---

## 13. Suggested Prompts for Claude (New Feature / Integration)

You or your friend can paste this doc and then ask:

- “Using the AgroScope Integration Guide (AGROSCOPE_INTEGRATION_GUIDE.md), add a new feature: [describe feature]. Add a new page at /my-feature, a new API route GET /api/my-feature that returns [shape], and a function in api.ts. Follow the project’s crop keys and auth.”
- “I have a standalone React component and an Express route that [do X]. Using AGROSCOPE_INTEGRATION_GUIDE.md, integrate them into AgroScope: add the route in server.js, the page and route in App.tsx, and the API call in api.ts. Use the same Tailwind and shadcn patterns as the rest of the app.”

---

## 14. Extra Prompt: Technically Impressive, Immersive & Cinematic UX

**Copy this block when you want new features to feel high-end and on-brand.**

```
When implementing this feature in AgroScope, make it technically impressive and deliver an immersive, cinematic, high-end experience. Follow the project’s existing visual system exactly:

COLOUR: Use only the app palette — primary green (hsl(var(--primary)), Tailwind bg-primary / text-primary / border-primary), the green spectrum from src/index.css (--green-dim through --green-glow), and harvest gold/amber for accents (--accent, bg-amber-50, border-amber-200, text-amber-800, --gold-bright for highlights). Surfaces: --bg-void, --bg-surface, --bg-raised for dark sections; card, muted, background for light. No new primary colours.

MOTION: Entrance with staggered fade-up (opacity + translateY); Framer Motion or CSS animations (fade-up, agro-fadeUp). Loading states: subtle pulse or spin (text-green-600, primary). Primary buttons: soft green glow on focus/hover, slight scale (e.g. 1.02) and stronger shadow. Use existing keyframes from index.css where relevant (glow-pulse, heroLightSweep for hero sections).

DEPTH: Backdrop blur on overlays (backdrop-blur-sm, bg-black/65). Cards with rounded-2xl, border with green/amber tint (border-green-500/20, border-amber-200). Shadows: --shadow-elegant or shadow-lg shadow-green-500/25 for CTAs.

HERO / LANDING SECTIONS: If the feature has a full-screen or hero moment, use the existing .hero-immersive pattern from index.css (radial green gradient, optional light sweep, .hero-content, .hero-title, .hero-kicker, .hero-cta-main, .hero-pill). Typography: Syne / DM Sans / DM Mono; for display numbers or short labels consider Bebas Neue like the negotiation arena.

TECHNICAL POLISH: Visible focus rings (ring-2 ring-ring or focus-within:ring-green-500). Transitions 150–300 ms for interactions; 400–800 ms for count-ups or gauges. Use Tailwind + existing CSS variables and classes; avoid one-off hex values for primary/accent. Keep animations subtle and purposeful — no flashy or distracting motion.

Reference files: src/index.css (variables, keyframes, .hero-*, .negotiation-arena, .agro-*), tailwind.config.ts (theme extends), and existing pages like Input.tsx and WeightEstimatorModal.tsx for patterns. The result should feel like a natural extension of AgroScope, not a different app.
```

Keep this file updated when you add new routes or change behavior so the next integration stays consistent.
