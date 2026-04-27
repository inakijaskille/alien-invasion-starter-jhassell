import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
export default class Lighting {
  constructor(scene) {
    const ambient = new THREE.HemisphereLight(0xffffff, 0xd9b76f, 1.5);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(100,300,200);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048,2048);
    scene.add(sun);
  }
}
