import requests
r = requests.post('http://localhost:8000/api/predict', json={
    'HighBP':0,'HighChol':0,'CholCheck':1,'BMI':22,'Smoker':0,
    'Stroke':0,'HeartDiseaseorAttack':0,'PhysActivity':1,'Fruits':1,
    'Veggies':1,'HvyAlcoholConsump':0,'AnyHealthcare':1,'NoDocbcCost':0,
    'GenHlth':1,'MentHlth':0,'PhysHlth':0,'DiffWalk':0,'Sex':0,
    'Age':2,'Education':6,'Income':8
})
d = r.json()
print(f"Risk: {d['risk_probability']} ({d['risk_level']})")
print("Feature Influences:")
total = 0
for f in d['shap_data']['features']:
    print(f"  {f['name']}: {f['influence_pct']}% influence ({f['direction']})")
    total += f['influence_pct']
print(f"\nShown features total: {total:.1f}% (remaining features make up the rest to ~100%)")
