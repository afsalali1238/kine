'use client';

/**
 * The 15 seconds that decide tomorrow's dose: how it felt, how much it hurt, and the
 * next-morning answer that progression is gated on.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import { useJourney } from '@/state/journey';
import { useDerived } from '@/state/selectors';
import { DailyCheckIn, NextDayCheck, PostSessionCheck } from '@/modules/checkin';

export default function CheckInPage() {
  const journey = useJourney((state) => state.journey);
  const recordDaily = useJourney((state) => state.recordDaily);
  const recordNextDay = useJourney((state) => state.recordNextDay);
  const setPainAfter = useJourney((state) => state.finishSessionCheck);
  const derived = useDerived(journey);
  const { t } = useI18n();
  const router = useRouter();
  const last = journey?.sessions.at(-1) ?? null;

  return (
    <div className="page cols cols-2" style={{ maxWidth: 1000 }}>
      <div className="stack">
        <Card eyebrow={t('stage.checkin')} title={t('checkin.post.title')}>
          {last && last.painAfter === null ? (
            <PostSessionCheck
              painDuring={last.painDuring}
              onSubmit={(feeling, after) => {
                setPainAfter(feeling, after);
                recordDaily({
                  pain: after,
                  feeling: after <= (last.painDuring ?? after) ? 'better' : 'worse',
                  phase: journey?.phase ?? 1,
                });
                router.push('/progress');
              }}
            />
          ) : (
            <p className="small" data-testid="checkin-done">
              {t('checkin.saved')}
            </p>
          )}
          <Link href="/progress" className="btn btn-quiet" style={{ justifyContent: 'flex-start' }}>
            {t('progress.title')} <ArrowRight size={15} />
          </Link>
        </Card>
        <DailyCheckIn
          today={journey?.daily.at(-1) ?? null}
          onSubmit={(pain, feeling) => recordDaily({ pain, feeling, phase: journey?.phase ?? 1 })}
        />
      </div>
      <div className="stack">
        <NextDayCheck
          settled={journey?.nextDayCheck?.settled ?? null}
          morningWorse={journey?.nextDayCheck?.morningWorse ?? null}
          onSubmit={(settled, worse) => {
            recordNextDay(settled, worse);
            router.push('/progress');
          }}
        />
        <Card eyebrow={t('light.title')} className="card-tight">
          <p className="xs">{t('light.note')}</p>
          <p className="xs muted">{t('light.neuro')}</p>
        </Card>
        {derived.gate.adherence > 0 ? (
          <p className="xs muted" data-testid="checkin-gate">
            {t('progress.reviewBody', { done: derived.gate.doneInBlock, need: derived.gate.need })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
