import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ShieldCheck, Wind, Info, User, Baby, Heart, 
  Users, Activity, Sparkles, TrendingUp
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const ReportDashboard = ({ data, onClose }) => {
  const [persona, setPersona] = useState('Adult');
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  // Fetch Advice logic (Same as before)
  const fetchAiAdvice = async (selectedPersona) => {
    setLoadingAdvice(true);
    try {
      const res = await fetch("http://127.0.0.1:5000/get-ai-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aqi: data.aqi,
          category: data.category,
          persona: selectedPersona,
          reason: data.pollution_reason
        })
      });
      const result = await res.json();
      setAiAdvice(result.advice);
    } catch (err) {
      setAiAdvice("Safety first: Limit outdoor exposure during high pollution.");
    } finally {
      setLoadingAdvice(false);
    }
  };

  useEffect(() => {
    if (data) fetchAiAdvice('Adult');
  }, [data]);

  if (!data) return null;

  const personas = [
    { name: 'Adult', icon: <User size={18} /> },
    { name: 'Kid', icon: <Baby size={18} /> },
    { name: 'Aged People', icon: <Heart size={18} /> },
    { name: 'Pregnant Women', icon: <Users size={18} /> },
    { name: 'Sensitive Skin', icon: <Sparkles size={18} /> },
    { name: 'Respiratory Issues', icon: <Activity size={18} /> }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="report-overlay" onClick={onClose}>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="clean-report-card" onClick={(e) => e.stopPropagation()}>
        
        <button className="minimal-close" onClick={onClose}><X size={20} /></button>

        <div className="report-main-info">
          <div className="aqi-circle" style={{ borderColor: data.color || '#2563eb' }}>
            <span className="aqi-big-num">{data.aqi}</span>
            <span className="aqi-sub-label">AQI</span>
          </div>
          <div className="status-text">
            <h2 style={{ color: data.color || '#2563eb' }}>{data.category}</h2>
            <p className="dominant-info">Dominant: <strong>{data.dominant_pollutant || 'PM2.5'}</strong></p>
          </div>
        </div>

        <div className="reasoning-box">
          <Activity size={16} className="reason-icon" />
          <p><strong>Analysis:</strong> {data.pollution_reason}</p>
        </div>

        {/* --- Forecast Chart Section (Updated) --- */}
        <div className="forecast-chart-container">
          <div className="chart-header">
            <TrendingUp size={14} /> <span>7-Day Hybrid AI Forecast</span>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={data.forecast} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" hide />
                <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
                
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="custom-tooltip" style={{ background: '#fff', padding: '8px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
                          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px', color: '#1e293b' }}>{`${d.day} (${d.date})`}</p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#2563eb' }}>{`Predicted AQI: ${d.aqi}`}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{`${d.temp}°C | Wind: ${d.wind || d.wind_speed} m/s`}</p>
                          <p style={{ margin: 0, fontSize: '11px', fontWeight: '500', color: '#0f172a' }}>{`Condition: ${d.condition}`}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="aqi" stroke="#2563eb" fillOpacity={1} fill="url(#colorAqi)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* --- End Chart Section --- */}

        <hr className="light-divider" />

        {/* Persona & Advice Section (Same as before) */}
        <div className="persona-section">
          <p className="section-hint">Safety Advice for:</p>
          <div className="persona-flex">
            {personas.map(p => (
              <button 
                key={p.name} 
                className={`minimal-btn ${persona === p.name ? 'active' : ''}`} 
                onClick={() => {
                  setPersona(p.name);
                  fetchAiAdvice(p.name);
                }}
              >
                {p.icon}
              </button>
            ))}
          </div>
          <p className="active-persona-name">{persona}</p>
        </div>

        <div className="light-advisory-card">
          <div className="advisory-header">
            <Sparkles size={16} color="#2563eb" />
            <span>AI Health Recommendation</span>
          </div>
          <AnimatePresence mode="wait">
            {loadingAdvice ? (
              <motion.p key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="advisory-p loading-text">
                Analyzing trends for {persona}...
              </motion.p>
            ) : (
              <motion.p key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="advisory-p">
                {aiAdvice}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="minimal-footer">
          <div className="meta-row">
            <div className="meta-item"><Info size={14} /> <span>{data.source || 'Hybrid ML Model'}</span></div>
            <div className="meta-item">
              <ShieldCheck size={14} color={data.confidence === 'High' ? '#10b981' : '#f59e0b'} />
              <span>{data.confidence || 'High'} Confidence</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ReportDashboard;