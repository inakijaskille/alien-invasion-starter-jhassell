/* ObstacleManager - places and manages ruin obstacles along the flight path */
(function(){
  'use strict';

  function ObstacleManager(scene, terrain){
    this.scene = scene;
    this.terrain = terrain;
    this.obstacles = [];
    this._rng = Math.random;
    this._lastDensityDense = false;
  }

  ObstacleManager.prototype.spawnAlongPath = function(startZ){
    // Spawn obstacles beginning after startZ + 200 units, until near terrain end
    const SAFE_ZONE = 200;
    const zStart = startZ + SAFE_ZONE;
    const zEnd = this.terrain.length/2 - SAFE_ZONE;
    if(zEnd <= zStart) return;

    // Alternate between dense and open sections to create cinematic pacing
    let z = zStart + 120;
    while(z < zEnd){
      // choose spacing between 250 and 600 units
      const spacing = 250 + Math.floor(this._rng() * 350);
      z += spacing;
      if(z >= zEnd) break;

      // decide density for this segment (alternate to create rhythm)
      const dense = (Math.random() < 0.5) ? !this._lastDensityDense : this._lastDensityDense;
      this._lastDensityDense = dense;

      // number of obstacles in this cluster
      const clusterCount = dense ? (2 + Math.floor(this._rng()*3)) : (1 + Math.floor(this._rng()*1));
      // keep at least one clear path corridor near centerline
      const centerline = this.terrain.centerlineX(z);

      // layout cluster across X while preserving at least one clear band in [-60,60]
      const bandClearMin = -60, bandClearMax = 60;

      for(let i=0;i<clusterCount;i++){
        // choose obstacle type with weighted probabilities
        const t = this._rng(); let obs = null;
        if(t < 0.28){ // arch
          const width = 140 + Math.floor(this._rng()*140);
          const height = 90 + Math.floor(this._rng()*90);
          obs = ObstacleFactory.createArch({ width, height, thickness: 12 + Math.floor(this._rng()*10) });
        } else if(t < 0.55){ // pillar cluster
          const cluster = new THREE.Group(); const solids = [];
          const count = 1 + Math.floor(this._rng()*3);
          for(let j=0;j<count;j++){
            const h = 80 + Math.floor(this._rng()*100); const r = 6 + Math.floor(this._rng()*8);
            const p = ObstacleFactory.createPillar({ height: h, radius: r });
            p.group.position.x = (j-(count-1)/2) * (r*6 + 8);
            cluster.add(p.group); solids.push(p.solidParts[0]);
          }
          const merged = new Obstacle(cluster, solids); merged.update(); obs = merged;
        } else if(t < 0.78){ // wall
          obs = ObstacleFactory.createWall({ width: 120 + Math.floor(this._rng()*260), height: 40 + Math.floor(this._rng()*80) });
        } else if(t < 0.92){ // gate
          obs = ObstacleFactory.createGate({ width: 160 + Math.floor(this._rng()*200), height: 120 + Math.floor(this._rng()*160) });
        } else { // bridge
          obs = ObstacleFactory.createBrokenBridge({ span: 100 + Math.floor(this._rng()*160), height: 22 + Math.floor(this._rng()*28) });
        }

        // pick X offset but avoid placing directly in the clear band
        const maxOffset = 220;
        let offsetX = Math.floor((this._rng()*2 - 1) * maxOffset);
        // push obstacles away from clear center band
        if(offsetX > bandClearMin && offsetX < bandClearMax){
          offsetX += (offsetX >= 0) ? (bandClearMax + 40) : -(bandClearMax + 40);
        }

        const px = centerline + offsetX;
        obs.group.position.set(px, 0, z + Math.floor((Math.random()-0.5)*60));
        // align base with terrain height so they look partially buried
        const baseY = this.terrain.sampleHeight(obs.group.position.x, obs.group.position.z);
        obs.group.position.y = baseY - (Math.random()*6); // slightly sink into dunes

        // occasional rotation / tilt for atmosphere
        if(Math.random() < 0.22) obs.group.rotation.y = (Math.random()-0.5) * 0.22;

        this.scene.add(obs.group);
        this.obstacles.push(obs);
      }
    }
  };

  ObstacleManager.prototype.update = function(dt){
    for(const o of this.obstacles){ o.update(); }
  };

  ObstacleManager.prototype.getSolidHitboxes = function(){
    return this.obstacles;
  };

  ObstacleManager.prototype.dispose = function(){ for(const o of this.obstacles){ o.dispose(this.scene); } this.obstacles.length = 0; };

  window.ObstacleManager = ObstacleManager;

})();
