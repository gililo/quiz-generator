import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/styles.css";

const API = "http://localhost:5000/api";

export default function TakeQuiz({ quiz, navigate }) {
  const { token } = useAuth();
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const questions = quiz.questions || [];
  const q = questions[current];
  const progress = questions.length ? ((current + 1) / questions.length) * 100 : 0;
  const answered = Object.keys(answers).length;

  const qType = ["tf", "true/false", "truefalse"].includes(q?.type?.toLowerCase())
    ? "true_false"
    : q?.type;

  const answer = (id, val) => setAnswers((prev) => ({ ...prev, [id]: val }));

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/quiz/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quiz_id: quiz.quiz_id, answers }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      navigate("results", { ...data, title: quiz.title });
    } catch (e) {
      alert("Error submitting quiz: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!q) return null;

  const typeBadgeClass =
    qType === "mcq"
      ? "badge badge"
      : qType === "true_false"
      ? "badge badge"
      : "badge";

  const typeLabel =
    qType === "mcq"
      ? "Multiple Choice"
      : qType === "true_false"
      ? "True / False"
      : qType;

  return (
    <div className="page">
      <div className="container container-sm">
        <div className="mb-32">
          <div className="row-between mb-12 mt-24">
            <h2 className="takequiz-title">{quiz.title}</h2>
            <span className="takequiz-counter">
              {current + 1} / {questions.length}
            </span>
          </div>

          <div className="progressbar">
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="card card-md mb-24">
          <div className="row mb-20">
            <span className={typeBadgeClass}>{typeLabel}</span>
            {q.topic && <span className="badge badge-topic">{q.topic}</span>}
          </div>

          <p className="takequiz-question">{q.question}</p>

          {qType === "mcq" && (
            <div className="stack takequiz-options">
              {(q.options || []).map((opt) => {
                const selected = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => answer(q.id, opt)}
                    className={selected ? "option selected" : "option"}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {qType === "true_false" && (
            <div className="row">
              {["True", "False"].map((opt) => {
                const selected = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => answer(q.id, opt)}
                    className={selected ? "tf-btn selected" : "tf-btn"}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="row-between">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setCurrent(Math.max(0, current - 1))}
            disabled={current === 0}
          >
            ← Previous
          </button>

          <span className="takequiz-answered">
            {answered} of {questions.length} answered
          </span>

          {current < questions.length - 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCurrent(current + 1)}
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Quiz ✓"}
            </button>
          )}
        </div>

        <div className="dots">
          {questions.map((qq, i) => {
            const isCurrent = i === current;
            const isAnswered = !!answers[qq.id];
            const cls = isCurrent
              ? "dot current"
              : isAnswered
              ? "dot answered"
              : "dot";

            return (
              <button
                key={i}
                type="button"
                className={cls}
                onClick={() => setCurrent(i)}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
} 