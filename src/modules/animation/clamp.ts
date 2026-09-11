/**
 * Range of motion, resolved from three sources and clamped by the pattern.
 *
 * `skeleton.json` carries the neutral ROM; a presentation narrows it (the authored cap is
 * a magnitude on the axis that aggravates); an exercise's own `rangeCaps` narrow it
 * further. The result is the window the demonstrator may move inside, the window the
 * keyframe editor refuses to save outside of, and the window `validate-content` fails the
 * build on when a keyframe exceeds it.
 */

import { skeleton } from '@/lib/content';
import type { Exercise, Presentation } from '@/lib/types';

export type Range = [number, number];
export type Caps = Record<string, Record<string, Range>>;

export const NEUTRAL: Caps = Object.fromEntries(
  Object.entries(skeleton.joints).map(([id, joint]) => [id, joint.rom]),
);

/** `n` on an axis limits both ends of that axis to `|n|`, never past the neutral ROM. */
export function fromPresentation(presentation: Presentation | undefined): Caps {
  const out: Caps = {};
  for (const [joint, axes] of Object.entries(presentation?.caps ?? {})) {
    out[joint] = out[joint] ?? {};
    for (const [axis, magnitude] of Object.entries(axes)) {
      const base = NEUTRAL[joint]?.[axis] ?? [-180, 180];
      const cap = Math.abs(magnitude);
      out[joint][axis] = [Math.max(base[0], -cap), Math.min(base[1], cap)];
    }
  }
  return out;
}

export function fromExercise(exercise: Exercise | undefined): Caps {
  const out: Caps = {};
  for (const [joint, axes] of Object.entries(exercise?.rangeCaps ?? {})) {
    out[joint] = out[joint] ?? {};
    for (const [axis, range] of Object.entries(axes as unknown as Record<string, Range>)) {
      if (Array.isArray(range)) out[joint][axis] = [range[0], range[1]];
    }
  }
  return out;
}

function narrow(a: Caps, b: Caps): Caps {
  const out: Caps = {};
  for (const joint of new Set([...Object.keys(a), ...Object.keys(b)])) {
    out[joint] = {};
    const ja = a[joint] ?? {};
    const jb = b[joint] ?? {};
    for (const axis of new Set([...Object.keys(ja), ...Object.keys(jb)])) {
      const ra = ja[axis] ?? NEUTRAL[joint]?.[axis] ?? [-180, 180];
      const rb = jb[axis] ?? NEUTRAL[joint]?.[axis] ?? [-180, 180];
      out[joint][axis] = [Math.max(ra[0], rb[0]), Math.min(ra[1], rb[1])];
    }
  }
  return out;
}

export function capsFor(
  presentation: Presentation | undefined,
  exercise: Exercise | undefined,
): Caps {
  return narrow(fromPresentation(presentation), fromExercise(exercise));
}

export function rangeFor(caps: Caps, joint: string, axis: string): Range {
  return caps[joint]?.[axis] ?? NEUTRAL[joint]?.[axis] ?? [-180, 180];
}

export function clampAngle(deg: number, range: Range): number {
  return Math.max(range[0], Math.min(range[1], deg));
}

export type AnimLike = {
  animationId: string;
  exerciseId: string;
  tracks: { joint: string; axis: string; keyframes: { deg: number }[] }[];
  faultTracks?: {
    faultId: string;
    tracks: { joint: string; axis: string; keyframes: { deg: number }[] }[];
  }[];
};

export type Violation = {
  animationId: string;
  exerciseId: string;
  joint: string;
  axis: string;
  requested: number;
  allowed: Range;
  fault: boolean;
};

function walk(
  animations: AnimLike[],
  windowFor: (anim: AnimLike, joint: string, axis: string) => Range,
  includeFaults: boolean,
  faultIsFine: boolean,
): Violation[] {
  const out: Violation[] = [];
  for (const anim of animations) {
    const check = (tracks: AnimLike['tracks'], fault: boolean) => {
      if (fault && !includeFaults) return;
      for (const track of tracks) {
        const range = windowFor(anim, track.joint, track.axis);
        for (const key of track.keyframes) {
          if (key.deg < range[0] - 0.001 || key.deg > range[1] + 0.001) {
            out.push({
              animationId: anim.animationId,
              exerciseId: anim.exerciseId,
              joint: track.joint,
              axis: track.axis,
              requested: key.deg,
              allowed: range,
              fault,
            });
          }
        }
      }
    };
    check(anim.tracks, false);
    if (!faultIsFine) for (const fault of anim.faultTracks ?? []) check(fault.tracks, true);
  }
  return out;
}

/**
 * Checked against the rig's own ROM contract — the anatomically possible window. This is the
 * gate that fails a build: a keyframe outside it describes a movement the joint cannot do.
 * A pattern cap is not part of this check; caps *narrow what is demonstrated* at runtime
 * (`capExceedances` reports where that happens) rather than making the content invalid.
 */
export function assertAnimationsInRange(input: { animations: AnimLike[] }): Violation[] {
  return walk(
    input.animations,
    (anim, joint, axis) => NEUTRAL[joint]?.[axis] ?? [-180, 180],
    true,
    false,
  );
}

/** Where a keyframe sits outside the pattern's window and so will be clamped on screen. */
export function capExceedances(input: {
  animations: AnimLike[];
  exercises: Exercise[];
  presentations: Presentation[];
}): Violation[] {
  const exerciseById = new Map(input.exercises.map((e) => [e.id, e]));
  const byPresentation = new Map(input.presentations.map((p) => [p.id, p]));
  return walk(
    input.animations,
    (anim, joint, axis) => {
      const exercise = exerciseById.get(anim.exerciseId);
      const first = exercise?.presentationIds?.[0];
      const caps = capsFor(first ? byPresentation.get(first) : undefined, exercise);
      return rangeFor(caps, joint, axis);
    },
    false,
    true,
  );
}
