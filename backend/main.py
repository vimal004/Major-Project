from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np
import shap
import os

app = FastAPI(title="XAI-CDSS Multi-Disease API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow React/Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the Master 22-Feature Vector
FEATURE_NAMES = [
    "HighBP", "HighChol", "CholCheck", "BMI", "Smoker", 
    "Stroke", "HeartDiseaseorAttack", "Diabetes", "PhysActivity", 
    "Fruits", "Veggies", "HvyAlcoholConsump", "AnyHealthcare", 
    "NoDocbcCost", "GenHlth", "MentHlth", "PhysHlth", 
    "DiffWalk", "Sex", "Age", "Education", "Income"
]

class PatientData(BaseModel):
    # Map directly to the 22 features in the dataset
    HighBP: float; HighChol: float; CholCheck: float; BMI: float; Smoker: float
    Stroke: float; HeartDiseaseorAttack: float; Diabetes: float; PhysActivity: float
    Fruits: float; Veggies: float; HvyAlcoholConsump: float; AnyHealthcare: float
    NoDocbcCost: float; GenHlth: float; MentHlth: float; PhysHlth: float
    DiffWalk: float; Sex: float; Age: float; Education: float; Income: float

class MultiState:
    models = {}; scalers = {}; explainers = {}

state = MultiState()

@app.on_event("startup")
async def startup():
    for disease in ["diabetes", "heart", "stroke"]:
        state.models[disease] = joblib.load(f"{disease}_ensemble_model.pkl")
        state.scalers[disease] = joblib.load(f"{disease}_scaler.pkl")
        # Extract XGBoost for SHAP
        xgb_mod = state.models[disease].named_estimators_["xgb"]
        state.explainers[disease] = shap.TreeExplainer(xgb_mod)

def run_inference(disease, full_data_dict):
    # Dynamically remove the target column for this specific model
    target_col = "Diabetes" if disease == "diabetes" else \
                 "HeartDiseaseorAttack" if disease == "heart" else "Stroke"
    
    features = [full_data_dict[k] for k in FEATURE_NAMES if k != target_col]
    input_arr = np.array(features).reshape(1, -1)
    scaled_input = state.scalers[disease].transform(input_arr)
    
    proba = float(state.models[disease].predict_proba(scaled_input)[0][1])
    
    # Generate SHAP
    shap_values = state.explainers[disease].shap_values(scaled_input)
    # For TreeExplainer on XGBoost, shap_values is often a simple array for binary classification
    # but sometimes it can be a list of arrays. We handle both.
    if isinstance(shap_values, list):
        # Taking the positive class (usually index 1)
        values = shap_values[1][0]
    else:
        values = shap_values[0]

    # Map values to feature names
    feature_names_used = [k for k in FEATURE_NAMES if k != target_col]
    
    feature_contributions = []
    for name, val in zip(feature_names_used, values):
        feature_contributions.append({
            "name": name,
            "contribution": float(val)
        })
    
    # Sort by absolute contribution and take top 8
    feature_contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)
    top_features = feature_contributions[:8]
    
    # Calculate base value (expected value)
    base_val = float(state.explainers[disease].expected_value)
    
    return {
        "prob": round(proba, 4),
        "level": "High" if proba > 0.7 else "Moderate" if proba > 0.4 else "Low",
        "shap_base": base_val,
        "shap_features": top_features
    }

@app.post("/api/predict/all")
async def predict_all(patient: PatientData):
    data = patient.dict()
    return {
        "status": "success",
        "assessments": {
            "diabetes": run_inference("diabetes", data),
            "heart": run_inference("heart", data),
            "stroke": run_inference("stroke", data)
        }
    }