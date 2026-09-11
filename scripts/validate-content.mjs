/**
 * Build-time clinical validation (§5.5, §8, C1–C5).
 *
 * The premise: an out-of-range joint angle is not a rendering bug, it is a clinical
 * error heading for a patient, so it has to fail here rather than reach a screen.
 * The same file enforces region coverage, the no-placeholder translation rule, the
 * machine-readable dose contract and the content-hash signature chain.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { makeAnimationValidator } from './validate/animation.mjs';
import { checkAssets, checkDoseCeiling } from './validate/assets.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'src', 'data');
const read = (p) => JSON.parse(fs.readFileSync(path.join(DATA, p), 'utf8'));

const errors = [];
const fail = (msg) => errors.push(msg);

const TYPES = [
  'isometric',
  'mobility',
  'strength',
  'eccentric',
  'motor_control',
  'stretch',
  'nerve_glide',
  'breathing',
  'balance',
];
const POSITIONS = [
  'supine',
  'prone',
  'side_lying',
  'seated',
  'standing',
  'wall_standing',
  'four_point',
  'half_kneeling',
  'long_sitting',
];
const EQUIPMENT = ['none', 'band', 'weight', 'chair', 'wall', 'towel', 'pillow', 'step'];
const MEDIA = ['rig_animation', 'video', 'still_sequence', 'text_only'];
const LATERALITY = ['bilateral', 'unilateral'];
const GENERIC_ARABIC = [
  'منطقة الجسم',
  'حركة لطيفة للمفصل',
  'ألم',
  'العضلة',
  'المنطقة',
  'نمط',
  'حركة',
];

const regions = read('regions.json');
const exercises = read('exercises.json');
const presentations = read('presentations.json');
const animations = read('animations.json');
const skeleton = read('skeleton.json');
const rules = read('matching-rules.json');
const families = read('families.json').families;

if (regions.length < 70) fail(`only ${regions.length} regions; the brief requires 70+`);
if (exercises.length < 136)
  fail(`only ${exercises.length} exercises; v1 shipped 136 and none may be dropped`);

const regionIds = new Set();
for (const r of regions) {
  if (regionIds.has(r.id)) fail(`duplicate region id ${r.id}`);
  regionIds.add(r.id);
  if (!r.label || r.label.length < 2) fail(`${r.id}: missing label`);
  if (typeof r.labelAr !== 'string' || !r.labelAr.trim()) {
    fail(`${r.id}: region labels must ship a correct Arabic translation (or be reviewed)`);
  } else if (GENERIC_ARABIC.includes(r.labelAr)) {
    fail(`${r.id}: labelAr "${r.labelAr}" is a generic placeholder (C3)`);
  }
  for (const key of ['regionIdValue', 'focusTarget', 'focusDistance', 'family', 'side', 'views']) {
    if (r[key] === undefined || r[key] === null) fail(`${r.id}: missing ${key}`);
  }
  if (!families[r.family]) fail(`${r.id}: family ${r.family} has no chip vocabulary`);
  if (!Array.isArray(r.presentationIds) || !r.presentationIds.length)
    fail(`${r.id}: no presentations bound`);
  for (const pid of r.presentationIds ?? []) {
    if (!presentations.some((p) => p.id === pid)) fail(`${r.id}: unknown presentation ${pid}`);
  }
  if (!(r.emptyState || r.presentationIds.length))
    fail(`${r.id}: region can lead to an empty screen`);
}

// Every region must lead somewhere real: exercises, or an explicit empty state.
const byId = new Map(exercises.map((e) => [e.id, e]));
for (const r of regions) {
  const covered =
    (r.exerciseIds ?? []).length > 0 ||
    exercises.some((e) => e.status === 'published' && e.targetRegions.includes(r.id));
  if (!covered && !r.emptyState) {
    fail(`region ${r.id} resolves to zero published exercises and has no empty state`);
  }
}

const presById = new Map(presentations.map((p) => [p.id, p]));
for (const p of presentations) {
  for (const key of ['id', 'name', 'family', 'sites', 'explanation', 'course', 'helps']) {
    if (p[key] === undefined) fail(`presentation ${p.id}: missing ${key}`);
  }
  if (typeof p.nameAr === 'string' && GENERIC_ARABIC.includes(p.nameAr)) {
    fail(`presentation ${p.id}: generic Arabic placeholder`);
  }
  for (const site of p.sites ?? []) {
    if (!regions.some((r) => r.base === site))
      fail(`presentation ${p.id}: site ${site} is not a region base`);
  }
  const has = exercises.some((e) => e.presentationIds.includes(p.id));
  if (!has && !p.guidanceOnly && !p.redirect) {
    fail(`presentation ${p.id} has no exercises and is not marked guidance-only`);
  }
}

for (const rule of rules) {
  if (!presById.has(rule.presentationId))
    fail(`rule for unknown presentation ${rule.presentationId}`);
  const ruleFamilies = rule.families?.length ? rule.families : [rule.family];
  const chips = new Set(ruleFamilies.flatMap((f) => (families[f]?.chips ?? []).map((c) => c.key)));
  for (const k of Object.keys(rule.aggravators ?? {})) {
    if (!chips.has(k))
      fail(
        `rule ${rule.presentationId}: aggravator "${k}" is not a chip in ${ruleFamilies.join('/')}`,
      );
  }
  for (const k of Object.keys(rule.easers ?? {})) {
    if (!chips.has(k))
      fail(`rule ${rule.presentationId}: easer "${k}" is not a chip in ${ruleFamilies.join('/')}`);
  }
  for (const [k, v] of Object.entries(rule.aggravators ?? {})) {
    if (typeof v !== 'number' || v <= 0)
      fail(`rule ${rule.presentationId}: aggravator ${k} must be positive`);
  }
}

const animByExercise = new Map(animations.map((a) => [a.exerciseId, a]));

const validateAnimation = makeAnimationValidator({
  fail,
  positions: POSITIONS,
  skeleton,
  regions,
});

for (const e of exercises) {
  const where = `exercise ${e.id}`;
  if (!TYPES.includes(e.type)) fail(`${where}: type ${e.type} is not in the enum`);
  if (!POSITIONS.includes(e.positionRequired))
    fail(`${where}: positionRequired ${e.positionRequired} invalid`);
  if (!EQUIPMENT.includes(e.equipment)) fail(`${where}: equipment ${e.equipment} invalid`);
  if (!MEDIA.includes(e.mediaKind)) fail(`${where}: mediaKind ${e.mediaKind} invalid`);
  if (!LATERALITY.includes(e.laterality)) fail(`${where}: laterality invalid`);
  if (!Number.isInteger(e.phase) || e.phase < 1 || e.phase > 3)
    fail(`${where}: phase must be 1..3`);
  if (e.nameAr !== null && typeof e.nameAr !== 'string')
    fail(`${where}: nameAr must be a string or null`);
  if (typeof e.nameAr === 'string' && (GENERIC_ARABIC.includes(e.nameAr) || !e.nameAr.trim())) {
    fail(`${where}: nameAr is a placeholder; set it to null instead (C3)`);
  }
  if (e.cuesAr !== null && !Array.isArray(e.cuesAr))
    fail(`${where}: cuesAr must be null or an array`);
  if (!Array.isArray(e.cues) || e.cues.length < 2)
    fail(`${where}: needs at least two authored cues`);
  if (e.cues.some((c) => /todo|tbd|lorem|placeholder/i.test(c)))
    fail(`${where}: placeholder cue text`);
  for (const key of ['sets', 'restSeconds', 'frequencyPerWeek']) {
    if (!Number.isInteger(e[key]) || e[key] < 0)
      fail(`${where}: ${key} must be a non-negative integer (C4)`);
  }
  if (e.sets < 1) fail(`${where}: sets must be ≥ 1`);
  if (e.frequencyPerWeek < 1 || e.frequencyPerWeek > 14)
    fail(`${where}: frequencyPerWeek out of range`);
  if (e.reps !== null && (!Number.isInteger(e.reps) || e.reps < 1))
    fail(`${where}: reps must be null or ≥ 1`);
  if (e.holdSeconds !== null && (!Number.isInteger(e.holdSeconds) || e.holdSeconds < 3)) {
    fail(`${where}: holdSeconds must be null or ≥ 3`);
  }
  if (!e.reps && !e.holdSeconds) fail(`${where}: needs reps or a hold to be prescribable`);
  const t = e.tempo ?? {};
  for (const k of ['eccentricMs', 'pauseMs', 'concentricMs']) {
    if (!Number.isInteger(t[k]) || t[k] < 0)
      fail(`${where}: tempo.${k} must be a non-negative integer ms (C4)`);
  }
  if (t.eccentricMs < 500 && e.type !== 'isometric')
    fail(`${where}: eccentric phase under 0.5 s is too fast to demonstrate`);
  if (typeof e.tempo === 'string') fail(`${where}: tempo must be an object, not prose`);
  for (const pid of e.presentationIds)
    if (!presById.has(pid)) fail(`${where}: unknown presentation ${pid}`);
  if (!e.presentationIds.length) fail(`${where}: not bound to any presentation`);
  for (const rid of e.targetRegions)
    if (!regionIds.has(rid)) fail(`${where}: target region ${rid} does not exist`);
  if (!e.targetRegions.length) fail(`${where}: no target regions`);
  for (const [dir, id] of [
    ['easier', e.easierVariantId],
    ['harder', e.harderVariantId],
  ]) {
    if (id === null) continue;
    if (!byId.has(id)) fail(`${where}: ${dir} variant ${id} does not exist`);
  }
  if (e.easierVariantId === e.id || e.harderVariantId === e.id)
    fail(`${where}: variant points at itself`);
  for (const pid of e.contraindicatedFor)
    if (!presById.has(pid)) fail(`${where}: contraindication ${pid} unknown`);
  const anim = animByExercise.get(e.id);
  if (!anim) {
    fail(`${where}: no animation record for animationId ${e.animationId}`);
    continue;
  }
  if (anim.animationId !== e.animationId) fail(`${where}: animationId mismatch`);
  if (e.status === 'published' && anim.status !== 'published') {
    fail(
      `${where}: published exercise with an unsigned animation (re-run content:build --sign after review)`,
    );
  }
  validateAnimation(anim, where);
}

const bytes = checkAssets({ ROOT, DATA, fail, regions });
checkDoseCeiling({ fail, exercises });

try {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'check-lines.mjs')], {
    stdio: 'pipe',
  });
} catch (err) {
  fail(
    'line length / file size gate failed:\n' +
      String(err.stdout ?? '')
        .split('\n')
        .slice(1, 6)
        .join('\n'),
  );
}

if (errors.length) {
  console.error(`content validation failed: ${errors.length} problem(s)`);
  for (const e of errors.slice(0, 30)) console.error('  ✗ ' + e);
  if (errors.length > 30) console.error(`  …and ${errors.length - 30} more`);
  process.exit(1);
}
console.log(
  `content validated: ${regions.length} regions, ${exercises.length} exercises, ` +
    `${animations.length} timelines, ${presentations.length} presentations, ` +
    `${(bytes / 1024).toFixed(0)} KB of motion data`,
);
