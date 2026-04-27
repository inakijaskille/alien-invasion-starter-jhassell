import { smoothNoise } from '../utils/Noise.js';
import { smoothstep } from '../utils/MathUtils.js';
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

export default class DunesGenerator {
  constructor(width, depth, segW, segD) {
    this.width = width; this.depth = depth; this.segW = segW; this.segD = segD;
  }

  generate(geometry) {
    const pos = geometry.attributes.position;
    const w = this.segW; const d = this.segD;

    // Precompute base heights
    const heights = new Float32Array((w+1)*(d+1));
    for (let iz=0; iz<=d; iz++) {
      for (let ix=0; ix<=w; ix++) {
        const idx = iz*(w+1)+ix;
        const x = (ix/w - 0.5) * this.width;
        const z = (iz/d - 0.5) * this.depth;

        let h = Math.sin(x * 0.006 + z * 0.002) * 18 +
                Math.sin(x * 0.012 - z * 0.004) * 8 +
                Math.sin(z * 0.007) * 10 +
                smoothNoise(x * 0.003, z * 0.003) * 12;

        // corridor
        const distanceFromCenter = Math.abs(x);
        const corridorWidth = 260;
        const corridorBlend = smoothstep(corridorWidth, corridorWidth + 300, distanceFromCenter);
        h *= corridorBlend;

        heights[idx] = h;
      }
    }

    // smoothing passes
    const passes = 3;
    for (let p=0;p<passes;p++) {
      const tmp = heights.slice();
      for (let iz=0; iz<=d; iz++) {
        for (let ix=0; ix<=w; ix++) {
          const idx = iz*(w+1)+ix;
          let acc = 0; let cnt = 0;
          for (let oz=-1; oz<=1; oz++) for (let ox=-1; ox<=1; ox++) {
            const nx = ix+ox, nz = iz+oz;
            if (nx<0||nx>w||nz<0||nz>d) continue;
            acc += tmp[nz*(w+1)+nx]; cnt++;
          }
          heights[idx] = acc / cnt;
        }
      }
    }

    // apply to geometry positions
    for (let i=0;i<pos.count;i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      // map to grid
      const ix = Math.round((vx / this.width + 0.5) * w);
      const iz = Math.round((vz / this.depth + 0.5) * d);
      const idx = Math.max(0, Math.min((w+1)*(d+1)-1, iz*(w+1)+ix));
      pos.setY(i, heights[idx]);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  }
}
