// Simple value-noise-like function for terrain. Not full Perlin but sufficient.
export function noise(x, y) {
  // hash-based pseudo-random smooth value
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  const v = s - Math.floor(s);
  return (v * 2 - 1);
}

export function smoothNoise(x, y) {
  // sample neighbors and interpolate
  const fx = Math.floor(x);
  const fy = Math.floor(y);
  const fracX = x - fx;
  const fracY = y - fy;

  const v00 = noise(fx, fy);
  const v10 = noise(fx + 1, fy);
  const v01 = noise(fx, fy + 1);
  const v11 = noise(fx + 1, fy + 1);

  const ix0 = v00 * (1 - fracX) + v10 * fracX;
  const ix1 = v01 * (1 - fracX) + v11 * fracX;
  return ix0 * (1 - fracY) + ix1 * fracY;
}
