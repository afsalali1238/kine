/**
 * The session clock. One rAF loop, one elapsed millisecond counter, and a pure mapping from
 * that counter to (exercise, set, rep, phase). The figure reads the counter directly through
 * a ref, the DOM reads it at 10 Hz — so the metronome and the animation cannot drift apart,
 * and React is not re-rendered 60 times a second to move a number.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { SETUP_SECONDS_PER_SET } from '@/modules/programme';
import { segmentsFor, tAt, type Segment } from '@/modules/animation';
import type { Exercise, ExerciseAnimation } from '@/lib/types';

export type PhaseKind = 'setup' | 'in' | 'hold' | 'out' | 'rest' | 'done';

export type Tick = {
  ms: number;
  totalMs: number;
  exerciseIndex: number;
  setIndex: number;
  repIndex: number;
  repsInSet: number;
  kind: PhaseKind;
  /** Position on the animation timeline for this rep, 0..1. */
  t: number;
  /** Milliseconds left in the current beat, for the countdown. */
  remainingMs: number;
  cyclesDone: number;
};

export type ItemTiming = {
  exerciseId: string;
  sets: number;
  reps: number;
  holdSeconds: number | null;
  setupMs: number;
  repMs: number;
  restMs: number;
  setMs: number;
  itemMs: number;
  startMs: number;
  segments: Segment[];
};

export type Dose = { sets?: number; reps?: number | null; holdSeconds?: number | null };

export function timingFor(
  exercise: Exercise,
  animation: ExerciseAnimation,
  dose: Dose = {},
): ItemTiming {
  const sets = Math.max(1, Math.round(dose.sets ?? exercise.sets));
  const holdSeconds = dose.holdSeconds !== undefined ? dose.holdSeconds : exercise.holdSeconds;
  const isHold = holdSeconds !== null && holdSeconds !== undefined && !dose.reps && !exercise.reps;
  const reps = isHold ? 1 : Math.max(1, dose.reps ?? exercise.reps ?? 1);
  const segments = segmentsFor(
    animation,
    isHold ? { ...exercise, reps: null, holdSeconds } : { ...exercise, holdSeconds: null, reps },
  );
  const repMs = segments
    .filter((segment) => segment.kind !== 'rest')
    .reduce((sum, segment) => sum + segment.ms, 0);
  const setMs = reps > 1 ? reps * repMs : repMs;
  const setupMs = SETUP_SECONDS_PER_SET * 1000;
  const restMs = exercise.restSeconds * 1000;
  const itemMs = sets * (setupMs + setMs) + Math.max(0, sets - 1) * restMs;
  return {
    exerciseId: exercise.id,
    sets,
    reps,
    holdSeconds: isHold ? holdSeconds : null,
    setupMs,
    repMs,
    restMs,
    setMs,
    itemMs,
    startMs: 0,
    segments,
  };
}

export function withOffsets(timings: ItemTiming[]): ItemTiming[] {
  let acc = 0;
  return timings.map((timing) => {
    const row = { ...timing, startMs: acc };
    acc += timing.itemMs;
    return row;
  });
}

export const totalMs = (timings: ItemTiming[]): number =>
  timings.length ? timings[timings.length - 1].startMs + timings[timings.length - 1].itemMs : 0;

/** Where a moment lands: which exercise, which set, which rep, which phase of that rep. */
export function locate(timings: ItemTiming[], ms: number): Tick {
  const total = totalMs(timings);
  const clamped = Math.max(0, Math.min(ms, total));
  for (let index = 0; index < timings.length; index++) {
    const timing = timings[index];
    if (clamped < timing.startMs + timing.itemMs || index === timings.length - 1) {
      const local = clamped - timing.startMs;
      for (let set = 0; set < timing.sets; set++) {
        const setStart = set * (timing.setupMs + timing.setMs + timing.restMs);
        const inSetup = local >= setStart && local < setStart + timing.setupMs;
        if (inSetup) {
          return {
            ms: clamped,
            totalMs: total,
            exerciseIndex: index,
            setIndex: set,
            repIndex: 0,
            repsInSet: timing.reps,
            kind: 'setup',
            t: 0,
            remainingMs: setStart + timing.setupMs - local,
            cyclesDone: 0,
          };
        }
        const workStart = setStart + timing.setupMs;
        const inWork = local >= workStart && local < workStart + timing.setMs;
        if (inWork) {
          const workLocal = local - workStart;
          const repIndex = Math.min(timing.reps - 1, Math.floor(workLocal / timing.repMs));
          const repLocal = workLocal - repIndex * timing.repMs;
          const { t, kind } = tAt(timing.segments, repLocal);
          return {
            ms: clamped,
            totalMs: total,
            exerciseIndex: index,
            setIndex: set,
            repIndex,
            repsInSet: timing.reps,
            kind: timing.reps > 1 ? (kind as PhaseKind) : kind,
            t,
            remainingMs: timing.repMs - repLocal,
            cyclesDone: repIndex,
          };
        }
        const restStart = workStart + timing.setMs;
        if (set < timing.sets - 1 && local >= restStart && local < restStart + timing.restMs) {
          return {
            ms: clamped,
            totalMs: total,
            exerciseIndex: index,
            setIndex: set,
            repIndex: timing.reps - 1,
            repsInSet: timing.reps,
            kind: 'rest',
            t: 1,
            remainingMs: restStart + timing.restMs - local,
            cyclesDone: timing.reps * (set + 1),
          };
        }
      }
      return {
        ms: clamped,
        totalMs: total,
        exerciseIndex: index,
        setIndex: timing.sets - 1,
        repIndex: Math.max(0, timing.reps - 1),
        repsInSet: timing.reps,
        kind: 'done',
        t: 1,
        remainingMs: 0,
        cyclesDone: timing.reps * timing.sets,
      };
    }
  }
  return {
    ms: 0,
    totalMs: 0,
    exerciseIndex: 0,
    setIndex: 0,
    repIndex: 0,
    repsInSet: 1,
    kind: 'done',
    t: 0,
    remainingMs: 0,
    cyclesDone: 0,
  };
}

/**
 * Drives the elapsed counter. `playing` gates the loop; finishing is reported once so the
 * screen can move to the check-in without a timer race.
 */
export function useSessionClock(timings: ItemTiming[], playing: boolean) {
  const ms = useRef(0);
  const [tick, setTick] = useState<Tick>(() => locate(timings, 0));
  const finished = useRef(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    let lastPublish = 0;
    const step = (now: number) => {
      const delta = Math.min(120, now - last);
      last = now;
      ms.current = Math.min(totalMs(timings), ms.current + delta);
      if (now - lastPublish > 96 || ms.current >= totalMs(timings)) {
        lastPublish = now;
        setTick(locate(timings, ms.current));
      }
      if (ms.current >= totalMs(timings)) {
        if (!finished.current) {
          finished.current = true;
          setDone(true);
        }
        return;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, timings]);

  const api = useMemo(
    () => ({
      msRef: ms,
      tick,
      done,
      seekTo: (value: number) => {
        finished.current = false;
        setDone(false);
        ms.current = Math.max(0, Math.min(totalMs(timings), value));
        setTick(locate(timings, ms.current));
      },
      nextExercise: (index: number) => {
        const target = timings[Math.max(0, Math.min(timings.length - 1, index))];
        finished.current = false;
        setDone(false);
        ms.current = target ? target.startMs : 0;
        setTick(locate(timings, ms.current));
      },
      restart: () => {
        finished.current = false;
        setDone(false);
        ms.current = 0;
        setTick(locate(timings, 0));
      },
    }),
    [tick, done, timings],
  );
  return api;
}
