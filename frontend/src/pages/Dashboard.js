import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { createPortal } from "react-dom";
import "../styles/styles.css";

const API = "http://localhost:5000/api";

export default function Dashboard({ navigate }) {
  const { token } = useAuth();

  const [quizzes, setQuizzes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    if (!token) return;

    setLoading(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [historyRes, statsRes] = await Promise.all([
        fetch(`${API}/quiz/history`, { headers }),
        fetch(`${API}/quiz/stats`, { headers }),
      ]);

      const [historyData, statsData] = await Promise.all([
        historyRes.json(),
        statsRes.json(),
      ]);

      setQuizzes(historyData.quizzes || []);
      setStats(statsData.stats || null);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      setQuizzes([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [token]);

  function StatCard({ icon, label, value }) {
    return (
      <div className="card dash-stat">
        <div className="dash-stat-icon">{icon}</div>
        <div className="dash-stat-value">{value}</div>
        <div className="dash-stat-label">{label}</div>
      </div>
    );
  }

  return (
    <div className="dash">
      <div className="dash-header">
        <h1 className="dash-title">Dashboard</h1>
      </div>

      {stats && stats.total_quizzes_taken > 0 && (
        <div className="dash-stats">
          <StatCard
            icon="📝"
            label="Quizzes Taken"
            value={stats.total_quizzes_taken}
          />
          <StatCard
            icon="🎯"
            label="Average Score"
            value={`${stats.average_score ?? 0}%`}
          />
        </div>
      )}

      <div className="card">
        <div className="dash-history-header">
          <h3 className="dash-history-title">Quiz History</h3>

          <button
            onClick={() => navigate("generate")}
            className="btn btn-primary"
          >
            + New Quiz
          </button>
        </div>

        {loading ? (
          <div className="dash-loading">Loading...</div>
        ) : quizzes.length === 0 ? (
          <EmptyState navigate={navigate} />
        ) : (
          <div className="dash-list">
            {quizzes.map((q) => (
              <QuizRow
                key={q.id}
                quiz={q}
                navigate={navigate}
                token={token}
                onDelete={loadDashboard}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuizRow({ quiz, navigate, token, onDelete }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const pct =
    quiz.best_score != null
      ? Math.round((quiz.best_score / quiz.total_questions) * 100)
      : null;

  const retake = async () => {
    try {
      const res = await fetch(`${API}/quiz/${quiz.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.questions) {
        navigate("take-quiz", {
          quiz_id: quiz.id,
          title: data.title,
          questions: data.questions,
        });
      }
    } catch (error) {
      console.error("Error loading quiz:", error);
    }
  };

  const confirmDelete = async () => {
    try {
      await fetch(`${API}/quiz/${quiz.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      setShowConfirm(false);
      onDelete();
    } catch (error) {
      console.error("Error deleting quiz:", error);
    }
  };

  return (
    <>
      {showConfirm &&
        createPortal(
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-emoji">🗑️</div>

              <h3 className="modal-title">Delete Quiz?</h3>

              <p className="modal-text">
                "{quiz.title}" will be permanently deleted.
              </p>

              <div className="modal-actions">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>

                <button onClick={confirmDelete} className="btn btn-danger">
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <div className="quiz-row">
        <div className="quiz-row-left">
          <span className="quiz-row-icon">
            {quiz.source_type === "pdf" ? "📄" : "🖼️"}
          </span>

          <div>
            <div className="quiz-row-title">{quiz.title}</div>
            <div className="quiz-row-meta">
              {quiz.total_questions} questions · {quiz.attempts} attempt
              {quiz.attempts !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="quiz-row-right">
          {pct != null && <span className="quiz-row-score">{pct}%</span>}

          <button onClick={retake} className="btn btn-retake">
            Retake
          </button>

          <button
            onClick={() => setShowConfirm(true)}
            className="btn btn-delete"
          >
            Delete
          </button>
        </div>
      </div>
    </>
  );
}

function EmptyState({ navigate }) {
  return (
    <div className="empty">
      <div className="empty-icon">📚</div>

      <h3 className="empty-title">No quizzes yet</h3>

      <p className="empty-text"> Upload a PDF or images to generate your first quiz! </p>

      <button onClick={() => navigate("generate")} className="btn btn-primary">
        Create First Quiz →
      </button>
    </div>
  );
}