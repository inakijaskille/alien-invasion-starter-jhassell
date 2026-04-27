import Enemy from './Enemy.js';

export default class EnemyManager {
  constructor(scene, ship) {
    this.scene = scene;
    this.ship = ship;
    this.enemies = [];
    this.spawnPositions = [ -200, 0, 200 ];
    this._create();
  }

  _create() {
    this.enemies = [];
    for (let i=0;i<3;i++) {
      const x = this.spawnPositions[i];
      const z = 100 + i*200;
      this.enemies.push(new Enemy(this.scene, x, z));
    }
  }

  update(dt) {
    for (let e of this.enemies) e.update(dt, this.ship.getPosition());
  }

  reset() {
    for (let e of this.enemies) if (e.alive) e.destroy();
    this._create();
  }

  countAlive() {
    return this.enemies.filter(e=>e.alive).length;
  }
}
