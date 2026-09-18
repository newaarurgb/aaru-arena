class Progression {
  constructor() {
    this.level = 1;
    this.xp = 0;
    this.xpToNextLevel = 100;
    this.score = 0;
  }

  addXP(amount) {
    this.xp += amount;
    this.score += amount;

    let leveledUp = false;

    while (this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;

      this.level++;

      // Increase XP requirement
      this.xpToNextLevel = Math.floor(
        this.xpToNextLevel * 1.25
      );

      leveledUp = true;
    }

    return leveledUp;
  }

  getXPPercentage() {
    return (
      (this.xp / this.xpToNextLevel) * 100
    );
  }
}

export default Progression;