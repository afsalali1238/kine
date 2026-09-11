/**
 * Progression is earned, not scheduled: a review block of 10 sessions, of which 70% must
 * be done, with a flat-or-falling trend, a manageable last effort and a clean next-day
 * check. A date arriving is not one of the conditions.
 */

import type { Journey, SessionLog } from '@/lib/types';

export const BLOCK_SESSIONS = 10;
export const BLOCK_PASS_RATE = 0.7;

export type NextDay = 'clear' | 'pending' | 'failed';

export type Gate = {
  block: number;
  doneInBlock: number;
  need: number;
  adherence: number;
  trend: number;
  lastFeeling: string | null;
  nextDay: NextDay;
  eligible: boolean;
  action: 'advance' | 'hold' | 'regress';
  blockedReasons: string[];
  phase: number;
};

const sessionsInBlock = (journey: Journey) =>
  journey.sessions.filter((s) => s.phase === journey.phase);

/** Mean of the first three and last three logged pains in the current block. */
export function trendOf(journey: Journey): number {
  const pain = journey.daily.filter((d) => d.phase === journey.phase).map((d) => d.pain);
  if (pain.length < 2) return 0;
  const head = pain.slice(0, 3).reduce((s, v) => s + v, 0) / Math.min(3, pain.length);
  const tail = pain.slice(-3).reduce((s, v) => s + v, 0) / Math.min(3, pain.length);
  return tail - head;
}

export function nextDayCheck(journey: Journey): NextDay {
  const last = journey.sessions.at(-1);
  if (!last) return 'pending';
  if (!journey.nextDayCheck || journey.nextDayCheck.date <= last.date) return 'pending';
  return journey.nextDayCheck.settled && !journey.nextDayCheck.morningWorse ? 'clear' : 'failed';
}

export function reviewGate(journey: Journey): Gate {
  const inBlock = sessionsInBlock(journey);
  const done = inBlock.length;
  const trend = trendOf(journey);
  const last = inBlock.at(-1);
  const feeling = last?.feeling ?? null;
  const next = nextDayCheck(journey);
  const adherence = Math.min(100, Math.round((done / BLOCK_SESSIONS) * 100));
  const reasons: string[] = [];
  if (done / BLOCK_SESSIONS < BLOCK_PASS_RATE) reasons.push('progress.needSessions');
  if (trend > 0) reasons.push('progress.trendUp');
  if (!last) reasons.push('progress.noSession');
  else if (!['easy', 'right'].includes(String(last.feeling))) reasons.push('progress.effort');
  if (next === 'pending') reasons.push('progress.nextDayPending');
  if (next === 'failed') reasons.push('progress.nextDayFailed');
  const eligible = reasons.length === 0 && journey.phase < 3;
  return {
    block: journey.reviewBlock,
    doneInBlock: done,
    need: Math.ceil(BLOCK_SESSIONS * BLOCK_PASS_RATE),
    adherence,
    trend,
    lastFeeling: feeling,
    nextDay: next,
    eligible,
    action: trend > 1 ? 'regress' : eligible ? 'advance' : 'hold',
    blockedReasons: reasons,
    phase: journey.phase,
  };
}

/** Red means "ease off today", never "stop moving". */
export function traffic(
  pain: number | null,
  settled: boolean | null = null,
  morningWorse: boolean | null = null,
): 'green' | 'amber' | 'red' {
  if (pain === null) return 'amber';
  if (pain > 4 || settled === false || morningWorse === true) return 'red';
  if (settled === null || morningWorse === null) return 'amber';
  return 'green';
}

export type MapFrame = { date: string; pins: SessionLog['pins']; pain: number | null };

export function mapFrames(journey: Journey): MapFrame[] {
  return journey.sessions.map((session) => ({
    date: session.date,
    pins: session.pins ?? [],
    pain: session.painAfter ?? session.painDuring ?? null,
  }));
}

export function weeklyAdherence(journey: Journey, weeks = 6) {
  const out: { week: number; sessions: number; minutes: number }[] = [];
  const start = journey.createdAt.slice(0, 10);
  for (let w = 0; w < weeks; w++) {
    const rows = journey.sessions.filter((s) => weekIndex(start, s.date) === w);
    out.push({
      week: w + 1,
      sessions: rows.length,
      minutes: Math.round(rows.reduce((sum, r) => sum + (r.seconds ?? 0), 0) / 60),
    });
  }
  return out;
}

function weekIndex(fromIso: string, iso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.floor((b - a) / (7 * 86400000));
}

/** Dose is reduced for a week after a red light, and restored when the block recovers. */
export function doseCutFor(journey: Journey, exerciseId: string): number {
  return journey.doseCuts?.[exerciseId] ?? 0;
}
