import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
export default function createAlienModel() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({color:0xcc2b2b, metalness:0.1, roughness:0.8});
  const cube = new THREE.Mesh(new THREE.BoxGeometry(8,8,8), mat);
  cube.castShadow = true;
  g.add(cube);

  // face: simple black plane
  const faceMat = new THREE.MeshBasicMaterial({color:0x000000});
  const face = new THREE.Mesh(new THREE.PlaneGeometry(7.5,7.5), faceMat);
  face.position.z = 4.01; face.position.y = 0; g.add(face);

  // eyes and mouth as textures are complex; add simple geometry
  const eyeMat = new THREE.MeshBasicMaterial({color:0x000000});
  const eye1 = new THREE.Mesh(new THREE.BoxGeometry(1.2,1.8,0.2), eyeMat); eye1.position.set(-1.6,1.2,4.05);
  const eye2 = eye1.clone(); eye2.position.x = 1.6;
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(4.2,1.4,0.2), eyeMat); mouth.position.set(0,-1.8,4.05);
  g.add(eye1, eye2, mouth);

  return g;
}
