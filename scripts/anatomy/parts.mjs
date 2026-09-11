/**
 * kinē — procedural anatomical body, part table.
 *
 * Authored from surface-landmark measurements of a 1.72 m adult. This is a
 * *deterministic* anatomical stand-in: the surface is smooth, contoured and
 * region-tagged so the clinical interaction (point precisely → highlight precisely)
 * is real, but it is not a scanned photoreal skin model. `ASSET-SPEC.md` documents
 * the contract a scanned replacement must satisfy; the region ids below are the
 * contract, so a scanned asset reuses them unchanged.
 *
 * The tables themselves live in `parts/`, one file per body region; this module only
 * decides what differs between the two bodies.
 */

import { torsoParts } from './parts/torso.mjs';
import { headParts } from './parts/head.mjs';
import { armsParts } from './parts/arms.mjs';
import { legsParts } from './parts/legs.mjs';

/**
 * @param {'male'|'female'} sex
 * @param {number} radialScale  resolution multiplier for the QA / asset builds
 */
export function bodyParts(sex = 'male', radialScale = 1) {
  const f = sex === 'female';
  const ctx = {
    f,
    q: (n) => Math.max(8, Math.round(n * radialScale)),
    // The female table differs in soft-tissue and skeletal proportion only: a wider
    // pelvis, narrower shoulders, a waist that comes in, and a bust that the trunk
    // loft has to carry. Nothing about the region ids changes.
    bust: f ? 0.034 : 0,
    waist: f ? -0.014 : 0.004,
    hipW: f ? 0.017 : 0,
    shW: f ? -0.012 : 0.008,
    muscle: f ? 0.7 : 1,
  };
  return [...torsoParts(ctx), ...headParts(ctx), ...armsParts(ctx), ...legsParts(ctx)];
}
