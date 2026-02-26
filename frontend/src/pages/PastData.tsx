import { useEffect, useState, useCallback } from "react";

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500;600;700&display=swap');
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes rowIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
  .data-row:hover { background: #f8fafc !important; }
  .action-btn:hover { filter: brightness(0.95); transform: translateY(-1px); }
  .date-input:focus { outline: none; border-color: #505bfe !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
`;

interface PastDayData {
  date: string;
  total_distance: number;
  battery_gain: number;
  avg_motor_temp: number;
  max_motor_temp: number;
  min_motor_temp: number;
  avg_battery_temp: number;
  max_battery_temp: number;
  min_battery_temp: number;
}

function TempCell({ min, avg, max }: { min: number; avg: number; max: number }) {
  const color = avg > 85 ? "#dc2626" : avg > 60 ? "#d97706" : "#16b895";
  return (
    <div style={{ display: "flex", alignItems: "stretch", height: "100%" }}>
      {[
        { val: min, label: "min" },
        { val: avg, label: "avg" },
        { val: max, label: "max" },
      ].map(({ val, label }, i) => (
        <div
          key={label}
          style={{
            flex: 1,
            padding: "12px 8px",
            borderRight: i < 2 ? "1px solid #f1f5f9" : "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              color: "#94a3b8",
              fontWeight: "500",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontSize: "0.95rem",
              fontFamily: "'Roboto Mono', monospace",
              fontWeight: "500",
              color: label === "avg" ? color : "#475569",
            }}
          >
            {val?.toFixed(1) ?? "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

function PastData() {
  const [data, setData] = useState<PastDayData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [noDataMessage, setNoDataMessage] = useState<string>("");

  const fetchData = async (date?: string) => {
    setLoading(true);
    setNoDataMessage("");
    try {
      let url = "http://localhost:8000/api/past-data/";
      if (date) url += `?date=${date}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      if (Array.isArray(json) && json.length === 0) {
        setNoDataMessage(
          date
            ? `No data available for ${new Date(date).toLocaleDateString()}`
            : "No data available in the last 5 days"
        );
        setData([]);
      } else {
        setData(json);
        setNoDataMessage("");
      }
    } catch (err) {
      console.error(err);
      setNoDataMessage("Error loading data. Please try again.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    if (newDate) fetchData(newDate);
    else fetchData();
  };

  const totalKm = data.reduce((s, d) => s + (d.total_distance ?? 0), 0);
  const avgBattGain = data.length
    ? data.reduce((s, d) => s + (d.battery_gain ?? 0), 0) / data.length
    : 0;

  const downloadCSV = useCallback(() => {
    if (data.length === 0) {
      alert("No data available to download");
      return;
    }

    const headers = [
      "Date",
      "Total Distance (km)",
      "Battery Gain (%)",
      "Motor Temp Min (°C)",
      "Motor Temp Avg (°C)",
      "Motor Temp Max (°C)",
      "Battery Temp Min (°C)",
      "Battery Temp Avg (°C)",
      "Battery Temp Max (°C)",
    ];

    const rows = data.map((day) => [
      day.date,
      day.total_distance ?? "",
      day.battery_gain ?? "",
      day.min_motor_temp ?? "",
      day.avg_motor_temp ?? "",
      day.max_motor_temp ?? "",
      day.min_battery_temp ?? "",
      day.avg_battery_temp ?? "",
      day.max_battery_temp ?? "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((v) => `"${v}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `ev-data-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data]);

  return (
    <>
      <style>{fonts}</style>
      <div
        style={{
          padding: "32px 40px",
          maxWidth: "1200px",
          margin: "0 auto",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {data.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              marginBottom: "28px",
              animation: "fadeUp 0.4s ease both 0.05s",
            }}
          >
            {[
              { label: "Records Shown", value: data.length, unit: "days" },
              { label: "Total Distance", value: totalKm.toFixed(1), unit: "km" },
              {
                label: "Avg Battery Gain",
                value: avgBattGain.toFixed(1),
                unit: "%",
              },
            ].map(({ label, value, unit }) => (
              <div
                key={label}
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "18px 20px",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: "0.7rem",
                    color: "#94a3b8",
                    fontWeight: "600",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <span
                    style={{
                      fontSize: "2rem",
                      fontWeight: "700",
                      color: "#0f172a",
                      fontFamily: "'Roboto Mono', monospace",
                      lineHeight: 1,
                    }}
                  >
                    {value}
                  </span>
                  <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                    {unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filter controls + Download button */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "20px 24px",
            border: "1px solid #f1f5f9",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            animation: "fadeUp 0.4s ease both 0.1s",
          }}
        >
          <label
            style={{
              fontSize: "0.85rem",
              fontWeight: "600",
              color: "#475569",
              letterSpacing: "0.02em",
            }}
          >
            Filter by Date
          </label>
          <input
            className="date-input"
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            style={{
              padding: "9px 14px",
              fontSize: "0.9rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              color: "#0f172a",
              fontFamily: "'DM Sans', sans-serif",
              transition: "border-color 0.15s, box-shadow 0.15s",
              cursor: "pointer",
            }}
          />

          <button
            className="action-btn"
            onClick={() => {
              setSelectedDate("");
              fetchData();
            }}
            style={{
              padding: "9px 20px",
              background: "#505bfe",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "600",
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 2px 8px rgba(59,130,246,0.3)",
              transition: "all 0.15s ease",
              letterSpacing: "0.02em",
            }}
          >
            Last 5 Days
          </button>

          {selectedDate && (
            <button
              className="action-btn"
              onClick={() => {
                setSelectedDate("");
                fetchData();
              }}
              style={{
                padding: "9px 16px",
                background: "transparent",
                color: "#64748b",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.15s ease",
              }}
            >
              ✕ Clear
            </button>
          )}

          {/* DOWNLOAD BUTTON */}
          <button
            className="action-btn"
            onClick={downloadCSV}
            disabled={loading || data.length === 0}
            title="Download current table data as CSV"
            style={{
              padding: "9px 20px",
              background: data.length > 0 ? "#10b981" : "#cbd5e1",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: data.length > 0 ? "pointer" : "not-allowed",
              fontSize: "0.875rem",
              fontWeight: "600",
              fontFamily: "'DM Sans', sans-serif",
              boxShadow:
                data.length > 0 ? "0 2px 8px rgba(16,185,129,0.3)" : "none",
              transition: "all 0.15s ease",
              letterSpacing: "0.02em",
            }}
          >
            ⬇ Download CSV
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "60px 0",
              color: "#64748b",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                border: "2px solid #e2e8f0",
                borderTopColor: "#3b82f6",
                animation: "spin 0.7s linear infinite",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ fontSize: "0.9rem" }}>Loading records…</span>
          </div>
        )}

        {/* No data */}
        {noDataMessage && !loading && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              padding: "60px 40px",
              textAlign: "center",
              border: "1px solid #f1f5f9",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              animation: "fadeUp 0.3s ease both",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📭</div>
            <p style={{ fontSize: "1rem", color: "#64748b", margin: 0 }}>
              {noDataMessage}
            </p>
          </div>
        )}

        {/* Table */}
        {!loading && !noDataMessage && data.length > 0 && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #f1f5f9",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.07), 0 8px 24px rgba(0,0,0,0.04)",
              overflow: "hidden",
              animation: "fadeUp 0.4s ease both 0.15s",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "140px 160px 160px 1fr 1fr",
                background: "#f8fafc",
                borderBottom: "2px solid #f1f5f9",
              }}
            >
              {["Date", "Distance", "Battery Gain", "Motor Temp (°C)", "Battery Temp (°C)"].map(
                (h, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "14px 16px",
                      fontSize: "0.7rem",
                      fontWeight: "700",
                      color: "#64748b",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      borderRight: i < 4 ? "1px solid #f1f5f9" : "none",
                      textAlign: i >= 3 ? "center" : "left",
                    }}
                  >
                    {h}
                    {i >= 3 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-around",
                          marginTop: "4px",
                        }}
                      >
                        {["Min", "Avg", "Max"].map((sub) => (
                          <span
                            key={sub}
                            style={{
                              fontSize: "0.6rem",
                              color: "#94a3b8",
                              fontWeight: "500",
                            }}
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {data.map((day, index) => (
              <div
                key={index}
                className="data-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 160px 160px 1fr 1fr",
                  borderBottom:
                    index < data.length - 1 ? "1px solid #f8fafc" : "none",
                  background: "#ffffff",
                  animation: `rowIn 0.3s ease both ${index * 40}ms`,
                  transition: "background 0.15s ease",
                }}
              >
                <div
                  style={{
                    padding: "0 16px",
                    display: "flex",
                    alignItems: "center",
                    borderRight: "1px solid #f1f5f9",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#1e293b",
                      }}
                    >
                      {new Date(day.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div
                      style={{ fontSize: "0.72rem", color: "#94a3b8" }}
                    >
                      {new Date(day.date).getFullYear()}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "14px 16px",
                    borderRight: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "1.05rem",
                        fontWeight: "600",
                        color: "#0f172a",
                        fontFamily: "'Roboto Mono', monospace",
                      }}
                    >
                      {day.total_distance?.toFixed(2) ?? "—"}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        marginLeft: "4px",
                      }}
                    >
                      km
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    padding: "14px 16px",
                    borderRight: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {day.battery_gain != null ? (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background:
                          day.battery_gain >= 0 ? "#f0fdf4" : "#fef2f2",
                        padding: "4px 10px",
                        borderRadius: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color:
                            day.battery_gain >= 0 ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {day.battery_gain >= 0 ? "+" : ""}
                      </span>
                      <span
                        style={{
                          fontSize: "1rem",
                          fontWeight: "600",
                          fontFamily: "'Roboto Mono', monospace",
                          color:
                            day.battery_gain >= 0 ? "#16b895" : "#b91c1c",
                        }}
                      >
                        {day.battery_gain?.toFixed(2)}%
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: "#cbd5e1" }}>—</span>
                  )}
                </div>

                {/* Motor temp */}
                <div style={{ borderRight: "1px solid #f1f5f9" }}>
                  <TempCell
                    min={day.min_motor_temp}
                    avg={day.avg_motor_temp}
                    max={day.max_motor_temp}
                  />
                </div>

                {/* Battery temp */}
                <div>
                  <TempCell
                    min={day.min_battery_temp}
                    avg={day.avg_battery_temp}
                    max={day.max_battery_temp}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default PastData;