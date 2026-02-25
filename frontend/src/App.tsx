import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import LiveData from "./pages/LiveData";
import PastData from "./pages/PastData";

function Navbar() {
  const location = useLocation();
  return (
    <nav style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 48px",
      height: "72px",
      background: "#ffffff",
      borderBottom: "1px solid #e2e8f0",
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxShadow: "0 1px 12px rgba(0,0,0,0.06)",
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <img src="data:image/png;base64,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" alt=""  style={{height:"60px",width:"200px"}}/>
        </div>
      </div>

      {/* Nav links */}
      <div style={{ display: "flex", gap: "4px" }}>
        {[
          { path: "/", label: "Live Data" },
          { path: "/past", label: "Past Data" },
        ].map(({ path, label }) => {
          const active = location.pathname === path;
          return (
            <Link key={path} to={path} style={{
              textDecoration: "none",
              padding: "8px 20px",
              borderRadius: "8px",
              fontSize: "0.9rem",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: active ? "600" : "400",
              color: active ? "#1e40af" : "#64748b",
              background: active ? "#eff6ff" : "transparent",
              transition: "all 0.15s ease",
              letterSpacing: "0.01em",
            }}>
              {label}
            </Link>
          );
        })}
      </div>

      

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        * { box-sizing: border-box; }
        body { margin: 0; background: #f8fafc; }
      `}</style>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<LiveData />} />
          <Route path="/past" element={<PastData />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;