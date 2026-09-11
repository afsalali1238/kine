/**
 * Region → clinical presentation map, keyed by anatomical surface rather than by
 * coarse body part. This table is what makes "anterior knee" and "posterior knee"
 * produce different programmes; it is deliberately a plain list a physio can edit.
 *
 * `affinity` weights are added to a rule's score when the tapped region lists that
 * presentation, so regional precision is transparent and auditable.
 */

/** base region id → { family, presentations, affinity, note } */
export const REGION_MAP = {
  // head, face, jaw
  forehead: {
    family: 'head-jaw',
    presentations: ['head-face-review'],
    redirect: 'neck-mechanical',
  },
  temple: { family: 'head-jaw', presentations: ['head-face-review'], redirect: 'neck-headache' },
  face: { family: 'head-jaw', presentations: ['head-face-review'] },
  ear: { family: 'head-jaw', presentations: ['head-face-review'] },
  jaw: { family: 'head-jaw', presentations: ['tmj', 'neck-headache'], affinity: { tmj: 10 } },
  occiput: {
    family: 'neck',
    presentations: ['neck-headache', 'neck-mechanical'],
    affinity: { 'neck-headache': 9 },
  },
  'scalp-side': { family: 'head-jaw', presentations: ['head-face-review', 'neck-headache'] },
  'scalp-top': { family: 'head-jaw', presentations: ['head-face-review'] },
  // neck
  'cervical-upper': {
    family: 'neck',
    presentations: ['neck-mechanical', 'neck-headache', 'cervical-radicular'],
  },
  'cervical-lower': {
    family: 'neck',
    presentations: ['neck-mechanical', 'neck-postural', 'cervical-radicular'],
  },
  sterno: { family: 'neck', presentations: ['front-of-neck-review'] },
  'trapezius-upper': {
    family: 'neck',
    presentations: ['neck-postural', 'neck-mechanical', 'rotator-cuff'],
  },
  // shoulder girdle
  'ac-joint': {
    family: 'shoulder',
    presentations: ['ac-joint', 'subacromial'],
    affinity: { 'ac-joint': 12 },
  },
  'anterior-deltoid': {
    family: 'shoulder',
    presentations: ['rotator-cuff', 'subacromial', 'ac-joint'],
  },
  'lateral-deltoid': { family: 'shoulder', presentations: ['subacromial', 'rotator-cuff'] },
  'posterior-deltoid': { family: 'shoulder', presentations: ['rotator-cuff', 'frozen-shoulder'] },
  'rotator-cuff': {
    family: 'shoulder',
    presentations: ['rotator-cuff', 'frozen-shoulder', 'subacromial'],
    affinity: { 'rotator-cuff': 10 },
  },
  scapula: {
    family: 'shoulder',
    presentations: ['scapular', 'thoracic', 'neck-postural'],
    affinity: { scapular: 10 },
  },
  pectoral: { family: 'chest', presentations: ['chest-wall', 'thoracic', 'neck-postural'] },
  'costal-margin': {
    family: 'upper-back',
    presentations: ['rib', 'thoracic'],
    affinity: { rib: 12 },
  },
  // trunk and back
  rhomboid: { family: 'upper-back', presentations: ['thoracic', 'neck-postural', 'scapular'] },
  'thoracic-spine': { family: 'upper-back', presentations: ['thoracic', 'rib'] },
  oblique: { family: 'trunk', presentations: ['trunk-motor', 'back-flexion', 'rib'] },
  'upper-abdomen': { family: 'trunk', presentations: ['trunk-motor', 'back-extension'] },
  'lower-abdomen': { family: 'trunk', presentations: ['trunk-motor', 'groin-strain', 'si-joint'] },
  'lumbar-spine': {
    family: 'lower-back',
    presentations: ['back-flexion', 'back-extension', 'lumbar-radicular', 'si-joint'],
  },
  sacrum: {
    family: 'lower-back',
    presentations: ['si-joint', 'back-extension', 'gluteal-tendon'],
    affinity: { 'si-joint': 9 },
  },
  'si-joint': {
    family: 'lower-back',
    presentations: ['si-joint', 'back-extension', 'gluteal-tendon'],
    affinity: { 'si-joint': 12 },
  },
  'gluteus-maximus': {
    family: 'hip',
    presentations: ['gluteal-tendon', 'hamstring-strain', 'si-joint'],
  },
  'gluteus-medius': {
    family: 'hip',
    presentations: ['gluteal-tendon', 'itb', 'hip-oa'],
    affinity: { 'gluteal-tendon': 12 },
  },
  'hip-anterior': {
    family: 'hip',
    presentations: ['groin-strain', 'hip-oa', 'hip-flexor'],
    affinity: { 'hip-flexor': 8 },
  },
  'hip-lateral': { family: 'hip', presentations: ['gluteal-tendon', 'itb', 'hip-oa'] },
  // thigh and knee
  quadriceps: {
    family: 'knee',
    presentations: ['patellofemoral', 'knee-oa', 'thigh-muscle'],
    affinity: { patellofemoral: 6 },
  },
  'hamstring-proximal': {
    family: 'hip',
    presentations: ['hamstring-strain', 'si-joint'],
    affinity: { 'hamstring-strain': 10 },
  },
  'hamstring-mid': {
    family: 'thigh',
    presentations: ['hamstring-strain', 'lumbar-radicular'],
    affinity: { 'hamstring-strain': 10 },
  },
  adductor: {
    family: 'hip',
    presentations: ['groin-strain', 'hip-oa'],
    affinity: { 'groin-strain': 12 },
  },
  'it-band': {
    family: 'knee',
    presentations: ['itb', 'patellofemoral', 'gluteal-tendon'],
    affinity: { itb: 12 },
  },
  'knee-anterior': {
    family: 'knee',
    presentations: ['patellofemoral', 'knee-oa', 'patellar-tendon'],
    affinity: { patellofemoral: 10 },
  },
  'knee-medial': {
    family: 'knee',
    presentations: ['meniscal', 'knee-oa'],
    affinity: { meniscal: 9 },
  },
  'knee-lateral': { family: 'knee', presentations: ['itb', 'meniscal'], affinity: { itb: 7 } },
  'knee-posterior': {
    family: 'knee',
    presentations: ['meniscal', 'knee-oa', 'hamstring-strain'],
    affinity: { meniscal: 8 },
  },
  'patellar-tendon': {
    family: 'knee',
    presentations: ['patellar-tendon', 'patellofemoral'],
    affinity: { 'patellar-tendon': 14 },
  },
  // lower leg and foot
  calf: { family: 'ankle', presentations: ['achilles', 'ankle-sprain', 'shin-stress'] },
  shin: {
    family: 'lower-leg',
    presentations: ['shin-stress', 'ankle-sprain'],
    affinity: { 'shin-stress': 12 },
  },
  'medial-shin': {
    family: 'lower-leg',
    presentations: ['shin-stress'],
    affinity: { 'shin-stress': 12 },
  },
  achilles: {
    family: 'ankle',
    presentations: ['achilles', 'plantar-heel'],
    affinity: { achilles: 14 },
  },
  'ankle-lateral': {
    family: 'ankle',
    presentations: ['ankle-sprain', 'ankle-instability', 'achilles'],
    affinity: { 'ankle-sprain': 12 },
  },
  'ankle-medial': { family: 'ankle', presentations: ['ankle-sprain', 'plantar-heel'] },
  heel: {
    family: 'ankle',
    presentations: ['plantar-heel', 'achilles'],
    affinity: { 'plantar-heel': 14 },
  },
  'plantar-arch': { family: 'ankle', presentations: ['plantar-heel', 'forefoot'] },
  instep: { family: 'foot', presentations: ['ankle-sprain', 'forefoot'] },
  forefoot: {
    family: 'foot',
    presentations: ['forefoot', 'plantar-heel'],
    affinity: { forefoot: 12 },
  },
  toes: { family: 'foot', presentations: ['forefoot', 'plantar-heel'], affinity: { forefoot: 6 } },
  // arm
  biceps: { family: 'elbow', presentations: ['biceps-tendon', 'cervical-radicular'] },
  triceps: { family: 'elbow', presentations: ['elbow-extension', 'cervical-radicular'] },
  'elbow-lateral': {
    family: 'elbow',
    presentations: ['lateral-elbow', 'elbow-extension'],
    affinity: { 'lateral-elbow': 16 },
  },
  'elbow-medial': {
    family: 'elbow',
    presentations: ['medial-elbow', 'carpal-tunnel'],
    affinity: { 'medial-elbow': 16 },
  },
  'elbow-posterior': {
    family: 'elbow',
    presentations: ['elbow-extension', 'olecranon-review'],
    affinity: { 'elbow-extension': 10 },
  },
  'forearm-flexor': {
    family: 'elbow',
    presentations: ['medial-elbow', 'carpal-tunnel'],
    affinity: { 'medial-elbow': 8 },
  },
  'forearm-extensor': {
    family: 'elbow',
    presentations: ['lateral-elbow', 'de-quervain'],
    affinity: { 'lateral-elbow': 8 },
  },
  'wrist-dorsal': { family: 'wrist', presentations: ['wrist-load', 'de-quervain'] },
  'wrist-volar': { family: 'wrist', presentations: ['carpal-tunnel', 'wrist-load'] },
  'thumb-base': {
    family: 'wrist',
    presentations: ['de-quervain', 'hand-stiff'],
    affinity: { 'de-quervain': 16 },
  },
  'hand-palm': { family: 'wrist', presentations: ['carpal-tunnel', 'hand-stiff'] },
  'hand-dorsum': { family: 'wrist', presentations: ['wrist-load', 'hand-stiff'] },
  fingers: {
    family: 'wrist',
    presentations: ['hand-stiff', 'carpal-tunnel'],
    affinity: { 'hand-stiff': 12 },
  },
};

/** Every region base must resolve somewhere; validated at build. */
export function familyOf(base) {
  return REGION_MAP[base]?.family ?? null;
}
