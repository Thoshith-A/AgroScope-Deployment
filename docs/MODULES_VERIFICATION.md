# AgroScope – New Modules Verification

## 1. Backend structure

```
server/
├── config/
│   ├── swagger.cjs
│   └── swagger.js
├── models/
│   ├── MarketPrice.js      ✔ Fair Price
│   ├── StartupRating.js   ✔ Startup Rating
│   ├── FarmerRating.js    ✔ Farmer Rating
│   ├── Order.js           (extended with rating fields)
│   ├── Provision.js
│   ├── Farmer.js
│   ├── Startup.js
│   └── User.js
├── routes/
│   ├── price.js           ✔ POST /api/price/evaluate
│   ├── startupRating.js   ✔ GET /api/startup/:id/rating
│   ├── farmerRating.js    ✔ GET /api/farmer/:id/rating
│   ├── forecast.js        ✔ GET /api/forecast/next-30-days
│   ├── carbon.js          ✔ POST /api/carbon/simulate
│   ├── recommendations.js ✔ GET /api/recommendations/:wasteType
│   ├── orders.js          (PATCH /api/orders/:id/fulfill for rating data)
│   └── ...
├── services/
│   ├── priceEvaluationService.js
│   ├── startupRatingService.js
│   ├── farmerRatingService.js
│   ├── forecastService.js
│   ├── carbonCalculatorService.js
│   └── recommendationService.js
├── utils/
│   ├── validation.js
│   └── errorHandler.js
├── scripts/
│   └── seed.js            (MarketPrice seed)
└── server.js              (all routes registered)
```

There are no separate “controller” or “repository” layers; **routes call services directly**, and **services use Mongoose models** (no extra repository). This matches the existing backend style.

---

## 2. Database (MongoDB) collections

| Collection        | Used by              | Key fields |
|-------------------|----------------------|------------|
| **marketprices**  | Fair Price           | waste_type, average_price_per_kg, last_updated |
| **startupratings** | Startup Rating     | startup_id, avg_payment_time_days, avg_delivery_time_days, transaction_success_rate, final_rating |
| **farmerratings** | Farmer Rating       | farmer_id, avg_quality_grade, avg_moisture_percent, rejection_rate, final_rating |
| **orders**        | Ratings + Forecast   | + paymentCompletedAt, deliveryCompletedAt, qualityGrade, moisturePercent, rejected |

Seed: run `npm run seed` from `server/` (requires `MONGODB_URI`) to populate **marketprices**.

---

## 3. API endpoints (working)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST   | /api/price/evaluate | No  | Fair price: body `{ wasteType, pricePerKg }` |
| GET    | /api/startup/:id/rating | No* | Startup rating (default if invalid id) |
| GET    | /api/farmer/:id/rating  | No* | Farmer rating (default if invalid id) |
| GET    | /api/forecast/next-30-days | No | 30-day supply forecast |
| POST   | /api/carbon/simulate | No  | Carbon: body `{ wasteType, quantityTons }` |
| GET    | /api/recommendations/:wasteType | No | Waste-to-product list |
| PATCH  | /api/orders/:id/fulfill | Yes | Mark fulfilled + optional rating fields |

\*Rating endpoints are public; frontend sends user id from profile/localStorage.

---

## 4. Frontend structure

```
src/
├── lib/
│   └── api.ts             ✔ evaluatePrice, getStartupRating, getFarmerRating,
│                           getForecastNext30Days, simulateCarbon, getRecommendations
├── components/
│   └── StarRating.tsx     ✔ 1–5 stars for profile
├── pages/
│   ├── Input.tsx          ✔ Price check, Carbon block, Recommendations block
│   ├── Profile.tsx        ✔ Rating badge (farmer/startup)
│   ├── Home.tsx           ✔ Links: Forecast, Carbon, Recommendations
│   ├── Forecast.tsx       ✔ GET forecast, chart (recharts)
│   ├── CarbonSimulator.tsx ✔ Form → POST carbon → show result
│   └── Recommendations.tsx ✔ Select waste → GET recommendations → list
└── App.tsx                ✔ Routes: /forecast, /carbon, /recommendations
```

---

## 5. Checklist per module

| Module | Controller/Route | Service | DB/Model | API | Frontend page | Nav link | API→UI |
|--------|------------------|--------|----------|-----|----------------|----------|--------|
| Fair Price | ✔ price.js | ✔ priceEvaluationService | ✔ MarketPrice | ✔ POST /api/price/evaluate | ✔ Input (price + Check) | Home → Input | ✔ |
| Startup Rating | ✔ startupRating.js | ✔ startupRatingService | ✔ StartupRating | ✔ GET /api/startup/:id/rating | ✔ Profile (stars) | Profile | ✔ |
| Farmer Rating | ✔ farmerRating.js | ✔ farmerRatingService | ✔ FarmerRating | ✔ GET /api/farmer/:id/rating | ✔ Profile (stars) | Profile | ✔ |
| 30-Day Forecast | ✔ forecast.js | ✔ forecastService | Provision/Order | ✔ GET /api/forecast/next-30-days | ✔ Forecast.tsx + chart | Home “30-Day Forecast” | ✔ |
| Carbon Simulator | ✔ carbon.js | ✔ carbonCalculatorService | - | ✔ POST /api/carbon/simulate | ✔ CarbonSimulator + Input block | Home “Carbon Simulator” | ✔ |
| Recommendations | ✔ recommendations.js | ✔ recommendationService | - | ✔ GET /api/recommendations/:wasteType | ✔ Recommendations + Input block | Home “Recommendations” | ✔ |

---

## 6. How to test APIs (sample)

**Fair price**

```bash
curl -X POST http://localhost:5000/api/price/evaluate -H "Content-Type: application/json" -d "{\"wasteType\":\"Paddy Husk\",\"pricePerKg\":2.5}"
```

**Carbon**

```bash
curl -X POST http://localhost:5000/api/carbon/simulate -H "Content-Type: application/json" -d "{\"wasteType\":\"Sugarcane Bagasse\",\"quantityTons\":10}"
```

**Recommendations**

```bash
curl http://localhost:5000/api/recommendations/Paddy%20Husk
```

**Forecast**

```bash
curl http://localhost:5000/api/forecast/next-30-days
```

**Startup/Farmer rating** (use any string for demo; real ObjectId when DB is used)

```bash
curl http://localhost:5000/api/farmer/demo@email.com/rating
curl http://localhost:5000/api/startup/startup@email.com/rating
```

---

## 7. Ratings after transactions

- When an order is **accepted** (`POST /api/orders/:id/accept`), the backend runs `recalcRatingsBackground(farmerId, startupId)` so both ratings are updated.
- When an order is **fulfilled** (`PATCH /api/orders/:id/fulfill` with optional `paymentCompletedAt`, `deliveryCompletedAt`, `qualityGrade`, `moisturePercent`, `rejected`), ratings are recalculated again.

So ratings **do** update automatically after these transactions.

---

## 8. Screenshots (what you should see)

- **Home**: “Tools & Insights” with three buttons – 30-Day Forecast, Carbon Simulator, Recommendations.
- **Input** (/input): Optional “Price per kg” + “Check price” (green/red/blue label), “Carbon impact” (Calculate → CO₂, trees, credits), “Suggested products” chips.
- **Profile**: “Rating” with star component next to “Edit Profile”.
- **Forecast** (/forecast): Three summary cards (Predicted kg, Confidence, Trend) and an area chart of daily trend.
- **Carbon** (/carbon): Form (waste type + tons) → Calculate → Results (CO₂ saved, equivalent trees, carbon credits).
- **Recommendations** (/recommendations): Dropdown + “Get recommendations” → list of products.

No actual screenshots are stored in the repo; run the app and open the above routes to confirm.
