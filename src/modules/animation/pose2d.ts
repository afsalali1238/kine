/**
 * 2D forward kinematics, driven by the same pose objects as the 3D demonstrator.
 *
 * This is what the reduced-motion and no-WebGL tiers draw, and what the handout prints:
 * a real projection of the joint angles for the requested view, not a picture of a
 * person. Frontal-plane axes (lateral flexion, abduction) show up in the front view,
 * sagittal-plane axes (flexion, extension) in the side view; axial rotation is reported
 * as a number on the label rather than a silhouette change, because a flat drawing
 * cannot carry it honestly.
 */

import { skeleton } from '@/lib/content';
import type { Pose, RootTransform } from './joints';

export type View2D = 'front' | 'side' | 'back';
export type Point2D = [number, number];
export type Segment2D = { from: Point2D; to: Point2D; width: number; bone: string };
export type Drawing2D = {
  segments: Segment2D[];
  joints: { id: string; at: Point2D }[];
  bounds: { lo: Point2D; hi: Point2D };
  axial: { joint: string; axis: string; deg: number }[];
};

const WIDTH: Record<string, number> = {
  hips: 0.3,
  spine_01: 0.24,
  spine_02: 0.24,
  spine_03: 0.24,
  neck_01: 0.1,
  head: 0.17,
  clavicle_l: 0.13,
  clavicle_r: 0.13,
  scapula_l: 0.11,
  scapula_r: 0.11,
  shoulder_l: 0.11,
  shoulder_r: 0.11,
  upperarm_l: 0.08,
  upperarm_r: 0.08,
  lowerarm_l: 0.065,
  lowerarm_r: 0.065,
  hand_l: 0.09,
  hand_r: 0.09,
  thigh_l: 0.13,
  thigh_r: 0.13,
  calf_l: 0.11,
  calf_r: 0.11,
  foot_l: 0.09,
  foot_r: 0.09,
  toe_l: 0.07,
  toe_r: 0.07,
};

const FRONTAL = { lateral_flexion: 1, abduction: 1, adduction: -1 } as const;
const SAGITTAL = { flexion: 1, extension: -1 } as const;

function angleFor(boneId: string, pose: Pose, view: View2D): number {
  let total = 0;
  for (const [jointId, axes] of Object.entries(pose.joints)) {
    const def = skeleton.joints[jointId];
    if (!def || !def.bones.includes(bare(boneId))) continue;
    for (const [axis, deg] of Object.entries(axes)) {
      if (view === 'side') {
        const k = SAGITTAL[axis as keyof typeof SAGITTAL];
        if (k) total += deg * k;
      } else {
        const k = FRONTAL[axis as keyof typeof FRONTAL];
        if (k) total += deg * k * (view === 'back' ? -1 : 1);
      }
    }
  }
  return total;
}

const bare = (id: string) => id.replace(/_(l|r)$/, '');

function rotate([x, y]: Point2D, deg: number): Point2D {
  const r = (deg * Math.PI) / 180;
  return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
}

/**
 * Walks the bone tree once per view. Each bone's offset is rotated by the accumulated
 * angle of its ancestors, which is exactly what the skinned 3D figure does per chain.
 */
export function drawPose(pose: Pose, view: View2D, root?: RootTransform): Drawing2D {
  const byId = new Map(skeleton.bones.map((b) => [b.id, b]));
  const positions = new Map<string, Point2D>();
  const axial: Drawing2D['axial'] = [];

  const project = (p: [number, number, number]): Point2D =>
    view === 'side' ? [p[2], p[1]] : [view === 'back' ? -p[0] : p[0], p[1]];

  const worldOf = (id: string): { at: Point2D; angle: number } => {
    const bone = byId.get(id)!;
    const own = angleFor(id, pose, view);
    if (!bone.parent) return { at: project(bone.pos), angle: own };
    const parent = worldOf(bone.parent);
    const parentBone = byId.get(bone.parent)!;
    const offset = bone.pos.map((v, i) => v - parentBone.pos[i]) as [number, number, number];
    const local = rotate(project(offset), parent.angle);
    return { at: [parent.at[0] + local[0], parent.at[1] + local[1]], angle: parent.angle + own };
  };

  for (const bone of skeleton.bones) {
    const world = worldOf(bone.id);
    positions.set(bone.id, world.at);
  }

  for (const [jointId, axes] of Object.entries(pose.joints)) {
    for (const [axis, deg] of Object.entries(axes)) {
      if (axis === 'internal_rotation' || axis === 'external_rotation') {
        axial.push({ joint: jointId, axis, deg });
      }
    }
  }

  // A figure that lies down is drawn lying down: the projection rotates by the same root
  // angle the 3D wrapper uses, then rests on the floor. An upright figure only takes the
  // authored drop, so a seated drawing sits on its chair instead of floating above it.
  const tilt = root
    ? view === 'side'
      ? root.roll
      : view === 'front' || view === 'back'
        ? root.yaw
        : 0
    : 0;
  if (root && (Math.abs(tilt) > 0.01 || root.drop)) {
    const rad = (-tilt * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const hips = positions.get('hips') ?? [0, 0.95];
    for (const [id, point] of [...positions.entries()]) {
      const dx = point[0] - hips[0];
      const dy = point[1] - hips[1];
      positions.set(id, [hips[0] + dx * cos - dy * sin, hips[1] + dx * sin + dy * cos - root.drop]);
    }
    if (Math.abs(tilt) > 0.01) {
      const lowest = Math.min(...[...positions.values()].map((point) => point[1]));
      for (const [id, point] of [...positions.entries()]) {
        positions.set(id, [point[0], point[1] - lowest]);
      }
    }
  }

  const segments: Segment2D[] = [];
  for (const bone of skeleton.bones) {
    const parent = bone.parent ? byId.get(bone.parent) : undefined;
    if (!parent) continue;
    const from = positions.get(parent.id)!;
    const to = positions.get(bone.id)!;
    segments.push({
      from,
      to,
      width: WIDTH[bone.id] ?? 0.07,
      bone: bone.id,
    });
  }
  // Tip stubs so hands and feet read as limbs rather than dots.
  for (const bone of skeleton.bones) {
    const id = bone.id;
    if (!/_(l|r)$/.test(id)) continue;
    const at = positions.get(id)!;
    const down = view === 'side' ? [0.001, -1] : [0, -1];
    segments.push({
      from: at,
      to: [
        at[0] + down[0] * (id.startsWith('hand') ? 0.1 : 0.075),
        at[1] + down[1] * (id.startsWith('hand') ? 0.1 : 0.075),
      ],
      width: WIDTH[id] ?? 0.07,
      bone: id,
    });
  }

  const jointMarks = Object.keys(skeleton.joints).map((id) => {
    const bones = skeleton.joints[id].bones.map((b) =>
      skeleton.joints[id].paired ? `${b}_${pose.side === 'right' ? 'r' : 'l'}` : b,
    );
    const first = bones[0];
    const anchor =
      positions.get(first) ?? positions.get(skeleton.joints[id].bones[0]) ?? ([0, 1] as Point2D);
    return { id, at: anchor };
  });

  const ys = [...positions.values()].map((p) => p[1]);
  const xs = [...positions.values()].map((p) => p[0]);
  return {
    segments,
    joints: jointMarks,
    bounds: {
      lo: [Math.min(...xs) - 0.1, Math.min(...ys) - 0.12],
      hi: [Math.max(...xs) + 0.1, Math.max(...ys) + 0.1],
    },
    axial,
  };
}

export function svgPath(drawing: Drawing2D, height = 240): { d: string; viewBox: string } {
  const { lo, hi } = drawing.bounds;
  const spanY = hi[1] - lo[1] || 1;
  const scale = height / spanY;
  const spanX = hi[0] - lo[0] || 1;
  const w = spanX * scale;
  const sx = (v: number) => (v - lo[0]) * scale;
  const sy = (v: number) => height - (v - lo[1]) * scale;
  const d = drawing.segments
    .map(
      (s) =>
        `M${sx(s.from[0]).toFixed(2)} ${sy(s.from[1]).toFixed(2)}L${sx(s.to[0]).toFixed(2)} ${sy(s.to[1]).toFixed(2)}`,
    )
    .join('');
  return { d, viewBox: `0 0 ${w.toFixed(1)} ${height}` };
}
