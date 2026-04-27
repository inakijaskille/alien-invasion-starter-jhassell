import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import createShipModel from './ShipModel.js';
import ShipControls from './ShipControls.js';

export default class Ship {
  constructor(scene, opts={}) {
    this.scene = scene;
    this.mesh = createShipModel();
    this.mesh.castShadow = true;
    this.mesh.position.set(0, 6, 1200);
    scene.add(this.mesh);

    this.velocity = new THREE.Vector3(0,0,0);
    this.controls = new ShipControls(this);
    this.spawnTime = performance.now();
    this.invulnerableUntil = this.spawnTime + 2000;
  }

  reset() {
    this.mesh.position.set(0,6,1200);
    this.mesh.rotation.set(0,0,0);
    this.velocity.set(0,0,0);
    this.controls = new ShipControls(this);
    this.spawnTime = performance.now();
    this.invulnerableUntil = this.spawnTime + 2000;
  }

  update(dt, input) {
    this.controls.update(dt, input);
  }

  getPosition() { return this.mesh.position; }
  isInvulnerable() { return performance.now() < this.invulnerableUntil; }
}
