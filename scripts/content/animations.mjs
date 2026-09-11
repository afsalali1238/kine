/**
 * Timeline generation (M7): exercise + movement template → joint-angle animation record.
 *
 * Nothing here is a baked animation file. A clip is a list of degrees and times; the
 * browser plays it on the rig. `contentHash` covers the track data so an edited angle
 * demotes the clip out of the published set until it is re-signed (§5.5).
 */

import crypto from 'node:crypto';
import { TEMPLATES, GENERIC, templateFor, NON_RIG } from './movements.mjs';

const EASE = 'easeInOut';

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function hashOf(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

/** Keyframe times for one repetition, with the hold inserted when prescribed. */
function times(holdSeconds) {
  if (holdSeconds) return { to: 0.22, holdEnd: 0.78, back: 1 };
  return { to: 0.44, holdEnd: 0.56, back: 1 };
}

export function durationFor(exercise) {
  const t = exercise.tempo;
  const base = (t.eccentricMs ?? 1600) + (t.pauseMs ?? 0) + (t.concentricMs ?? 1400);
  return Math.round(clamp(base * (exercise.holdSeconds ? 1.15 : 1) + 500, 2400, 9000));
}

function tracksFor(range, holdSeconds, rom, where) {
  const { to, holdEnd } = times(holdSeconds);
  const out = [];
  for (const [key, pair] of Object.entries(range)) {
    const [joint, axis] = key.split('.');
    const limits = rom[joint]?.[axis];
    if (!limits) throw new Error(`${where}: unknown joint axis ${key}`);
    const [from, target] = pair;
    const lo = Math.min(limits[0], limits[1]);
    const hi = Math.max(limits[0], limits[1]);
    const a = clamp(from, lo, hi);
    const b = clamp(target, lo, hi);
    const keyframes = [
      { t: 0, deg: a, easing: EASE },
      { t: to, deg: b, easing: EASE },
    ];
    if (holdSeconds) keyframes.push({ t: holdEnd, deg: b });
    keyframes.push({ t: 1, deg: a, easing: EASE });
    out.push({ joint, axis, keyframes });
  }
  return out;
}

/** Cue placement: a spoken cue lands when the body is in the position it describes. */
export function cueTimes(count, holdSeconds) {
  if (count <= 0) return [];
  if (count === 1) return [0.12];
  const spread = (i) => 0.1 + (i * 0.78) / (count - 1);
  if (!holdSeconds) return Array.from({ length: count }, (_, i) => Number(spread(i).toFixed(3)));
  const anchors = [0.05, 0.24, 0.52, 0.72, 0.9];
  return Array.from(
    { length: count },
    (_, i) =>
      anchors[Math.min(anchors.length - 1, Math.round((i / (count - 1)) * (anchors.length - 1)))],
  );
}

/**
 * @param {object} input
 * @param {object[]} input.exercises        v2 exercise records
 * @param {object[]} input.presentations
 * @param {object} input.skeleton           skeleton.json payload (rom + joints)
 * @param {Map<string,object>} input.previous  animationId → previously signed record
 */
export function buildAnimations({ exercises, skeleton, previous = new Map() }) {
  const rom = skeleton.rom;
  const joints = Object.keys(skeleton.joints);
  const generated = [];
  const errors = [];
  const unmatched = [];
  for (const ex of exercises) {
    const template = templateFor(ex.name);
    if (!template) unmatched.push(ex.name);
    const t = template ?? GENERIC;
    const holdSeconds = ex.holdSeconds ?? 0;
    const durationMs = durationFor(ex);
    const tracks = tracksFor(t.range ?? {}, holdSeconds, rom, ex.id);
    for (const tr of tracks) {
      if (!joints.includes(tr.joint)) errors.push(`${ex.id}: joint ${tr.joint} is not on the rig`);
      for (const k of tr.keyframes) {
        if (k.t < 0 || k.t > 1) errors.push(`${ex.id}: keyframe t outside 0..1`);
      }
    }
    const entries = Object.entries(t.fault?.delta ?? {});
    const faultTracks = entries.map(([key, pair]) => {
      const [joint, axis] = key.split('.');
      const limits = rom[joint]?.[axis] ?? [-180, 180];
      const lo = Math.min(limits[0], limits[1]);
      const hi = Math.max(limits[0], limits[1]);
      const base = tracks.find((x) => x.joint === joint && x.axis === axis);
      const from = (base?.keyframes[0].deg ?? 0) + pair[0];
      const to = (base?.keyframes[1].deg ?? pair[1]) + pair[1];
      const times0 = base ? base.keyframes.map((k) => k.t) : [0, 0.44, 0.56, 1];
      return {
        faultId: `${t.fault.id}-${ex.id}`,
        label: t.fault.label,
        labelAr: t.fault.labelAr,
        tracks: [
          {
            joint,
            axis,
            keyframes: times0.map((time, i) => ({
              t: time,
              deg: clamp(
                i === 0 ? from : i === times0.length - 1 ? (base?.keyframes[i].deg ?? to) : to,
                lo,
                hi,
              ),
            })),
          },
        ],
      };
    });
    if (!faultTracks.length && tracks.length) {
      // Every clip needs the mistake view: with no authored delta, exaggerate the
      // primary joint past the prescribed range, clamped to the ROM ceiling.
      const base =
        tracks.find((tr) => Math.abs(tr.keyframes[1].deg - tr.keyframes[0].deg) > 1) ?? tracks[0];
      const limits = rom[base.joint]?.[base.axis] ?? [0, 30];
      faultTracks.push({
        faultId: `over-range-${ex.id}`,
        label: 'Moving past the prescribed range to finish the rep',
        labelAr: 'تجاوز المدى الموصوف لإكمال التكرار',
        tracks: [
          {
            joint: base.joint,
            axis: base.axis,
            keyframes: base.keyframes.map((k, i) => ({
              ...k,
              deg: clamp(
                i === 0 ? k.deg : Math.max(k.deg, Math.min(limits[0], limits[1])),
                limits[0],
                limits[1],
              ),
            })),
          },
        ],
      });
    }
    const cueAt = cueTimes(ex.cues.length, holdSeconds);
    const cues = ex.cues.map((cue, i) => ({
      t: cueAt[i] ?? 0.5,
      cue,
      cueAr: null,
      audioKey: `${ex.id}-cue-${i + 1}`,
    }));
    for (let i = 1; i < cues.length; i++) {
      if ((cues[i].t - cues[i - 1].t) * durationMs < 400) {
        errors.push(`${ex.id}: cues ${i} and ${i + 1} fall within 400 ms`);
      }
    }
    const mirrorable = !!t.mirror && ex.laterality === 'unilateral';
    if (t.mirror && !mirrorable) void 0;
    const payload = {
      tracks,
      faultTracks,
      cues,
      cameras: t.cameras,
      durationMs,
      holdAt: holdSeconds ? times(holdSeconds).to : null,
      holdMs: holdSeconds ? holdSeconds * 1000 : null,
      basePose: ex.positionRequired,
      highlightRegions: t.highlight,
      props: [...new Set([...(t.props ?? []), ...(ex.equipment === 'none' ? [] : [ex.equipment])])],
    };
    if (!tracks.length && payload.basePose === undefined) errors.push(`${ex.id}: no base pose`);
    const contentHash = hashOf(payload);
    const prior = previous.get(ex.id);
    const signed = prior && prior.contentHash === contentHash;
    generated.push({
      animationId: ex.animationId,
      exerciseId: ex.id,
      templateId: t.id,
      ...payload,
      mirrorable,
      status: signed ? prior.status : 'draft',
      reviewedBy: signed ? (prior.reviewedBy ?? null) : null,
      contentHash,
    });
  }
  return { animations: generated, errors, unmatched };
}

export const templateIds = TEMPLATES.map((t) => t.id).concat(GENERIC.id);
export const mediaKindFor = (ex) => {
  const t = templateFor(ex.name);
  if (!t) return 'still_sequence';
  if (NON_RIG.test(ex.name) || t.id === GENERIC.id) return 'still_sequence';
  if (!Object.keys(t.range ?? {}).length) return 'still_sequence';
  return 'rig_animation';
};
