import { useState, useEffect } from "react";
import { AuthContext } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import GenerateQuiz from "./pages/GenerateQuiz";
import TakeQuiz from "./pages/TakeQuiz";
import Results from "./pages/Results";
import "./styles/styles.css";

const API = "http://localhost:5000/api";

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [page, setPage] = useState("dashboard");
  const [quizData, setQuizData] = useState(null);
  const [resultsData, setResultsData] = useState(null);

  useEffect(() => {
    if (token) {
      fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.user) setUser(d.user);
          else logout();
        })
        .catch(logout);
    }
  }, [token]);

  const login = (token, user) => {
    localStorage.setItem("token", token);
    setToken(token);
    setUser(user);
    setPage("dashboard");
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setPage("dashboard");
  };

  const navigate = (p, data = null) => {
    setPage(p);
    if (data) {
      if (p === "take-quiz") setQuizData(data);
      if (p === "results") setResultsData(data);
    }
  };

  if (!token || !user) {
    return (
      <AuthContext.Provider value={{ user, token, login, logout }}>
        <AuthPage />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, navigate }}>
      <div className="app-shell">
        <Navbar user={user} logout={logout} navigate={navigate} page={page} />

        <main className="app-main">
          {page === "dashboard" && <Dashboard navigate={navigate} />}
          {page === "generate" && <GenerateQuiz navigate={navigate} />}
          {page === "take-quiz" && quizData && <TakeQuiz quiz={quizData} navigate={navigate} />}
          {page === "results" && resultsData && <Results data={resultsData} navigate={navigate} />}
        </main>
      </div>
    </AuthContext.Provider>
  );
}

function Navbar({ user, logout, navigate }) {
  return (
    <nav className="nav">
      <div className="nav-left" onClick={() => navigate("dashboard")}>
        <span className="nav-brand">Quiz Generator</span>
        <span className="nav-badge">AI</span>
      </div>

      <div className="nav-right">
        <div className="nav-user">
          <span className="nav-hello">
            Hi, <strong>{user.username}</strong>
          </span>
          <button type="button" onClick={logout} className="nav-logout">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}