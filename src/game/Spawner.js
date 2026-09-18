import Enemy from "./Enemy";

class Spawner {
  static createWave(wave, canvasWidth, canvasHeight) {
    const safeWave = Math.max(1, Math.floor(Number(wave) || 1));
    const width = Math.max(1, canvasWidth || 1);
    const height = Math.max(1, canvasHeight || 1);

    const enemies = [];

    // Wave 1 = 5 enemies, then +2 every wave.
    // Wave 2 = 7, Wave 3 = 9, Wave 4 = 11, etc.
    const enemyCount = 5 + (safeWave - 1) * 2;

    for (let i = 0; i < enemyCount; i++) {
      const side = Math.floor(Math.random() * 4);

      let x;
      let y;

      if (side === 0) {
        x = Math.random() * width;
        y = -60;
      } else if (side === 1) {
        x = width + 60;
        y = Math.random() * height;
      } else if (side === 2) {
        x = Math.random() * width;
        y = height + 60;
      } else {
        x = -60;
        y = Math.random() * height;
      }

      let type = "grunt";
      const random = Math.random();

      if (safeWave === 1) {
        type = "grunt";
      } else if (safeWave === 2) {
        // Wave 2: grunts + runners
        type = random < 0.35 ? "runner" : "grunt";
      } else if (safeWave === 3) {
        // Wave 3: grunts + runners + tanks
        if (random < 0.20) {
          type = "tank";
        } else if (random < 0.55) {
          type = "runner";
        } else {
          type = "grunt";
        }
      } else {
        // Wave 4+: introduce shooters as well.
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
          x,
          y,
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
