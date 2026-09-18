import { Link, useNavigate } from "react-router-dom";
import { ENVIRONMENTS } from "../data/loadouts";
import "../styles/loadout.css";

function EnvironmentSelect() {
  const navigate = useNavigate();
  const selected = sessionStorage.getItem("aaruEnvironment") || "neon";

  const chooseEnvironment = (key) => {
    sessionStorage.setItem("aaruEnvironment", key);
    navigate("/game");
  };

  return (
    <main className="loadout-page">
      <section className="loadout-panel">
        <p className="loadout-kicker">AARU ARENA // LOADOUT 01</p>
        <h1>CHOOSE YOUR ENVIRONMENT</h1>
        <p className="loadout-subtitle">SELECT THE WORLD WHERE YOUR MATCH WILL TAKE PLACE.</p>

        <div className="loadout-grid environment-grid">
          {Object.entries(ENVIRONMENTS).map(([key, environment]) => (
            <button
              className={`loadout-card ${selected === key ? "selected" : ""}`}
              key={key}
              type="button"
              style={{ "--loadout-accent": environment.accent, "--loadout-base": environment.base }}
              onClick={() => chooseEnvironment(key)}
            >
              <span className="loadout-planet" />
              <strong>{environment.name}</strong>
              <small>{environment.description}</small>
              <em>{selected === key ? "SELECTED" : "DEPLOY HERE"}</em>
            </button>
          ))}
        </div>

        <nav className="loadout-actions">
          <Link className="loadout-action" to="/game">BACK TO DEPLOYMENT</Link>
          <Link className="loadout-action" to="/">MAIN MENU</Link>
        </nav>
      </section>
    </main>
  );
}

export default EnvironmentSelect;
