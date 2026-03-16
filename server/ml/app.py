from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import os
import joblib
import math
import json
import pandas as pd

app = FastAPI(title="AgroScope ML Service")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CLASSIFIER_PATH = os.path.join(BASE_DIR, "crop_classification_model.pkl")
MATCHMAKER_PATH = os.path.join(BASE_DIR, "matchmaking_model.pkl")
MASTER_DATASET_PATH = os.path.join(BASE_DIR, "crops_master_dataset.csv")

classifier = None
matchmaker = None
crop_encoder = None
crop_scaler = None
class_labels = None
match_transformer = None
master_df = None

try:
    if os.path.exists(CLASSIFIER_PATH):
        classifier = joblib.load(CLASSIFIER_PATH)
        enc_path = os.path.join(BASE_DIR, "crop_encoder.pkl")
        scl_path = os.path.join(BASE_DIR, "crop_scaler.pkl")
        labels_path = os.path.join(BASE_DIR, "crop_class_labels.json")
        if os.path.exists(enc_path):
            crop_encoder = joblib.load(enc_path)
        if os.path.exists(scl_path):
            crop_scaler = joblib.load(scl_path)
        if os.path.exists(labels_path):
            with open(labels_path, 'r', encoding='utf-8') as f:
                class_labels = json.load(f)
except Exception as e:
    classifier = None

try:
    if os.path.exists(MATCHMAKER_PATH):
        matchmaker = joblib.load(MATCHMAKER_PATH)
        transformer_path = os.path.join(BASE_DIR, "match_transformer.pkl")
        if os.path.exists(transformer_path):
            match_transformer = joblib.load(transformer_path)
except Exception as e:
    matchmaker = None
try:
    if os.path.exists(MASTER_DATASET_PATH):
        master_df = pd.read_csv(MASTER_DATASET_PATH)
except Exception:
    master_df = None


class ClassifyRequest(BaseModel):
    state: str
    season: str
    quantity_kg: float


class Provision(BaseModel):
    _id: str
    wasteType: str
    quantityTons: float
    location: str
    createdAt: Optional[str] = None


class MatchRequest(BaseModel):
    needType: str
    quantityTons: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    provisions: List[Provision]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@app.get("/health")
def health():
    return {
        "status": "OK",
        "classifier_loaded": classifier is not None,
        "matchmaker_loaded": matchmaker is not None,
    }


@app.post("/predict_category")
def predict_category(req: ClassifyRequest):
    if classifier is None:
        return {"category": None, "average_price_per_quintal": None, "fallback": True}

    # Numeric features and scaling
    num_vec = [[req.quantity_kg]]
    try:
        if crop_scaler is not None:
            num_scaled = crop_scaler.transform(num_vec)
        else:
            num_scaled = num_vec
    except Exception:
        num_scaled = num_vec

    # Categorical encoding
    try:
        if crop_encoder is not None:
            cat_ohe = crop_encoder.transform([[req.state, req.season]])
            try:
                cat_ohe = cat_ohe.toarray()
            except Exception:
                pass
        else:
            cat_ohe = [[0]]
    except Exception:
        cat_ohe = [[0]]

    # Concatenate in order: numeric, then OHE
    try:
        import numpy as np
        X = np.hstack([num_scaled, cat_ohe])
    except Exception:
        X = num_vec

    try:
        pred = classifier.predict(X)
        class_index = int(pred[0]) if hasattr(pred, '__iter__') else int(pred)
    except Exception:
        class_index = None

    label = None
    if class_index is not None and isinstance(class_labels, (list, tuple)) and 0 <= class_index < len(class_labels):
        label = class_labels[class_index]

    avg_price = None
    if label and master_df is not None:
        # Use confirmed columns: 'category' and 'avg_price_per_quintal'
        if 'category' in master_df.columns and 'avg_price_per_quintal' in master_df.columns:
            try:
                candidates = master_df[master_df['category'].astype(str).str.lower() == str(label).lower()]
                if len(candidates):
                    avg_price = float(candidates['avg_price_per_quintal'].dropna().astype(float).mean())
            except Exception:
                avg_price = None

    return {"category": label, "average_price_per_quintal": avg_price, "fallback": class_index is None}


@app.post("/match")
def match(req: MatchRequest):
    # Mandatory business filters
    filtered: List[Provision] = []
    for p in req.provisions:
        if p.wasteType != req.needType:
            continue
        if p.quantityTons < req.quantityTons:
            continue
        # Distance 200km if coordinates available
        if req.latitude is not None and req.longitude is not None and getattr(p, 'latitude', None) is not None and getattr(p, 'longitude', None) is not None:
            d = haversine_km(req.latitude, req.longitude, p.latitude, p.longitude)
            if d > 200:
                continue
        filtered.append(p)

    # No model: heuristic scoring
    if matchmaker is None:
        scored = []
        for p in filtered:
            ratio = (p.quantityTons / req.quantityTons) if req.quantityTons else 0
            d = 0.0
            if req.latitude is not None and req.longitude is not None and getattr(p, 'latitude', None) is not None and getattr(p, 'longitude', None) is not None:
                d = haversine_km(req.latitude, req.longitude, p.latitude, p.longitude)
            score = ratio / (1.0 + d)
            scored.append((p._id, score))
        ranked_ids = [pid for pid, _ in sorted(scored, key=lambda x: x[1], reverse=True)]
        return {"ranked_ids": ranked_ids, "fallback": True}

    # Build features for ML model
    ids: List[str] = []
    X = []
    for p in filtered:
        ids.append(p._id)
        d = None
        if req.latitude is not None and req.longitude is not None and getattr(p, 'latitude', None) is not None and getattr(p, 'longitude', None) is not None:
            d = haversine_km(req.latitude, req.longitude, p.latitude, p.longitude)
        ratio = (p.quantityTons / req.quantityTons) if req.quantityTons else 0
        X.append([
            p.quantityTons,
            req.quantityTons,
            getattr(p, 'latitude', None),
            getattr(p, 'longitude', None),
            req.latitude,
            req.longitude,
            d,
            ratio,
        ])
    try:
        import numpy as np
        X_arr = np.array(X, dtype=float)
    except Exception:
        X_arr = X

    try:
        X_tx = match_transformer.transform(X_arr) if match_transformer is not None else X_arr
        if hasattr(matchmaker, 'predict_proba'):
            proba = matchmaker.predict_proba(X_tx)
            scores = [float(p[1]) if hasattr(p, '__len__') and len(p) > 1 else float(p[0]) for p in proba]
        else:
            scores = [float(s) for s in matchmaker.predict(X_tx)]
        ranked = sorted(zip(ids, scores), key=lambda x: x[1], reverse=True)
        return {"ranked_ids": [pid for pid, _ in ranked], "fallback": False}
    except Exception:
        scored = []
        for pid, row in zip(ids, X):
            r_qty = row[1] or 0
            p_qty = row[0] or 0
            dist = row[6] or 0
            ratio = (p_qty / r_qty) if r_qty else 0
            scored.append((pid, ratio / (1.0 + dist)))
        ranked_ids = [pid for pid, _ in sorted(scored, key=lambda x: x[1], reverse=True)]
        return {"ranked_ids": ranked_ids, "fallback": True}


