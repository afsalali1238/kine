/**
 * The single journey store. Everything that persists goes through `update`, so one write
 * path owns saving, and no screen can leave the device in a half-written state.
 */

import { create } from 'zustand';
import {
  emptyJourney,
  type DailyLog,
  type Intake,
  type Journey,
  type Pin,
  type SessionLog,
} from '@/lib/types';
import { clearJourney, loadJourney, saveJourney } from '@/lib/persistence';
import { findRegion } from '@/lib/content';

const today = () => new Date().toISOString().slice(0, 10);

type JourneyStore = {
  journey: Journey | null;
  ready: boolean;
  hydrate: () => Promise<void>;
  start: (sex: 'male' | 'female') => void;
  setSex: (sex: 'male' | 'female') => void;
  placePin: (pin: Omit<Pin, 'id'>) => string;
  movePin: (id: string, point: [number, number, number], normal: [number, number, number]) => void;
  setPinIntensity: (id: string, intensity: number) => void;
  removePin: (id: string) => void;
  chooseRegion: (regionId: string) => void;
  setIntake: (patch: Partial<Intake>) => void;
  rejectPresentation: (id: string) => void;
  acceptPresentation: (id: string) => void;
  setGoal: (goal: string) => void;
  commitSession: (log: Omit<SessionLog, 'id' | 'date'>) => void;
  recordDaily: (log: Omit<DailyLog, 'date'>) => void;
  recordNextDay: (settled: boolean, morningWorse: boolean) => void;
  finishSessionCheck: (feeling: 'easy' | 'right' | 'hard', painAfter: number) => void;
  advancePhase: () => void;
  reduceDose: (exerciseId: string, sets: number) => void;
  reset: () => void;
  loadDemo: (demo: Journey) => void;
};

export const useJourney = create<JourneyStore>((set, get) => {
  const mutate = (fn: (journey: Journey) => Journey) => {
    const base = get().journey ?? emptyJourney();
    const next = fn(base);
    set({ journey: next });
    void saveJourney(next);
  };

  return {
    journey: null,
    ready: false,
    async hydrate() {
      if (get().ready) return;
      const stored = await loadJourney();
      set({ journey: stored, ready: true });
    },
    start(sex) {
      mutate((journey) => ({
        ...journey,
        sex,
        createdAt: journey.createdAt || new Date().toISOString(),
      }));
    },
    setSex(sex) {
      mutate((journey) => ({ ...journey, sex }));
    },
    placePin(pin) {
      const id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      mutate((journey) => {
        if (journey.pins.length >= 5) return journey;
        return {
          ...journey,
          pins: [...journey.pins, { ...pin, id }],
          regionId: journey.regionId ?? pin.regionId,
          presentationId: null,
        };
      });
      return id;
    },
    movePin(id, point, normal) {
      mutate((journey) => ({
        ...journey,
        pins: journey.pins.map((pin) => (pin.id === id ? { ...pin, point, normal } : pin)),
      }));
    },
    setPinIntensity(id, intensity) {
      mutate((journey) => ({
        ...journey,
        pins: journey.pins.map((pin) => (pin.id === id ? { ...pin, intensity } : pin)),
      }));
    },
    removePin(id) {
      mutate((journey) => {
        const pins = journey.pins.filter((pin) => pin.id !== id);
        const primary = pins[0] ?? null;
        return {
          ...journey,
          pins,
          regionId: primary ? primary.regionId : null,
          presentationId: pins.length === journey.pins.length ? journey.presentationId : null,
        };
      });
    },
    chooseRegion(regionId) {
      mutate((journey) => ({ ...journey, regionId, presentationId: null }));
    },
    setIntake(patch) {
      mutate((journey) => ({
        ...journey,
        intake: { ...(journey.intake ?? emptyIntake()), ...patch },
      }));
    },
    rejectPresentation(id) {
      mutate((journey) => ({
        ...journey,
        rejectedPresentationIds: [...journey.rejectedPresentationIds, id],
        presentationId: null,
      }));
    },
    acceptPresentation(id) {
      mutate((journey) => ({ ...journey, presentationId: id }));
    },
    setGoal(goal) {
      mutate((journey) => ({ ...journey, goal }));
    },
    commitSession(log) {
      mutate((journey) => {
        const entry: SessionLog = { ...log, id: `s${Date.now().toString(36)}`, date: today() };
        return {
          ...journey,
          sessions: [...journey.sessions, entry],
          nextDayCheck: { date: tomorrow(), settled: false, morningWorse: false },
        };
      });
    },
    recordDaily(log) {
      mutate((journey) => ({
        ...journey,
        daily: [...journey.daily.filter((row) => row.date !== today()), { ...log, date: today() }],
      }));
    },
    finishSessionCheck(feeling, painAfter) {
      mutate((journey) => {
        const sessions = [...journey.sessions];
        const last = sessions.at(-1);
        if (!last) return journey;
        sessions[sessions.length - 1] = { ...last, feeling, painAfter };
        return { ...journey, sessions };
      });
    },
    recordNextDay(settled, morningWorse) {
      mutate((journey) => ({
        ...journey,
        nextDayCheck: { date: today(), settled, morningWorse },
      }));
    },
    advancePhase() {
      mutate((journey) => ({
        ...journey,
        phase: Math.min(3, journey.phase + 1),
        reviewBlock: journey.reviewBlock + 1,
        lastAdvancedOn: today(),
        doseCuts: {},
      }));
    },
    reduceDose(exerciseId, sets) {
      mutate((journey) => ({
        ...journey,
        doseCuts: { ...journey.doseCuts, [exerciseId]: sets },
      }));
    },
    reset() {
      set({ journey: null });
      void clearJourney();
    },
    loadDemo(demo) {
      mutate(() => demo);
    },
  };
});

function emptyIntake(): Intake {
  return {
    pain: 5,
    best: 2,
    worst: 7,
    onset: 'gradual',
    incident: null,
    duration: '6to12',
    pattern: 'load',
    aggravators: [],
    easers: [],
    irritability: 'moderate',
    neuro: 'none',
    travelsTo: null,
    details: [],
  };
}

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** The region the whole journey is anchored to: the first placed marker wins. */
export function primaryRegion(journey: Journey | null) {
  const id = journey?.pins[0]?.regionId ?? journey?.regionId ?? null;
  return findRegion(id);
}
