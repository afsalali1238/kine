/** Pure types and helpers the picker needs, kept free of React so tests can use them. */

export type PickResult = {
  regionId: string;
  point: [number, number, number];
  normal: [number, number, number];
};

type GeometryLike = {
  index: { getX(i: number): number } | null;
  getAttribute(name: string): { getX(i: number): number; array: ArrayLike<number> } | undefined;
};

export type Tri = { a: number; b: number; c: number };

export function triangleAt(geometry: GeometryLike, faceIndex: number): Tri | null {
  const index = geometry.index;
  if (!index) return null;
  const base = faceIndex * 3;
  return { a: index.getX(base), b: index.getX(base + 1), c: index.getX(base + 2) };
}

export const regionByValue = new Map<number, { id: string }>();

/** Populated by `content.ts` at import time; kept out of the hot path otherwise. */
export function bindRegionIndex(rows: { id: string; regionIdValue: number }[]) {
  regionByValue.clear();
  for (const row of rows) regionByValue.set(row.regionIdValue, { id: row.id });
}

export function weightsFromPoint(
  positions: ArrayLike<number>,
  tri: Tri,
  point: [number, number, number],
): [number, number, number] {
  const distances = [tri.a, tri.b, tri.c].map((index) => {
    const dx = positions[index * 3] - point[0];
    const dy = positions[index * 3 + 1] - point[1];
    const dz = positions[index * 3 + 2] - point[2];
    return dx * dx + dy * dy + dz * dz;
  });
  const inverse = distances.map((value) => 1 / (value + 1e-7));
  const total = inverse[0] + inverse[1] + inverse[2];
  return [inverse[0] / total, inverse[1] / total, inverse[2] / total];
}

/** Snaps a hit onto the surface, offset along the triangle normal, and returns that normal. */
export function weldHit(
  point: [number, number, number],
  normal: [number, number, number],
  offset = 0.006,
): { point: [number, number, number]; normal: [number, number, number] } {
  const length = Math.hypot(normal[0], normal[1], normal[2]) || 1;
  const unit: [number, number, number] = [
    normal[0] / length,
    normal[1] / length,
    normal[2] / length,
  ];
  return {
    point: [point[0] + unit[0] * offset, point[1] + unit[1] * offset, point[2] + unit[2] * offset],
    normal: unit,
  };
}

/** A pin on the wrist must not overwhelm one on the back. */
export function pinScaleFor(areaMm2: number): number {
  const ratio = areaMm2 / 20000;
  return Math.max(0.55, Math.min(1.35, 0.62 + Math.sqrt(ratio) * 0.5));
}
