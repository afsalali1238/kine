/**
 * Content access layer. Every module reads authored JSON through this file, so the
 * lookup indexes exist once and `src/data/*.json` stays the only content store.
 */

import rawRegions from '@/data/regions.json';
import rawPresentations from '@/data/presentations.json';
import rawExercises from '@/data/exercises.json';
import rawAnimations from '@/data/animations.json';
import rawRules from '@/data/matching-rules.json';
import rawSkeleton from '@/data/skeleton.json';
import rawOutline from '@/data/body-outline.json';
import type { Exercise, Presentation, Region, ExerciseAnimation } from './types';

export type Vec3 = [number, number, number];

export type AxisDef = { left: Vec3; right: Vec3 };

export type JointDef = {
  paired: boolean;
  bones: string[];
  axes: Record<string, AxisDef>;
  rom: Record<string, [number, number]>;
};

export type BoneDef = { id: string; parent: string | null; pos: Vec3 };

export type RootPose = { roll?: number; pitch?: number; yaw?: number; drop?: number };

export type BasePose = { root?: RootPose } & Record<string, number | RootPose>;

export type SkeletonData = {
  version: number;
  generator: string;
  bones: BoneDef[];
  joints: Record<string, JointDef>;
  rom: Record<string, Record<string, [number, number]>>;
  basePoses: Record<string, BasePose>;
  axisIds: string[];
  pairedJoints: string[];
};

export type OutlineData = {
  /** Widest x / deepest z at each height, from the same mesh that ships as the GLB. */
  bounds: { lo: Vec3; hi: Vec3 };
  front: [number, number, number][];
  side: [number, number, number][];
  anchors: { id: string; front: [number, number]; back: [number, number]; r: number }[];
};

export type Rule = {
  presentationId: string;
  family: string;
  families: string[];
  group: string;
  baseScore: number;
  aggravators: Record<string, number>;
  easers: Record<string, number>;
  neuroWeight: number;
  gradualWeight: number;
  incidentWeight: number;
};

export const regions = rawRegions as unknown as Region[];
export const presentations = rawPresentations as unknown as Presentation[];
export const exercises = rawExercises as unknown as Exercise[];
export const animations = rawAnimations as unknown as ExerciseAnimation[];
export const rules = rawRules as unknown as Rule[];
export const skeleton = rawSkeleton as unknown as SkeletonData;
export const outlines = rawOutline as unknown as Record<'male' | 'female', OutlineData>;
export const outline = outlines.male;

/** The silhouette and its anchors are measured per sex. */
export function outlineFor(sex: 'male' | 'female'): OutlineData {
  return outlines[sex] ?? outlines.male;
}

const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]));

export const regionById = byId(regions);
export const presentationById = byId(presentations);
export const exerciseById = byId(exercises);
export const ruleByPresentation = new Map(rules.map((r) => [r.presentationId, r]));
export const animationByExercise = new Map(animations.map((a) => [a.exerciseId, a]));

/**
 * Only published, media-approved content reaches a patient. `mediaApproved` is set
 * when the animation content hash has been reviewed; drafts stay in the JSON so the
 * animator screen can keep working on them.
 */
export const readyExercises = exercises.filter(
  (e) => e.status === 'published' && e.mediaApproved !== false && e.animationId !== null,
);

export const exercisesByPresentation = (() => {
  const map = new Map<string, Exercise[]>();
  for (const ex of readyExercises) {
    for (const pid of ex.presentationIds) {
      const list = map.get(pid) ?? [];
      list.push(ex);
      map.set(pid, list);
    }
  }
  for (const list of map.values())
    list.sort((a, b) => a.phase - b.phase || a.id.localeCompare(b.id));
  return map;
})();

export function findRegion(id: string | null | undefined): Region | undefined {
  return id ? regionById.get(id) : undefined;
}

export function findExercise(id: string | null | undefined): Exercise | undefined {
  return id ? exerciseById.get(id) : undefined;
}

export function findPresentation(id: string | null | undefined): Presentation | undefined {
  return id ? presentationById.get(id) : undefined;
}

export function animationFor(exerciseId: string): ExerciseAnimation | undefined {
  return animationByExercise.get(exerciseId);
}

/** Bones of a joint for one side; `side` is ignored for unpaired joints. */
export function bonesForJoint(joint: JointDef, side: 'left' | 'right'): string[] {
  return joint.bones.map((b) => (joint.paired ? `${b}_${side === 'left' ? 'l' : 'r'}` : b));
}

export function jointForBone(boneId: string): string | undefined {
  const bare = boneId.replace(/_(l|r)$/, '');
  for (const [id, def] of Object.entries(skeleton.joints)) {
    if (def.bones.includes(bare)) return id;
  }
  return undefined;
}
