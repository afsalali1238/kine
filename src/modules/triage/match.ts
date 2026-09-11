/**
 * Pattern matching, retargeted from v1's group-level table to the 119-region set.
 *
 * A score is a transparent pattern-fit score, never a probability. Three things move
 * it: the rule weights for the answers, the region the pin actually sits on, and
 * whether the presentation's own site list names that region's base.
 */

import { presentationById, ruleByPresentation, type Rule } from '@/lib/content';
import type { Intake, Presentation, Region } from '@/lib/types';

export type Evidence = {
  type: 'worse' | 'eases' | 'neuro' | 'onset' | 'pattern' | 'affinity' | 'site';
  key: string;
  delta: number;
};

export type Scored = {
  presentation: Presentation;
  score: number;
  confidence: 'strong' | 'possible' | 'early';
  evidence: Evidence[];
  rejected: boolean;
};

const REJECTED_PENALTY = 30;

export function scorePresentation(
  rule: Rule,
  presentation: Presentation,
  region: Region,
  intake: Intake,
): { score: number; evidence: Evidence[] } {
  const agg = rule.aggravators as Record<string, number>;
  const ease = rule.easers as Record<string, number>;
  const evidence: Evidence[] = [];
  let score = rule.baseScore;

  for (const key of intake.aggravators) {
    const weight = agg[key] ?? 0;
    score += weight;
    if (weight) evidence.push({ type: 'worse', key, delta: weight });
  }
  for (const key of intake.easers) {
    const weight = ease[key] ?? 0;
    score += weight;
    if (weight) evidence.push({ type: 'eases', key, delta: weight });
  }
  if (intake.neuro !== 'none' && rule.neuroWeight) {
    score += rule.neuroWeight;
    evidence.push({ type: 'neuro', key: intake.neuro, delta: rule.neuroWeight });
  }
  const onsetDelta = intake.onset === 'gradual' ? rule.gradualWeight : rule.incidentWeight;
  if (onsetDelta) {
    score += onsetDelta;
    evidence.push({ type: 'onset', key: intake.onset, delta: onsetDelta });
  }
  if (intake.pattern === 'morning' && agg.morning) {
    score += agg.morning;
    evidence.push({ type: 'pattern', key: 'morning', delta: agg.morning });
  }
  if (intake.pattern === 'night' && agg.night) {
    score += agg.night;
    evidence.push({ type: 'pattern', key: 'night', delta: agg.night });
  }

  // Anatomy precision: how strongly this region itself points at the pattern.
  const affinity = region.affinity[presentation.id] ?? 0;
  if (affinity) evidence.push({ type: 'affinity', key: region.id, delta: affinity });
  score += affinity;
  if (presentation.sites.includes(region.base)) {
    score += 2;
    evidence.push({ type: 'site', key: region.id, delta: 2 });
  }
  return { score, evidence };
}

export function matchPresentations(
  region: Region,
  intake: Intake,
  rejected: string[] = [],
): Scored[] {
  const out: Scored[] = [];
  for (const id of region.presentationIds) {
    const presentation = presentationById.get(id);
    if (!presentation) continue;
    const rule = ruleByPresentation.get(id);
    if (!rule) {
      // A guidance-only pattern has no scoring rule by design — it is education plus a
      // referral, never a programme. It still surfaces here so the region's own guidance is
      // shown instead of silently dropping off the map.
      const affinity = region.affinity[id] ?? 0;
      out.push({
        presentation,
        score: affinity,
        evidence: affinity ? [{ type: 'affinity', key: region.id, delta: affinity }] : [],
        rejected: false,
        confidence: 'early',
      });
      continue;
    }
    const { score, evidence } = scorePresentation(rule, presentation, region, intake);
    const isRejected = rejected.includes(id);
    const final = score - (isRejected ? REJECTED_PENALTY : 0);
    out.push({
      presentation,
      score: final,
      evidence,
      rejected: isRejected,
      confidence: final > 10 ? 'strong' : final > 5 ? 'possible' : 'early',
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** The first ranked pattern that actually has a programme to build. */
export function firstStartable(matches: Scored[]): Scored | null {
  return matches.find((m) => !m.presentation.guidanceOnly && m.score > -20) ?? null;
}

export const CONFIDENCE_LABEL: Record<Scored['confidence'], string> = {
  strong: 'Stronger pattern match',
  possible: 'Possible pattern match',
  early: 'Early pattern match',
};
