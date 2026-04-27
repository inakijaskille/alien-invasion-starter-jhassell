import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
export default class Sky {
  constructor(scene) {
    scene.background = new THREE.Color(0x87ceeb);
    // slightly warmer fog, extended distances
    scene.fog = new THREE.Fog(0xe8caa4, 300, 2500);
  }
}
