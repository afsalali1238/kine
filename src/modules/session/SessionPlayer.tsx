'use client';

/**
 * The one screen where a rep is counted, a tempo is heard and a pain score is asked.
 *
 * It is deliberately narrow: the clock and the figure are both fed from the authored dose,
 * the metronome reads the tempo object, and the only way to escalate is to finish and let the
 * review block decide. "Too painful" reduces the dose for the next session — never mid-set,
 * and never by hiding the exercise.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, Card } from '@/ui';
import { PendingTranslation } from '@/ui/PendingTranslation';
import { useI18n } from '@/lib/use-i18n';
import { Demonstrator, FaultSplit } from '@/modules/demonstrator';
import { animationFor, findExercise } from '@/lib/content';
import type { ProgrammeItem } from '@/modules/programme';
import type { SessionExerciseState } from '@/lib/types';
import { timingFor, useSessionClock, type ItemTiming } from './clock';
import { CueList, PainPrompt, SkipSheet, type SkipReason } from './ResponseCards';
import { StageControls } from './StageControls';
import { DoseCard } from './DoseCard';
import { speak, speechAvailable, stopSpeech } from './cues';

export type SessionProgress = Record<string, SessionExerciseState>;

type Props = {
  sex: 'male' | 'female';
  presentationId: string;
  items: ProgrammeItem[];
  side: 'left' | 'right' | 'both';
  reducedMotion: boolean;
  initial?: SessionProgress;
  onFinish: (progress: SessionProgress, seconds: number) => void;
};

export function SessionPlayer({
  sex,
  presentationId,
  items,
  side,
  reducedMotion,
  initial,
  onFinish,
}: Props) {
  const { t, lang, maybe } = useI18n();
  const [progress, setProgress] = useState<SessionProgress>(() => initial ?? {});
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<'primary' | 'secondary'>('primary');
  const [fault, setFault] = useState(false);
  const [voice, setVoice] = useState(false);
  const [skipFor, setSkipFor] = useState<string | null>(null);
  const [pain, setPain] = useState<number | null>(null);
  const started = useRef(0);

  const timings = useMemo<ItemTiming[]>(
    () =>
      items
        .map((item) => {
          const exercise = findExercise(item.exerciseId);
          const animation = animationFor(item.exerciseId);
          if (!exercise || !animation) return null;
          return timingFor(exercise, animation, {
            sets: item.sets,
            reps: item.reps,
            holdSeconds: item.holdSeconds,
          });
        })
        .filter((row): row is ItemTiming => row !== null),
    [items],
  );

  const clock = useSessionClock(timings, playing);
  const tick = clock.tick;
  const current = items[tick.exerciseIndex] ?? items[0] ?? null;
  const exercise = current ? findExercise(current.exerciseId) : undefined;
  const animation = current ? animationFor(current.exerciseId) : undefined;
  const state = current ? progress[current.exerciseId] : undefined;
  const skipped = state?.response === 'skipped';

  useEffect(() => {
    if (!voice) stopSpeech();
  }, [voice]);

  // A set counts as done when the clock enters the next one, so the record reflects what
  // was actually performed rather than what a button was pressed for. The clock ticks
  // outside React (requestAnimationFrame on a ref), so writing its boundary into state is
  // exactly the external-system sync this rule allows.
  useEffect(() => {
    if (!current) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress((previous) => {
      const row = previous[current.exerciseId] ?? {
        exerciseId: current.exerciseId,
        setsDone: 0,
        pain: null,
        response: null,
        skipReason: null,
      };
      if (tick.setIndex + 1 <= row.setsDone) return previous;
      return { ...previous, [current.exerciseId]: { ...row, setsDone: tick.setIndex + 1, pain } };
    });
  }, [tick.setIndex, current, pain]);
  useEffect(() => () => stopSpeech(), []);

  const cueIndex = animation?.cues.length ? cueFor(animation.cues, tick.t) : -1;
  const lastCue = useRef(-1);
  useEffect(() => {
    if (!animation || cueIndex === lastCue.current) return;
    lastCue.current = cueIndex;
    const row = animation.cues[cueIndex];
    if (!row) return;
    if (voice) speak(lang === 'ar' && row.cueAr ? row.cueAr : row.cue, lang);
  }, [animation, cueIndex, voice, lang]);

  if (!exercise || !animation || !current) {
    return (
      <Card eyebrow={t('session.title')} title={t('ui.nothing')}>
        <p className="small">{t('progress.empty')}</p>
      </Card>
    );
  }

  const label = maybe(exercise.name, exercise.nameAr);
  const remaining = Math.max(0, Math.ceil(tick.remainingMs / 1000));
  const beat = Math.max(0, Math.min(1, tick.t));
  const faultId = fault ? (animation.faultTracks[0]?.faultId ?? null) : null;
  const allSettled = items.every((item) => {
    const row = progress[item.exerciseId];
    return row && (row.response === 'skipped' || row.setsDone >= item.sets);
  });

  const skip = (reason: SkipReason) => {
    setProgress((previous) => ({
      ...previous,
      [current.exerciseId]: {
        exerciseId: current.exerciseId,
        setsDone: previous[current.exerciseId]?.setsDone ?? 0,
        pain: null,
        response: 'skipped',
        skipReason: reason,
      },
    }));
    setSkipFor(null);
    clock.nextExercise(tick.exerciseIndex + 1);
  };

  const tooPainful = () => {
    setProgress((previous) => ({
      ...previous,
      [current.exerciseId]: {
        ...(previous[current.exerciseId] ?? {
          exerciseId: current.exerciseId,
          setsDone: 0,
          pain: null,
          response: null,
          skipReason: null,
        }),
        response: 'painful',
      },
    }));
    setSkipFor('hurts');
  };

  return (
    <div className="player">
      <div className="row row-between">
        <div className="stack stack-sm" style={{ minWidth: 0 }}>
          <span className="eyebrow">
            {t('session.set', {
              n: Math.min(tick.setIndex + 1, current.sets),
              total: current.sets,
            })}
            {current.reps
              ? ` · ${t('session.rep', { n: tick.repIndex + 1, total: current.reps })}`
              : ''}
          </span>
          <h2>
            <PendingTranslation text={label.text} pending={label.pending} />
          </h2>
        </div>
        <span className="pill">
          {t('session.remaining', { n: Math.max(0, items.length - (tick.exerciseIndex + 1)) })}
        </span>
      </div>

      {skipped ? (
        <div className="notice notice-warn">
          <AlertTriangle size={16} />
          <span className="small">
            {t('session.why.' + (state?.skipReason ?? 'time'))} — {t('session.swapped')}
          </span>
        </div>
      ) : null}

      {faultId ? (
        <FaultSplit
          sex={sex}
          animation={animation}
          exerciseId={exercise.id}
          presentationId={presentationId}
          faultId={faultId}
          youLabel={t('session.you')}
          faultLabel={animation.faultTracks[0]?.label ?? t('session.mistakeLabel')}
          side={side}
          dose={{ sets: current.sets, reps: current.reps, holdSeconds: current.holdSeconds }}
          timeRef={clock.msRef}
          reducedMotion={reducedMotion}
          className="viewer-fill"
        />
      ) : (
        <Demonstrator
          sex={sex}
          animation={animation}
          exerciseId={exercise.id}
          presentationId={presentationId}
          side={side}
          cameraId={view}
          dose={{ sets: current.sets, reps: current.reps, holdSeconds: current.holdSeconds }}
          timeRef={clock.msRef}
          reducedMotion={reducedMotion}
          rigKey="session"
        />
      )}

      <StageControls
        view={view}
        onView={setView}
        fault={fault}
        onFault={() => setFault((value) => !value)}
        voice={voice}
        onVoice={() => setVoice((value) => !value)}
        canSpeak={speechAvailable()}
      />

      <DoseCard
        tick={tick}
        current={current}
        remaining={remaining}
        beat={beat}
        playing={playing}
        onToggle={() => setPlaying((value) => !value)}
        onRestart={clock.restart}
      />

      <CueList cues={animation.cues} index={cueIndex} />

      <PainPrompt pain={pain} onChange={setPain} />

      <div className="row">
        <Button
          variant="primary"
          block
          onClick={() => {
            if (tick.exerciseIndex + 1 >= items.length || allSettled) {
              onFinish(progress, Math.round((Date.now() - started.current) / 1000));
            } else {
              clock.nextExercise(tick.exerciseIndex + 1);
            }
          }}
          testid="session-next"
        >
          {tick.exerciseIndex + 1 >= items.length ? t('session.finish') : t('session.done')}
        </Button>
        <Button onClick={tooPainful} variant="danger">
          {t('session.painful')}
        </Button>
        <Button variant="quiet" onClick={() => setSkipFor(current.exerciseId)}>
          {t('session.skip')}
        </Button>
      </div>

      <SkipSheet open={skipFor !== null} onClose={() => setSkipFor(null)} onSkip={skip} />
    </div>
  );
}

function cueFor(cues: { t: number }[], t: number): number {
  let index = 0;
  for (let i = 0; i < cues.length; i++) if (cues[i].t <= t) index = i;
  return index;
}
