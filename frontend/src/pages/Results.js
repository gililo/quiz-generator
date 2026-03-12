import "../styles/styles.css";

export default function Results({ data, navigate }) {
  const { score, total, percentage, results, title } = data;

  const grade =
    percentage >= 90
      ? { label: "Excellent!", emoji: "🏆" }
      : percentage >= 70
      ? { label: "Good Job!", emoji: "🎯" }
      : percentage >= 50
      ? { label: "Keep Studying!", emoji: "📚" }
      : { label: "Need Practice", emoji: "💪" };

  return (
    <div className="res">

      <div className="res-hero">
        <div className="res-emoji">{grade.emoji}</div>

        {/* Keep only color dynamic via inline style */}
        <h1 className="res-percent" style={{ color: grade.color }}>
          {percentage}%
        </h1>

        <p className="res-grade" style={{ color: grade.color }}>
          {grade.label}
        </p>

        <p className="res-summary">
          {score} correct out of {total} questions in{" "}
          <strong className="res-title">{title}</strong>
        </p>
      </div>

      <h3 className="res-review-title">Question Review</h3>

      <div className="res-review-list">
        {results.map((r, i) => (
          <div
            key={i}
            className={`res-qcard ${r.is_correct ? "is-correct" : "is-wrong"}`}
          >
            <div className="res-qrow">
              <span className="res-qicon">{r.is_correct ? "✅" : "❌"}</span>

              <div className="res-qcontent">
                <p className="res-qtext">
                  Q{i + 1}: {r.question}
                </p>

                {!r.is_correct && (
                  <div>
                    <span className="res-your-label">Your answer: </span>
                    <span className="res-your-value">
                      {r.user_answer || "(no answer)"}
                    </span>
                  </div>
                )}

                <div>
                  <span className="res-correct-label">✓ Correct: </span>
                  <span className="res-correct-value">{r.correct_answer}</span>
                </div>

                {r.explanation && (
                  <p className="res-expl">{r.explanation}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="res-actions">
        <button
          onClick={() => navigate("generate")}
          className="res-btn btn-primary"
          type="button"
        >
          + New Quiz
        </button>

        <button
          onClick={() => navigate("dashboard")}
          className="res-btn res-btn-secondary"
          type="button"
        >
          View Dashboard
        </button>
      </div>
    </div>
  );
}