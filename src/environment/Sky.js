import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

export default class Sky {
  constructor(scene) {

    // bright desert blue sky
    scene.background = new THREE.Color(0x8fcfff);

    // softer blue atmospheric fog
    scene.fog = new THREE.Fog(0xbfdfff, 800, 5000);
  }
}