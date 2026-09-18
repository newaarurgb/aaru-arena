class Projectile {
  constructor(x, y, targetX, targetY) {
    this.x = x;
    this.y = y;

    // Calculate shooting direction
    const dx = targetX - x;
    const dy = targetY - y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      this.velocityX = 0;
      this.velocityY = 0;
    } else {
      this.velocityX = (dx / distance) * 9;
      this.velocityY = (dy / distance) * 9;
    }

    // Projectile properties
    this.radius = 5;
    this.damage = 25;
    this.life = 120;

    // Visual trail
    this.trail = [];
  }

  update() {
    // Save previous position for trail
    this.trail.push({
      x: this.x,
      y: this.y,
    });

    // Keep trail short
    if (this.trail.length > 6) {
      this.trail.shift();
    }

    // Move projectile
    this.x += this.velocityX;
    this.y += this.velocityY;

    this.life--;
  }

  draw(ctx) {
    ctx.save();

    // -----------------------------------------
    // PROJECTILE TRAIL
    // -----------------------------------------

    for (let i = 0; i < this.trail.length; i++) {
      const point = this.trail[i];

      const alpha =
        (i / this.trail.length) * 0.4;

      ctx.globalAlpha = alpha;

      ctx.fillStyle = "#00ffff";

      ctx.beginPath();

      ctx.arc(
        point.x,
        point.y,
        this.radius * 0.6,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    // -----------------------------------------
    // MAIN PROJECTILE
    // -----------------------------------------

    ctx.globalAlpha = 1;

    ctx.fillStyle = "#ffffff";

    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 20;

    ctx.beginPath();

    ctx.arc(
      this.x,
      this.y,
      this.radius,
      0,
      Math.PI * 2
    );

    ctx.fill();

    // -----------------------------------------
    // INNER CORE
    // -----------------------------------------

    ctx.fillStyle = "#00ffff";

    ctx.beginPath();

    ctx.arc(
      this.x,
      this.y,
      3,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }

  isAlive(canvas) {
    return (
      this.life > 0 &&
      this.x > -20 &&
      this.x < canvas.width + 20 &&
      this.y > -20 &&
      this.y < canvas.height + 20
    );
  }
}

export default Projectile;