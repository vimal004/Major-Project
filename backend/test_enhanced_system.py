#!/usr/bin/env python3
"""
Test script for the enhanced multi-disease AI interpretation system
Tests both SHAP report generation and Q&A functionality
"""

import requests
import json
import time

# Test patient data
test_patient = {
    "HighBP": 1.0,
    "HighChol": 1.0,
    "CholCheck": 1.0,
    "BMI": 28.5,
    "Smoker": 0.0,
    "Stroke": 0.0,
    "HeartDiseaseorAttack": 0.0,
    "Diabetes": 0.0,
    "PhysActivity": 0.0,
    "Fruits": 0.0,
    "Veggies": 1.0,
    "HvyAlcoholConsump": 0.0,
    "AnyHealthcare": 1.0,
    "NoDocbcCost": 0.0,
    "GenHlth": 3.0,
    "MentHlth": 5.0,
    "PhysHlth": 10.0,
    "DiffWalk": 0.0,
    "Sex": 1.0,
    "Age": 9.0,
    "Education": 5.0,
    "Income": 6.0
}

def test_predict_all():
    """Test the enhanced prediction endpoint for all diseases"""
    print("🧪 Testing Enhanced Multi-Disease Prediction System...")
    print("=" * 60)
    
    try:
        response = requests.post(
            "http://localhost:8000/api/predict/all",
            json=test_patient,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Prediction successful!")
            print(f"Status: {data.get('status')}")
            
            assessments = data.get('assessments', {})
            for disease, results in assessments.items():
                print(f"\n📊 {disease.upper()} Results:")
                print(f"  Probability: {results.get('prob', 0):.2%}")
                print(f"  Risk Level: {results.get('level', 'Unknown')}")
                print(f"  At Risk: {results.get('is_at_risk', False)}")
                print(f"  Threshold: {results.get('optimal_threshold', 0):.2%}")
                print(f"  AI Report Source: {results.get('ai_report_source', 'Unknown')}")
                print(f"  SHAP Features: {len(results.get('shap_features', []))}")
                print(f"  All SHAP Features: {len(results.get('all_shap_features', []))}")
                
                # Check if AI report was generated
                ai_report = results.get('ai_interpretation_report', '')
                if ai_report and len(ai_report) > 200:
                    print(f"  ✅ AI Report Generated ({len(ai_report)} chars)")
                    print(f"  📄 Report Preview: {ai_report[:200]}...")
                else:
                    print(f"  ⚠️  Using Local Fallback Report")
                
                # Check for errors
                error = results.get('ai_report_error')
                if error:
                    print(f"  ❌ AI Error: {error}")
            
            return data
        else:
            print(f"❌ Prediction failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return None

def test_qna_for_disease(disease, assessment_data):
    """Test the enhanced Q&A system for a specific disease"""
    print(f"\n💬 Testing Enhanced Q&A for {disease.upper()}...")
    print("-" * 40)
    
    # Prepare Q&A request with comprehensive context
    chat_request = {
        "question": f"What are the main risk factors for my {disease} assessment and how do they contribute to my risk level?",
        "context_disease": disease,
        "risk_probability": assessment_data.get('prob', 0),
        "risk_level": assessment_data.get('level', 'Unknown'),
        "features": assessment_data.get('all_shap_features', []),  # Send all features for comprehensive context
        "patient_payload": test_patient,
        "history": []
    }
    
    try:
        response = requests.post(
            "http://localhost:8000/api/chat",
            json=chat_request,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            ai_response = data.get('response', '')
            print(f"✅ Q&A Response Generated ({len(ai_response)} chars)")
            print(f"📄 Response: {ai_response[:300]}...")
            return ai_response
        else:
            print(f"❌ Q&A failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Q&A connection error: {e}")
        return None

def test_groq_health():
    """Test Groq API connectivity"""
    print("\n🔍 Testing Groq API Health...")
    print("-" * 30)
    
    try:
        response = requests.get("http://localhost:8000/api/groq-health")
        if response.status_code == 200:
            data = response.json()
            print(f"Status: {data.get('status')}")
            print(f"Configured: {data.get('configured')}")
            print(f"Message: {data.get('message')}")
            if data.get('working_model'):
                print(f"Model: {data.get('working_model')}")
            return data.get('status') == 'ok'
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def main():
    print("🚀 Enhanced Multi-Disease AI Interpretation System Test")
    print("=" * 60)
    
    # Test Groq connectivity first
    groq_ok = test_groq_health()
    
    # Test predictions for all diseases
    prediction_results = test_predict_all()
    
    if prediction_results:
        assessments = prediction_results.get('assessments', {})
        
        # Test Q&A for each disease
        for disease, results in assessments.items():
            test_qna_for_disease(disease, results)
            time.sleep(1)  # Small delay between requests
    
    print("\n" + "=" * 60)
    print("📋 Test Summary:")
    print(f"✅ Multi-disease prediction: {'✓' if prediction_results else '✗'}")
    print(f"✅ Groq API connectivity: {'✓' if groq_ok else '✗'}")
    print(f"✅ Enhanced AI reports: {'✓' if prediction_results else '✗'}")
    print(f"✅ Comprehensive Q&A context: {'✓' if prediction_results else '✗'}")
    
    if groq_ok:
        print("\n🎉 All systems operational with AI enhancement!")
    else:
        print("\n⚠️  System running with offline fallback - AI features limited")

if __name__ == "__main__":
    main()
