import requests
import json
import pandas as pd

API_URL = "http://localhost:8000/api/predict"

scenarios = [
    {
        "name": "High Risk (Classic)",
        "payload": {
            "HighBP": 1.0, "HighChol": 1.0, "CholCheck": 1.0, "BMI": 35.0, "Smoker": 1.0,
            "Stroke": 0.0, "HeartDiseaseorAttack": 1.0, "PhysActivity": 0.0, "Fruits": 0.0,
            "Veggies": 0.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0,
            "GenHlth": 5.0, "MentHlth": 10.0, "PhysHlth": 20.0, "DiffWalk": 1.0, "Sex": 1.0,
            "Age": 11.0, "Education": 4.0, "Income": 3.0
        }
    },
    {
        "name": "Low Risk (Healthy Young)",
        "payload": {
            "HighBP": 0.0, "HighChol": 0.0, "CholCheck": 1.0, "BMI": 22.0, "Smoker": 0.0,
            "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "PhysActivity": 1.0, "Fruits": 1.0,
            "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0,
            "GenHlth": 1.0, "MentHlth": 0.0, "PhysHlth": 0.0, "DiffWalk": 0.0, "Sex": 0.0,
            "Age": 2.0, "Education": 6.0, "Income": 8.0
        }
    },
    {
        "name": "Healthy Smoker (Mixed)",
        "payload": {
            "HighBP": 0.0, "HighChol": 0.0, "CholCheck": 1.0, "BMI": 24.0, "Smoker": 1.0,
            "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "PhysActivity": 1.0, "Fruits": 1.0,
            "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0,
            "GenHlth": 2.0, "MentHlth": 0.0, "PhysHlth": 0.0, "DiffWalk": 0.0, "Sex": 1.0,
            "Age": 4.0, "Education": 5.0, "Income": 6.0
        }
    },
    {
        "name": "Old but Fit (Weight of Age)",
        "payload": {
            "HighBP": 0.0, "HighChol": 0.0, "CholCheck": 1.0, "BMI": 23.0, "Smoker": 0.0,
            "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "PhysActivity": 1.0, "Fruits": 1.0,
            "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0,
            "GenHlth": 2.0, "MentHlth": 2.0, "PhysHlth": 2.0, "DiffWalk": 0.0, "Sex": 0.0,
            "Age": 13.0, "Education": 6.0, "Income": 7.0
        }
    },
    {
        "name": "The 'Hidden' Risk (Normal BMI, bad metrics)",
        "payload": {
            "HighBP": 1.0, "HighChol": 1.0, "CholCheck": 1.0, "BMI": 24.0, "Smoker": 0.0,
            "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "PhysActivity": 0.0, "Fruits": 0.0,
            "Veggies": 0.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0,
            "GenHlth": 4.0, "MentHlth": 5.0, "PhysHlth": 5.0, "DiffWalk": 0.0, "Sex": 0.0,
            "Age": 9.0, "Education": 4.0, "Income": 5.0
        }
    }
]

results = []

for s in scenarios:
    print(f"Testing {s['name']}...")
    try:
        response = requests.post(API_URL, json=s['payload'])
        if response.status_code == 200:
            data = response.json()
            results.append({
                "Scenario": s['name'],
                "Prob": data['risk_probability'],
                "Level": data['risk_level'],
                "Top Features": [(f['name'], round(f['contribution'], 4)) for f in data['shap_data']['features']]
            })
        else:
            print(f"Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Failed to connect: {e}")

print("\n--- SANITY CHECK RESULTS ---")
for r in results:
    print(f"\nScenario: {r['Scenario']}")
    print(f"Probability: {r['Prob']} ({r['Level']})")
    print("Top Influencing Factors (SHAP):")
    for feat, impact in r['Top Features']:
        direction = "INCREASES risk (+)" if impact > 0 else "DECREASES risk (-)"
        print(f"  - {feat}: {impact} ({direction})")
