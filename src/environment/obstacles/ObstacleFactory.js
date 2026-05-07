/* ObstacleFactory - helpers to create cinematic Greek-inspired ruins (columns, arches, walls, gates, bridges)
   Focus: lightweight, reusable geometry + shared materials, visible wear, sand accumulation, separate solid parts for collision
*/
(function(){
  'use strict';

  // Palette and shared material settings (matches spec)
  const MATERIAL_COLORS = [0xd8c7a3, 0xc8aa7d, 0xb88c5a, 0xe2cfac];
  const SHARED_MATERIALS = [];

  function getSharedMaterial(){
    if(SHARED_MATERIALS.length === 0){
      for(const c of MATERIAL_COLORS){
        const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0.03 });
        m.flatShading = false; m.side = THREE.FrontSide;
        SHARED_MATERIALS.push(m);
      }
    }
    // pick by random but deterministic-ish
    return SHARED_MATERIALS[Math.floor(Math.random()*SHARED_MATERIALS.length)];
  }

  // Small deterministic-ish noise for geometry perturbation (cheap)
  function _noise(x,y){ return (Math.sin(x*12.9898 + y*78.233) * 43758.5453) % 1; }
  function _fbm(x,y){ let v=0,a=0.5,f=1; for(let i=0;i<4;i++){ v += a * Math.abs(_noise(x*f,y*f)); f*=2; a*=0.5; } return v; }

  // Helper: apply gentle vertex displacement to a cylinder/box for weathering
  function applyWeathering(geom, scale=0.6){
    const pos = geom.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const n = _fbm(x*0.02, z*0.02);
      const off = (n - 0.5) * scale * (1 - Math.min(1, Math.abs(y)/200));
      pos.setZ(i, z + off*0.6);
      pos.setX(i, x + off*0.35);
      pos.setY(i, y + (n-0.5)*0.2);
    }
    geom.computeVertexNormals();
  }

  // Sand skirt: a thin low-poly cone/torus to blend base into dunes
  function makeSandSkirt(radius, height){
    const geo = new THREE.CylinderGeometry(radius*0.9, radius*1.2, Math.max(2, height), 10, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0xE2CFAC, roughness:0.98, metalness:0.01 });
    const m = new THREE.Mesh(geo, mat); m.position.y = height/2; m.receiveShadow = true; return m;
  }

  // Create a monumental Greek column (80 - 180 units). Includes base, shaft, capital, optional broken/tilted variants.
  function createPillar(opts={}){
    const height = THREE.MathUtils.clamp(opts.height || (80 + Math.random()*100), 80, 180);
    const radius = opts.radius || (6 + Math.random()*10);
    const mat = getSharedMaterial().clone();
    const g = new THREE.Group();
    // shaft - slightly tapered
    const shaftGeo = new THREE.CylinderGeometry(radius*0.95, radius*1.02, height, 36, 4, false);
    applyWeathering(shaftGeo, 0.9);
    const shaft = new THREE.Mesh(shaftGeo, mat); shaft.position.y = height/2; shaft.castShadow = true; shaft.receiveShadow = true; g.add(shaft);
    // base and plinth
    const baseGeo = new THREE.CylinderGeometry(radius*1.5, radius*1.8, 6, 20);
    const base = new THREE.Mesh(baseGeo, mat); base.position.y = 3; base.castShadow=true; base.receiveShadow=true; g.add(base);
    // capital / decorative top
    const capGeo = new THREE.CylinderGeometry(radius*1.25, radius*1.1, 5 + Math.random()*6, 20);
    const cap = new THREE.Mesh(capGeo, mat); cap.position.y = height - 2; cap.castShadow=true; g.add(cap);
    // optional break: fractured top or broken mid
    if(Math.random() < 0.28){ // broken variant
      // split top: remove upper half geometry visually by placing a ragged cap
      cap.rotation.z = (Math.random()-0.5)*0.12;
      if(Math.random() < 0.45){ // create broken fragment
        const fragGeo = new THREE.CylinderGeometry(radius*0.9, radius*0.6, height*0.46, 16);
        applyWeathering(fragGeo, 1.6);
        const frag = new THREE.Mesh(fragGeo, mat); frag.position.y = height*0.2; frag.rotation.z = (Math.random()-0.5)*0.6; frag.castShadow=true; g.add(frag);
        g.remove(shaft);
      }
    }
    // sand accumulation near base
    const skirt = makeSandSkirt(radius*1.6, 2 + Math.random()*4); skirt.position.y = 0.5; g.add(skirt);
    // occasional tilt
    if(Math.random() < 0.22){ g.rotation.z = (Math.random()-0.5) * 0.18; }
    const obs = new Obstacle(g, [shaft, base, cap]); obs.update(); return obs;
  }

  // Create a massive temple archway: left column, right column, top lintel. Opening remains pass-through.
  function createArch(opts={}){
    const width = opts.width || (120 + Math.random()*160);
    const height = opts.height || (80 + Math.random()*120);
    const thickness = opts.thickness || (12 + Math.random()*10);
    const mat = getSharedMaterial().clone();
    const g = new THREE.Group();
    // columns (fluted look via subtle noise)
    const colRadius = Math.max(8, thickness*0.8);
    const colGeo = new THREE.CylinderGeometry(colRadius*0.5, colRadius*0.6, height, 36, 2);
    applyWeathering(colGeo, 0.9);
    const left = new THREE.Mesh(colGeo, mat); left.position.set(-width/2 + colRadius, height/2, 0); left.castShadow=true; g.add(left);
    const right = left.clone(); right.position.set(width/2 - colRadius, height/2, 0); g.add(right);
    // lintel / beam
    const beamGeo = new THREE.BoxGeometry(width - (colRadius*2), Math.max(12, colRadius*0.6), thickness*1.2);
    applyWeathering(beamGeo, 0.6);
    const beam = new THREE.Mesh(beamGeo, mat); beam.position.set(0, height - (Math.max(12,colRadius*0.6)/2), 0); beam.castShadow=true; g.add(beam);
    // decorative fragments / pediment
    const pedGeo = new THREE.BoxGeometry((width - (colRadius*2))*0.5, 8, thickness*1.4);
    const ped = new THREE.Mesh(pedGeo, mat); ped.position.set(0, height + 6, 0); ped.rotation.y = (Math.random()-0.5)*0.06; ped.castShadow=true; g.add(ped);
    // half-buried lower fragments
    for(let i=0;i<2;i++){ const fragGeo = new THREE.BoxGeometry(10 + Math.random()*22, 4, 6 + Math.random()*12); const frag = new THREE.Mesh(fragGeo, mat); frag.position.set((Math.random()-0.5)*(width*0.28), Math.random()*6, (Math.random()-0.5)*8); frag.rotation.y = Math.random()*Math.PI; g.add(frag); }
    // sand skirt and subtle pile under columns
    const skirtL = makeSandSkirt(colRadius*1.6, 3 + Math.random()*6); skirtL.position.set(left.position.x, 0.8, left.position.z); g.add(skirtL);
    const skirtR = skirtL.clone(); skirtR.position.x = right.position.x; g.add(skirtR);
    // ensure pass-through: left, right and beam are solidParts
    const obs = new Obstacle(g, [left, right, beam]); obs.update(); return obs;
  }

  // Broken temple wall (large partially collapsed wall)
  function createWall(opts={}){
    const width = opts.width || (160 + Math.random()*220);
    const height = opts.height || (40 + Math.random()*90);
    const thickness = opts.thickness || (10 + Math.random()*10);
    const mat = getSharedMaterial().clone();
    // main wall as slightly uneven box with chunks removed
    const g = new THREE.Group();
    const wallGeo = new THREE.BoxGeometry(width, height, thickness);
    applyWeathering(wallGeo, 0.9);
    const wall = new THREE.Mesh(wallGeo, mat); wall.position.set(0, height/2, 0); wall.castShadow=true; g.add(wall);
    // missing chunks: carve visual fragments (simple boxes removed)
    const chunks = Math.max(1, Math.floor(Math.random()*4));
    for(let i=0;i<chunks;i++){ const cW = 12 + Math.random()*48; const cH = 8 + Math.random()*40; const cGeo = new THREE.BoxGeometry(cW, cH, thickness+2); const cM = new THREE.Mesh(cGeo, mat); cM.position.set((Math.random()-0.5)*(width*0.7), Math.random()*(height*0.6), (Math.random()-0.5)*2); cM.rotation.y = (Math.random()-0.5)*0.6; g.add(cM); }
    // sand pile along base
    const skirt = makeSandSkirt(width*0.5, 3 + Math.random()*6); skirt.position.y = 0.7; g.add(skirt);
    // leaning variant
    if(Math.random() < 0.28) g.rotation.z = (Math.random()-0.5) * 0.14;
    const obs = new Obstacle(g, [wall]); obs.update(); return obs;
  }

  // Ruined ceremonial gate (monumental scale)
  function createGate(opts={}){
    const width = opts.width || (180 + Math.random()*260);
    const height = opts.height || (120 + Math.random()*180);
    const thickness = opts.thickness || (16 + Math.random()*18);
    const mat = getSharedMaterial().clone(); const g = new THREE.Group();
    // twin pillars
    const pr = Math.max(10, thickness*0.9);
    const left = new THREE.Mesh(new THREE.CylinderGeometry(pr*0.6, pr*0.75, height, 32), mat); left.position.set(-width/2 + pr, height/2, 0); left.castShadow=true; g.add(left);
    const right = left.clone(); right.position.set(width/2 - pr, height/2, 0); g.add(right);
    // ornate lintel
    const lint = new THREE.Mesh(new THREE.BoxGeometry(width - pr*2, Math.max(14, pr*0.7), thickness*1.6), mat); lint.position.set(0, height - 6, 0); lint.castShadow=true; g.add(lint);
    // decorative slabs
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width*0.45, 10, thickness*1.2), mat); slab.position.set(0, height + 8, 0); slab.castShadow=true; g.add(slab);
    // sand skirts at bases
    g.add(makeSandSkirt(pr*1.6, 3)); const sk2 = makeSandSkirt(pr*1.6, 3); sk2.position.x = right.position.x; g.add(sk2);
    const obs = new Obstacle(g, [left, right, lint]); obs.update(); return obs;
  }

  // Elevated broken bridge (supports + deck with gaps)
  function createBrokenBridge(opts={}){
    const span = opts.span || (120 + Math.random()*160);
    const height = opts.height || (24 + Math.random()*36);
    const depth = opts.depth || (14 + Math.random()*8);
    const mat = getSharedMaterial().clone(); const g = new THREE.Group();
    const supportGeo = new THREE.BoxGeometry(14, height, depth);
    const left = new THREE.Mesh(supportGeo, mat); left.position.set(-span/2 + 8, height/2, 0); left.castShadow=true; g.add(left);
    const right = left.clone(); right.position.set(span/2 - 8, height/2, 0); g.add(right);
    // broken deck pieces (some missing to create gaps)
    const segments = 3;
    for(let i=0;i<segments;i++){
      if(Math.random() < 0.35) continue; // missing fragment
      const segW = (span / segments) * (0.9 - Math.random()*0.25);
      const deckGeo = new THREE.BoxGeometry(segW, 6 + Math.random()*4, depth+6);
      const deck = new THREE.Mesh(deckGeo, mat); deck.position.set((i - (segments-1)/2) * (span/segments), height + 3, (Math.random()-0.5)*3); deck.castShadow=true; g.add(deck);
    }
    const obs = new Obstacle(g, [left, right]); obs.update(); return obs;
  }

  window.ObstacleFactory = { createPillar, createArch, createWall, createGate, createBrokenBridge };

})();
