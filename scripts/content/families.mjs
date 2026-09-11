/**
 * Region-family vocabularies for the adaptive intake (M2) and the transparent scoring
 * of M4. A chip is a movement or position a patient recognises; `worse` and `better`
 * say which patterns it points at. Weights are intentionally small integers so a
 * clinician can read the whole rule set in one screen.
 */

import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const read = (p) => JSON.parse(fs.readFileSync(path.join(HERE, p), 'utf8'));

/** @typedef {{key:string,label:string,labelAr:string,worse?:string[],better?:string[]}} Chip */

/** Lifted to `data/families.json` so the table is reviewed as data. */
export const FAMILIES = read('data/families.json');

/** Every aggravating/easing chip key the rule set can use, per family. */
export function chipKeys(family) {
  return (FAMILIES[family] ?? FAMILIES['lower-back']).chips.map((c) => c.key);
}

/**
 * Build the scored rule set: v1's authored weights preserved, chip weights layered on,
 * region affinity handled in the matcher (it is a property of the region, not the rule).
 */
export function buildRules(presentations, v1rules) {
  const byPresentation = new Map(v1rules.map((r) => [r.presentationId, r]));
  const chipsByFamily = new Map();
  for (const [family, spec] of Object.entries(FAMILIES)) {
    chipsByFamily.set(family, spec.chips);
  }
  return presentations
    .filter((p) => !p.guidanceOnly)
    .map((p) => {
      const base = byPresentation.get(p.id);
      const aggravators = { ...(base?.aggravators ?? {}) };
      const easers = { ...(base?.easers ?? {}) };
      const families = p.families?.length ? p.families : [p.family];
      for (const family of families) {
        for (const chip of chipsByFamily.get(family) ?? []) {
          if (chip.worse?.includes(p.id))
            aggravators[chip.key] = Math.max(aggravators[chip.key] ?? 0, 4);
          if (chip.better?.includes(p.id)) easers[chip.key] = Math.max(easers[chip.key] ?? 0, 3);
        }
      }
      return {
        presentationId: p.id,
        family: p.family,
        families,
        group: p.family,
        baseScore: base?.baseScore ?? 1,
        aggravators,
        easers,
        neuroWeight: base?.neuroWeight ?? (p.nerveWatch ? 7 : -1),
        gradualWeight: base?.gradualWeight ?? (p.tendon ? 2 : 0),
        incidentWeight:
          base?.incidentWeight ?? (p.id === 'ankle-sprain' || p.id === 'groin-strain' ? 5 : 0),
      };
    });
}
