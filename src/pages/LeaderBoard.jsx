import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/leaderboard.css";

function Leaderboard() {
  const [scores, setScores] = useState([]);

  const loadScores = () => {
    const storedScores = JSON.parse(
      localStorage.getItem("aaruArenaLeaderboard") || "[]"
    );
    storedScores.sort((a, b) => b.score - a.score);
    setScores(storedScores.slice(0, 10));
  };

  useEffect(() => {
    loadScores();
  }, []);

  const clearLeaderboard = () => {
    if (!window.confirm("Clear the AARU ARENA leaderboard? This cannot be undone.")) return;
    localStorage.removeItem("aaruArenaLeaderboard");
    setScores([]);
  };

  return (
    <main className="leaderboard-page">
      <div className="leaderboard-grid" />
      <div className="leaderboard-glow" />

      <section className="leaderboard-panel">
        <header className="leaderboard-header">
          <p className="leaderboard-kicker">AARU ARENA // HALL OF FAME</p>
          <h1>LEADERBOARD</h1>
          <p className="leaderboard-subtitle">TOP 10 SURVIVORS // LOCAL HIGH SCORES</p>
        </header>

        <div className="leaderboard-table">
          <div className="leaderboard-row leaderboard-heading-row">
            <span>RANK</span>
            <span>CALLSIGN</span>
            <span>SCORE</span>
            <span>WAVE</span>
            <span>LEVEL</span>
          </div>

          {scores.length === 0 ? (
            <div className="leaderboard-empty">
              <div className="empty-icon">◇</div>
              <h2>NO SCORES YET</h2>
              <p>Enter the arena and claim the first record.</p>
            </div>
          ) : (
            scores.map((entry, index) => (
              <div
                className={`leaderboard-row ${index === 0 ? "rank-one" : ""}`}
                key={`${entry.date}-${index}`}
              >
                <span className="rank-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="callsign">{entry.name}</span>
                <span className="score-number">{Number(entry.score || 0).toLocaleString()}</span>
                <span>{entry.wave || 1}</span>
                <span>{entry.level || 1}</span>
              </div>
            ))
          )}
        </div>

        <div className="leaderboard-actions">
          <Link className="leaderboard-action primary" to="/game">ENTER ARENA</Link>
          <Link className="leaderboard-action" to="/">MAIN MENU</Link>
          {scores.length > 0 && (
            <button className="leaderboard-action danger" onClick={clearLeaderboard}>
              CLEAR SCORES
            </button>
          )}
        </div>

        <p className="leaderboard-note">Scores are stored locally in this browser.</p>
      </section>
    </main>
  );
}

export default Leaderboard;
