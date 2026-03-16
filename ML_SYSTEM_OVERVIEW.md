# AgroScope Machine Learning System Overview

## 🎯 Overview

AgroScope uses **two main ML models** to power its circular economy platform:

1. **Crop Classification Model** - Predicts crop waste type from location/season data
2. **Matchmaking Model** - Ranks suppliers (farmers) for buyers (startups) based on multiple factors

---

## 📁 ML Service Architecture

The ML service is a **separate FastAPI microservice** running on Python, located at:
- **Path**: `server/ml/app.py`
- **Default Port**: `http://127.0.0.1:8000`
- **Framework**: FastAPI (Python web framework)

### Technology Stack

```python
# Dependencies (server/ml/requirements.txt)
fastapi==0.115.2      # Web framework
uvicorn==0.32.0        # ASGI server
numpy                  # Numerical computing
pandas                 # Data manipulation
scikit-learn           # Machine learning library
joblib                 # Model serialization
```

---

## 🤖 Model 1: Crop Classification Model

### Purpose
Automatically classifies agricultural waste type based on:
- **State** (geographical location)
- **Season** (harvest season)
- **Quantity** (amount in kg)

### Model Type
- **Algorithm**: Scikit-learn classifier (likely Random Forest or similar)
- **File**: `crop_classification_model.pkl`
- **Preprocessing**:
  - **Scaler**: `crop_scaler.pkl` - Standardizes numerical features (quantity)
  - **Encoder**: `crop_encoder.pkl` - One-Hot Encodes categorical features (state, season)
  - **Labels**: `crop_class_labels.json` - Maps class indices to crop names

### Input Features
```python
{
    "state": str,           # e.g., "Tamil Nadu", "Punjab"
    "season": str,          # e.g., "Kharif", "Rabi", "Summer"
    "quantity_kg": float    # Waste quantity in kilograms
}
```

### Processing Pipeline
1. **Numeric Scaling**: Quantity is standardized using StandardScaler
2. **Categorical Encoding**: State and season are one-hot encoded
3. **Feature Concatenation**: Numeric + categorical features combined
4. **Prediction**: Model predicts crop category class index
5. **Label Mapping**: Class index mapped to crop name (e.g., "Paddy Husk", "Wheat Straw")
6. **Price Lookup**: Average price fetched from `crops_master_dataset.csv`

### Output
```json
{
    "category": "Paddy Husk",
    "average_price_per_quintal": 1250.50,
    "fallback": false
}
```

### API Endpoint
```
POST /predict_category
```

### Usage in Backend
Called from `server/routes/provisions.js` when a farmer creates a provision with `wasteType: 'auto'`:

```javascript
const clsResp = await fetch(`${ML_URL}/predict_category`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        state, 
        season, 
        quantity_kg: Number(quantityTons) * 1000 
    })
});
```

---

## 🤖 Model 2: Matchmaking Model

### Purpose
Ranks available provisions (suppliers) for a startup's needs based on:
- **Quantity match** (supplier has enough)
- **Distance** (geographical proximity)
- **Price** (cost efficiency)
- **Other factors** learned by the model

### Model Type
- **Algorithm**: Scikit-learn model (likely regression or classification for scoring)
- **File**: `matchmaking_model.pkl`
- **Preprocessing**: `match_transformer.pkl` - Feature transformer/scaler

### Input Features (per provision)
```python
[
    p.quantityTons,        # Supplier's available quantity
    req.quantityTons,      # Buyer's required quantity
    p.latitude,            # Supplier location latitude
    p.longitude,           # Supplier location longitude
    req.latitude,          # Buyer location latitude
    req.longitude,         # Buyer location longitude
    distance_km,           # Haversine distance in km
    quantity_ratio         # p.quantityTons / req.quantityTons
]
```

### Business Rules (Pre-filtering)
Before ML ranking, provisions are filtered:
1. ✅ **Waste type match**: `provision.wasteType == needType`
2. ✅ **Quantity sufficient**: `provision.quantityTons >= required.quantityTons`
3. ✅ **Distance limit**: Within 200km (if coordinates available)

### Scoring Algorithm

**If ML model available:**
- Features extracted for each provision
- Model predicts match score (probability or regression value)
- Provisions ranked by score (highest first)

**Fallback (heuristic):**
```python
score = quantity_ratio / (1.0 + distance_km)
# Higher ratio + closer distance = better match
```

### Output
```json
{
    "ranked_ids": ["provision_id_1", "provision_id_2", ...],
    "fallback": false  # true if using heuristic instead of ML
}
```

### API Endpoint
```
POST /match
```

### Usage in Backend
Called from `server/routes/matchmaking.js` and `server/routes/waste.js`:

```javascript
const resp = await fetch(`${ML_URL}/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        needType,
        quantityTons,
        latitude,
        longitude,
        provisions: [...]  // Array of available provisions
    })
});
```

---

## 🔧 Integration with Backend

### Environment Variable
```bash
ML_URL=http://127.0.0.1:8000  # Default ML service URL
```

### Error Handling
- **Graceful degradation**: If ML service is unavailable, system falls back to:
  - **Classification**: Returns `null` category (user must specify manually)
  - **Matchmaking**: Uses heuristic scoring (quantity ratio / distance)

### Service Health Check
```python
GET /health
# Returns:
{
    "status": "OK",
    "classifier_loaded": true,
    "matchmaker_loaded": true
}
```

---

## 📊 Supporting Data Files

1. **`crops_master_dataset.csv`**
   - Contains crop categories and average prices
   - Used for price lookup after classification
   - Columns: `category`, `avg_price_per_quintal`

2. **`crop_class_labels.json`**
   - Maps model class indices to crop names
   - Example: `[0: "Paddy Husk", 1: "Wheat Straw", ...]`

3. **Preprocessing Artifacts**:
   - `crop_scaler.pkl` - StandardScaler for quantity
   - `crop_encoder.pkl` - OneHotEncoder for state/season
   - `match_transformer.pkl` - Feature transformer for matchmaking

---

## 🚀 Running the ML Service

### Prerequisites
```bash
cd server/ml
pip install -r requirements.txt
```

### Start Service
```bash
# Option 1: Using uvicorn directly
uvicorn app:app --host 127.0.0.1 --port 8000

# Option 2: Using Python
python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

### Verify
```bash
curl http://localhost:8000/health
```

---

## 🎓 Machine Learning Techniques Used

### 1. **Supervised Learning**
- **Classification**: Crop type prediction (multi-class classification)
- **Regression/Scoring**: Matchmaking score prediction

### 2. **Feature Engineering**
- **One-Hot Encoding**: Categorical variables (state, season)
- **Standardization**: Numerical features (quantity)
- **Geospatial Features**: Haversine distance calculation
- **Derived Features**: Quantity ratio, distance metrics

### 3. **Model Types** (Inferred from scikit-learn usage)
- Likely **Random Forest** or **Gradient Boosting** for classification
- Likely **Regression** or **Ranking** model for matchmaking

### 4. **Preprocessing Pipeline**
- Separate preprocessing artifacts (scalers, encoders) saved with models
- Ensures consistent feature transformation at inference time

---

## 📈 Model Performance & Fallbacks

The system is designed to be **resilient**:
- ✅ Models are optional - system works without them
- ✅ Fallback heuristics ensure functionality
- ✅ Error handling prevents crashes
- ✅ Health checks monitor model availability

---

## 🔍 Key Files Summary

| File | Purpose |
|------|---------|
| `server/ml/app.py` | FastAPI service with both ML endpoints |
| `server/ml/requirements.txt` | Python dependencies |
| `crop_classification_model.pkl` | Trained classification model |
| `matchmaking_model.pkl` | Trained matchmaking model |
| `crops_master_dataset.csv` | Price lookup database |
| `server/routes/provisions.js` | Uses classification API |
| `server/routes/matchmaking.js` | Uses matchmaking API |

---

## 💡 Use Cases

### For Farmers:
- **Auto-classify waste**: Enter state/season → ML predicts crop type
- **Price estimation**: Get average market price for their waste

### For Startups:
- **Smart matching**: Find best suppliers ranked by:
  - Quantity availability
  - Distance (logistics cost)
  - Price competitiveness
  - Other learned factors

---

## 🎯 Summary

AgroScope uses **two scikit-learn models**:
1. **Classification model** - Predicts crop waste type from location/season
2. **Matchmaking model** - Ranks suppliers for optimal buyer-seller matches

Both models are served via a **FastAPI microservice** that integrates seamlessly with the Node.js backend, with graceful fallbacks if the ML service is unavailable.


