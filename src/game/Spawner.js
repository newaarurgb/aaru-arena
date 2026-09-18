import Enemy from "./Enemy";

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

    return safePoints[0] || points.sort(
      (first, second) => distanceFromPlayer(second) - distanceFromPlayer(first)
    )[0];
  }

  static createWave(wave, canvasWidth, canvasHeight, player = null) {
    const safeWave = Math.max(1, Math.floor(Number(wave) || 1));
    const width = Math.max(1, canvasWidth || 1);
    const height = Math.max(1, canvasHeight || 1);

    const enemies = [];

    // Wave 1 = 5 enemies, then +2 every wave.
    // Wave 2 = 7, Wave 3 = 9, Wave 4 = 11, etc.
    const enemyCount = 5 + (safeWave - 1) * 2;
    const safeRadius = 220 + safeWave * 25;

    for (let i = 0; i < enemyCount; i++) {
      const spawn = Spawner.getSafeSpawnPoint(
        width,
        height,
        player,
        i,
        40,
        40,
        safeRadius
      );

      let type = "grunt";
      const random = Math.random();

      if (safeWave === 1) {
        type = "grunt";
      } else if (safeWave === 2) {
        type = random < 0.35 ? "runner" : "grunt";
      } else if (safeWave === 3) {
        if (random < 0.20) {
          type = "tank";
        } else if (random < 0.55) {
          type = "runner";
        } else {
          type = "grunt";
        }
      } else {
        if (random < 0.20) {
          type = "shooter";
        } else if (random < 0.40) {
          type = "tank";
        } else if (random < 0.65) {
          type = "runner";
        } else {
          type = "grunt";
        }
      }

      enemies.push(
        new Enemy(
          spawn.x,
          spawn.y,
          safeWave,
          type
        )
      );
    }

    // Always return the actual array. Game.jsx uses this to
    // determine whether a wave really started.
    return enemies;
  }
}

export default Spawner;
