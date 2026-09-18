class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;

    this.width = 32;
    this.height = 32;

    this.type = type;

    this.life = 600; // 10 seconds
    this.pulse = 0;
    this.rotation = 0;
  }

  update() {
    this.life--;
    this.pulse += 0.08;
    this.rotation += 0.03;
  }

  draw(ctx) {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    const pulseSize = Math.sin(this.pulse) * 3;

    let color = "#00ffff";
    let symbol = "?";

    switch (this.type) {
      case "health":
        color = "#ff3366";
        symbol = "♥";
        break;

      case "rapid":
        color = "#ffff00";
        symbol = "⚡";
        break;

      case "damage":
        color = "#ff6600";
        symbol = "✦";
        break;

      case "shield":
        color = "#00aaff";
        symbol = "◆";
        break;

      case "magnet":
        color = "#aa44ff";
        symbol = "M";
        break;

      default:
        color = "#00ffff";
        symbol = "?";
    }

    ctx.save();

    // Glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 25;

    // Outer circle
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      17 + pulseSize,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    // Inner box
    ctx.fillStyle = "rgba(5, 5, 5, 0.9)";
    ctx.fillRect(
      this.x + 3,
      this.y + 3,
      this.width - 6,
      this.height - 6
    );

    // Symbol
    ctx.fillStyle = color;
    ctx.font = "bold 19px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
      symbol,
      centerX,
      centerY + 1
    );

    ctx.restore();
  }

  isCollected(player) {
    return (
      this.x < player.x + player.width &&
      this.x + this.width > player.x &&
      this.y < player.y + player.height &&
      this.y + this.height > player.y
    );
  }

  isAlive() {
    return this.life > 0;
  }
}

export default PowerUp;