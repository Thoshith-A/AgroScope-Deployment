# AgroScope Backend – New Modules & API

## Updated Architecture (High Level)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React / Vite)                        │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXPRESS BACKEND (Node.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ auth        │  │ provisions  │  │ orders      │  │ price           │  │
│  │ profile     │  │ matchmaking │  │ notifications│  │ startup/:id/    │  │
│  │ crops       │  │ waste       │  │             │  │   rating        │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │ farmer/:id/    │  │
│                                                       │   rating       │  │
│  ┌─────────────────────────────────────────────────┐  │ forecast/      │  │
│  │ NEW: price, startupRating, farmerRating,        │  │   next-30-days  │  │
│  │      forecast, carbon, recommendations         │  │ carbon/simulate│  │
│  └─────────────────────────────────────────────────┘  │ recommendations│  │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │ Services     │  │ Models       │  │ MongoDB      │
            │ (price,      │  │ MarketPrice  │  │ (existing +  │
            │  ratings,    │  │ StartupRating│  │  new         │
            │  forecast,   │  │ FarmerRating │  │  collections)│
            │  carbon,     │  │ Order        │  │              │
            │  recommend.) │  │ Provision    │  │              │
            └──────────────┘  └──────────────┘  └──────────────┘
```

---

## DB Schema Changes (MongoDB / Mongoose)

### New collections

| Collection       | Purpose |
|------------------|--------|
| `marketprices`   | Fair price: `waste_type`, `state`, `avg_price_per_kg`, `source`, `last_updated` (unique on waste_type + state) |
| `startupratings` | Startup rating: `startup_id`, `avg_payment_time_days`, `avg_delivery_time_days`, `transaction_success_rate`, `final_rating`, `last_calculated_at` |
| `farmerratings`  | Farmer rating: `farmer_id`, `avg_quality_grade`, `avg_moisture_percent`, `rejection_rate`, `final_rating`, `last_calculated_at` |

### Extended `orders`

Optional fields added (existing behaviour unchanged):

- `paymentCompletedAt` (Date)
- `deliveryCompletedAt` (Date)
- `qualityGrade` (Number 0–10)
- `moisturePercent` (Number 0–100)
- `rejected` (Boolean)

---

## New API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/price/evaluate` | Fair price: compare user price with market |
| GET    | `/api/startup/:id/rating` | Startup rating (payment, delivery, success) |
| GET    | `/api/farmer/:id/rating` | Farmer rating (quality, moisture, rejection) |
| GET    | `/api/forecast/next-30-days` | 30-day supply forecast |
| POST   | `/api/carbon/simulate` | Carbon credit simulator |
| GET    | `/api/recommendations/:wasteType` | Waste-to-product suggestions |
| PATCH  | `/api/orders/:id/fulfill` | Mark order fulfilled (optional rating data) |

---

## Sample Request / Response

### 1. POST /api/price/evaluate

**Request:**

```json
{
  "wasteType": "Paddy Husk",
  "pricePerKg": 2.5
}
```

**Response (200):**

```json
{
  "status": "fair",
  "label": "At Market Price",
  "color": "green",
  "marketPrice": 2.2,
  "userPricePerKg": 2.5,
  "differencePercent": 13.64,
  "lastUpdated": "2025-02-19T12:00:00.000Z"
}
```

---

### 2. GET /api/startup/{id}/rating

**Response (200):**

```json
{
  "_id": "...",
  "startup_id": "...",
  "avg_payment_time_days": 3.5,
  "avg_delivery_time_days": 7,
  "transaction_success_rate": 0.85,
  "total_transactions": 20,
  "final_rating": 4.2,
  "last_calculated_at": "2025-02-19T12:00:00.000Z"
}
```

---

### 3. GET /api/forecast/next-30-days

**Response (200):**

```json
{
  "predictedQuantityKg": 15000,
  "confidenceLevel": 0.72,
  "trend": "up",
  "dataPoints": 14,
  "movingAvgPerDayKg": 500,
  "dailyBreakdown": [
    { "day": 1, "predictedKg": 500, "lowerBound": 400, "upperBound": 600 },
    ...
  ]
}
```

---

### 4. POST /api/carbon/simulate

**Request:**

```json
{
  "wasteType": "Sugarcane Bagasse",
  "quantityTons": 10
}
```

**Response (200):**

```json
{
  "wasteType": "Sugarcane Bagasse",
  "quantityTons": 10,
  "co2SavedTons": 19,
  "equivalentTrees": 950,
  "carbonCreditsEarned": 1.9
}
```

---

### 5. GET /api/recommendations/Paddy%20Husk

**Response (200):**

```json
{
  "wasteType": "Paddy Husk",
  "normalizedType": "paddy husk",
  "products": ["Biogas", "Compost", "Animal feed", "Biochar", "Silica extraction"]
}
```

---

### 6. PATCH /api/orders/:id/fulfill (optional rating data)

**Request:**

```json
{
  "paymentCompletedAt": "2025-02-20T10:00:00.000Z",
  "deliveryCompletedAt": "2025-02-22T14:00:00.000Z",
  "qualityGrade": 8,
  "moisturePercent": 12,
  "rejected": false
}
```

**Response (200):** `{ "message": "Order fulfilled", "order": { ... } }`

---

## Seed & Swagger

- **Seed (MarketPrice):** From `server`: `npm run seed` (requires `MONGODB_URI`).
- **Swagger UI:** After `npm install`, run the server and open `http://localhost:5000/api-docs`.
