/**
 * Joint algebra shared by the 3D demonstrator and the 2D fallback, so both move from
 * identical numbers. Tracks are authored for the left side; a right-sided pin mirrors by
 * using the mirrored axis vector from `skeleton.json` with the same angle.
 */

import { bonesForJoint, skeleton } from '@/lib/content';

export type Side = 'left' | 'right' | 'both';
export type Pose = { side: Side; joints: Record<string, Record<string, number>> };

export type Vec3 = [number, number, number];

export const emptyPose = (side: Side = 'both'): Pose => ({ side, joints: {} });

export function setJoint(pose: Pose, joint: string, axis: string, deg: number): Pose {
  const joints = { ...pose.joints, [joint]: { ...(pose.joints[joint] ?? {}), [axis]: deg } };
  return { ...pose, joints };
}

export function axisVector(joint: string, axis: string, side: 'left' | 'right'): Vec3 | null {
  const entry = skeleton.joints[joint]?.axes?.[axis];
  if (!entry) return null;
  return (side === 'left' ? entry.left : entry.right) as Vec3;
}

/** Bones this pose rotates, with the angle each bone receives (chains split the angle). */
export function rotationsForPose(pose: Pose): { bone: string; axis: Vec3; deg: number }[] {
  const out: { bone: string; axis: Vec3; deg: number }[] = [];
  for (const [jointId, axes] of Object.entries(pose.joints)) {
    const def = skeleton.joints[jointId];
    if (!def) continue;
    for (const [axis, deg] of Object.entries(axes)) {
      const left = axisVector(jointId, axis, 'left');
      if (!left) continue;
      const sides: ('left' | 'right')[] = !def.paired
        ? ['left']
        : pose.side === 'both'
          ? ['left', 'right']
          : [pose.side];
      for (const side of sides) {
        const dir = (side === 'left' ? left : (axisVector(jointId, axis, 'right') ?? left)) as Vec3;
        const list = def.paired ? bonesForJoint(def, side) : def.bones;
        // A joint spanning several bones (thoracic, cervical) shares the angle along the
        // chain, so the cumulative rotation at the end of it equals the authored number.
        const share = deg / Math.max(1, list.length);
        for (const bone of list) out.push({ bone, axis: dir, deg: share });
      }
    }
  }
  return out;
}

/** The same angles on the opposite side — how one authored record serves both sides. */
export function mirrored(pose: Pose): Pose {
  const side: Side = pose.side === 'left' ? 'right' : pose.side === 'right' ? 'left' : 'both';
  return { ...pose, side };
}

export type RootTransform = { roll: number; pitch: number; yaw: number; drop: number };

/** Where a base pose (supine, seated…) puts the root and the joints. */
export function basePoseFor(name: string): { pose: Pose; root: RootTransform } {
  const def = skeleton.basePoses[name] ?? {};
  const root: RootTransform = { roll: 0, pitch: 0, yaw: 0, drop: 0 };
  const pose = emptyPose('both');
  for (const [key, value] of Object.entries(def)) {
    if (key === 'root' && value && typeof value === 'object') {
      Object.assign(root, value);
      continue;
    }
    if (typeof value !== 'number') continue;
    const [joint, axis] = key.split('.');
    if (joint && axis) {
      pose.joints[joint] = { ...(pose.joints[joint] ?? {}), [axis]: value };
    }
  }
  return { pose, root };
}

export function combine(...poses: Pose[]): Pose {
  const out: Pose = { side: poses[0]?.side ?? 'both', joints: {} };
  for (const pose of poses) {
    for (const [joint, axes] of Object.entries(pose.joints)) {
      out.joints[joint] = { ...(out.joints[joint] ?? {}), ...axes };
    }
  }
  return out;
}
