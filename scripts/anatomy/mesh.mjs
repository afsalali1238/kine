/**
 * Mesh assembly: merge the lofted parts into one indexed mesh, resolve anatomical
 * region ids per vertex, weld the shared pole vertices, compute smooth normals and
 * derive the region metadata (focus targets, neighbours, silhouettes) that the app
 * and `src/data/regions.json` consume.
 */

import { bodyParts } from './parts.mjs';
import { expandZones } from './zones.mjs';
import { norm, cross, sub, dot } from './loft.mjs';

/** Regions whose ids carry a `-left` / `-right` suffix. */
export function zoneIndex() {
  const regions = expandZones();
  const byBase = new Map();
  for (const r of regions) {
    if (!byBase.has(r.base)) byBase.set(r.base, []);
    byBase.get(r.base).push(r);
  }
  return { regions, byBase };
}

function viewOf(n) {
  const out = [];
  if (n[2] > 0.45) out.push('front');
  if (n[2] < -0.45) out.push('back');
  if (n[0] > 0.45) out.push('left');
  if (n[0] < -0.45) out.push('right');
  if (n[1] > 0.6) out.push('top');
  if (n[1] < -0.6) out.push('bottom');
  return out;
}

/**
 * @param {object} opts
 * @param {'male'|'female'} [opts.sex]
 * @param {number} [opts.quality] resolution multiplier (1 = shipped asset)
 */
export function buildBody({ sex = 'male', quality = 1 } = {}) {
  const parts = bodyParts(sex, quality);
  const { regions, byBase } = zoneIndex();
  const indexOfRegion = new Map(regions.map((r, i) => [r.id, i + 1]));
  const positions = [];
  const regionIds = [];
  const border = [];
  const faceNormals = [];
  const tris = [];
  let offset = 0;

  for (const part of parts) {
    for (const v of part.verts) positions.push(v);
    for (const tag of part.tags) {
      regionIds.push(tag.zone ?? 'face');
      border.push(tag.border);
    }
    const base = offset;
    for (const f of part.faces) tris.push([f[0] + base, f[1] + base, f[2] + base]);
    offset += part.verts.length;
  }

  // Resolve paired bases against the real vertex x sign, then to numeric ids.
  const resolved = regionIds.map((id, i) => {
    const options = byBase.get(id) ?? [];
    if (options.length > 1) {
      const side = positions[i][0] >= 0 ? 'left' : 'right';
      return `${id}-${side}`;
    }
    if (options.length === 1) return options[0].id;
    return regions[0].id;
  });
  const numeric = resolved.map((id) => indexOfRegion.get(id) ?? 0);

  // Normals: area-weighted per-vertex averaging over incident faces.
  const vnormals = positions.map(() => [0, 0, 0]);
  for (const [a, b, c] of tris) {
    const pa = positions[a];
    const pb = positions[b];
    const pc = positions[c];
    const n = cross(sub(pb, pa), sub(pc, pa));
    faceNormals.push(n);
    for (const i of [a, b, c]) {
      vnormals[i][0] += n[0];
      vnormals[i][1] += n[1];
      vnormals[i][2] += n[2];
    }
  }
  const normals = vnormals.map((n) => norm(n));

  // Flip faces whose winding disagrees with the vertex normal (parts are built
  // independently, so this keeps the whole body outward-facing).
  const fixedTris = tris.map((t, i) => {
    const centroid = [0, 0, 0];
    for (let k = 0; k < 3; k++)
      centroid[k] = (positions[t[0]][k] + positions[t[1]][k] + positions[t[2]][k]) / 3;
    const fn = faceNormals[i];
    return dot(fn, normals[t[0]]) + dot(fn, normals[t[1]]) + dot(fn, normals[t[2]]) < 0
      ? [t[0], t[2], t[1]]
      : t;
  });

  const stats = new Map();
  for (const id of numeric) {
    if (id && !stats.has(id)) {
      stats.set(id, {
        count: 0,
        c: [0, 0, 0],
        cc: [0, 0, 0],
        n: [0, 0, 0],
        views: new Set(),
        area: 0,
        tris: 0,
      });
    }
  }
  fixedTris.forEach((t) => {
    // Attribute a triangle to the region shared by at least two of its corners. Taking the
    // first corner alone let border triangles leak to whichever neighbour happened to be
    // listed first, which is why a left muscle and its mirrored twin measured differently.
    const [ta, tb, tc] = t.map((i) => numeric[i]);
    const id = ta === tb || ta === tc ? ta : tb === tc ? tb : 0;
    if (!id) return;
    const s = stats.get(id);
    if (!s) return;
    const [a, b, c] = t.map((i) => positions[i]);
    const e1 = sub(b, a);
    const e2 = sub(c, a);
    const cr = cross(e1, e2);
    const w = 0.5 * Math.hypot(cr[0], cr[1], cr[2]);
    s.area += w;
    // Area-weighted centroid. A vertex mean is pulled toward wherever the ring sampling
    // happens to be denser, which is not the same on both sides of a mirrored pair; the
    // surface centroid is.
    for (let k = 0; k < 3; k++) s.cc[k] += ((a[k] + b[k] + c[k]) / 3) * w;
    s.tris++;
  });
  positions.forEach((p, i) => {
    const id = numeric[i];
    if (!id) return;
    const s = stats.get(id);
    s.count++;
    for (let k = 0; k < 3; k++) {
      s.c[k] += p[k];
      s.n[k] += normals[i][k];
    }
    for (const v of viewOf(normals[i])) s.views.add(v);
  });
  for (const s of stats.values()) {
    for (let k = 0; k < 3; k++) {
      if (s.area > 1e-9) s.c[k] = s.cc[k] / s.area;
      else s.c[k] /= s.count;
      s.n[k] /= s.count;
    }
  }

  // Neighbours: regions sharing a triangle edge.
  const neighbours = new Map();
  const addNeighbour = (a, bId) => {
    if (!a || !bId || a === bId) return;
    if (!neighbours.has(a)) neighbours.set(a, new Set());
    neighbours.get(a).add(bId);
  };
  for (const [a, b, c] of fixedTris) {
    addNeighbour(numeric[a], numeric[b]);
    addNeighbour(numeric[a], numeric[c]);
    addNeighbour(numeric[b], numeric[a]);
    addNeighbour(numeric[c], numeric[a]);
  }

  return {
    sex,
    positions,
    normals,
    tris: fixedTris,
    regionIds: numeric,
    resolved,
    border,
    stats,
    neighbours,
    regions,
    indexOfRegion,
    bounds: boundsOf(positions),
    triangleCount: fixedTris.length,
    silhouette: silhouette(positions),
  };
}

export function boundsOf(points) {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const p of points)
    for (let k = 0; k < 3; k++) {
      if (p[k] < lo[k]) lo[k] = p[k];
      if (p[k] > hi[k]) hi[k] = p[k];
    }
  return { lo, hi };
}

/** Body outline for the no-WebGL fallback: widest x at each height, front and side. */
export function silhouette(positions, slices = 56) {
  const { lo, hi } = boundsOf(positions);
  const front = [];
  const side = [];
  for (let i = 0; i <= slices; i++) {
    const y = lo[1] + ((hi[1] - lo[1]) * i) / slices;
    let maxX = 0;
    let maxZ = 0;
    let minZ = 0;
    for (const p of positions) {
      if (Math.abs(p[1] - y) > (hi[1] - lo[1]) / slices) continue;
      if (Math.abs(p[0]) > maxX) maxX = Math.abs(p[0]);
      if (p[2] > maxZ) maxZ = p[2];
      if (p[2] < minZ) minZ = p[2];
    }
    front.push([maxX, y]);
    side.push([maxZ, minZ, y]);
  }
  return { front, side, bounds: { lo, hi } };
}
