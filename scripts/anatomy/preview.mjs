/**
 * Software rasteriser for build-time QA of the generated body.
 *
 * Not shipped to the browser. It answers the one question a geometry script cannot:
 * "does this read as a body, and does each region land where the anatomy says it
 * should?" Output panels: shaded front, shaded three-quarter, region colour map,
 * highlight isolation for a chosen region.
 */

const shade = (n, l) => Math.max(0, n[0] * l[0] + n[1] * l[1] + n[2] * l[2]);

function project(p, yaw, pitch) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x = p[0] * cy + p[2] * sy;
  const z = -p[0] * sy + p[2] * cy;
  const y = p[1] * cp - z * sp;
  const depth = p[1] * sp + z * cp;
  return [x, y, depth];
}

/**
 * @param {object} body mesh from buildBody()
 * @param {object} opts
 * @returns {{width:number,height:number,rgba:Uint8Array}}
 */
export function renderPanels(body, opts = {}) {
  const W = opts.width ?? 360;
  const H = opts.height ?? 470;
  const gap = 26;
  const width = W * 5 + gap * 6;
  const height = H + gap * 2;
  const rgba = new Uint8Array(width * height * 4).fill(236);
  const depth = new Float32Array(width * height).fill(-Infinity);
  const center = [
    (body.bounds.lo[0] + body.bounds.hi[0]) / 2,
    (body.bounds.lo[1] + body.bounds.hi[1]) / 2,
    (body.bounds.lo[2] + body.bounds.hi[2]) / 2,
  ];
  const span = Math.max(body.bounds.hi[1] - body.bounds.lo[1], 1e-6);
  const scale = (H * 0.9) / span;
  const panels = [
    { yaw: 0, pitch: 0.04, mode: 'shade' },
    { yaw: -0.9, pitch: 0.1, mode: 'shade' },
    { yaw: Math.PI, pitch: 0.06, mode: 'shade' },
    { yaw: 0, pitch: 0.04, mode: 'region' },
    { yaw: Math.PI, pitch: 0.04, mode: opts.highlight ? `highlight:${opts.highlight}` : 'region' },
  ];

  body.tris.forEach((tri) => {
    const pts = tri.map((i) => body.positions[i]);
    const nrm = normalize(
      cross(
        sub(body.positions[tri[1]], body.positions[tri[0]]),
        sub(body.positions[tri[2]], body.positions[tri[0]]),
      ),
      body.normals[tri[0]],
    ) ?? [0, 0, 1];
    panels.forEach((panel, pi) => {
      const ox = gap + pi * (W + gap);
      const oy = gap;
      const proj = pts.map((p) =>
        project([p[0] - center[0], p[1] - center[1], p[2] - center[2]], panel.yaw, panel.pitch),
      );
      const color = panelColor(panel.mode, body, tri[0], nrm);
      const xs = proj.map((p) => ox + W / 2 + p[0] * scale);
      const ys = proj.map((p) => oy + H / 2 - p[1] * scale);
      const zs = proj.map((p) => p[2]);
      const minX = Math.max(0, Math.floor(Math.min(...xs)));
      const maxX = Math.min(width - 1, Math.ceil(Math.max(...xs)));
      const minY = Math.max(0, Math.floor(Math.min(...ys)));
      const maxY = Math.min(height - 1, Math.ceil(Math.max(...ys)));
      const [ax, ay] = [xs[0] - xs[2], ys[0] - ys[2]];
      const [bx, by] = [xs[1] - xs[2], ys[1] - ys[2]];
      const det = ax * by - bx * ay;
      if (Math.abs(det) < 1e-9) return;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const px = x + 0.5 - xs[2];
          const py = y + 0.5 - ys[2];
          const u = (px * by - py * bx) / det;
          const v = (py * ax - px * ay) / det;
          if (u < 0 || v < 0 || u + v > 1) continue;
          const z = zs[0] * u + zs[1] * v + zs[2] * (1 - u - v);
          const idx = y * width + x;
          if (z <= depth[idx]) continue;
          depth[idx] = z;
          const off = idx * 4;
          rgba[off] = color[0];
          rgba[off + 1] = color[1];
          rgba[off + 2] = color[2];
          rgba[off + 3] = 255;
        }
      }
    });
  });
  return { width, height, rgba };
}

function panelColor(mode, body, vi, nrm) {
  if (mode === 'region') {
    const id = body.regionIds[vi];
    const h = (id * 2654435761) % 360;
    return hsv(h / 360, 0.55, 0.82).map((c, i) => (i === 2 ? c * 0.95 + 60 : c));
  }
  if (mode.startsWith('highlight:')) {
    const want = body.indexOfRegion.get(mode.split(':')[1]) ?? -1;
    if (body.regionIds[vi] !== want) {
      const l = 40 + shade(nrm, [-0.4, 0.7, 0.6]) * 90;
      return [l * 0.9, l * 0.95, l];
    }
    return [214, 96, 44];
  }
  const lambert = shade(nrm, [-0.4, 0.55, 0.72]) * 0.75 + 0.3;
  const rim = Math.pow(1 - Math.abs(nrm[2]), 2) * 0.22;
  return [228 * lambert + rim * 190, 178 * lambert + rim * 90, 158 * lambert + rim * 60].map(
    Math.round,
  );
}

function hsv(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const pick = [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q],
  ][i % 6];
  return pick.map((c) => Math.round(c * 255));
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
function normalize(a, fallback) {
  const l = Math.hypot(a[0], a[1], a[2]);
  if (l < 1e-9) return fallback && Math.hypot(...fallback) > 0.5 ? fallback : [0, 0, 1];
  return [a[0] / l, a[1] / l, a[2] / l];
}
