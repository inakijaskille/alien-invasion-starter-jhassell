import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import InputManager from './InputManager.js';
import StateManager from './StateManager.js';
import Terrain from '../environment/Terrain.js';
import Sky from '../environment/Sky.js';
import Lighting from '../environment/Lighting.js';
import Ship from '../player/Ship.js';
import EnemyManager from '../enemies/EnemyManager.js';
import ProjectileManager from '../combat/ProjectileManager.js';
import HUD from '../ui/HUD.js';
import Screens from '../ui/Screens.js';

export default class GameManager {
  constructor(container) {
    this.container = container || document.body;
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 5000);
    this.renderer = new THREE.WebGLRenderer({antialias:true});
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.input = new InputManager();
    this.state = new StateManager();

    // game state values
    this.GS = {
      MENU: 'MENU', PLAYING: 'PLAYING', DYING: 'DYING', RESPAWNING: 'RESPAWNING', PAUSED: 'PAUSED', GAME_OVER: 'GAME_OVER', VICTORY: 'VICTORY'
    };
    this.gameState = this.GS.MENU;
    this.lives = 3;
    this.health = 100;
    this.score = 0;
    this.collisionCooldown = 0; // seconds
    this.EXPLOSION_DURATION = 1.2; // seconds
    this.RESPAWN_PROTECTION = 2.5; // seconds
    this._explosions = [];

    this.terrain = new Terrain(this.scene);
    new Sky(this.scene);
    new Lighting(this.scene);

    this.ship = new Ship(this.scene, {terrain: this.terrain});
    this.enemies = new EnemyManager(this.scene, this.ship);
    this.projectiles = new ProjectileManager(this.scene, this.enemies);

    this.hud = new HUD();
    this.screens = new Screens(this);

    this.camera.position.set(0, 20, -60);
    this.camera.lookAt(0,6,0);

    this._bind();
    window.addEventListener('resize', () => this._onResize());

    // initial full reset
    this.resetGame();

    this._loop();
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP') this.togglePause();
      if (e.code === 'KeyR') {
        if (this.gameState === this.GS.GAME_OVER || this.gameState === this.GS.VICTORY) this.resetGame();
        else this.respawnShipOnly();
      }
    });
  }

  _onResize() {
    this.camera.aspect = window.innerWidth/window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  togglePause() {
    if (this.gameState === this.GS.PAUSED) { this.gameState = this.GS.PLAYING; this.screens.show('none'); }
    else { this.gameState = this.GS.PAUSED; this.screens.show('pause'); }
  }

  // Full game reset: used on new run or after Game Over
  resetGame() {
    this.clock.start();
    this.startTime = performance.now();
    this.lives = 3; this.health = 100; this.score = 0;
    this.collisionCooldown = 0;
    this.enemies.reset();
    this.projectiles.reset();
    this.ship.reset();
    this.hud.resetValues({score:this.score, health:this.health, lives:this.lives});
    this.gameState = this.GS.MENU;
    this.screens.show('start');
  }

  // Reset only ship for respawn preserving progress
  resetRun() {
    this.clock.start();
    this.startTime = performance.now();
    this.projectiles.reset();
    this.ship.reset();
    this.hud.resetValues({score:this.score, health:this.health, lives:this.lives});
    this.gameState = this.GS.PLAYING;
    this.screens.show('none');
  }

  _update(dt) {
    // update timers
    if (this.collisionCooldown > 0) this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);

    // update explosions (simple scaling/fade)
    for (let i = this._explosions.length - 1; i >= 0; i--) {
      const ex = this._explosions[i];
      const t = (performance.now() - ex.start) / (this.EXPLOSION_DURATION * 1000);
      if (t >= 1) { this.scene.remove(ex.mesh); this._explosions.splice(i,1); }
      else { ex.mesh.scale.setScalar(1 + t * 6); ex.mesh.material.opacity = 1 - t; }
    }

    // Update enemies visually always (they won't damage unless PLAYING and no cooldown)
    this.enemies.update(dt);

    // Update projectiles only when playing
    if (this.gameState === this.GS.PLAYING) {
      this.projectiles.update(dt);
      this.ship.update(dt, this.input);
    }

    // Shooting only allowed while playing and not protected
    this._shootCooldown = this._shootCooldown || 0;
    this._shootCooldown = Math.max(0, this._shootCooldown - dt);
    if (this.gameState === this.GS.PLAYING && this.collisionCooldown <= 0) {
      if (this.input.isDown('Space')) {
        if (this._shootCooldown <= 0) {
          const dir = new THREE.Vector3(0,0,1).applyQuaternion(this.ship.mesh.quaternion);
          const pos = this.ship.mesh.position.clone().add(dir.clone().multiplyScalar(12));
          this.projectiles.spawnLaser(pos, dir);
          this._shootCooldown = 0.15;
        }
      }
    }

    // camera follow (if playing or respawning). During DYING keep camera focused on explosion
    const shipPos = this.ship.getPosition();
    if (this.gameState === this.GS.DYING && this._explosions.length) {
      const ex = this._explosions[0];
      // freeze camera near explosion
      const target = ex.mesh.position;
      const desiredCam = new THREE.Vector3(target.x, target.y + 8, target.z - 30);
      this.camera.position.lerp(desiredCam, 0.02);
      this.camera.lookAt(target);
    } else {
      const desiredCam = new THREE.Vector3(shipPos.x, shipPos.y + 12, shipPos.z - 30);
      this.camera.position.lerp(desiredCam, 0.06);
      this.camera.lookAt(shipPos.x, shipPos.y+4, shipPos.z+60);
    }

    this.hud.updateFromGame(this);

    // collision checks only when playing and no collision cooldown
    if (this.gameState === this.GS.PLAYING && this.collisionCooldown <= 0 && this.ship.mesh.visible) {
      const terrainY = this.terrain.getHeightAt(shipPos.x, shipPos.z);
      const collisionBuffer = 3;
      if (shipPos.y <= terrainY + collisionBuffer) {
        this.handleShipCrash();
      }
    }

    // victory check
    if (this.enemies.countAlive() === 0 && this.gameState === this.GS.PLAYING) {
      this.gameState = this.GS.VICTORY;
      this.screens.show('victory');
    }
  }

  // explosion helper
  playExplosion(pos) {
    const geo = new THREE.SphereGeometry(1, 12, 8);
    const mat = new THREE.MeshBasicMaterial({color:0xff9933, transparent:true, opacity:1});
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this._explosions.push({mesh, start: performance.now()});
  }

  handleShipCrash() {
    if (this.gameState !== this.GS.PLAYING) return;
    if (!this.ship.mesh.visible) return;
    if (this.collisionCooldown > 0) return;

    this.gameState = this.GS.DYING;
    // disable controls by not updating ship while not PLAYING

    // apply lives and health
    this.lives = Math.max(0, this.lives - 1);
    this.health = 0;
    this.hud.resetValues({score:this.score, health:this.health, lives:this.lives});
    this.hud.showLifeLost();

    const crashPosition = this.ship.mesh.position.clone();
    // hide ship and clear lasers
    this.ship.mesh.visible = false;
    this.projectiles.reset();

    // play explosion
    this.playExplosion(crashPosition);

    // after explosion duration, either respawn or game over
    setTimeout(()=>{
      if (this.lives <= 0) {
        this.gameState = this.GS.GAME_OVER;
        this.screens.show('gameover');
      } else {
        this.respawnShipOnly();
      }
    }, this.EXPLOSION_DURATION * 1000);
  }

  respawnShipOnly() {
    this.gameState = this.GS.RESPAWNING;
    // safe spawn calculation
    const platform = this.terrain.mesh.getObjectByName ? this.terrain.mesh.getObjectByName('platform') : null;
    // we added platform as scene child; get by traversing scene
    let plat = null;
    this.scene.traverse((o)=>{ if (o.name === 'platform') plat = o; });
    const startX = 0; const startZ = 1200;
    const safeY = Math.max((plat ? plat.position.y : 2) + 8, this.terrain.getHeightAt(startX, startZ) + 8);

    this.ship.mesh.position.set(startX, safeY, startZ);
    this.ship.mesh.rotation.set(0,0,0);
    this.ship.velocity.set(0,0,0);

    // protective cooldown
    this.collisionCooldown = this.RESPAWN_PROTECTION;
    this.health = 100;
    this.hud.resetValues({score:this.score, health:this.health, lives:this.lives});

    // make sure ship visible and camera reset behind it
    this.ship.mesh.visible = true;
    const camPos = new THREE.Vector3(this.ship.mesh.position.x, this.ship.mesh.position.y + 12, this.ship.mesh.position.z - 30);
    this.camera.position.copy(camPos);
    this.camera.lookAt(this.ship.mesh.position.x, this.ship.mesh.position.y + 4, this.ship.mesh.position.z + 60);

    // small delay before allowing control
    setTimeout(()=>{
      this.gameState = this.GS.PLAYING;
    }, 1500);
  }

  _loop() {
    const dt = this.clock.getDelta();
    this._update(dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this._loop());
  }
}
