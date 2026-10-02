import { ENVIRONMENTS, PLAYER_DESIGNS } from "./loadouts";

export const FIGHTERS = {
  vanguard: {
    name: "VANGUARD",
    title: "ALL-ROUND DEFENDER",
    design: "aqua",
    health: 100,
    speed: 5,
    damage: 25,
    unlockStat: null,
    unlockTarget: 0,
    unlockText: "READY",
  },
  striker: {
    name: "STRIKER",
    title: "FAST ASSAULT",
    design: "solar",
    health: 85,
    speed: 6.2,
    damage: 29,
    unlockStat: "kills",
    unlockTarget: 25,
    unlockText: "DEFEAT 25 ENEMIES",
  },
  bulwark: {
    name: "BULWARK",
    title: "HEAVY DEFENSE",
    design: "frost",
    health: 140,
    speed: 4.1,
    damage: 25,
    unlockStat: "waves",
    unlockTarget: 5,
    unlockText: "CLEAR 5 WAVES",
  },
  ranger: {
    name: "RANGER",
    title: "PRECISION SPECIALIST",
    design: "toxic",
    health: 90,
    speed: 5.3,
    damage: 34,
    unlockStat: "bosses",
    unlockTarget: 1,
    unlockText: "DEFEAT A WORLD BOSS",
  },
  shade: {
    name: "SHADE",
    title: "VOID RUNNER",
    design: "violet",
    health: 95,
    speed: 5.8,
    damage: 30,
    unlockStat: "bestScore",
    unlockTarget: 5000,
    unlockText: "SCORE 5,000 IN ONE RUN",
  },
  sentinel: {
    name: "SENTINEL",
    title: "CRYO GUARDIAN",
    design: "ruby",
    health: 125,
    speed: 4.6,
    damage: 32,
    unlockStat: "tournamentBest",
    unlockTarget: 10000,
    unlockText: "SCORE 10,000 IN THE CUP",
  },
};

export const CAREER_WORLDS = Object.entries(ENVIRONMENTS).map(
  ([id, world], index) => ({
    id,
    name: world.name,
    description: world.description,
    accent: world.accent,
    level: index + 1,
  })
);

export const QUESTS = [
  { id: "eliminator", name: "ELIMINATOR", detail: "Defeat 25 enemies", target: 25, stat: "kills", reward: "STRIKER" },
  { id: "survivor", name: "LAST PILOT", detail: "Clear 5 waves", target: 5, stat: "waves", reward: "BULWARK" },
  { id: "champion", name: "WORLD CHAMPION", detail: "Defeat a world boss", target: 1, stat: "bosses", reward: "RANGER" },
  { id: "high-score", name: "ACE PILOT", detail: "Score 5,000 points in one run", target: 5000, stat: "bestScore", reward: "SHADE" },
  { id: "cup-score", name: "CUP CONTENDER", detail: "Score 10,000 in the Arena Cup", target: 10000, stat: "tournamentBest", reward: "SENTINEL" },
];

export function readCareerProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem("aaruCareerProgress") || "null");
    return {
      kills: 0,
      waves: 0,
      bosses: 0,
      bestScore: 0,
      runs: 0,
      unlockedWorlds: [CAREER_WORLDS[0].id],
      completedWorlds: [],
      selectedFighter: "vanguard",
      tournamentScores: [],
      ...saved,
    };
  } catch {
    return {
      kills: 0,
      waves: 0,
      bosses: 0,
      bestScore: 0,
      runs: 0,
      unlockedWorlds: [CAREER_WORLDS[0].id],
      completedWorlds: [],
      selectedFighter: "vanguard",
      tournamentScores: [],
    };
  }
}

function updateCareerProgress(update) {
  const current = readCareerProgress();
  const next = update(current);
  localStorage.setItem("aaruCareerProgress", JSON.stringify(next));
  return next;
}

export function saveSelectedFighter(fighterId) {
  if (!FIGHTERS[fighterId]) return;
  updateCareerProgress((progress) => ({ ...progress, selectedFighter: fighterId }));
  sessionStorage.setItem("aaruFighter", fighterId);
  sessionStorage.setItem("aaruPlayerDesign", FIGHTERS[fighterId].design);
}

export function recordEnemyDefeat() {
  updateCareerProgress((progress) => ({ ...progress, kills: progress.kills + 1 }));
}

export function recordWaveClear() {
  updateCareerProgress((progress) => ({ ...progress, waves: progress.waves + 1 }));
}

export function recordRunResult({ worldId, score, won, tournament }) {
  return updateCareerProgress((progress) => {
    const next = {
      ...progress,
      runs: progress.runs + 1,
      bestScore: Math.max(progress.bestScore, score),
    };

    if (won) {
      const worldIndex = CAREER_WORLDS.findIndex((world) => world.id === worldId);
      next.bosses += 1;
      next.completedWorlds = [...new Set([...next.completedWorlds, worldId])];
      if (worldIndex >= 0 && worldIndex + 1 < CAREER_WORLDS.length) {
        next.unlockedWorlds = [...new Set([
          ...next.unlockedWorlds,
          CAREER_WORLDS[worldIndex + 1].id,
        ])];
      }
    }

    if (tournament) {
      const profile = JSON.parse(localStorage.getItem("aaruProfile") || "null") || {};
      const entry = {
        name: (profile.displayName || "GUEST PILOT").slice(0, 16),
        score,
        world: ENVIRONMENTS[worldId]?.name || "ARENA",
        date: new Date().toISOString(),
      };
      next.tournamentScores = [...next.tournamentScores, entry]
        .sort((first, second) => second.score - first.score)
        .slice(0, 10);
    }

    return next;
  });
}

export function getUnlockedFighters(progress = readCareerProgress()) {
  return Object.entries(FIGHTERS).map(([id, fighter]) => ({
    id,
    ...fighter,
    unlocked: fighter.unlockStat === null || Number(
      fighter.unlockStat === "tournamentBest"
        ? Math.max(0, ...(progress.tournamentScores || []).map((entry) => Number(entry.score) || 0))
        : progress[fighter.unlockStat]
    ) >= fighter.unlockTarget,
    shell: PLAYER_DESIGNS[fighter.design],
  }));
}
