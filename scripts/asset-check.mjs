// Browser-free regression check for the shipped 3D body assets.
// Guards against the failure mode where placeholder/corrupted assets slip in:
// validates male.glb / female.glb / body-regions.png against ASSET-SPEC.md and
// src/data/regions.json, including the exact CPU-picker math from useRegionPicker.ts.
// Run: node scripts/asset-check.mjs   (exits non-zero on any failure)
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

globalThis.self = globalThis; // GLTFLoader expects a browser-like global
const root = process.env.ASSET_ROOT || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = p => fs.readFileSync(path.join(root, p));

let failures = 0;
const check = (ok, label, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!ok) failures++;
};

// ---------- GLB checks (real loader used by useGLTF) ----------
for (const sex of ['male', 'female']) {
  const buf = read(`public/models/${sex}.glb`);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  let gltf;
  try {
    gltf = await new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
  } catch (e) {
    check(false, `${sex}.glb parses with three GLTFLoader`, String(e));
    continue;
  }
  check(true, `${sex}.glb parses with three GLTFLoader`);
  const meshes = [];
  gltf.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  check(meshes.length === 1, `${sex}.glb has exactly one skin primitive`, `got ${meshes.length}`);
  const g = meshes[0]?.geometry;
  if (!g) continue;
  check(['position', 'normal', 'uv'].every(k => !!g.attributes[k]), `${sex}.glb has position/normal/uv`, Object.keys(g.attributes).join(','));
  check(!!g.index, `${sex}.glb is indexed`);
  const tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
  // Placeholder regression was 2,600 tris; the CC0 MakeHuman conversion yields 26,756.
  check(tris >= 20000, `${sex}.glb triangle count is a real body mesh`, `${tris} tris`);
  const bb = new THREE.Box3().setFromObject(gltf.scene);
  check(Math.abs(bb.min.y) < 0.01, `${sex}.glb feet at Y=0`, `minY=${bb.min.y.toFixed(3)}`);
  check(bb.max.y > 1.7 && bb.max.y < 1.9, `${sex}.glb crown ~1.8m`, `maxY=${bb.max.y.toFixed(3)}`);
}

// ---------- body-regions.png checks ----------
const png = read('public/models/body-regions.png');
let w = 0, h = 0; const idat = [];
for (let i = 8; i < png.length;) {
  const len = png.readUInt32BE(i), type = png.toString('latin1', i + 4, i + 8);
  if (type === 'IHDR') { w = png.readUInt32BE(i + 8); h = png.readUInt32BE(i + 12); }
  if (type === 'IDAT') idat.push(png.subarray(i + 8, i + 8 + len));
  i += 12 + len;
}
check(w === 2048 && h === 2048, 'body-regions.png is 2048x2048', `${w}x${h}`);
const raw = zlib.inflateSync(Buffer.concat(idat));
const stride = w * 3, bpp = 3;
const px = Buffer.alloc(w * h * 3);
let prev = Buffer.alloc(stride);
for (let y = 0; y < h; y++) {
  const f = raw[y * (stride + 1)];
  const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
  for (let x = 0; x < stride; x++) {
    const a = x >= bpp ? line[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
    if (f === 1) line[x] += a; else if (f === 2) line[x] += b;
    else if (f === 3) line[x] += (a + b) >> 1;
    else if (f === 4) {
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      line[x] += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
    }
  }
  line.copy(px, y * stride); prev = line;
}
const regions = JSON.parse(read('src/data/regions.json'));
const present = new Set();
for (let k = 0; k < w * h; k++) present.add(px[k * 3]);
const missing = regions.filter(r => !present.has(r.maskColor[0]));
check(missing.length === 0, 'every region maskColor present in mask', missing.length ? 'missing: ' + missing.map(r => r.id).join(',') : `${regions.length}/${regions.length}`);

// ---------- CPU picker coverage (exact useRegionPicker.ts math) ----------
const pick = (u, v) => {
  const x = Math.min(w - 1, Math.max(0, Math.floor(u * w)));
  const y = Math.min(h - 1, Math.max(0, Math.floor((1 - v) * h)));
  const red = px[(y * w + x) * 3];
  return regions.find(r => Math.abs(r.maskColor[0] - red) < 3)?.id ?? null;
};
const gb = read('public/models/male.glb');
const jlen = gb.readUInt32LE(12);
const json = JSON.parse(gb.subarray(20, 20 + jlen).toString('utf8'));
const bin = 20 + jlen + 8;
const uvAcc = json.accessors[2], uvBv = json.bufferViews[uvAcc.bufferView];
const uv = new Float32Array(gb.buffer, gb.byteOffset + bin + uvBv.byteOffset + (uvAcc.byteOffset || 0), uvAcc.count * 2);
let hit = 0; const reachable = new Set();
for (let k = 0; k < uvAcc.count; k++) {
  const id = pick(uv[k * 2], uv[k * 2 + 1]);
  if (id) { hit++; reachable.add(id); }
}
const pct = 100 * hit / uvAcc.count;
check(pct >= 95, '>=95% of body UVs resolve to a region (picker)', `${pct.toFixed(2)}%`);
check(reachable.size === regions.length, 'all regions reachable via mesh UVs', `${reachable.size}/${regions.length}`);

console.log(failures === 0 ? '\nasset-check: ALL PASS' : `\nasset-check: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
