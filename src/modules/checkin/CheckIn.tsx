'use client';

/**
 * Three fifteen-second check-ins, and each one changes something: the daily pain feeds the
 * trend, the next-morning answer is a hard condition for progression, and the post-session
 * feeling decides whether a red light cuts tomorrow's dose.
 */

import { useState } from 'react';
import { Button, Card, TrafficLight, TrafficRule } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import { traffic } from '@/modules/progress';
import type { DailyLog, SessionLog } from '@/lib/types';

export function DailyCheckIn({
  today,
  onSubmit,
}: {
  today: DailyLog | null;
  onSubmit: (pain: number, feeling: DailyLog['feeling']) => void;
}) {
  const { t, lang } = useI18n();
  const [pain, setPain] = useState(today?.pain ?? 5);
  const [feeling, setFeeling] = useState<DailyLog['feeling'] | null>(today?.feeling ?? null);
  return (
    <Card eyebrow={t('ui.today')} title={t('checkin.daily')} className="card-tight">
      <input
        type="range"
        min={0}
        max={10}
        value={pain}
        onChange={(event) => setPain(Number(event.target.value))}
        data-testid="daily-pain"
        aria-label={t('checkin.daily')}
      />
      <div className="row row-between">
        <span className="big-count">{pain}</span>
        <TrafficLight tone={traffic(pain)} lang={lang} />
      </div>
      <div className="row">
        {(['better', 'same', 'worse'] as const).map((option) => (
          <button
            key={option}
            className="chip"
            data-selected={feeling === option}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setFeeling(option)}
            data-testid={`feeling-${option}`}
          >
            {t(`checkin.${option}`)}
          </button>
        ))}
      </div>
      <Button
        variant="primary"
        disabled={!feeling}
        onClick={() => feeling && onSubmit(pain, feeling)}
        testid="daily-submit"
      >
        {t('checkin.saved')}
      </Button>
    </Card>
  );
}

export function NextDayCheck({
  onSubmit,
  settled,
  morningWorse,
}: {
  settled: boolean | null;
  morningWorse: boolean | null;
  onSubmit: (settled: boolean, morningWorse: boolean) => void;
}) {
  const { t, lang } = useI18n();
  const [s, setS] = useState<boolean | null>(settled);
  const [m, setM] = useState<boolean | null>(morningWorse);
  return (
    <Card eyebrow={t('checkin.next.title')} title={t('checkin.next.body')}>
      <div className="stack stack-sm">
        <span className="eyebrow">{t('light.settle')}</span>
        <div className="row">
          <button
            className="chip"
            style={{ flex: 1, justifyContent: 'center' }}
            data-selected={s === true}
            onClick={() => setS(true)}
            data-testid="settled-yes"
          >
            {t('checkin.next.settled')}
          </button>
          <button
            className="chip"
            style={{ flex: 1, justifyContent: 'center' }}
            data-selected={s === false}
            onClick={() => setS(false)}
            data-testid="settled-no"
          >
            {t('checkin.next.notSettled')}
          </button>
        </div>
        <span className="eyebrow">{t('light.morning')}</span>
        <div className="row">
          <button
            className="chip"
            style={{ flex: 1, justifyContent: 'center' }}
            data-selected={m === true}
            onClick={() => setM(true)}
            data-testid="morning-worse"
          >
            {t('checkin.next.morningWorse')}
          </button>
          <button
            className="chip"
            style={{ flex: 1, justifyContent: 'center' }}
            data-selected={m === false}
            onClick={() => setM(false)}
            data-testid="morning-same"
          >
            {t('checkin.next.morningSame')}
          </button>
        </div>
      </div>
      <Button
        variant="primary"
        disabled={s === null || m === null}
        onClick={() => s !== null && m !== null && onSubmit(s, m)}
        testid="next-day-submit"
      >
        {t('checkin.saved')}
      </Button>
      <TrafficRule lang={lang} />
    </Card>
  );
}

export function PostSessionCheck({
  painDuring,
  onSubmit,
}: {
  painDuring: number | null;
  onSubmit: (feeling: NonNullable<SessionLog['feeling']>, painAfter: number) => void;
}) {
  const { t, lang } = useI18n();
  const [feeling, setFeeling] = useState<NonNullable<SessionLog['feeling']> | null>('right');
  const [after, setAfter] = useState(painDuring ?? 3);
  return (
    <Card eyebrow={t('checkin.post.title')} title={t('checkin.post.felt')}>
      <div className="row">
        {(['easy', 'right', 'hard'] as const).map((option) => (
          <button
            key={option}
            className="chip"
            style={{ flex: 1, justifyContent: 'center' }}
            data-selected={feeling === option}
            onClick={() => setFeeling(option)}
            data-testid={`post-${option}`}
          >
            {t(`checkin.${option === 'right' ? 'right' : option}`)}
          </button>
        ))}
      </div>
      <span className="eyebrow">{t('session.painPrompt')}</span>
      <input
        type="range"
        min={0}
        max={10}
        value={after}
        onChange={(event) => setAfter(Number(event.target.value))}
        data-testid="pain-after"
        aria-label="pain after · الألم بعد الجلسة"
      />
      <div className="row row-between">
        <TrafficLight tone={traffic(after)} lang={lang} />
        <span className="big-count">{after}</span>
      </div>
      <Button
        variant="primary"
        disabled={!feeling}
        onClick={() => feeling && onSubmit(feeling, after)}
        testid="post-submit"
      >
        {t('session.finish')}
      </Button>
    </Card>
  );
}
