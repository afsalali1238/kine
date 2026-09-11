/**
 * Keyframe evaluation. One loop of a rep, or a hold, expressed as segments so the
 * metronome, the caption timing and the 3-frame strip all read the same schedule.
 */

import type { Exercise } from '@/lib/types';
import type { ExerciseAnimation } from '@/lib/types';
import type { Pose } from './joints';
import { emptyPose } from './joints';
import { clampAngle, rangeFor, type Caps } from './clamp';

export type SegmentKind = 'in' | 'hold' | 'out' | 'rest';

export type Segment = { kind: SegmentKind; from: number; to: number; ms: number };

export type Track = {
  joint: string;
  axis: string;
  keyframes: { t: number; deg: number; easing?: string }[];
};

const smooth = (x: number) => x * x * (3 - 2 * x);

export function angleAtTrack(track: Track, t: number): number {
  const keys = track.keyframes;
  if (!keys.length) return 0;
  const clamped = Math.max(0, Math.min(1, t));
  let prev = keys[0];
  if (clamped <= prev.t) return prev.deg;
  for (let i = 1; i < keys.length; i++) {
    const next = keys[i];
    if (clamped <= next.t) {
      const span = next.t - prev.t || 1;
      const raw = (clamped - prev.t) / span;
      const eased = (next.easing ?? prev.easing ?? 'easeInOut') === 'linear' ? raw : smooth(raw);
      return prev.deg + (next.deg - prev.deg) * eased;
    }
    prev = next;
  }
  return keys[keys.length - 1].deg;
}

export function poseAtTracks(tracks: Track[], t: number, side: Pose['side'] = 'both'): Pose {
  const pose = emptyPose(side);
  for (const track of tracks) {
    pose.joints[track.joint] = {
      ...(pose.joints[track.joint] ?? {}),
      [track.axis]: angleAtTrack(track, t),
    };
  }
  return pose;
}

/** Applies the resolved caps; returns the clamped pose and what had to be clamped. */
export function clampPose(
  pose: Pose,
  caps: Caps,
): { pose: Pose; clamped: { joint: string; axis: string; from: number; to: number }[] } {
  const out: Pose = { side: pose.side, joints: {} };
  const clamped: { joint: string; axis: string; from: number; to: number }[] = [];
  for (const [joint, axes] of Object.entries(pose.joints)) {
    out.joints[joint] = {};
    for (const [axis, deg] of Object.entries(axes)) {
      const next = clampAngle(deg, rangeFor(caps, joint, axis));
      if (Math.abs(next - deg) > 0.001) clamped.push({ joint, axis, from: deg, to: next });
      out.joints[joint][axis] = next;
    }
  }
  return { pose: out, clamped };
}

/**
 * The cycle the figure performs for one rep: get in, hold (isometrics only), get out.
 * `holdAt` in the animation record marks the plateau; the *duration* of the plateau comes
 * from the exercise dose, so a cut dose visibly shortens the hold instead of lying.
 */
export function segmentsFor(anim: ExerciseAnimation, exercise: Exercise): Segment[] {
  const cycle = anim.durationMs;
  const holdAt = anim.holdAt ?? null;
  const holdSeconds = exercise.holdSeconds;
  if (holdAt === null || !holdSeconds) {
    return [
      { kind: 'in', from: 0, to: 1, ms: cycle },
      { kind: 'rest', from: 1, to: 1, ms: exercise.restSeconds * 1000 },
    ];
  }
  const inMs = cycle * holdAt;
  const outMs = cycle * (1 - holdAt);
  return [
    { kind: 'in', from: 0, to: holdAt, ms: inMs },
    { kind: 'hold', from: holdAt, to: holdAt, ms: holdSeconds * 1000 },
    { kind: 'out', from: holdAt, to: 1, ms: outMs },
    { kind: 'rest', from: 1, to: 1, ms: exercise.restSeconds * 1000 },
  ];
}

export function totalCycleMs(segments: Segment[]): number {
  return segments.reduce((sum, s) => sum + s.ms, 0);
}

/** Maps elapsed ms inside one cycle to the timeline position `t` in 0..1. */
export function tAt(segments: Segment[], elapsedMs: number): { t: number; kind: SegmentKind } {
  let acc = 0;
  for (const seg of segments) {
    if (elapsedMs < acc + seg.ms || seg === segments[segments.length - 1]) {
      const local = seg.ms ? (elapsedMs - acc) / seg.ms : 1;
      return {
        t: seg.from + (seg.to - seg.from) * Math.max(0, Math.min(1, local)),
        kind: seg.kind,
      };
    }
    acc += seg.ms;
  }
  return { t: 1, kind: 'rest' };
}

export type FrameSpec = { at: number; label: 'start' | 'position' | 'finish' };

/** Three frames that read as a sequence: entry, the working position, the return. */
export function frameSpecs(anim: ExerciseAnimation): FrameSpec[] {
  const holdAt = anim.holdAt ?? 0.55;
  return [
    { at: 0, label: 'start' },
    { at: holdAt, label: 'position' },
    { at: 1, label: 'finish' },
  ];
}

export function framesFor(anim: ExerciseAnimation, side: Pose['side'] = 'both'): Pose[] {
  return frameSpecs(anim).map((frame) => poseAtTracks(anim.tracks, frame.at, side));
}
