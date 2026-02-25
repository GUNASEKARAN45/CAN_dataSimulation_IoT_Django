import { useTelemetry } from "../hooks/useTelemetry";
import GaugeComponent from "react-gauge-component";

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500;600;700&display=swap');
  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  * { box-sizing: border-box; }
`;

function Card({ children, style = {}, delay = 0 }: { children: React.ReactNode; style?: React.CSSProperties; delay?: number }) {
  return (
    <div style={{
      background: "#ffffff", borderRadius: "12px", padding: "10px 14px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
      border: "1px solid #eef2f7", animation: `fadeUp 0.3s ease both`,
      animationDelay: `${delay}ms`, ...style,
    }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: "0 0 2px 0", fontSize: "0.6rem", fontWeight: "700", letterSpacing: "0.12em", textTransform: "uppercase", color: "#a0aec0", fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </p>
  );
}

// Shared clean arc colors: green → amber → red
const arcSafe    = "#50db83";
const arcWarn    = "#f59e0b";
const arcDanger  = "#ef4444";

// Shared stick needle
const stickNeedle = { animationDelay: 0, color: "#1e293b", length: 0.92, width: 2, elastic: false };

function LiveData() {
  const { data: liveData, sendCommand } = useTelemetry();

  const handleMainAction = () => {
    if (liveData?.status === "running") sendCommand("stop_vehicle");
    else sendCommand("start_vehicle");
  };

  const handleCharge = () => {
    if (liveData?.status === "charging") sendCommand("stop_charging");
    else if (liveData?.status === "stopped") sendCommand("start_charging");
  };

  if (!liveData) {
    return (
      <>
        <style>{fonts}</style>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 72px)", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#6366f1", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: "#64748b", fontSize: "0.875rem", margin: 0 }}>Connecting to vehicle…</p>
        </div>
      </>
    );
  }

  const isRunning  = liveData.status === "running";
  const isCharging = liveData.status === "charging";
  const batteryColor = liveData.battery > 30 ? "#22c55e" : liveData.battery > 15 ? "#f59e0b" : "#ef4444";

  const statusMap: Record<string, { color: string; bg: string; border: string; dot: string; label: string }> = {
    running:        { color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4", dot: "#14b8a6", label: "RUNNING" },
    charging:       { color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe", dot: "#818cf8", label: "CHARGING" },
    stopped:        { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", dot: "#94a3b8", label: "STOPPED" },
    emergency_stop: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", dot: "#ef4444", label: "EMERGENCY STOP" },
    fault:          { color: "#c2410c", bg: "#fff7ed", border: "#fed7aa", dot: "#f97316", label: "FAULT" },
  };
  const statusConfig = statusMap[(liveData.status as string) ?? "stopped"]
    ?? { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", dot: "#94a3b8", label: "UNKNOWN" };

  const faultsDisplay = (() => {
    if (Array.isArray(liveData.faults)) {
      const filtered = liveData.faults.filter((f: string) => f && f.trim().length > 0);
      return filtered.length > 0 ? filtered.join(" • ") : null;
    }
    if (typeof liveData.faults === "string") {
      const cleaned = (liveData.faults as string).replace(/[\[\]"]/g, "").trim();
      return cleaned.length > 0 ? cleaned : null;
    }
    return null;
  })();
  const hasFaults = faultsDisplay !== null;

  const valStyle = { fontFamily: "'Roboto Mono', monospace", fill: "#0f172a", fontWeight: "600" };

  return (
    <>
      <style>{fonts}</style>
      <div style={{
        height: "calc(100vh - 72px)", padding: "8px 20px",
        display: "grid", gridTemplateRows: "auto auto auto auto",
        gap: "8px", fontFamily: "'DM Sans', sans-serif",
        overflow: "hidden", background: "#f8fafc",
      }}>

        {/* ── Row 1: Gauges ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>

          {/* Speed — stick needle */}
          <Card delay={0} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Label>Speed</Label>
            <div style={{ width: "100%", height: "160px", overflow: "hidden" }}>
              <GaugeComponent
                value={liveData.speed} minValue={0} maxValue={240}
                arc={{
                  width: 0.18, cornerRadius: 4,
                  subArcs: [
                    { limit: 120, color: arcSafe },
                    { limit: 180, color: arcWarn },
                    { color: arcDanger }
                  ]
                }}
                needle={stickNeedle}
                labels={{
                  valueLabel: { fontSize: 32, formatTextValue: v => `${v}`, style: valStyle },
                  markLabel: { type: "outer", marks: [{ value: 0 }, { value: 80 }, { value: 160 }, { value: 240 }] }
                }}
              />
            </div>
            <p style={{ margin: "-12px 0 0", color: "#94a3b8", fontSize: "0.62rem", letterSpacing: "0.08em" }}>KM / H</p>
          </Card>

          {/* Battery — grafana type, stick needle, no subtitle */}
          <Card delay={60} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Label>Battery</Label>
            <div style={{ width: "100%", height: "160px", overflow: "hidden" }}>
              <GaugeComponent
                value={liveData.battery} minValue={0} maxValue={100}
                type="grafana"
                arc={{
                  width: 0.22, cornerRadius: 4,
                  subArcs: [
                    { limit: 20, color: arcDanger },
                    { limit: 40, color: arcWarn },
                    { color: arcSafe }
                  ]
                }}
                needle={stickNeedle}
                labels={{
                  valueLabel: { fontSize: 30, formatTextValue: v => `${v}%`, style: { ...valStyle } },
                  markLabel: { marks: [{ value: 0 }, { value: 25 }, { value: 50 }, { value: 75 }, { value: 100 }] }
                }}
              />
            </div>
          </Card>

          {/* Motor Temp — stick needle */}
          <Card delay={120} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Label>Motor Temp</Label>
            <div style={{ width: "100%", height: "160px", overflow: "hidden" }}>
              <GaugeComponent
                value={liveData.motor_temp} minValue={0} maxValue={120}
                type="grafana"
                arc={{
                  width: 0.22, cornerRadius: 4,
                  subArcs: [
                    { limit: 60, color: arcSafe },
                    { limit: 90, color: arcWarn },
                    { color: arcDanger }
                  ]
                }}
                needle={stickNeedle}
                labels={{
                  valueLabel: { fontSize: 30, formatTextValue: v => `${v}°C`, style: valStyle },
                  markLabel: { marks: [{ value: 0 }, { value: 40 }, { value: 80 }, { value: 120 }] }
                }}
              />
            </div>
          </Card>

          {/* Battery Temp — stick needle */}
          <Card delay={180} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Label>Battery Temp</Label>
            <div style={{ width: "100%", height: "160px", overflow: "hidden" }}>
              <GaugeComponent
                value={liveData.battery_temp} minValue={0} maxValue={80}
                type="grafana"
                arc={{
                  width: 0.22, cornerRadius: 4,
                  subArcs: [
                    { limit: 40, color: arcSafe },
                    { limit: 60, color: arcWarn },
                    { color: arcDanger }
                  ]
                }}
                needle={stickNeedle}
                labels={{
                  valueLabel: { fontSize: 30, formatTextValue: v => `${v}°C`, style: valStyle },
                  markLabel: { marks: [{ value: 0 }, { value: 25 }, { value: 50 }, { value: 80 }] }
                }}
              />
            </div>
          </Card>
        </div>

        {/* ── Row 2: Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {([
            { label: "Total Distance",  value: liveData.total_distance,         unit: "km",  color: "#0f172a" },
            { label: "Remaining Range", value: liveData.estimated_remaining_km, unit: "km",  color: "#0f172a"  },
            { label: "Motor RPM",       value: liveData.rpm,                    unit: "rpm", color: "#0f172a" },
          ] as const).map(({ label, value, unit, color }, i) => (
            <Card key={label} delay={220 + i * 30}>
              <Label>{label}</Label>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "4px" }}>
                <span style={{ fontSize: "2rem", fontWeight: "700", color, fontFamily: "'Roboto Mono', monospace", lineHeight: 1 }}>{value}</span>
                <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{unit}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Row 3: Controls ── */}
        <Card delay={320}>
          <Label>Vehicle Controls</Label>
          <div style={{ display: "flex", gap: "14px", marginTop: "10px", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleMainAction} disabled={isCharging} style={{
              padding: "13px 40px", fontSize: "0.95rem", fontWeight: "600",
              fontFamily: "'DM Sans', sans-serif", color: "white", border: "none", borderRadius: "10px",
              cursor: isCharging ? "not-allowed" : "pointer",
              background: isRunning ? "#16b895" : "#505bfe",
              opacity: isCharging ? 0.4 : 1,
              boxShadow: isCharging ? "none" : isRunning ? "0 4px 14px rgba(220,38,38,0.35)" : "0 4px 14px rgba(20, 110, 184, 0.4)",
              transition: "all 0.2s ease",
            }}>
              {isRunning ? " Stop Vehicle" : "Start Vehicle"}
            </button>
            <button onClick={handleCharge} disabled={isRunning} style={{
              padding: "13px 40px", fontSize: "0.95rem", fontWeight: "600",
              fontFamily: "'DM Sans', sans-serif", color: "white", border: "none", borderRadius: "10px",
              cursor: isRunning ? "not-allowed" : "pointer",
              background: isCharging ? "linear-gradient(135deg,#dc2626,#ef4444)" : "#16b895",
              opacity: isRunning ? 0.4 : 1,
              boxShadow: isRunning ? "none" : isCharging ? "0 4px 14px rgba(220,38,38,0.35)" : "0 4px 14px rgba(99,102,241,0.4)",
              transition: "all 0.2s ease",
            }}>
              {isCharging ? "Stop Charging" : " Charge"}
            </button>
            {isCharging && liveData.charging_gained_percent > 0 && (
              <span style={{ fontSize: "0.75rem", color: "#6366f1", fontWeight: "600" }}>
                ⚡ +{liveData.charging_gained_percent.toFixed(1)}% gained
                {liveData.charging_start && ` · started ${new Date(liveData.charging_start).toLocaleTimeString()}`}
              </span>
            )}
          </div>
        </Card>

        {/* ── Row 4: Faults — only rendered when faults exist ── */}
        {hasFaults && (
          <Card delay={380} style={{ borderLeft: "3px solid #f97316", padding: "7px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Label>System Faults</Label>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#c2410c", fontFamily: "'DM Sans', sans-serif", fontWeight: "500" }}>
                ⚠ {faultsDisplay}
              </p>
            </div>
          </Card>
        )}

      </div>
    </>
  );
}

export default LiveData;