/**
 * kinē — part tables, split by body region so each file reads on one screen.
 * Everything here is authored against a 1.72 m adult: `t` runs along the part,
 * `az` around it, and both index the region bands in `zones.mjs`.
 */

import { loft } from '../loft.mjs';
import { b, profile } from './shapes.mjs';

export function armsParts(ctx) {
  const { muscle, q } = ctx;
  const parts = [];

  // ------------------ arms
  const armBands = [
    // Claimed before the deltoid bands: the cuff sits under the posterior deltoid, so
    // it has to win the same (t, az) window or the region never reaches the mesh.
    b('rotator-cuff', 0.04, 0.24, 140, 224, 0.004),
    b('anterior-deltoid', 0.0, 0.34, -52, 34, 0.02 * muscle),
    b('posterior-deltoid', 0.0, 0.36, 128, 232, 0.02 * muscle),
    b('lateral-deltoid', 0.02, 0.4, 52, 128, 0.02 * muscle),
    b('lateral-deltoid', 0.02, 0.4, -128, -52, 0.02 * muscle),
    b('biceps', 0.28, 0.86, -62, 44, 0.014 * muscle),
    b('triceps', 0.24, 0.9, 116, 244, 0.016 * muscle),
    b('elbow-lateral', 0.84, 1.0, 46, 118, 0.004),
    b('elbow-medial', 0.84, 1.0, -118, -46, 0.004),
    b('elbow-posterior', 0.8, 1.0, 128, 232, 0.01 * muscle),
  ];
  const forearmBands = [
    b('elbow-posterior', 0.0, 0.2, 126, 234, 0.01 * muscle),
    b('elbow-lateral', 0.0, 0.18, 44, 116),
    b('elbow-medial', 0.0, 0.18, -116, -44),
    b('forearm-extensor', 0.16, 0.86, 18, 118, 0.012 * muscle),
    b('forearm-flexor', 0.12, 0.84, -116, 18, 0.013 * muscle),
    b('wrist-dorsal', 0.84, 1.0, 26, 154),
    b('wrist-volar', 0.84, 1.0, -154, 26),
  ];
  const handBands = [
    b('wrist-volar', 0.0, 0.16, -150, 30),
    b('wrist-dorsal', 0.0, 0.16, 30, 150),
    b('hand-palm', 0.16, 1.0, -62, 62),
    b('hand-dorsum', 0.16, 1.0, 62, 298),
  ];

  for (const side of [1, -1]) {
    parts.push(
      loft({
        name: 'upperarm',
        side,
        rings: q(20),
        radial: q(26),
        capSpan: 0.05,
        path: [
          [0.172, 1.418, 0.0],
          [0.216, 1.27, -0.006],
          [0.256, 1.14, -0.012],
        ],
        radii: profile([
          [0, 0.066, 0.068],
          [0.3, 0.062, 0.064],
          [0.72, 0.049, 0.052],
          [1, 0.044, 0.044],
        ]),
        fallback: 'biceps',
        bands: armBands,
      }),
      loft({
        name: 'forearm',
        side,
        rings: q(20),
        radial: q(26),
        capSpan: 0.05,
        path: [
          [0.257, 1.14, -0.012],
          [0.272, 1.02, 0.002],
          [0.287, 0.9, 0.022],
        ],
        radii: profile([
          [0, 0.047, 0.048],
          [0.26, 0.05, 0.052],
          [0.7, 0.036, 0.037],
          [1, 0.026, 0.024],
        ]),
        fallback: 'forearm-flexor',
        bands: forearmBands,
      }),
      loft({
        name: 'hand',
        side,
        rings: q(12),
        radial: q(24),
        capSpan: 0.08,
        path: [
          [0.289, 0.893, 0.024],
          [0.297, 0.836, 0.03],
          [0.302, 0.786, 0.031],
        ],
        radii: profile([
          [0, 0.028, 0.024],
          [0.35, 0.042, 0.016],
          [0.85, 0.044, 0.015],
          [1, 0.036, 0.012],
        ]),
        fallback: 'hand-dorsum',
        bands: handBands,
      }),
      loft({
        name: 'fingers',
        side,
        rings: 10,
        radial: 12,
        capSpan: 0.16,
        path: [
          [0.288, 0.8, 0.024],
          [0.298, 0.752, 0.034],
          [0.303, 0.712, 0.038],
        ],
        radii: () => [0.026, 0.011],
        fallback: 'fingers',
        bands: [],
      }),
      loft({
        name: 'thumb',
        side,
        rings: 8,
        radial: 12,
        capSpan: 0.16,
        path: [
          [0.27, 0.855, 0.034],
          [0.25, 0.822, 0.062],
          [0.238, 0.8, 0.076],
        ],
        radii: () => [0.013, 0.012],
        fallback: 'thumb-base',
        bands: [],
      }),
    );
  }

  return parts;
}
