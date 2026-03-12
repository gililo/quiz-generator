import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/styles.css";

const API = "http://localhost:5000/api";

export default function AuthPage() {

  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);
  
  // AuthContext action to store token/user on login
  const { login } = useAuth();

  // Handles login or registration submission
  const handle = async () => {
    setError("");
    setLoading(true);
    
    try {
      const endpoint = isLogin 
        ? "/auth/login" 
        : "/auth/register";

      const body = isLogin
        ? { email_user: form.email, password: form.password }
        : form;

      // Send POST request to backend API
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong");

      if (isLogin) { 
        login(data.token, data.user);
      } 
      else {
        setSuccess("Account created! Please sign in.");
        setIsLogin(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">      
      <div className="card card-xl">
        <div className="auth-header">
          <h1 className="auth-title">Quiz Generator AI</h1>
        </div>

        <div className="auth-tabs">
          {["Login", "Register"].map((t) => (
            <button key={t}

              onClick={() => {
                setIsLogin(t === "Login"); 
                setError(""); 
                setSuccess(""); 
              }}
              
              className={`auth-tab ${
                isLogin === (t === "Login") ? "active" : ""
              }`}>{t}
            </button>
          ))}
        </div>

        <div className="auth-form">
          {!isLogin && (
            <Input
              label="Username" value={form.username}
              onChange={(v) => setForm({ ...form, username: v })}
              placeholder="username" 
            />
          )}

          <Input
            label={isLogin ? "Email or Username" : "Email"}
            type={isLogin ? "text" : "email"}
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            placeholder={
              isLogin 
                ? "your@email.com or username"
                : "your@email.com"}
          />

          <Input
            label="Password" 
            type="password" 
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            placeholder="••••••••"
            
            // Allow pressing Enter to submit the form
            onKeyDown={(e) => e.key === "Enter" && handle()} />
        </div>

        {error && <div className="auth-error">{error}</div>}

        {success && <div className="auth-success">✅ {success}</div>}

        <button onClick={handle} disabled={loading} className="auth-btn">
          {loading 
            ? "Please wait..." 
            : (isLogin 
              ? "Sign In →" 
              : "Create Account →"
              )
          }
        </button>
      </div>
    </div>
  );
}

// Reusable input component
function Input({ label, type = "text", value, onChange, placeholder, onKeyDown }) {
  return (
    <div>
      <label className="auth-input-label">{label}</label>
      
      <input
        type={type}
        value={value}

        onChange={(e) => onChange(e.target.value)}
        
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        className="auth-input"
      />
    </div>
  );
}