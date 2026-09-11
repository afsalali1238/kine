/**
 * Dose is arithmetic, not prose: irritability and phase change the numbers, the tempo
 * object drives the timer, and a variant is a swap inside the same prescription.
 *
 * Fixtures live in `helpers.ts`; the suites are split by question so each one reads on a
 * single screen (C2).
 */

import { describe, expect, it } from 'vitest';
import { DOSE_BUDGET_SECONDS, programmeSeconds, scheduleFor } from '@/modules/programme/tempo';
import { FLOOR, variantFor } from '@/modules/programme/variants';
import { buildProgramme } from '@/modules/programme';
import { exerciseById, findExercise } from '@/lib/content';

import { intake, programFor } from './helpers';

describe('dose', () => {
  it('keeps a high-irritability session small and short', () => {
    const programme = programFor('lumbar-spine', { irritability: 'high' });
    for (const item of programme.items) {
      expect(item.sets).toBe(1);
      if (item.reps !== null) expect(item.reps).toBeLessThanOrEqual(6);
      if (item.holdSeconds !== null) expect(item.holdSeconds).toBeLessThanOrEqual(15);
    }
  });

  it('never exceeds four exercises or fifteen minutes', () => {
    for (const id of [
      'lumbar-spine',
      'knee-anterior-left',
      'anterior-deltoid-left',
      'cervical-upper',
    ]) {
      for (const level of ['high', 'moderate', 'low'] as const) {
        const programme = programFor(id, { irritability: level, phase: 2 });
        expect(programme.items.length, `${id}/${level}`).toBeLessThanOrEqual(4);
        expect(programme.minutes, `${id}/${level}`).toBeLessThanOrEqual(15);
      }
    }
  });

  it('cuts sets from the end but never below one set of six', () => {
    const exercise = exerciseById.get('lower-back-2') ?? [...exerciseById.values()][0];
    const schedule = scheduleFor(exercise, { sets: 1, reps: 6, holdSeconds: null });
    expect(schedule.sets).toBe(FLOOR.sets);
    expect(schedule.reps).toBeGreaterThanOrEqual(FLOOR.reps);
    const seconds = programmeSeconds([
      { exercise, sets: 12, reps: 20, holdSeconds: null },
      { exercise, sets: 12, reps: 20, holdSeconds: null },
    ]);
    expect(seconds).toBeGreaterThan(DOSE_BUDGET_SECONDS.low);
  });

  it('computes the session length from the tempo object, not prose', () => {
    const exercise = findExercise('lower-back-1');
    expect(exercise).toBeTruthy();
    const schedule = scheduleFor(exercise!, { sets: 3 });
    const cadence =
      (exercise!.tempo.eccentricMs + exercise!.tempo.pauseMs + exercise!.tempo.concentricMs) / 1000;
    expect(schedule.perRepSeconds).toBeCloseTo(cadence, 6);
    expect(schedule.totalSeconds).toBeGreaterThan(3 * cadence);
    expect(schedule.totalSeconds).toBeCloseTo(
      3 * (schedule.setSeconds + 3) + 2 * exercise!.restSeconds,
      6,
    );
  });

  it('respects the pattern that locks a phase out entirely', () => {
    const programme = buildProgramme({
      regionId: 'anterior-deltoid-left',
      presentationId: 'frozen-shoulder',
      intake: intake({ irritability: 'low' }),
      phase: 3,
      goal: '',
    });
    expect(programme.phase).toBe(1);
    expect(programme.locked).toBe(true);
    for (const item of programme.items) {
      const exercise = exerciseById.get(item.exerciseId);
      expect(exercise?.phase).toBe(1);
    }
  });

  it('prefers the goal in the capacity phase', () => {
    const training = buildProgramme({
      regionId: 'knee-anterior-left',
      presentationId: 'patellofemoral',
      intake: intake({ irritability: 'low' }),
      phase: 3,
      goal: 'Return to running and plyometric training',
    });
    const desk = buildProgramme({
      regionId: 'knee-anterior-left',
      presentationId: 'patellofemoral',
      intake: intake({ irritability: 'low' }),
      phase: 3,
      goal: 'Sit and work at a desk without pain',
    });
    expect(training.items.map((row) => row.exerciseId)).not.toEqual(
      desk.items.map((row) => row.exerciseId),
    );
  });
});

describe('variants', () => {
  it('offers a named easier version and no invented harder one', () => {
    const withVariants = [...exerciseById.values()].find(
      (row) => row.easierVariantId && exerciseById.get(row.easierVariantId!),
    );
    expect(withVariants, 'some exercise must have an easier variant').toBeTruthy();
    const easier = variantFor(withVariants!, 'easier', withVariants!.presentationIds[0]);
    expect(easier?.exact).toBe(true);
    const harder = variantFor(withVariants!, 'harder', withVariants!.presentationIds[0]);
    if (!withVariants!.harderVariantId) expect(harder).toBeNull();
  });

  it('reduces a dose to the floor rather than skipping the exercise', () => {
    const exercise = [...exerciseById.values()].find((row) => row.reps && row.reps > 6)!;
    const easier = variantFor(exercise, 'easier', exercise.presentationIds[0]);
    expect(easier).toBeTruthy();
    expect(easier!.exercise.reps ?? 0).toBeGreaterThanOrEqual(FLOOR.reps);
    expect(easier!.exercise.sets).toBe(FLOOR.sets);
  });
});
