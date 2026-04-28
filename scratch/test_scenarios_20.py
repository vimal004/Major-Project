import requests
import json
import pandas as pd

API_URL = "http://localhost:8000/api/predict/all"

scenarios = [
    # --- ORIGINAL 10 ---
    {"name": "1. Young Healthy Athlete", "payload": {"HighBP": 0.0, "HighChol": 0.0, "CholCheck": 1.0, "BMI": 22.0, "Smoker": 0.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 0.0, "PhysActivity": 1.0, "Fruits": 1.0, "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 1.0, "MentHlth": 0.0, "PhysHlth": 0.0, "DiffWalk": 0.0, "Sex": 0.0, "Age": 2.0, "Education": 6.0, "Income": 8.0}},
    {"name": "2. Obese Sedentary Middle-Aged", "payload": {"HighBP": 1.0, "HighChol": 1.0, "CholCheck": 1.0, "BMI": 38.0, "Smoker": 0.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 1.0, "PhysActivity": 0.0, "Fruits": 0.0, "Veggies": 0.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 4.0, "MentHlth": 5.0, "PhysHlth": 5.0, "DiffWalk": 1.0, "Sex": 1.0, "Age": 8.0, "Education": 4.0, "Income": 4.0}},
    {"name": "3. Elderly Multi-morbidity", "payload": {"HighBP": 1.0, "HighChol": 1.0, "CholCheck": 1.0, "BMI": 30.0, "Smoker": 1.0, "Stroke": 1.0, "HeartDiseaseorAttack": 1.0, "Diabetes": 2.0, "PhysActivity": 0.0, "Fruits": 0.0, "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 5.0, "MentHlth": 15.0, "PhysHlth": 25.0, "DiffWalk": 1.0, "Sex": 0.0, "Age": 13.0, "Education": 3.0, "Income": 2.0}},
    {"name": "4. Heavy Smoker & Drinker", "payload": {"HighBP": 1.0, "HighChol": 0.0, "CholCheck": 1.0, "BMI": 26.0, "Smoker": 1.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 0.0, "PhysActivity": 1.0, "Fruits": 1.0, "Veggies": 1.0, "HvyAlcoholConsump": 1.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 3.0, "MentHlth": 10.0, "PhysHlth": 2.0, "DiffWalk": 0.0, "Sex": 1.0, "Age": 6.0, "Education": 5.0, "Income": 5.0}},
    {"name": "5. Stressed Low-Income Professional", "payload": {"HighBP": 1.0, "HighChol": 1.0, "CholCheck": 0.0, "BMI": 29.0, "Smoker": 1.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 0.0, "PhysActivity": 0.0, "Fruits": 0.0, "Veggies": 0.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 0.0, "NoDocbcCost": 1.0, "GenHlth": 4.0, "MentHlth": 25.0, "PhysHlth": 10.0, "DiffWalk": 0.0, "Sex": 1.0, "Age": 5.0, "Education": 4.0, "Income": 2.0}},
    {"name": "6. Fit Elderly (Age Weighting Check)", "payload": {"HighBP": 0.0, "HighChol": 0.0, "CholCheck": 1.0, "BMI": 23.0, "Smoker": 0.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 0.0, "PhysActivity": 1.0, "Fruits": 1.0, "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 2.0, "MentHlth": 2.0, "PhysHlth": 2.0, "DiffWalk": 0.0, "Sex": 0.0, "Age": 12.0, "Education": 6.0, "Income": 7.0}},
    {"name": "7. Prior Stroke Survivor", "payload": {"HighBP": 1.0, "HighChol": 1.0, "CholCheck": 1.0, "BMI": 27.0, "Smoker": 0.0, "Stroke": 1.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 0.0, "PhysActivity": 1.0, "Fruits": 1.0, "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 3.0, "MentHlth": 5.0, "PhysHlth": 10.0, "DiffWalk": 1.0, "Sex": 0.0, "Age": 10.0, "Education": 5.0, "Income": 6.0}},
    {"name": "8. Diabetic with High BP", "payload": {"HighBP": 1.0, "HighChol": 0.0, "CholCheck": 1.0, "BMI": 32.0, "Smoker": 0.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 2.0, "PhysActivity": 0.0, "Fruits": 1.0, "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 4.0, "MentHlth": 2.0, "PhysHlth": 5.0, "DiffWalk": 0.0, "Sex": 1.0, "Age": 9.0, "Education": 4.0, "Income": 5.0}},
    {"name": "9. Young Smoker with Bad Diet", "payload": {"HighBP": 0.0, "HighChol": 0.0, "CholCheck": 0.0, "BMI": 24.0, "Smoker": 1.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 0.0, "PhysActivity": 0.0, "Fruits": 0.0, "Veggies": 0.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 3.0, "MentHlth": 10.0, "PhysHlth": 0.0, "DiffWalk": 0.0, "Sex": 1.0, "Age": 3.0, "Education": 4.0, "Income": 4.0}},
    {"name": "10. 'Perfect' Record", "payload": {"HighBP": 0.0, "HighChol": 0.0, "CholCheck": 1.0, "BMI": 21.0, "Smoker": 0.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 0.0, "PhysActivity": 1.0, "Fruits": 1.0, "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 1.0, "MentHlth": 0.0, "PhysHlth": 0.0, "DiffWalk": 0.0, "Sex": 1.0, "Age": 1.0, "Education": 6.0, "Income": 8.0}},
    
    # --- NEW 10 ---
    {"name": "11. The Silent Killer", "payload": {"HighBP": 1.0, "HighChol": 1.0, "CholCheck": 1.0, "BMI": 26.0, "Smoker": 0.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 0.0, "PhysActivity": 1.0, "Fruits": 1.0, "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 2.0, "MentHlth": 0.0, "PhysHlth": 0.0, "DiffWalk": 0.0, "Sex": 1.0, "Age": 7.0, "Education": 5.0, "Income": 6.0}},
    {"name": "12. Recovering Alcoholic", "payload": {"HighBP": 0.0, "HighChol": 0.0, "CholCheck": 1.0, "BMI": 24.0, "Smoker": 0.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 0.0, "PhysActivity": 0.0, "Fruits": 0.0, "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 4.0, "MentHlth": 30.0, "PhysHlth": 15.0, "DiffWalk": 0.0, "Sex": 0.0, "Age": 6.0, "Education": 4.0, "Income": 3.0}},
    {"name": "13. Pre-Diabetic Active Senior", "payload": {"HighBP": 1.0, "HighChol": 0.0, "CholCheck": 1.0, "BMI": 27.0, "Smoker": 0.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 1.0, "PhysActivity": 1.0, "Fruits": 1.0, "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 3.0, "MentHlth": 0.0, "PhysHlth": 0.0, "DiffWalk": 0.0, "Sex": 0.0, "Age": 11.0, "Education": 5.0, "Income": 5.0}},
    {"name": "14. Socially Disadvantaged", "payload": {"HighBP": 1.0, "HighChol": 1.0, "CholCheck": 0.0, "BMI": 32.0, "Smoker": 1.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 1.0, "PhysActivity": 0.0, "Fruits": 0.0, "Veggies": 0.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 0.0, "NoDocbcCost": 1.0, "GenHlth": 5.0, "MentHlth": 20.0, "PhysHlth": 20.0, "DiffWalk": 1.0, "Sex": 1.0, "Age": 9.0, "Education": 2.0, "Income": 1.0}},
    {"name": "15. Fit Smoker", "payload": {"HighBP": 0.0, "HighChol": 0.0, "CholCheck": 1.0, "BMI": 21.0, "Smoker": 1.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 0.0, "PhysActivity": 1.0, "Fruits": 1.0, "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 2.0, "MentHlth": 5.0, "PhysHlth": 0.0, "DiffWalk": 0.0, "Sex": 1.0, "Age": 4.0, "Education": 6.0, "Income": 7.0}},
    {"name": "16. Mental Health Priority", "payload": {"HighBP": 0.0, "HighChol": 0.0, "CholCheck": 1.0, "BMI": 25.0, "Smoker": 0.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 0.0, "PhysActivity": 1.0, "Fruits": 1.0, "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 4.0, "MentHlth": 30.0, "PhysHlth": 5.0, "DiffWalk": 0.0, "Sex": 0.0, "Age": 5.0, "Education": 5.0, "Income": 6.0}},
    {"name": "17. Young Type 1/Gestational context", "payload": {"HighBP": 0.0, "HighChol": 0.0, "CholCheck": 1.0, "BMI": 25.0, "Smoker": 0.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 2.0, "PhysActivity": 1.0, "Fruits": 1.0, "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 3.0, "MentHlth": 5.0, "PhysHlth": 5.0, "DiffWalk": 0.0, "Sex": 0.0, "Age": 3.0, "Education": 5.0, "Income": 6.0}},
    {"name": "18. Heart Attack Survivor (Rehab)", "payload": {"HighBP": 1.0, "HighChol": 1.0, "CholCheck": 1.0, "BMI": 24.0, "Smoker": 0.0, "Stroke": 0.0, "HeartDiseaseorAttack": 1.0, "Diabetes": 0.0, "PhysActivity": 1.0, "Fruits": 1.0, "Veggies": 1.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 3.0, "MentHlth": 2.0, "PhysHlth": 5.0, "DiffWalk": 0.0, "Sex": 1.0, "Age": 10.0, "Education": 5.0, "Income": 7.0}},
    {"name": "19. Fruit-Averse Athlete", "payload": {"HighBP": 0.0, "HighChol": 0.0, "CholCheck": 1.0, "BMI": 23.0, "Smoker": 0.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 0.0, "PhysActivity": 1.0, "Fruits": 0.0, "Veggies": 0.0, "HvyAlcoholConsump": 0.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 2.0, "MentHlth": 0.0, "PhysHlth": 0.0, "DiffWalk": 0.0, "Sex": 1.0, "Age": 4.0, "Education": 6.0, "Income": 8.0}},
    {"name": "20. Standard High-Risk Male", "payload": {"HighBP": 1.0, "HighChol": 1.0, "CholCheck": 1.0, "BMI": 31.0, "Smoker": 1.0, "Stroke": 0.0, "HeartDiseaseorAttack": 0.0, "Diabetes": 0.0, "PhysActivity": 0.0, "Fruits": 0.0, "Veggies": 0.0, "HvyAlcoholConsump": 1.0, "AnyHealthcare": 1.0, "NoDocbcCost": 0.0, "GenHlth": 4.0, "MentHlth": 10.0, "PhysHlth": 10.0, "DiffWalk": 0.0, "Sex": 1.0, "Age": 9.0, "Education": 4.0, "Income": 4.0}},
]

summary_results = []
for s in scenarios:
    print(f"Testing: {s['name']}")
    try:
        response = requests.post(API_URL, json=s['payload'])
        if response.status_code == 200:
            data = response.json()
            assessments = data['assessments']
            row = {"Scenario": s['name']}
            for disease in ['diabetes', 'heart', 'stroke']:
                res = assessments[disease]
                row[f"{disease}_prob"] = res['prob']
                row[f"{disease}_level"] = res['level']
                top_feat = res['shap_features'][0]['name'] if res['shap_features'] else "None"
                row[f"{disease}_top"] = top_feat
            summary_results.append(row)
        else:
            print(f"  [ERROR] {response.status_code}: {response.text}")
    except Exception as e:
        print(f"  [FAILED] {e}")

df = pd.DataFrame(summary_results)
print("\n--- 20 PATIENT FULL SANITY CHECK ---")
print(df.to_string(index=False))

with open("test_results_20.json", "w") as f:
    json.dump(summary_results, f, indent=4)
