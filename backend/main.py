"""
XAI-CDSS Backend — FastAPI server for Clinical Decision Support
Serves a Soft Voting Ensemble (Logistic Regression, Random Forest, XGBoost)
trained on the BRFSS 2015 diabetes dataset.
Provides SHAP-based explainability via the fitted XGBoost sub-estimator.
"""

from __future__ import annotations

import os
import logging
from contextlib import asynccontextmanager
from typing import Any

import joblib
import numpy as np
import shap
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("xai-cdss")

# ---------------------------------------------------------------------------
# Pydantic schema — exactly 21 features in dataset column order
# ---------------------------------------------------------------------------
FEATURE_NAMES: list[str] = [
    "HighBP",
    "HighChol",
    "CholCheck",
    "BMI",
    "Smoker",
    "Stroke",
    "HeartDiseaseorAttack",
    "PhysActivity",
    "Fruits",
    "Veggies",
    "HvyAlcoholConsump",
    "AnyHealthcare",
    "NoDocbcCost",
    "GenHlth",
    "MentHlth",
    "PhysHlth",
    "DiffWalk",
    "Sex",
    "Age",
    "Education",
    "Income",
]


class PatientData(BaseModel):
    """Input schema mapping 1-to-1 with the 21 BRFSS features."""
    HighBP: float = Field(..., description="High blood pressure (0/1)")
    HighChol: float = Field(..., description="High cholesterol (0/1)")
    CholCheck: float = Field(..., description="Cholesterol check in past 5 yrs (0/1)")
    BMI: float = Field(..., description="Body Mass Index")
    Smoker: float = Field(..., description="Smoked ≥100 cigarettes in lifetime (0/1)")
    Stroke: float = Field(..., description="Ever had a stroke (0/1)")
    HeartDiseaseorAttack: float = Field(..., description="CHD or MI history (0/1)")
    PhysActivity: float = Field(..., description="Exercise in past 30 days (0/1)")
    Fruits: float = Field(..., description="1+ fruit servings per day (0/1)")
    Veggies: float = Field(..., description="1+ vegetable servings per day (0/1)")
    HvyAlcoholConsump: float = Field(..., description="Heavy alcohol consumption (0/1)")
    AnyHealthcare: float = Field(..., description="Has any healthcare coverage (0/1)")
    NoDocbcCost: float = Field(..., description="Could not see doctor due to cost (0/1)")
    GenHlth: float = Field(..., description="General health (1=Excellent..5=Poor)")
    MentHlth: float = Field(..., description="Days mental health not good (0-30)")
    PhysHlth: float = Field(..., description="Days physical health not good (0-30)")
    DiffWalk: float = Field(..., description="Serious difficulty walking (0/1)")
    Sex: float = Field(..., description="0=Female, 1=Male")
    Age: float = Field(..., description="Age category (1-13)")
    Education: float = Field(..., description="Education level (1-6)")
    Income: float = Field(..., description="Income level (1-8)")


# ---------------------------------------------------------------------------
# Application state — populated during lifespan startup
# ---------------------------------------------------------------------------
class AppState:
    ensemble_model: Any = None
    scaler: Any = None
    xgb_explainer: Any = None


state = AppState()


# ---------------------------------------------------------------------------
# Lifespan: load models once on startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models with memory mapping to save RAM at startup."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "diabetes_ensemble_model.pkl")
    scaler_path = os.path.join(base_dir, "diabetes_scaler.pkl")

    try:
        logger.info("Loading ensemble model (mmap mode) …")
        # mmap_mode='r' prevents the entire file from being loaded into RAM at once
        state.ensemble_model = joblib.load(model_path, mmap_mode='r')
        logger.info("✓ Ensemble model loaded.")

        logger.info("Loading scaler …")
        state.scaler = joblib.load(scaler_path)
        logger.info("✓ Scaler loaded.")
    except Exception as e:
        logger.error("Failed to load models: %s", e)

    yield
    logger.info("Shutting down.")

# ... (FastAPI setup remains same) ...

@app.post("/api/predict")
async def predict(patient: PatientData):
    if state.ensemble_model is None or state.scaler is None:
        raise HTTPException(status_code=503, detail="Models not loaded.")

    try:
        # Lazy initialization of SHAP explainer on first request
        # to spread out the memory usage spike
        if state.xgb_explainer is None:
            logger.info("Initialising SHAP explainer (Lazy Load) …")
            fitted_xgb = state.ensemble_model.named_estimators_["xgb"]
            state.xgb_explainer = shap.TreeExplainer(fitted_xgb)
            logger.info("✓ SHAP explainer ready.")

        raw_values = [getattr(patient, name) for name in FEATURE_NAMES]
        input_array = np.array(raw_values, dtype=np.float64).reshape(1, -1)

        # 2. Scale
        scaled_input = state.scaler.transform(input_array)

        # 3. Predict — probability of class 1 (Diabetes)
        proba = state.ensemble_model.predict_proba(scaled_input)
        risk_probability = float(proba[0][1])
        risk_level = _classify_risk(risk_probability)

        # 4. SHAP explanations via XGBoost sub-estimator
        shap_features: list[dict] = []
        base_value: float = 0.5  # fallback

        if state.xgb_explainer is not None:
            try:
                shap_values = state.xgb_explainer.shap_values(scaled_input)
                base_value = float(state.xgb_explainer.expected_value)

                # Build per-feature contribution list
                contributions = shap_values[0]  # shape (21,)
                paired = [
                    {
                        "name": FEATURE_NAMES[i],
                        "value": float(raw_values[i]),
                        "contribution": float(contributions[i]),
                    }
                    for i in range(len(FEATURE_NAMES))
                ]

                # Sort by absolute contribution, keep top 7
                paired.sort(key=lambda x: abs(x["contribution"]), reverse=True)
                shap_features = paired[:7]

            except Exception as shap_exc:
                logger.error("SHAP computation failed: %s", shap_exc)
                # Return prediction even if SHAP fails
                shap_features = []

        return {
            "status": "success",
            "risk_probability": round(risk_probability, 4),
            "risk_level": risk_level,
            "shap_data": {
                "base_value": round(base_value, 4),
                "features": shap_features,
            },
        }

    except Exception as exc:
        logger.exception("Prediction error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(exc)}")


# ---------------------------------------------------------------------------
# Run with: python main.py
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
