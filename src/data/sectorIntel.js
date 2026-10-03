export const ENEMY_ARCHETYPES = [
  { type: "grunt", power: "Aimed energy bolts", weakness: "ENERGY", counter: "Pulse and Cryo weapons" },
  { type: "runner", power: "Fast triple-shot bursts", weakness: "KINETIC", counter: "Spread, Siege and Piercer weapons" },
  { type: "tank", power: "Heavy radial volleys", weakness: "ENERGY", counter: "Energy fire between slow bursts" },
  { type: "shooter", power: "Long-range paired shots", weakness: "ENERGY", counter: "Close distance or pierce its line" },
  { type: "charger", power: "Telegraphed dash and fan volley", weakness: "KINETIC", counter: "Bait the dash, then use kinetic fire" },
  { type: "warden", power: "Five-lane spread", weakness: "ENERGY", counter: "Break its firing lane with energy shots" },
  { type: "splitter", power: "Three-shot burst; divides on defeat", weakness: "KINETIC", counter: "Use kinetic damage before it splits" },
];

export function getSectorRoster(sector = 1) {
  const safeSector = Math.max(1, Math.floor(Number(sector) || 1));
  const archetypes = [...ENEMY_ARCHETYPES];
  let seed = (safeSector * 2654435761) >>> 0;

  for (let index = archetypes.length - 1; index > 0; index--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [archetypes[index], archetypes[swapIndex]] = [archetypes[swapIndex], archetypes[index]];
  }

  return archetypes.slice(0, 3);
}

export function getSectorIdentity(sector = 1) {
  const safeSector = Math.max(1, Math.floor(Number(sector) || 1));
  const world = ["ASH", "STORM", "FROST", "VOID", "EMBER", "MOSS", "TIDAL", "CHROME"][
    (safeSector - 1) % 8
  ];
  const roster = getSectorRoster(safeSector);
  if (roster.some((enemy) => enemy.type === "splitter") && !roster.some((enemy) => enemy.type === "runner")) {
    roster.push(ENEMY_ARCHETYPES.find((enemy) => enemy.type === "runner"));
  }
  return { sector: safeSector, world, roster };
}
