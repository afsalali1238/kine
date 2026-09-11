/**
 * A sample week, so the progress and review screens can be seen before a patient has
 * logged anything. Clearly labelled in the UI as sample data, and it never masquerades
 * as an assessment: it fills the same store shape the real flow writes.
 */

import type { Journey } from '@/lib/types';
import { emptyJourney } from '@/lib/types';
import { findRegion } from '@/lib/content';
import { buildProgramme } from '@/modules/programme';

const PAIN = [6, 6, 5, 5, 4, 4, 3];

export function sampleJourney(regionId = 'knee-anterior-left'): Journey {
  const base = emptyJourney();
  const region = findRegion(regionId);
  const intake = {
    ...base.intake!,
    pain: 4,
    best: 1,
    worst: 6,
    onset: 'gradual' as const,
    duration: '6to12' as const,
    pattern: 'load' as const,
    aggravators: ['stairs', 'squatting', 'sitting'],
    easers: ['movement', 'rest'],
    irritability: 'moderate' as const,
    neuro: 'none' as const,
  };
  const presentationId = region?.presentationIds[0] ?? 'patellofemoral';
  const journey: Journey = {
    ...base,
    regionId,
    pins: region
      ? [
          {
            id: 'demo',
            regionId,
            point: region.centroid,
            normal: [0, 0, 1],
            intensity: 4,
          },
        ]
      : [],
    intake,
    presentationId,
    goal: 'Stairs without thinking about it',
    phase: 1,
  };
  const programme = buildProgramme({
    regionId,
    presentationId,
    intake,
    phase: 1,
    goal: journey.goal,
  });
  const exerciseIds = programme.items.map((item) => item.exerciseId);
  const start = Date.now() - 7 * 86400000;
  journey.sessions = [0, 1, 2, 3, 4].map((day) => ({
    id: `demo-${day}`,
    date: new Date(start + day * 86400000 * 1.4).toISOString().slice(0, 10),
    phase: 1,
    regionId,
    pins: journey.pins,
    planned: exerciseIds,
    completed: exerciseIds,
    skipped: [],
    swaps: [],
    painDuring: 3,
    painAfter: day > 2 ? 2 : 3,
    feeling: day > 1 ? 'easy' : 'right',
    settled: true,
    morningWorse: false,
    seconds: 640,
  }));
  journey.daily = PAIN.map((pain, index) => ({
    date: new Date(start + index * 86400000).toISOString().slice(0, 10),
    pain,
    feeling: index > 2 ? 'better' : 'same',
    phase: 1,
  }));
  journey.nextDayCheck = {
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    settled: true,
    morningWorse: false,
  };
  return journey;
}
