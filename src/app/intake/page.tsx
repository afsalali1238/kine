'use client';

/**
 * Seven questions, one at a time, over the body map. The step counter is honest about where
 * the patient is, and every answer changes something downstream: irritability sets the dose,
 * the movement chips move the ranking, night pain raises a review flag.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button, Card, PendingTranslation } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import { useJourney } from '@/state/journey';
import { useUi } from '@/state/ui';
import { regionById } from '@/lib/content';
import {
  INTAKE_STEPS,
  clampPain,
  questionsForStep,
  stepCount,
  validateStep,
} from '@/modules/intake';
import { movementsForFamily } from '@/modules/intake';
import { movementLabel } from '@/modules/intake';
import type { Intake } from '@/lib/types';

export default function IntakePage() {
  const journey = useJourney((state) => state.journey);
  const setIntake = useJourney((state) => state.setIntake);
  const step = useUi((state) => state.step);
  const setStep = useUi((state) => state.setStep);
  const { t, lang, maybe } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const intake = journey?.intake;
  const region = regionById.get(journey?.pins[0]?.regionId ?? journey?.regionId ?? '');

  const questions = useMemo(
    () => questionsForStep(step, intake ?? ({} as Intake), region?.family ?? 'lower-back'),
    [step, intake, region?.family],
  );
  const definition = INTAKE_STEPS[step];

  if (!region) {
    return (
      <div className="page">
        <Card eyebrow={t('nav.body')} title={t('stage.explore')} testid="needs-journey">
          <p className="small">{t('body.dragPin')}</p>
          <Link href="/body" className="btn btn-primary">
            {t('nav.body')} <ArrowRight size={16} />
          </Link>
        </Card>
      </div>
    );
  }

  const label = maybe(region.label, region.labelAr);
  const regionLabelAr = region.labelAr;

  const answer = (patch: Partial<Intake>) => setIntake(patch);

  const next = () => {
    const problem = validateStep(step, intake ?? ({} as Intake));
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    if (step >= stepCount - 1) {
      router.push('/triage');
      return;
    }
    setStep(step + 1);
  };

  return (
    <div className="page cols cols-2b">
      <Card
        eyebrow={
          <>
            {t('q.of', { n: step + 1, total: stepCount })}
            <span style={{ flex: 1 }} />
            <span className="tnum">{Math.round(((step + 1) / stepCount) * 100)}%</span>
          </>
        }
        title={<span data-testid="intake-title">{t(definition.titleKey)}</span>}
      >
        {definition.helpKey ? <p className="xs muted">{t(definition.helpKey)}</p> : null}
        {error ? (
          <div className="notice notice-danger" role="alert" data-testid="intake-error">
            {t(error)}
          </div>
        ) : null}
        <div className="stack" data-testid="intake-body">
          {questions.map((question, index) => {
            if (question.kind === 'scale') {
              const value = (intake?.[question.field] as number) ?? 0;
              return (
                <label className="stack stack-sm" key={question.field}>
                  <span className="row row-between">
                    <span className="small">{t(question.labelKey)}</span>
                    <b className="tnum" data-testid={`scale-${question.field}`}>
                      {value}/10
                    </b>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={value}
                    onChange={(event) =>
                      answer(
                        clampPain(
                          intake ?? emptyIntake(),
                          question.field,
                          Number(event.target.value),
                        ),
                      )
                    }
                    data-testid={`input-${question.field}`}
                  />
                </label>
              );
            }
            if (question.kind === 'choice') {
              const selected = intake?.[question.field as keyof Intake];
              return (
                <div className="stack stack-sm" key={`${question.field}-${index}`}>
                  {question.options.map((option) => (
                    <button
                      key={option.id}
                      className="option"
                      data-selected={selected === option.id}
                      onClick={() => answer({ [question.field]: option.id } as Partial<Intake>)}
                      data-testid={`option-${option.id}`}
                    >
                      <span className="radio" />
                      <span>
                        <strong>{t(option.labelKey)}</strong>
                        {option.helpKey ? <small>{t(option.helpKey)}</small> : null}
                      </span>
                    </button>
                  ))}
                </div>
              );
            }
            if (question.kind === 'text') {
              return (
                <label className="stack stack-sm" key={question.field}>
                  <span className="small">{t(question.labelKey)}</span>
                  <input
                    type="text"
                    value={intake?.incident ?? ''}
                    placeholder={t(question.placeholderKey)}
                    onChange={(event) => answer({ incident: event.target.value })}
                    data-testid="input-incident"
                  />
                </label>
              );
            }
            if (question.kind === 'details') {
              return (
                <div className="stack stack-sm" key={question.labelKey}>
                  <span className="eyebrow">{t(question.labelKey)}</span>
                  <div className="row">
                    {question.keys.map((key) => (
                      <button
                        key={key}
                        className="chip"
                        data-selected={intake?.details.includes(key)}
                        onClick={() =>
                          answer({
                            details: toggle(intake?.details ?? [], key),
                          })
                        }
                        data-testid={`detail-${key}`}
                      >
                        {movementLabel(key, lang)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }
            const options = movementsForFamily(region.family);
            return (
              <div className="stack" key="movements">
                <span className="eyebrow">{t('q.movements.label')}</span>
                <div className="row">
                  {options.map((key) => (
                    <button
                      key={key}
                      className="chip"
                      data-tone="worse"
                      data-selected={intake?.aggravators.includes(key)}
                      onClick={() =>
                        answer({ aggravators: toggle(intake?.aggravators ?? [], key) })
                      }
                      data-testid={`worse-${key}`}
                    >
                      {movementLabel(key, lang)}
                    </button>
                  ))}
                </div>
                <span className="eyebrow">{t(question.helpKey)}</span>
                <div className="row">
                  {options.map((key) => (
                    <button
                      key={key}
                      className="chip"
                      data-selected={intake?.easers.includes(key)}
                      onClick={() => answer({ easers: toggle(intake?.easers ?? [], key) })}
                      data-testid={`ease-${key}`}
                    >
                      {movementLabel(key, lang)}
                    </button>
                  ))}
                  <button
                    className="chip"
                    data-selected={intake?.easers.includes('rest')}
                    onClick={() => answer({ easers: toggle(intake?.easers ?? [], 'rest') })}
                    data-testid="ease-rest"
                  >
                    {movementLabel('rest', lang)}
                  </button>
                </div>
                <p className="xs muted">{t('q.movements.hint')}</p>
              </div>
            );
          })}
        </div>

        <div className="row row-between">
          <button
            className="btn btn-quiet"
            onClick={() => (step ? setStep(step - 1) : router.push('/body'))}
          >
            <ArrowLeft size={15} /> {t('q.back')}
          </button>
          <span className="row">
            {step === 4 ? (
              <button className="btn btn-quiet" onClick={next} data-testid="skip-step">
                {t('q.skip')}
              </button>
            ) : null}
            <Button variant="primary" onClick={next} testid="intake-next">
              {step === stepCount - 1 ? t('explain.title') : t('q.next')}
              <ArrowRight size={16} />
            </Button>
          </span>
        </div>
        <p className="xs muted">
          <ShieldCheck size={13} /> {t('q.intake.intro')}
        </p>
      </Card>

      <div className="stack">
        <Card
          eyebrow={t('nav.body')}
          title={<PendingTranslation text={label.text} pending={lang === 'ar' && !regionLabelAr} />}
          tone="pale"
        >
          <p className="small">
            {region.views.join(' / ')} · {region.family.replace('-', ' ')}
          </p>
          <Link href="/body" className="btn btn-quiet" style={{ justifyContent: 'flex-start' }}>
            {t('body.adjust')} <ArrowRight size={15} />
          </Link>
        </Card>
      </div>
    </div>
  );
}

const emptyIntake = (): Intake => ({
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
});

function toggle(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((row) => row !== key) : [...list, key];
}
