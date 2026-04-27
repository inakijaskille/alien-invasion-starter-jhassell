import Laser from './Laser.js';

export default class ProjectileManager {
  constructor(scene, enemyManager) {
    this.scene = scene;
    this.enemyManager = enemyManager;
    this.projectiles = [];
    this.lastShoot = 0;
  }

  spawnLaser(position, direction) {
    const l = new Laser(this.scene, position, direction);
    this.projectiles.push(l);
  }

  update(dt) {
    for (let p of this.projectiles) p.update(dt);
    // cleanup
    this.projectiles = this.projectiles.filter(p => p.alive);

    // collisions with enemies
    for (let p of this.projectiles) {
      for (let e of this.enemyManager.enemies) {
        if (!e.alive) continue;
        const dist = p.mesh.position.distanceTo(e.mesh.position);
        if (dist < 6) {
          e.destroy();
          p.destroy();
          break;
        }
      }
    }
  }

  reset() {
    for (let p of this.projectiles) p.destroy();
    this.projectiles = [];
  }
}
