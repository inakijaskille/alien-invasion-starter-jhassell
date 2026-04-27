import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
export default class Laser {
  constructor(scene, position, direction) {
    this.scene = scene;
    const geo = new THREE.CylinderGeometry(0.15,0.15,6,6);
    const mat = new THREE.MeshBasicMaterial({color:0x00ffff});
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.rotation.x = Math.PI/2;
    this.mesh.position.copy(position);
    scene.add(this.mesh);
    this.dir = direction.clone().normalize();
    this.speed = 420;
    this.distance = 0;
    this.maxDistance = 1200;
    this.alive = true;
  }

  update(dt) {
    if (!this.alive) return;
    const move = this.dir.clone().multiplyScalar(this.speed * dt);
    this.mesh.position.add(move);
    this.distance += move.length();
    if (this.distance >= this.maxDistance) this.destroy();
  }

  destroy() {
    if (!this.alive) return;
    this.alive = false;
    this.scene.remove(this.mesh);
  }
}
