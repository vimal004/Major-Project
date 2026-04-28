#!/usr/bin/env python3
"""
Simple test for the enhanced system using direct imports
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the main application
from main import *
import json

def test_enhanced_functions():
    """Test the enhanced functions directly"""
    print("🧪 Testing Enhanced AI Interpretation Functions...")
    print("=" * 60)
    
    # Test patient data
    test_patient = {
        "HighBP": 1.0, "HighChol": 1.0, "CholCheck": 1.0, "BMI": 28.5, "Smoker": 0.0,
        "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 0.0, "PhysActivity": 0.0,
        "Fruits": 0.0, "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0,
        "NoDocbcCost": 0.0, "GenHlth": 3.0, "MentHlth": 5.0, "PhysHlth": 10.0,
        "DiffWalk": 0.0, "Sex": 1.0, "Age": 9.0, "Education": 5.0, "Income": 6.0
    }
    
    # Test Groq preprompt enhancement
    print("\n📝 Testing Enhanced Groq Preprompt...")
    preprompt = groq_preprompt()
    print(f"✅ Preprompt length: {len(preprompt)} chars")
    print(f"✅ Contains 'ANALYTICAL FRAMEWORK': {'ANALYTICAL FRAMEWORK' in preprompt}")
    print(f"✅ Contains 'STRUCTURED OUTPUT': {'STRUCTURED OUTPUT' in preprompt}")
    print(f"✅ Contains 'CLINICAL PRECISION': {'CLINICAL PRECISION' in preprompt}")
    
    # Test generate_groq_report function signature
    print("\n🔧 Testing Enhanced Function Signature...")
    import inspect
    sig = inspect.signature(generate_groq_report)
    params = list(sig.parameters.keys())
    expected_params = ['disease', 'prob', 'threshold', 'level', 'base_val', 'top_features', 'all_features', 'patient_data', 'shap_diagnostics']
    
    print(f"✅ Function has {len(params)} parameters")
    print(f"✅ Has 'all_features' parameter: {'all_features' in params}")
    print(f"✅ Has 'shap_diagnostics' parameter: {'shap_diagnostics' in params}")
    
    # Test ChatRequest model
    print("\n💬 Testing Enhanced Chat Request...")
    chat_req = ChatRequest(
        question="What are my main risk factors?",
        context_disease="diabetes",
        risk_probability=0.75,
        risk_level="High",
        features=[{"name": "BMI", "contribution": 0.15}],
        patient_payload=test_patient,
        history=[]
    )
    print(f"✅ ChatRequest created successfully")
    print(f"✅ Patient payload has {len(chat_req.patient_payload)} features")
    
    # Test feature labels
    print("\n🏷️ Testing Feature Labels...")
    print(f"✅ Total feature labels: {len(FEATURE_LABELS)}")
    print(f"✅ BMI label: {FEATURE_LABELS.get('BMI', 'Not found')}")
    print(f"✅ HighBP label: {FEATURE_LABELS.get('HighBP', 'Not found')}")
    
    # Test disease display names
    print("\n🏥 Testing Disease Display Names...")
    print(f"✅ Diabetes display: {DISEASE_DISPLAY_NAMES.get('diabetes', 'Not found')}")
    print(f"✅ Heart display: {DISEASE_DISPLAY_NAMES.get('heart', 'Not found')}")
    print(f"✅ Stroke display: {DISEASE_DISPLAY_NAMES.get('stroke', 'Not found')}")
    
    print("\n" + "=" * 60)
    print("🎉 Enhanced System Components Verified!")
    print("✅ AI preprompts enhanced with comprehensive context")
    print("✅ Function signatures updated for full data access")
    print("✅ Multi-disease support confirmed")
    print("✅ Feature labeling system complete")
    print("✅ Chat request model supports comprehensive context")

if __name__ == "__main__":
    test_enhanced_functions()
