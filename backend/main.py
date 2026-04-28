from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np
import shap
import os
from dotenv import load_dotenv
from groq import Groq
import math
import pandas as pd

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

# Define the Master 22-Feature Vector (Matches Frontend Input)
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


class ChatRequest(BaseModel):
    question: str
    context_disease: str
    risk_probability: float
    risk_level: str
    features: list[dict] = []
    patient_payload: dict | None = None
    history: list[dict] = []

# State class to hold dynamically loaded artifacts
class MultiState:
    models = {}
    scalers = {}
    explainers = {}
    features = {}
    thresholds = {}

state = MultiState()


def get_groq_model() -> str:
    return os.getenv("GROQ_MODEL", "qwen-2.5-32b").strip()


def get_groq_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None, "GROQ_API_KEY is not configured."
    try:
        return Groq(api_key=api_key), None
    except Exception as exc:
        return None, f"Failed to initialize Groq client: {exc}"


@app.on_event("startup")
async def startup():
    for disease in ["diabetes", "heart", "stroke"]:
        # 1. Load Model & Scaler
        state.models[disease] = joblib.load(f"{disease}_ensemble_model.pkl")
        state.scalers[disease] = joblib.load(f"{disease}_scaler.pkl")
        
        # 2. Load Exact Feature Order
        try:
            state.features[disease] = joblib.load(f"{disease}_features.pkl")
        except FileNotFoundError:
            # Fallback if features.pkl is missing (mostly for older diabetes model)
            target_col = "Diabetes" if disease == "diabetes" else "HeartDiseaseorAttack" if disease == "heart" else "Stroke"
            state.features[disease] = [k for k in FEATURE_NAMES if k != target_col]
            
        # 3. Load Optimal Clinical Threshold
        try:
            metadata = joblib.load(f"{disease}_metadata.pkl")
            state.thresholds[disease] = float(metadata.get('optimal_threshold', 0.5))
        except FileNotFoundError:
            # Fallback for perfectly balanced models (Diabetes)
            state.thresholds[disease] = 0.5

        # 4. Extract XGBoost for SHAP
        xgb_mod = state.models[disease].named_estimators_["xgb"]
        state.explainers[disease] = shap.TreeExplainer(xgb_mod)


def classify_risk(prob: float, threshold: float) -> str:
    """Classify risk dynamically based on the optimal clinical threshold."""
    if prob >= threshold * 1.3 or prob >= 0.85:
        return "High"
    if prob >= threshold:
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
    threshold: float,
    level: str,
    base_val: float,
    top_features: list[dict],
    all_features: list[dict],
    patient_data: dict,
) -> str:
    disease_name = DISEASE_DISPLAY_NAMES.get(disease, disease.title())
    lines = [
        f"{disease_name} Local SHAP Interpretation Report",
        f"Predicted probability: {prob:.2%}",
        f"Optimal Clinical Threshold: {threshold:.2%} (Predictions above this are considered 'At Risk')",
        f"Risk Stratification: {level}",
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

    shown_sum = sum(float(item["contribution"]) for item in top_features)
    full_sum = sum(float(item["contribution"]) for item in all_features)
    residual_other = full_sum - shown_sum
    final_shap_logit = base_val + full_sum
    final_shap_prob = 1 / (1 + math.exp(-final_shap_logit))

    positive_terms = [f for f in top_features if float(f["contribution"]) > 0]
    negative_terms = [f for f in top_features if float(f["contribution"]) < 0]

    lines.extend([
        "",
        "How pushes and pulls add up (SHAP additive path):",
        f"- Baseline score (log-odds): {base_val:+.4f}",
        f"- Sum of shown top contributions: {shown_sum:+.4f}",
        f"- Residual contribution from remaining features: {residual_other:+.4f}",
        f"- Final explained probability (after sigmoid) ≈ {final_shap_prob:.2%}",
    ])

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

    lines.extend([
        "",
        "Clinical interpretation template:",
        f"- Overall assessment: {level} risk profile for {disease_name.lower()}.",
        "- Risk-driving factors: prioritize positively contributing features above.",
        "- Protective factors: reinforce negatively contributing features above.",
        "- Suggested next steps: confirm with clinical history, vitals, and labs.",
        "",
        "Safety note: This tool supports clinical decision-making and is not a diagnosis."
    ])
    return "\n".join(lines)


def groq_preprompt() -> str:
    return (
        "You are a clinical decision-support assistant for risk interpretation. "
        "Generate a concise but detailed, patient-specific interpretation report using SHAP data. "
        "Take into account the optimal_clinical_threshold provided when discussing whether a patient is at risk. "
        "Do not provide definitive diagnosis. Do not fabricate any missing values. "
        "Use only the provided patient features and model outputs.\n\n"
        "Output format:\n"
        "1) Overall risk interpretation (2-4 sentences)\n"
        "2) Key risk-increasing factors (bullet list)\n"
        "3) Key risk-reducing/protective factors (bullet list)\n"
        "4) Clinically sensible next-step checks/interventions (bullet list)\n"
        "5) Safety disclaimer (single sentence)\n"
    )


def generate_groq_report(
    disease: str,
    prob: float,
    threshold: float,
    level: str,
    base_val: float,
    top_features: list[dict],
    patient_data: dict,
) -> tuple[str | None, str | None]:
    client, client_error = get_groq_client()
    if client_error:
        return None, client_error

    try:
        model_name = get_groq_model()

        payload = {
            "disease": disease,
            "disease_display_name": DISEASE_DISPLAY_NAMES.get(disease, disease),
            "predicted_probability": round(prob, 4),
            "optimal_clinical_threshold": round(threshold, 4),
            "is_clinically_at_risk": prob >= threshold,
            "risk_level": level,
            "shap_expected_value": round(base_val, 6),
            "top_shap_features": top_features,
            "patient_features": patient_data,
        }

        prompt = f"{groq_preprompt()}\nCase payload:\n{payload}"
        
        for attempt in range(3):
            try:
                completion = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": groq_preprompt()},
                        {"role": "user", "content": f"Case payload:\n{payload}"}
                    ],
                    temperature=0.6,
                    max_completion_tokens=4096,
                    top_p=0.95,
                    stream=False
                )
                text = (completion.choices[0].message.content or "").strip()
                if text:
                    return text, None
                return None, "Groq returned an empty response."
            except Exception as exc:
                error_str = str(exc)
                if "429" in error_str or "rate_limit" in error_str:
                    if attempt < 2:
                        import time
                        time.sleep(2 ** attempt)
                        continue
                return None, f"Groq generation failed: {exc}"

        return None, "Groq generation failed after retries."
    except Exception as exc:
        return None, f"Groq generation error: {exc}"


@app.get("/api/groq-health")
async def groq_health():
    client, client_error = get_groq_client()
    model_name = get_groq_model()

    if client_error:
        return {
            "status": "not_configured",
            "configured": False,
            "message": client_error,
        }

    health_prompt = "Reply with exactly one short line: GROQ_OK. Do not add markdown or extra words."
    try:
        completion = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": health_prompt}],
            max_completion_tokens=10,
            stream=False
        )
        text = (completion.choices[0].message.content or "").strip()
        return {
            "status": "ok",
            "configured": True,
            "working_model": model_name,
            "response_preview": text[:120],
            "message": "Groq API key and model are usable.",
        }
    except Exception as exc:
        return {
            "status": "error",
            "configured": True,
            "message": f"Groq check failed: {exc}",
        }


def run_inference(disease, full_data_dict):
    # 1. Extract features dynamically based on training order
    feature_cols = state.features[disease]
    
    # 2. Build array exactly as the model expects it
    input_arr = np.array([full_data_dict[k] for k in feature_cols]).reshape(1, -1)
    
    # 3. Scale and Predict
    scaled_input = state.scalers[disease].transform(input_arr)
    proba = float(state.models[disease].predict_proba(scaled_input)[0][1])
    
    # 4. Determine Risk based on dynamically loaded optimal threshold
    optimal_threshold = state.thresholds[disease]
    is_at_risk = bool(proba >= optimal_threshold)
    risk_level = classify_risk(proba, optimal_threshold)
    
    # 5. Generate SHAP
    shap_values = state.explainers[disease].shap_values(scaled_input)
    if isinstance(shap_values, list):
        values = shap_values[1][0]
    else:
        values = shap_values[0]

    feature_contributions = []
    for name, val in zip(feature_cols, values):
        feature_contributions.append({
            "name": name,
            "contribution": float(val)
        })
    
    feature_contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)
    top_features = feature_contributions[:8]
    
    base_val = float(state.explainers[disease].expected_value)
    full_sum = sum(float(item["contribution"]) for item in feature_contributions)
    final_shap_logit = base_val + full_sum
    final_shap_prob = 1 / (1 + math.exp(-final_shap_logit))
    
    local_report = build_local_report(
        disease=disease,
        prob=proba,
        threshold=optimal_threshold,
        level=risk_level,
        base_val=base_val,
        top_features=top_features,
        all_features=feature_contributions,
        patient_data=full_data_dict,
    )
    
    groq_report, groq_error = generate_groq_report(
        disease=disease,
        prob=proba,
        threshold=optimal_threshold,
        level=risk_level,
        base_val=base_val,
        top_features=top_features,
        patient_data=full_data_dict,
    )

    final_report = groq_report if groq_report else local_report
    report_source = "groq" if groq_report else "local_fallback"

    return {
        "prob": round(proba, 4),
        "level": risk_level,
        "is_at_risk": is_at_risk,
        "optimal_threshold": round(optimal_threshold, 4),
        "shap_base": base_val,
        "shap_features": top_features,
        "shap_diagnostics": {
            "baseline_logodds": round(base_val, 6),
            "explained_logodds": round(final_shap_logit, 6),
            "explained_probability": round(final_shap_prob, 6),
            "ensemble_probability": round(proba, 6),
            "explanation_gap": round(proba - final_shap_prob, 6),
        },
        "local_interpretation_report": local_report,
        "ai_interpretation_report": final_report,
        "ai_report_source": report_source,
        "ai_report_error": groq_error,
    }


@app.post("/api/chat")
async def chat_with_ai(req: ChatRequest):
    client, client_error = get_groq_client()
    if client_error:
        return {"response": f"Chat unavailable: {client_error}"}

    try:
        model_name = get_groq_model()
        
        # Build system context
        context = (
            f"You are a clinical decision-support AI. The user is asking about their {req.context_disease} risk assessment. "
            f"Assessment Results: Probability: {req.risk_probability:.2%}, Level: {req.risk_level}. "
            "Patient context provided in payload. Be helpful, professional, and clear. "
            "Maintain a safety-first clinical tone. Do not diagnose."
        )
        
        messages = [{"role": "system", "content": context}]
        
        # Add history
        for msg in req.history:
            messages.append({"role": msg["role"], "content": msg["content"]})
            
        # Add current question
        messages.append({"role": "user", "content": req.question})
        
        completion = client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=0.6,
            max_completion_tokens=2048,
        )
        
        return {"response": completion.choices[0].message.content.strip()}
    except Exception as exc:
        return {"response": f"Chat failed: {exc}"}


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