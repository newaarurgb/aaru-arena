class Enemy {
  constructor(x, y, wave = 1, type = "grunt", sector = 1) {
    this.x = x;
    this.y = y;

    this.type = type;
    this.wave = wave;
    this.sector = Math.max(1, Number(sector) || 1);
    this.variantName = `${["ASH", "STORM", "FROST", "VOID", "EMBER", "MOSS", "TIDAL", "CHROME"][((this.sector - 1) % 8)]} ${type.toUpperCase()}-${this.sector}`;
    this.tint = `hsl(${(this.sector * 53 + type.length * 19) % 360} 88% 60%)`;
    this.weakness = ["runner", "charger", "splitter"].includes(type) ? "KINETIC" : "ENERGY";
    this.shootInterval = Math.max(34, 112 - Math.min(65, this.sector * 1.4));
    this.shootCooldown = Math.random() * this.shootInterval;

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

      case "charger":
        this.width = 34;
        this.height = 34;
        this.maxHealth = 60 + (wave - 1) * 12;
        this.speed = 1.15 + (wave - 1) * 0.1;
        this.damage = 16;
        this.chargeClock = 35 + Math.random() * 70;
        this.chargeTimer = 0;
        break;

      case "warden":
        this.width = 46;
        this.height = 46;
        this.maxHealth = 100 + (wave - 1) * 16;
        this.speed = 0.75 + (wave - 1) * 0.06;
        this.damage = 13;
        this.shootCooldown = Math.random() * 70;
        this.shootInterval = 135;
        break;

      case "splitter":
        this.width = 48;
        this.height = 48;
        this.maxHealth = 105 + (wave - 1) * 18;
        this.speed = 0.9 + (wave - 1) * 0.08;
        this.damage = 14;
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

    const sectorScale = 1 + (this.sector - 1) * 0.11;
    this.maxHealth *= sectorScale;
    this.speed *= 1 + Math.min(0.8, (this.sector - 1) * 0.018);
    this.damage *= 1 + Math.min(2.5, (this.sector - 1) * 0.075);
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

    if (this.type === "charger") {
      if (this.chargeTimer > 0) {
        this.chargeTimer--;
      } else if (this.chargeClock > 0) {
        this.chargeClock--;
      } else {
        this.chargeTimer = 18;
        this.chargeClock = 100;
      }
    }

    if (this.type === "shooter" || this.type === "warden") {
      // Move toward player until reaching shooting distance
      if (distance > (this.type === "warden" ? 330 : 280)) {
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
      }

      // Move away if player gets too close
      if (distance < (this.type === "warden" ? 240 : 190) && distance > 0) {
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
        const movementSpeed = this.type === "charger" && this.chargeTimer > 0
          ? this.speed * 2.8
          : this.speed;
        this.x += (dx / distance) * movementSpeed;
        this.y += (dy / distance) * movementSpeed;
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
    if (this.shootCooldown > 0) {
      return false;
    }

    const typeRate = {
      grunt: 1,
      runner: 0.78,
      tank: 1.5,
      shooter: 1.1,
      charger: 1.2,
      warden: 1.3,
      splitter: 1.15,
    }[this.type] || 1;
    this.shootCooldown = this.shootInterval * typeRate;

    return true;
  }

  getAttackShots(player) {
    const direction = this.getShootDirection(player);
    const angle = Math.atan2(direction.y, direction.x);
    const speed = this.type === "runner" ? 7.2 : this.type === "charger" ? 6.8 : 4.2;
    let angles = [angle];

    if (this.type === "tank") {
      angles = Array.from({ length: 8 }, (_, index) => index * Math.PI / 4);
    } else if (this.type === "warden") {
      angles = [-2, -1, 0, 1, 2].map((offset) => angle + offset * 0.2);
    } else if (this.type === "runner" || this.type === "splitter") {
      angles = [angle - 0.16, angle, angle + 0.16];
    }

    return angles.map((shotAngle) => ({
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
      velocityX: Math.cos(shotAngle) * speed,
      velocityY: Math.sin(shotAngle) * speed,
      radius: this.type === "tank" ? 7 : 5,
      damage: this.damage * 0.55,
      life: 190,
      color: this.tint,
    }));
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

  takeDamage(amount, attackType = "energy") {
    const adjustedDamage = attackType === this.weakness.toLowerCase()
      ? amount * 1.75
      : amount;
    this.health -= adjustedDamage;

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

      case "charger":
        color = "#ff8a3d";
        symbol = "➤";
        break;

      case "warden":
        color = "#45e0c0";
        symbol = "⬡";
        break;

      case "splitter":
        color = "#ff4fc8";
        symbol = "✣";
        break;

      case "grunt":
      default:
        color = "#ff0055";
        symbol = "◆";
        break;
    }

    color = this.tint;

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
    if (this.type === "shooter" || this.type === "warden") {
      ctx.beginPath();

      ctx.arc(
        centerX,
        centerY,
        this.width / 2,
        0,
        Math.PI * 2
      );

      ctx.stroke();

      if (this.type === "warden") {
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.width / 2 + 6, 0, Math.PI * 2);
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

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

    // Charger
    else if (this.type === "charger") {
      ctx.beginPath();
      ctx.moveTo(this.x + 3, centerY);
      ctx.lineTo(centerX, this.y + 3);
      ctx.lineTo(this.x + this.width - 3, centerY);
      ctx.lineTo(centerX, this.y + this.height - 3);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 138, 61, 0.18)";
      ctx.fill();
    }

    // Splitter
    else if (this.type === "splitter") {
      ctx.beginPath();
      ctx.moveTo(centerX, this.y);
      ctx.lineTo(this.x + this.width, centerY);
      ctx.lineTo(centerX, this.y + this.height);
      ctx.lineTo(this.x, centerY);
      ctx.closePath();
      ctx.stroke();
      ctx.moveTo(this.x + 12, this.y + 12);
      ctx.lineTo(this.x + this.width - 12, this.y + this.height - 12);
      ctx.moveTo(this.x + this.width - 12, this.y + 12);
      ctx.lineTo(this.x + 12, this.y + this.height - 12);
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

    ctx.font = "700 7px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`WEAK: ${this.weakness}`, centerX, this.y - 15);

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