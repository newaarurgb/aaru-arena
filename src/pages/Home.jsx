
import { useNavigate } from "react-router-dom";
import "../styles/home.css";

function Home() {
  const navigate = useNavigate();

  return (
    <main className="home-page">
      <div className="home-grid" />
      <div className="home-glow" />

      <section className="home-content">
        <p className="game-version">AARU ARENA // v0.1.0</p>

        <h1>AARU ARENA</h1>

        <p className="tagline">
          ENTER THE BATTLEFIELD
        </p>

        <p className="home-description">
          SURVIVE THE WAVES. DEFEAT THE BOSS. CLAIM YOUR PLACE.
        </p>

        <div className="home-actions">
          <button
            className="play-button"
            onClick={() => navigate("/game")}
          >
            <span>▶</span>
            ENTER ARENA
          </button>

          <button
            className="leaderboard-home-button"
            onClick={() => navigate("/leaderboard")}
          >
            <span>🏆</span>
            LEADERBOARD
          </button>

          <button
            className="rules-home-button"
            onClick={() => navigate("/rules")}
          >
            <span>?</span>
            RULES
          </button>
        </div>

        <div className="home-status">
          <span className="status-dot" />
          ARENA ONLINE
        </div>
      </section>
    </main>
  );
}

export default Home;

