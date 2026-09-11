/**
 * Movement templates (M6/M7).
 *
 * Therapeutic exercise is prescribed as joint angles, so a demonstration is data:
 * "shoulder abduction to 90° over 3 s" *is* the clip. Each template below declares the
 * joint ranges, the two camera angles, the muscle to light up, and one common fault as
 * a delta on the same tracks. A clinician edits `deg` in this file (or in the animator)
 * and the demonstration changes — no re-render, no reshoot.
 *
 * `range` values are degrees and are validated against the ROM table in skeleton.json.
 */

import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const read = (p) => JSON.parse(fs.readFileSync(path.join(HERE, p), 'utf8'));

/**
 * Ordered list: the first entry whose `re` matches the exercise name wins.
 * `mirror` marks movements where the affected side comes from the user's pin.
 */
/**
 * Lifted to `data/templates.json` (2,400 lines of movement vocabulary is data, not code).
 * `pattern`/`flags` arrive as text and are compiled here; array order is match priority.
 */
export const TEMPLATES = read('data/templates.json').map((t) => ({
  ...t,
  re: new RegExp(t.pattern, t.flags),
}));

/** Fallback template so no published exercise ends up without a demonstration. */
/** Lifted to `data/generic.json`; the module keeps the shape, the file keeps the prose. */
export const GENERIC = read('data/generic.json');

/** Keywords that mean "this movement cannot be honestly rig-driven" (§5.4). */
export const NON_RIG = /breathing|nerve glide|glide|balance|carry|pendulum|rest$/i;

export function templateFor(name) {
  return TEMPLATES.find((t) => t.re.test(name)) ?? null;
}
