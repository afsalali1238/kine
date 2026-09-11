/**
 * Rigging at runtime. The shipped GLB carries geometry only — no skin, no inverse bind
 * matrices — and the skeleton contract lives in `skeleton.json`. Both figures are built
 * from that pair at runtime, which is what makes the demonstrator and the locator the same
 * object rather than two models that merely look similar.
 *
 * Weights are nearest-bone with an exponential blend, resolved through y-bands so a 46k
 * vertex body skinning pass costs milliseconds instead of a second. The same function
 * drives the locator's idle breathing, so the deformation cannot disagree between screens.
 */

import * as THREE from 'three';
import { skeleton } from '@/lib/content';
import { rotationsForPose, type Pose } from '@/modules/animation';

const BANDS = 40;
const TAU = 0.075;

export type Rig = {
  mesh: THREE.SkinnedMesh;
  /** The skinned clone: same vertex order as the loaded body, plus the skin channels. */
  geometry: THREE.BufferGeometry;
  bones: Map<string, THREE.Bone>;
  root: THREE.Bone | null;
  dispose: () => void;
};

type Segment = {
  id: string;
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
};

function boneSegments(): { segments: Segment[]; min: number; max: number } {
  const defs = skeleton.bones;
  const byId = new Map(defs.map((def) => [def.id, def]));
  const children = new Map<string, string[]>();
  for (const def of defs) {
    if (!def.parent) continue;
    const list = children.get(def.parent) ?? [];
    list.push(def.id);
    children.set(def.parent, list);
  }
  const segments: Segment[] = defs.map((def) => {
    const kids = children.get(def.id) ?? [];
    const [x, y, z] = def.pos;
    if (kids.length) {
      const sum = kids.reduce(
        (acc, id) => {
          const p = byId.get(id)!.pos;
          return [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]];
        },
        [0, 0, 0],
      );
      return {
        id: def.id,
        ax: x,
        ay: y,
        az: z,
        bx: sum[0] / kids.length,
        by: sum[1] / kids.length,
        bz: sum[2] / kids.length,
      };
    }
    const parent = def.parent ? byId.get(def.parent) : undefined;
    const dir = parent ? [x - parent.pos[0], y - parent.pos[1], z - parent.pos[2]] : [0, -1, 0];
    const length = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    const stub = 0.075;
    return {
      id: def.id,
      ax: x,
      ay: y,
      az: z,
      bx: x + (dir[0] / length) * stub,
      by: y + (dir[1] / length) * stub,
      bz: z + (dir[2] / length) * stub,
    };
  });
  const ys = segments.flatMap((s) => [s.ay, s.by]);
  return { segments, min: Math.min(...ys), max: Math.max(...ys) };
}

function distanceToSegment(
  px: number,
  py: number,
  pz: number,
  segment: Segment,
  scratch: { t: number },
): number {
  const vx = segment.bx - segment.ax;
  const vy = segment.by - segment.ay;
  const vz = segment.bz - segment.az;
  const wx = px - segment.ax;
  const wy = py - segment.ay;
  const wz = pz - segment.az;
  const lenSq = vx * vx + vy * vy + vz * vz || 1e-6;
  let t = (wx * vx + wy * vy + wz * vz) / lenSq;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  scratch.t = t;
  const dx = wx - vx * t;
  const dy = wy - vy * t;
  const dz = wz - vz * t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** vertex → up to two bones, weighted by proximity. */
export function skinWeights(positions: Float32Array): {
  indices: Uint16Array;
  weights: Float32Array;
} {
  const { segments, min, max } = boneSegments();
  const ids = skeleton.bones.map((def) => def.id);
  const indexOf = new Map(ids.map((id, i) => [id, i]));
  const span = max - min || 1;
  const buckets: number[][] = Array.from({ length: BANDS }, () => []);
  segments.forEach((segment, index) => {
    const lo = Math.floor(((Math.min(segment.ay, segment.by) - min) / span) * BANDS);
    const hi = Math.ceil(((Math.max(segment.ay, segment.by) - min) / span) * BANDS);
    for (let band = Math.max(0, lo); band <= Math.min(BANDS - 1, hi); band++) {
      buckets[band].push(index);
    }
  });

  const count = positions.length / 3;
  const indices = new Uint16Array(count * 4);
  const weights = new Float32Array(count * 4);
  const scratch = { t: 0 };
  const best: { index: number; distance: number }[] = [];

  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    const band = Math.max(0, Math.min(BANDS - 1, Math.floor(((y - min) / span) * BANDS)));
    const candidates = buckets[band].length ? buckets[band] : segments.map((_, index) => index);
    best.length = 0;
    for (const index of candidates) {
      const distance = distanceToSegment(x, y, z, segments[index], scratch);
      if (best.length < 2) {
        best.push({ index, distance });
        if (best.length === 2 && best[0].distance < best[1].distance) best.reverse();
      } else if (distance < best[0].distance) {
        best[1] = best[0];
        best[0] = { index, distance };
      } else if (distance < best[1].distance) {
        best[1] = { index, distance };
      }
    }
    const near = Math.exp(-best[0].distance / TAU);
    const far = best[1] ? Math.exp(-best[1].distance / TAU) : 0;
    const total = near + far || 1;
    indices[i * 4] = indexOf.get(segments[best[0].index].id) ?? 0;
    indices[i * 4 + 1] = best[1] ? (indexOf.get(segments[best[1].index].id) ?? 0) : 0;
    weights[i * 4] = near / total;
    weights[i * 4 + 1] = far / total;
  }
  return { indices, weights };
}

const cache = new Map<string, Rig>();

/**
 * Builds (once per geometry) a skinned clone: same buffer, same material, same region
 * channel as the locator, plus the bone tree from `skeleton.json`.
 */
export function buildRig(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  key: string,
): Rig {
  const existing = cache.get(key);
  if (existing) return existing;
  const bones = new Map<string, THREE.Bone>();
  for (const def of skeleton.bones) {
    const bone = new THREE.Bone();
    bone.name = def.id;
    bones.set(def.id, bone);
  }
  for (const def of skeleton.bones) {
    const bone = bones.get(def.id)!;
    const parent = def.parent ? bones.get(def.parent) : null;
    const base = parent ? parentPosition(skeleton.bones, def.parent!) : [0, 0, 0];
    bone.position.set(def.pos[0] - base[0], def.pos[1] - base[1], def.pos[2] - base[2]);
    (parent ?? null)?.add(bone);
  }
  const root = bones.get(skeleton.bones.find((def) => !def.parent)!.id) ?? null;

  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const { indices, weights } = skinWeights(positions.array as Float32Array);
  const skinned = geometry.clone();
  skinned.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  skinned.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));

  const mesh = new THREE.SkinnedMesh(skinned, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  if (root) mesh.add(root);
  const all = [...bones.values()];
  mesh.bind(new THREE.Skeleton(all));

  const rig: Rig = {
    mesh,
    geometry: skinned,
    bones,
    root,
    dispose: () => {
      skinned.dispose();
      cache.delete(key);
    },
  };
  cache.set(key, rig);
  return rig;
}

function parentPosition(defs: typeof skeleton.bones, id: string): [number, number, number] {
  const def = defs.find((row) => row.id === id);
  return def ? [def.pos[0], def.pos[1], def.pos[2]] : [0, 0, 0];
}

const AXIS = new THREE.Vector3();
const QUAT = new THREE.Quaternion();

/** Applies a pose to the rig; every bone starts from bind orientation each frame. */
export function applyPose(rig: Rig, pose: Pose): void {
  for (const bone of rig.bones.values()) bone.quaternion.identity();
  for (const rotation of rotationsForPose(pose)) {
    const bone = rig.bones.get(rotation.bone);
    if (!bone) continue;
    AXIS.set(rotation.axis[0], rotation.axis[1], rotation.axis[2]).normalize();
    QUAT.setFromAxisAngle(AXIS, (rotation.deg * Math.PI) / 180);
    bone.quaternion.multiply(QUAT);
  }
}

export function disposeRigs() {
  for (const rig of [...cache.values()]) rig.dispose();
  cache.clear();
}

/**
 * How far to lift the figure so it rests on the floor instead of sinking through it, for a
 * given root rotation. One pass over the vertices, memoised per pose.
 */
export function floorLift(
  geometry: THREE.BufferGeometry,
  root: { roll?: number; pitch?: number; yaw?: number; drop?: number },
): number {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const array = positions.array as Float32Array;
  const sx = Math.sin(((root.roll ?? 0) * Math.PI) / 180);
  const cx = Math.cos(((root.roll ?? 0) * Math.PI) / 180);
  const sy = Math.sin(((root.pitch ?? 0) * Math.PI) / 180);
  const cy = Math.cos(((root.pitch ?? 0) * Math.PI) / 180);
  const sz = Math.sin(((root.yaw ?? 0) * Math.PI) / 180);
  const cz = Math.cos(((root.yaw ?? 0) * Math.PI) / 180);
  let minY = Infinity;
  for (let i = 0; i < array.length; i += 3) {
    const x = array[i];
    const y = array[i + 1];
    const z = array[i + 2];
    const y1 = y * cx + z * sx;
    const z1 = -y * sx + z * cx;
    const x2 = x * cy + z1 * sy;
    const y2 = y1;
    const y3 = y2 * cz - x2 * sz;
    if (y3 < minY) minY = y3;
  }
  return Number.isFinite(minY) ? Math.max(0, -minY) : 0;
}
