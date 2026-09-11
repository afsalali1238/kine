/**
 * Derived state. Screens read these instead of recomputing, which keeps the clinical
 * decisions in one place and makes them directly testable.
 */

import { useMemo } from 'react';
import { findPresentation, findRegion } from '@/lib/content';
import type { Journey } from '@/lib/types';
import { defaultIntake } from '@/modules/intake/questions';
import { firstStartable, matchPresentations, redFlags, type Scored } from '@/modules/triage';
import { buildProgramme, scheduleFor, type Programme } from '@/modules/programme';
import { reviewGate, traffic, type Gate } from '@/modules/progress';
import { exerciseById } from '@/lib/content';

export type Derived = {
  region: ReturnType<typeof findRegion>;
  presentation: ReturnType<typeof findPresentation>;
  matches: Scored[];
  startable: Scored | null;
  flag: ReturnType<typeof redFlags>;
  programme: Programme | null;
  gate: Gate;
  started: boolean;
};

export function derive(journey: Journey | null): Derived {
  const empty: Derived = {
    region: undefined,
    presentation: undefined,
    matches: [],
    startable: null,
    flag: null,
    programme: null,
    gate: reviewGate(journey ?? emptyJourneyLike()),
    started: false,
  };
  if (!journey) return empty;
  const regionId = journey.pins[0]?.regionId ?? journey.regionId ?? null;
  const region = findRegion(regionId);
  const intake = journey.intake ?? defaultIntake;
  if (!region) return { ...empty, region: undefined };
  const matches = journey.intake
    ? matchPresentations(region, intake, journey.rejectedPresentationIds)
    : [];
  const startable = matches.length ? firstStartable(matches) : null;
  const chosen = journey.presentationId
    ? (matches.find((m) => m.presentation.id === journey.presentationId) ?? null)
    : null;
  const presentationId = chosen?.presentation.id ?? null;
  const gate = reviewGate(journey);
  const programme = presentationId
    ? buildProgramme({
        regionId: region.id,
        presentationId,
        intake,
        phase: journey.phase,
        goal: journey.goal,
        doseCuts: journey.doseCuts,
      })
    : null;
  return {
    region,
    presentation: presentationId ? findPresentation(presentationId) : undefined,
    matches,
    startable,
    flag: redFlags(intake),
    programme,
    gate,
    started: Boolean(presentationId && (programme?.items.length ?? 0) > 0),
  };
}

export type TodayAction = {
  kind: 'explore' | 'intake' | 'explain' | 'plan' | 'session' | 'checkin' | 'review';
  href: string;
  ctaKey: string;
};

export function todayAction(journey: Journey | null, derived: Derived): TodayAction {
  if (!journey || !derived.region) return { kind: 'explore', href: '/body', ctaKey: 'nav.body' };
  if (!journey.intake) return { kind: 'intake', href: '/intake', ctaKey: 'q.next' };
  if (!derived.presentation) {
    return {
      kind: derived.flag?.level === 'urgent' ? 'explain' : 'explain',
      href: '/triage',
      ctaKey: 'explain.title',
    };
  }
  if (journey.nextDayCheck && journey.nextDayCheck.date <= new Date().toISOString().slice(0, 10)) {
    return { kind: 'checkin', href: '/checkin', ctaKey: 'checkin.next.title' };
  }
  if (derived.gate.eligible)
    return { kind: 'review', href: '/progress', ctaKey: 'progress.review' };
  return { kind: 'session', href: '/session', ctaKey: 'plan.start' };
}

/** The session queue with swaps and dose cuts applied, ready for the player. */
export function sessionQueue(journey: Journey | null, programme: Programme | null) {
  if (!programme) return [];
  return programme.items
    .map((item) => {
      const exercise = exerciseById.get(item.exerciseId);
      if (!exercise) return null;
      return {
        exercise,
        item,
        schedule: scheduleFor(exercise, {
          sets: item.sets,
          reps: item.reps,
          holdSeconds: item.holdSeconds,
        }),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

export function lightFor(journey: Journey | null) {
  const last = journey?.sessions.at(-1);
  return traffic(
    last?.painAfter ?? null,
    journey?.nextDayCheck?.settled ?? null,
    journey?.nextDayCheck?.morningWorse ?? null,
  );
}

export function useDerived(journey: Journey | null): Derived {
  return useMemo(() => derive(journey), [journey]);
}

function emptyJourneyLike(): Journey {
  return {
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
  };
}
