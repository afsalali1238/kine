/**
 * kinē — demonstrator rig: bone hierarchy, joint axes, range-of-motion table and
 * automatic skin weights for the generated body.
 *
 * Bone names follow the conventional humanoid set (hips / spine_0n / clavicle_l /
 * upperarm_l / …) so third-party motion can be retargeted onto it later.
 *
 * Axis contract: each (joint, axis) resolves to a unit vector per side. Positive
 * degrees rotate about that vector by the right-hand rule and always mean the
 * anatomical direction named by the axis id (flexion = forward). Mirroring a left
 * track to the right is `(x, y, z) → (x, -y, -z)` with the angle unchanged, which is
 * why every right vector below is the left vector with y and z negated.
 */

import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const read = (p) => JSON.parse(fs.readFileSync(path.join(HERE, p), 'utf8'));

/** Bind-pose joint positions in metres; the subject's left is +X. */
/** Lifted to `data/bones.json` so the table is reviewed as data. */
export const BONES = read('data/bones.json');

const A = (left, right) => [left, right];
const mirror = (v) => [v[0], -v[1], -v[2]];

/** Every axis pair declared once for the left side; the right side is derived. */
const SPEC = {
  lumbar: {
    bones: ['spine_01'],
    axes: {
      flexion: A([1, 0, 0]),
      extension: A([-1, 0, 0]),
      lateral_flexion: A([0, 0, -1]),
      internal_rotation: A([0, 1, 0]),
    },
  },
  thoracic: {
    bones: ['spine_02', 'spine_03'],
    axes: {
      flexion: A([1, 0, 0]),
      extension: A([-1, 0, 0]),
      lateral_flexion: A([0, 0, -1]),
      internal_rotation: A([0, 1, 0]),
    },
  },
  cervical: {
    bones: ['neck_01'],
    axes: {
      flexion: A([1, 0, 0]),
      extension: A([-1, 0, 0]),
      lateral_flexion: A([0, 0, -1]),
      internal_rotation: A([0, 1, 0]),
    },
  },
  head: { bones: ['head'], axes: { flexion: A([1, 0, 0]), extension: A([-1, 0, 0]) } },
  pelvis: {
    bones: ['hips'],
    axes: {
      flexion: A([1, 0, 0]),
      extension: A([-1, 0, 0]),
      lateral_flexion: A([0, 0, -1]),
      internal_rotation: A([0, 1, 0]),
    },
  },
  shoulder: {
    bones: ['upperarm'],
    axes: {
      flexion: A([-1, 0, 0]),
      extension: A([1, 0, 0]),
      abduction: A([0, 0, 1]),
      internal_rotation: A([0, -1, 0]),
      external_rotation: A([0, 1, 0]),
    },
  },
  scapula: {
    bones: ['scapula'],
    axes: {
      abduction: A([0, 0, 1]),
      adduction: A([0, 0, -1]),
      internal_rotation: A([0, -1, 0]),
      external_rotation: A([0, 1, 0]),
    },
  },
  elbow: {
    bones: ['lowerarm'],
    axes: {
      flexion: A([-1, 0, 0]),
      extension: A([1, 0, 0]),
      internal_rotation: A([0, -1, 0]),
      external_rotation: A([0, 1, 0]),
    },
  },
  wrist: {
    bones: ['hand'],
    axes: {
      flexion: A([-1, 0, 0]),
      extension: A([1, 0, 0]),
      abduction: A([0, 0, 1]),
      adduction: A([0, 0, -1]),
    },
  },
  hip: {
    bones: ['thigh'],
    axes: {
      flexion: A([-1, 0, 0]),
      extension: A([1, 0, 0]),
      abduction: A([0, 0, 1]),
      internal_rotation: A([0, -1, 0]),
      external_rotation: A([0, 1, 0]),
    },
  },
  knee: {
    bones: ['calf'],
    // Tibial rotation is real and the valgus collapse a physio wants you to see is a
    // rotation fault, so the rig needs the axis even though the prescription rarely uses it.
    axes: {
      flexion: A([-1, 0, 0]),
      extension: A([1, 0, 0]),
      internal_rotation: A([0, -1, 0]),
      external_rotation: A([0, 1, 0]),
    },
  },
  ankle: {
    bones: ['foot'],
    axes: {
      flexion: A([1, 0, 0]),
      extension: A([-1, 0, 0]),
      abduction: A([0, -1, 0]),
      adduction: A([0, 1, 0]),
    },
  },
  toes: { bones: ['toe'], axes: { flexion: A([1, 0, 0]), extension: A([-1, 0, 0]) } },
};

/** Clinically defensible ceilings. A keyframe outside these fails the build. */
/** Lifted to `data/joint-rom.json` so the table is reviewed as data. */
export const ROM = read('data/joint-rom.json');

/**
 * Rest angles applied to the rig before a timeline plays, so one authored clip reads
 * correctly in every prescribed position. Values are `joint.axis = degrees`.
 */
/**
 * `root.drop` is how far the whole figure comes down toward its support, in metres, after the
 * pose is applied. The pelvis of a standing skeleton sits at about 0.95 m, so a seated figure
 * without a drop hovers half a metre above the chair. Rotational poses (supine, prone,
 * four-point) leave the drop at zero and rely on the floor lift instead, which is measured from
 * the geometry rather than authored.
 */
/** Lifted to `data/base-poses.json` so the table is reviewed as data. */
export const BASE_POSES = read('data/base-poses.json');

/** Lifted to `data/paired-joints.json` so the table is reviewed as data. */
export const PAIRED_JOINTS = read('data/paired-joints.json');
export const JOINT_IDS = Object.keys(SPEC);
export const AXIS_IDS = [...new Set(Object.values(SPEC).flatMap((j) => Object.keys(j.axes)))];

/** Full skeleton contract emitted to `src/data/skeleton.json`. */
export function skeleton() {
  const joints = {};
  for (const [id, spec] of Object.entries(SPEC)) {
    const paired = id !== 'pelvis' && !['lumbar', 'thoracic', 'cervical', 'head'].includes(id);
    const axes = {};
    for (const [axis, pair] of Object.entries(spec.axes)) {
      const left = pair[0];
      const right = pair[1] ?? mirror(left);
      if (
        Math.abs(right[0] - left[0]) > 1e-9 ||
        Math.abs(right[1] + left[1]) > 1e-9 ||
        Math.abs(right[2] + left[2]) > 1e-9
      ) {
        throw new Error(`${id}.${axis}: the right axis must be the x-mirror of the left axis`);
      }
      axes[axis] = { left, right };
    }
    joints[id] = { paired, bones: spec.bones, axes, rom: ROM[id] };
  }
  return {
    version: 2,
    generator: 'scripts/build-body-assets.mjs',
    bones: BONES,
    joints,
    boneCount: BONES.length,
    rom: ROM,
    basePoses: BASE_POSES,
    axisIds: AXIS_IDS,
    pairedJoints: PAIRED_JOINTS,
  };
}

const distToSegment = (p, a, b) => {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const len2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2] || 1e-9;
  const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / len2));
  const d = [ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t];
  return Math.hypot(d[0], d[1], d[2]);
};

/**
 * Linear blend skin weights: the four nearest bones with exponential falloff.
 * Deterministic, so the same source always produces byte-identical weights.
 */
export function skinWeights(positions) {
  const segments = BONES.map((bone) => {
    const kids = BONES.filter((c) => c.parent === bone.id);
    const end = kids.length
      ? [
          kids.reduce((s, k) => s + k.pos[0], 0) / kids.length,
          kids.reduce((s, k) => s + k.pos[1], 0) / kids.length,
          kids.reduce((s, k) => s + k.pos[2], 0) / kids.length,
        ]
      : [bone.pos[0], bone.pos[1] + 0.075, bone.pos[2]];
    const sigma =
      bone.id === 'hips'
        ? 0.15
        : bone.id.startsWith('spine')
          ? 0.11
          : bone.id === 'head'
            ? 0.09
            : 0.072;
    return { id: bone.id, a: bone.pos, b: end, sigma };
  });
  const joints = [];
  const weights = [];
  for (const p of positions) {
    const scored = segments
      .map((s) => ({ i: BONES.findIndex((b) => b.id === s.id), d: distToSegment(p, s.a, s.b), s }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 4);
    const raw = scored.map((x) => Math.exp(-((x.d / x.s.sigma) ** 2)));
    const total = raw.reduce((a, b) => a + b, 0) || 1;
    joints.push(scored.map((x) => x.i));
    weights.push(raw.map((w) => w / total));
  }
  return { joints, weights };
}
