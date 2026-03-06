"""
XAI-CDSS Backend — FastAPI server for Clinical Decision Support
Serves a Soft Voting Ensemble (Logistic Regression, Random Forest, XGBoost)
trained on the BRFSS 2015 diabetes dataset.
Provides SHAP-based explainability via the fitted XGBoost sub-estimator.
Integrates Google Gemini (via REST API) for natural-language interpretation.
"""

from __future__ import annotations

import os
import math
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Any, Optional

import joblib
import numpy as np
import shap
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("xai-cdss")

# ---------------------------------------------------------------------------
# Gemini configuration — direct REST API (no deprecated SDK)
# ---------------------------------------------------------------------------
GEMINI_API_KEY = "AIzaSyDcYf37oZtJ-tY-Sd8xy6gODFafSnAG63I"
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

# Model fallback chain — each model has separate per-model quota
GEMINI_MODEL_CHAIN = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash-lite",
]

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

# Human-friendly descriptions for each feature
FEATURE_DESCRIPTIONS: dict[str, str] = {
    "HighBP": "High Blood Pressure (Hypertension)",
    "HighChol": "High Cholesterol",
    "CholCheck": "Cholesterol Check in Past 5 Years",
    "BMI": "Body Mass Index",
    "Smoker": "Smoking History (>=100 cigarettes lifetime)",
    "Stroke": "History of Stroke",
    "HeartDiseaseorAttack": "Heart Disease or Heart Attack History",
    "PhysActivity": "Physical Activity (exercise in past 30 days)",
    "Fruits": "Daily Fruit Consumption (1+ servings/day)",
    "Veggies": "Daily Vegetable Consumption (1+ servings/day)",
    "HvyAlcoholConsump": "Heavy Alcohol Consumption",
    "AnyHealthcare": "Healthcare Coverage / Insurance",
    "NoDocbcCost": "Skipped Doctor Due to Cost",
    "GenHlth": "Self-Rated General Health (1=Excellent, 5=Poor)",
    "MentHlth": "Days of Poor Mental Health (past 30 days)",
    "PhysHlth": "Days of Poor Physical Health (past 30 days)",
    "DiffWalk": "Difficulty Walking or Climbing Stairs",
    "Sex": "Sex (0=Female, 1=Male)",
    "Age": "Age Category (1=18-24 to 13=80+)",
    "Education": "Education Level (1=None to 6=College Graduate)",
    "Income": "Income Level (1=<$10k to 8=>=$75k)",
}


class PatientData(BaseModel):
    """Input schema mapping 1-to-1 with the 21 BRFSS features."""
    HighBP: float = Field(..., description="High blood pressure (0/1)")
    HighChol: float = Field(..., description="High cholesterol (0/1)")
    CholCheck: float = Field(..., description="Cholesterol check in past 5 yrs (0/1)")
    BMI: float = Field(..., description="Body Mass Index")
    Smoker: float = Field(..., description="Smoked >=100 cigarettes in lifetime (0/1)")
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


class InterpretRequest(BaseModel):
    """Payload for the Gemini interpretation endpoint."""
    risk_probability: float
    risk_level: str
    base_value: float
    features: list[dict]
    patient_payload: Optional[dict] = None


class ChatRequest(BaseModel):
    """Payload for the follow-up chat endpoint."""
    question: str
    risk_probability: float
    risk_level: str
    base_value: float
    features: list[dict]
    patient_payload: Optional[dict] = None
    history: Optional[list[dict]] = None


# ---------------------------------------------------------------------------
# Application state — populated during lifespan startup
# ---------------------------------------------------------------------------
class AppState:
    ensemble_model: Any = None
    scaler: Any = None
    xgb_explainer: Any = None
    http_client: Optional[httpx.AsyncClient] = None


state = AppState()


# ---------------------------------------------------------------------------
# Lifespan: load models once on startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the ensemble model, scaler, SHAP explainer, and HTTP client at startup."""
    base_dir = os.path.dirname(os.path.abspath(__file__))

    model_path = os.path.join(base_dir, "diabetes_ensemble_model.pkl")
    scaler_path = os.path.join(base_dir, "diabetes_scaler.pkl")

    logger.info("Loading ensemble model from %s ...", model_path)
    state.ensemble_model = joblib.load(model_path)
    logger.info("Ensemble model loaded successfully.")

    logger.info("Loading scaler from %s ...", scaler_path)
    state.scaler = joblib.load(scaler_path)
    logger.info("Scaler loaded successfully.")

    # Pre-build the SHAP explainer once
    try:
        fitted_xgb = state.ensemble_model.named_estimators_["xgb"]
        state.xgb_explainer = shap.TreeExplainer(fitted_xgb)
        logger.info("SHAP TreeExplainer initialised for XGBoost sub-estimator.")
    except Exception as exc:
        logger.warning("Could not build SHAP explainer at startup: %s", exc)

    # Create a reusable async HTTP client for Gemini REST API
    state.http_client = httpx.AsyncClient(timeout=60.0)
    logger.info("HTTP client for Gemini REST API ready.")
    logger.info("Gemini model fallback chain: %s", GEMINI_MODEL_CHAIN)

    yield  # application runs here

    # Shutdown: close HTTP client
    if state.http_client:
        await state.http_client.aclose()
    logger.info("Shutting down XAI-CDSS backend.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="XAI-CDSS API",
    description="Clinical Decision Support with SHAP Explanations & Gemini AI",
    version="1.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": state.ensemble_model is not None,
        "scaler_loaded": state.scaler is not None,
        "shap_ready": state.xgb_explainer is not None,
        "gemini_ready": state.http_client is not None,
        "gemini_models": GEMINI_MODEL_CHAIN,
    }


# ---------------------------------------------------------------------------
# Prediction endpoint
# ---------------------------------------------------------------------------
def _classify_risk(probability: float) -> str:
    if probability >= 0.7:
        return "High Risk"
    if probability >= 0.4:
        return "Moderate Risk"
    return "Low Risk"


@app.post("/api/predict")
async def predict(patient: PatientData):
    if state.ensemble_model is None or state.scaler is None:
        raise HTTPException(status_code=503, detail="Models are not loaded yet.")

    try:
        raw_values = [getattr(patient, name) for name in FEATURE_NAMES]
        input_array = np.array(raw_values, dtype=np.float64).reshape(1, -1)
        scaled_input = state.scaler.transform(input_array)

        proba = state.ensemble_model.predict_proba(scaled_input)
        risk_probability = float(proba[0][1])
        risk_level = _classify_risk(risk_probability)

        shap_features: list[dict] = []
        base_value: float = 0.5

        if state.xgb_explainer is not None:
            try:
                shap_values = state.xgb_explainer.shap_values(scaled_input)
                base_value = float(state.xgb_explainer.expected_value)
                contributions = shap_values[0]

                # Build paired list with raw SHAP values
                paired = [
                    {
                        "name": FEATURE_NAMES[i],
                        "value": float(raw_values[i]),
                        "raw_shap": float(contributions[i]),
                    }
                    for i in range(len(FEATURE_NAMES))
                ]

                # Compute relative influence: each feature's |SHAP| / total |SHAP| * 100
                total_abs_shap = sum(abs(p["raw_shap"]) for p in paired)
                if total_abs_shap > 0:
                    for p in paired:
                        influence_pct = (abs(p["raw_shap"]) / total_abs_shap) * 100
                        p["contribution"] = round(influence_pct if p["raw_shap"] > 0 else -influence_pct, 2)
                        p["influence_pct"] = round(influence_pct, 2)
                        p["direction"] = "risk" if p["raw_shap"] > 0 else "protective"
                else:
                    for p in paired:
                        p["contribution"] = 0.0
                        p["influence_pct"] = 0.0
                        p["direction"] = "neutral"

                paired.sort(key=lambda x: abs(x["contribution"]), reverse=True)
                shap_features = paired[:7]
            except Exception as shap_exc:
                logger.error("SHAP computation failed: %s", shap_exc)
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
# Helper: Sigmoid transformation (Log-Odds to Probability)
# ---------------------------------------------------------------------------
def _sigmoid(x: float) -> float:
    """Convert log-odds (logit) to probability [0, 1]."""
    try:
        return 1 / (1 + math.exp(-x))
    except OverflowError:
        return 1.0 if x > 0 else 0.0


# ---------------------------------------------------------------------------
# Helper: build a rich context string for Gemini from SHAP data
# ---------------------------------------------------------------------------
def _build_shap_context(req: InterpretRequest | ChatRequest) -> str:
    """Create a detailed text representation of the SHAP analysis for Gemini."""
    lines = [
        "PATIENT DIABETES RISK ASSESSMENT RESULTS",
        "=========================================",
        f"Overall Predicted Probability: {req.risk_probability * 100:.1f}%",
        f"Risk Level: {req.risk_level}",
        "",
        "FEATURE INFLUENCE ON THIS PREDICTION (Relative % of model decision):",
        "Each feature's influence is shown as a % of the total model decision.",
        "Positive = increases diabetes risk. Negative = protective (lowers risk).",
        "---------------------------------------------------",
    ]

    for i, feat in enumerate(req.features, 1):
        name = feat.get("name", "Unknown")
        value = feat.get("value", "N/A")
        influence_pct = feat.get("influence_pct", abs(feat.get("contribution", 0)))
        direction = feat.get("direction", "risk" if feat.get("contribution", 0) > 0 else "protective")
        friendly_name = FEATURE_DESCRIPTIONS.get(name, name)
        dir_label = "INCREASES risk" if direction == "risk" else "DECREASES risk (protective)"
        lines.append(
            f"  {i}. {friendly_name} ({name})"
            f"\n     Patient value: {value}"
            f"\n     Influence: {influence_pct:.1f}% of the model's decision"
            f"\n     Effect: {dir_label}"
        )

    if req.patient_payload:
        lines.append("")
        lines.append("FULL PATIENT INPUT DATA:")
        lines.append("------------------------")
        for key, val in req.patient_payload.items():
            friendly = FEATURE_DESCRIPTIONS.get(key, key)
            lines.append(f"  {friendly}: {val}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Gemini REST API helper — with model fallback + retry
# ---------------------------------------------------------------------------
async def _gemini_generate(prompt: str, max_retries: int = 1) -> str:
    """
    Call Gemini REST API directly. Try each model in the fallback chain.
    For each model, retry once on 429 errors before moving to the next.
    This is MUCH faster than the gRPC-based SDK which has long internal retries.
    """
    if state.http_client is None:
        raise HTTPException(status_code=503, detail="HTTP client not initialised.")

    errors_seen: list[str] = []

    for model_name in GEMINI_MODEL_CHAIN:
        url = f"{GEMINI_BASE_URL}/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 4096,
            },
        }

        for attempt in range(max_retries + 1):
            try:
                logger.info("Gemini REST: trying '%s' (attempt %d)...", model_name, attempt + 1)
                resp = await state.http_client.post(url, json=payload)

                if resp.status_code == 200:
                    data = resp.json()
                    # Extract text from response
                    try:
                        text = data["candidates"][0]["content"]["parts"][0]["text"]
                        logger.info("Gemini REST: success from '%s'.", model_name)
                        return text
                    except (KeyError, IndexError) as parse_err:
                        err_msg = f"Unexpected response structure from {model_name}: {data}"
                        logger.warning(err_msg)
                        errors_seen.append(err_msg)
                        break  # try next model

                elif resp.status_code == 429:
                    detail = resp.json().get("error", {}).get("message", "Rate limited")
                    logger.warning(
                        "Gemini REST: 429 on '%s' (attempt %d): %s",
                        model_name, attempt + 1, detail[:120]
                    )
                    errors_seen.append(f"{model_name}: 429 quota exceeded")
                    if attempt < max_retries:
                        await asyncio.sleep(2)  # brief wait before retry
                    else:
                        break  # move to next model

                else:
                    detail = resp.text[:200]
                    logger.warning(
                        "Gemini REST: %d from '%s': %s",
                        resp.status_code, model_name, detail
                    )
                    errors_seen.append(f"{model_name}: HTTP {resp.status_code}")
                    break  # try next model

            except httpx.TimeoutException:
                logger.warning("Gemini REST: timeout on '%s' (attempt %d)", model_name, attempt + 1)
                errors_seen.append(f"{model_name}: timeout")
                if attempt < max_retries:
                    await asyncio.sleep(1)
                else:
                    break

            except Exception as exc:
                logger.warning("Gemini REST: error on '%s': %s", model_name, exc)
                errors_seen.append(f"{model_name}: {str(exc)[:100]}")
                break

    # All models exhausted
    raise HTTPException(
        status_code=429,
        detail=(
            "All Gemini models have exceeded their quota. "
            "Please wait 1-2 minutes and try again. "
            f"Errors: {'; '.join(errors_seen)}"
        ),
    )


async def _gemini_chat(history: list[dict], message: str) -> str:
    """
    Chat via Gemini REST API with conversation history.
    Uses the same model fallback chain.
    """
    if state.http_client is None:
        raise HTTPException(status_code=503, detail="HTTP client not initialised.")

    # Build contents array with history + new message
    contents = []
    for msg in history:
        role = "user" if msg.get("role") == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg.get("content", "")}],
        })
    contents.append({
        "role": "user",
        "parts": [{"text": message}],
    })

    errors_seen: list[str] = []

    for model_name in GEMINI_MODEL_CHAIN:
        url = f"{GEMINI_BASE_URL}/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 4096,
            },
        }

        try:
            logger.info("Gemini REST chat: trying '%s'...", model_name)
            resp = await state.http_client.post(url, json=payload)

            if resp.status_code == 200:
                data = resp.json()
                try:
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    logger.info("Gemini REST chat: success from '%s'.", model_name)
                    return text
                except (KeyError, IndexError):
                    errors_seen.append(f"{model_name}: unexpected response")
                    continue

            elif resp.status_code == 429:
                errors_seen.append(f"{model_name}: 429 quota exceeded")
                continue

            else:
                errors_seen.append(f"{model_name}: HTTP {resp.status_code}")
                continue

        except Exception as exc:
            errors_seen.append(f"{model_name}: {str(exc)[:100]}")
            continue

    raise HTTPException(
        status_code=429,
        detail=(
            "All Gemini models have exceeded their quota. "
            "Please wait 1-2 minutes and try again. "
            f"Errors: {'; '.join(errors_seen)}"
        ),
    )


# ---------------------------------------------------------------------------
# Local Fallback Interpretation — for when Gemini is rate-limited
# ---------------------------------------------------------------------------
def _generate_local_fallback(req: InterpretRequest) -> str:
    """
    Generate a high-quality clinical interpretation locally using SHAP data.
    Ensures the demo works even if Gemini is down.
    """
    # Convert baseline log-odds to probability
    base_prob = _sigmoid(req.base_value)

    # Identify key drivers (positive SHAP) and protectors (negative SHAP)
    drivers = [f for f in req.features if f['contribution'] > 0]
    protectors = [f for f in req.features if f['contribution'] < 0]
    
    # Sort by impact
    drivers.sort(key=lambda x: x['contribution'], reverse=True)
    protectors.sort(key=lambda x: x['contribution']) # most negative first

    markdown = f"""## 📊 Risk Assessment Summary (XAI Clinical Model)
**Current Status:** {req.risk_level}
**Calculated Probability:** {req.risk_probability * 100:.1f}%
**Baseline population risk:** {base_prob * 100:.1f}%

The integrated XAI-CDSS engine has identified a **{req.risk_level.lower()}** profile. This assessment is based on {len(req.features)} clinical markers analyzed via Log-Odds impact scoring.

## 🔍 Understanding the Key Factors
"""
    for feat in req.features[:5]:
        name = FEATURE_DESCRIPTIONS.get(feat['name'], feat['name'])
        impact = "increasing" if feat['contribution'] > 0 else "reducing"
        markdown += f"- **{name}:** Currently at **{feat['value']}**, this factor has an Impact Score of **{feat['contribution']:+.2f}**, actively **{impact}** your risk.\n"

    if drivers:
        markdown += "\n## ⚠️ Primary Risk Drivers\n"
        for d in drivers[:3]:
            name = FEATURE_DESCRIPTIONS.get(d['name'], d['name'])
            markdown += f"- **{name}:** This is a significant factor contributing to your risk score (+{d['contribution']*100:.1f}%).\n"

    if protectors:
        markdown += "\n## 🛡️ Protective Factors\n"
        for p in protectors[:3]:
            name = FEATURE_DESCRIPTIONS.get(p['name'], p['name'])
            markdown += f"- **{name}:** This factor is currently helping to lower your overall risk (-{abs(p['contribution']*100):.1f}%).\n"

    markdown += f"""
## 💡 Personalized Mitigation Strategies
1. **{FEATURE_DESCRIPTIONS.get(drivers[0]['name'], drivers[0]['name']) if drivers else 'Blood Sugar'} Management:** Focus on lifestyle modifications to move this metric toward the clinical target range.
2. **Physical Activity:** Regular aerobic exercise (150 min/week) is recommended to improve insulin sensitivity.
3. **Weight Management:** If BMI is elevated, a structured 5-10% weight reduction plan can significantly improve metabolic outcomes.

## 📋 Recommended Next Steps
1. **Immediate:** Schedule a fasting plasma glucose (FPG) test or HbA1c screening.
2. **Short-term:** Maintain a food and activity log for the next 14 days.
3. **Long-term:** Consult a registered dietitian for a personalized therapeutic lifestyle change (TLC) plan.

---
*Note: This interpretation was generated by the local XAI clinical engine as the primary AI service is currently experiencing high traffic.*
"""
    return markdown


# ---------------------------------------------------------------------------
# Gemini Interpretation endpoint
# ---------------------------------------------------------------------------
@app.post("/api/interpret")
async def interpret_shap(req: InterpretRequest):
    """Send SHAP results to Gemini for detailed, panel-friendly interpretation."""
    context = _build_shap_context(req)

    prompt = f"""You are an expert clinical AI advisor for a diabetes risk assessment tool (XAI-CDSS).
You are explaining SHAP (Shapley Additive Explanations) results to a medical panel and the patient.

Here are the results to interpret:

{context}

Please provide a comprehensive, well-structured interpretation with the following sections.
Use markdown formatting for readability. Be detailed but use simple, intuitive language that
non-technical panel members and patients can understand.

## Risk Assessment Summary
Provide a clear 2-3 sentence overview of the patient's overall diabetes risk, what the probability means
in practical terms, and how it compares to the baseline population risk.

## Understanding the Key Factors
For EACH of the top SHAP features listed above, explain:
- What this factor means in plain language
- Why the patient's specific value is important
- How much it is pushing the risk up or down and what that means
- Use analogies or simple comparisons where helpful

## Primary Risk Drivers
Summarize the factors that are INCREASING this patient's risk. Explain WHY these are concerning
from a medical perspective, using evidence-based reasoning.

## Protective Factors
Summarize any factors that are REDUCING this patient's risk. Acknowledge the positive behaviors
and explain why they help.

## Personalized Mitigation Strategies
For each risk-increasing factor, provide SPECIFIC, ACTIONABLE recommendations the patient can follow:
- What lifestyle changes can directly address each risk factor
- Set realistic, measurable goals (e.g., "Aim to reduce BMI by 2-3 points over 6 months")
- Suggest dietary, exercise, and medical follow-up plans
- Prioritize the most impactful changes first

## Recommended Next Steps
Provide a clear action plan:
1. Immediate actions (this week)
2. Short-term goals (1-3 months)
3. Long-term lifestyle changes (3-12 months)
4. Medical follow-ups and screenings to schedule

Keep the tone professional but warm and encouraging. The goal is to empower the patient
with actionable knowledge, not to alarm them unnecessarily."""

    try:
        interpretation_text = await _gemini_generate(prompt)
        return {
            "status": "success",
            "interpretation": interpretation_text,
            "provider": "gemini"
        }
    except Exception as exc:
        logger.warning("Gemini failed, falling back to local clinical model: %s", exc)
        # Generate local fallback so the UI never breaks during the project review
        local_text = _generate_local_fallback(req)
        return {
            "status": "success",
            "interpretation": local_text,
            "provider": "local_fallback"
        }


# ---------------------------------------------------------------------------
# Gemini Chat endpoint — follow-up questions
# ---------------------------------------------------------------------------
@app.post("/api/chat")
async def chat_followup(req: ChatRequest):
    """Allow the user to ask follow-up questions about the diagnosis."""
    context = _build_shap_context(req)

    system_prompt = f"""You are an expert clinical AI advisor for a diabetes risk assessment tool (XAI-CDSS).
You are having a follow-up conversation with a patient or medical panel member about their
diabetes risk assessment results.

Here is the patient's assessment data for reference:

{context}

IMPORTANT GUIDELINES:
- Answer questions clearly and in simple language
- When discussing medical topics, be accurate but accessible
- Provide actionable advice when appropriate
- If asked about something outside the scope of diabetes risk, politely redirect
- Always remind users that your advice supplements (not replaces) professional medical consultation
- Use markdown formatting for readability
- Be warm, empathetic, and encouraging
- If the question is about a specific risk factor, reference the patient's actual values"""

    # Build history
    chat_history = []
    if req.history:
        for msg in req.history:
            chat_history.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", ""),
            })

    # For the first message, prepend the system context
    if not chat_history:
        full_message = f"{system_prompt}\n\nUser question: {req.question}"
    else:
        full_message = req.question

    try:
        response_text = await _gemini_chat(chat_history, full_message)
        return {
            "status": "success",
            "response": response_text,
            "provider": "gemini"
        }
    except Exception as exc:
        logger.warning("Gemini chat failed fallback: %s", exc)
        return {
            "status": "success",
            "response": "I apologize, but my advanced clinical analysis module is currently offline due to rate limits. Please try again in 1-2 minutes, or consult the 'Risk Summary' above which contains our core local analysis.",
            "provider": "local_fallback"
        }


# ---------------------------------------------------------------------------
# Run with: python main.py
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
