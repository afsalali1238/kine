/**
 * Shared fixtures for the clinical suites: a full intake answer set, a region lookup that
 * fails loudly, and the one call that runs the whole chain end to end.
 */

import { buildProgramme } from '@/modules/programme';
import { firstStartable, matchPresentations } from '@/modules/triage';
import { regions } from '@/lib/content';
import { type Intake } from '@/lib/types';

export const intake = (patch: Partial<Intake>): Intake => ({
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
  ...patch,
});
export const region = (id: string) => {
  const row = regions.find((region) => region.id === id);
  if (!row) throw new Error(`unknown region ${id}`);
  return row;
};
export const programFor = (
  regionId: string,
  patch: Partial<Intake> & { phase?: number; presentationId?: string } = {},
) => {
  const row = region(regionId);
  const answers = intake(patch);
  const matches = matchPresentations(row, answers);
  const chosen = patch.presentationId
    ? matches.find((item) => item.presentation.id === patch.presentationId)?.presentation.id
    : (firstStartable(matches)?.presentation.id ?? row.presentationIds[0]);
  return buildProgramme({
    regionId,
    presentationId: chosen ?? row.presentationIds[0],
    intake: answers,
    phase: patch.phase ?? 1,
    goal: '',
  });
};
