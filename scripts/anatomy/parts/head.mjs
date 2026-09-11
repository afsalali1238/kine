/**
 * kinē — part tables, split by body region so each file reads on one screen.
 * Everything here is authored against a 1.72 m adult: `t` runs along the part,
 * `az` around it, and both index the region bands in `zones.mjs`.
 */

import { loft } from '../loft.mjs';
import { b, profile } from './shapes.mjs';

export function headParts(ctx) {
  const { q } = ctx;
  const parts = [];

  // ------------------ neck, head, jaw, ear
  parts.push(
    loft({
      name: 'neck',
      side: 0,
      rings: q(12),
      radial: q(28),
      capSpan: 0.04,
      path: [
        [0, 1.4, 0],
        [0, 1.47, -0.006],
        [0, 1.54, -0.004],
      ],
      radii: profile([
        [0, 0.072, 0.062],
        [0.5, 0.053, 0.05],
        [1, 0.049, 0.046],
      ]),
      fallback: 'cervical-lower',
      bands: [
        b('cervical-upper', 0.45, 1.0, 135, 225, 0.004),
        b('cervical-lower', 0.0, 0.45, 135, 225, 0.004),
        b('sterno', 0.05, 0.7, -52, 52, 0.002),
        b('trapezius-upper', 0.0, 0.4, 95, 135),
        b('trapezius-upper', 0.0, 0.4, -135, -95),
      ],
    }),
  );

  parts.push(
    loft({
      name: 'skull',
      side: 0,
      rings: q(20),
      radial: q(36),
      capSpan: 0.0,
      path: [
        [0, 1.545, -0.006],
        [0, 1.615, 0.004],
        [0, 1.68, 0.0],
        [0, 1.72, -0.006],
      ],
      radii: profile([
        [0, 0.0001, 0.0001],
        [0.18, 0.07, 0.078],
        [0.45, 0.082, 0.092],
        [0.72, 0.083, 0.09],
        [0.92, 0.062, 0.066],
        [1, 0.0001, 0.0001],
      ]),
      fallback: 'face',
      bands: [
        b('forehead', 0.52, 0.8, -52, 52, 0.004),
        b('scalp-top', 0.8, 1.0, -180, 180, 0.002),
        b('occiput', 0.42, 0.8, 128, 232, 0.006),
        b('temple', 0.45, 0.68, 56, 112),
        b('temple', 0.45, 0.68, -112, -56),
        b('scalp-side', 0.55, 0.8, 112, 128),
        b('scalp-side', 0.55, 0.8, -128, -112),
        b('ear', 0.3, 0.55, 74, 108, 0.007),
        b('ear', 0.3, 0.55, -108, -74, 0.007),
        b('face', 0.12, 0.5, -58, 58, 0.004),
      ],
    }),
  );

  parts.push(
    loft({
      name: 'jaw',
      side: 0,
      rings: q(12),
      radial: q(30),
      capSpan: 0.0,
      path: [
        [0, 1.575, -0.02],
        [0, 1.545, 0.006],
        [0, 1.512, 0.03],
        [0, 1.497, 0.055],
      ],
      radii: profile([
        [0, 0.0001, 0.0001],
        [0.25, 0.075, 0.072],
        [0.6, 0.062, 0.062],
        [0.85, 0.034, 0.036],
        [1, 0.0001, 0.0001],
      ]),
      fallback: 'jaw',
      bands: [b('face', 0.7, 1.0, -60, 60, 0.002)],
    }),
  );

  for (const side of [1, -1]) {
    parts.push(
      loft({
        name: 'ear',
        side,
        rings: 6,
        radial: 14,
        capSpan: 0.14,
        path: [
          [0.075, 1.585, -0.004],
          [0.085, 1.583, -0.009],
        ],
        radii: () => [0.005, 0.017],
        fallback: 'ear',
        bands: [],
      }),
    );
  }

  return parts;
}
