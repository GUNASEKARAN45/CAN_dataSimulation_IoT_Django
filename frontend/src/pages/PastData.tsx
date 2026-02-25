import { useEffect, useState } from "react";

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

function PastData() {
  const [data, setData] = useState<PastDayData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(""); // empty = show last 5 days
  const [loading, setLoading] = useState<boolean>(false);
  const [noDataMessage, setNoDataMessage] = useState<string>("");

  const fetchData = async (date?: string) => {
    setLoading(true);
    setNoDataMessage("");

    try {
      let url = "http://localhost:8000/api/past-data/";
      if (date) {
        url += `?date=${date}`;
      }

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

  // Load default (last 5 days) on mount
  useEffect(() => {
    fetchData();
  }, []);

  // When user selects a date
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value; // YYYY-MM-DD
    setSelectedDate(newDate);
    if (newDate) {
      fetchData(newDate);
    } else {
      fetchData(); // back to default 5 days
    }
  };

  return (
    <div
      style={{
        padding: "40px",
        background: "#0f172a",
        minHeight: "100vh",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >

      <div style={{ marginBottom: "30px", textAlign: "center" }}>
        <label
          htmlFor="dateFilter"
          style={{ marginRight: "12px", fontSize: "1.1rem" }}
        >
          Filter by Date:
        </label>
        <input
          id="dateFilter"
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          style={{
            padding: "10px",
            fontSize: "1rem",
            borderRadius: "8px",
            border: "1px solid #475569",
            background: "#1e293b",
            color: "white",
          }}
        />
        <button
          onClick={() => {
            setSelectedDate("");
            fetchData();
          }}
          style={{
            marginLeft: "16px",
            padding: "10px 20px",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Show Last 5 Days
        </button>
      </div>

      {loading && (
        <p style={{ textAlign: "center", fontSize: "1.2rem" }}>
          Loading...
        </p>
      )}

      {noDataMessage && !loading && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            fontSize: "1.4rem",
            color: "#94a3b8",
            background: "#1e293b",
            borderRadius: "12px",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          {noDataMessage}
        </div>
      )}

      {!loading && !noDataMessage && data.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              backgroundColor: "#1e293b",
              borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0 0 15px rgba(0,0,0,0.3)",
            }}
          >
            <thead style={{ backgroundColor: "#334155" }}>
              <tr>
                {[
                  "Date",
                  "Total Distance (km)",
                  "Battery Gain (%)",
                  "Motor Temp (Min | Avg | Max °C)",
                  "Battery Temp (Min | Avg | Max °C)",
                ].map((heading, index) => (
                  <th
                    key={index}
                    style={{
                      padding: "14px",
                      border: "1px solid #475569",
                      textAlign: "center",
                      fontWeight: "600",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.map((day, index) => (
                <tr
                  key={index}
                  style={{
                    backgroundColor: index % 2 === 0 ? "#1e293b" : "#172033",
                  }}
                >
                  <td style={normalCellStyle}>{day.date}</td>
                  <td style={normalCellStyle}>
                    {day.total_distance?.toFixed(2) ?? "—"}
                  </td>
                  <td style={normalCellStyle}>
                    {day.battery_gain?.toFixed(2) ?? "—"}
                  </td>

                  <td style={parentCellStyle}>
                    <div style={tempContainer}>
                      <div style={subCellStyle}>
                        {day.min_motor_temp?.toFixed(1) ?? "—"}
                      </div>
                      <div style={subCellStyle}>
                        {day.avg_motor_temp?.toFixed(1) ?? "—"}
                      </div>
                      <div style={{ ...subCellStyle, borderRight: "none" }}>
                        {day.max_motor_temp?.toFixed(1) ?? "—"}
                      </div>
                    </div>
                  </td>

                  <td style={parentCellStyle}>
                    <div style={tempContainer}>
                      <div style={subCellStyle}>
                        {day.min_battery_temp?.toFixed(1) ?? "—"}
                      </div>
                      <div style={subCellStyle}>
                        {day.avg_battery_temp?.toFixed(1) ?? "—"}
                      </div>
                      <div style={{ ...subCellStyle, borderRight: "none" }}>
                        {day.max_battery_temp?.toFixed(1) ?? "—"}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* Styles (same as before) */
const normalCellStyle: React.CSSProperties = {
  padding: "12px",
  border: "1px solid #475569",
  textAlign: "center",
};

const parentCellStyle: React.CSSProperties = {
  padding: "0",
  border: "1px solid #475569",
  textAlign: "center",
};

const tempContainer: React.CSSProperties = {
  display: "flex",
  width: "100%",
  height: "100%",
};

const subCellStyle: React.CSSProperties = {
  flex: 1,
  padding: "12px",
  borderRight: "1px solid #475569",
};

export default PastData;