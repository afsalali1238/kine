'use client';

/**
 * Today. A returning patient lands on the single action that is next — start the session,
 * finish the check-in, or look at the trend — not on a marketing page. A new visitor lands on
 * the body, which is where the product actually starts.
 */

import Link from 'next/link';
import { ArrowRight, Play, Printer, Sparkles } from 'lucide-react';
import { Button, Card, PendingTranslation, TrafficLight } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import { useJourney } from '@/state/journey';
import { useUi } from '@/state/ui';
import { lightFor, todayAction, useDerived } from '@/state/selectors';
import { findExercise, regionById } from '@/lib/content';
import { tempoLabel } from '@/modules/programme';
import { sampleJourney } from '@/state/demo';

export default function Today() {
  const journey = useJourney((state) => state.journey);
  const loadDemo = useJourney((state) => state.loadDemo);
  const reducedMotion = useUi((state) => state.reducedMotion);
  const setReducedMotion = useUi((state) => state.setReducedMotion);
  const derived = useDerived(journey);
  const action = todayAction(journey, derived);
  const { t, lang, maybe } = useI18n();
  const region = derived.region;
  const light = lightFor(journey);

  if (!journey || !region) {
    return (
      <div className="page cols cols-2" style={{ maxWidth: 1080 }}>
        <div className="stack">
          <Card
            eyebrow={`${t('app.name')} · ${t('app.tagline')}`}
            title={t('stage.explore')}
            actions={<span className="pill pill-sage">v2</span>}
          >
            <p className="small">{t('q.intake.intro')}</p>
            <div className="row">
              <Link href="/body" className="btn btn-primary" data-testid="start">
                {t('nav.body')} <ArrowRight size={16} />
              </Link>
              <Button
                icon={<Sparkles size={15} />}
                onClick={() => loadDemo(sampleJourney())}
                testid="today-demo"
              >
                {t('ui.demo')}
              </Button>
              <Link href="/handout" className="btn btn-quiet">
                <Printer size={15} /> {t('plan.print')}
              </Link>
            </div>
            <p className="xs muted" data-testid="reduced-motion-note">
              {reducedMotion ? t('body.noWebgl') : ''}{' '}
              <button
                className="btn btn-quiet xs"
                style={{ minHeight: 32 }}
                onClick={() => setReducedMotion(!reducedMotion)}
              >
                {reducedMotion ? '3D' : '2D'}
              </button>
            </p>
          </Card>
        </div>
        <div className="stack">
          <Card eyebrow={t('ui.internal')} title={t('explain.fitNote')} tone="pale">
            <p className="xs">{t('light.note')}</p>
          </Card>
        </div>
      </div>
    );
  }

  const name = derived.presentation
    ? maybe(derived.presentation.name, derived.presentation.nameAr)
    : null;

  return (
    <div className="page cols cols-2" style={{ maxWidth: 1120 }}>
      <div className="stack">
        <Card
          eyebrow={
            <>
              {t('ui.today')} · {t('plan.phase', { n: journey.phase })}
            </>
          }
          title={
            name ? (
              <PendingTranslation text={name.text} pending={name.pending} />
            ) : (
              t('stage.explore')
            )
          }
          actions={<TrafficLight tone={light} lang={lang} />}
        >
          {region ? (
            <p className="small">
              {lang === 'ar' ? (region.labelAr ?? region.label) : region.label} ·{' '}
              {journey.pins.length} {t('progress.sessions')}
            </p>
          ) : null}
          <div className="row">
            <Link href={action.href} className="btn btn-primary" data-testid="today-action">
              {action.kind === 'session' ? <Play size={15} /> : null}
              {t(action.ctaKey)}
              <ArrowRight size={16} />
            </Link>
            <Link href="/body" className="btn btn-quiet">
              {t('nav.body')}
            </Link>
          </div>
          {derived.flag ? (
            <div
              className={`notice ${derived.flag.level === 'urgent' ? 'notice-danger' : 'notice-warn'}`}
              role="status"
              data-testid="today-flag"
            >
              <span className="small">{t(derived.flag.key)}</span>
            </div>
          ) : null}
        </Card>

        {derived.programme?.items.length ? (
          <Card
            eyebrow={t('plan.title')}
            title={t('plan.minutes', {
              n: derived.programme.minutes,
              n2: derived.programme.items.length,
            })}
          >
            <div className="stack stack-sm">
              {derived.programme.items.map((item, index) => {
                const exercise = findExercise(item.exerciseId);
                if (!exercise) return null;
                const label = maybe(exercise.name, exercise.nameAr);
                return (
                  <div className="row row-between" key={exercise.id}>
                    <span className="small">
                      <span className="muted tnum">0{index + 1}</span>{' '}
                      <PendingTranslation text={label.text} pending={label.pending} />
                    </span>
                    <span className="xs muted tnum">
                      {item.sets} × {item.holdSeconds ? `${item.holdSeconds}s` : (item.reps ?? '—')}{' '}
                      · {tempoLabel(exercise.tempo)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="row">
              <Link href="/plan" className="btn">
                {t('plan.title')} <ArrowRight size={15} />
              </Link>
              <Link href="/session" className="btn btn-primary" data-testid="today-start-session">
                <Play size={15} /> {t('plan.start')}
              </Link>
            </div>
          </Card>
        ) : null}
      </div>

      <div className="stack">
        <Card
          eyebrow={t('progress.title')}
          title={`${journey.daily.length ? journey.daily.at(-1)?.pain : '—'}/10`}
          actions={
            <Link href="/progress" className="btn btn-quiet xs">
              {t('nav.progress')}
            </Link>
          }
        >
          <p className="small">
            {t('progress.reviewBody', { done: derived.gate.doneInBlock, need: derived.gate.need })}
          </p>
          <div className="meter">
            <i style={{ width: `${derived.gate.adherence}%` }} />
          </div>
          {region ? (
            <p className="xs muted">
              {region.triangles.toLocaleString('en')} tris · {region.areaMm2.toLocaleString('en')}{' '}
              mm²
            </p>
          ) : null}
        </Card>
        {journey.pins[0] ? (
          <Card eyebrow={t('body.pins', { n: journey.pins.length })} title={t('body.intensity')}>
            <div className="stack stack-sm">
              {journey.pins.map((pin) => (
                <div className="row row-between" key={pin.id}>
                  <span className="small">
                    {regionById.get(pin.regionId)?.label ?? pin.regionId}
                  </span>
                  <span className="pill tnum">{pin.intensity}/10</span>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
