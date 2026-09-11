/**
 * Shared content types. The JSON in `src/data` is the source of truth; these types
 * describe it so a clinician editing JSON gets a compile error when a field drifts.
 */

export type Region = {
  id: string;
  regionIdValue: number;
  base: string;
  label: string;
  labelAr: string | null;
  family: string;
  group: string;
  side: 'left' | 'right' | 'center';
  views: string[];
  synonyms: string[];
  vertexCount: number;
  triangles: number;
  areaMm2: number;
  centroid: [number, number, number];
  focusTarget: [number, number, number];
  focusRadius: number;
  focusDistance: number;
  neighbours: string[];
  presentationIds: string[];
  affinity: Record<string, number>;
  redirect: string | null;
  exerciseIds: string[];
  emptyState: EmptyState | null;
};

export type EmptyState = {
  kind: 'guidance' | 'redirect';
  headline: string;
  headlineAr: string | null;
  body: string;
  redirectTo: string | null;
  seeAlso: string | null;
};

export type Presentation = {
  id: string;
  group: string;
  family: string;
  families?: string[];
  name: string;
  nameAr: string | null;
  explanation: string;
  course: string;
  helps: string;
  sites: string[];
  prefer: string[];
  /** Authored as a magnitude on the aggravating axis; `clampFor` turns it into [min,max]. */
  caps: Record<string, Record<string, number>>;
  guidanceOnly?: boolean;
  tendon?: boolean;
  nerveWatch?: boolean;
  reviewSoon?: boolean;
  maxPhase: number | null;
  lockPhases: number[];
  cue: string | null;
  redirect: string | null;
  shares?: string[];
};

export type TempoMs = { eccentricMs: number; pauseMs: number; concentricMs: number };

export type Exercise = {
  id: string;
  name: string;
  nameAr: string | null;
  presentationIds: string[];
  phase: 1 | 2 | 3;
  targetRegions: string[];
  type:
    | 'isometric'
    | 'mobility'
    | 'strength'
    | 'eccentric'
    | 'motor_control'
    | 'stretch'
    | 'nerve_glide'
    | 'breathing'
    | 'balance';
  sets: number;
  reps: number | null;
  holdSeconds: number | null;
  tempo: TempoMs;
  restSeconds: number;
  frequencyPerWeek: number;
  equipment: 'none' | 'band' | 'weight' | 'chair' | 'wall' | 'towel' | 'pillow' | 'step';
  positionRequired:
    | 'supine'
    | 'prone'
    | 'side_lying'
    | 'seated'
    | 'standing'
    | 'wall_standing'
    | 'four_point'
    | 'half_kneeling'
    | 'long_sitting';
  laterality: 'bilateral' | 'unilateral';
  cues: string[];
  cuesAr: string[] | null;
  commonMistakes: string[];
  easierVariantId: string | null;
  harderVariantId: string | null;
  contraindicatedFor: string[];
  animationId: string | null;
  mediaKind: 'rig_animation' | 'video' | 'still_sequence' | 'text_only';
  status: 'draft' | 'published';
  rangeCaps: Record<string, Record<string, [number, number]>>;
  mediaApproved?: boolean;
  provenance?: string;
};

export type JointTrack = {
  joint: string;
  axis: string;
  keyframes: { t: number; deg: number; easing?: 'linear' | 'easeInOut' }[];
};

export type ExerciseAnimation = {
  animationId: string;
  exerciseId: string;
  templateId: string;
  basePose: Exercise['positionRequired'];
  durationMs: number;
  holdAt: number | null;
  holdMs: number | null;
  tracks: JointTrack[];
  mirrorable: boolean;
  cameras: {
    id: 'primary' | 'secondary';
    azimuth: number;
    elevation: number;
    distance: number;
    target: string;
  }[];
  highlightRegions: string[];
  props: string[];
  faultTracks: {
    faultId: string;
    label: string;
    labelAr: string | null;
    tracks: JointTrack[];
  }[];
  cues: { t: number; cue: string; cueAr: string | null; audioKey: string | null }[];
  status: 'draft' | 'published';
  reviewedBy: string | null;
  contentHash: string;
};

export type Pin = {
  id: string;
  regionId: string;
  point: [number, number, number];
  normal: [number, number, number];
  intensity: number;
};

export type Irritability = 'high' | 'moderate' | 'low';

export type Intake = {
  pain: number;
  best: number;
  worst: number;
  onset: 'sudden' | 'gradual';
  incident: string | null;
  duration: 'under6' | '6to12' | 'over12';
  pattern: 'morning' | 'load' | 'night' | 'constant';
  aggravators: string[];
  easers: string[];
  irritability: Irritability;
  neuro: 'none' | 'numbness' | 'pins' | 'weakness';
  travelsTo: string | null;
  details: string[];
};

export type SessionExerciseState = {
  exerciseId: string;
  setsDone: number;
  pain: number | null;
  response: 'easy' | 'right' | 'painful' | 'skipped' | null;
  skipReason: string | null;
  swappedFrom?: string;
};

export type SessionLog = {
  id: string;
  date: string;
  phase: number;
  /** Snapshot of the marker map, so the progress screen can replay where it was. */
  regionId: string | null;
  pins: Pin[];
  planned: string[];
  completed: string[];
  skipped: { exerciseId: string; reason: string }[];
  swaps: { from: string; to: string; reason: string }[];
  painDuring: number | null;
  painAfter: number | null;
  feeling: 'easy' | 'right' | 'hard' | null;
  settled: boolean | null;
  morningWorse: boolean | null;
  seconds: number;
};

export type DailyLog = {
  date: string;
  pain: number;
  feeling: 'better' | 'same' | 'worse';
  phase: number;
};

export type Journey = {
  version: 2;
  createdAt: string;
  sex: 'male' | 'female';
  regionId: string | null;
  pins: Pin[];
  intake: Intake | null;
  rejectedPresentationIds: string[];
  presentationId: string | null;
  goal: string;
  phase: number;
  programme: {
    exerciseId: string;
    sets: number;
    reps: number | null;
    holdSeconds: number | null;
  }[];
  sessions: SessionLog[];
  daily: DailyLog[];
  reviewBlock: number;
  lastAdvancedOn: string | null;
  doseCuts: Record<string, number>;
  nextDayCheck: { date: string; settled: boolean; morningWorse: boolean } | null;
};

export const emptyJourney = (): Journey => ({
  version: 2,
  createdAt: new Date().toISOString(),
  sex: 'male',
  regionId: null,
  pins: [],
  intake: null,
  rejectedPresentationIds: [],
  presentationId: null,
  goal: '',
  phase: 1,
  programme: [],
  sessions: [],
  daily: [],
  reviewBlock: 1,
  lastAdvancedOn: null,
  doseCuts: {},
  nextDayCheck: null,
});
