import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  it('allows up to the limit, then denies within the window', () => {
    const limited = createRateLimiter({ limit: 3, windowMs: 1000 });
    expect(limited('user-1', 0)).toBe(true);
    expect(limited('user-1', 100)).toBe(true);
    expect(limited('user-1', 200)).toBe(true);
    expect(limited('user-1', 300)).toBe(false);
    expect(limited('user-1', 400)).toBe(false);
  });

  it('tracks windows per key', () => {
    const limited = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limited('a', 0)).toBe(true);
    expect(limited('a', 10)).toBe(false);
    expect(limited('b', 10)).toBe(true);
  });

  it('opens a fresh window after the window expires', () => {
    const limited = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limited('a', 0)).toBe(true);
    expect(limited('a', 999)).toBe(true);
    expect(limited('a', 1000)).toBe(true); // new window starts at 1000
    expect(limited('a', 1100)).toBe(true);
    expect(limited('a', 1200)).toBe(false);
  });

  it('defaults to the current time when no timestamp is injected', () => {
    const limited = createRateLimiter({ limit: 1, windowMs: 60_000 });
    expect(limited('a')).toBe(true);
    expect(limited('a')).toBe(false);
  });

  it('reclaims expired buckets instead of retaining every key forever', () => {
    // Both halves of the caller's rate-limit key are attacker controlled, so an
    // unbounded key space must not mean unbounded memory.
    const limited = createRateLimiter({ limit: 5, windowMs: 1_000, maxBuckets: 10 });

    // 50 distinct keys inside one window, well past the ceiling.
    for (let i = 0; i < 50; i++) limited(`attacker:${i}`, 0);

    // Advance past the window: the next call sweeps, and keys are reusable.
    expect(limited('attacker:0', 5_000)).toBe(true);
    expect(limited('attacker:1', 5_000)).toBe(true);
  });

  it('fails closed at the ceiling rather than growing without bound', () => {
    const limited = createRateLimiter({ limit: 5, windowMs: 60_000, maxBuckets: 3 });
    expect(limited('a', 0)).toBe(true);
    expect(limited('b', 0)).toBe(true);
    expect(limited('c', 0)).toBe(true);
    // All three slots are live and unexpired, so a fourth key is refused.
    expect(limited('d', 0)).toBe(false);
    // An existing key is still counted normally while it is over the limit.
    expect(limited('a', 0)).toBe(true);
  });

  it('sweeps at most once per window, so a new key is still admitted after expiry', () => {
    const limited = createRateLimiter({ limit: 1, windowMs: 1_000, maxBuckets: 2 });
    expect(limited('a', 0)).toBe(true);
    expect(limited('b', 0)).toBe(true);
    // Both expired by t=1000: the sweep frees room for a brand-new key.
    expect(limited('c', 1_000)).toBe(true);
  });
});

