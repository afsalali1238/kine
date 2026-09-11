/**
 * kinē — part tables, split by body region so each file reads on one screen.
 * Everything here is authored against a 1.72 m adult: `t` runs along the part,
 * `az` around it, and both index the region bands in `zones.mjs`.
 */

import { loft } from '../loft.mjs';
import { b, profile } from './shapes.mjs';

export function torsoParts(ctx) {
  const { bust, waist, hipW, shW, muscle, q } = ctx;
  const parts = [];

  // ------------------ torso
  parts.push(
    loft({
      name: 'torso',
      side: 0,
      rings: q(26),
      radial: q(46),
      capSpan: 0.03,
      path: [
        [0, 0.85, 0],
        [0, 1.02, -0.006],
        [0, 1.22, 0.002],
        [0, 1.38, 0.0],
        [0, 1.5, -0.006],
      ],
      radii: profile([
        [0, 0.148 + hipW, 0.116],
        [0.22, 0.132 + waist, 0.108],
        [0.5, 0.146, 0.118],
        [0.68, 0.16 + shW, 0.128 + bust * 0.4],
        [0.82, 0.186 + shW, 0.118],
        [0.92, 0.178 + shW, 0.104],
        [1, 0.104, 0.088],
      ]),
      fallback: 'upper-abdomen',
      bands: [
        b('ac-joint', 0.8, 0.95, 40, 82, 0.004),
        b('ac-joint', 0.8, 0.95, -82, -40, 0.004),
        b('trapezius-upper', 0.86, 1.0, 34, 128, 0.014 * muscle),
        b('trapezius-upper', 0.86, 1.0, -128, -34, 0.014 * muscle),
        b('lumbar-spine', 0.04, 0.4, 140, 220, 0.004),
        b('thoracic-spine', 0.4, 0.66, 140, 220, 0.004),
        b('rhomboid', 0.66, 0.86, 138, 222, 0.006),
        b('scapula', 0.66, 0.92, 44, 134, 0.012 * muscle),
        b('scapula', 0.66, 0.92, -134, -44, 0.012 * muscle),
        b('pectoral', 0.6, 0.84, 14, 74, bust + 0.012 * muscle),
        b('pectoral', 0.6, 0.84, -74, -14, bust + 0.012 * muscle),
        b('costal-margin', 0.28, 0.6, 42, 104, 0.006),
        b('costal-margin', 0.28, 0.6, -104, -42, 0.006),
        b('oblique', 0.1, 0.6, 106, 142, 0.004),
        b('oblique', 0.1, 0.6, -142, -106, 0.004),
        b('upper-abdomen', 0.34, 0.6, -38, 38, 0.004),
        b('lower-abdomen', 0.04, 0.34, -44, 44, 0.002),
      ],
    }),
  );

  // ------------------ pelvis
  parts.push(
    loft({
      name: 'pelvis',
      side: 0,
      rings: q(14),
      radial: q(44),
      capSpan: 0.06,
      path: [
        [0, 0.76, -0.004],
        [0, 0.87, 0],
        [0, 0.97, 0.002],
        [0, 1.03, 0],
      ],
      radii: profile([
        [0, 0.132, 0.104],
        [0.35, 0.158 + hipW, 0.116],
        [0.75, 0.166 + hipW, 0.118],
        [1, 0.15 + hipW, 0.11],
      ]),
      fallback: 'hip-anterior',
      bands: [
        b('hamstring-proximal', 0.0, 0.42, 112, 168, 0.014 * muscle),
        b('hamstring-proximal', 0.0, 0.42, -168, -112, 0.014 * muscle),
        b('gluteus-maximus', 0.16, 0.78, 108, 162, 0.036),
        b('gluteus-maximus', 0.16, 0.78, -162, -108, 0.036),
        b('sacrum', 0.45, 0.95, 152, 208, 0.002),
        b('si-joint', 0.5, 0.95, 124, 152),
        b('si-joint', 0.5, 0.95, -152, -124),
        b('gluteus-medius', 0.72, 1.0, 78, 116, 0.012),
        b('gluteus-medius', 0.72, 1.0, -116, -78, 0.012),
        b('hip-lateral', 0.3, 0.78, 62, 86, 0.006),
        b('hip-lateral', 0.3, 0.78, -86, -62, 0.006),
        b('hip-anterior', 0.5, 1.0, -58, 58, 0.004),
      ],
    }),
  );

  // ------------------ trapezius slope
  for (const side of [1, -1]) {
    parts.push(
      loft({
        name: 'trapezius',
        side,
        rings: 10,
        radial: 18,
        capSpan: 0.12,
        path: [
          [0.02, 1.492, -0.012],
          [0.085, 1.462, -0.012],
          [0.152, 1.425, -0.006],
        ],
        radii: () => [0.05, 0.055],
        fallback: 'trapezius-upper',
        bands: [],
      }),
    );
  }

  return parts;
}
