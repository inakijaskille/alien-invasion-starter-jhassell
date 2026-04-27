export default class HUD {
  constructor() {
    this.el = document.getElementById('hud');
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.id = 'hud';
      this.el.style.position = 'absolute';
      this.el.style.left = '12px';
      this.el.style.top = '12px';
      this.el.style.color = '#fff';
      this.el.style.fontFamily = 'sans-serif';
      this.el.style.zIndex = '10';
      document.body.appendChild(this.el);
    }
    this.score = 0; this.health = 100; this.lives = 3; this.weapon = 'Laser';
  }

  resetValues({score=0, health=100, lives=3, weapon='Laser'} = {}) {
    this.score = score; this.health = health; this.lives = lives; this.weapon = weapon;
    this._flashTimeout && clearTimeout(this._flashTimeout);
  }

  updateFromGame(game) {
    const enemies = game.enemies ? game.enemies.countAlive() : 0;
    this.el.innerHTML = `Health: ${game.health} &nbsp; Score: ${game.score} &nbsp; Lives: ${game.lives} &nbsp; Enemies: ${enemies} &nbsp; Weapon: ${this.weapon} &nbsp; Time: Day`;
  }

  showLifeLost() {
    const prev = this.el.style.backgroundColor;
    this.el.style.transition = 'background 0.25s';
    this.el.style.background = 'rgba(255,0,0,0.25)';
    this._flashTimeout = setTimeout(()=>{ this.el.style.background = prev; }, 250);
  }
}
