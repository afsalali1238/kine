/**
 * Easier / harder swaps. The harder version is only ever queued for the next session;
 * a mid-set escalation is not offered anywhere in the app.
 */

import { exerciseById } from '@/lib/content';
import type { Exercise } from '@/lib/types';

export type Direction = 'easier' | 'harder';

export const FLOOR = { sets: 1, reps: 6, holdSeconds: 10 };

export function floorDose(exercise: Exercise): Pick<Exercise, 'sets' | 'reps' | 'holdSeconds'> {
  return {
    sets: FLOOR.sets,
    reps: exercise.reps === null ? null : Math.max(FLOOR.reps, Math.min(exercise.reps, FLOOR.reps)),
    holdSeconds:
      exercise.holdSeconds === null
        ? null
        : Math.max(FLOOR.holdSeconds, Math.min(exercise.holdSeconds, FLOOR.holdSeconds)),
  };
}

export type Variant = { exercise: Exercise; exact: boolean };

export function variantFor(
  exercise: Exercise,
  direction: Direction,
  presentationId: string,
): Variant | null {
  const id = direction === 'easier' ? exercise.easierVariantId : exercise.harderVariantId;
  const named = id ? exerciseById.get(id) : undefined;
  if (named && !named.contraindicatedFor.includes(presentationId)) {
    return { exercise: named, exact: true };
  }
  // The easier direction may always fall back to a halved dose, because that is a
  // reduction. There is no invented harder version: if the author has not named one,
  // the UI says so instead of escalating load on its own.
  if (direction === 'harder') return null;
  const reps = exercise.reps === null ? null : Math.max(FLOOR.reps, Math.floor(exercise.reps / 2));
  const hold =
    exercise.holdSeconds === null
      ? null
      : Math.max(FLOOR.holdSeconds, Math.floor(exercise.holdSeconds / 2));
  const reduced: Exercise = {
    ...exercise,
    name: `${exercise.name} (reduced)`,
    sets: FLOOR.sets,
    reps,
    holdSeconds: hold,
  };
  return { exercise: reduced, exact: false };
}
