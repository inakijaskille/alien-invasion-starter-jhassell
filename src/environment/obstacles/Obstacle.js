/* Obstacle - stores meshes and solid hitboxes for collision checks */
(function(){
  'use strict';

  function Obstacle(meshGroup, solidParts){
    this.group = meshGroup; // THREE.Group or Mesh
    // solidParts: array of THREE.Object3D that should be considered for collisions
    this.solidParts = solidParts || [];
    // computed bounding boxes per solid part
    this._boxes = this.solidParts.map(()=> new THREE.Box3());
  }

  Obstacle.prototype.update = function(){
    for(let i=0;i<this.solidParts.length;i++){
      try{ this._boxes[i].setFromObject(this.solidParts[i]); }catch(e){ this._boxes[i].makeEmpty(); }
    }
  };

  // shipBox is THREE.Box3
  Obstacle.prototype.intersectsBox = function(shipBox){
    for(const b of this._boxes){ if(b.isEmpty && !b.isEmpty()) continue; if(b.intersectsBox(shipBox)) return true; }
    return false;
  };

  Obstacle.prototype.dispose = function(scene){
    try{
      if(scene && this.group) scene.remove(this.group);
      if(this.group){ this.group.traverse((c)=>{ if(c.geometry) c.geometry.dispose(); if(c.material){ if(c.material.map) c.material.map.dispose(); c.material.dispose(); } }); }
    }catch(e){ console.warn('Obstacle.dispose failed', e); }
  };

  window.Obstacle = Obstacle;

})();
