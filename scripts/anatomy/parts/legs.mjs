/**
 * kinē — part tables, split by body region so each file reads on one screen.
 * Everything here is authored against a 1.72 m adult: `t` runs along the part,
 * `az` around it, and both index the region bands in `zones.mjs`.
 */

import { loft } from '../loft.mjs';
import { b, profile } from './shapes.mjs';

export function legsParts(ctx) {
  const { muscle, q } = ctx;
  const parts = [];

  // ------------------ legs
  const thighBands = [
    b('hamstring-proximal', 0.0, 0.2, 104, 256, 0.012 * muscle),
    b('knee-anterior', 0.84, 1.0, -62, 62, 0.006),
    b('knee-medial', 0.84, 1.0, -118, -60),
    b('knee-lateral', 0.84, 1.0, 60, 118),
    b('knee-posterior', 0.84, 1.0, 124, 236, 0.004),
    b('quadriceps', 0.2, 0.86, -74, 74, 0.02 * muscle),
    b('hamstring-mid', 0.22, 0.86, 106, 254, 0.016 * muscle),
    b('it-band', 0.2, 0.92, 80, 108, 0.004),
    b('adductor', 0.24, 0.8, -108, -74, 0.008),
  ];
  const shankBands = [
    b('knee-anterior', 0.0, 0.12, -56, 56, 0.008),
    b('knee-posterior', 0.0, 0.14, 118, 242, 0.008),
    b('knee-medial', 0.0, 0.13, -114, -56),
    b('knee-lateral', 0.0, 0.13, 56, 114),
    b('patellar-tendon', 0.12, 0.3, -38, 38, 0.006),
    b('calf', 0.1, 0.62, 106, 254, 0.03 * muscle),
    b('shin', 0.16, 0.84, -66, 44, 0.004 * muscle),
    b('medial-shin', 0.2, 0.8, -96, -66),
    b('achilles', 0.5, 0.9, 134, 226, 0.004),
    b('ankle-lateral', 0.86, 1.0, 40, 112),
    b('ankle-medial', 0.86, 1.0, -112, -40),
  ];
  for (const side of [1, -1]) {
    parts.push(
      loft({
        name: 'thigh',
        side,
        rings: q(22),
        radial: q(26),
        capSpan: 0.05,
        path: [
          [0.093, 0.925, -0.008],
          [0.1, 0.7, 0.004],
          [0.104, 0.485, 0.02],
        ],
        radii: profile([
          [0, 0.098, 0.1],
          [0.28, 0.093, 0.1],
          [0.7, 0.076, 0.082],
          [1, 0.06, 0.058],
        ]),
        fallback: 'quadriceps',
        bands: thighBands,
      }),
      loft({
        name: 'shank',
        side,
        rings: q(22),
        radial: q(26),
        capSpan: 0.05,
        path: [
          [0.103, 0.495, 0.016],
          [0.09, 0.32, -0.006],
          [0.058, 0.088, -0.014],
        ],
        radii: profile([
          [0, 0.062, 0.062],
          [0.16, 0.064, 0.068],
          [0.42, 0.055, 0.068],
          [0.78, 0.037, 0.042],
          [1, 0.031, 0.032],
        ]),
        fallback: 'shin',
        bands: shankBands,
      }),
      loft({
        name: 'foot',
        side,
        rings: q(14),
        radial: q(22),
        capSpan: 0.1,
        fwd: [0, 1, 0],
        path: [
          [0.057, 0.082, -0.05],
          [0.06, 0.05, -0.01],
          [0.062, 0.034, 0.055],
          [0.062, 0.03, 0.095],
        ],
        radii: profile([
          [0, 0.045, 0.049],
          [0.3, 0.05, 0.03],
          [0.75, 0.052, 0.021],
          [1, 0.05, 0.018],
        ]),
        fallback: 'forefoot',
        bands: [
          b('heel', 0.0, 0.26, 118, 242, 0.014),
          b('plantar-arch', 0.26, 0.72, 116, 244),
          b('ankle-medial', 0.0, 0.22, -112, -50),
          b('ankle-lateral', 0.0, 0.22, 50, 112),
          b('instep', 0.2, 0.72, -60, 60),
        ],
      }),
      loft({
        name: 'toes',
        side,
        rings: 6,
        radial: 14,
        capSpan: 0.2,
        fwd: [0, 1, 0],
        path: [
          [0.062, 0.031, 0.09],
          [0.062, 0.026, 0.126],
        ],
        radii: () => [0.043, 0.016],
        fallback: 'toes',
        bands: [],
      }),
    );
  }

  return parts;
}
