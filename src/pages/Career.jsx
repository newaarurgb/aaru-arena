import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CAREER_WORLDS, FIGHTERS, getUnlockedFighters, QUESTS, readCareerProgress, saveSelectedFighter } from "../data/career";
import "../styles/career.css";

const tabs = ["CAMPAIGN", "PILOTS", "QUESTS", "TOURNAMENT"];

function Career() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(readCareerProgress);
  const [activeTab, setActiveTab] = useState("CAMPAIGN");
  const [selectedWorld, setSelectedWorld] = useState(
    () => {
      const savedWorld = sessionStorage.getItem("aaruEnvironment") || CAREER_WORLDS[0].id;
      return readCareerProgress().unlockedWorlds.includes(savedWorld)
        ? savedWorld
        : CAREER_WORLDS[0].id;
    }
  );

  const fighters = getUnlockedFighters(progress);
  const selectedFighter = progress.selectedFighter || "vanguard";

  const deploy = (mode) => {
    sessionStorage.setItem("aaruEnvironment", selectedWorld);
    sessionStorage.setItem("aaruRunMode", mode);
    navigate("/game");
  };

  const selectFighter = (fighterId) => {
    saveSelectedFighter(fighterId);
    setProgress(readCareerProgress());
  };

  const unlockedWorlds = progress.unlockedWorlds || [CAREER_WORLDS[0].id];
  const completedWorlds = progress.completedWorlds || [];
  const scores = progress.tournamentScores || [];
  const questValues = {
    kills: progress.kills,
    waves: progress.waves,
    bosses: progress.bosses,
    bestScore: progress.bestScore,
    tournamentBest: Math.max(0, ...scores.map((entry) => Number(entry.score) || 0)),
  };

  return (
    <main className="career-page">
      <header className="career-header">
        <Link to="/" className="career-back" aria-label="Back to main menu">← MENU</Link>
        <p className="career-kicker">AARU ARENA // PILOT RECORD</p>
        <h1>CAREER</h1>
        <div className="career-stats" aria-label="Career statistics">
          <span><strong>{progress.bosses}</strong> BOSSES</span>
          <span><strong>{progress.kills}</strong> ELIMINATIONS</span>
          <span><strong>{progress.runs}</strong> RUNS</span>
        </div>
      </header>

      <nav className="career-tabs" aria-label="Career sections">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === "CAMPAIGN" && (
        <section className="career-section">
          <div className="career-section-heading">
            <div><p>THE SIX-WORLD CIRCUIT</p><h2>CAMPAIGN LEVELS</h2></div>
            <span>{unlockedWorlds.length}/{CAREER_WORLDS.length} UNLOCKED</span>
          </div>
          <div className="career-world-grid">
            {CAREER_WORLDS.map((world) => {
              const unlocked = unlockedWorlds.includes(world.id);
              const completed = completedWorlds.includes(world.id);
              return (
                <button
                  key={world.id}
                  type="button"
                  disabled={!unlocked}
                  className={`career-world ${selectedWorld === world.id ? "selected" : ""} ${!unlocked ? "locked" : ""}`}
                  style={{ "--world-color": world.accent }}
                  onClick={() => {
                    setSelectedWorld(world.id);
                    sessionStorage.setItem("aaruEnvironment", world.id);
                  }}
                >
                  <span className="world-index">LEVEL {String(world.level).padStart(2, "0")}</span>
                  <span className="world-orb" aria-hidden="true" />
                  <strong>{world.name}</strong>
                  <small>{world.description}</small>
                  <em>{completed ? "BOSS DEFEATED" : unlocked ? "5 WAVES // 1 BOSS" : "LOCKED"}</em>
                </button>
              );
            })}
          </div>
          <div className="career-deploy-row">
            <p>Selected pilot: <strong>{FIGHTERS[selectedFighter]?.name || "VANGUARD"}</strong></p>
            <button className="career-primary" type="button" onClick={() => deploy("campaign")}>DEPLOY CAMPAIGN <span>→</span></button>
          </div>
        </section>
      )}

      {activeTab === "PILOTS" && (
        <section className="career-section">
          <div className="career-section-heading">
            <div><p>COMBAT SPECIALISTS</p><h2>CHOOSE YOUR PILOT</h2></div>
            <span>{fighters.filter((fighter) => fighter.unlocked).length}/{fighters.length} AVAILABLE</span>
          </div>
          <div className="career-pilot-grid">
            {fighters.map((fighter) => (
              <button
                key={fighter.id}
                type="button"
                disabled={!fighter.unlocked}
                className={`career-pilot ${selectedFighter === fighter.id ? "selected" : ""} ${!fighter.unlocked ? "locked" : ""}`}
                style={{ "--pilot-color": fighter.shell?.color || "#38d9c4" }}
                onClick={() => selectFighter(fighter.id)}
              >
                <span className="pilot-glyph" aria-hidden="true">✦</span>
                <strong>{fighter.name}</strong>
                <small>{fighter.title}</small>
                <span className="pilot-stats">HP {fighter.health} <i /> SPD {fighter.speed} <i /> DMG {fighter.damage}</span>
                <em>{fighter.unlocked ? selectedFighter === fighter.id ? "SELECTED" : "SELECT PILOT" : fighter.unlockText}</em>
              </button>
            ))}
          </div>
        </section>
      )}

      {activeTab === "QUESTS" && (
        <section className="career-section">
          <div className="career-section-heading">
            <div><p>FIELD OBJECTIVES</p><h2>QUEST LOG</h2></div>
            <span>LOCAL CAREER</span>
          </div>
          <div className="career-quest-list">
            {QUESTS.map((quest) => {
              const value = Math.min(quest.target, questValues[quest.stat] || 0);
              const percent = Math.round((value / quest.target) * 100);
              return (
                <article className="career-quest" key={quest.id}>
                  <div className="quest-copy"><strong>{quest.name}</strong><span>{quest.detail}</span></div>
                  <div className="quest-reward">REWARD <b>{quest.reward}</b></div>
                  <div className="quest-progress"><span style={{ width: `${percent}%` }} /></div>
                  <small>{value.toLocaleString()} / {quest.target.toLocaleString()}</small>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === "TOURNAMENT" && (
        <section className="career-section">
          <div className="career-section-heading">
            <div><p>SOLO SCORE ATTACK</p><h2>ARENA CUP</h2></div>
            <span>BEST RUNS ON THIS DEVICE</span>
          </div>
          <div className="tournament-layout">
            <div className="tournament-event">
              <div className="tournament-mark">AA<span> CUP</span></div>
              <p>One pilot. Five waves. One boss. Post your best score from any unlocked world.</p>
              <label htmlFor="tournament-world">ARENA</label>
              <select id="tournament-world" value={selectedWorld} onChange={(event) => setSelectedWorld(event.target.value)}>
                {CAREER_WORLDS.filter((world) => unlockedWorlds.includes(world.id)).map((world) => (
                  <option key={world.id} value={world.id}>{world.name}</option>
                ))}
              </select>
              <button className="career-primary" type="button" onClick={() => deploy("tournament")}>ENTER SCORE ATTACK <span>→</span></button>
            </div>
            <div className="tournament-table-wrap">
              <h3>LOCAL STANDINGS</h3>
              {scores.length === 0 ? (
                <p className="tournament-empty">No tournament runs recorded yet.</p>
              ) : (
                <ol className="tournament-table">
                  {scores.map((entry, index) => (
                    <li key={`${entry.date}-${index}`}>
                      <span className="rank">{String(index + 1).padStart(2, "0")}</span>
                      <span className="tournament-player"><strong>{entry.name}</strong><small>{entry.world}</small></span>
                      <b>{entry.score.toLocaleString()}</b>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="career-footer">
        <span>PROGRESS SAVES ON THIS DEVICE</span>
        <Link to="/leaderboard">SCORE ARCHIVE ↗</Link>
      </footer>
    </main>
  );
}

export default Career;
