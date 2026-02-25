import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import LiveData from "./pages/LiveData";
import PastData from "./pages/PastData";

function App() {
  return (
    <Router>
      <div style={{ background: "#0f172a", minHeight: "100vh" }}>

        {/* NAVBAR */}
        <nav style={{
          display: "flex",
          gap: "40px",
          padding: "20px",
          background: "#1e293b"
        }}>
          <Link to="/" style={{ color: "white", textDecoration: "none", fontSize: "1.2rem" }}>
            Live Data
          </Link>

          <Link to="/past" style={{ color: "white", textDecoration: "none", fontSize: "1.2rem" }}>
            Past Data
          </Link>
        </nav>

        <Routes>
          <Route path="/" element={<LiveData />} />
          <Route path="/past" element={<PastData />} />
        </Routes>

      </div>
    </Router>
  );
}

export default App;