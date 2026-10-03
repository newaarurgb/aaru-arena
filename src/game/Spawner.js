import Enemy from "./Enemy";
import { getSectorRoster } from "../data/sectorIntel";

class Spawner {
  static getSafeSpawnPoint(
    canvasWidth,
    canvasHeight,
    player,
    index = 0,
    enemyWidth = 40,
    enemyHeight = 40,
    safeRadius = 220
  ) {
    const width = Math.max(1, canvasWidth || 1);
    const height = Math.max(1, canvasHeight || 1);
    const playerCenter = player
      ? {
          x: player.x + player.width / 2,
          y: player.y + player.height / 2,
        }
      : {
          x: width / 2,
          y: height / 2,
        };

    const points = [
      { x: width / 2, y: -90 },
      { x: width + 90, y: height / 2 },
      { x: width / 2, y: height + 90 },
      { x: -90, y: height / 2 },
      { x: -90, y: -90 },
      { x: width + 90, y: -90 },
      { x: width + 90, y: height + 90 },
      { x: -90, y: height + 90 },
    ];

    const distanceFromPlayer = (point) => {
      const visibleX = Math.max(0, Math.min(width - enemyWidth, point.x));
      const visibleY = Math.max(0, Math.min(height - enemyHeight, point.y));
      const centerX = visibleX + enemyWidth / 2;
      const centerY = visibleY + enemyHeight / 2;

      return Math.hypot(
        centerX - playerCenter.x,
        centerY - playerCenter.y
      );
    };

    const commonEntry = points[index % 4];
    if (index < 2 && distanceFromPlayer(commonEntry) >= safeRadius) {
      return commonEntry;
    }

    const safePoints = points
      .filter((point) => distanceFromPlayer(point) >= safeRadius)
      .sort((first, second) => distanceFromPlayer(second) - distanceFromPlayer(first));

    if (safePoints.length > 0) {
      return safePoints[index % safePoints.length];
    }

    return points.sort(
      (first, second) => distanceFromPlayer(second) - distanceFromPlayer(first)
    )[0];
  }

  static createWave(wave, canvasWidth, canvasHeight, player = null, difficulty = "hard", campaignLevel = 1) {
    const safeWave = Math.max(1, Math.floor(Number(wave) || 1));
    const sector = Math.max(1, Math.floor(Number(campaignLevel) || 1));
    const width = Math.max(1, canvasWidth || 1);
    const height = Math.max(1, canvasHeight || 1);
    const enemies = [];
    const levelRoster = getSectorRoster(sector).map((enemy) => enemy.type);
    const safeRadius = 220 + Math.min(500, safeWave * 25 + sector * 8);
    const spawnMultiplier = difficulty === "difficult" ? 1.8 : difficulty === "hard" ? 1.25 : 1;
    const count = Math.min(
      30,
      Math.ceil((5 + (safeWave - 1) * 2 + Math.floor((sector - 1) * 1.5)) * spawnMultiplier)
    );

    for (let index = 0; index < count; index++) {
      const type = levelRoster[(index + Math.floor(index / 3)) % levelRoster.length];
      const definition = new Enemy(0, 0, safeWave, type, sector);
      const spawn = Spawner.getSafeSpawnPoint(
        width,
        height,
        player,
        index,
        definition.width,
        definition.height,
        safeRadius
      );
      definition.x = spawn.x;
      definition.y = spawn.y;
      enemies.push(definition);
    }

    return enemies;
  }
}

export default Spawner;
