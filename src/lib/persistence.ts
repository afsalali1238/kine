/**
 * Offline-first persistence: IndexedDB through idb-keyval, with a synchronous
 * localStorage mirror so a hydration pass never resolves `undefined` into a blank screen.
 * No server, no account, nothing leaves the device.
 */

import { get, set, del } from 'idb-keyval';
import type { Journey } from './types';
import { emptyJourney } from './types';

const KEY = 'kine.journey.v2';
const LEGACY = 'kinesio-recovery';

type Listener = (journey: Journey | null) => void;
const listeners = new Set<Listener>();

let current: Journey | null = null;
let hydrated = false;

export function onJourneyChange(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function mirror(journey: Journey | null) {
  try {
    if (journey) localStorage.setItem(KEY, JSON.stringify(journey));
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode: IndexedDB alone is still fine */
  }
}

export function migrateLegacy(raw: unknown): Journey | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const journey = emptyJourney();
  const region = typeof source.region === 'string' ? source.region : null;
  const legacy = (source.intake ?? {}) as Record<string, unknown>;
  const onset = typeof legacy.onset === 'string' ? legacy.onset : 'gradual';
  const duration = typeof legacy.duration === 'string' ? legacy.duration : '6to12';
  journey.regionId = region;
  if (source.intake) {
    journey.intake = {
      ...journey.intake!,
      ...legacy,
      onset: onset === 'incident' || onset === 'sudden' ? 'sudden' : 'gradual',
      duration: duration === 'acute' ? 'under6' : duration === 'persistent' ? 'over12' : '6to12',
      travelsTo: typeof legacy.travelsTo === 'string' ? legacy.travelsTo : null,
    } as Journey['intake'];
  }
  if (typeof source.presentationId === 'string') journey.presentationId = source.presentationId;
  if (typeof source.goal === 'string') journey.goal = source.goal;
  if (typeof source.phase === 'number') journey.phase = source.phase;
  if (Array.isArray(source.logs)) {
    journey.daily = (source.logs as Record<string, unknown>[])
      .filter((row) => typeof row.date === 'string')
      .map((row) => ({
        date: String(row.date),
        pain: Number(row.pain ?? 0),
        feeling: row.feeling === 'better' || row.feeling === 'worse' ? row.feeling : 'same',
        phase: Number(row.phase ?? 1),
      }));
  }
  return journey;
}

/** Reads IndexedDB first, falls back to the localStorage mirror, then to legacy v1 data. */
export async function loadJourney(): Promise<Journey | null> {
  if (hydrated) return current;
  let stored: Journey | null = null;
  // A refused IndexedDB has to fall through to the mirror, not to "no journey". One
  // try/catch around the whole read turned private mode into an empty app: the mirror is the
  // thing that keeps a programme alive when the bigger store is unavailable.
  try {
    stored = (await get(KEY)) as Journey | null;
  } catch {
    stored = null;
  }
  if (stored?.version === 2) return adopt(stored);

  const mirrored = readJson(KEY);
  if ((mirrored as Journey | null)?.version === 2) return adopt(mirrored as Journey);

  const legacy = readJson(LEGACY);
  if (legacy) return adopt(migrateLegacy(legacy));

  hydrated = true;
  return current;
}

/** Anything in storage is untrusted: a half-written value must read as absent, not throw. */
function readJson(key: string): unknown {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function adopt(journey: Journey | null): Journey | null {
  current = journey;
  hydrated = true;
  return current;
}

export async function saveJourney(journey: Journey): Promise<void> {
  current = journey;
  for (const listener of listeners) listener(journey);
  mirror(journey);
  try {
    await set(KEY, journey);
  } catch {
    /* quota or private mode: the mirror above already holds this session's work */
  }
}

export async function clearJourney(): Promise<void> {
  current = null;
  hydrated = false;
  for (const listener of listeners) listener(null);
  mirror(null);
  try {
    await del(KEY);
  } catch {
    /* same as above */
  }
}

export function exportJourney(journey: Journey): string {
  return JSON.stringify(journey, null, 2);
}

const V1_MARKERS = ['region', 'intake', 'logs', 'presentationId', 'goal', 'phase'];

export function importJourney(text: string): Journey {
  const parsed = JSON.parse(text) as Partial<Journey>;
  if (parsed && typeof parsed === 'object' && parsed.version !== 2) {
    // Any object at all used to migrate into a *blank* journey, so importing the wrong file
    // looked like a fresh start. Require something recognisably kinē before accepting it.
    const looksV1 = V1_MARKERS.some((key) => key in (parsed as Record<string, unknown>));
    const migrated = looksV1 ? migrateLegacy(parsed) : null;
    if (!migrated) throw new Error('unrecognised journey file');
    return migrated;
  }
  if (parsed?.version === 2) return { ...emptyJourney(), ...parsed } as Journey;
  throw new Error('unrecognised journey file');
}

/** Blocks the first paint from assuming "no journey" while IndexedDB is still reading. */
export const isHydrated = () => hydrated;
