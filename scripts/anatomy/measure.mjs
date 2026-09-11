/**
 * What the mesh says about itself. Both records are read off the built geometry, so the
 * region table, the camera focus and the 2D fallback can never disagree with the asset the
 * patient actually loaded — that agreement is the whole point of generating the body.
 */

import { expandZones } from './zones.mjs';

/** One row per region: measured area, vertex share, centroid, tappable radius, neighbours. */
export function regionRecords(body) {
  const zones = expandZones();
  const byId = new Map(zones.map((z) => [z.id, z]));
  const out = [];
  for (const region of body.regions) {
    const id = region.id;
    const stat = body.stats.get(body.indexOfRegion.get(id));
    const meta = byId.get(id);
    if (!stat || !meta) continue;
    const radius = Math.sqrt(stat.count / Math.PI) * 0.02 + 0.055;
    const neighbours = [...(body.neighbours.get(body.indexOfRegion.get(id)) ?? [])]
      .map((n) => body.regions[n - 1]?.id)
      .filter(Boolean)
      .slice(0, 10);
    out.push({
      id,
      regionIdValue: body.indexOfRegion.get(id),
      base: meta.base,
      label: meta.label,
      labelAr: meta.labelAr,
      family: meta.family,
      side: meta.side,
      views: meta.views.filter((v) => stat.views.has(v) || v === 'top'),
      group: meta.family,
      synonyms: meta.synonyms,
      vertexCount: stat.count,
      triangles: stat.tris,
      areaMm2: Math.round(stat.area * 1e6),
      centroid: stat.c.map((v) => Number(v.toFixed(4))),
      focusTarget: stat.c.map((v) => Number(v.toFixed(3))),
      focusRadius: Number(radius.toFixed(3)),
      focusDistance: Number(Math.max(0.42, radius * 3.1).toFixed(3)),
      neighbours,
      presentationIds: [],
    });
  }
  return out;
}

/** The 2D tier: a silhouette per sex plus one anchor per region, from the same stats. */
export function outline(body) {
  const { front, side, bounds } = body.silhouette;
  const toPath = (rows, pick) =>
    rows.map((r) => [Number(r[0].toFixed(4)), Number(r[1].toFixed(4)), pick?.(r)]);
  return {
    bounds: {
      lo: bounds.lo.map((v) => Number(v.toFixed(4))),
      hi: bounds.hi.map((v) => Number(v.toFixed(4))),
    },
    front: toPath(front, (r) => r[1]),
    side,
    anchors: body.regions
      .map((region, i) => {
        const stat = body.stats.get(i + 1);
        if (!stat) return null;
        return {
          id: region.id,
          front: [Number(stat.c[0].toFixed(4)), Number(stat.c[1].toFixed(4))],
          back: [Number(-stat.c[0].toFixed(4)), Number(stat.c[1].toFixed(4))],
          r: Math.max(0.018, Math.min(0.075, Math.sqrt(stat.count / Math.PI) * 0.012)),
        };
      })
      .filter(Boolean),
  };
}
