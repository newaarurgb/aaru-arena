import { FIGHTERS, readCareerProgress } from "../data/career";

class Player {
  constructor(x, y, design = "aqua", displayName = "PILOT", avatar = 1, fighterId = "vanguard") {
    this.x = x;
    this.y = y;

    this.width = 40;
    this.height = 40;

    const fighter = FIGHTERS[fighterId] || FIGHTERS.vanguard;
    const profile = JSON.parse(localStorage.getItem("aaruProfile") || "null") || {};
    const powerLevel = profile.email && !profile.guest
      ? Math.max(0, readCareerProgress().powerLevel || 0)
      : 0;
    this.fighterId = fighterId;
    this.powerLevel = powerLevel;
    this.speed = fighter.speed + powerLevel * 0.08;

    this.health = Math.max(100, fighter.health) + powerLevel * 5;
    this.maxHealth = this.health;

    this.damageCooldown = false;

    // Direction the player is facing
    this.direction = "down";
    this.design = design;
    this.displayName = displayName;
    this.avatar = avatar;

    // Attack settings
    this.attackRange = 75;
    this.attackDamage = fighter.damage * (1 + powerLevel * 0.045);
    this.weapon = fighter.weapon;
    this.weaponDetail = fighter.weaponDetail;
    this.weaponMode = fighter.weaponMode;
    this.fireRate = Math.max(120, fighter.fireRate * (1 - powerLevel * 0.015));
    this.projectileSpeed = fighter.projectileSpeed;
    this.projectileSize = fighter.projectileSize;
    this.projectileType = ["striker", "bulwark", "ranger"].includes(fighterId)
      ? "kinetic"
      : "energy";
  }

  move(keys, canvas) {
    let moving = false;

    if (keys["w"] || keys["W"] || keys["ArrowUp"]) {
      this.y -= this.speed;
      this.direction = "up";
      moving = true;
    }

    if (keys["s"] || keys["S"] || keys["ArrowDown"]) {
      this.y += this.speed;
      this.direction = "down";
      moving = true;
    }

    if (keys["a"] || keys["A"] || keys["ArrowLeft"]) {
      this.x -= this.speed;
      this.direction = "left";
      moving = true;
    }

    if (keys["d"] || keys["D"] || keys["ArrowRight"]) {
      this.x += this.speed;
      this.direction = "right";
      moving = true;
    }

    // Keep player inside arena
    this.x = Math.max(
      0,
      Math.min(
        this.x,
        canvas.width - this.width
      )
    );

    this.y = Math.max(
      0,
      Math.min(
        this.y,
        canvas.height - this.height
      )
    );

    return moving;
  }

  takeDamage(amount) {
    if (this.damageCooldown) {
      return;
    }

    this.health -= amount;

    if (this.health < 0) {
      this.health = 0;
    }

    this.damageCooldown = true;

    setTimeout(() => {
      this.damageCooldown = false;
    }, 500);
  }

  draw(ctx) {
    const designs = {
      aqua: { body: "#00f5ff", core: "#ffffff", accent: "#00f5ff" },
      solar: { body: "#ffb000", core: "#fff4bd", accent: "#ff5b22" },
      toxic: { body: "#8cff00", core: "#efffcf", accent: "#d000ff" },
      ruby: { body: "#ff3158", core: "#ffe1e8", accent: "#ff3158" },
      violet: { body: "#c56bff", core: "#f5ddff", accent: "#7b2cff" },
      frost: { body: "#baf5ff", core: "#ffffff", accent: "#5c9dff" },
    };
    const colors = designs[this.design] || designs.aqua;

    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "700 11px monospace";
    ctx.fillStyle = colors.accent;
    ctx.shadowColor = colors.accent;
    ctx.shadowBlur = 8;
    ctx.fillText(`${(this.displayName || "PILOT").slice(0, 12)}  ◉${this.avatar || 1}`, this.x + this.width / 2, this.y - 16);
    ctx.restore();

    // Player body
    ctx.fillStyle = colors.body;

    ctx.shadowColor = colors.body;
    ctx.shadowBlur = 20;

    ctx.fillRect(
      this.x,
      this.y,
      this.width,
      this.height
    );

    ctx.shadowBlur = 0;

    // Player core
    ctx.fillStyle = colors.core;

    ctx.fillRect(
      this.x + 12,
      this.y + 12,
      16,
      16
    );

    // Direction indicator
    ctx.fillStyle = colors.accent;

    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    ctx.beginPath();

    if (this.direction === "up") {
      ctx.moveTo(centerX, this.y - 8);
      ctx.lineTo(centerX - 6, this.y + 4);
      ctx.lineTo(centerX + 6, this.y + 4);
    }

    if (this.direction === "down") {
      ctx.moveTo(centerX, this.y + this.height + 8);
      ctx.lineTo(centerX - 6, this.y + this.height - 4);
      ctx.lineTo(centerX + 6, this.y + this.height - 4);
    }

    if (this.direction === "left") {
      ctx.moveTo(this.x - 8, centerY);
      ctx.lineTo(this.x + 4, centerY - 6);
      ctx.lineTo(this.x + 4, centerY + 6);
    }

    if (this.direction === "right") {
      ctx.moveTo(this.x + this.width + 8, centerY);
      ctx.lineTo(this.x + this.width - 4, centerY - 6);
      ctx.lineTo(this.x + this.width - 4, centerY + 6);
    }

    ctx.closePath();
    ctx.fill();
  }
}

export default Player;