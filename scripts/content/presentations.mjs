/**
 * Clinical presentations (M4).
 *
 * The 28 patterns authored in v1 are carried over verbatim — same ids, same plain
 * language — so reviewed content is not silently rewritten. `clinical` blocks are new
 * in v2: they carry the region sites, movement weights, phase ceilings and range caps
 * that let the *same* exercise ladder produce a different programme for an anterior
 * knee than for a posterior one.
 */

import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const read = (p) => JSON.parse(fs.readFileSync(path.join(HERE, p), 'utf8'));

import { REGION_MAP } from './region-map.mjs';

/** Families whose chip vocabulary a pattern's rules may use. */
function familiesFor(sites, fallback) {
  const out = new Set();
  for (const base of sites) {
    const fam = REGION_MAP[base]?.family;
    if (fam) out.add(fam);
  }
  if (!out.size) out.add(fallback ?? 'lower-back');
  return [...out];
}

/** id → v2 clinical profile. `sites` are region base ids from scripts/anatomy/zones.mjs */
/** Lifted to `data/profiles.json` so the table is reviewed as data. */
export const PROFILES = read('data/profiles.json');

/**
 * New patterns that do not yet own a ladder borrow one, deliberately and visibly: the
 * programme then differs by range caps, dose and contraindications rather than by a
 * freshly invented exercise list. `shares` is surfaced in MEDIA-COVERAGE.md.
 */
/** Lifted to `data/presentation-shares.json` so the table is reviewed as data. */
export const SHARES = read('data/presentation-shares.json');

/** Arabic display names for the pattern list (chrome-level: correct or absent). */
/** Lifted to `data/presentation-names-ar.json` so the table is reviewed as data. */
export const NAMES_AR = read('data/presentation-names-ar.json');

/** Lifted to `data/presentation-extra.json` so the table is reviewed as data. */
export const EXTRA = read('data/presentation-extra.json');

/**
 * @param {object[]} preserved v1 presentation records (verbatim clinical text)
 */
export function buildPresentations(preserved) {
  const byId = new Map(preserved.map((p) => [p.id, p]));
  const out = [];
  const seen = new Set();
  void byId;
  const push = (rec) => {
    if (seen.has(rec.id)) return;
    seen.add(rec.id);
    out.push(rec);
  };
  for (const v of preserved) {
    const profile = PROFILES[v.id] ?? {};
    push({
      ...v,
      nameAr: NAMES_AR[v.id] ?? v.nameAr ?? null,
      family: familyFromSites(profile.sites ?? []),
      sites: profile.sites ?? [v.group],
      prefer: profile.prefer ?? [],
      caps: profile.caps ?? {},
      guidanceOnly: !!profile.guidanceOnly,
      tendon: !!profile.tendon,
      nerveWatch: !!profile.nerveWatch,
      reviewSoon: !!profile.reviewSoon,
      maxPhase: profile.maxPhase ?? null,
      lockPhases: profile.lockPhases ?? [],
      cue: profile.cue ?? null,
      redirect: profile.redirect ?? null,
      shares: profile.shares ?? SHARES[v.id] ?? [],
      families: familiesFor(profile.sites ?? [], v.group),
    });
  }
  for (const [id, profile] of Object.entries(PROFILES)) {
    if (byId.has(id) || id === 'shoulder-cuff-name') continue;
    const extra = EXTRA[id] ?? {};
    push({
      id,
      group: familyFromSites(profile.sites ?? []),
      family: familyFromSites(profile.sites ?? []),
      name: extra.name ?? id,
      explanation: extra.explanation ?? '',
      course: extra.course ?? '',
      helps: extra.helps ?? '',
      nameAr: NAMES_AR[id] ?? null,
      sites: profile.sites ?? [],
      prefer: profile.prefer ?? [],
      caps: profile.caps ?? {},
      guidanceOnly: !!profile.guidanceOnly,
      tendon: !!profile.tendon,
      nerveWatch: !!profile.nerveWatch,
      reviewSoon: !!profile.reviewSoon,
      maxPhase: profile.maxPhase ?? null,
      lockPhases: profile.lockPhases ?? [],
      cue: profile.cue ?? null,
      redirect: profile.redirect ?? null,
      shares: profile.shares ?? SHARES[id] ?? [],
    });
  }
  return out.filter((p) => p.name && p.explanation);
}

/** A presentation belongs to the family its dominant site region belongs to. */
function familyFromSites(sites) {
  const counts = new Map();
  for (const base of sites) {
    const fam = REGION_MAP[base]?.family;
    if (!fam) continue;
    counts.set(fam, (counts.get(fam) ?? 0) + 1);
  }
  let best = 'lower-back';
  let n = 0;
  for (const [fam, c] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    if (c > n) {
      best = fam;
      n = c;
    }
  }
  return best;
}
