import { describe, expect, it } from 'vitest';
import { deriveJourney } from './derive';
import { initialRecovery } from './app-types';
import type { CheckIn } from './clinical';

/** ISO timestamp for the UTC calendar day `offsetDays` from today, at noon. */
function dayISO(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(12, 0, 0, 0);
  return d.toISOString();
}

const session = (offsetDays: number, extra: Partial<CheckIn> = {}): CheckIn => ({
  date: dayISO(offsetDays),
  pain: 3,
  feeling: 'right',
  session: true,
  phase: 1,
  settled: true,
  morningWorse: false,
  ...extra,
});

const checkIn = (offsetDays: number): CheckIn => ({
  date: dayISO(offsetDays),
  pain: 4,
  feeling: 'same',
  session: false,
  phase: 1,
});

const journey = (logs: CheckIn[]) => deriveJourney({ ...initialRecovery, logs }, 1, []);

describe('deriveJourney — streak keeps a one-day grace', () => {
  it('counts a streak that ends today', () => {
    expect(journey([session(0), session(-1), session(-2)]).streak).toBe(3);
  });

  it('keeps a streak alive when the most recent session was yesterday', () => {
    // Regression: this used to read 0, wiping three earned sessions the moment
    // the user opened the app before training.
    expect(journey([session(-1), session(-2), session(-3)]).streak).toBe(3);
  });

  it('keeps a single yesterday-only session alive', () => {
    expect(journey([session(-1)]).streak).toBe(1);
  });

  it('lapses once a full day has passed with no session', () => {
    expect(journey([session(-2), session(-3)]).streak).toBe(0);
    expect(journey([session(-3), session(-4)]).streak).toBe(0);
  });

  it('breaks on a gap in the middle of the run', () => {
    // today, yesterday, [gap], 3 days ago
    expect(journey([session(0), session(-1), session(-3)]).streak).toBe(2);
  });

  it('counts two sessions on the same day once', () => {
    expect(journey([session(0), session(0), session(-1)]).streak).toBe(2);
  });

  it('is 0 with an empty logbook and does not throw', () => {
    const j = journey([]);
    expect(j.streak).toBe(0);
    expect(j.dailyDone).toBe(false);
    expect(j.doneSessions).toBe(0);
    expect(j.real).toBe(false);
  });
});

describe('deriveJourney — daily check-in and derived summary', () => {
  it('flags a same-day non-session check-in as done', () => {
    expect(journey([checkIn(0)]).dailyDone).toBe(true);
  });

  it('does not count a session as the daily check-in', () => {
    expect(journey([session(0)]).dailyDone).toBe(false);
  });

  it('does not count a previous day check-in as done today', () => {
    expect(journey([checkIn(-1)]).dailyDone).toBe(false);
  });

  it('reports real vs demo data and session counts', () => {
    const real = journey([session(0), session(-1), checkIn(0)]);
    expect(real.real).toBe(true);
    expect(real.doneSessions).toBe(2);

    const empty = journey([]);
    expect(empty.real).toBe(false);
    expect(empty.painValues.length).toBeGreaterThan(0); // demo sparkline
  });

  it('falls back to a region group when the region is unknown', () => {
    const j = deriveJourney({ ...initialRecovery, region: 'not-a-region' }, 1, []);
    expect(j.region).toBeUndefined();
    expect(j.group).toBe('lower-back');
    expect(j.matches.length).toBeGreaterThan(0);
  });
});
