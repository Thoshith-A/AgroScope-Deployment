# AgroScope — Project Brief for AI Assistants (Claude, etc.)

Use this document to understand the project and suggest accurate, non-breaking improvements.

---

## 1. What AgroScope Is

**AgroScope** is a **circular economy / agricultural waste** web app that connects:
- **Farmers** (sellers): list crop waste (type, quantity, location), get valuation, see predicted supply and carbon impact.
- **Startups/Buyers**: search for crop waste by type/quantity/location, see matched farmers, request provisions.

It is built for **demos and hackathons**: runs without MongoDB (in-memory/demo mode), uses hardcoded demo users and display values, and avoids empty states so the UI always shows something useful.

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite 5, React Router 6, Tailwind CSS, Radix UI (shadcn), Recharts, Framer Motion, React Three Fiber (3D on Forecast) |
| **Backend** | Node.js, Express, ES modules |
| **Database** | MongoDB (optional); app works without it via in-memory storage and demo logic |
| **Auth** | JWT only; no DB lookup in demo mode. Token in `Authorization: Bearer <token>`, user in `localStorage` as `user` and `authToken`. |

**Run commands:**
- Backend: `cd server && npm start` (default port **5000**)
- Frontend: `npm run dev` (Vite, default port **5173**; proxy `/api`, `/login`, `/register` → 5000)

---

## 3. User Roles (Exact Strings)

The app has exactly two roles. Use these **exact** strings everywhere (APIs, localStorage, conditionals):

- **`farmer`** — can create provisions, see “My Provisions” (inventory), get waste valuation.
- **`startup`** — can search for matches (“Find the Nearest Farmer”), see startup matches, request provisions from farmers.

Role is stored in:
- JWT payload: `{ userId, email, role }`
- `localStorage.user` (JSON): `{ id, email, role, name?, company_name? }`
- Backend: `req.user.role` after `requireAuth` middleware

**Do not** introduce `buyer`, `Farmer`, `Startup`, or other role strings unless the whole codebase is updated.

---

## 4. Demo / Hardcoded Data (Do Not Replace With Real Logic in Demos)

### 4.1 Demo login (server/routes/auth.js)

- **Farmer:** `f1@gmail.com` / `farmer` → role `farmer`, name “Demo Farmer”.
- **Startup:** `east@argo` / `east@argo` → role `startup`, name “East Argo Startup”, company “East Argo Technologies”.

Other emails: role inferred (e.g. email contains “startup” → startup, else farmer). No DB; JWT signed with `JWT_SECRET` (env or default).

### 4.2 Crop waste types (everywhere)

Exactly five types (labels matter for UI and APIs):

- `Paddy Husk`
- `Wheat Straw`
- `Corn Stalks`
- `Sugarcane Bagasse`
- `Coconut Shells`

Used in: `/api/crops/types`, forecast, price, recommendations, cold storage, provisions.

### 4.3 Predicted Next 30 Days Supply (server/services/forecastService.js)

**Display-only** values per crop (no DB, no real prediction):

| Crop | Tons | Confidence |
|------|------|------------|
| Paddy Husk | 5.50 | 85% |
| Wheat Straw | 4.20 | 80% |
| Corn Stalks | 3.80 | 78% |
| Sugarcane Bagasse | 8.90 | 88% |
| Coconut Shells | 2.60 | 75% |

API: `GET /api/forecast/:wasteType` → `{ predictedNext30Days, confidencePercent, wasteType, ... }`.

### 4.4 Nearest Cold Storage Hub (dropdown only)

Hub list (same on farmer and startup flows):

- Chennai, Mumbai, Delhi, Bengaluru, Hyderabad, Kolkata, Pune, Ahmedabad, Jaipur, Surat.

Stored in frontend only (e.g. `COLD_STORAGE_HUBS` in Input.tsx and StartupInput.tsx). No distance calculation in current demo.

### 4.5 Market price / status (from price per kg)

- **&lt; 50 ₹/kg** → “Below Market Price”
- **50–100** → “Current Market Price”
- **&gt; 100** → “Above Market Price”

Computed on frontend from the “Price per kg” field; optional “Check price” calls backend for reference.

### 4.6 Provisions (farmer inventory)

- **Storage:** In-memory array `DEMO_PROVISIONS` in `server/routes/provisions.js` (no MongoDB required).
- **Create:** `POST /api/provisions` (farmer only): body `wasteType`, `quantityTons`, `location` (optional: price, wasteQualityGrade, moisturePercentage). Defaults: empty location → “Not specified”, missing quantity → 0, missing wasteType → “Other”.
- **List mine:** `GET /api/provisions/my` (farmer only): returns `{ provisions: [] }` filtered by `req.user.userId`. On error still returns 200 and `[]`.

---

## 5. Main Frontend Routes and Purpose

| Route | Page | Who | Purpose |
|-------|------|-----|--------|
| `/` | Redirect | — | → `/home` |
| `/home` | Home | All | Landing; role-based CTA (farmer → /input, startup → /startup-input) |
| `/input` | Input (farmer) | Farmer | Waste type, quantity, location, nearest hub, price, quality, moisture, forecast, carbon, suggestions; **Finish** → POST provision then redirect to `/farmer-inventory` |
| `/startup-input` | Startup Input | Startup | Crop need, quantity, location, hub, price, carbon, suggestions; **Find the Nearest Farmer** → GET matches then redirect to `/farmer-inventory` |
| `/farmer-inventory` | FarmerInventory | Farmer | “My Provisions” list from `GET /api/provisions/my` |
| `/startup-matches` | StartupMatches | Startup | Matched farmers (when not redirecting to inventory); request provision → POST /api/orders |
| `/profile` | Profile | All | View/edit profile, role-based fields |
| `/notifications` | Notifications | All | Role-based notifications |
| `/forecast` | Forecast | All | Lazy-loaded; 30-day supply forecast UI |
| `/carbon` | CarbonSimulator | All | Lazy-loaded; carbon impact |
| `/recommendations` | Recommendations | All | Lazy-loaded; product suggestions |
| `/results` | Results | All | Results view |
| `/dashboard` | Dashboard | All | Dashboard |
| `/login` | (Login via AuthModal) | — | Modal or dedicated; uses `/login` (proxied to backend) |

---

## 6. Backend API Summary (All under `/api` unless noted)

- **Auth:** `POST /login`, `POST /register` (also at `/login`, `/register` via proxy). Auth routes: `server/routes/auth.js`.
- **Provisions:** `POST /api/provisions`, `GET /api/provisions/my` — `server/routes/provisions.js`.
- **Forecast:** `GET /api/forecast/:wasteType` — `server/services/forecastService.js` (hardcoded FINAL_FORECAST).
- **Price:** `POST /api/price/evaluate` — price evaluation and market status.
- **Carbon:** `POST /api/carbon/simulate` — carbon impact from waste type + quantity.
- **Recommendations:** `GET /api/recommendations/:wasteType` — product suggestions.
- **Waste/Matches:** `GET /api/waste/matches?needType=&quantityTons=&latitude=&longitude=` — startup only; returns `{ matches: [] }` (DB or empty on failure).
- **Orders:** `POST /api/orders` (startup requests provision), accept/fulfill by other routes.
- **Crops:** `GET /api/crops/types` — list of crop waste types.
- **Cold storage:** `GET /api/cold-storage/nearest?location=` — optional; distance logic exists but hub dropdown is frontend-only in current demo.
- **Notifications:** Notifications API for orders/requests.
- **Profile, market-price, farmer/startup ratings:** Various under `/api/profile`, `/api/market-price`, `/api/farmer`, `/api/startup`, etc.

**Important:** Many APIs are designed to **never** return 500 for demo: they return 200 with empty or default data (e.g. `[]`, default forecast, default price) so the UI never shows “Failed to load” for critical flows.

---

## 7. Demo Mode

- **Config:** `server/config/demoMode.js` — `DEMO_MODE = process.env.DEMO_MODE !== 'false'`.
- When true: missing data is filled with sensible defaults; no “empty state” errors for forecast, market price, or provisions list.
- When suggesting changes, preserve “demo-safe” behavior unless the user explicitly asks for production behavior (DB-only, no hardcoded users, etc.).

---

## 8. Frontend Patterns

- **Auth:** Token and user from login/register stored in `localStorage` (`authToken`, `user`). No global auth context in the brief; components read `localStorage` and `user.role` for role-based UI.
- **API base URL:** Relative (`''` or `/api`), so Vite proxy is used in dev. Do not hardcode `localhost:5000` in frontend.
- **UI:** shadcn-style components under `src/components/ui`; Tailwind; `@/` alias for `src/`.
- **Forms:** Farmer and startup inputs validate required fields (waste type, quantity &gt; 0, location) before submit; backend also applies defaults so that provision save rarely fails with “required” errors.

---

## 9. What to Avoid When Suggesting Changes

- **Do not** change role strings to something other than `farmer` / `startup` without updating all role checks (backend + frontend).
- **Do not** remove or replace demo users (`f1@gmail.com`, `east@argo`) without updating the auth flow and any docs/tests that rely on them.
- **Do not** make forecast or cold-storage depend on a real external API or DB for the **demo** flow unless the user asks for it.
- **Do not** break “no empty state” behavior: avoid returning 500 or empty responses for core flows (provisions list, forecast, matches) when the app is in demo mode.
- **Do not** add new required request body fields to provision create without updating the frontend (Input.tsx) and the backend defaults.
- **Do not** change the JWT payload shape (`userId`, `email`, `role`) or the login response shape (`token`, `user: { id, email, role, name?, company_name? }`) without updating frontend and any middleware that read them.

---

## 10. Files That Define “Source of Truth”

| Concern | Files |
|--------|--------|
| Auth & demo users | `server/routes/auth.js` |
| JWT secret & verification | `server/middleware/auth.js` |
| Forecast display values | `server/services/forecastService.js` |
| Provisions (in-memory) | `server/routes/provisions.js` |
| Crop types | Backend: `server/routes/crops.js`; frontend: fallback in Input.tsx, StartupInput.tsx |
| Cold storage hub list | Frontend: `COLD_STORAGE_HUBS` in Input.tsx, StartupInput.tsx |
| Demo mode flag | `server/config/demoMode.js` |
| Routes (backend) | `server/server.js` |
| Routes (frontend) | `src/App.tsx` |
| API client helpers | `src/lib/api.ts` |
| Login modal | `src/components/AuthModal.tsx` |

---

## 11. Quick Checklist for Improvement Prompts

When suggesting improvements, ensure:

- [ ] Role checks use `role === 'farmer'` or `role === 'startup'` only.
- [ ] Demo credentials and FINAL_FORECAST / cold storage lists are unchanged unless the user asks.
- [ ] New APIs or fields do not break existing payloads (e.g. provisions create, login response).
- [ ] Failed or missing data in demo mode still returns 200 with safe defaults where possible.
- [ ] Frontend and backend both updated if request/response shapes change.
- [ ] No hardcoded `localhost` in frontend; use relative URLs or env.
- [ ] Auth: JWT secret and payload shape stay consistent with `server/middleware/auth.js` and `server/routes/auth.js`.

---

*This brief is for AI assistants (e.g. Claude) to give accurate, context-aware improvement prompts and code changes for AgroScope without breaking demo or hackathon behavior.*
