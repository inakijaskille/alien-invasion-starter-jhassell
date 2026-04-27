import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

export default function createShipModel() {
  const g = new THREE.Group();

  // main cone body
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 18, 12),
    new THREE.MeshStandardMaterial({color:0x9aa6b2, metalness:0.6, roughness:0.4})
  );
  body.rotation.x = Math.PI/2;
  body.position.y = 2;
  g.add(body);

  // nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(2.2,6,8), new THREE.MeshStandardMaterial({color:0x3a4f6b, metalness:0.6, roughness:0.3}));
  nose.rotation.x = Math.PI/2; nose.position.set(0,0,9);
  g.add(nose);

  // wings
  const wingMat = new THREE.MeshStandardMaterial({color:0x4a5560, metalness:0.5, roughness:0.35});
  const wingL = new THREE.Mesh(new THREE.ConeGeometry(1.2,10,3), wingMat);
  wingL.rotation.set(0,0,Math.PI/2); wingL.position.set(-6,0,0); wingL.scale.set(1,1,0.8);
  const wingR = wingL.clone(); wingR.position.x = 6;
  g.add(wingL, wingR);

  // cockpit glow
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1.6,12,8), new THREE.MeshStandardMaterial({emissive:0x2de0ff, emissiveIntensity:0.8, color:0x112233}));
  cockpit.position.set(0,1.8,2);
  g.add(cockpit);

  // thrusters glow
  const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.8,3,8), new THREE.MeshStandardMaterial({emissive:0x1ea3ff, emissiveIntensity:0.9, color:0x001022}));
  thruster.rotation.x = Math.PI/2; thruster.position.set(0,-1.2,-9);
  g.add(thruster);

  g.scale.set(1.6,1.6,1.6);
  return g;
}
