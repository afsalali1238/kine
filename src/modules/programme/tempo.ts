/**
 * Tempo and timing, derived from the machine-readable tempo object (C4). Nothing here
 * parses prose: `tempo.eccentricMs / pauseMs / concentricMs` are the contract, and the
 * same numbers drive the metronome in the session and the frames in the handout.
 */

import type { Exercise, TempoMs } from '@/lib/types';

export const SETUP_SECONDS_PER_SET = 3;

export type Schedule = {
  exerciseId: string;
  sets: number;
  reps: number | null;
  holdSeconds: number | null;
  restSeconds: number;
  tempo: TempoMs;
  perRepSeconds: number;
  setSeconds: number;
  totalSeconds: number;
  cuesPerRep: number;
};

export function perRepSeconds(tempo: TempoMs): number {
  return (tempo.eccentricMs + tempo.pauseMs + tempo.concentricMs) / 1000;
}

/** A rep's cadence in seconds, split into the three phases the metronome uses. */
export function repPhaseSeconds(tempo: TempoMs) {
  const total = perRepSeconds(tempo) || 1;
  return {
    eccentric: tempo.eccentricMs / 1000,
    pause: tempo.pauseMs / 1000,
    concentric: tempo.concentricMs / 1000,
    total,
  };
}

export function scheduleFor(
  exercise: Exercise,
  overrides: { sets?: number; reps?: number | null; holdSeconds?: number | null } = {},
): Schedule {
  const sets = Math.max(1, Math.round(overrides.sets ?? exercise.sets));
  const reps = overrides.reps !== undefined ? overrides.reps : exercise.reps;
  const holdSeconds =
    overrides.holdSeconds !== undefined ? overrides.holdSeconds : exercise.holdSeconds;
  const cadence = perRepSeconds(exercise.tempo);
  const isHold = holdSeconds !== null && holdSeconds !== undefined && !reps;
  const setSeconds = isHold
    ? (holdSeconds as number) + cadence
    : Math.max(1, reps ?? 1) * Math.max(cadence, 1.5);
  const totalSeconds =
    sets * (setSeconds + SETUP_SECONDS_PER_SET) + Math.max(0, sets - 1) * exercise.restSeconds;
  return {
    exerciseId: exercise.id,
    sets,
    reps: isHold ? null : (reps ?? null),
    holdSeconds: isHold ? (holdSeconds as number) : null,
    restSeconds: exercise.restSeconds,
    tempo: exercise.tempo,
    perRepSeconds: cadence,
    setSeconds,
    totalSeconds,
    cuesPerRep: 3,
  };
}

export function programmeSeconds(
  items: { exercise: Exercise; sets: number; reps: number | null; holdSeconds: number | null }[],
): number {
  return items.reduce(
    (sum, item) =>
      sum +
      scheduleFor(item.exercise, {
        sets: item.sets,
        reps: item.reps,
        holdSeconds: item.holdSeconds,
      }).totalSeconds,
    0,
  );
}

export const fmtSeconds = (seconds: number): string => `${Math.round(seconds / 60)}`;

export const tempoLabel = (tempo: TempoMs): string =>
  `${tempo.eccentricMs / 1000}-${tempo.pauseMs / 1000}-${tempo.concentricMs / 1000} s`;

export const DOSE_BUDGET_SECONDS: Record<Intake_Irritability, number> = {
  high: 420,
  moderate: 720,
  low: 900,
};

type Intake_Irritability = 'high' | 'moderate' | 'low';
