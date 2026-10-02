import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CAREER_WORLDS, FIGHTERS, getUnlockedFighters, QUESTS, readCareerProgress, saveSelectedFighter } from "../data/career";
import "../styles/career.css";

const tabs = ["CAMPAIGN", "PILOTS", "QUESTS", "TOURNAMENT"];

function Career() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(readCareerProgress);
  const [activeTab, setActiveTab] = useState("CAMPAIGN");
  const profile = JSON.parse(localStorage.getItem("aaruProfile") || "null") || {};
  const [selectedLevel, setSelectedLevel] = useState(
    () => {
      const savedLevel = Number(sessionStorage.getItem("aaruCampaignLevel")) || 1;
      return Math.min(savedLevel, readCareerProgress().unlockedLevel || 1);
    }
  );

  const fighters = getUnlockedFighters(progress);
  const selectedFighter = progress.selectedFighter || "vanguard";

  const deploy = (mode) => {
    if (profile.guest) {
      navigate("/intro");
      return;
    }
    const world = CAREER_WORLDS[(selectedLevel - 1) % CAREER_WORLDS.length];
    sessionStorage.setItem("aaruEnvironment", world.id);
    sessionStorage.setItem("aaruCampaignLevel", String(selectedLevel));
    sessionStorage.setItem("aaruRunMode", mode);
    navigate("/game");
  };

  const selectFighter = (fighterId) => {
    saveSelectedFighter(fighterId);
    setProgress(readCareerProgress());
  };

  const unlockedLevel = progress.unlockedLevel || 1;
  const levelWindowStart = Math.max(1, unlockedLevel - 5);
  const displayedLevels = Array.from({ length: 11 }, (_, index) => levelWindowStart + index);
  const scores = progress.tournamentScores || [];
  const questValues = {
    kills: progress.kills,
    waves: progress.waves,
    bosses: progress.bosses,
    bestScore: progress.bestScore,
    tournamentBest: Math.max(0, ...scores.map((entry) => Number(entry.score) || 0)),
  };

  if (profile.guest || !profile.email) {
    return (
      <main className="career-page career-locked-page">
        <Link to="/game" className="career-back">← ARENA</Link>
        <section className="career-locked-message">
          <p className="career-kicker">PILOT RECORD // ACCESS LOCKED</p>
          <h1>SIGN IN REQUIRED</h1>
          <p>Campaign records, quests, pilot unlocks, and Arena Cup standings are for registered pilots. Guest pilots can still play a standard run.</p>
          <Link className="career-primary" to="/intro">SIGN IN OR CREATE PROFILE <span>→</span></Link>
        </section>
      </main>
    );
  }

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
            <div><p>PROCEDURAL SECTOR LADDER</p><h2>CAMPAIGN LEVELS</h2></div>
            <span>SECTOR {unlockedLevel} // INFINITE FRONTIER</span>
          </div>
          <div className="career-world-grid">
            {displayedLevels.map((campaignLevel) => {
              const world = CAREER_WORLDS[(campaignLevel - 1) % CAREER_WORLDS.length];
              const unlocked = campaignLevel <= unlockedLevel;
              const completed = campaignLevel < unlockedLevel;
              return (
                <button
                  key={campaignLevel}
                  type="button"
                  disabled={!unlocked}
                  className={`career-world ${selectedLevel === campaignLevel ? "selected" : ""} ${!unlocked ? "locked" : ""}`}
                  style={{ "--world-color": world.accent }}
                  onClick={() => {
                    setSelectedLevel(campaignLevel);
                    sessionStorage.setItem("aaruEnvironment", world.id);
                    sessionStorage.setItem("aaruCampaignLevel", String(campaignLevel));
                  }}
                >
                  <span className="world-index">LEVEL {String(campaignLevel).padStart(2, "0")}</span>
                  <span className="world-orb" aria-hidden="true" />
                  <strong>{world.name}</strong>
                  <small>{world.description} // VARIANT {campaignLevel}</small>
                  <em>{completed ? "SECTOR CLEARED" : unlocked ? "5 WAVES // NEW ROSTER" : "LOCKED"}</em>
                </button>
              );
            })}
          </div>
          <div className="career-deploy-row">
            <p>Sector {selectedLevel} // <strong>{FIGHTERS[selectedFighter]?.name || "VANGUARD"}</strong></p>
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
              <label htmlFor="tournament-world">UNLOCKED SECTOR (1-{unlockedLevel})</label>
              <input
                id="tournament-world"
                type="number"
                min="1"
                max={unlockedLevel}
                value={selectedLevel}
                onChange={(event) => setSelectedLevel(Math.max(1, Math.min(unlockedLevel, Number(event.target.value) || 1)))}
              />
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
