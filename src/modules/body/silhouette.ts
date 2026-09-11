/**
 * SVG silhouette maths for the 2D tier. The outline is measured from the same mesh that
 * ships as the GLB, so the fallback figure and the 3D figure have the same proportions,
 * and the same region ids sit on both.
 */

import type { OutlineData } from '@/lib/content';
import { outlineFor } from '@/lib/content';

export type Box = {
  width: number;
  height: number;
  scale: number;
  outline: OutlineData;
};

export function box(sex: 'male' | 'female' = 'male', height = 520): Box {
  const data = outlineFor(sex);
  const { lo, hi } = data.bounds;
  const spanY = hi[1] - lo[1];
  const spanX = Math.max(hi[0] - lo[0], 0.001);
  const scale = height / spanY;
  const width = Math.max(spanX * 2 * scale, height * 0.42);
  return { width, height, scale, outline: data };
}

export function projectX(x: number, b: Box): number {
  const { lo, hi } = b.outline.bounds;
  const centre = (lo[0] + hi[0]) / 2;
  return b.width / 2 + (x - centre) * b.scale;
}

export function projectY(y: number, b: Box): number {
  const { hi } = b.outline.bounds;
  return (hi[1] - y) * b.scale;
}

/**
 * Front outline: `outline.front` rows are [halfWidth, y]; walking up one side and down the
 * other closes the shape. `back` mirrors x so the same rows serve the posterior view.
 */
export function outlinePath(view: 'front' | 'back', b: Box): string {
  const rows = b.outline.front;
  const sign = view === 'back' ? -1 : 1;
  const up = rows.map(
    (row, i) =>
      `${i ? 'L' : 'M'}${projectX(sign * row[0], b).toFixed(2)} ${projectY(row[1], b).toFixed(2)}`,
  );
  const down = [...rows]
    .reverse()
    .map((row) => `L${projectX(-sign * row[0], b).toFixed(2)} ${projectY(row[1], b).toFixed(2)}`);
  return `${up.join('')}${down.join('')}Z`;
}

/** Side profile from the depth rows [maxZ, minZ, y]. */
export function sidePath(b: Box): string {
  const rows = b.outline.side;
  const front = rows.map(
    (row, i) =>
      `${i ? 'L' : 'M'}${projectX(row[0], b).toFixed(2)} ${projectY(row[2], b).toFixed(2)}`,
  );
  const back = [...rows]
    .reverse()
    .map((row) => `L${projectX(row[1], b).toFixed(2)} ${projectY(row[2], b).toFixed(2)}`);
  return `${front.join('')}${back.join('')}Z`;
}

/** Model-space x,y into the same SVG space the outline uses: pins and labels agree. */
export function anchorFor(
  id: string,
  view: 'front' | 'back',
  b: Box,
): { x: number; y: number; r: number } | null {
  const anchor = b.outline.anchors.find((row) => row.id === id);
  if (!anchor) return null;
  const [x, y] = view === 'back' ? anchor.back : anchor.front;
  return {
    x: projectX(x, b),
    y: projectY(y, b),
    r: Math.max(9, anchor.r * b.scale),
  };
}
