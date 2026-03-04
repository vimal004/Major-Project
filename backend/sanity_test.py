import urllib.request
import json
import time

def test_api(name, data):
    print(f"\n--- Testing Profile: {name} ---")
    req = urllib.request.Request(
        'http://localhost:8000/api/predict',
        data=json.dumps(data).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as resp:
            content = json.loads(resp.read())
            print(json.dumps(content, indent=2))

            # Sanity Check logic
            prob = content['risk_probability']
            level = content['risk_level']
            shap = content['shap_data']['features']

            print(f"\n[SANITY CHECK FOR {name}]")
            print(f"- Probability: {prob*100:.1f}% ({level})")

            # Validate SHAP directions based on medical common sense
            top_feature = shap[0]
            print(f"- Top Impact Feature: {top_feature['name']} (Contribution: {top_feature['contribution']:.4f})")

            if name == "High Risk" and prob > 0.6:
                print("✓ Result is believable: High-risk indicators (BMI 35, HighBP, HeartDisease) correctly yielded high probability.")
            elif name == "Low Risk" and prob < 0.3:
                print("✓ Result is believable: Healthy indicators yielded low probability.")
            else:
                print("⚠ Result might need review: Probability does not match profile expectations.")

    except Exception as e:
        print(f"Error testing {name}: {e}")

# High Risk: Obese (BMI 35), High BP, Heart Disease, Old (Age 11), Low Income, Smoker
high_risk = {
    "HighBP": 1.0, "HighChol": 1.0, "CholCheck": 1.0, "BMI": 35.0,
    "Smoker": 1.0, "Stroke": 0.0, "HeartDiseaseorAttack": 1.0, "PhysActivity": 0.0,
    "Fruits": 0.0, "Veggies": 0.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0,
    "NoDocbcCost": 0.0, "GenHlth": 4.0, "MentHlth": 5.0, "PhysHlth": 15.0,
    "DiffWalk": 1.0, "Sex": 1.0, "Age": 11.0, "Education": 4.0, "Income": 3.0
}

# Low Risk: Healthy BMI (22), No BP issues, Active, Young (Age 2), High Income, Non-smoker
low_risk = {
    "HighBP": 0.0, "HighChol": 0.0, "CholCheck": 1.0, "BMI": 22.0,
    "Smoker": 0.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "PhysActivity": 1.0,
    "Fruits": 1.0, "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0,
    "NoDocbcCost": 0.0, "GenHlth": 1.0, "MentHlth": 0.0, "PhysHlth": 0.0,
    "DiffWalk": 0.0, "Sex": 0.0, "Age": 2.0, "Education": 6.0, "Income": 8.0
}

if __name__ == "__main__":
    test_api("High Risk", high_risk)
    test_api("Low Risk", low_risk)
