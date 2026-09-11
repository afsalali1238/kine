/**
 * kinē — content build.
 *
 * Migrates v1's reviewed clinical content into the v2 schemas, re-targets regions,
 * generates joint-angle timelines from movement templates, and writes the coverage
 * report the validator enforces. Everything a clinician is expected to edit lives in
 * these JSON files, so no content change requires touching code.
 *
 *   node scripts/build-content.mjs            regenerate; changed clips drop to draft
 *   node scripts/build-content.mjs --sign     stamp the current clips as reviewed
 */

import fs from 'node:fs';
import path from 'node:path';
import { buildPresentations } from './content/presentations.mjs';
import { buildRules, FAMILIES } from './content/families.mjs';
import { migrate, targetRegionsFor } from './content/exercises.mjs';
import { buildAnimations, mediaKindFor } from './content/animations.mjs';
import { REGION_MAP } from './content/region-map.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'src', 'data');
const read = (p) => JSON.parse(fs.readFileSync(path.join(DATA, p), 'utf8'));
const write = (p, value) =>
  fs.writeFileSync(path.join(DATA, p), `${JSON.stringify(value, null, 2)}\n`);

const SIGN = process.argv.includes('--sign');

function main() {
  const v1presentations = read('v1/presentations.json');
  const v1rules = read('v1/matching-rules.json');
  const v1exercises = read('v1/exercises.json');
  const regions = read('regions.json');
  const skeleton = read('skeleton.json');

  const presentations = buildPresentations(v1presentations);

  // Region → presentation binding, from the surface table, plus per-region affinity.
  const bound = regions.map((r) => {
    const meta = REGION_MAP[r.base];
    if (!meta) throw new Error(`region ${r.id}: base ${r.base} has no presentation mapping`);
    return {
      ...r,
      family: meta.family,
      group: meta.family,
      presentationIds: meta.presentations,
      affinity: meta.affinity ?? {},
      redirect: meta.redirect ?? null,
      emptyState: null,
    };
  });

  // Guidance-only patterns get an explicit "here is what to do instead" state so that
  // no region can ever lead to an empty screen (§8).
  for (const p of presentations) {
    if (!p.guidanceOnly && !p.redirect) continue;
    for (const r of bound) {
      if (!r.presentationIds.includes(p.id)) continue;
      r.emptyState = {
        kind: p.redirect ? 'redirect' : 'guidance',
        headline: 'Nothing in the exercise library is aimed at this spot yet',
        headlineAr: null,
        body: p.cue ?? p.explanation,
        redirectTo: p.redirect ?? null,
        seeAlso: p.helps ?? null,
      };
    }
  }

  const presById = new Map(presentations.map((p) => [p.id, p]));
  const rules = buildRules(presentations, v1rules);
  const { exercises: migrated, warnings } = migrate(v1exercises, presentations, bound);

  // Borrowed ladders: a new pattern inherits the pool of the pattern it shares its
  // movement family with, then its own sites, caps and contraindications apply.
  const withShares = migrated.map((ex) => {
    const ids = new Set(ex.presentationIds);
    for (const p of presentations) {
      if ((p.shares ?? []).some((src) => ids.has(src))) ids.add(p.id);
    }
    for (const pid of [...ids]) {
      const p = presById.get(pid);
      if (p?.guidanceOnly && ids.size > 1) ids.delete(pid);
    }
    return { ...ex, presentationIds: [...ids] };
  });
  const retargeted = withShares.map((ex) => ({
    ...ex,
    targetRegions: targetRegionsFor(ex, presentations, bound),
  }));
  const withMedia = retargeted.map((ex) => ({ ...ex, mediaKind: mediaKindFor(ex) }));

  // Presentation caps narrow the demonstrated range: the same bridge shows a different
  // arc for a flexion-preferring back than for an SI joint.
  const withCaps = withMedia.map((ex) => {
    const caps = {};
    for (const pid of ex.presentationIds) {
      const p = presentations.find((x) => x.id === pid);
      for (const [joint, axes] of Object.entries(p?.caps ?? {})) {
        caps[joint] = caps[joint] ?? {};
        for (const [axis, range] of Object.entries(axes)) {
          const lo = Math.min(caps[joint][axis]?.[0] ?? range[0], range[0]);
          const hi = Math.min(caps[joint][axis]?.[1] ?? range[1], range[1]);
          caps[joint][axis] = [Math.max(lo, -180), Math.max(hi, 0)];
        }
      }
    }
    return { ...ex, rangeCaps: caps };
  });

  const previous = new Map();
  if (fs.existsSync(path.join(DATA, 'animations.json'))) {
    for (const a of read('animations.json')) previous.set(a.exerciseId, a);
  }
  const { animations, errors, unmatched } = buildAnimations({
    exercises: withCaps,
    presentations,
    skeleton,
    previous,
  });
  const published = animations.map((a) =>
    SIGN
      ? { ...a, status: 'published', reviewedBy: a.reviewedBy ?? 'signed-off: build --sign' }
      : a,
  );

  const animationById = new Map(published.map((a) => [a.exerciseId, a]));
  // An exercise is only ever as reviewed as its demonstration: an unsigned clip shows
  // the pending badge in the player instead of pretending to be clinical content.
  const finalExercises = withCaps.map((e) => ({
    ...e,
    status: 'published',
    mediaApproved: animationById.get(e.id)?.status === 'published',
  }));

  // Region → programme pool. `targetRegions` on an exercise is the *anatomical focus*
  // (deliberately short, it drives the muscle highlight); this is the resolution used
  // for coverage, so a region can never lead to an empty screen.
  const pool = new Map(bound.map((r) => [r.id, new Set()]));
  for (const ex of finalExercises) {
    if (ex.status !== 'published') continue;
    for (const pid of ex.presentationIds) {
      for (const r of bound) {
        if (r.presentationIds.includes(pid)) pool.get(r.id).add(ex.id);
      }
    }
  }
  const withCoverage = bound.map((r) => ({
    ...r,
    exerciseIds: [...(pool.get(r.id) ?? [])].sort(),
    targetRegionOf: undefined,
  }));
  for (const r of withCoverage) delete r.targetRegionOf;
  const stillEmpty = withCoverage.filter((r) => !r.exerciseIds.length && !r.emptyState);
  if (stillEmpty.length) {
    for (const r of stillEmpty) {
      const alt = r.presentationIds
        .map((pid) => presentations.find((p) => p.id === pid))
        .find(Boolean);
      r.emptyState = {
        kind: 'guidance',
        headline: 'Nothing in the exercise library is aimed at this spot yet',
        headlineAr: null,
        body: alt?.helps ?? 'Move gently and get it looked at if it is not settling.',
        redirectTo: r.redirect ?? null,
        seeAlso: alt?.helps ?? null,
      };
    }
  }
  write('presentations.json', presentations);
  write('regions.json', withCoverage);
  write('matching-rules.json', rules);
  write('exercises.json', finalExercises);
  write('animations.json', published);
  write('families.json', {
    version: 2,
    families: Object.fromEntries(
      Object.entries(FAMILIES).map(([id, f]) => [
        id,
        {
          label: f.label,
          labelAr: f.labelAr,
          chips: f.chips.map((c) => ({
            key: c.key,
            label: c.label,
            labelAr: c.labelAr,
            worse: c.worse ?? [],
            better: c.better ?? [],
          })),
        },
      ]),
    ),
  });
  write('anchors.json', anchorsFor(bound));
  write('demo-seed.json', demoSeed(finalExercises));
  writeCoverage({
    regions: withCoverage,
    exercises: finalExercises,
    animations: published,
    presentations,
  });
  if (errors.length) {
    console.error('animation errors:\n  ' + errors.slice(0, 20).join('\n  '));
    process.exitCode = 1;
  }
  if (unmatched.length) {
    console.warn(
      `${unmatched.length} exercises fell back to the generic template: ` +
        `${[...new Set(unmatched)].slice(0, 8).join(', ')}`,
    );
  }
  for (const w of warnings.slice(0, 6)) console.warn(`migration: ${w}`);
  console.log(
    `content: ${finalExercises.length} exercises, ${presentations.length} presentations, ` +
      `${bound.length} regions, ${published.length} timelines ` +
      `(${published.filter((a) => a.status === 'published').length} published${SIGN ? ', signed now' : ''})`,
  );
}

import { anchorsFor, demoSeed } from './content/seed.mjs';
import { writeCoverage } from './content/coverage.mjs';

main();
