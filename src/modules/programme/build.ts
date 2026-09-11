/**
 * Programme construction. v1's rules are preserved, with three changes: candidates are
 * filtered by the pinned region as well as the pattern, the dose floor (1 x 6) can never
 * be cut away, and progression is driven by the review block rather than the phase.
 */

import { exercisesByPresentation, findExercise, findRegion, presentationById } from '@/lib/content';
import type { Exercise, Intake } from '@/lib/types';
import { DOSE_BUDGET_SECONDS, programmeSeconds, scheduleFor } from './tempo';

export type ProgrammeItem = {
  exerciseId: string;
  sets: number;
  reps: number | null;
  holdSeconds: number | null;
  why: string;
  seconds: number;
  cut: boolean;
};

export type Programme = {
  items: ProgrammeItem[];
  minutes: number;
  phase: number;
  locked: boolean;
  character: string;
  frequency: string;
  presentationId: string;
  regionId: string;
};

const Dose_TEXT: Record<Intake['irritability'], { character: string; frequency: string }> = {
  high: {
    character: 'Comfortable movement and gentle holds',
    frequency: '2-3 short sessions daily',
  },
  moderate: {
    character: 'Controlled movement and light loading',
    frequency: '1-2 sessions daily',
  },
  low: {
    character: 'Progressive strength and load tolerance',
    frequency: '3-4 sessions weekly',
  },
};

const text0 = (intake: Intake) => Dose_TEXT[intake.irritability].character;

const WHY: Record<Exercise['type'], string> = {
  mobility: 'Keeps the range you use every day comfortable',
  isometric: 'Introduces load without asking the joint to move yet',
  strength: 'Builds tolerance for the load you are missing',
  eccentric: 'Loads the tendon in the way it responds best',
  motor_control: 'Re-trains the movement pattern before adding weight',
  stretch: 'Recovers length where guarding is limiting you',
  nerve_glide: 'Keeps the nerve moving through the sensitised area',
  breathing: 'Settles the system that is keeping the area guarded',
  balance: 'Rebuilds the confidence that load alone does not give',
};

/**
 * Buckets by type in the pattern's preference order, then one from each bucket in rounds.
 * Two patterns sharing an exercise library still come out different, which is the point: the
 * pattern chooses the *kind* of load, the region chooses which tissue it is applied to.
 */
export function preferRounds(prefer: string[], pool: Exercise[]): Exercise[] {
  const buckets = new Map<string, Exercise[]>();
  for (const exercise of pool) {
    const list = buckets.get(exercise.type) ?? [];
    list.push(exercise);
    buckets.set(exercise.type, list);
  }
  const order = [
    ...prefer.filter((type) => buckets.has(type)),
    ...[...buckets.keys()].filter((type) => !prefer.includes(type)),
  ];
  const out: Exercise[] = [];
  let round = 0;
  let added = true;
  while (added) {
    added = false;
    for (const type of order) {
      const row = buckets.get(type) ?? [];
      if (round < row.length) {
        out.push(row[round]);
        added = true;
      }
    }
    round++;
  }
  return out;
}

const GOAL_PREFERENCE: [RegExp, string[]][] = [
  [/train|sport|run|تدريب|جري/, ['loaded', 'weighted', 'press', 'single']],
  [/work|desk|عمل/, ['row', 'rotation', 'reach', 'chin']],
  [/family|child|عائل|طفل/, ['carry', 'squat', 'step', 'bridge']],
];

const DEFAULT_PREFERENCE = ['step', 'calf', 'balance', 'hinge'];

function goalWords(goal: string): string[] {
  const words = goal.toLowerCase();
  for (const [re, list] of GOAL_PREFERENCE) if (re.test(words)) return list;
  return DEFAULT_PREFERENCE;
}

export function buildProgramme(input: {
  regionId: string;
  presentationId: string;
  intake: Intake;
  phase: number;
  goal?: string;
  doseCuts?: Record<string, number>;
  rejected?: string[];
}): Programme {
  const { regionId, presentationId, intake, goal = '', doseCuts = {} } = input;
  const presentation = presentationById.get(presentationId);
  const region = findRegion(regionId);
  // Frozen-shoulder style protection: the pattern itself caps the phase, whatever the
  // irritability answer said. Preserved from v1, and it outranks the user's choice.
  const maxPhase = presentation?.maxPhase ?? null;
  const capsPhase = maxPhase === null ? input.phase : Math.min(input.phase, maxPhase);
  const phase = intake.irritability === 'high' ? Math.min(capsPhase, 1) : capsPhase;

  const byPresentation = exercisesByPresentation.get(presentationId) ?? [];
  // Regional precision. `region.exerciseIds` is measured at build time from the anatomy the
  // exercise actually claims, which is what makes the front and the back of one knee produce
  // different programmes. When the region has nothing at this phase the pool widens back to
  // the pattern, so a plan is never empty.
  const regional = new Set(region?.exerciseIds ?? []);
  const poolFor = (wanted: number): Exercise[] => {
    const open = (byPresentation ?? []).filter(
      (candidate) =>
        candidate.phase === wanted &&
        !candidate.contraindicatedFor.includes(presentationId) &&
        !(presentation?.lockPhases ?? []).includes(candidate.phase),
    );
    const narrowed = open.filter((candidate) => regional.has(candidate.id));
    const rows = narrowed.length ? narrowed : open;
    // A left and a right marker must yield the same plan, so the order is by identity, never
    // by whichever side happened to match first.
    return rows.sort((a, b) => a.id.localeCompare(b.id));
  };

  // Low irritability in phase 1 starts on phase 2 work straight away (v1 behaviour, kept).
  const wanted =
    (intake.irritability ?? 'moderate') === 'low' &&
    input.phase === 1 &&
    !(presentation?.maxPhase === 1)
      ? 2
      : phase;
  const candidates = poolFor(wanted);

  // The pattern's own preference order decides which *kind* of work comes first, then the
  // buckets are taken in rounds so a four-exercise plan is not four versions of one type.
  const ranked = preferRounds(presentation?.prefer ?? [], candidates);
  const preferred =
    presentationId === 'back-extension'
      ? [
          ...ranked.filter((row) => row.name.includes('extension')),
          ...ranked.filter((row) => !row.name.includes('extension')),
        ]
      : ranked;
  if (phase === 3 && (intake.irritability ?? 'moderate') !== 'high') {
    const words = goalWords(goal);
    const priority = (e: Exercise) => words.filter((k) => e.name.toLowerCase().includes(k)).length;
    preferred.sort((a, b) => priority(b) - priority(a));
  }

  // A guidance-only pattern has no exercise pool by design: it is education plus a
  // referral. The caller shows `firstStartable` instead, so this is not a dead end.
  if (presentation?.guidanceOnly) {
    return {
      items: [],
      minutes: 0,
      phase,
      locked: true,
      character: text0(intake),
      frequency: text0(intake),
      presentationId,
      regionId,
    };
  }

  const high = (intake.irritability ?? 'moderate') === 'high';
  const items: ProgrammeItem[] = preferred.slice(0, 4).map((e) => ({
    exerciseId: e.id,
    sets: high ? 1 : Math.max(1, e.sets - (doseCuts[e.id] ?? 0)),
    reps: high && e.reps ? 6 : e.reps,
    holdSeconds: high && e.holdSeconds ? 15 : e.holdSeconds,
    why: WHY[e.type],
    seconds: 0,
    cut: false,
  }));

  trimToBudget(items, intake);
  const seconds = programmeSeconds(
    items.map((item) => ({
      exercise: findExercise(item.exerciseId) as Exercise,
      sets: item.sets,
      reps: item.reps,
      holdSeconds: item.holdSeconds,
    })),
  );
  for (const item of items) {
    item.seconds = scheduleFor(findExercise(item.exerciseId) as Exercise, {
      sets: item.sets,
      reps: item.reps,
      holdSeconds: item.holdSeconds,
    }).totalSeconds;
  }
  // A journey can be mid-assessment with nothing answered yet; the dose then falls back to the
  // middle of the range rather than crashing the plan screen.
  const text = Dose_TEXT[intake.irritability ?? 'moderate'] ?? Dose_TEXT.moderate;
  return {
    items,
    minutes: Math.max(1, Math.round(seconds / 60)),
    phase,
    locked: Boolean(
      presentation &&
      presentation.maxPhase !== null &&
      presentation.maxPhase !== undefined &&
      input.phase > presentation.maxPhase,
    ),
    character: text.character,
    frequency: text.frequency,
    presentationId,
    regionId,
  };
}

/** The 15-minute cap trims sets from the end, never below one set of six. */
function trimToBudget(items: ProgrammeItem[], intake: Intake) {
  const budget =
    DOSE_BUDGET_SECONDS[intake.irritability ?? 'moderate'] ?? DOSE_BUDGET_SECONDS.moderate;
  const cost = () =>
    programmeSeconds(
      items
        .map((item) => ({
          exercise: findExercise(item.exerciseId) as Exercise,
          sets: item.sets,
          reps: item.reps,
          holdSeconds: item.holdSeconds,
        }))
        .filter((row) => row.exercise),
    );
  let guard = 0;
  while (cost() > budget && guard++ < 60) {
    const candidate = [...items].reverse().find((item) => {
      const ex = findExercise(item.exerciseId);
      if (!ex) return false;
      const reps = item.reps;
      const hold = item.holdSeconds;
      const floorHits =
        (reps !== null && reps <= 6) || (hold !== null && hold <= 10) || item.sets <= 1;
      return !floorHits;
    });
    if (!candidate) break;
    const ex = findExercise(candidate.exerciseId) as Exercise;
    if (candidate.sets > 1) candidate.sets -= 1;
    else if (candidate.reps !== null && candidate.reps > 6) {
      candidate.reps = Math.max(6, candidate.reps - 1);
    } else if (candidate.holdSeconds !== null && candidate.holdSeconds > 10) {
      candidate.holdSeconds = Math.max(10, candidate.holdSeconds - 5);
    } else if (ex.sets > 1) {
      candidate.cut = true;
      break;
    } else {
      candidate.cut = true;
      break;
    }
  }
}
