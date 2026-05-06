import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

export default function createShipModel() {
  const g = new THREE.Group();

  // Color palette
  const cream = 0xd8c0a0;
  const red = 0x8b1e1e;
  const metal = 0x555555;
  const blueGlow = 0x4aa3ff;

  // Main body: long, low box with slightly rounded edges using small bevel via scaled cylinder
  const bodyMat = new THREE.MeshStandardMaterial({ color: cream, metalness: 0.25, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(12, 2.4, 28), bodyMat);
  body.position.y = 1.4; // hover height relative to model origin
  g.add(body);

  // Rounded front nose: a short cone rotated
  const noseMat = new THREE.MeshStandardMaterial({ color: cream, metalness: 0.3, roughness: 0.45 });
  const nose = new THREE.Mesh(new THREE.ConeGeometry(3.6, 6, 16), noseMat);
  nose.rotation.x = Math.PI / 2; nose.rotation.z = 0; nose.position.set(0, 1.6, 14);
  g.add(nose);

  // Dark red side panels
  const sideMat = new THREE.MeshStandardMaterial({ color: red, metalness: 0.15, roughness: 0.5 });
  const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.8, 18), sideMat);
  leftPanel.position.set(-6.6, 1.6, 0); leftPanel.rotation.y = 0.02; g.add(leftPanel);
  const rightPanel = leftPanel.clone(); rightPanel.position.x = 6.6; g.add(rightPanel);

  // Side engine pods
  const engineMat = new THREE.MeshStandardMaterial({ color: metal, metalness: 0.8, roughness: 0.25 });
  const engL = new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.8,10,16), engineMat);
  engL.rotation.z = Math.PI / 2; engL.position.set(-9, 1.2, 4); g.add(engL);
  const engR = engL.clone(); engR.position.x = 9; g.add(engR);

  // Small cockpit dome (slightly transparent dark)
  const cockpitMat = new THREE.MeshPhysicalMaterial({ color: 0x222222, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.82, clearcoat: 0.1 });
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), cockpitMat);
  cockpit.position.set(0, 2.6, 2); cockpit.scale.set(1, 0.8, 1.2); g.add(cockpit);

  // Rear blue glowing thrusters (two small emissive cylinders)
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x001022, emissive: blueGlow, emissiveIntensity: 1.2, metalness: 0.1, roughness: 0.2 });
  const thrusterL = new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,3,12), glowMat);
  thrusterL.rotation.x = Math.PI / 2; thrusterL.position.set(-4, 1.2, -14); g.add(thrusterL);
  const thrusterR = thrusterL.clone(); thrusterR.position.x = 4; g.add(thrusterR);

  // Small metallic details
  const detailMat = new THREE.MeshStandardMaterial({ color: metal, metalness: 0.9, roughness: 0.15 });
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 6), detailMat); fin.position.set(0, 2.2, -6); fin.rotation.x = 0.06; g.add(fin);

  // Make the model sit front-forward along +Z
  g.name = 'player_ship_model';

  // Initial scale reduced — final in Ship.js will set to preferred size
  g.scale.set(0.9, 0.9, 0.9);

  return g;
}
