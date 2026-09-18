import { Link } from "react-router-dom";
import "../styles/rules.css";
import { ENVIRONMENTS, PLAYER_DESIGNS } from "../data/loadouts";

const rules = [
  {
    number: "01",
    title: "MOVE AND AIM",
    text: "Use WASD or the mobile joystick to move. Aim with your mouse or touch the arena to fire.",
  },
  {
    number: "02",
    title: "SURVIVE THE WAVES",
    text: "Every cleared wave restores your health to full. Keep moving and create space before enemies close in.",
  },
  {
    number: "03",
    title: "CLEAR THE ROSTER",
    text: "Each wave contains all earlier enemy groups plus a new group. Defeat every enemy to advance.",
  },
  {
    number: "04",
    title: "PREPARE FOR THE BOSS",
    text: "The boss wave brings back the full enemy roster and adds the final boss. Defeat them all to win.",
  },
];

const enemies = [
  ["GRUNT", "Balanced enemy that moves directly toward you."],
  ["RUNNER", "Fast enemy that closes distance quickly."],
  ["TANK", "Slow, durable enemy with heavy contact damage."],
  ["SHOOTER", "Keeps its distance and fires enemy projectiles."],
];

function Rules() {
  return (
    <main className="rules-page">
      <div className="rules-grid" />
      <div className="rules-glow" />

      <section className="rules-panel">
        <header className="rules-header">
          <p className="rules-kicker">AARU ARENA // FIELD MANUAL</p>
          <h1>GAME RULES</h1>
          <p className="rules-subtitle">LEARN THE ARENA. SURVIVE THE WAVES.</p>
        </header>

        <div className="rules-sections">
          <section className="rules-block rules-how-to-play">
            <div className="rules-block-heading">
              <span>HOW TO PLAY</span>
              <span className="rules-line" />
            </div>
            <div className="rules-list">
              {rules.map((rule) => (
                <article className="rule-item" key={rule.number}>
                  <span className="rule-number">{rule.number}</span>
                  <div>
                    <h2>{rule.title}</h2>
                    <p>{rule.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rules-block">
            <div className="rules-block-heading">
              <span>ENEMY DATABASE</span>
              <span className="rules-line" />
            </div>
            <div className="enemy-list">
              {enemies.map(([name, description]) => (
                <div className="enemy-row" key={name}>
                  <span className={`enemy-mark enemy-${name.toLowerCase()}`} />
                  <strong>{name}</strong>
                  <span>{description}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rules-block controls-block">
            <div className="rules-block-heading">
              <span>CONTROLS</span>
              <span className="rules-line" />
            </div>
            <div className="control-grid">
              <div><kbd>W A S D</kbd><span>MOVE</span></div>
              <div><kbd>MOUSE</kbd><span>AIM AND FIRE</span></div>
              <div><kbd>JOYSTICK</kbd><span>MOBILE MOVE</span></div>
              <div><kbd>TOUCH</kbd><span>MOBILE AIM AND FIRE</span></div>
            </div>
          </section>

          <section className="rules-block customization-rules-block">
            <div className="rules-block-heading">
              <span>PLANET LOADOUTS</span>
              <span className="rules-line" />
            </div>
            <p className="feature-rule-text">
              Choose an environment and player design before deployment. Each planet changes the arena atmosphere, grid, and colors; designs change your player shell and glow.
            </p>
            <div className="environment-rule-list">
              {Object.values(ENVIRONMENTS).map((environment) => (
                <div key={environment.name}>
                  <strong>{environment.name}</strong>
                  <span>{environment.description}</span>
                </div>
              ))}
            </div>
            <div className="style-rule-list">
              {Object.values(PLAYER_DESIGNS).map((design) => (
                <span key={design.name} style={{ "--style-color": design.color }}>
                  {design.name}
                </span>
              ))}
            </div>
          </section>
        </div>

        <nav className="rules-actions">
          <Link className="rules-action primary" to="/game">ENTER ARENA</Link>
          <Link className="rules-action" to="/">MAIN MENU</Link>
        </nav>
      </section>
    </main>
  );
}

export default Rules;
