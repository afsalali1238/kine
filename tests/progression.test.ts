/**
 * Progression is earned from the review block, not granted by a calendar: flat or
 * falling pain, enough completed sessions, and a locked phase that stays locked.
 *
 * Fixtures live in `helpers.ts`; the suites are split by question so each one reads on a
 * single screen (C2).
 */

import { describe, expect, it } from 'vitest';
import { emptyJourney, type Journey, type SessionLog } from '@/lib/types';
import { reviewGate, traffic } from '@/modules/progress';

describe('progression is earned', () => {
  const log = (overrides: Partial<SessionLog> = {}): SessionLog => ({
    id: 's',
    date: '2026-09-01',
    phase: 1,
    regionId: 'lumbar-spine',
    pins: [],
    planned: ['a'],
    completed: ['a'],
    skipped: [],
    swaps: [],
    painDuring: 3,
    painAfter: 2,
    feeling: 'right',
    settled: true,
    morningWorse: false,
    seconds: 600,
    ...overrides,
  });

  const journey = (sessions: SessionLog[], next: Journey['nextDayCheck'] = null): Journey => ({
    ...emptyJourney(),
    sessions,
    daily: sessions.map((row, index) => ({
      date: `2026-09-0${(index % 8) + 1}`,
      pain: 4 - Math.min(2, Math.floor(index / 4)),
      feeling: 'better',
      phase: 1,
    })),
    nextDayCheck: next,
    phase: 1,
  });

  it('holds a plan that has not filled its review block', () => {
    const gate = reviewGate(journey([log(), log(), log()]));
    expect(gate.action).toBe('hold');
    expect(gate.eligible).toBe(false);
    expect(gate.blockedReasons).toContain('progress.needSessions');
  });

  it('advances only after sessions, trend, effort and next morning all agree', () => {
    const sessions = Array.from({ length: 8 }, (_, index) =>
      log({ date: `2026-09-0${(index % 8) + 1}`, feeling: index > 4 ? 'easy' : 'right' }),
    );
    const gate = reviewGate(
      journey(sessions, { date: '2026-09-10', settled: true, morningWorse: false }),
    );
    expect(gate.doneInBlock).toBe(8);
    expect(gate.nextDay).toBe('clear');
    expect(gate.eligible).toBe(true);
    expect(gate.action).toBe('advance');
  });

  it('regresses when the pain trend rises', () => {
    const base = journey(
      Array.from({ length: 8 }, () => log({ feeling: 'easy' })),
      {
        date: '2026-09-10',
        settled: true,
        morningWorse: false,
      },
    );
    base.daily = base.daily.map((row, index) => ({ ...row, pain: index < 4 ? 2 : 6 }));
    const gate = reviewGate(base);
    expect(gate.trend).toBeGreaterThan(1);
    expect(gate.action).toBe('regress');
  });

  it('waits for the next-morning answer', () => {
    const gate = reviewGate(journey(Array.from({ length: 8 }, () => log())));
    expect(gate.nextDay).toBe('pending');
    expect(gate.blockedReasons).toContain('progress.nextDayPending');
  });

  it('reads the traffic light the way the rules say', () => {
    expect(traffic(3, true, false)).toBe('green');
    expect(traffic(6, true, false)).toBe('red');
    expect(traffic(2, false, false)).toBe('red');
    expect(traffic(2, true, true)).toBe('red');
    expect(traffic(2, null, null)).toBe('amber');
    expect(traffic(null)).toBe('amber');
  });
});
