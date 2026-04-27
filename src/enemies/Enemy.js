import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import createAlienModel from './AlienModel.js';

export default class Enemy {
  constructor(scene, x, z) {
    this.scene = scene;
    this.mesh = createAlienModel();
    this.mesh.position.set(x, 18 + Math.random()*8, z);
    scene.add(this.mesh);
    this.alive = true;
    this.baseY = this.mesh.position.y;
  }

  update(dt, playerPos) {
    if (!this.alive) return;
    // bob
    const t = performance.now() * 0.001;
    this.mesh.position.y = this.baseY + Math.sin(t*2 + this.mesh.position.x*0.01)*3;
    // slowly rotate to face player
    const dir = playerPos.clone().sub(this.mesh.position);
    const targetY = Math.atan2(dir.x, dir.z);
    this.mesh.rotation.y += (targetY - this.mesh.rotation.y) * 0.02;
  }

  destroy() {
    if (!this.alive) return;
    this.alive = false;
    this.scene.remove(this.mesh);
  }
}
