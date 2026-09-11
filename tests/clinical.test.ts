/**
 * The clinical rules the brief calls acceptance criteria: the same body part with a
 * different pattern must produce a different programme, and an urgent red flag must stop a
 * session from launching.
 *
 * Fixtures live in `helpers.ts`; the suites are split by question so each one reads on a
 * single screen (C2).
 */

import { describe, expect, it } from 'vitest';
import { clampPain, validateStep } from '@/modules/intake/questions';
import { firstStartable, matchPresentations } from '@/modules/triage';
import { redFlags } from '@/modules/triage/flags';

import { intake, region, programFor } from './helpers';

describe('the body map drives the plan', () => {
  it('gives the front and the back of the same knee different programmes', () => {
    const front = programFor('knee-anterior-left');
    const back = programFor('knee-posterior-left');
    expect(front.items.map((row) => row.exerciseId)).not.toEqual(
      back.items.map((row) => row.exerciseId),
    );
    expect(front.presentationId).not.toBe(back.presentationId);
  });

  it('gives the left and the right side the same number of exercises, mirrored', () => {
    const left = programFor('anterior-deltoid-left');
    const right = programFor('anterior-deltoid-right');
    expect(left.items.length).toBe(right.items.length);
    expect(left.items.map((row) => row.exerciseId)).toEqual(
      right.items.map((row) => row.exerciseId),
    );
  });

  it('changes the programme when the same region answers differently', () => {
    const high = programFor('lumbar-spine', {
      irritability: 'high',
      aggravators: ['sitting', 'bending'],
    });
    const low = programFor('lumbar-spine', {
      irritability: 'low',
      aggravators: ['arching', 'standing'],
    });
    expect(high.items.length).toBeGreaterThan(0);
    expect(low.items.length).toBeGreaterThan(0);
    expect(high.phase).toBe(1);
    expect(low.minutes).toBeGreaterThan(high.minutes);
    expect(low.items.map((row) => row.exerciseId)).not.toEqual(
      high.items.map((row) => row.exerciseId),
    );
  });
});

describe('triage', () => {
  it('treats cauda and chest answers as urgent and blocking', () => {
    for (const detail of ['bladder', 'saddle', 'both-legs', 'chest', 'severe-headache']) {
      const flag = redFlags(intake({ details: [detail] }));
      expect(flag?.level, detail).toBe('urgent');
    }
  });

  it('raises a review, not an emergency, for isolated weakness', () => {
    const flag = redFlags(intake({ neuro: 'weakness' }));
    expect(flag?.level).toBe('review');
  });

  it('never scores a guidance-only pattern as a programme', () => {
    const matches = matchPresentations(region('temple-left'), intake({}));
    expect(matches.length).toBeGreaterThan(0);
    expect(firstStartable(matches)).toBeNull();
  });

  it('penalises a rejected pattern so the next one surfaces', () => {
    const row = region('lumbar-spine');
    const answers = intake({ aggravators: ['sitting', 'bending'], easers: ['standing'] });
    const first = matchPresentations(row, answers);
    const rejected = matchPresentations(row, answers, [first[0].presentation.id]);
    expect(rejected[0].presentation.id).not.toBe(first[0].presentation.id);
  });

  it('keeps the pain scales ordered by construction', () => {
    const base = intake({ pain: 5, best: 2, worst: 7 });
    const raised = clampPain(base, 'pain', 9);
    expect(raised.pain).toBe(9);
    expect(raised.best).toBe(2);
    expect(raised.worst).toBe(9);
    // Dragging "best" above the current score is not expressible; the clamp refuses it.
    expect(clampPain(base, 'best', 8).best).toBe(5);
    expect(clampPain(base, 'worst', 1).worst).toBe(5);
    expect(validateStep(0, { ...base, best: 8 })).toBeTruthy();
    expect(validateStep(0, base)).toBeNull();
  });
});
