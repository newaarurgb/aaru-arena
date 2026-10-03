import { ENVIRONMENTS, PLAYER_DESIGNS } from "./loadouts";

export const FIGHTERS = {
  vanguard: {
    name: "VANGUARD",
    title: "ALL-ROUND DEFENDER",
    design: "aqua",
    health: 100,
    speed: 5,
    damage: 25,
    weapon: "PULSE CANNON",
    weaponDetail: "Balanced single energy bolts",
    weaponMode: "single",
    fireRate: 250,
    projectileSpeed: 9,
    projectileSize: 5,
    unlockStat: null,
    unlockTarget: 0,
    unlockText: "READY",
    price: 0,
  },
  striker: {
    name: "STRIKER",
    title: "FAST ASSAULT",
    design: "solar",
    health: 100,
    speed: 6.2,
    damage: 29,
    weapon: "TRIAD BLASTER",
    weaponDetail: "Three-bolt spread for close swarms",
    weaponMode: "spread",
    fireRate: 320,
    projectileSpeed: 8.5,
    projectileSize: 4,
    unlockStat: "kills",
    unlockTarget: 25,
    unlockText: "DEFEAT 25 ENEMIES",
    price: 100,
  },
  bulwark: {
    name: "BULWARK",
    title: "HEAVY DEFENSE",
    design: "frost",
    health: 140,
    speed: 4.1,
    damage: 25,
    weapon: "SIEGE CASTER",
    weaponDetail: "Heavy, slow, high-impact shells",
    weaponMode: "heavy",
    fireRate: 480,
    projectileSpeed: 7,
    projectileSize: 8,
    unlockStat: "waves",
    unlockTarget: 5,
    unlockText: "CLEAR 5 WAVES",
    price: 140,
  },
  ranger: {
    name: "RANGER",
    title: "PRECISION SPECIALIST",
    design: "toxic",
    health: 100,
    speed: 5.3,
    damage: 34,
    weapon: "PIERCER RIFLE",
    weaponDetail: "Fast precision rounds that pierce targets",
    weaponMode: "piercing",
    fireRate: 300,
    projectileSpeed: 13,
    projectileSize: 4,
    unlockStat: "bosses",
    unlockTarget: 1,
    unlockText: "DEFEAT A WORLD BOSS",
    price: 180,
  },
  shade: {
    name: "SHADE",
    title: "VOID RUNNER",
    design: "violet",
    health: 100,
    speed: 5.8,
    damage: 30,
    weapon: "NOVA REPEATER",
    weaponDetail: "Rapid paired bolts",
    weaponMode: "rapid-pair",
    fireRate: 210,
    projectileSpeed: 10,
    projectileSize: 4,
    unlockStat: "bestScore",
    unlockTarget: 5000,
    unlockText: "SCORE 5,000 IN ONE RUN",
    price: 220,
  },
  sentinel: {
    name: "SENTINEL",
    title: "CRYO GUARDIAN",
    design: "ruby",
    health: 125,
    speed: 4.6,
    damage: 32,
    weapon: "CRYO LANCE",
    weaponDetail: "Freezing shots slow targets",
    weaponMode: "cryo",
    fireRate: 350,
    projectileSpeed: 8,
    projectileSize: 6,
    unlockStat: "tournamentBest",
    unlockTarget: 10000,
    unlockText: "SCORE 10,000 IN THE CUP",
    price: 260,
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
      credits: 0,
      unlockedLevel: 1,
      powerLevel: 0,
      unlockedWorlds: [CAREER_WORLDS[0].id],
      completedWorlds: [],
      selectedFighter: "vanguard",
      tournamentScores: [],
      purchasedFighters: ["vanguard"],
      completedQuests: [],
      ...saved,
    };
  } catch {
    return {
      kills: 0,
      waves: 0,
      bosses: 0,
      bestScore: 0,
      runs: 0,
      credits: 0,
      unlockedLevel: 1,
      powerLevel: 0,
      unlockedWorlds: [CAREER_WORLDS[0].id],
      completedWorlds: [],
      selectedFighter: "vanguard",
      tournamentScores: [],
      purchasedFighters: ["vanguard"],
      completedQuests: [],
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
  const unlocked = getUnlockedFighters().some((fighter) => fighter.id === fighterId && fighter.unlocked);
  if (!unlocked) return;
  updateCareerProgress((progress) => ({ ...progress, selectedFighter: fighterId }));
  sessionStorage.setItem("aaruFighter", fighterId);
  sessionStorage.setItem("aaruPlayerDesign", FIGHTERS[fighterId].design);
}

export function purchaseFighter(fighterId) {
  const fighter = FIGHTERS[fighterId];
  if (!fighter) return { ok: false, progress: readCareerProgress() };

  let result = { ok: false, progress: readCareerProgress() };
  updateCareerProgress((progress) => {
    const purchased = progress.purchasedFighters || ["vanguard"];
    if (purchased.includes(fighterId) || progress.credits < fighter.price) {
      result.progress = progress;
      return progress;
    }

    result = {
      ok: true,
      progress: {
        ...progress,
        credits: progress.credits - fighter.price,
        purchasedFighters: [...purchased, fighterId],
      },
    };
    return result.progress;
  });
  return result;
}

function completeReachedQuests(progress) {
  const completed = new Set(progress.completedQuests || []);
  const cupBest = Math.max(0, ...(progress.tournamentScores || []).map((entry) => Number(entry.score) || 0));
  const values = {
    kills: progress.kills,
    waves: progress.waves,
    bosses: progress.bosses,
    bestScore: progress.bestScore,
    tournamentBest: cupBest,
  };
  let rewardCredits = 0;

  QUESTS.forEach((quest) => {
    if (!completed.has(quest.id) && Number(values[quest.stat] || 0) >= quest.target) {
      completed.add(quest.id);
      rewardCredits += 75;
    }
  });

  return {
    ...progress,
    completedQuests: [...completed],
    credits: progress.credits + rewardCredits,
  };
}

export function recordEnemyDefeat() {
  updateCareerProgress((progress) => completeReachedQuests({
    ...progress,
    kills: progress.kills + 1,
  }));
}

export function collectCareerCredits(amount) {
  const reward = Math.max(0, Math.floor(Number(amount) || 0));
  if (reward === 0) return readCareerProgress();
  return updateCareerProgress((progress) => ({
    ...progress,
    credits: progress.credits + reward,
  }));
}

export function recordWaveClear({ sector = 1 } = {}) {
  updateCareerProgress((progress) => completeReachedQuests({
    ...progress,
    waves: progress.waves + 1,
    credits: progress.credits + 25 + Math.max(0, Math.floor(sector) - 1) * 3,
  }));
}

export function recordRunResult({ worldId, score, won, tournament, mode = "campaign", campaignLevel = 1 }) {
  return updateCareerProgress((progress) => {
    let next = {
      ...progress,
      runs: progress.runs + 1,
      bestScore: Math.max(progress.bestScore, score),
    };

    if (won) {
      next = {
        ...next,
        credits: next.credits + 100 + Math.max(0, Math.floor(campaignLevel) - 1) * 15,
        powerLevel: next.powerLevel + 1,
        bosses: next.bosses + 1,
      };
      if (mode === "campaign") {
        next.unlockedLevel = Math.max(next.unlockedLevel || 1, campaignLevel + 1);
      }
      const worldIndex = CAREER_WORLDS.findIndex((world) => world.id === worldId);
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

    return completeReachedQuests(next);
  });
}

export function getUnlockedFighters(progress = readCareerProgress()) {
  return Object.entries(FIGHTERS).map(([id, fighter]) => ({
    id,
    ...fighter,
    unlocked: (progress.purchasedFighters || ["vanguard"]).includes(id),
    eligible: fighter.unlockStat === null || Number(
      fighter.unlockStat === "tournamentBest"
        ? Math.max(0, ...(progress.tournamentScores || []).map((entry) => Number(entry.score) || 0))
        : progress[fighter.unlockStat]
    ) >= fighter.unlockTarget,
    shell: PLAYER_DESIGNS[fighter.design],
  }));
}
