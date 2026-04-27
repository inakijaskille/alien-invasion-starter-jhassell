import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import DunesGenerator from './DunesGenerator.js';

export default class Terrain {
  constructor(scene) {
    this.width = 3000; this.depth = 6000; this.segW = 240; this.segD = 480;
    const geometry = new THREE.PlaneGeometry(this.width, this.depth, this.segW, this.segD);
    geometry.rotateX(-Math.PI/2);

    const sandMaterial = new THREE.MeshStandardMaterial({
      color: 0xd9b76f,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false
    });

    this.mesh = new THREE.Mesh(geometry, sandMaterial);
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    // vertex color variation
    const colors = [];
    for (let i=0;i<geometry.attributes.position.count;i++) colors.push(1,1,1);
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
    sandMaterial.vertexColors = false;

    const gen = new DunesGenerator(this.width, this.depth, this.segW, this.segD);
    gen.generate(geometry);

    // launch platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(80,4,140), new THREE.MeshStandardMaterial({color:0x2b2b2b, metalness:0.4, roughness:0.6}));
    platform.position.set(0,2,1200 - 70);
    platform.receiveShadow = true;
    platform.name = 'platform';
    scene.add(platform);

    this.geometry = geometry;
    this._buildHeightMap();
  }

  _buildHeightMap() {
    const pos = this.geometry.attributes.position;
    const w = this.segW; const d = this.segD;
    this._w = w; this._d = d;
    this._width = this.width; this._depth = this.depth;
    // cache heights
    this._heights = new Float32Array((w+1)*(d+1));
    for (let iz=0; iz<=d; iz++) {
      for (let ix=0; ix<=w; ix++) {
        const i = iz*(w+1)+ix;
        const vertIndex = i; // in this layout it's same count
        // find nearest position
        const idx = i;
        this._heights[i] = pos.getY(i);
      }
    }
  }

  getHeightAt(x, z) {
    // convert world x,z to grid index
    const u = (x / this._width) + 0.5;
    const v = (z / this._depth) + 0.5;
    const ix = Math.floor(u * this._w);
    const iz = Math.floor(v * this._d);
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const i0 = clamp(ix,0,this._w);
    const j0 = clamp(iz,0,this._d);
    return this._heights[j0*(this._w+1)+i0] || 0;
  }
}
