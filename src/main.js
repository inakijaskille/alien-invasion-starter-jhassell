// Neon Desert — main.js (Refactored, robust game manager)
// Requires global THREE (three.min.js loaded in index.html)

(function(){
  'use strict';

  // --- Constants ---
  const GameState = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER',
    VICTORY: 'VICTORY'
  };

  // --- Renderer / Canvas ---
  const canvas = document.getElementById('gameCanvas');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Global error handlers to surface startup/runtime errors in the overlay
  function _reportErrorMessage(msg){
    try{
      console.error(msg);
      const ov = document.getElementById('overlay');
      if(ov){ ov.classList.remove('hidden'); ov.innerHTML = '<h2 style="color:#ff8b3d">Runtime Error</h2><pre style="max-width:720px;white-space:pre-wrap;word-break:break-word;color:#fff;">'+String(msg)+'</pre><button id="_errReload">Reload</button>'; const btn = document.getElementById('_errReload'); if(btn) btn.onclick = ()=> location.reload(); }
      else alert('Runtime Error: '+String(msg));
    }catch(e){ console.error('Failed to report error overlay', e); }
  }
  window.addEventListener('error', function(ev){ _reportErrorMessage(ev.message + '\n' + (ev.filename||'') + ':' + (ev.lineno||'') ); });
  window.addEventListener('unhandledrejection', function(ev){ _reportErrorMessage('Unhandled Promise Rejection: '+ (ev.reason && ev.reason.message? ev.reason.message : String(ev.reason)) ); });

  // --- InputManager (singleton, does not duplicate listeners) ---
  const InputManager = (function(){
    let keys = {};
    let pointerDown = false;
    let listenersAttached = false;

    function attach(){
      if(listenersAttached) return;
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('mousedown', onDown);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('blur', onBlur);
      listenersAttached = true;
    }
    function detach(){
      if(!listenersAttached) return;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('blur', onBlur);
      listenersAttached = false;
      keys = {};
      pointerDown = false;
    }
    function onKeyDown(e){ keys[e.code] = true; }
    function onKeyUp(e){ keys[e.code] = false; }
    function onDown(){ pointerDown = true; }
    function onUp(){ pointerDown = false; }
    function onBlur(){ keys = {}; pointerDown = false; }

    return { attach, detach, get keys(){ return keys; }, get pointerDown(){ return pointerDown; }, reset(){ keys={}; pointerDown=false; } };
  })();

  // --- Utility: deterministic noise (cheap) ---
  function noise2(x,y){
    const s = Math.sin(x*127.1 + y*311.7) * 43758.5453123;
    return s - Math.floor(s);
  }
  function fbm(x,y){
    let v=0, a=0.5, f=1;
    for(let i=0;i<6;i++){ v += a*noise2(x*f,y*f); f*=2; a*=0.5; }
    return v;
  }

  // --- TerrainGenerator ---
  class TerrainGenerator{
    constructor(scene, opts={}){
      this.scene = scene;
      this.width = opts.width || 3000;
      this.length = opts.length || 7000;
      this.segX = opts.segX || 300;
      this.segZ = opts.segZ || 600;
      this.mesh = null;
      this._build();
    }
    carveRunway(centerZ, length=220, halfWidth=60, flatHeight=null){
      if(!this.mesh) return;
      const geom = this.mesh.geometry;
      const pos = geom.attributes.position;
      const zMin = centerZ;
      const zMax = centerZ + length;
      for(let i=0;i<pos.count;i++){
        const vx = pos.getX(i);
        const vz = pos.getZ(i);
        if(vz >= zMin && vz <= zMax){
          const cx = this.centerlineX(vz);
          if(Math.abs(vx - cx) <= halfWidth){
            const h = (flatHeight !== null) ? flatHeight : this.sampleHeight(vx, vz);
            pos.setY(i, h);
          }
        }
      }
      geom.computeVertexNormals();
      geom.attributes.position.needsUpdate = true;
    }
    _build(){
      // Large flat plane for infinite-feel desert
      const geom = new THREE.PlaneGeometry(this.width, this.length, Math.max(1,this.segX), Math.max(1,this.segZ));
      geom.rotateX(-Math.PI/2);
      const sandMat = new THREE.MeshStandardMaterial({color:0xE8D2A6, roughness:0.84, metalness:0.02});
      const pos = geom.attributes.position;

      // centerline remains centered at 0 for an open plain
      this.centerlineX = (z)=> 0;

      // create smooth low-frequency dunes for a gentle rolling desert
      const wind = new THREE.Vector2(0.9, -0.3).normalize();
      let minH = Infinity, maxH = -Infinity;
      for(let i=0;i<pos.count;i++){
        const vx = pos.getX(i);
        const vz = pos.getZ(i);
        // layered noise: long, medium, fine (low amplitude for smooth dunes)
        const long = (fbm(vx*0.0009, vz*0.0009) - 0.5) * 36.0;    // primary broad dunes
        const medium = (fbm(vx*0.0030, vz*0.0030) - 0.5) * 12.0;  // secondary ridges
        const fine = (fbm(vx*0.02, vz*0.02) - 0.5) * 3.0;         // subtle surface undulation
        // gentle wind-aligned ridgeline modulation
        const ridge = Math.sin((vx*wind.x + vz*wind.y) * 0.0028) * 6.0;
        const h = long + medium + fine + ridge;
        pos.setY(i, h);
        if(h < minH) minH = h; if(h > maxH) maxH = h;
      }
      geom.computeVertexNormals();
      // vertex colors for subtle sand variation
      const cols = new Float32Array(pos.count*3);
      const normalAttr = geom.attributes.normal;
      const crest = new THREE.Color(0xF6E3BF);
      const mid = new THREE.Color(0xE8D2A6);
      const shade = new THREE.Color(0xC9A67A);
      for(let i=0;i<pos.count;i++){
        const h = pos.getY(i);
        const nY = normalAttr.getY(i);
        const hn = (h - minH) / Math.max(1e-5, (maxH - minH));
        const slope = THREE.MathUtils.clamp(1 - nY, 0, 1);
        const col = crest.clone().lerp(mid, hn).lerp(shade, slope*0.5);
        cols[i*3+0] = col.r; cols[i*3+1] = col.g; cols[i*3+2] = col.b;
      }
      geom.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      sandMat.vertexColors = true;
      this.mesh = new THREE.Mesh(geom, sandMat);
      this.mesh.receiveShadow = true;
      this.scene.add(this.mesh);
    }
    sampleHeight(x,z){
      // reproduce the smooth dune height formula from _build
      const wind = new THREE.Vector2(0.9, -0.3).normalize();
      const long = (fbm(x*0.0009, z*0.0009) - 0.5) * 36.0;
      const medium = (fbm(x*0.0030, z*0.0030) - 0.5) * 12.0;
      const fine = (fbm(x*0.02, z*0.02) - 0.5) * 3.0;
      const ridge = Math.sin((x*wind.x + z*wind.y) * 0.0028) * 6.0;
      return long + medium + fine + ridge;
    }
    dispose(){
      if(!this.mesh) return;
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      if(this.mesh.material.map) this.mesh.material.map.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
  }

  // --- ProjectileManager ---
  class ProjectileManager{
    constructor(scene){ this.scene = scene; this.list = []; }
    spawn(pos, dir, speed=320, owner='player'){
      const geo = new THREE.SphereGeometry(0.18,6,6);
      const mat = new THREE.MeshBasicMaterial({color: owner==='player'?0x00ffea:0xff5533});
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      this.list.push({mesh, dir:dir.clone(), speed, life:5, owner});
    }
    update(dt){
      for(let i=this.list.length-1;i>=0;i--){
        const p = this.list[i];
        p.mesh.position.addScaledVector(p.dir, p.speed*dt);
        p.life -= dt; if(p.life<=0){ this.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); this.list.splice(i,1); }
      }
    }
    clear(){
      for(const p of this.list){ this.scene.remove(p.mesh); try{ p.mesh.geometry.dispose(); p.mesh.material.dispose(); }catch(e){}
      }
      this.list.length = 0;
    }
  }


  // --- EnemyManager ---
  class EnemyManager{
    constructor(scene, terrain, playerRef){
      this.scene = scene; this.terrain = terrain; this.playerRef = playerRef; this.enemies = [];
      // shared geometry/material to keep things lightweight
      this._bodyGeo = new THREE.SphereGeometry(1, 24, 20);
      this._eyeGeo = new THREE.SphereGeometry(0.28, 16, 12);
      this._pupilGeo = new THREE.SphereGeometry(0.12, 12, 8);
      this._bodyMat = new THREE.MeshStandardMaterial({ color: 0xd94b2b, roughness: 0.45, metalness: 0.05, emissive: 0x441100, emissiveIntensity: 0.12 });
      this._eyeMat = new THREE.MeshStandardMaterial({ color: 0xffd84d, emissive: 0xffd84d, emissiveIntensity: 0.15, roughness: 0.25 });
      this._pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.6 });
    }

    spawnThree(){
      this.clear();
      const zPositions = [ -1200, 0, 1500 ];
      for(let i=0;i<3;i++){
        const z = zPositions[i];
        const cx = this.terrain.centerlineX(z);
        const offsetX = (i%2===0)? -40 : 60;
        const x = cx + offsetX + (Math.random()-0.5)*40;
        const scale = 6 + Math.floor(Math.random()*3); // much larger for readability
        const baseHeight = this.terrain.sampleHeight(x,z) + 16 + Math.random()*6;

        const g = new THREE.Group();
        // body - stretched teardrop (scale Y slightly taller)
        const body = new THREE.Mesh(this._bodyGeo, this._bodyMat.clone()); body.castShadow = true; body.receiveShadow = true;
        body.scale.set(1.0, 1.25, 1.0);
        body.geometry.computeVertexNormals(); g.add(body);

        // eye assembly
        const eyeHolder = new THREE.Group();
        const eye = new THREE.Mesh(this._eyeGeo, this._eyeMat.clone()); eye.position.set(0, 0.18, 0.9); eye.castShadow = false; eye.receiveShadow = false; eyeHolder.add(eye);
        const pupil = new THREE.Mesh(this._pupilGeo, this._pupilMat); pupil.position.set(0, 0.06, 1.06); pupil.castShadow = false; eyeHolder.add(pupil);
        // small sprite-like glow for eye
        const c = document.createElement('canvas'); c.width = 64; c.height = 64; const ctx = c.getContext('2d'); const grad = ctx.createRadialGradient(32,32,0,32,32,32); grad.addColorStop(0,'rgba(255,220,120,0.9)'); grad.addColorStop(0.4,'rgba(255,150,20,0.35)'); grad.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle = grad; ctx.fillRect(0,0,64,64); const tex = new THREE.CanvasTexture(c);
        const spriteMat = new THREE.SpriteMaterial({ map: tex, color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite:false });
        const eyeGlow = new THREE.Sprite(spriteMat); eyeGlow.scale.set(2.8,2.8,1); eyeGlow.position.set(0,0.18,1.1);
        g.add(eyeHolder); g.add(eyeGlow);

        // mouth
        const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.08,0.06), new THREE.MeshStandardMaterial({color:0x000000, roughness:0.6})); mouth.position.set(0,-0.28,0.86); g.add(mouth);

        // optional small fins
        if(Math.random() < 0.4){
          const fins = new THREE.Group();
          for(let s=0;s<3;s++){ const f = new THREE.ConeGeometry(0.08,0.36,8); const fm = new THREE.Mesh(f, this._bodyMat.clone()); const ang = (s-1)*0.45; fm.position.set(Math.sin(ang)*0.9, (Math.random()-0.3)*0.2, Math.cos(ang)*0.25); fm.rotation.x = 1.3 + Math.random()*0.4; fins.add(fm); }
          g.add(fins);
        }

        g.position.set(x, baseHeight, z);
        g.scale.set(scale, scale, scale);
        this.scene.add(g);

        this.enemies.push({ group: g, body: body, eye: eye, pupil: pupil, baseY: baseHeight, timer: Math.random()*10, offset: Math.random()*3.7, health: 60, maxHealth:60, scale, hitRadius: 10, flash:0, dead:false, deathTimer:0, particles:[] });
      }
    }

    update(dt){
      const player = this.playerRef();
      const now = performance.now()*0.001;
      for(let i=this.enemies.length-1;i>=0;i--){
        const e = this.enemies[i];
        if(!e) continue;
        e.timer += dt;
        if(e.dead){
          e.deathTimer += dt;
          // shrink and fade
          const t = e.deathTimer / 0.9;
          e.group.scale.setScalar(Math.max(0.001, e.scale * (1 - t)));
          if(e.deathTimer > 0.9){
            // remove
            try{ this.scene.remove(e.group); }catch(err){}
            this.enemies.splice(i,1);
            continue;
          }
          continue;
        }

        // bobbing above ground
        const base = this.terrain.sampleHeight(e.group.position.x, e.group.position.z);
        const hover = 14 + Math.sin(e.timer*2 + e.offset) * 2.0;
        e.group.position.y = base + hover;

        // gentle drift
        e.group.position.x += Math.sin(e.timer * 0.6 + e.offset) * 0.12 * (e.scale/6) * dt;

        // wobble rotation
        e.group.rotation.z = Math.sin(e.timer * 1.5 + e.offset) * 0.08;

        // face player slowly
        if(player){
          const toPlayer = player.group.position.clone().sub(e.group.position);
          const targetYaw = Math.atan2(toPlayer.x, toPlayer.z);
          const delta = (targetYaw - e.group.rotation.y + Math.PI) % (Math.PI*2) - Math.PI;
          e.group.rotation.y += delta * Math.min(1, dt * 1.5);
          // eye look at player a bit
          const eyeWorldPos = e.eye.getWorldPosition(new THREE.Vector3());
          const look = player.group.position.clone().sub(eyeWorldPos).normalize();
          e.eye.lookAt(player.group.position);
        }

        // flash effect decay
        if(e.flash > 0){ e.flash -= dt; const f = Math.max(0, e.flash); try{ e.body.material.emissiveIntensity = 0.8 * f; }catch(e){} }

        // update simple particles (sparks)
        if(e.particles && e.particles.length){
          for(let p=e.particles.length-1;p>=0;p--){ const part = e.particles[p]; part.life -= dt; part.mesh.position.addScaledVector(part.vel, dt); if(part.life<=0){ try{ this.scene.remove(part.mesh); }catch(err){} e.particles.splice(p,1); } }
        }
      }
    }

    // Return enemy if projectile hits; apply damage and visual reaction
    hitTestProjectile(proj){
      for(const e of this.enemies){
        if(e.dead) continue;
        const d = e.group.position.distanceTo(proj.mesh.position);
        if(d < e.hitRadius){
          // apply damage
          e.health -= 10;
          // flash and shake
          e.flash = 0.12;
          // recoil
          try{ e.group.position.addScaledVector(proj.dir.clone().negate(), 2.2); }catch(err){}
          // spawn small spark particles
          for(let s=0;s<6;s++){ const sgeo = new THREE.SphereGeometry(0.08,6,6); const smat = new THREE.MeshBasicMaterial({color:0xffcc66}); const sm = new THREE.Mesh(sgeo, smat); sm.position.copy(proj.mesh.position); this.scene.add(sm); const vel = new THREE.Vector3((Math.random()-0.5)*3, Math.random()*2, (Math.random()-0.5)*3); if(!e.particles) e.particles = []; e.particles.push({ mesh: sm, vel, life: 0.5 + Math.random()*0.4 }); }
          // death sequence
          if(e.health <= 0){ e.dead = true; e.deathTimer = 0; // spawn a bigger explosion sprite
            try{ const exGeo = new THREE.IcosahedronGeometry(1.6,1); const exMat = new THREE.MeshStandardMaterial({color:0xffaa33, emissive:0xff6622, transparent:true}); const ex = new THREE.Mesh(exGeo, exMat); ex.position.copy(e.group.position); this.scene.add(ex); e.particles.push({ mesh: ex, vel: new THREE.Vector3(0,0.6,0), life:0.9 }); }catch(err){}
          }
          return e;
        }
      }
      return null;
    }

    allDead(){ return this.enemies.filter(e=> !e.dead).length===0; }

    // mark and remove all
    clear(){ for(const e of this.enemies){ try{ this.scene.remove(e.group); }catch(err){} } this.enemies.length=0; }
  }


  // --- PlayerController ---
  class PlayerController{
    constructor(scene, terrain, projectileManager){
      this.scene = scene; this.terrain = terrain; this.projectileManager = projectileManager;
      this.group = new THREE.Group();
      this._build();
      this.health = 100; this.score = 0; this.weaponCooldown = 0; this.autoSpeed = 72; // reduced for controlled gameplay
      // movement smoothing
      this.velocity = new THREE.Vector2(0,0); // x: lateral, y: vertical (units/sec)
      this.maxLateral = 120; this.maxVertical = 80; this.accel = 10.0; // smoothing factor
    }
    _build(){
      // Build a compact hover speeder (small, lower-center framing)
      const cream = 0xd8c0a0;
      const red = 0x8b1e1e;
      const metal = 0x555555;
      const blueGlow = 0x4aa3ff;

      const mainMat = new THREE.MeshStandardMaterial({color:cream, roughness:0.45, metalness:0.15});
      const panelMat = new THREE.MeshStandardMaterial({color:red, roughness:0.6, metalness:0.12});
      const metalMat = new THREE.MeshStandardMaterial({color:metal, roughness:0.35, metalness:0.85});
      const glowMat = new THREE.MeshBasicMaterial({color:blueGlow, transparent:true, opacity:0.95});

      // main body: long horizontal hull
      const bodyGeo = new THREE.BoxGeometry(4.5, 0.9, 12);
      const body = new THREE.Mesh(bodyGeo, mainMat); body.castShadow = true; body.receiveShadow = true; body.position.set(0,0.6,0); body.geometry.computeVertexNormals(); this.group.add(body);

      // rounded nose: sphere scaled and blended into front
      const nose = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 12), mainMat); nose.position.set(0.0,0.75,6.3); nose.scale.set(1.1,0.85,1.4); nose.castShadow=true; this.group.add(nose);

      // cockpit: small dark transparent dome
      const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 16), new THREE.MeshPhysicalMaterial({color:0x1a1a1a, transparent:true, opacity:0.85, metalness:0.12, roughness:0.18}));
      cockpit.position.set(0.0,1.05,2.6); cockpit.scale.set(1,0.8,1.2); cockpit.castShadow = true; this.group.add(cockpit);

      // side engine pods
      const podGeo = new THREE.CylinderGeometry(0.6,0.6,4,20);
      const podL = new THREE.Mesh(podGeo, metalMat); podL.rotation.x = Math.PI/2; podL.position.set(2.2,0.4,1.2); podL.castShadow=true; this.group.add(podL);
      const podR = podL.clone(); podR.position.set(-2.2,0.4,1.2); this.group.add(podR);

      // rear engine pods
      const rearPodL = podL.clone(); rearPodL.position.set(2.2,0.4,-4.8); this.group.add(rearPodL);
      const rearPodR = podL.clone(); rearPodR.position.set(-2.2,0.4,-4.8); this.group.add(rearPodR);

      // side panels (red accents)
      const panelGeo = new THREE.BoxGeometry(0.5,0.14,6);
      const pL = new THREE.Mesh(panelGeo, panelMat); pL.position.set(2.35,0.66,-0.4); pL.rotation.y = 0.06; this.group.add(pL);
      const pR = pL.clone(); pR.position.set(-2.35,0.66,-0.4); this.group.add(pR);

      // rear thruster glow (blue emissive cylinders)
      const glowGeo = new THREE.CylinderGeometry(0.28,0.28,0.8,12);
      const gL = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({color:blueGlow, emissive:blueGlow, transparent:true, opacity:0.95})); gL.rotation.x = Math.PI/2; gL.position.set(2.2,0.3,-6.0); this.group.add(gL);
      const gR = gL.clone(); gR.position.set(-2.2,0.3,-6.0); this.group.add(gR);

      // small metallic details on top
      const detailGeo = new THREE.BoxGeometry(0.24,0.06,0.9);
      const d1 = new THREE.Mesh(detailGeo, metalMat); d1.position.set(0,1.0,-1.2); this.group.add(d1);

      // soft additive sprite glow behind thrusters for stronger bloom feel
      const makeGlowSprite = (hex, size=128)=>{
        const c = document.createElement('canvas'); c.width=size; c.height=size; const ctx = c.getContext('2d');
        const g = ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
        g.addColorStop(0, 'rgba(255,255,255,0.85)');
        g.addColorStop(0.2, `rgba(${(hex>>16)&255},${(hex>>8)&255},${hex&255},0.6)`);
        g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0,0,size,size);
        const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
        const mat = new THREE.SpriteMaterial({map:tex, color:0xffffff, blending:THREE.AdditiveBlending, transparent:true, depthWrite:false});
        return new THREE.Sprite(mat);
      };
      const glowSpriteL = makeGlowSprite(blueGlow, 256); glowSpriteL.position.set(2.2,0.28,-6.6); glowSpriteL.scale.set(1.6,1.6,1); this.group.add(glowSpriteL);
      const glowSpriteR = makeGlowSprite(blueGlow, 256); glowSpriteR.position.set(-2.2,0.28,-6.6); glowSpriteR.scale.set(1.6,1.6,1); this.group.add(glowSpriteR);

      // store references for runtime control
      this.engineGlows = [glowSpriteL, glowSpriteR, gL, gR];
      this.accentMat = panelMat;
      this.scene.add(this.group);
      // scale ship to be more visible and cinematic (larger but not blocking)
      this.group.scale.set(1.35, 1.35, 1.35);
    }
    setPosition(x,y,z){
      this.group.position.set(x,y,z); this.group.rotation.set(0,0,0);
      this.health=100; this.score=0; this.weaponCooldown=0;
      // launch state
      this.launching = true; this.launchTimer = 0; this.launchDelay = 1.6; this.launchRamp = 2.5; this.currentSpeed = 0; this.collisionsSuppressed = true;
    }
    update(dt, input, state){
      if(state !== GameState.PLAYING) return;
      // handle launch sequence: stationary for delay, then ramp to speed
      if(this.launching){
        this.launchTimer += dt;
        if(this.launchTimer < this.launchDelay){
          // controls allowed but no forward auto-move
          this.currentSpeed = 0;
        } else {
          // ramp from 0 to autoSpeed over launchRamp seconds
          const t = Math.min(1, (this.launchTimer - this.launchDelay) / this.launchRamp);
          // ease out
          const speedFactor = (1 - Math.pow(1 - t, 2));
          this.currentSpeed = this.autoSpeed * speedFactor;
        }
      } else {
        this.currentSpeed = this.autoSpeed;
      }
      // auto-forward
      const forward = new THREE.Vector3(0,0,1).applyQuaternion(this.group.quaternion).normalize();
      this.group.position.addScaledVector(forward, this.currentSpeed * dt);
      // input controls (correct mapping: left moves left on screen)
      const left = input.keys['KeyA'] || input.keys['ArrowLeft'];
      const right = input.keys['KeyD'] || input.keys['ArrowRight'];
      const up = input.keys['KeyW'] || input.keys['ArrowUp'];
      const down = input.keys['KeyS'] || input.keys['ArrowDown'];
      const targetLateral = ((right?1:0) - (left?1:0)) * this.maxLateral; // positive -> right
      const targetVertical = ((up?1:0) - (down?1:0)) * this.maxVertical; // positive -> up
      // smooth velocity towards target
      const blend = 1 - Math.exp(-this.accel * dt);
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetLateral, blend);
      this.velocity.y = THREE.MathUtils.lerp(this.velocity.y, targetVertical, blend);
      const rightVec = new THREE.Vector3(1,0,0).applyQuaternion(this.group.quaternion).normalize();
      this.group.position.addScaledVector(rightVec, this.velocity.x * dt);
      this.group.position.y += this.velocity.y * dt;
      // clamp within canyon boundaries using terrain centerline
      const cx = this.terrain.centerlineX(this.group.position.z);
      const halfWidth = 170;
      const dx = this.group.position.x - cx;
      if(dx > halfWidth){ this.group.position.x = cx + halfWidth; this.velocity.x = Math.min(0, this.velocity.x); }
      if(dx < -halfWidth){ this.group.position.x = cx - halfWidth; this.velocity.x = Math.max(0, this.velocity.x); }
      // vertical clamp
      const ground = this.terrain.sampleHeight(this.group.position.x, this.group.position.z);
      const minY = ground + 1.2; const maxY = ground + 200;
      if(this.group.position.y < minY){ this.group.position.y = minY; this.velocity.y = Math.max(0, this.velocity.y); }
      if(this.group.position.y > maxY){ this.group.position.y = maxY; this.velocity.y = Math.min(0, this.velocity.y); }
      // smoothing roll/pitch based on velocity
      const targetRoll = - (this.velocity.x / this.maxLateral) * 0.7; // bank (gentler)
      const targetPitch = - (this.velocity.y / this.maxVertical) * 0.35; // pitch (subtle)
      this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, targetRoll, Math.min(1, 6*dt));
      this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, targetPitch, Math.min(1, 6*dt));
      // firing
      if((input.keys['Space'] || input.pointerDown) && this.weaponCooldown<=0){ this.fire(); }
      // finish launching: when ramp complete, mark done
      if(this.launching && (this.launchTimer >= (this.launchDelay + this.launchRamp))){ this.launching = false; this.collisionsSuppressed = false; }
      if(this.weaponCooldown>0) this.weaponCooldown -= dt;

      // engine glow intensity tied to forward speed
      if(this.engineGlows && this.engineGlows.length){
        const t = THREE.MathUtils.clamp(this.currentSpeed / Math.max(1, this.autoSpeed), 0, 1);
        const base = 0.14; const extra = 0.85;
        for(const g of this.engineGlows){ try{ if(g.material){ g.material.opacity = base + extra * t; } g.scale.set((1 + 0.6 * t) * (g.scale.x||1), (1 + 0.6 * t) * (g.scale.y||1), 1); }catch(e){} }
        // accent emissive intensity
        try{ if(this.accentMat) this.accentMat.emissiveIntensity = 0.6 * t; if(this.ringMat) this.ringMat.emissiveIntensity = 0.9 * t; }catch(e){}
      }

      // rotating dorsal ring animation
      if(this.rotatingRing){ try{ this.rotatingRing.rotation.y += dt * 1.1; this.rotatingRing.rotation.x = Math.sin(performance.now()*0.001 + (this._ringPhase||0)) * 0.02; }catch(e){} }
    }
    fire(){ if(this.weaponCooldown>0) return; this.weaponCooldown = 0.16; const pos = this.group.position.clone().add(new THREE.Vector3(0,0,3).applyQuaternion(this.group.quaternion)); const dir = new THREE.Vector3(0,0,1).applyQuaternion(this.group.quaternion).normalize(); this.projectileManager.spawn(pos, dir, 420, 'player'); playShoot(); }
    dispose(){ try{ this.scene.remove(this.group); }catch(e){} }
  }

  // --- CollisionSystem ---
  class CollisionSystem{
    constructor(terrain, player, enemyManager, projectileManager, onPlayerDeath, onEnemyDeath, obstacleManager){
      this.terrain = terrain; this.player = player; this.enemyManager = enemyManager; this.projectileManager = projectileManager;
      this.onPlayerDeath = onPlayerDeath; this.onEnemyDeath = onEnemyDeath;
      this.obstacleManager = obstacleManager || null;
      this.enabled = true;
    }
    update(){
      if(!this.enabled) return;
      // player vs terrain/bounds
      const ppos = this.player.group.position;
      const ground = this.terrain.sampleHeight(ppos.x, ppos.z);
      if(ppos.y <= ground + 1.1) { this.onPlayerDeath('collision'); }
      const halfW = this.terrain.width/2; const halfL = this.terrain.length/2;
      if(Math.abs(ppos.x) > halfW || ppos.z < -halfL || ppos.z > halfL){ this.onPlayerDeath('boundary'); }
      // obstacle collisions (solid parts only)
      try{
        if(this.obstacleManager && this.obstacleManager.getSolidHitboxes){
          // compute ship bounding box
          const shipBox = new THREE.Box3().setFromObject(this.player.group);
          shipBox.expandByScalar(0.6);
          const solids = this.obstacleManager.getSolidHitboxes();
          for(const obstacle of solids){ if(obstacle && obstacle.intersectsBox && obstacle.intersectsBox(shipBox)){ // call triggerCrash if available
                if(typeof window.triggerCrash === 'function'){ try{ window.triggerCrash('hit obstacle'); }catch(e){ this.onPlayerDeath('hit obstacle'); } }
                else { this.onPlayerDeath('hit obstacle'); }
                return;
              }
          }
        }
      }catch(e){ console.warn('Obstacle collision check failed', e); }
      // projectiles vs enemies
      for(let i=this.projectileManager.list.length-1;i>=0;i--){ const proj = this.projectileManager.list[i]; if(proj.owner!=='player') continue; const hit = this.enemyManager.hitTestProjectile(proj); if(hit){ // remove proj
          try{ this.projectileManager.scene.remove(proj.mesh); proj.mesh.geometry.dispose(); proj.mesh.material.dispose(); }catch(e){}
          this.projectileManager.list.splice(i,1);
          if(hit.health<=0){ this.onEnemyDeath(hit); }
        }
      }
    }
  }

  // --- UIManager ---
  class UIManager{
    constructor(){
      this.hudHealth = document.getElementById('hud-health');
      this.hudScore = document.getElementById('hud-score');
      this.hudLives = document.getElementById('hud-lives');
      this.hudEnemies = document.getElementById('hud-enemies');
      this.overlay = document.getElementById('overlay');
      this.pauseOverlay = document.getElementById('pauseOverlay');
      this.endOverlay = document.getElementById('endOverlay');
      this.endTitle = document.getElementById('endTitle');
      this.endText = document.getElementById('endText');
      this.startBtn = document.getElementById('startBtn');
      this.resumeBtn = document.getElementById('resumeBtn');
      this.restartBtn = document.getElementById('restartBtn');
      this.playAgainBtn = document.getElementById('playAgainBtn');
    }
    showMenu(){ this.overlay.classList.remove('hidden'); this.pauseOverlay.classList.add('hidden'); this.endOverlay.classList.add('hidden'); }
    showPlaying(){ this.overlay.classList.add('hidden'); this.pauseOverlay.classList.add('hidden'); this.endOverlay.classList.add('hidden'); }
    showPause(){ this.pauseOverlay.classList.remove('hidden'); }
    showEnd(title,text){ this.endOverlay.classList.remove('hidden'); this.endTitle.textContent = title; this.endText.textContent = text; }
    update(hp,score,enemies,lives){
      if(this.hudHealth) this.hudHealth.textContent = Math.max(0, Math.round(hp));
      if(this.hudScore) this.hudScore.textContent = Math.round(score);
      if(this.hudEnemies) this.hudEnemies.textContent = enemies;
      if(this.hudLives) this.hudLives.textContent = (typeof lives === 'number')? Math.max(0,lives) : '';
    }
  }

  // --- Audio helpers (safe)
  let audioCtx = null; try{ const C = window.AudioContext || window.webkitAudioContext; audioCtx = new C(); }catch(e){ audioCtx = null; }
  function playShoot(){ if(!audioCtx) return; const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type='sawtooth'; o.frequency.value=1200; g.gain.value=0.06; o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+0.09); }
  function playExplosion(){ if(!audioCtx) return; const b = audioCtx.createBufferSource(); const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate*0.2, audioCtx.sampleRate); const data = buffer.getChannelData(0); for(let i=0;i<data.length;i++) data[i] = (Math.random()*2-1)*Math.pow(1-i/data.length,2); b.buffer = buffer; b.connect(audioCtx.destination); b.start(); }

  // --- GameManager ---
  class GameManager{
    constructor(){
      this.state = GameState.MENU;
      this.scene = null; this.camera = null; this.terrain=null; this.player=null; this.enemyManager=null; this.projectileManager=null; this.collisionSystem=null; this.ui=null;
      this.lastTime = 0; this.running = false; this._loop = this._loop.bind(this);
      this.lives = 3; // player lives
      this.explosions = []; // active explosion visuals
      this.respawning = false; this.respawnTimer = 0;
      this._attached = false; // input listeners
      this._setupStaticUI();
    }
    _setupStaticUI(){
      this.ui = new UIManager();
      this.ui.showMenu();
      // robustly bind UI buttons; elements may not exist at constructor time in some embed contexts
      const bind = (id, fn)=>{ try{ const el = document.getElementById(id); if(el) el.addEventListener('click', fn); else console.warn('UI element not found for binding:', id); }catch(e){ console.warn('Failed to bind', id, e); } };
      bind('startBtn', ()=>{ try{ this.start(); }catch(err){ console.error('Start failed',err); this.ui.showEnd('Error','Failed to start the game — check console.'); } });
      bind('resumeBtn', ()=>{ try{ this.togglePause(); }catch(e){ console.error(e); } });
      bind('restartBtn', ()=>{ try{ this.restart(); }catch(e){ console.error(e); } });
      bind('playAgainBtn', ()=>{ try{ this.restart(); }catch(e){ console.error(e); } });
      // fallback: delegated click handler so dynamically replaced buttons still work
      document.addEventListener('click', (e)=>{
        try{
          const id = e.target && e.target.id;
          if(!id) return;
          if(id==='startBtn') { this.start(); }
          if(id==='resumeBtn') { this.togglePause(); }
          if(id==='restartBtn' || id==='playAgainBtn') { this.restart(); }
        }catch(err){ console.error('delegated click handler error', err); }
      });
      window.addEventListener('keydown', (e)=>{ if(e.code==='KeyP'){ this.togglePause(); } if(e.code==='KeyR'){ if(this.state===GameState.GAME_OVER || this.state===GameState.VICTORY) this.restart(); } });
    }
    init(resetLives = true){
      // create new scene so reset is clean
      this.dispose();
      this.scene = new THREE.Scene();
      // sky will be handled by a cinematic sky dome; fog set later
      this.scene.background = new THREE.Color(0x8fcfff);
      this.scene.fog = null;
      // camera
      this.camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.5, 20000);
      this.camera.position.set(0,16,-34);
      // lighting tuned to warm desert afternoon
      const sun = new THREE.DirectionalLight(0xffe0a3, 2.3);
      sun.position.set(-400, 500, -300);
      sun.castShadow = true; sun.shadow.mapSize.set(2048,2048); sun.shadow.bias = -0.0005; this.scene.add(sun);
      const hemi = new THREE.HemisphereLight(0x9ed8ff, 0xd6a85f, 1.15); this.scene.add(hemi);
      const amb = new THREE.AmbientLight(0xffffff, 0.18); this.scene.add(amb);
      // terrain
      this.terrain = new TerrainGenerator(this.scene, {width:3000, length:7000, segX:300, segZ:600});
      // cinematic sky dome + fog (follow camera)
      try{
        const topSky = 0x8fd3ff;
        const horizon = 0xf2c078;
        const dust = 0xe0b27a;
        const skyGeo = new THREE.SphereGeometry(4000, 32, 15);
        skyGeo.scale(-1,1,1);
        const skyMat = new THREE.ShaderMaterial({
          uniforms: {
            topColor: { value: new THREE.Color(topSky) },
            bottomColor: { value: new THREE.Color(horizon) },
            dustColor: { value: new THREE.Color(dust) }
          },
          vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
          fragmentShader: 'uniform vec3 topColor; uniform vec3 bottomColor; uniform vec3 dustColor; varying vec3 vPos; void main(){ float t = normalize(vPos).y * 0.5 + 0.5; vec3 col = mix(bottomColor, topColor, pow(t,0.85)); float haze = smoothstep(-0.2, 0.2, t); col = mix(col, dustColor, 1.0 - haze*0.6); gl_FragColor = vec4(col,1.0); }',
          side: THREE.BackSide,
          depthWrite: false
        });
        this._sky = new THREE.Mesh(skyGeo, skyMat); this._sky.renderOrder = -1; this.scene.add(this._sky);
      }catch(e){ console.warn('Sky init failed', e); }
      // fog for cinematic depth
      this.scene.fog = new THREE.Fog(0xe8c08a, 600, 3500);
      // create safe launch runway before other objects
      this._createLaunchPlatform();
      // managers
      this.projectileManager = new ProjectileManager(this.scene);
      this.player = new PlayerController(this.scene, this.terrain, this.projectileManager);
      // set player start inside canyon
      const startZ = - (this.terrain.length/2) + 200; const startX = this.terrain.centerlineX(startZ);
      this.player.setPosition(startX, this.terrain.sampleHeight(startX,startZ) + 5, startZ);
      // obstacle manager: place ruins along the flight path after the launch zone
      try{
        this.obstacleManager = new ObstacleManager(this.scene, this.terrain);
        // spawn obstacles after the startZ (manager will add spacing and rules)
        this.obstacleManager.spawnAlongPath(startZ);
      }catch(e){ console.warn('ObstacleManager not available or failed to spawn', e); this.obstacleManager = null; }
      // position camera so ship is low and framed among dunes at start
      const camOffset = new THREE.Vector3(0,5,-12).applyQuaternion(this.player.group.quaternion);
      this.camera.position.copy(this.player.group.position.clone().add(camOffset));
      const lookAtInit = this.player.group.position.clone().add(new THREE.Vector3(0,3,12));
      this.camera.lookAt(lookAtInit);
      this.enemyManager = new EnemyManager(this.scene, this.terrain, ()=>this.player);
      this.enemyManager.spawnThree();
      // collision (include obstacle manager)
      this.collisionSystem = new CollisionSystem(this.terrain, this.player, this.enemyManager, this.projectileManager, (reason)=>this._onPlayerDeath(reason), (enemy)=>this._onEnemyDeath(enemy), this.obstacleManager);
      // temporarily disable collisions during launch until ramp completes
      this.collisionSystem.enabled = false;
      // reset lives only when requested (full new game)
      if(resetLives) this.lives = 3;
      this.explosions = [];
      this.respawning = false; this.respawnTimer = 0;
      // attach input listeners once
      if(!this._attached){ InputManager.attach(); this._attached=true; }
      // resize handling
      window.addEventListener('resize', ()=>{ renderer.setSize(window.innerWidth, window.innerHeight); this.camera.aspect = window.innerWidth/window.innerHeight; this.camera.updateProjectionMatrix(); });

      this.ui.update(this.player.health, this.player.score, this.enemyManager.enemies.length, this.lives);
      this.state = GameState.MENU; this.ui.showMenu();
      this.lastTime = performance.now()/1000;
    }
    start(){ if(this.state===GameState.PLAYING) return; if(!this.scene) this.init(); this.state = GameState.PLAYING; this.ui.showPlaying(); this.running = true; this.lastTime = performance.now()/1000; requestAnimationFrame(this._loop); }
    togglePause(){ if(this.state===GameState.PLAYING){ this.state = GameState.PAUSED; this.ui.showPause(); } else if(this.state===GameState.PAUSED){ this.state = GameState.PLAYING; this.ui.showPlaying(); } }
    _onPlayerDeath(reason){
      if(this.state !== GameState.PLAYING) return;
      // spawn explosion visual and sound
      if(this.player && this.player.group){ this._spawnExplosion(this.player.group.position.clone()); }
      playExplosion();
      // decrement lives and update HUD
      this.lives = Math.max(0, this.lives - 1);
      this.ui.update(this.player.health, this.player.score, this.enemyManager.enemies.filter(e=>e.health>0).length, this.lives);
      // disable collisions immediately
      if(this.collisionSystem) this.collisionSystem.enabled = false;
      // hide player briefly (move below ground)
      try{ this.player.group.visible = false; }catch(e){}
      if(this.lives > 0){
        // schedule respawn after short delay
        this.respawning = true; this.respawnTimer = 1.2;
      } else {
        // out of lives -> game over
        this.state = GameState.GAME_OVER; this.running = false;
        this.ui.showEnd('Game Over','You have no lives left. Press R to restart.');
      }
    }
    _onEnemyDeath(enemy){ try{ this.scene.remove(enemy.group); }catch(e){} this.player.score += 50; this.ui.update(this.player.health, this.player.score, this.enemyManager.enemies.filter(e=>e.health>0).length, this.lives); if(this.enemyManager.allDead()){ this.state = GameState.VICTORY; this.running = false; this.ui.showEnd('Victory','All hostiles destroyed. Press R to play again.'); } }

    _onEnemyDeath(enemy){
      // EnemyManager now handles animated death/removal. Just award score and update HUD.
      try{
        if(this.enemyManager && typeof this.enemyManager.markForDeath === 'function'){
          this.enemyManager.markForDeath(enemy);
        }
      }catch(e){ /* ignore */ }
      this.player.score += 50;
      this.ui.update(this.player.health, this.player.score, this.enemyManager ? this.enemyManager.enemies.filter(en=>!en.dead).length : 0, this.lives);
      if(this.enemyManager && this.enemyManager.allDead()){ this.state = GameState.VICTORY; this.running = false; this.ui.showEnd('Victory','All hostiles destroyed. Press R to play again.'); }
    }
    restart(resetLives = true){ // fully recreate world (optionally preserve lives)
      try{ // clear existing resources
        InputManager.reset();
        this.projectileManager && this.projectileManager.clear();
        this.enemyManager && this.enemyManager.clear();
        this.obstacleManager && this.obstacleManager.dispose();
        this.terrain && this.terrain.dispose();
        this.player && this.player.dispose();
        // remove launch platform if present
        if(this.launchPlatform){ try{ this.scene.remove(this.launchPlatform); if(this.launchPlatform.geometry) this.launchPlatform.geometry.dispose(); if(this.launchPlatform.material) this.launchPlatform.material.dispose(); }catch(e){} this.launchPlatform = null; }
      }catch(e){}
      // re-init scene and systems
      this.init(resetLives);
      this.start();
    }

    _createLaunchPlatform(){
      // compute start location
      const startZ = - (this.terrain.length/2) + 200; const startX = this.terrain.centerlineX(startZ);
      const runwayLength = 220; const runwayHalfWidth = 60;
      // flatten terrain corridor ahead
      const flatY = this.terrain.sampleHeight(startX, startZ) + 0.8;
      this.terrain.carveRunway(startZ, runwayLength, runwayHalfWidth, flatY);
      // create platform mesh (metallic)
      const width = 50; const length = 100; const thickness = 1.5;
      const geom = new THREE.BoxGeometry(width, thickness, length);
      const mat = new THREE.MeshStandardMaterial({color:0x7f7f7f, metalness:0.8, roughness:0.3});
      const platform = new THREE.Mesh(geom, mat); platform.receiveShadow=true; platform.castShadow=true;
      platform.position.set(startX, flatY + thickness/2 + 0.6, startZ + length/2 - 10);
      this.scene.add(platform);
      this.launchPlatform = platform;
    }
    _spawnExplosion(pos){
      try{
        const geo = new THREE.IcosahedronGeometry(1.6,1);
        const mat = new THREE.MeshStandardMaterial({color:0xffae33, emissive:0xff7722, transparent:true, opacity:1.0, metalness:0.1, roughness:0.6});
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.scale.set(1.6,1.6,1.6);
        mesh.castShadow = false; mesh.receiveShadow = false;
        this.scene.add(mesh);
        this.explosions.push({mesh, life:0.9, total:0.9});
      }catch(e){ console.warn('spawnExplosion failed', e); }
    }
    dispose(){ // called before init to clear scene
      try{
        if(this.scene){
          // remove all children and dispose geometries/materials
          while(this.scene.children.length){ const c = this.scene.children.pop(); try{ if(c.geometry) c.geometry.dispose(); if(c.material){ if(c.material.map) c.material.map.dispose(); c.material.dispose(); } }catch(e){} }
          this.scene = null;
        }
      }catch(e){}
    }
    _updateCamera(dt){
      // third-person chase camera farther behind the ship for wide view
      const cameraOffset = new THREE.Vector3(0,11,-50);
      const lookAheadOffset = new THREE.Vector3(0,5,90);

      const targetCameraPos = this.player.group.position.clone().add(cameraOffset);
      // smooth lerp toward target position (gentle smoothing)
      this.camera.position.lerp(targetCameraPos, 0.08);

      const lookTarget = this.player.group.position.clone().add(lookAheadOffset);
      this.camera.lookAt(lookTarget);
      // keep sky dome centered on camera for consistent horizon
      try{ if(this._sky) this._sky.position.copy(this.camera.position); }catch(e){}
    }
    _loop(){
      const now = performance.now()/1000; const dt = Math.min(0.05, now - this.lastTime); this.lastTime = now;
      try{
        if(this.running && this.state===GameState.PLAYING){
          // handle respawn timer
          if(this.respawning){
            this.respawnTimer -= dt;
            if(this.respawnTimer <= 0){
              // perform respawn: restore player at launch platform
              const startZ = - (this.terrain.length/2) + 200; const startX = this.terrain.centerlineX(startZ);
              try{ this.player.setPosition(startX, this.terrain.sampleHeight(startX,startZ) + 5, startZ); this.player.group.visible = true; }catch(e){}
              this.respawning = false; this.respawnTimer = 0; // collisions will be re-enabled after launch ramp completes in player's update
            }
          }
          // update systems
          this.player.update(dt, InputManager, this.state);
          this.enemyManager.update(dt);
          this.projectileManager.update(dt);
          // enable collisions after launch ramp completes
          if(this.collisionSystem && !this.collisionSystem.enabled && this.player && !this.player.launching){ this.collisionSystem.enabled = true; }
          this.collisionSystem.update();
          this._updateCamera(dt);
          this.ui.update(this.player.health, this.player.score, this.enemyManager.enemies.filter(e=>e.health>0).length, this.lives);
        }
        // update explosion visuals regardless of playing state
        if(this.explosions && this.explosions.length){
          for(let i=this.explosions.length-1;i>=0;i--){ const ex = this.explosions[i]; ex.life -= dt; const f = Math.max(0, ex.life / ex.total); try{ ex.mesh.scale.multiplyScalar(1 + dt*3.5); if(ex.mesh.material) ex.mesh.material.opacity = f; }catch(e){} if(ex.life<=0){ try{ this.scene.remove(ex.mesh); if(ex.mesh.geometry) ex.mesh.geometry.dispose(); if(ex.mesh.material) ex.mesh.material.dispose(); }catch(e){} this.explosions.splice(i,1); } }
        }
      }catch(err){ console.error('Game loop error',err); }
      // render
      try{ renderer.render(this.scene, this.camera); }catch(err){ console.error('Render error',err); }
      if(this.running) requestAnimationFrame(this._loop);
    }
  }

  // --- Instantiate and initialize ---
  const GAME = new GameManager();
  // initialize once to prepare menu
  GAME.init();

  // expose restart from global for convenience
  window.__GAME = GAME;

  // global triggerCrash helper for obstacle collision callbacks
  try{ window.triggerCrash = function(reason){ try{ if(window.__GAME && window.__GAME._onPlayerDeath) window.__GAME._onPlayerDeath(reason); }catch(e){ console.warn('triggerCrash failed', e); } }; }catch(e){}

  // console instruction
  console.log('Neon Desert ready. Click Start.');

})();
