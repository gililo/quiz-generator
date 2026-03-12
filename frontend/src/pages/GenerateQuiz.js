import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/styles.css";

// Base URL for backend API requests
const API = "http://localhost:5000/api";


export default function GenerateQuiz({ navigate }) {

  // Get JWT token from context to call protected API routes
  const { token } = useAuth();

  const [files, setFiles] = useState([]);
  const [numQ, setNumQ] = useState(10);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  // Tracks whether a file is being dragged over the drop area
  const [dragOver, setDragOver] = useState(false);

  const inputRef = useRef();

  // Validate and store newly selected/dropped files
  const handleFiles = (newFiles) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    const validated = [];
    for (const f of newFiles) {
      if (!allowed.includes(f.type)) return setError(`Invalid file: ${f.name}`);

      if (f.size > 16 * 1024 * 1024) return setError(`File too large: ${f.name}`);
      
      validated.push(f);
    }

    // Clear error and append valid files to the existing list
    setError("");
    setFiles((prev) => [...prev, ...validated]);
  };

  // Handle drag-and-drop event for files
  const handleDrop = (e) => {
    e.preventDefault();       // Prevent browser from opening the file
    setDragOver(false);       // Remove drag highlight

    // Convert FileList into an array
    const dropped = Array.from(e.dataTransfer.files);

    // Validate and store dropped files
    if (dropped.length > 0) handleFiles(dropped);
  };

  // Send files to backend and generate quiz with AI
  const generate = async () => {

    if (files.length === 0) return setError("Please select at least one file.");
    setLoading(true);
    setError("");

    const messages = [
      "Uploading file...",
      "Extracting text content...",
      "Analyzing material with Llama AI...",
      "Generating questions...",
      "Finalizing quiz...",
    ];

    // Rotate progress messages every 2 seconds
    let i = 0;
    const interval = setInterval(() => {
      setProgress(messages[Math.min(i++, messages.length - 1)]);
    }, 2000);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      formData.append("num_questions", numQ);

      // Call backend endpoint to generate quiz
      const res = await fetch(`${API}/quiz/generate`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}` 
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to generate quiz");

      navigate("take-quiz", data);
    } catch (e) {
      setError(e.message);
    } finally {
      // Cleanup UI state
      clearInterval(interval);
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <div className="gen">
      <div className="gen-header">
        <h1 className="dash-title">Generate Quiz</h1>
        <p className="subtitle mb-20">Upload your study material and let AI do the work</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current.click()}
        className={[
          "gen-drop",
          dragOver ? "is-dragover" : "",
          files.length > 0 ? "has-files" : "",
        ].join(" ")}
      >
        {/* Hidden file input (opened by clicking the drop area) */}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="gen-file-input"
          multiple
          // When user picks files, validate and add them
          onChange={(e) => e.target.files.length > 0 && handleFiles(Array.from(e.target.files))}
        />

        {/* If files exist, show selected files list; otherwise show empty state */}
        {files.length > 0 ? (
          <div>
            <div className="gen-files-emoji">📁</div>
            <div className="gen-files-count">
              {files.length} file{files.length > 1 ? "s" : ""} selected
            </div>

            <div className="gen-file-list">
              {files.map((f, i) => (
                <div key={i} className="gen-file-item">
                  <span className="gen-file-name">
                    {f.type === "application/pdf" ? "📄" : "🖼️"} {f.name}
                  </span>
                  <button
                    type="button"
                    className="gen-file-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFiles(files.filter((_, idx) => idx !== i));
                    }}
                    aria-label={`Remove ${f.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="gen-remove-all"
              onClick={(e) => {
                e.stopPropagation();
                setFiles([]);
              }}
            >
              Remove All
            </button>
          </div>
        ) : (
          <div>
            <div className="gen-empty-emoji">📁</div>
            <div className="gen-empty-title">Drop your file here</div>
            <div className="gen-empty-sub">
              or click to browse · PDF, PNG, JPG · Max 16MB
            </div>
          </div>
        )}
      </div>

      {/* Number of Questions */}
      <div className="gen-qbox">
        <label className="gen-qlabel">Number of Questions</label>

        <div className="gen-qgrid">
          {[5, 10, 15, 20].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNumQ(n)}
              className={`gen-qbtn ${numQ === n ? "active" : ""}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="gen-error">{error}</div>}

      {loading ? (
        <div className="gen-loading">
          <div className="gen-loading-emoji">⚙️</div>
          <div className="gen-loading-text">{progress}</div>
          <div className="gen-loading-sub">This may take 15-30 seconds...</div>
        </div>
      ) : (
        <div className="center">
          <button type="button" onClick={generate} className="btn btn-primary">
            🚀 Generate Quiz with AI
          </button>
        </div>
      )}
    </div>
  );
}