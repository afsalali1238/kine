'use client';

/**
 * The printable plan. Four exercises, one line of dose each, three frames per movement
 * drawn from the same keyframes the figure performs, and the traffic light at the foot of
 * every page. It is built from the store, so what is printed is what is prescribed — and if
 * the dose was cut, the cut is what prints.
 */

import { Card } from '@/ui';
import { PendingTranslation } from '@/ui/PendingTranslation';
import { useI18n } from '@/lib/use-i18n';
import { animationFor, findExercise, findPresentation, regionById } from '@/lib/content';
import { tempoLabel, type ProgrammeItem } from '@/modules/programme';
import { FrameStrip } from '@/modules/demonstrator';
import { lookup } from '@/lib/i18n';
import type { Journey } from '@/lib/types';

export function HandoutDoc({ journey, items }: { journey: Journey; items: ProgrammeItem[] }) {
  const { lang, t, maybe } = useI18n();
  const presentation = findPresentation(journey.presentationId);
  const region = regionById.get(journey.pins[0]?.regionId ?? journey.regionId ?? '');
  // The same derived programme the plan screen showed, passed in rather than re-derived or
  // re-stored: what prints is what was prescribed, including any dose cut.
  const rows = items;
  return (
    <div className="handout" data-testid="handout-doc">
      <header className="stack stack-sm">
        <span className="eyebrow">kinē · {t('handout.title')}</span>
        <h1 style={{ fontSize: 26 }}>
          {presentation ? maybe(presentation.name, presentation.nameAr).text : t('plan.title')}
        </h1>
        <p className="small" style={{ color: '#5b6152' }}>
          {region ? `${lang === 'ar' ? (region.labelAr ?? region.label) : region.label}` : ''} ·{' '}
          {t('plan.phase', { n: journey.phase })} ·{' '}
          {journey.daily.length
            ? `${t('progress.pain')} ${journey.daily.at(-1)?.pain ?? '—'}/10`
            : ''}
          {journey.goal ? ` · ${journey.goal}` : ''}
        </p>
      </header>

      {!rows.length ? (
        <Card>
          <p className="small">{t('progress.empty')}</p>
        </Card>
      ) : null}

      {rows.map((row, index) => {
        const exercise = findExercise(row.exerciseId);
        const animation = exercise ? animationFor(exercise.id) : undefined;
        if (!exercise) return null;
        const name = maybe(exercise.name, exercise.nameAr);
        return (
          <section className="handout-ex" key={exercise.id}>
            <span className="eyebrow">
              {index + 1} · {exercise.type.replace('_', ' ')}
            </span>
            <h2 style={{ fontSize: 19 }}>
              <PendingTranslation text={name.text} pending={name.pending} />
            </h2>
            <p className="small" style={{ color: '#41473c' }}>
              {row.holdSeconds
                ? t('handout.hold', { sets: row.sets, seconds: row.holdSeconds })
                : t('handout.dose', { sets: row.sets, reps: row.reps ?? 6 })}{' '}
              · {tempoLabel(exercise.tempo)} ·{' '}
              {exercise.equipment === 'none' ? t('learn.noEquipment') : exercise.equipment} ·{' '}
              {t('plan.frequency', { n: exercise.frequencyPerWeek })}
            </p>
            {animation ? (
              <>
                <FrameStrip
                  animation={animation}
                  view="side"
                  height={130}
                  labels={[
                    lookup('handout.frame1', lang),
                    lookup('handout.frame2', lang),
                    lookup('handout.frame3', lang),
                  ]}
                />
              </>
            ) : null}
            <ol className="small" style={{ paddingInlineStart: 18, margin: '4px 0' }}>
              {exercise.cues.map((cue) => (
                <li key={cue}>{cue}</li>
              ))}
            </ol>
            {exercise.commonMistakes.length ? (
              <p className="xs" style={{ color: '#7a5a35' }}>
                <strong>{t('session.mistakeLabel')}:</strong> {exercise.commonMistakes[0]}
              </p>
            ) : null}
          </section>
        );
      })}

      <footer className="handout-ex">
        <span className="eyebrow">{t('light.title')}</span>
        <p className="small" style={{ color: '#41473c' }}>
          🟢 {lookup('light.during', lang)} 🟡 {lookup('light.settle', lang)} 🔴{' '}
          {lookup('light.morning', lang)}
        </p>
        <p className="xs" style={{ color: '#5b6152' }}>
          {t('handout.foot')}
        </p>
        <p className="xs" style={{ color: '#7b7f74' }}>
          {t('ui.internal')}
        </p>
      </footer>
    </div>
  );
}
