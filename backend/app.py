import os
import requests
from datetime import datetime, timedelta
import math
import joblib
import random
from flask import Flask, request, jsonify
from flask_cors import CORS  
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}}) 


WAQI_TOKEN = os.getenv("WAQI_TOKEN")
OWM_KEY = os.getenv("OPENWEATHER_API_KEY")

# --- UTILS ---
BREAKPOINTS = {
    "pm2_5": [(0,30,0,50),(31,60,51,100),(61,90,101,200),(91,120,201,300),(121,250,301,400),(250,1000,401,500)],
    "pm10": [(0,50,0,50),(51,100,51,100),(101,250,101,200),(251,350,201,300),(351,430,301,400),(430,1000,401,500)],
    "no2": [(0,40,0,50),(41,80,51,100),(81,180,101,200),(181,280,201,300),(281,400,301,400),(400,1000,401,500)],
    "so2": [(0,40,0,50),(41,80,51,100),(81,380,101,200),(381,800,201,300),(801,1600,301,400),(1600,5000,401,500)],
    "co": [(0,1,0,50),(1.1,2,51,100),(2.1,10,101,200),(10,17,201,300),(17,34,301,400),(34,100,401,500)],
    "o3": [(0,50,0,50),(51,100,51,100),(101,168,101,200),(169,208,201,300),(209,748,301,400),(748,2000,401,500)]
}

def get_sub_index(cp, pollutant):
    if cp is None: return 0
    for (blo, bhi, ilo, ihi) in BREAKPOINTS[pollutant]:
        if blo <= cp <= bhi:
            return ((ihi - ilo)/(bhi - blo))*(cp - blo) + ilo
    return 500

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat, dlon = math.radians(lat2-lat1), math.radians(lon2-lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
    return R*(2*math.atan2(math.sqrt(a), math.sqrt(1-a)))

def calculate_weather_impact(current_aqi, wind, humidity, temp_diff):
    impact_factor = 1.0
    if wind > 4.1: impact_factor *= 0.82
    elif wind < 1.5: impact_factor *= 1.15
    if humidity > 75: impact_factor *= 1.12
    elif humidity < 30: impact_factor *= 0.95
    if temp_diff < -3: impact_factor *= 1.10
    predicted = current_aqi * impact_factor
    return round(predicted * random.uniform(0.97, 1.03))

# --- ROUTES ---

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    lat, lon = data.get('lat'), data.get('lon')
    

    delta = 1.0
    try:
        url = f"https://api.waqi.info/map/bounds/?token={WAQI_TOKEN}&latlng={lat-delta},{lon-delta},{lat+delta},{lon+delta}"
        stations = requests.get(url).json().get('data', [])
        valid = [s for s in stations if s.get('aqi') and s['aqi']!='-' and int(s['aqi'])>0]
    except: valid = []


    owm_res = requests.get(f"http://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={OWM_KEY}").json()
    comp = owm_res['list'][0]['components'] if 'list' in owm_res else {}

    sub = {
        "pm2_5": get_sub_index(comp.get('pm2_5'),"pm2_5"),
        "pm10": get_sub_index(comp.get('pm10'),"pm10"),
        "no2": get_sub_index(comp.get('no2'),"no2"),
        "so2": get_sub_index(comp.get('so2'),"so2"),
        "co": get_sub_index(comp.get('co')/1000,"co"),
        "o3": get_sub_index(comp.get('o3'),"o3")
    }
    owm_aqi = max(sub.values()) if sub else 0
    final_aqi = owm_aqi
    min_dist = 999

    if valid:
        distances = [haversine(lat,lon,float(s['lat']),float(s['lon'])) for s in valid]
        min_dist = min(distances)
        weighted = sum(int(s['aqi'])/(d+0.5) for s,d in zip(valid,distances))
        total = sum(1/(d+0.5) for d in distances)
        station_avg = weighted/total
        w = 0.9 if min_dist < 5 else 0.6 if min_dist < 25 else 0.3
        final_aqi = (station_avg * w) + (owm_aqi * (1-w))
    
        final_aqi = max(min(final_aqi, station_avg+30), station_avg-30)

    diff = abs(final_aqi - owm_aqi)
    confidence = "High" if min_dist < 5 and diff < 20 else "Medium" if min_dist < 15 and diff < 50 else "Low"
    
    # Categories
    def get_cat_data(aqi):
        if aqi <= 50: return "Good", "#10b981"
        if aqi <= 100: return "Satisfactory", "#84cc16"
        if aqi <= 200: return "Moderate", "#f59e0b"
        if aqi <= 300: return "Poor", "#f97316"
        return "Severe", "#ef4444"

    cat, color = get_cat_data(round(final_aqi))

    return jsonify({
        "aqi": round(final_aqi), "category": cat, "color": color,
        "dominant_pollutant": max(sub, key=sub.get).upper().replace("_","."),
        "pollution_reason": "Based on local concentration",
        "components": comp, "confidence": confidence, "source": "Hybrid Engine"
    })

import requests
from datetime import datetime, timedelta
import joblib
import numpy as np
from flask import Flask, request, jsonify


model = joblib.load('backend/aqi_7day_model.pkl')
le = joblib.load('backend/state_encoder.pkl')

@app.route('/forecast', methods=['POST'])
def forecast():
    data = request.json
    lat = data.get('lat')
    lon = data.get('lon')
    state_name = data.get('state', 'Delhi') 
    
    pm25 = data.get('pm25', 60)
    pm10 = data.get('pm10', 100)
    no2 = data.get('no2', 40)
    nh3 = data.get('nh3', 20)
    so2 = data.get('so2', 10)
    co = data.get('co', 1.5)
    o3 = data.get('o3', 50)

    weather_url = f"http://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={OWM_KEY}&units=metric"
    w_res = requests.get(weather_url).json()
    forecast_list = w_res.get('list', [])

    preds = []
    base_date = datetime.now()
    
    try:
        state_encoded = le.transform([state_name])[0]
    except:
        state_encoded = 0 
    
    
    for i in range(1, 8):
        future_date = base_date + timedelta(days=i)
        
    
        idx = min(i * 8, len(forecast_list) - 1)
        w_data = forecast_list[idx] if forecast_list else {}
        
        temp = w_data.get('main', {}).get('temp', 25)
        hum = w_data.get('main', {}).get('humidity', 50)
        
        input_features = [
            state_encoded, pm25, pm10, no2, nh3, so2, co, o3,
            future_date.day, future_date.month, future_date.weekday()
        ]
    
        predicted_aqi = model.predict([input_features])[0]
        
        preds.append({
            "day": f"Day {i}",
            "date": future_date.strftime('%Y-%m-%d'),
            "aqi": round(predicted_aqi),
            "temp": round(temp),
            "condition": w_data.get('weather', [{}])[0].get('main', 'Clear')
        })

    return jsonify({"forecast": preds})



@app.route('/get-ai-advice', methods=['POST'])
def get_ai_advice():
    data = request.json

    persona = data.get('persona', 'Adult')
    aqi = data.get('aqi', 0)
    category = data.get('category', 'Unknown')
    dominantPollutant = data.get('dominantPollutant', 'Unknown')
    
    advice_bank = {
        "Kid": [
            "Avoid outdoor play. High AQI damages developing lungs and reduces lung growth.",
            "Stay indoors. Polluted air can severely harm children’s lungs and immunity.",
            "Limit exposure. Toxic air affects kids’ lungs and long-term breathing capacity."
        ],
        "Aged People": [
            "Stay indoors. Poor AQI increases heart strain and breathing difficulty.",
            "Avoid exertion. Pollution worsens heart conditions and breathing problems.",
            "Use mask outside. High AQI triggers heart stress and respiratory issues."
        ],
        "Pregnant Women": [
            "Avoid exposure. High AQI may affect fetal development and oxygen supply.",
            "Stay indoors. Pollution can impact fetal health and pregnancy outcomes.",
            "Use purifier. Toxic air may harm fetal growth and maternal health."
        ],
        "Adult": [
            "Wear mask during commute. High AQI affects lungs and daily productivity.",
            "Avoid outdoor workouts. Pollution exposure during commute harms lungs.",
            "Limit travel. Use mask in commute to reduce pollutant inhalation."
        ],
        "Sensitive Skin": [
            "Protect skin. Pollution can trigger skin irritation and allergies.",
            "Avoid direct exposure. Toxic air worsens skin sensitivity and rashes.",
            "Cleanse properly. Pollutants can damage skin barrier and cause irritation."
        ],
        "Respiratory Issues": [
            "Carry inhaler. High AQI can trigger asthma attacks and breathing distress.",
            "Avoid exposure. Pollution worsens asthma and requires inhaler support.",
            "Stay indoors. Poor air can trigger severe asthma and breathing issues."
        ]
    }

    
    FALLBACKS = {
        "Kid": "Avoid outdoor play. Pollution harms developing lungs.",
        "Aged People": "Stay indoors. Poor air increases heart and breathing risks.",
        "Pregnant Women": "Use air purifier. Pollution may affect fetal health.",
        "Adult": "Wear mask during commute. Avoid outdoor exercise.",
        "Sensitive Skin": "Protect skin. Dust may cause irritation.",
        "Respiratory Issues": "Avoid triggers. Keep inhaler ready."
    }

    try:
        options = advice_bank.get(persona, [])
        if not options:
            return jsonify({"advice": "Air quality is poor. Limit outdoor exposure."})

    
        advice = random.choice(options)

        return jsonify({"advice": advice})

    except Exception as e:
        print("Error:", e)
        fallback = FALLBACKS.get(persona, "Air quality is poor. Limit outdoor exposure.")
        return jsonify({"advice": fallback})
if __name__ == '__main__':
    app.run(debug=True, port=5000)