import { useEffect, useState, useRef } from 'react';
import type { TelemetryData } from './types';
import { useTelemetry } from "./hooks/useTelemetry";
import GaugeComponent from 'react-gauge-component';

function App() {
  const { data: liveData, sendCommand } = useTelemetry();
  const [history, setHistory] = useState<TelemetryData[]>([]);
  const wsRef = useRef<WebSocket | null>(null);


  useEffect(() => {
    const url = `${window.location.origin.replace(/^http/, 'ws')}/ws/telemetry/`;
    wsRef.current = new WebSocket(url);

    wsRef.current.onopen = () => console.log("WebSocket connected");
    wsRef.current.onclose = (e) => console.log("WebSocket closed:", e.code, e.reason);
    wsRef.current.onerror = (e) => console.error("WebSocket error:", e);

    return () => wsRef.current?.close(1000, "Component unmount");
  }, []);

  useEffect(() => {
    if (liveData) {
      setHistory(prev => [...prev.slice(-40), liveData]);
    }
  }, [liveData]);

  const handleMainAction = () => {
    if (liveData?.status === "running") {
      sendCommand("stop_vehicle");
    } else {
      sendCommand("start_vehicle");
    }
  };

  const handleCharge = () => {
    if (liveData?.status === "charging") {
      sendCommand("stop_charging");
    } else if (liveData?.status === "stopped") {
      sendCommand("start_charging");
    }
  };

  if (!liveData) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', fontSize: '1.4rem', color: 'white', background: '#0f172a' }}>
        <h2>Connecting to vehicle...</h2>
        <p>Please wait a moment</p>
      </div>
    );
  }

  const isRunning = liveData.status === "running";
  const isCharging = liveData.status === "charging";
  const canStartVehicle = !isCharging;

  const batteryColor = liveData.battery > 30 ? "#22c55e" : liveData.battery > 15 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{
      padding: "20px",
      background: "#0f172a",
      color: "white",
      minHeight: "100vh",
      fontFamily: "Arial, sans-serif",
      display: "flex",
      flexDirection: "column",
      gap: "24px"
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "24px",
        maxWidth: "1400px",
        margin: "0 auto",
        width: "100%"
      }}>
        <div style={{ background: "#1e293b", borderRadius: "16px", padding: "20px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          <h3 style={{ textAlign: "center", marginBottom: "12px" }}>Speed</h3>
          <GaugeComponent
            value={liveData.speed}
            minValue={0}
            maxValue={240}
            arc={{ width: 0.3, subArcs: [{ limit: 80, color: '#22c55e' }, { limit: 140, color: '#f59e0b' }, { limit: 200, color: '#f97316' }, { color: '#ef4444' }] }}
            needle={{ elastic: true, color: "#ef4444", length: 0.9, width: 12 }}
            labels={{ valueLabel: { fontSize: 48, formatTextValue: v => `${v} km/h` }, markLabel: { type: "outer", marks: [{ value: 0 }, { value: 40 }, { value: 80 }, { value: 120 }, { value: 160 }, { value: 200 }, { value: 240 }] } }}
          />
        </div>

        <div style={{ background: "#1e293b", borderRadius: "16px", padding: "20px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          <h3 style={{ textAlign: "center", marginBottom: "12px" }}>Battery</h3>
          <GaugeComponent
            value={liveData.battery}
            minValue={0}
            maxValue={100}
            type="radial"
            arc={{ width: 0.25, padding: 0.02, subArcs: [{ limit: 20, color: '#ef4444' }, { limit: 50, color: '#f59e0b' }, { color: '#22c55e' }] }}
            pointer={{ type: "blob", animationDelay: 0 }}
            valueConfig={{ formatTextValue: v => `${v}%` }}
            needle={false}
            labels={{ valueLabel: { fontSize: 54, formatTextValue: v => `${v}%` } }}
          />
          <div style={{ textAlign: "center", fontSize: "1.4rem", marginTop: "8px", color: batteryColor }}>
            {liveData.battery}% • {liveData.estimated_remaining_km} km left
          </div>
        </div>

        <div style={{ background: "#1e293b", borderRadius: "16px", padding: "20px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          <h3 style={{ textAlign: "center", marginBottom: "12px" }}>Motor Temp</h3>
          <GaugeComponent
            value={liveData.motor_temp}
            minValue={0} maxValue={120}
            type="grafana"
            arc={{ width: 0.4, subArcs: [{ limit: 60, color: '#22c55e' }, { limit: 90, color: '#f59e0b' }, { color: '#ef4444' }] }}
            pointer={{ animationDelay: 0 }}
            labels={{ valueLabel: { fontSize: 42, formatTextValue: v => `${v}°C` }, markLabel: { marks: [{ value: 0 }, { value: 30 }, { value: 60 }, { value: 90 }, { value: 120 }] } }}
          />
        </div>

        <div style={{ background: "#1e293b", borderRadius: "16px", padding: "20px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          <h3 style={{ textAlign: "center", marginBottom: "12px" }}>Battery Temp</h3>
          <GaugeComponent
            value={liveData.battery_temp}
            minValue={0} maxValue={80}
            type="grafana"
            arc={{ width: 0.4, subArcs: [{ limit: 40, color: '#22c55e' }, { limit: 60, color: '#f59e0b' }, { color: '#ef4444' }] }}
            pointer={{ animationDelay: 0 }}
            labels={{ valueLabel: { fontSize: 42, formatTextValue: v => `${v}°C` }, markLabel: { marks: [{ value: 0 }, { value: 20 }, { value: 40 }, { value: 60 }, { value: 80 }] } }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
        <div style={{ background: "#1e293b", padding: "16px", borderRadius: "12px", textAlign: "center" }}>
          <h4>Total Distance</h4>
          <div style={{ fontSize: "2.8rem", fontWeight: "bold" }}>
            {liveData.total_distance} <span style={{ fontSize: "1.6rem" }}>km</span>
          </div>
        </div>
        <div style={{ background: "#1e293b", padding: "16px", borderRadius: "12px", textAlign: "center" }}>
          <h4>Est. Remaining</h4>
          <div style={{ fontSize: "2.8rem", fontWeight: "bold", color: batteryColor }}>
            {liveData.estimated_remaining_km} <span style={{ fontSize: "1.6rem" }}>km</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "32px", alignItems: "center" }}>
        <div style={{ fontSize: "2rem", fontWeight: "bold", color: isRunning ? "#22c55e" : isCharging ? "#3b82f6" : "#ef4444" }}>
          STATUS: {liveData.status.toUpperCase()}
        </div>

        <div style={{ fontSize: "2rem" }}>
          RPM: <strong>{liveData.rpm}</strong>
        </div>

        <div style={{ display: "flex", gap: "20px" }}>
          <button
            onClick={handleMainAction}
            disabled={isCharging}
            style={{
              padding: "16px 48px",
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: isCharging ? "not-allowed" : "pointer",
              background: isRunning ? "#ef4444" : "#22c55e",
              opacity: isCharging ? 0.5 : 1,
              boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
            }}
          >
            {isRunning ? "⏹️ STOP" : "🚗 START"}
          </button>

          <button
            onClick={handleCharge}
            disabled={isRunning}
            style={{
              padding: "16px 48px",
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: isRunning ? "not-allowed" : "pointer",
              background: isCharging ? "#ef4444" : "#3b82f6",
              opacity: isRunning ? 0.6 : 1,
              boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
            }}
          >
            {isCharging ? "⏹️ STOP CHARGING" : "🔌 CHARGE"}
          </button>
        </div>
      </div>

      {isCharging && (
        <div style={{ background: "#1e293b", padding: "20px", borderRadius: "12px", maxWidth: "600px", margin: "0 auto", borderLeft: "6px solid #3b82f6" }}>
          <h3>🔌 Charging in Progress</h3>
          <p>+1% every 10 seconds</p>
          {liveData.charging_start && <p>Started: {new Date(liveData.charging_start).toLocaleString()}</p>}
          {liveData.charging_gained_percent > 0 && <p>Gained: +{liveData.charging_gained_percent.toFixed(1)}%</p>}
        </div>
      )}

      {liveData.faults?.length > 0 && (
        <div style={{ background: "#450a0a", padding: "20px", borderRadius: "12px", maxWidth: "800px", margin: "0 auto", color: "#fecaca" }}>
          <strong>⚠️ FAULTS:</strong> {liveData.faults.join(" • ")}
        </div>
      )}
    </div>
  );
}

export default App;