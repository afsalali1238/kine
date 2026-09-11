/**
 * The asset half of the content gate: what ships must match what the generator measured,
 * and the dose ceiling the programme builder is allowed to assemble must stay reachable
 * from the data. Split out of `validate-content.mjs` so the gate reads as two screens.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Media budget (§5.3) plus mesh/region agreement. Returns the animation payload size. */
export function checkAssets({ ROOT, DATA, fail, regions }) {
  const bytes = fs.statSync(path.join(DATA, 'animations.json')).size;
  if (bytes > 1_000_000) {
    fail(`animations.json is ${(bytes / 1e6).toFixed(2)} MB; the budget is 1 MB for all exercises`);
  }

  // The shipped mesh and the region table must agree, or picking silently mislabels.
  const reportPath = path.join(ROOT, 'public', 'models', 'ASSET-REPORT.json');
  if (fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    if (report.regions !== regions.length) {
      fail(
        `mesh carries ${report.regions} regions, regions.json has ${regions.length} ` +
          '— re-run assets:build then content:build',
      );
    }
    const values = new Set(regions.map((r) => r.regionIdValue));
    if (values.size !== regions.length) fail('regionIdValue collisions in regions.json');
  }

  return bytes;
}

/** A session is capped at 4 exercises and 15 minutes by rule; no exercise may need 10. */
export function checkDoseCeiling({ fail, exercises }) {
  for (const e of exercises) {
    const perRep = (e.tempo.eccentricMs + e.tempo.pauseMs + e.tempo.concentricMs) / 1000;
    const seconds =
      e.sets * (e.reps ? e.reps * perRep : (e.holdSeconds ?? 20) * 1) +
      Math.max(0, e.sets - 1) * e.restSeconds;
    if (seconds > 600) {
      fail(
        `${e.id}: ${Math.round(seconds / 60)} min of work exceeds the 10-minute ` +
          'per-exercise ceiling',
      );
    }
  }
}
