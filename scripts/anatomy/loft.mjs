/**
 * Lofting primitives for the procedural anatomical body.
 *
 * Every body part is a closed tube swept along a short path with an elliptical
 * cross-section. "Bands" do double duty: they deform the surface (a muscle belly or
 * bony prominence) and they tag the vertices with a region id. That is why the mesh
 * and `src/data/regions.json` cannot drift apart — both come from one table.
 *
 * Half-body space: `lat` is distance from the midline (positive = away from it),
 * `y` is height, `z` is anterior. `side: -1` mirrors lat for the subject's right.
 * Azimuth is measured from anterior: 0 = front, +90 = lateral, ±180 = back,
 * -90 = medial, so a band reads the same on both sides of the body.
 */

export const DEG = Math.PI / 180;

export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => mul(a, 1 / (len(a) || 1));

/** Catmull–Rom through control points at parameter u in [0,1]. */
export function pathAt(points, u) {
  const n = points.length;
  if (n === 1) return points[0];
  const f = u * (n - 1);
  const i = Math.min(n - 2, Math.floor(f));
  const t = Math.max(0, Math.min(1, f - i));
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(n - 1, i + 2)];
  const t2 = t * t;
  const t3 = t2 * t;
  const out = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    out[k] =
      0.5 *
      (2 * p1[k] +
        (-p0[k] + p2[k]) * t +
        (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
        (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
  }
  return out;
}

/** Shortest signed angular difference in degrees. */
export function angDelta(a, b) {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** Rounded caps: quarter-circle profile over the outer `span` of the part. */
export function capScale(t, span) {
  const s = span ?? 0.1;
  if (t < s) return Math.sqrt(Math.max(0, 1 - ((s - t) / s) ** 2));
  if (t > 1 - s) return Math.sqrt(Math.max(0, 1 - ((t - (1 - s)) / s) ** 2));
  return 1;
}

/**
 * @typedef {object} Band
 * @property {string} zone              region base id
 * @property {[number,number]} t        span along the part, 0..1
 * @property {[number,number]} az       span around the part, degrees
 * @property {number} [mag]             surface bulge in metres
 * @property {number} [ridge]           1 = ridge along the band centre, -1 = groove
 */

/**
 * Build one closed lofted part.
 *
 * @param {object} cfg
 * @returns {{name:string,verts:number[][],faces:number[][],tags:object[]}}
 */
export function loft(cfg) {
  const rings = cfg.rings ?? 16;
  const radial = cfg.radial ?? 28;
  const side = cfg.side ?? 0;
  const fwd = norm(cfg.fwd ?? [0, 0, 1]);
  const bands = cfg.bands ?? [];
  const fallback = cfg.fallback ?? null;
  const capSpan = cfg.capSpan === 0 ? 0 : (cfg.capSpan ?? 0.09);
  const verts = [];
  const faces = [];
  const tags = [];
  const frames = [];

  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    const c = pathAt(cfg.path, t);
    const eps = 2e-3;
    const tan = norm(
      sub(pathAt(cfg.path, Math.min(1, t + eps)), pathAt(cfg.path, Math.max(0, t - eps))),
    );
    let ant = norm(sub(fwd, mul(tan, dot(fwd, tan))));
    let lat = norm(cross(ant, tan));
    if (dot(ant, [0, 0, 1]) < 0) ant = mul(ant, -1);
    if (side !== 0 && dot(lat, [1, 0, 0]) * side < 0) lat = mul(lat, -1);
    if (side === 0) lat = [1, 0, 0];
    frames.push({ t, c, lat, ant });
    const shrink = capSpan ? capScale(t, capSpan) : 1;
    const [rxBase, rzBase] = cfg.radii(t);
    for (let k = 0; k < radial; k++) {
      const az = (k / radial) * 360 - 180; // 0 = anterior, +90 = lateral, ±180 = posterior
      const dirLat = Math.sin(az * DEG);
      const dirAnt = Math.cos(az * DEG);
      let rx = rxBase;
      let rz = rzBase;
      let zone = fallback;
      let border = 1;
      for (const band of bands) {
        if (t < band.t[0] || t > band.t[1]) continue;
        const azSpan = (band.az[1] - band.az[0]) / 2;
        const azMid = (band.az[0] + band.az[1]) / 2;
        const off = Math.abs(angDelta(az, azMid));
        if (off > azSpan) continue;
        const shaped = Math.pow(Math.cos((off / (azSpan + 1e-6)) * (Math.PI / 2)), 1.1);
        const tMid = (band.t[0] + band.t[1]) / 2;
        const tHalf = (band.t[1] - band.t[0]) / 2;
        const along = Math.max(0, 1 - Math.abs(t - tMid) / (tHalf * 1.5));
        const w = (band.mag ?? 0) * shaped * along;
        rx += w * Math.abs(dirLat) + (band.ridge ? band.ridge * 0.008 * shaped * along : 0);
        rz += w * Math.abs(dirAnt) + (band.ridge ? band.ridge * 0.008 * shaped * along : 0);
        if (zone === fallback) {
          zone = band.zone;
          const edgeT = Math.min(1, Math.min(t - band.t[0], band.t[1] - t) / (tHalf * 0.28 + 1e-6));
          const edgeAz = Math.min(1, (azSpan - off) / (azSpan * 0.3 + 1e-6));
          border = Math.max(0, Math.min(edgeT, edgeAz));
        }
      }
      const offset = add(mul(lat, rx * shrink * dirLat), mul(ant, rz * shrink * dirAnt));
      verts.push([c[0] * (side === 0 ? 1 : side) + offset[0], c[1] + offset[1], c[2] + offset[2]]);
      tags.push({ zone, border, t, az, part: cfg.name });
    }
  }

  for (let r = 0; r < rings; r++) {
    for (let k = 0; k < radial; k++) {
      const k2 = (k + 1) % radial;
      const a = r * radial + k;
      const b = r * radial + k2;
      const c = (r + 1) * radial + k;
      const d = (r + 1) * radial + k2;
      faces.push([a, c, d], [a, d, b]);
    }
  }
  // A part's handedness depends on whether its path runs up or down the body, so
  // wind each part once from geometry: faces must point away from the spine.
  {
    const mid = Math.floor((rings / 2) * radial);
    const c = frames[Math.floor(rings / 2)].c;
    const f0 = faces[0];
    const p0 = verts[f0[0]];
    const p1 = verts[f0[1]];
    const p2 = verts[f0[2]];
    const n = cross(sub(p1, p0), sub(p2, p0));
    const outward = sub(p0, [c[0] * (side === 0 ? 1 : side), c[1], c[2]]);
    if (dot(n, outward) < 0) for (const f of faces) f.reverse();
    void mid;
  }
  // Pole caps keep every part watertight; they always sit inside a neighbouring part.
  for (const ring of [frames[0], frames[frames.length - 1]]) {
    const pole = verts.length;
    verts.push([ring.c[0] * (side === 0 ? 1 : side), ring.c[1], ring.c[2]]);
    tags.push({ zone: fallback, border: 0.2, t: ring.t, az: 180, part: cfg.name });
    const base = ring.t === 0 ? 0 : rings * radial;
    const flipped =
      dot(
        cross(sub(verts[base], verts[pole]), sub(verts[base + 1], verts[pole])),
        sub(verts[base], ring.c),
      ) < 0;
    for (let k = 0; k < radial; k++) {
      const k2 = (k + 1) % radial;
      const fan = ring.t === 0 ? [pole, base + k2, base + k] : [pole, base + k, base + k2];
      if (flipped) fan.reverse();
      faces.push(fan);
    }
  }
  return { name: cfg.name, verts, faces, tags };
}
