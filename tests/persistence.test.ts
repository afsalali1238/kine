/**
 * The journey store, which is the whole workflow: every answer, pin, session and review has
 * to survive a reload, and survive it on a phone where IndexedDB is blocked (Safari private
 * mode, and any browser after the user clears site data for the tab). The module's claim is
 * that a hydration pass never resolves `undefined` into a blank screen — that claim is what
 * these tests hold it to, because a lost programme is the worst failure this app can have.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyJourney } from '../src/lib/types';

const KEY = 'kine.journey.v2';
const LEGACY = 'kinesio-recovery';

const idb = vi.hoisted(() => ({
  blocked: false,
  data: new Map<string, unknown>(),
}));

vi.mock('idb-keyval', () => ({
  get: async (key: string) => {
    if (idb.blocked) throw new Error('IndexedDB is not available');
    return idb.data.get(key);
  },
  set: async (key: string, value: unknown) => {
    if (idb.blocked) throw new Error('IndexedDB is not available');
    idb.data.set(key, value);
  },
  del: async (key: string) => {
    idb.data.delete(key);
  },
}));

const memory = new Map<string, string>();

/** `persistence.ts` reaches for a bare `localStorage`, guarded by a typeof check. */
function stubLocalStorage(options: { unavailable?: boolean } = {}) {
  if (options.unavailable) vi.stubGlobal('localStorage', undefined);
  else
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (memory.has(key) ? memory.get(key)! : null),
      setItem: (key: string, value: string) => void memory.set(key, value),
      removeItem: (key: string) => void memory.delete(key),
    });
}

async function fresh() {
  // Module state (`current`, `hydrated`) is deliberately process-long, so every case needs
  // its own import.
  vi.resetModules();
  memory.clear();
  idb.blocked = false;
  idb.data.clear();
  stubLocalStorage();
  return import('../src/lib/persistence');
}

describe('journey store', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('round-trips a journey through IndexedDB and mirrors it', async () => {
    const p = await fresh();
    const journey = { ...emptyJourney(), regionId: 'knee-posterior-medial', phase: 2 };
    await p.saveJourney(journey);
    expect(idb.data.get(KEY)).toMatchObject({ regionId: 'knee-posterior-medial' });
    expect(JSON.parse(memory.get(KEY)!)).toMatchObject({ phase: 2 });

    const reloaded = await p.loadJourney();
    expect(reloaded?.regionId).toBe('knee-posterior-medial');
    expect(p.isHydrated()).toBe(true);
  });

  it('keeps working when IndexedDB is blocked', async () => {
    const p = await fresh();
    idb.blocked = true;
    const journey = { ...emptyJourney(), goal: 'stairs without holding the rail' };
    await expect(p.saveJourney(journey)).resolves.toBeUndefined();
    expect(idb.data.size).toBe(0);

    // A cold start in the same browser: nothing in IndexedDB, everything in the mirror.
    const second = await fresh();
    idb.blocked = true;
    memory.set(KEY, JSON.stringify(journey));
    const loaded = await second.loadJourney();
    expect(loaded?.goal).toBe('stairs without holding the rail');
  });

  it('settles as "no journey" rather than hanging when nothing was stored', async () => {
    const p = await fresh();
    await expect(p.loadJourney()).resolves.toBeNull();
    expect(p.isHydrated()).toBe(true);
  });

  it('survives a corrupt mirror without throwing', async () => {
    const p = await fresh();
    memory.set(KEY, '{"version":2,"programme":');
    await expect(p.loadJourney()).resolves.toBeNull();
    expect(p.isHydrated()).toBe(true);
  });

  it('degrades to null when localStorage is undefined', async () => {
    const p = await fresh();
    vi.stubGlobal('localStorage', undefined);
    await expect(p.loadJourney()).resolves.toBeNull();
    await expect(p.saveJourney({ ...emptyJourney(), phase: 3 })).resolves.toBeUndefined();
    expect(idb.data.get(KEY)).toMatchObject({ phase: 3 });
  });

  it('migrates a v1 record onto the v2 shape', async () => {
    const p = await fresh();
    memory.set(
      LEGACY,
      JSON.stringify({
        region: 'knee-anterior',
        presentationId: 'patellofemoral',
        phase: 2,
        intake: { onset: 'incident', duration: 'acute', travelsTo: 3 },
        logs: [
          { date: '2026-07-01', pain: 4, feeling: 'better', phase: 1 },
          { date: '2026-07-02', pain: 5, feeling: 'sideways', phase: 2 },
          { pain: 9 },
        ],
      }),
    );
    const loaded = await p.loadJourney();
    expect(loaded?.regionId).toBe('knee-anterior');
    expect(loaded?.presentationId).toBe('patellofemoral');
    // v1 words become v2 scalars: incident -> sudden, acute -> under6, and a feeling that is
    // neither better nor worse becomes "same" instead of poisoning the chart.
    expect(loaded?.intake).toMatchObject({ onset: 'sudden', duration: 'under6' });
    expect(loaded?.intake?.travelsTo).toBeNull();
    expect(loaded?.daily).toHaveLength(2);
    expect(loaded?.daily[0]).toMatchObject({ feeling: 'better', pain: 4 });
    expect(loaded?.daily[1]?.feeling).toBe('same');
  });

  it('maps v1 "persistent" onto over twelve weeks and defaults a missing intake', () => {
    const p = fresh();
    return p.then((mod) => {
      const migrated = mod.migrateLegacy({
        region: 'low-back',
        intake: { onset: 'gradual', duration: 'persistent' },
      });
      expect(migrated?.intake).toMatchObject({ onset: 'gradual', duration: 'over12' });
      // No v1 intake means no v2 intake: the questions are answered again rather than
      // invented from defaults, since an onset guess changes the programme.
      const bare = mod.migrateLegacy({ region: 'low-back' });
      expect(bare?.regionId).toBe('low-back');
      expect(bare?.intake).toBeNull();
      expect(bare?.daily).toEqual([]);
      expect(mod.migrateLegacy(null)).toBeNull();
      expect(mod.migrateLegacy('nope')).toBeNull();
    });
  });

  it('exports and re-imports a journey, and migrates an old file', async () => {
    const p = await fresh();
    const journey = { ...emptyJourney(), phase: 2, rejectedPresentationIds: ['meniscal'] };
    const text = p.exportJourney(journey);
    expect(p.importJourney(text)).toMatchObject({ phase: 2, version: 2 });

    // A v1 file is accepted and normalised, keys it does not have are dropped.
    const fromV1 = p.importJourney(JSON.stringify({ region: 'ankle', phase: 1, junk: true }));
    expect(fromV1.regionId).toBe('ankle');
    expect(fromV1.version).toBe(2);
    expect((fromV1 as unknown as Record<string, unknown>).junk).toBeUndefined();

    expect(() => p.importJourney('{"hello":1}')).toThrow(/unrecognised journey file/);
    expect(() => p.importJourney('not json')).toThrow();
  });

  it('notifies subscribers on save and on clear, and stops when unsubscribed', async () => {
    const p = await fresh();
    const seen: (string | null)[] = [];
    const unsubscribe = p.onJourneyChange((journey) => seen.push(journey?.goal ?? null));
    await p.saveJourney({ ...emptyJourney(), goal: 'garden' });
    expect(seen).toEqual(['garden']);

    // The listener is also how useSyncExternalStore decides a re-render is needed, so it has
    // to see the clear as well.
    await p.clearJourney();
    expect(seen).toEqual(['garden', null]);
    expect(idb.data.size).toBe(0);
    expect(memory.has(KEY)).toBe(false);

    unsubscribe();
    await p.saveJourney({ ...emptyJourney(), goal: 'stairs' });
    expect(seen).toEqual(['garden', null]);
    await expect(p.loadJourney()).resolves.toMatchObject({ goal: 'stairs' });
  });
});
