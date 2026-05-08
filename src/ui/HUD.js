export default class HUD {
  constructor() {
    this.el = document.getElementById('hud');

    if (!this.el) {
      this.el = document.createElement('div');
      this.el.id = 'hud';

      this.el.style.position = 'fixed';
      this.el.style.top = '12px';
      this.el.style.left = '12px';
      this.el.style.right = '12px';

      this.el.style.display = 'flex';
      this.el.style.justifyContent = 'space-between';
      this.el.style.alignItems = 'center';
      this.el.style.gap = '18px';

      this.el.style.padding = '12px 18px';
      this.el.style.borderRadius = '12px';

      this.el.style.background = 'rgba(0,0,0,0.45)';
      this.el.style.color = '#ffffff';

      this.el.style.fontFamily = 'Arial, sans-serif';
      this.el.style.fontSize = '18px';
      this.el.style.fontWeight = '500';

      this.el.style.pointerEvents = 'none';
      this.el.style.zIndex = '999';

      document.body.appendChild(this.el);
    }

    this.score = 0;
    this.health = 100;
    this.lives = 3;
    this.weapon = 'Laser';
  }

  resetValues({
    score = 0,
    health = 100,
    lives = 3,
    weapon = 'Laser'
  } = {}) {
    this.score = score;
    this.health = health;
    this.lives = lives;
    this.weapon = weapon;

    if (this._flashTimeout) {
      clearTimeout(this._flashTimeout);
    }
  }

  updateFromGame(game) {
    const enemies = game.enemies
      ? game.enemies.countAlive()
      : 0;

    this.el.style.display = 'flex';

    this.el.innerHTML = `
      <span>Health: ${game.health}</span>
      <span>Score: ${game.score}</span>
      <span>Lives: ${game.lives}</span>
      <span>Enemies: ${enemies}</span>
      <span>Weapon: ${this.weapon}</span>
      <span>Time: Day</span>
    `;
  }

  showLifeLost() {
    const prev = this.el.style.background;

    this.el.style.transition = 'background 0.25s';
    this.el.style.background = 'rgba(255,0,0,0.35)';

    this._flashTimeout = setTimeout(() => {
      this.el.style.background = prev;
    }, 250);
  }
}