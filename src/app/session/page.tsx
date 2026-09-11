'use client';

/**
 * The session itself. An urgent red flag stops it from starting at all — the plan screen
 * stays readable, the player does not open. Everything else is the metronome, the figure and
 * four numbers.
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import { useJourney } from '@/state/journey';
import { useUi } from '@/state/ui';
import { useDerived, sessionQueue } from '@/state/selectors';
import { SessionPlayer, type SessionProgress } from '@/modules/session';

export default function SessionPage() {
  const journey = useJourney((state) => state.journey);
  const commit = useJourney((state) => state.commitSession);
  const reducedMotion = useUi((state) => state.reducedMotion);
  const derived = useDerived(journey);
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (!journey?.presentationId) router.replace('/body');
  }, [journey?.presentationId, router]);

  if (!journey || !derived.programme || !derived.started) {
    return (
      <div className="page">
        <Card eyebrow={t('stage.session')} title={t('progress.empty')} testid="needs-journey">
          <Link href="/plan" className="btn btn-primary">
            {t('plan.title')} <ArrowRight size={16} />
          </Link>
        </Card>
      </div>
    );
  }

  if (derived.flag?.level === 'urgent') {
    return (
      <div className="page" style={{ maxWidth: 620 }}>
        <Card eyebrow={t('triage.urgent.title')} title={t('stage.session')}>
          <div className="notice notice-danger" role="alert" data-testid="session-blocked">
            <span className="small">{t('triage.urgent.body')}</span>
          </div>
          <div className="row">
            <Link href="/triage" className="btn btn-danger">
              {t('triage.read')}
            </Link>
            <Link href="/learn" className="btn btn-quiet">
              {t('learn.title')}
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const queue = sessionQueue(journey, derived.programme);
  if (!queue.length) {
    return (
      <div className="page" style={{ maxWidth: 620 }}>
        <Card eyebrow={t('plan.title')} title={t('ui.nothing')}>
          <p className="small">{t('explain.fitNote')}</p>
          <Link href="/explain" className="btn btn-primary">
            {t('explain.title')} <ArrowRight size={16} />
          </Link>
        </Card>
      </div>
    );
  }

  const finish = (progress: SessionProgress, seconds: number) => {
    const entries = Object.values(progress);
    const completed = entries
      .filter((row) => row.response !== 'skipped' && row.setsDone > 0)
      .map((row) => row.exerciseId);
    const skipped = entries
      .filter((row) => row.response === 'skipped')
      .map((row) => ({
        exerciseId: row.exerciseId,
        reason: row.skipReason ?? 'time',
      }));
    const pains = entries.map((row) => row.pain).filter((value): value is number => value !== null);
    commit({
      phase: journey.phase,
      regionId: journey.pins[0]?.regionId ?? journey.regionId ?? null,
      pins: journey.pins,
      planned: queue.map((row) => row.exercise.id),
      completed,
      skipped,
      swaps: [],
      painDuring: pains.length ? Math.round(pains.reduce((a, b) => a + b, 0) / pains.length) : null,
      painAfter: null,
      feeling: null,
      settled: null,
      morningWorse: null,
      seconds,
    });
    router.push('/checkin');
  };

  return (
    <div className="page page-wide">
      <SessionPlayer
        sex={journey.sex}
        presentationId={derived.programme.presentationId}
        items={derived.programme.items}
        side={sideFrom(journey.pins.map((pin) => pin.regionId))}
        reducedMotion={reducedMotion}
        onFinish={finish}
      />
    </div>
  );
}

function sideFrom(ids: string[]): 'left' | 'right' | 'both' {
  const id = ids[0] ?? '';
  if (id.endsWith('-left')) return 'left';
  if (id.endsWith('-right')) return 'right';
  return 'both';
}
