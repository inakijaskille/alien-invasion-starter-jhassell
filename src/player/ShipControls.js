import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
export default class ShipControls {
  constructor(ship, options={}) {
    this.ship = ship;
    this.speed = 0;
    this.startSpeed = 0;
    this.cruiseSpeed = 40;
    this.rampTime = 3.0;
    this.elapsed = 0;
  }

  update(dt, input) {
    this.elapsed += dt;
    // ramp speed
    const t = Math.min(1, this.elapsed / this.rampTime);
    this.speed = this.startSpeed + (this.cruiseSpeed - this.startSpeed) * t;

    const moveX = (input.isDown('KeyA') || input.isDown('ArrowLeft') ? -1 : 0) + (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0);
    const moveY = (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0) + (input.isDown('KeyS') || input.isDown('ArrowDown') ? -1 : 0);

    // smooth movement
    this.ship.velocity.x += (moveX * 20 - this.ship.velocity.x) * Math.min(1, dt * 6);
    this.ship.velocity.y += (moveY * 18 - this.ship.velocity.y) * Math.min(1, dt * 6);

    // auto-forward
    this.ship.velocity.z = this.speed;

    // apply
    this.ship.mesh.position.x += this.ship.velocity.x * dt;
    this.ship.mesh.position.y += this.ship.velocity.y * dt;
    this.ship.mesh.position.z += this.ship.velocity.z * dt;

    // banking and pitching
    this.ship.mesh.rotation.z = -this.ship.velocity.x * 0.02;
    this.ship.mesh.rotation.x = -this.ship.velocity.y * 0.01;
  }
}
