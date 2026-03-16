# AgroScope — Full Project Overview (for Improvement Prompts)

Use this document to craft prompts for Claude (or any AI) to improve the project. Copy sections or the “Suggested prompts” at the end into your assistant.

---

## 1. What the Project Is

**AgroScope** is a **crop waste marketplace and insights platform** for India. It connects **farmers** (who supply crop residue: paddy husk, wheat straw, corn stalks, sugarcane bagasse, coconut shells) with **startups/buyers**, and provides:

- **Supply forecasting** (30-day predicted supply by city and crop)
- **Satellite-based crop health** (NDVI-style analysis on a map)
- **Local ML weight estimation** from photos (TensorFlow.js: COCO-SSD + MobileNet + HSV/texture)
- **Carbon impact simulation** and **product recommendations** for crop waste
- **Cold storage hub** selection (10 Indian cities)
- **Demo auth** (farmer vs startup roles) and **provisions/inventory** flows

Target: hackathon/demo; runs without MongoDB (in-memory/demo mode). Frontend on **Vite + React + TypeScript**; backend on **Node.js + Express**.

---

## 2. Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, Vite 5, TypeScript, React Router 6, Tailwind CSS, Radix UI (shadcn), Framer Motion, Recharts, Leaflet, TanStack Query |
| **3D / ML (browser)** | Three.js, @react-three/fiber, @react-three/drei (optional); TensorFlow.js, @tensorflow-models/coco-ssd, @tensorflow-models/mobilenet |
| **Backend** | Node.js, Express (ESM), optional Mongoose/MongoDB Atlas |
| **Auth** | JWT in `localStorage`; demo users: `f1@gmail.com` / `farmer`, `east@argo` / `east@argo` (startup) |
| **Proxy** | Vite dev: `/api`, `/login`, `/register` → `http://localhost:5000` |

---

## 3. Repo Structure (Important Paths)

```
AgroScope_Project_Final/
├── src/
│   ├── App.tsx                 # Routes (see list below)
│   ├── main.tsx
│   ├── lib/
│   │   ├── api.ts              # Central API client (forecast, price, carbon, recommendations, cold storage)
│   │   └── cropIcons.tsx       # CROP_WASTE_CONFIG, CropBadge
│   ├── pages/
│   │   ├── Home.tsx            # Landing + opening animation (sessionStorage once)
│   │   ├── Input.tsx           # Farmer input form (waste type, quantity, location, forecast, satellite, weight estimator)
│   │   ├── StartupInput.tsx    # Startup “find farmer” form; redirects to /farmer-inventory
│   │   ├── Forecast.tsx        # 30-day supply forecast by city + crop (uses getForecastNext30Days)
│   │   ├── CarbonSimulator.tsx # Carbon impact
│   │   ├── Recommendations.tsx # Suggested products for waste type
│   │   ├── FarmerInventory.tsx # List provisions (role-based: farmer = own, startup = all)
│   │   ├── Profile.tsx, Notifications.tsx, StartupMatches.tsx, Results.tsx, Dashboard.tsx, NotFound.tsx
│   ├── components/
│   │   ├── OpeningAnimation.tsx   # CSS-only intro (no Three.js to avoid crashes)
│   │   ├── AuthModal.tsx           # Login/Register + demo quick-fill buttons
│   │   ├── CropDetectButton.tsx    # Filename → crop type for “Detect via Camera”
│   │   ├── SatelliteDetectModal.tsx # Leaflet map, “Use Current Location”, Analyze Sector → /api/crop-monitor/analyze
│   │   ├── WeightEstimatorModal.tsx # Camera/upload → local TF.js pipeline (COCO-SSD, indoor, HSV/MobileNet), weight estimate
│   │   ├── 3d/ ForecastChartScene.tsx, HeroScene.tsx
│   │   └── ui/                    # shadcn components
├── server/
│   ├── server.js              # Express app, CORS, route mounts, health, Swagger
│   ├── config/
│   │   └── demoMode.js        # DEMO_MODE (env: DEMO_MODE=false to disable)
│   ├── data/
│   │   └── locationForecastData.js  # LOCATION_FORECAST_CONFIG (10 cities), calculateForecast(city, wasteType)
│   ├── routes/
│   │   ├── auth.js            # POST /login, /register; DEMO_USERS first, then JWT
│   │   ├── forecast.js        # GET /next-30-days?city=&wasteType=, GET /:wasteType, POST /records
│   │   ├── cropMonitor.js     # POST /analyze (mock NDVI by lat/lon)
│   │   ├── weightEstimator.js # Optional: proxy to external API (frontend uses local ML)
│   │   ├── provisions.js      # GET /, GET /my, POST / (in-memory DEMO_PROVISIONS)
│   │   ├── coldStorage.js     # GET /nearest?location=
│   │   ├── price.js, marketPrice.js, carbon.js, recommendations.js, profile.js, notifications.js, orders.js, waste.js, crops.js, etc.
│   ├── services/
│   │   └── forecastService.js # get30DayForecast (FINAL_FORECAST by crop), createSupplyRecord
│   └── middleware/auth.js     # requireAuth, JWT
├── vite.config.ts             # port 5173, proxy /api, /login, /register → 5000
├── package.json               # Frontend deps (React, Vite, TF.js, Leaflet, Recharts, etc.)
└── server/package.json        # Backend deps (express, mongoose, jwt, bcryptjs, multer, etc.)
```

---

## 4. Routes (Frontend)

| Path | Page | Purpose |
|------|------|---------|
| `/` | Redirect | → `/home` |
| `/home` | Home | Landing, opening animation once |
| `/input` | Input | Farmer: waste type, quantity, location, forecast strip, satellite “Detect Now”, weight estimator, Save & Sync → /farmer-inventory (instant) |
| `/startup-input` | StartupInput | Startup: need type, etc.; “Find Nearest Farmer” → /farmer-inventory |
| `/forecast` | Forecast | City + crop dropdown → 30-day chart (API: next-30-days) |
| `/carbon` | CarbonSimulator | Carbon simulation |
| `/recommendations` | Recommendations | Product suggestions by waste type |
| `/farmer-inventory` | FarmerInventory | Provisions list (role-based API) |
| `/profile`, `/notifications`, `/startup-matches`, `/results`, `/dashboard` | Various | Profile, notifications, matches, results, dashboard |
| `*` | NotFound | 404 |

---

## 5. Backend API (Summary)

- **Auth:** `POST /login`, `POST /register` (also at root via `app.use('/', authRoutes)`). Demo users in `server/routes/auth.js` (DEMO_USERS).
- **Forecast:**  
  - `GET /api/forecast/next-30-days?city=Chennai&wasteType=paddy_husk` → uses `server/data/locationForecastData.js` `calculateForecast()`.  
  - **Important:** Backend expects `wasteType` as **snake_case key** (e.g. `paddy_husk`). If the client sends a label like `"Paddy Husk"`, the config lookup fails and `predictedQuantityKg` can be 0.
- **Crop monitor:** `POST /api/crop-monitor/analyze` body `{ lat, lon }` → mock NDVI/health (no real satellite).
- **Provisions:** `GET /api/provisions` (startup: all), `GET /api/provisions/my` (farmer: own), `POST /api/provisions` (farmer, requireAuth).
- **Cold storage:** `GET /api/cold-storage/nearest?location=...` → hub + distance.
- **Price, market price, carbon, recommendations:** Used by Input and other pages via `src/lib/api.ts`.

Frontend API client: `src/lib/api.ts` (getForecastNext30Days, evaluatePrice, simulateCarbon, getRecommendations, getNearestColdStorage, etc.). All use relative `/api/...` so Vite proxy hits the backend.

---

## 6. Key Features (How They Work)

- **30-day forecast (Input page):** Dropdown waste type → `getForecastByWasteType(wasteType)` (GET `/api/forecast/:wasteType`) for the strip; backend uses `forecastService.js` FINAL_FORECAST (e.g. Paddy Husk 5.5 t, 85%).
- **Forecast page:** City + crop (key: `paddy_husk`, etc.) → `getForecastNext30Days({ city, wasteType })` → GET `/api/forecast/next-30-days` → `locationForecastData.calculateForecast()`. Response: `predictedQuantityKg`, `dailyBreakdown`, `confidenceLevel`, etc. Chart uses `dailyBreakdown`.
- **Satellite “Detect Now”:** Modal with Leaflet map; user picks point or “Use Current Location”; “Analyze Sector” → POST `/api/crop-monitor/analyze` with lat/lon → mock health/NDVI; “Apply to Form” fills quality/moisture/location on Input.
- **Weight estimator:** “Estimate Weight via Camera” → WeightEstimatorModal: upload/capture image → **fully local** TensorFlow.js: COCO-SSD (reject non-crop objects), indoor-scene heuristic, HSV + MobileNet crop identification, bulk-density-based weight and range. No external API. Result applied to Quantity on Input.
- **Crop detect (filename):** CropDetectButton: image filename parsed to crop type and used to set waste type dropdown.
- **Cold storage:** Dropdown of 10 cities (no live geolocation API). Optional API `/api/cold-storage/nearest` for hub/distance.
- **Save & Sync / Find Nearest Farmer:** Instant navigation to `/farmer-inventory` (no form submit to API for the redirect itself).

---

## 7. Data Conventions

- **Crop keys (backend config):** `paddy_husk`, `wheat_straw`, `corn_stalks`, `sugarcane_bagasse`, `coconut_shells`.
- **Labels (UI):** “Paddy Husk”, “Wheat Straw”, etc. Backend `locationForecastData.js` has `WASTE_LABELS` and uses keys in `baseSupplyKgPerDay`; `calculateForecast` uses `wasteType` as the key directly — so passing a label yields undefined and zeros.
- **Cities:** Chennai, Mumbai, Delhi, Bengaluru, Hyderabad, Kolkata, Pune, Ahmedabad, Jaipur, Surat (must match keys in `LOCATION_FORECAST_CONFIG`).

---

## 8. Known Limitations / Demo Behavior

- **MongoDB:** Optional. If `MONGODB_URI` is unset or connection fails, server runs without DB; provisions and auth use in-memory/demo logic.
- **Forecast page “Failed to load forecast”:** Can happen if backend is down or if `wasteType` is sent as label instead of key (e.g. `"Paddy Husk"` vs `paddy_husk`), resulting in zero and possibly error handling in UI.
- **Forecast next-30-days response:** Can return `predictedQuantityKg: 0` when `wasteType` does not match config keys (e.g. label sent instead of key). Frontend expects non-zero and chart data.
- **Satellite:** Mock only; no real NDVI/satellite API.
- **Weight estimator:** Local TF.js only; accuracy depends on image quality and crop type; no server-side ML.
- **Ports:** Backend 5000, frontend 5173. If 5000 is in use, backend fails (EADDRINUSE).

---

## 9. Suggested Prompts for Claude to Improve the Project

Copy and adapt these when asking Claude for improvements.

1. **Forecast API robustness**  
   “In AgroScope, the Forecast page calls GET `/api/forecast/next-30-days` with `city` and `wasteType`. The backend `server/data/locationForecastData.js` uses `wasteType` as a key (e.g. `paddy_husk`). If the client sends a label like `Paddy Husk`, the lookup fails and `predictedQuantityKg` is 0. Add server-side normalization: accept both keys (`paddy_husk`) and display labels (`Paddy Husk`) and map them to the same config keys so the forecast page always gets non-zero data when the crop is valid. Document the accepted values.”

2. **Forecast page error handling**  
   “On the AgroScope Forecast page (`src/pages/Forecast.tsx`), when the API returns `predictedQuantityKg: 0` or an error, show a clear message (e.g. ‘No forecast data for this city/crop’ or ‘Check backend and try again’) and a Retry button that refetches with the current city and crop. Ensure the chart doesn’t render with all zeros without explanation.”

3. **API client and types**  
   “In AgroScope `src/lib/api.ts`, the type `LocationForecastResult` has `confidenceLevel: number`. The backend returns a number (0–1). The Forecast page uses it; ensure the UI displays it as a percentage (e.g. 90.72%) and that the type matches the backend response. Add a short JSDoc for `getForecastNext30Days` and `LocationForecastResult` describing the contract.”

4. **Provisions list when backend is down**  
   “In AgroScope, FarmerInventory fetches from GET `/api/provisions` or `/api/provisions/my`. If the request fails (network or 500), show a single clear message like ‘Could not load inventory. Check that the backend is running and try again.’ and avoid showing a generic ‘Failed to load provisions’ without context. Optionally add a Retry button.”

5. **Demo mode and env**  
   “In AgroScope server, `server/config/demoMode.js` exports `DEMO_MODE`. When `DEMO_MODE` is true, ensure all critical API routes (forecast, provisions, auth, crop-monitor) return 200 with sensible demo data or a clear error message, and never throw unhandled exceptions. Add a one-line comment in `server.js` that documents how to disable demo mode (e.g. DEMO_MODE=false).”

6. **Startup vs farmer redirects**  
   “In AgroScope, after ‘Save & Sync to Network’ on Input we navigate to `/farmer-inventory` without waiting for an API response. Confirm that for both farmer and startup roles the navigation is instant and that the provisions list (FarmerInventory) still loads its data on mount. If there is any role-specific redirect (e.g. only startup), document it in a short comment in the Input page.”

7. **Satellite modal and crop monitor**  
   “In AgroScope SatelliteDetectModal, the ‘Analyze Sector’ button calls POST `/api/crop-monitor/analyze` with `{ lat, lon }`. The backend returns mock NDVI/health. Ensure that if the request fails, the modal shows a clear error (e.g. ‘Analysis failed. Check backend.’) and does not apply fake data to the form. Keep the mock when the API succeeds.”

8. **Weight estimator UX**  
   “In AgroScope WeightEstimatorModal, the flow is: upload/capture → local TensorFlow.js analysis → show weight range and apply to form. Improve the UX: (1) show a short ‘Analyzing…’ step with the current stage (e.g. ‘Checking image…’, ‘Estimating weight…’); (2) when the image is rejected (e.g. not crop), show the rejection reason clearly; (3) ensure the ‘Apply to Form’ button is disabled until a successful result is available.”

9. **Backend health and startup**  
   “In AgroScope, the frontend runs on port 5173 and the backend on 5000. Suggest a small improvement: (1) document in README that both servers must be running and how to start them (e.g. `npm run dev` in root, `npm start` in server); (2) optionally add a frontend health check on load or on Forecast page that calls GET `/api/health` and shows a banner if the backend is unreachable, with a ‘Retry’ action.”

10. **Types and tests**  
    “For AgroScope, add minimal TypeScript types or JSDoc for the response of GET `/api/forecast/next-30-days` (dailyBreakdown, predictedQuantityKg, confidenceLevel, etc.) so that the frontend and backend stay in sync. Optionally add one integration test or script that calls the forecast API with city=Chennai and wasteType=paddy_husk and asserts predictedQuantityKg > 0 and dailyBreakdown length 30.”

Use this file as the single source of truth when asking an AI to improve AgroScope: share the whole file or the sections plus one of the prompts above for best results.
