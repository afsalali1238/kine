'use client';

/**
 * The programme: four exercises, a dose that fits inside fifteen minutes, the phase you are
 * actually in, and the reason each movement was chosen. Irritability and the pattern decide
 * the dose here; the calendar decides nothing.
 */

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Clock3, Lock, Printer, Target } from 'lucide-react';
import { Button, Card, PendingTranslation } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import { useJourney } from '@/state/journey';
import { useDerived } from '@/state/selectors';
import { animationFor, findExercise } from '@/lib/content';
import { Demonstrator } from '@/modules/demonstrator';
import { tempoLabel } from '@/modules/programme';

export default function PlanPage() {
  const journey = useJourney((state) => state.journey);
  const setGoal = useJourney((state) => state.setGoal);
  const reduceDose = useJourney((state) => state.reduceDose);
  const derived = useDerived(journey);
  const { t, maybe } = useI18n();
  const router = useRouter();

  if (!journey || !derived.programme || !derived.presentation) {
    return (
      <div className="page">
        <Card eyebrow={t('plan.title')} title={t('progress.empty')} testid="needs-journey">
          <Link href="/body" className="btn btn-primary">
            {t('nav.body')} <ArrowRight size={16} />
          </Link>
        </Card>
      </div>
    );
  }

  const programme = derived.programme;
  const presentationName = maybe(derived.presentation.name, derived.presentation.nameAr);
  const first = programme.items[0];
  const firstExercise = first ? findExercise(first.exerciseId) : undefined;
  const firstAnimation = first ? animationFor(first.exerciseId) : undefined;
  const side = sideFrom(journey);

  return (
    <div className="page cols cols-2">
      <div className="stack">
        <Card
          eyebrow={
            <>
              {t('plan.phase', { n: programme.phase })} · {t(`plan.phase${programme.phase}`)}
            </>
          }
          title={
            <PendingTranslation text={presentationName.text} pending={presentationName.pending} />
          }
          actions={
            <span className="pill" data-testid="plan-minutes">
              <Clock3 size={13} /> {programme.minutes} min
            </span>
          }
        >
          <p className="small">
            {t('plan.minutes', { n: programme.minutes, n2: programme.items.length })} ·{' '}
            {programme.frequency}
          </p>
          <div className="row">
            <span className="pill pill-sage">{programme.character}</span>
            {programme.locked ? (
              <span className="pill pill-warn" data-testid="plan-locked">
                <Lock size={12} /> {t('plan.locked')}
              </span>
            ) : null}
          </div>
          <label className="stack stack-sm">
            <span className="eyebrow">
              <Target size={13} /> {t('plan.goal')}
            </span>
            <input
              type="text"
              value={journey.goal}
              placeholder={t('plan.goalPlaceholder')}
              onChange={(event) => setGoal(event.target.value)}
              data-testid="goal-input"
            />
          </label>
          <div className="row">
            <Button
              variant="primary"
              onClick={() => router.push('/session')}
              testid="plan-start"
              disabled={derived.flag?.level === 'urgent'}
            >
              {t('plan.start')}
              <ArrowRight size={16} />
            </Button>
            <Link href="/handout" className="btn">
              <Printer size={15} /> {t('plan.print')}
            </Link>
          </div>
          {derived.flag?.level === 'urgent' ? (
            <div className="notice notice-danger" role="status" data-testid="plan-blocked">
              <span className="small">{t('triage.urgent.body')}</span>
            </div>
          ) : null}
        </Card>

        {firstExercise && firstAnimation ? (
          <Demonstrator
            sex={journey.sex}
            exerciseId={firstExercise.id}
            animation={firstAnimation}
            presentationId={programme.presentationId}
            side={side}
            autoPlay
            mini={false}
            rigKey="plan"
          />
        ) : null}
      </div>

      <div className="stack">
        {programme.items.map((item, index) => {
          const exercise = findExercise(item.exerciseId);
          if (!exercise) return null;
          const name = maybe(exercise.name, exercise.nameAr);
          return (
            <Card
              key={exercise.id}
              className="card-tight"
              eyebrow={`${t('ui.today')} · 0${index + 1}`}
              title={<PendingTranslation text={name.text} pending={name.pending} />}
            >
              <div className="row">
                <span className="pill tnum" data-testid={`dose-${exercise.id}`}>
                  {item.sets} × {item.holdSeconds ? `${item.holdSeconds}s` : (item.reps ?? '—')}
                </span>
                <span className="pill tnum">{tempoLabel(exercise.tempo)}</span>
                <span className="pill xs">
                  {exercise.equipment === 'none' ? t('learn.noEquipment') : exercise.equipment}
                </span>
                <span className="pill xs">{exercise.positionRequired.replace(/_/g, ' ')}</span>
              </div>
              <p className="xs muted">{item.why}</p>
              <div className="row row-between">
                <button
                  className="btn btn-quiet xs"
                  onClick={() => reduceDose(exercise.id, Math.max(0, item.sets))}
                  data-testid={`cut-${exercise.id}`}
                >
                  {t('progress.reducing')}
                </button>
                <span className="xs muted tnum">{Math.round(item.seconds / 60)} min</span>
              </div>
            </Card>
          );
        })}
        <Card eyebrow={t('light.title')} className="card-tight">
          <p className="xs">{t('light.during')}</p>
          <p className="xs">{t('light.settle')}</p>
          <p className="xs">{t('light.morning')}</p>
          <p className="xs muted">{t('light.note')}</p>
        </Card>
        <Link href="/learn" className="btn btn-quiet" style={{ justifyContent: 'center' }}>
          {t('learn.title')} <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

/** A left-sided marker demonstrates on the left; one authored record serves both sides. */
function sideFrom(journey: { pins: { regionId: string }[] }): 'left' | 'right' | 'both' {
  const id = journey.pins[0]?.regionId ?? '';
  if (id.endsWith('-left')) return 'left';
  if (id.endsWith('-right')) return 'right';
  return 'both';
}
