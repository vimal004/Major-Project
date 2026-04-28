from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np
import shap
import os
from dotenv import load_dotenv
from google import genai
import math

app = FastAPI(title="XAI-CDSS Multi-Disease API")
load_dotenv()

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

DISEASE_DISPLAY_NAMES = {
    "diabetes": "Diabetes",
    "heart": "Heart Disease",
    "stroke": "Stroke",
}

FEATURE_LABELS = {
    "HighBP": "High blood pressure",
    "HighChol": "High cholesterol",
    "CholCheck": "Recent cholesterol check",
    "BMI": "Body mass index",
    "Smoker": "Smoking status",
    "Stroke": "Prior stroke history",
    "HeartDiseaseorAttack": "Prior heart disease/heart attack history",
    "Diabetes": "Diabetes history",
    "PhysActivity": "Physical activity",
    "Fruits": "Fruit intake",
    "Veggies": "Vegetable intake",
    "HvyAlcoholConsump": "Heavy alcohol consumption",
    "AnyHealthcare": "Healthcare access",
    "NoDocbcCost": "Could not see doctor due to cost",
    "GenHlth": "General health score",
    "MentHlth": "Days of poor mental health",
    "PhysHlth": "Days of poor physical health",
    "DiffWalk": "Difficulty walking",
    "Sex": "Sex",
    "Age": "Age group",
    "Education": "Education level",
    "Income": "Income level",
}

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


def get_gemini_model_candidates() -> list[str]:
    candidates = [
        os.getenv("GEMINI_MODEL", "").strip(),
        "gemini-2.0-flash",
        "gemini-2.5-flash",
    ]
    seen = set()
    unique = []
    for name in candidates:
        if name and name not in seen:
            seen.add(name)
            unique.append(name)
    return unique


def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None, "GEMINI_API_KEY is not configured."
    try:
        return genai.Client(api_key=api_key), None
    except Exception as exc:
        return None, f"Failed to initialize Gemini client: {exc}"

@app.on_event("startup")
async def startup():
    for disease in ["diabetes", "heart", "stroke"]:
        state.models[disease] = joblib.load(f"{disease}_ensemble_model.pkl")
        state.scalers[disease] = joblib.load(f"{disease}_scaler.pkl")
        # Extract XGBoost for SHAP
        xgb_mod = state.models[disease].named_estimators_["xgb"]
        state.explainers[disease] = shap.TreeExplainer(xgb_mod)


def classify_risk(prob: float) -> str:
    if prob > 0.7:
        return "High"
    if prob > 0.4:
        return "Moderate"
    return "Low"


def shap_impact_band(value: float) -> str:
    mag = abs(value)
    if mag >= 0.20:
        return "strong"
    if mag >= 0.08:
        return "moderate"
    return "mild"


def build_local_report(
    disease: str,
    prob: float,
    level: str,
    base_val: float,
    top_features: list[dict],
    all_features: list[dict],
    patient_data: dict,
) -> str:
    disease_name = DISEASE_DISPLAY_NAMES.get(disease, disease.title())
    lines = [
        f"{disease_name} Local SHAP Interpretation Report",
        f"Predicted risk: {level} ({prob:.2%})",
        f"Model baseline (SHAP expected value): {base_val:.4f}",
        "",
        "Top feature-level contributors (patient-specific):",
    ]

    if not top_features:
        lines.append("- No SHAP contributions were available for this prediction.")
    else:
        for i, feat in enumerate(top_features, start=1):
            fname = feat["name"]
            sval = float(feat["contribution"])
            direction = "increases" if sval >= 0 else "decreases"
            impact = shap_impact_band(sval)
            readable = FEATURE_LABELS.get(fname, fname)
            pval = patient_data.get(fname, "N/A")
            lines.append(
                f"- {i}. {readable} ({fname}) = {pval}: {impact} factor, "
                f"{direction} risk (SHAP {sval:+.4f})."
            )

    # Additive SHAP walkthrough (log-odds domain for TreeExplainer on XGBoost)
    shown_sum = sum(float(item["contribution"]) for item in top_features)
    full_sum = sum(float(item["contribution"]) for item in all_features)
    residual_other = full_sum - shown_sum
    final_shap_logit = base_val + full_sum
    final_shap_prob = 1 / (1 + math.exp(-final_shap_logit))

    positive_terms = [f for f in top_features if float(f["contribution"]) > 0]
    negative_terms = [f for f in top_features if float(f["contribution"]) < 0]

    lines.extend(
        [
            "",
            "How pushes and pulls add up (SHAP additive path):",
            f"- Baseline score (log-odds): {base_val:+.4f}",
            f"- Sum of shown top contributions: {shown_sum:+.4f}",
            f"- Residual contribution from remaining features: {residual_other:+.4f}",
            f"- Final explained score (log-odds) = baseline + all feature SHAP = {final_shap_logit:+.4f}",
            f"- Final explained probability (after sigmoid) ≈ {final_shap_prob:.2%}",
        ]
    )

    if positive_terms:
        lines.append("- Main pushes upward (increase risk):")
        for feat in positive_terms[:6]:
            readable = FEATURE_LABELS.get(feat["name"], feat["name"])
            lines.append(f"  - {readable}: {float(feat['contribution']):+.4f}")
    if negative_terms:
        lines.append("- Main pulls downward (decrease risk):")
        for feat in negative_terms[:6]:
            readable = FEATURE_LABELS.get(feat["name"], feat["name"])
            lines.append(f"  - {readable}: {float(feat['contribution']):+.4f}")

    lines.extend(
        [
            "",
            "Clinical interpretation template:",
            f"- Overall assessment: {level} risk profile for {disease_name.lower()}.",
            "- Risk-driving factors: prioritize positively contributing features above.",
            "- Protective factors: reinforce negatively contributing features above.",
            "- Suggested next steps: confirm with clinical history, vitals, and labs.",
            "- Monitoring: repeat assessment after interventions or status changes.",
            "",
            "Technical note: SHAP add-up above explains the XGBoost explainer path; "
            "the final served risk uses the ensemble probability output.",
            "Safety note: This tool supports clinical decision-making and is not a diagnosis.",
        ]
    )
    return "\n".join(lines)


def gemini_preprompt() -> str:
    return (
        "You are a clinical decision-support assistant for risk interpretation. "
        "Generate a concise but detailed, patient-specific interpretation report using SHAP data. "
        "Do not provide definitive diagnosis. Do not fabricate any missing values. "
        "Use only the provided patient features and model outputs.\n\n"
        "Output format:\n"
        "1) Overall risk interpretation (2-4 sentences)\n"
        "2) Key risk-increasing factors (bullet list)\n"
        "3) Key risk-reducing/protective factors (bullet list)\n"
        "4) Clinically sensible next-step checks/interventions (bullet list)\n"
        "5) Safety disclaimer (single sentence)\n"
    )


def generate_gemini_report(
    disease: str,
    prob: float,
    level: str,
    base_val: float,
    top_features: list[dict],
    patient_data: dict,
) -> tuple[str | None, str | None]:
    client, client_error = get_gemini_client()
    if client_error:
        return None, client_error

    try:
        model_candidates = get_gemini_model_candidates()

        payload = {
            "disease": disease,
            "disease_display_name": DISEASE_DISPLAY_NAMES.get(disease, disease),
            "predicted_probability": round(prob, 4),
            "risk_level": level,
            "shap_expected_value": round(base_val, 6),
            "top_shap_features": top_features,
            "patient_features": patient_data,
        }

        prompt = f"{gemini_preprompt()}\nCase payload:\n{payload}"
        model_errors = []
        for model_name in model_candidates:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                text = (response.text or "").strip()
                if text:
                    return text, None
                model_errors.append(f"{model_name}: empty response")
            except Exception as model_exc:
                model_errors.append(f"{model_name}: {model_exc}")

        return None, "Gemini generation failed for all models. " + " | ".join(model_errors)
    except Exception as exc:
        return None, f"Gemini generation failed: {exc}"


@app.get("/api/gemini-health")
async def gemini_health():
    client, client_error = get_gemini_client()
    model_candidates = get_gemini_model_candidates()

    if client_error:
        return {
            "status": "not_configured",
            "configured": False,
            "models_tried": model_candidates,
            "message": client_error,
        }

    health_prompt = (
        "Reply with exactly one short line: GEMINI_OK. "
        "Do not add markdown or extra words."
    )

    errors = []
    for model_name in model_candidates:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=health_prompt,
            )
            text = (response.text or "").strip()
            return {
                "status": "ok",
                "configured": True,
                "working_model": model_name,
                "models_tried": model_candidates,
                "response_preview": text[:120],
                "message": "Gemini API key, project, and model are usable.",
            }
        except Exception as exc:
            errors.append({"model": model_name, "error": str(exc)})

    return {
        "status": "error",
        "configured": True,
        "models_tried": model_candidates,
        "message": "Gemini client initialized, but all model checks failed.",
        "errors": errors,
    }

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
    
    # Sort by absolute contribution and keep both full + top views
    feature_contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)
    top_features = feature_contributions[:8]
    
    # Calculate base value (expected value)
    base_val = float(state.explainers[disease].expected_value)
    full_sum = sum(float(item["contribution"]) for item in feature_contributions)
    final_shap_logit = base_val + full_sum
    final_shap_prob = 1 / (1 + math.exp(-final_shap_logit))
    
    risk_level = classify_risk(proba)
    local_report = build_local_report(
        disease=disease,
        prob=proba,
        level=risk_level,
        base_val=base_val,
        top_features=top_features,
        all_features=feature_contributions,
        patient_data=full_data_dict,
    )
    gemini_report, gemini_error = generate_gemini_report(
        disease=disease,
        prob=proba,
        level=risk_level,
        base_val=base_val,
        top_features=top_features,
        patient_data=full_data_dict,
    )

    final_report = gemini_report if gemini_report else local_report
    report_source = "gemini" if gemini_report else "local_fallback"

    return {
        "prob": round(proba, 4),
        "level": risk_level,
        "shap_base": base_val,
        "shap_features": top_features,
        "shap_diagnostics": {
            "baseline_logodds": round(base_val, 6),
            "baseline_probability": round(1 / (1 + math.exp(-base_val)), 6),
            "total_feature_contribution": round(full_sum, 6),
            "explained_logodds": round(final_shap_logit, 6),
            "explained_probability": round(final_shap_prob, 6),
            "ensemble_probability": round(proba, 6),
            "explanation_gap": round(proba - final_shap_prob, 6),
            "note": "SHAP diagnostics explain the XGBoost explainer path in log-odds space; the final served probability comes from the ensemble model.",
        },
        "local_interpretation_report": local_report,
        "ai_interpretation_report": final_report,
        "ai_report_source": report_source,
        "ai_report_error": gemini_error,
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