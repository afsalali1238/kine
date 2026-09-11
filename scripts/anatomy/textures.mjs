/**
 * Seamless procedural skin texture set (albedo mottle, pore normal relief, roughness).
 *
 * Generated from periodic value noise so the tiles repeat without a visible seam and
 * compress well: the whole set is a few tens of KB instead of a scanned texture
 * library. Deliberately *not* presented as scan data — see ASSET-SPEC.md.
 */

const wrap = (n, size) => ((n % size) + size) % size;

/** Periodic gradient noise built from summed sines: smooth, tileable, deterministic. */
function field(size, seed, octaves = 4) {
  const out = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const freq = o + 1;
    const phase = seed * 1.7 + o * 2.3;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * Math.PI * 2;
        const v = (y / size) * Math.PI * 2;
        const n =
          Math.sin(u * freq + phase) * Math.cos(v * (freq + 1) - phase * 0.6) +
          Math.sin((u + v) * freq * 1.5 + phase) * 0.6;
        out[y * size + x] += n * amp;
      }
    }
    total += amp * 1.6;
    amp *= 0.55;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** Sharp pore dimples on a fine periodic lattice. */
function pores(size, density = 34) {
  const out = new Float32Array(size * size);
  const cell = size / density;
  for (let gy = 0; gy < density; gy++) {
    for (let gx = 0; gx < density; gx++) {
      const h = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
      const r = h - Math.floor(h);
      const cx = (gx + 0.25 + r * 0.5) * cell;
      const cy = (gy + 0.25 + ((r * 7) % 1) * 0.5) * cell;
      const rad = cell * (0.16 + ((r * 13) % 1) * 0.13);
      for (let y = Math.floor(cy - rad) - 1; y <= Math.ceil(cy + rad) + 1; y++) {
        for (let x = Math.floor(cx - rad) - 1; x <= Math.ceil(cx + rad) + 1; x++) {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / rad;
          if (d > 1) continue;
          out[wrap(y, size) * size + wrap(x, size)] += (1 - d * d) ** 1.4;
        }
      }
    }
  }
  let max = 0;
  for (const v of out) max = Math.max(max, v);
  if (max > 0) for (let i = 0; i < out.length; i++) out[i] /= max;
  return out;
}

const clamp8 = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));

/**
 * @returns {{albedo:Buffer, normal:Buffer, roughness:Buffer}} PNG payloads as bytes
 */
export function skinTextureSet(pngWriter, size = 256) {
  const soft = field(size, 1.0, 4);
  const fine = field(size, 4.2, 5);
  const dimples = pores(size);
  const height = new Float32Array(size * size);
  for (let i = 0; i < height.length; i++) {
    height[i] = dimples[i] * 0.75 + fine[i] * 0.14 + soft[i] * 0.1;
  }
  const albedo = new Uint8Array(size * size * 4);
  const normal = new Uint8Array(size * size * 4);
  const rough = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const h = height[i];
      // Warm mottling: slightly redder where the tissue is thinner, paler at pore peaks.
      const r = 0.795 + soft[i] * 0.045 - h * 0.045;
      const g = 0.605 + soft[i] * 0.038 - h * 0.05;
      const b = 0.53 + soft[i] * 0.03 - h * 0.045;
      albedo[i * 4] = clamp8(r);
      albedo[i * 4 + 1] = clamp8(g);
      albedo[i * 4 + 2] = clamp8(b);
      albedo[i * 4 + 3] = 255;
      const dx =
        height[i + (x + 1 < size ? 1 : -(size - 1))] - height[i + (x - 1 >= 0 ? -1 : size - 1)];
      const dy =
        height[i + (y + 1 < size ? size : 0)] -
        height[i + (y - 1 >= 0 ? -size : (size - 1) * size)];
      normal[i * 4] = clamp8(0.5 + dx * 1.6);
      normal[i * 4 + 1] = clamp8(0.5 + dy * 1.6);
      normal[i * 4 + 2] = 235;
      normal[i * 4 + 3] = 255;
      // glTF ORM packing: R occlusion, G roughness, B metallic.
      const roughness = 0.555 + fine[i] * 0.05 + dimples[i] * 0.09;
      rough[i * 4] = 255;
      rough[i * 4 + 1] = clamp8(roughness);
      rough[i * 4 + 2] = 0;
      rough[i * 4 + 3] = 255;
    }
  }
  return {
    albedo: pngWriter(size, size, albedo),
    normal: pngWriter(size, size, normal),
    roughness: pngWriter(size, size, rough),
  };
}
