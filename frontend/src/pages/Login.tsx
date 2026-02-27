// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import type { AuthUser } from "../hooks/useAuth";
import api from "../lib/axios";

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin   { to { transform: rotate(360deg); } }
  * { box-sizing: border-box; }
  .auth-input:focus { outline: none; border-color: #505bfe !important; box-shadow: 0 0 0 3px rgba(80,91,254,0.12); }
  .auth-input { transition: border-color 0.15s, box-shadow 0.15s; }
  .auth-btn:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
  .auth-btn { transition: all 0.15s ease; }
`;

interface Props {
  onLogin: (user: AuthUser) => void;
}

export default function Login({ onLogin }: Props) {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login/", { email, password });

      localStorage.setItem("access_token",  data.access);
      localStorage.setItem("refresh_token", data.refresh);

      const user: AuthUser = { username: data.username, email: data.email, role: data.role };
      localStorage.setItem("auth_user", JSON.stringify(user));

      onLogin(user);
      // URL will update automatically: admin → /live, user → /past (handled by AppShell)
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", fontSize: "0.9rem",
    borderRadius: "8px", border: "1px solid #e2e8f0",
    background: "#f8fafc", color: "#0f172a",
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <>
      <style>{fonts}</style>
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: "20px" }}>
        <div style={{ background: "#ffffff", borderRadius: "16px", padding: "40px 44px", boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)", border: "1px solid #eef2f7", width: "100%", maxWidth: "420px", animation: "fadeUp 0.35s ease both" }}>

          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <img
              src="data:image/png;base64,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"
              alt="Logo"
              style={{ height: "48px", width: "160px", objectFit: "contain" }}
            />
          </div>

          <h2 style={{ margin: "0 0 6px", fontSize: "1.4rem", fontWeight: "700", color: "#0f172a", textAlign: "center" }}>Welcome back</h2>
          <p style={{ margin: "0 0 28px", color: "#64748b", fontSize: "0.875rem", textAlign: "center" }}>Sign in to your account</p>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "18px", color: "#dc2626", fontSize: "0.83rem", fontWeight: "500" }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "0.78rem", fontWeight: "600", color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase" }}>Email</label>
              <input className="auth-input" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "0.78rem", fontWeight: "600", color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase" }}>Password</label>
              <input className="auth-input" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} style={inputStyle} />
            </div>

            <button
              className="auth-btn"
              onClick={handleSubmit}
              disabled={loading}
              style={{ width: "100%", padding: "12px", marginTop: "6px", background: loading ? "#a5b4fc" : "#505bfe", color: "white", border: "none", borderRadius: "8px", fontSize: "0.95rem", fontWeight: "600", fontFamily: "'DM Sans', sans-serif", cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(80,91,254,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              {loading && <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </div>

          <p style={{ marginTop: "24px", textAlign: "center", fontSize: "0.875rem", color: "#64748b" }}>
            Don't have an account?{" "}
            {/* React Router Link — changes URL to /signup */}
            <Link to="/signup" style={{ color: "#505bfe", fontWeight: "600", textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}