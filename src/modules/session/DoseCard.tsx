'use client';

/**
 * The counter: where you are in the set, the beat of the authored tempo, the meter of the
 * current phase, and the two controls a sweating person can still hit. Read-only with
 * respect to the session — it never decides what the next item is.
 */

import { Activity, Pause, Play } from 'lucide-react';
import { Button, Card } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import type { Tick } from './clock';
import type { ProgrammeItem } from '@/modules/programme';

export function DoseCard({
  tick,
  current,
  remaining,
  beat,
  playing,
  onToggle,
  onRestart,
}: {
  tick: Tick;
  current: ProgrammeItem;
  remaining: number;
  beat: number;
  playing: boolean;
  onToggle: () => void;
  onRestart: () => void;
}) {
  const { t } = useI18n();
  return (
    <Card className="card-tight">
      <div className="row row-between">
        <span className="big-count">
          {tick.kind === 'hold' ? remaining : current.reps ? tick.repIndex + 1 : ''}
          {current.reps && tick.kind !== 'hold' ? (
            <span style={{ fontSize: 16 }} className="muted">
              /{current.reps}
            </span>
          ) : null}
        </span>
        <span className="pill pill-sage">
          <Activity size={13} /> {t(`session.${tick.kind === 'rest' ? 'rest' : 'play'}`)}
        </span>
      </div>
      <div className="beat" data-testid="beat">
        {[0, 1, 2].map((i) => (
          <i key={i} data-on={Math.floor(beat * 3) >= i} />
        ))}
      </div>
      <div className="meter">
        <i style={{ width: `${Math.round((tick.ms / Math.max(1, tick.totalMs)) * 100)}%` }} />
      </div>
      <div className="row">
        <Button
          variant="primary"
          onClick={onToggle}
          icon={playing ? <Pause size={16} /> : <Play size={16} />}
          testid="toggle-play"
        >
          {playing ? t('session.pause') : t('session.play')}
        </Button>
        <Button onClick={onRestart}>{t('session.reset')}</Button>
      </div>
      <p className="xs muted">{t('session.affordance')}</p>
    </Card>
  );
}
