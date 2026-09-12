import {
  doseInfo,
  makeProgramme,
  match,
  presentations,
  progression,
  redFlags,
  regions,
} from '@/lib/clinical';
import type { Recovery } from '@/lib/app-types';
import demo from '@/data/demo.json';

/**
 * Everything the screens need that can be computed deterministically from the
 * persisted recovery state (plus the currently viewed phase tab and the user's
 * rejected pattern matches). Pure: given the same inputs it returns the same
 * outputs, so it is safe to unit test and fine to recompute on each render.
 */
export function deriveJourney(state: Recovery, phaseTab: number, rejected: string[]) {
  const region = regions.find((r) => r.id === state.region);
  const group = region?.group || 'lower-back';
  const matches = match(group, state.intake, rejected);
  const top = matches[0];
  const currentPresentation = presentations.find((p) => p.id === state.presentationId) || top;
  const flag = redFlags(state.intake, group);
  const dose = doseInfo[state.intake.irritability];
  const plan = makeProgramme(group, state.intake, state.presentationId, phaseTab, state.goal);
  const progress = progression(state.logs, state.phase);

  const real = state.logs.length > 0;
  const painValues = real ? state.logs.map((l) => l.pain) : demo.pain;
  const doneSessions = state.logs.filter((l) => l.session).length;

  const uniqueDays = [...new Set(state.logs.filter((l) => l.session).map((l) => l.date.slice(0, 10)))].sort().reverse();
  /** Calendar day (UTC, matching how `CheckIn.date` is written) offset from today. */
  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  // A streak is still alive while the most recent session is today OR yesterday.
  // Requiring "today" made a three-day streak read as 0 the moment the user
  // opened the app before training, which is the opposite of what an
  // adherence-focused product wants. It lapses only after a full missed day.
  const startOffset = uniqueDays[0] === day(0) ? 0 : uniqueDays[0] === day(-1) ? -1 : null;
  let streak = 0;
  if (startOffset !== null) {
    for (let i = 0; i < uniqueDays.length; i++) {
      if (uniqueDays[i] === day(startOffset - i)) streak++;
      else break;
    }
  }
  const dailyDone = state.logs.some((l) => !l.session && l.date.slice(0, 10) === day(0));

  return {
    region,
    group,
    matches,
    top,
    currentPresentation,
    flag,
    dose,
    plan,
    progress,
    real,
    painValues,
    doneSessions,
    streak,
    dailyDone,
  };
}

export type Journey = ReturnType<typeof deriveJourney>;
