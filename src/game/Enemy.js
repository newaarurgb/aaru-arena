class Enemy {
  constructor(x, y, wave = 1, type = "grunt") {
    this.x = x;
    this.y = y;

    this.type = type;
    this.wave = wave;

    this.hitFlash = 0;
    this.hitTimer = 0;
    this.rotation = 0;

    // Shooter-specific
    this.shootCooldown = 0;
    this.shootInterval = 100;

    switch (type) {
      case "runner":
        this.width = 30;
        this.height = 30;
        this.maxHealth = 30 + (wave - 1) * 8;
        this.speed = 2.5 + (wave - 1) * 0.18;
        this.damage = 8;
        break;

      case "tank":
        this.width = 55;
        this.height = 55;
        this.maxHealth = 180 + (wave - 1) * 35;
        this.speed = 0.65 + (wave - 1) * 0.08;
        this.damage = 20;
        break;

      case "shooter":
        this.width = 38;
        this.height = 38;
        this.maxHealth = 70 + (wave - 1) * 12;
        this.speed = 0.9 + (wave - 1) * 0.08;
        this.damage = 12;
        this.shootCooldown = Math.random() * 60;
        break;

      case "grunt":
      default:
        this.width = 40;
        this.height = 40;
        this.maxHealth = 50 + (wave - 1) * 15;
        this.speed = 1.2 + (wave - 1) * 0.15;
        this.damage = 10;
        break;
    }

    this.health = this.maxHealth;
  }

  update(player, canvas) {
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    const enemyCenterX = this.x + this.width / 2;
    const enemyCenterY = this.y + this.height / 2;

    const dx = playerCenterX - enemyCenterX;
    const dy = playerCenterY - enemyCenterY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    // =========================
    // SHOOTER BEHAVIOR
    // =========================

    if (this.type === "shooter") {
      // Move toward player until reaching shooting distance
      if (distance > 280) {
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
      }

      // Move away if player gets too close
      if (distance < 190 && distance > 0) {
        this.x -= (dx / distance) * this.speed;
        this.y -= (dy / distance) * this.speed;
      }

      if (this.shootCooldown > 0) {
        this.shootCooldown--;
      }
    } else {
      // =========================
      // NORMAL ENEMY MOVEMENT
      // =========================

      if (distance > 45) {
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
      }
    }

    // Keep inside canvas
    this.x = Math.max(
      0,
      Math.min(canvas.width - this.width, this.x)
    );

    this.y = Math.max(
      0,
      Math.min(canvas.height - this.height, this.y)
    );

    this.rotation += 0.02;

    if (this.hitFlash > 0) {
      this.hitFlash--;
    }

    if (this.hitTimer > 0) {
      this.hitTimer--;
    }
  }

  canShoot() {
    if (this.type !== "shooter") {
      return false;
    }

    if (this.shootCooldown > 0) {
      return false;
    }

    this.shootCooldown = this.shootInterval;

    return true;
  }

  getShootDirection(player) {
    const enemyCenterX = this.x + this.width / 2;
    const enemyCenterY = this.y + this.height / 2;

    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    const dx = playerCenterX - enemyCenterX;
    const dy = playerCenterY - enemyCenterY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return {
        x: 0,
        y: 0
      };
    }

    return {
      x: dx / distance,
      y: dy / distance
    };
  }

  takeDamage(amount) {
    this.health -= amount;

    this.hitFlash = 8;
    this.hitTimer = 5;

    return this.health <= 0;
  }

  draw(ctx) {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    let color;
    let symbol;

    switch (this.type) {
      case "runner":
        color = "#ffff00";
        symbol = "⚡";
        break;

      case "tank":
        color = "#aa44ff";
        symbol = "⬢";
        break;

      case "shooter":
        color = "#00aaff";
        symbol = "✦";
        break;

      case "grunt":
      default:
        color = "#ff0055";
        symbol = "◆";
        break;
    }

    if (this.hitFlash > 0) {
      color = "#ffffff";
    }

    ctx.save();

    // =========================
    // OUTER GLOW
    // =========================

    ctx.shadowColor = color;
    ctx.shadowBlur = 22;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    // Shooter
    if (this.type === "shooter") {
      ctx.beginPath();

      ctx.arc(
        centerX,
        centerY,
        this.width / 2,
        0,
        Math.PI * 2
      );

      ctx.stroke();

      ctx.fillStyle = "rgba(0, 170, 255, 0.15)";
      ctx.fill();

      // Targeting cross
      ctx.beginPath();

      ctx.moveTo(centerX - 12, centerY);
      ctx.lineTo(centerX + 12, centerY);

      ctx.moveTo(centerX, centerY - 12);
      ctx.lineTo(centerX, centerY + 12);

      ctx.stroke();
    }

    // Runner
    else if (this.type === "runner") {
      ctx.beginPath();

      ctx.moveTo(centerX, this.y);
      ctx.lineTo(this.x + this.width, this.y + this.height);
      ctx.lineTo(this.x, this.y + this.height);

      ctx.closePath();

      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 0, 0.15)";
      ctx.fill();
    }

    // Tank
    else if (this.type === "tank") {
      ctx.beginPath();

      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;

        const radius = this.width / 2;

        const px = centerX + Math.cos(angle) * radius;
        const py = centerY + Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }

      ctx.closePath();

      ctx.fillStyle = "rgba(170, 68, 255, 0.15)";

      ctx.stroke();
      ctx.fill();
    }

    // Grunt
    else {
      ctx.strokeRect(
        this.x,
        this.y,
        this.width,
        this.height
      );

      ctx.fillStyle = "rgba(255, 0, 85, 0.15)";

      ctx.fillRect(
        this.x,
        this.y,
        this.width,
        this.height
      );
    }

    // =========================
    // CORE SYMBOL
    // =========================

    ctx.shadowColor = color;
    ctx.shadowBlur = 15;

    ctx.fillStyle = color;

    ctx.font = "bold 18px Arial";

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(symbol, centerX, centerY);

    ctx.restore();

    // =========================
    // HEALTH BAR
    // =========================

    const healthPercentage = Math.max(
      0,
      this.health / this.maxHealth
    );

    ctx.fillStyle = "#111";

    ctx.fillRect(
      this.x,
      this.y - 10,
      this.width,
      5
    );

    ctx.fillStyle = "#00ff88";

    ctx.fillRect(
      this.x,
      this.y - 10,
      this.width * healthPercentage,
      5
    );
  }
}

export default Enemy;