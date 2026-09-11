'use client';

/**
 * The four-number check: what the coach said this second, how it felt, and the honest way
 * out. A skip is a clinical response, not a failure state — the sheet records a reason so
 * the swap logic can offer an easier variant or take the exercise out of the session.
 *
 * Split out of `SessionPlayer` so the player stays the sequencer (C2).
 */

import { Card, PendingTranslation, Sheet, TrafficLight, TrafficRule } from '@/ui';
import { useI18n } from '@/lib/use-i18n';

/** Reasons a patient can give for skipping a movement, in the order they are offered. */
export const SKIP_REASONS = ['hurts', 'position', 'equipment', 'time'] as const;
export type SkipReason = (typeof SKIP_REASONS)[number];

/** The authored cue strip, with the live cue marked. */
export function CueList({
  cues,
  index,
}: {
  cues: { t: number; cue: string; cueAr: string | null }[];
  index: number;
}) {
  const { t, lang } = useI18n();
  return (
    <Card eyebrow={t('session.cues')} className="card-tight">
      {cues.map((row, i) => (
        <p key={row.cue} className={i === index ? 'small' : 'xs muted'}>
          {i === index ? '▸ ' : ''}
          {lang === 'ar' ? (row.cueAr ?? <PendingTranslation text={row.cue} pending />) : row.cue}
        </p>
      ))}
    </Card>
  );
}

/** Pain during the movement, graded against the same traffic light as everything else. */
export function PainPrompt({
  pain,
  onChange,
}: {
  pain: number | null;
  onChange: (value: number) => void;
}) {
  const { t, lang } = useI18n();
  return (
    <Card eyebrow={t('session.painPrompt')} className="card-tight">
      <input
        type="range"
        min={0}
        max={10}
        value={pain ?? 0}
        onChange={(event) => onChange(Number(event.target.value))}
        data-testid="session-pain"
        aria-label="pain · الألم"
      />
      <div className="row row-between">
        <TrafficLight tone={pain === null ? 'amber' : pain > 4 ? 'red' : 'green'} lang={lang} />
        <span className="big-count" style={{ fontSize: 22 }}>
          {pain ?? '—'}
        </span>
      </div>
      <TrafficRule lang={lang} />
    </Card>
  );
}

/** The skip sheet: one reason per row, all of them actionable. */
export function SkipSheet({
  open,
  onClose,
  onSkip,
}: {
  open: boolean;
  onClose: () => void;
  onSkip: (reason: SkipReason) => void;
}) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onClose={onClose} title={t('session.skip')}>
      <div className="stack">
        {SKIP_REASONS.map((reason) => (
          <button
            key={reason}
            className="option"
            onClick={() => onSkip(reason)}
            data-testid={`skip-${reason}`}
          >
            <span className="radio" />
            <span>
              <strong>{t(`session.why.${reason}`)}</strong>
              <small>{reason === 'hurts' ? t('session.swapped') : t('session.offered')}</small>
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
