# Market Price Module – Clean architecture (database only)

Layers: **Controller → Service → Repository → Database**. No external API, no scheduler.

---

## Entity: MarketPrice

- `id` (ObjectId, auto)
- `wasteType` (String, required)
- `state` (String, required)
- `avgPricePerKg` (Number, required)
- `source` (String)
- `lastUpdated` (Date)

Unique constraint: `(wasteType, state)`.

---

## DTOs

- **MarketPriceRequest:** wasteType, state, avgPricePerKg, source  
- **MarketPriceResponse:** wasteType, state, marketPrice, source, lastUpdated  
- **PriceComparisonResponse:** wasteType?, state?, marketPrice?, userPrice?, status, source?, lastUpdated? — or `{ status: "NOT_CONFIGURED" }`

---

## Endpoints

### POST /api/market-price

Save or update. Body: `{ wasteType, state, avgPricePerKg, source }`.  
Returns **MarketPriceResponse**. 400 on validation error.

### GET /api/market-price?wasteType=&state= (or location=)

Get by wasteType + state. Returns **MarketPriceResponse**. 404 if not found.

### GET /api/market-price/compare?wasteType=&state=&userPrice= (or location=)

Compare user price with market.  
Returns **PriceComparisonResponse** (status: ABOVE_MARKET | BELOW_MARKET | FAIR_PRICE | NOT_CONFIGURED).

Example (configured):

```json
{
  "wasteType": "Paddy Husk",
  "state": "Tamil Nadu",
  "marketPrice": 5.50,
  "userPrice": 6.00,
  "status": "ABOVE_MARKET",
  "source": "Admin - Jan 2026",
  "lastUpdated": "2026-01-15T10:30:00.000Z"
}
```

Example (not configured):

```json
{ "status": "NOT_CONFIGURED" }
```

---

## Exception handling

- **MarketPriceNotFoundException** → 404  
- **ValidationError** → 400  
- Global handler: `apiErrorHandler` (ControllerAdvice-style).

---

## Seed

On startup, if the collection is empty, five default rows are inserted (Paddy Husk, Wheat Straw, Corn Stalks, Sugarcane Bagasse, Coconut Shells for Tamil Nadu). No duplicates (upsert by wasteType + state).  
Manual seed: `npm run seed` from `server/`.
