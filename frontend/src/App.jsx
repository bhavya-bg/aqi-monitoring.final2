import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Wind, MapPin, Loader2 } from 'lucide-react'; 
import { locationData } from './mockData';
import MapChart from './MapChart';
import ReportDashboard from './ReportDashboard';
import './App.css';

function App() {
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [wardInput, setWardInput] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const states = Object.keys(locationData);
  const districts = selectedState ? locationData[selectedState] : [];

  const fetchPrediction = async (payload) => {
  setLoading(true);
  try {

    const predictRes = await fetch("http://127.0.0.1:5000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        state: selectedState || "Delhi" 
      })
    });
    const currentData = await predictRes.json();

    if (currentData.error) throw new Error(currentData.error);

  
    const forecastRes = await fetch("http://127.0.0.1:5000/forecast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        lat: payload.lat, 
        lon: payload.lon, 
        state: selectedState || "Delhi",
  
        pm25: currentData.pm25 || 60, 
        pm10: currentData.pm10 || 100,
        no2: currentData.no2 || 40,
        nh3: currentData.nh3 || 20,
        so2: currentData.so2 || 10,
        co: currentData.co || 1.5,
        o3: currentData.o3 || 50
      })
    });
    const forecastData = await forecastRes.json();

    setReportData({ 
      ...currentData, 
      forecast: forecastData.forecast || [] 
    });

  } catch (err) {
    console.error(err);
    alert("System Error: Check backend!");
  } finally {
    setLoading(false);
  }
};

  const handleLiveLocation = () => {
    if (!navigator.geolocation) return alert("Geo not supported");
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await fetchPrediction({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    }, () => setLoading(false));
  };

const handleGenerateReport = async (e) => {
  if (e) e.preventDefault();
  if (!selectedState || !selectedDistrict || !wardInput) return alert("Fill all the fields first!");

  setLoading(true);
  
  
  const primaryQuery = `${wardInput}, ${selectedDistrict}, ${selectedState}, India`;
  const secondaryQuery = `${selectedDistrict}, ${selectedState}, India`;
  
  try {
  
    let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(primaryQuery)}&limit=1`);
    let data = await res.json();
    

    if (!data || data.length === 0) {
      console.log("Ward level failed, trying city level...");
      res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(secondaryQuery)}&limit=1`);
      data = await res.json();
    }
    
    if (data && data[0]) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      
      console.log(`OSM Coordinates: ${lat}, ${lon}`);

      await fetchPrediction({ lat, lon });
      
    } else {
      alert("Location coordinates not found");
      setLoading(false);
    }
  } catch (err) {
    console.error("OSM Error:", err);
    alert("Location Coordinates not found");
    setLoading(false);
  }
};

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="brand">
          <Wind size={28} className="logo-icon" color="#2563eb" />
          <h2>AQI Predictor</h2>
        </div>
        
        <div className="form-group">
          <label>State</label>
          <select value={selectedState} onChange={(e) => {
            setSelectedState(e.target.value);
            setSelectedDistrict('');
            setWardInput('');
          }}>
            <option value="">Select State</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>City/District</label>
          <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)} disabled={!selectedState}>
            <option value="">Select District</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Ward / Locality</label>
          <div className="search-wrapper">
            <input 
              type="text" 
              placeholder="e.g. Lalbagh"
              value={wardInput} 
              onChange={(e) => setWardInput(e.target.value)}
            />
            <button type="button" className="location-icon-btn" onClick={handleLiveLocation}>
              <MapPin size={18} />
            </button>
          </div>
        </div>

        <button className="generate-btn" onClick={handleGenerateReport} disabled={loading}>
          {loading ? <Loader2 className="spinner" size={18} /> : "Generate Report"}
        </button>
      </div>

      <div className="map-area">
        <MapChart selectedState={selectedState} />
        <AnimatePresence>
          {reportData && <ReportDashboard data={reportData} onClose={() => setReportData(null)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;