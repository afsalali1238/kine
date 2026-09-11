/**
 * Red-flag screening. Returns a level plus an i18n key so the copy stays bilingual;
 * `urgent` deliberately blocks session start (preserved from v1, never softened).
 */

import type { Intake } from '@/lib/types';

export type FlagLevel = 'urgent' | 'review';
export type FlagResult = { level: FlagLevel; key: string; params?: Record<string, string> };

const URGENT = ['bladder', 'saddle', 'both-legs', 'chest', 'severe-headache'];
const REVIEW = ['weakness', 'weight-loss', 'fever', 'major-trauma', 'locked', 'weight-bearing'];

export function redFlags(intake: Intake): FlagResult | null {
  if (intake.details.includes('chest')) {
    return { level: 'urgent', key: 'triage.chest' };
  }
  if (intake.details.some((d) => URGENT.includes(d))) {
    return { level: 'urgent', key: 'triage.cauda' };
  }
  if (intake.details.some((d) => REVIEW.includes(d)) || intake.pattern === 'night') {
    return { level: 'review', key: 'triage.review.body' };
  }
  if (intake.neuro === 'weakness') return { level: 'review', key: 'triage.weakness' };
  return null;
}

export const isBlocking = (flag: FlagResult | null): boolean => flag?.level === 'urgent';
