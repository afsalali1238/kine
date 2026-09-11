/**
 * v1 → v2 exercise migration (§4.2, C3, C4).
 *
 * Cue and mistake strings are copied verbatim; every dose field becomes a number or an
 * enum; `nameAr` is nulled rather than left holding a generic placeholder; target
 * regions are re-derived from the presentation's anatomical sites so that a knee
 * exercise no longer points at "knee-left" for every pattern around the joint.
 */

const AR_PENDING = null;

const TYPE_OVERRIDES = [
  [/breathing/i, 'breathing'],
  [/nerve glide|glide/i, 'nerve_glide'],
  [/balance/i, 'balance'],
  [/brace|blade setting|setting|control/i, 'motor_control'],
  [/stretch|open book|chest opening/i, 'stretch'],
];

function positionFor(ex) {
  const n = ex.name;
  if (/sit to stand/i.test(n)) return 'seated';
  if (/prone/i.test(n)) return 'prone';
  if (/side.?lying|open book/i.test(n)) return 'side_lying';
  if (/four.?point/i.test(ex.positionRequired) || /bird dog/i.test(n)) return 'four_point';
  if (/half.?kneel/i.test(n)) return 'half_kneeling';
  if (/long sitting/i.test(n)) return 'long_sitting';
  if (/wall (slide|push|press)/i.test(n) && ex.positionRequired === 'standing')
    return 'wall_standing';
  if (ex.positionRequired === 'lying') return 'supine';
  if (ex.positionRequired === 'seated') return 'seated';
  if (ex.positionRequired === 'standing') return 'standing';
  return 'standing';
}

function equipmentFor(ex) {
  const n = ex.name;
  if (ex.equipment === 'band') return 'band';
  if (ex.equipment === 'weight') return 'weight';
  if (/step up|step down|step calf/i.test(n)) return 'step';
  if (/towel/i.test(n)) return 'towel';
  if (ex.equipment === 'chair') return 'chair';
  if (ex.equipment === 'wall') return 'wall';
  if (/^supported .*(rest)$/i.test(n)) return 'pillow';
  return 'none';
}

function tempoFor(ex, type) {
  const slow = /3 seconds down/.test(String(ex.tempo));
  if (type === 'breathing') return { eccentricMs: 3000, pauseMs: 500, concentricMs: 2400 };
  if (type === 'isometric' || (ex.holdSeconds ?? 0) > 0) {
    return {
      eccentricMs: 900,
      pauseMs: Math.max(5, ex.holdSeconds ?? 20) * 1000,
      concentricMs: 900,
    };
  }
  if (type === 'eccentric') return { eccentricMs: 3000, pauseMs: 0, concentricMs: 650 };
  if (type === 'stretch' || type === 'nerve_glide')
    return { eccentricMs: 1800, pauseMs: 700, concentricMs: 1800 };
  return slow
    ? { eccentricMs: 3000, pauseMs: 0, concentricMs: 1500 }
    : { eccentricMs: 2000, pauseMs: 300, concentricMs: 1500 };
}

function typeFor(ex) {
  for (const [re, type] of TYPE_OVERRIDES) if (re.test(ex.name)) return type;
  if (ex.type === 'isometric') return 'isometric';
  if (ex.type === 'eccentric') return 'eccentric';
  if (ex.type === 'strength') return 'strength';
  return 'mobility';
}

/** v1 target regions were coarse; the presentation's anatomical sites are finer. */
export function targetRegionsFor(ex, presentations, regions) {
  const bases = new Set();
  for (const pid of ex.presentationIds) {
    const p = presentations.find((x) => x.id === pid);
    for (const site of p?.sites ?? []) bases.add(site);
  }
  const ids = [];
  const byBase = new Map();
  for (const r of regions) {
    if (!byBase.has(r.base)) byBase.set(r.base, []);
    byBase.get(r.base).push(r.id);
  }
  for (const base of bases) {
    for (const id of byBase.get(base) ?? [])
      if (!id.includes('face') || base === 'face') ids.push(id);
  }
  const legacy = {
    'lower-back': ['lumbar-spine', 'sacrum'],
    abdomen: ['upper-abdomen', 'lower-abdomen'],
    chest: ['pectoral', 'costal-margin'],
    'upper-back': ['thoracic-spine', 'rhomboid'],
    neck: ['cervical-upper', 'cervical-lower'],
  };
  for (const old of ex.targetRegions ?? []) {
    for (const base of legacy[old] ?? []) {
      for (const id of byBase.get(base) ?? []) ids.push(id);
    }
    const m = /^(.*)-(left|right)$/.exec(old);
    if (m) for (const id of byBase.get(m[1]) ?? []) if (id.endsWith(m[2])) ids.push(id);
  }
  return [...new Set(ids)].slice(0, 26);
}

/**
 * @param {object[]} v1exercises
 * @param {object[]} presentations
 * @param {object[]} regions
 * @param {object[]} templateNames  ids of movements that can be rig-driven
 */
export function migrate(v1exercises, presentations, regions) {
  const ids = new Set(v1exercises.map((e) => e.id));
  const warnings = [];
  const out = v1exercises.map((ex) => {
    const type = typeFor(ex);
    const tempo = tempoFor(ex, type);
    const targetRegions = targetRegionsFor(ex, presentations, regions);
    if (!targetRegions.length) warnings.push(`${ex.id}: no target regions resolved`);
    const sibling = (id) => {
      if (!id || id === ex.id || !ids.has(id)) return null;
      return id;
    };
    // v1's boundary variants pointed back at themselves; a variant ladder has to be a
    // ladder, so a self-reference is dropped rather than silently swapping an exercise
    // for an identical one.
    const easier = sibling(ex.easierVariantId);
    const harder = sibling(ex.harderVariantId);
    const contra = new Set(ex.contraindicatedFor ?? []);
    // v1's two carried rules, expressed as data rather than code.
    if (/extension/i.test(ex.name) && ex.presentationIds.includes('back-flexion'))
      contra.add('back-flexion');
    if (ex.phase >= 2 && presentations.some((p) => p.lockPhases?.includes(ex.phase))) {
      for (const pid of ex.presentationIds) {
        if (presentations.find((p) => p.id === pid)?.lockPhases?.includes(ex.phase))
          contra.add(pid);
      }
    }
    if (/quick|jump|hop|run/i.test(ex.name)) {
      for (const pid of ex.presentationIds) {
        if (presentations.find((p) => p.id === pid)?.tendon) contra.add(pid);
      }
    }
    const reps = ex.reps && ex.holdSeconds ? null : ex.reps || null;
    return {
      id: ex.id,
      name: ex.name,
      nameAr: AR_PENDING,
      presentationIds: ex.presentationIds,
      phase: ex.phase,
      targetRegions,
      type,
      sets: ex.sets,
      reps: ex.holdSeconds ? null : reps,
      holdSeconds: ex.holdSeconds || null,
      tempo,
      restSeconds: ex.restSeconds ?? 45,
      frequencyPerWeek: ex.frequencyPerWeek ?? 3,
      equipment: equipmentFor(ex),
      positionRequired: positionFor(ex),
      laterality: /single|split|lateral step|one leg/i.test(ex.name) ? 'unilateral' : 'bilateral',
      cues: [...ex.cues],
      cuesAr: AR_PENDING,
      commonMistakes: [...(ex.commonMistakes ?? [])],
      easierVariantId: easier,
      harderVariantId: harder,
      contraindicatedFor: [...contra],
      animationId: `${ex.id}-v2`,
      mediaKind: 'rig_animation',
      status: 'published',
      provenance: 'migrated-from-v1',
    };
  });
  return { exercises: out, warnings };
}
