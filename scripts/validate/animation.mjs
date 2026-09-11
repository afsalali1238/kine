/**
 * The animation half of the content gate: every published keyframe must land inside the
 * shared ROM table, the cue strip must be spaced, the fault track must exist, and the
 * content hash must still describe the tracks it was signed over. Split out of
 * `validate-content.mjs` so the gate reads as two screens, not four.
 */

import crypto from 'node:crypto';

const PROPS = ['band', 'chair', 'wall', 'weight', 'dumbbell', 'towel', 'step', 'pillow', 'none'];

/** @param {{fail:(m:string)=>void, positions:string[], skeleton:object, regions:object[]}} ctx */
export function makeAnimationValidator({ fail, positions, skeleton, regions }) {
  const rom = skeleton.rom;
  const jointIds = new Set(Object.keys(skeleton.joints));

  return function validateAnimation(a, where) {
    if (!positions.includes(a.basePose)) fail(`${where}: animation basePose ${a.basePose} invalid`);
    if (!Number.isInteger(a.durationMs) || a.durationMs < 1500 || a.durationMs > 12000) {
      fail(`${where}: durationMs ${a.durationMs} out of the demonstrable band`);
    }
    if (a.cameras.length !== 2)
      fail(`${where}: needs exactly two cameras (side view is not optional)`);
    const camIds = new Set(a.cameras.map((c) => c.id));
    if (!camIds.has('primary') || !camIds.has('secondary'))
      fail(`${where}: cameras must be primary + secondary`);
    for (const c of a.cameras) {
      if (typeof c.azimuth !== 'number' || typeof c.elevation !== 'number')
        fail(`${where}: camera ${c.id} angles missing`);
      if (c.distance < 0.6 || c.distance > 4)
        fail(`${where}: camera ${c.id} distance ${c.distance} unreasonable`);
    }
    const allTracks = [...a.tracks, ...a.faultTracks.flatMap((f) => f.tracks)];
    if (!allTracks.length) fail(`${where}: animation has no tracks and no still fallback declared`);
    for (const tr of allTracks) {
      if (!jointIds.has(tr.joint)) fail(`${where}: joint ${tr.joint} is not on the rig`);
      const joint = skeleton.joints[tr.joint];
      if (!joint) continue;
      if (!joint.axes[tr.axis]) fail(`${where}: ${tr.joint} has no axis ${tr.axis}`);
      const limits = rom[tr.joint]?.[tr.axis];
      if (!limits) {
        fail(`${where}: no ROM entry for ${tr.joint}.${tr.axis}`);
        continue;
      }
      const lo = Math.min(limits[0], limits[1]);
      const hi = Math.max(limits[0], limits[1]);
      let prev = -Infinity;
      for (const k of tr.keyframes) {
        if (typeof k.t !== 'number' || k.t < 0 || k.t > 1)
          fail(`${where}: keyframe t ${k.t} outside 0..1`);
        if (k.t < prev - 1e-9) fail(`${where}: keyframes not monotonic on ${tr.joint}.${tr.axis}`);
        prev = k.t;
        if (k.deg < lo - 0.01 || k.deg > hi + 0.01) {
          fail(
            `${where}: ${tr.joint}.${tr.axis} = ${k.deg}° is outside the ROM table ` +
              `[${lo}, ${hi}] — clinical error, not a render bug`,
          );
        }
      }
      if (tr.keyframes.length < 2)
        fail(`${where}: ${tr.joint}.${tr.axis} needs a start and an end`);
    }
    if (a.mirrorable) {
      for (const tr of allTracks) {
        if (!skeleton.joints[tr.joint]?.paired)
          fail(`${where}: mirrorable animation uses unpaired joint ${tr.joint}`);
      }
    }
    let prevT = -1;
    for (const c of a.cues) {
      if (c.t < 0 || c.t > 1) fail(`${where}: cue t ${c.t} outside 0..1`);
      if (prevT >= 0 && (c.t - prevT) * a.durationMs < 400)
        fail(`${where}: two cues fall within 400 ms`);
      prevT = c.t;
    }
    for (const rid of a.highlightRegions) {
      if (!regions.some((r) => r.base === rid || r.id === rid))
        fail(`${where}: highlight region ${rid} unknown`);
    }
    for (const p of a.props) {
      if (!PROPS.includes(p)) fail(`${where}: prop ${p} is not modelled`);
    }
    if (!a.faultTracks.length) fail(`${where}: no fault track — the mistake view is not optional`);
    const recomputed = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          tracks: a.tracks,
          faultTracks: a.faultTracks,
          cues: a.cues,
          cameras: a.cameras,
          durationMs: a.durationMs,
          holdAt: a.holdAt,
          holdMs: a.holdMs,
          basePose: a.basePose,
          highlightRegions: a.highlightRegions,
          props: a.props,
        }),
      )
      .digest('hex')
      .slice(0, 16);
    if (recomputed !== a.contentHash) fail(`${where}: contentHash does not match the track data`);
  };
}
