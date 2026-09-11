/**
 * Index over the matching rules, so the intake form can show only movements that are
 * wired into a score. Lives in the intake module; other modules do not read rules
 * directly (they go through `triage`'s matcher).
 */

import { rules } from '@/lib/content';

let cache: Record<string, string[]> | null = null;

function build(): Record<string, string[]> {
  if (cache) return cache;
  const byFamily: Record<string, Map<string, number>> = {};
  for (const rule of rules) {
    for (const family of rule.families.length ? rule.families : [rule.family]) {
      const tally = (byFamily[family] ??= new Map());
      for (const key of Object.keys(rule.aggravators)) {
        tally.set(key, (tally.get(key) ?? 0) + Math.abs(rule.aggravators[key]));
      }
      for (const key of Object.keys(rule.easers)) {
        tally.set(key, (tally.get(key) ?? 0) + Math.abs(rule.easers[key]));
      }
    }
  }
  cache = Object.fromEntries(
    Object.entries(byFamily).map(([family, tally]) => [
      family,
      [...tally.entries()]
        .filter(([key]) => key !== 'morning' && key !== 'night')
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 8)
        .map(([key]) => key),
    ]),
  );
  return cache;
}

/** Falls back to the parent joint family for regions with no dedicated rule set. */
export function movementsForFamily(family: string): string[] {
  const table = build();
  if (table[family]) return table[family];
  const fallbacks: Record<string, string> = {
    'head-jaw': 'neck',
    chest: 'upper-back',
    trunk: 'lower-back',
    thigh: 'hip',
    'lower-leg': 'knee',
    foot: 'ankle',
    wrist: 'elbow',
  };
  const alt = fallbacks[family];
  return (alt && table[alt]) || [];
}
