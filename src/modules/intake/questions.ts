/**
 * The seven intake screens, and how they branch.
 *
 * Branching is driven by the answers themselves (a sudden onset opens a free-text
 * field, night pain opens the systemic chips, nerve symptoms open a distribution
 * question whose option set depends on the pinned region) rather than by adding extra
 * screening forms. Nothing here is optional in the model sense: an unanswered question
 * keeps the matcher on its default, and `isComplete` reports what is still missing.
 */

import type { Intake } from '@/lib/types';
import { NEURO_DETAILS } from './movements';

export type QuestionDef =
  | { kind: 'scale'; field: 'pain' | 'worst' | 'best'; labelKey: string }
  | {
      kind: 'choice';
      field: keyof Intake;
      labelKey: string;
      options: { id: string; labelKey: string; helpKey?: string }[];
    }
  | { kind: 'movements'; labelKey: string; helpKey: string }
  | { kind: 'text'; field: 'incident'; labelKey: string; placeholderKey: string }
  | { kind: 'details'; labelKey: string; keys: string[] };

export type StepDef = { id: string; titleKey: string; helpKey?: string };

export const INTAKE_STEPS: StepDef[] = [
  { id: 'pain', titleKey: 'q.intensity.label', helpKey: 'q.intensity.rule' },
  { id: 'onset', titleKey: 'q.onset.label' },
  { id: 'duration', titleKey: 'q.duration.label' },
  { id: 'pattern', titleKey: 'q.pattern.label' },
  { id: 'movements', titleKey: 'q.movements.label', helpKey: 'q.movements.hint' },
  { id: 'irritability', titleKey: 'q.irritability.label', helpKey: 'q.intake.intro' },
  { id: 'neuro', titleKey: 'q.neuro.label' },
];

export const stepCount = INTAKE_STEPS.length;

export const defaultIntake: Intake = {
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

export function questionsForStep(step: number, intake: Intake, family: string): QuestionDef[] {
  switch (INTAKE_STEPS[Math.max(0, Math.min(step, stepCount - 1))].id) {
    case 'pain':
      return [
        { kind: 'scale', field: 'pain', labelKey: 'q.intensity.label' },
        { kind: 'scale', field: 'worst', labelKey: 'q.intensity.worst' },
        { kind: 'scale', field: 'best', labelKey: 'q.intensity.best' },
      ];
    case 'onset': {
      const out: QuestionDef[] = [
        {
          kind: 'choice',
          field: 'onset',
          labelKey: 'q.onset.label',
          options: [
            { id: 'sudden', labelKey: 'q.onset.sudden' },
            { id: 'gradual', labelKey: 'q.onset.gradual' },
          ],
        },
      ];
      if (intake.onset === 'sudden') {
        out.push({
          kind: 'text',
          field: 'incident',
          labelKey: 'q.onset.incident',
          placeholderKey: 'q.onset.incidentPlaceholder',
        });
        out.push({ kind: 'details', labelKey: 'q.onset.impact', keys: ['major-trauma'] });
      }
      return out;
    }
    case 'duration':
      return [
        {
          kind: 'choice',
          field: 'duration',
          labelKey: 'q.duration.label',
          options: [
            { id: 'under6', labelKey: 'q.duration.under6' },
            { id: '6to12', labelKey: 'q.duration.6to12' },
            { id: 'over12', labelKey: 'q.duration.over12' },
          ],
        },
      ];
    case 'pattern': {
      const out: QuestionDef[] = [
        {
          kind: 'choice',
          field: 'pattern',
          labelKey: 'q.pattern.label',
          options: [
            { id: 'morning', labelKey: 'q.pattern.morning' },
            { id: 'load', labelKey: 'q.pattern.load' },
            { id: 'night', labelKey: 'q.pattern.night' },
            { id: 'constant', labelKey: 'q.pattern.constant' },
          ],
        },
      ];
      if (intake.pattern === 'night') {
        out.push({
          kind: 'details',
          labelKey: 'q.pattern.alongside',
          keys: ['fever', 'weight-loss'],
        });
      }
      return out;
    }
    case 'movements':
      return [{ kind: 'movements', labelKey: 'q.movements.label', helpKey: 'q.movements.easers' }];
    case 'irritability':
      return [
        {
          kind: 'choice',
          field: 'irritability',
          labelKey: 'q.irritability.label',
          options: [
            { id: 'high', labelKey: 'q.irritability.high' },
            { id: 'moderate', labelKey: 'q.irritability.moderate' },
            { id: 'low', labelKey: 'q.irritability.low' },
          ],
        },
      ];
    case 'neuro': {
      const out: QuestionDef[] = [
        {
          kind: 'choice',
          field: 'neuro',
          labelKey: 'q.neuro.label',
          options: [
            { id: 'none', labelKey: 'q.neuro.none' },
            { id: 'numbness', labelKey: 'q.neuro.numbness' },
            { id: 'pins', labelKey: 'q.neuro.pins' },
            { id: 'weakness', labelKey: 'q.neuro.weakness' },
          ],
        },
      ];
      if (intake.neuro !== 'none') {
        const keys = NEURO_DETAILS[family] ?? ['weakness'];
        out.push({ kind: 'details', labelKey: 'q.neuro.travels', keys });
      }
      return out;
    }
    default:
      return [];
  }
}

/** Errors per step; `null` means the step may be left as-is. */
export function validateStep(step: number, intake: Intake): string | null {
  if (step > 0) return null;
  if (intake.best > intake.pain) return 'q.intensity.rule';
  if (intake.pain > intake.worst) return 'q.intensity.rule';
  return null;
}

const ANSWERED: (keyof Intake)[] = ['onset', 'duration', 'pattern', 'irritability', 'neuro'];

export function isComplete(intake: Intake): boolean {
  return ANSWERED.every((key) => intake[key] !== null && intake[key] !== undefined);
}

/** Scales are coupled so best ≤ now ≤ worst can never be expressed wrongly. */
export function clampPain(
  intake: Intake,
  field: 'pain' | 'worst' | 'best',
  value: number,
): Pick<Intake, 'pain' | 'worst' | 'best'> {
  const v = Math.max(0, Math.min(10, Math.round(value)));
  if (field === 'pain') {
    return {
      pain: v,
      best: Math.min(intake.best, v),
      worst: Math.max(intake.worst, v),
    };
  }
  if (field === 'best')
    return { pain: intake.pain, worst: intake.worst, best: Math.min(v, intake.pain) };
  return { pain: intake.pain, best: intake.best, worst: Math.max(v, intake.pain) };
}
