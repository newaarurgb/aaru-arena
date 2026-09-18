import { Link, useNavigate } from "react-router-dom";
import { PLAYER_DESIGNS } from "../data/loadouts";
import "../styles/loadout.css";

function StyleSelect() {
  const navigate = useNavigate();
  const selected = sessionStorage.getItem("aaruPlayerDesign") || "aqua";

  const chooseDesign = (key) => {
    sessionStorage.setItem("aaruPlayerDesign", key);
    navigate("/game");
  };

  return (
    <main className="loadout-page">
      <section className="loadout-panel">
        <p className="loadout-kicker">AARU ARENA // LOADOUT 02</p>
        <h1>CHOOSE YOUR PLAYER STYLE</h1>
        <p className="loadout-subtitle">SELECT THE SHELL THAT REPRESENTS YOU IN THE ARENA.</p>

        <div className="loadout-grid style-grid">
          {Object.entries(PLAYER_DESIGNS).map(([key, design]) => (
            <button
              className={`loadout-card style-card ${selected === key ? "selected" : ""}`}
              key={key}
              type="button"
              style={{ "--loadout-accent": design.color }}
              onClick={() => chooseDesign(key)}
            >
              <span className="style-preview"><i /></span>
              <strong>{design.name}</strong>
              <small>{design.description}</small>
              <em>{selected === key ? "SELECTED" : "SELECT STYLE"}</em>
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

export default StyleSelect;
