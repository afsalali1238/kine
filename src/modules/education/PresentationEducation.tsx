'use client';

/**
 * Education about *this* pattern: what it feels like, how it usually behaves, what helps,
 * and what to watch for. Written for a patient reading it once, on a phone, in pain.
 */

import { BookOpenCheck, Eye, Hourglass, Sparkles } from 'lucide-react';
import { Card } from '@/ui';
import { PendingTranslation } from '@/ui/PendingTranslation';
import { useI18n } from '@/lib/use-i18n';
import type { Presentation } from '@/lib/types';

export function watchFor(presentation: Presentation): string[] {
  const rows: string[] = [];
  if (presentation.nerveWatch) {
    rows.push(
      'Watch how far the tingling travels. If it moves further down the limb, or weakness grows, ' +
        'stop the session and get it looked at.',
    );
  }
  if (presentation.tendon) {
    rows.push(
      'Tendon pain usually tells you about the last 24 hours, not the injury. If it is settling ' +
        'by the next morning, the dose was probably right.',
    );
  }
  if (presentation.maxPhase !== null && presentation.maxPhase !== undefined) {
    rows.push(
      'Stiffness in every direction means strengthening is deliberately switched off for now. ' +
        'That is a protective choice, not a verdict on your shoulder.',
    );
  }
  if (presentation.lockPhases.length) {
    rows.push(
      'A joint that truly locks, catches or gives way needs an in-person assessment before load is added.',
    );
  }
  if (presentation.reviewSoon) {
    rows.push(
      'A few of your answers are worth checking in person. Reading this is fine; the plan stays ' +
        'gentle until someone has looked.',
    );
  }
  if (!rows.length) {
    rows.push(
      'Symptoms that stay above 4/10 for a whole day, a clearly worse morning, or any new ' +
        'numbness or weakness: ease off and get it looked at.',
    );
  }
  return rows;
}

export function PresentationEducation({
  presentation,
  compact = false,
}: {
  presentation: Presentation;
  compact?: boolean;
}) {
  const { lang, t, maybe } = useI18n();
  const name = maybe(presentation.name, presentation.nameAr);
  const rows = [
    { icon: BookOpenCheck, label: t('explain.title'), text: presentation.explanation },
    { icon: Hourglass, label: t('learn.course'), text: presentation.course },
    { icon: Sparkles, label: t('learn.helps'), text: presentation.helps },
  ];
  return (
    <div className="stack">
      <Card
        eyebrow={t('explain.title')}
        title={<PendingTranslation text={name.text} pending={name.pending} />}
      >
        <div className="stack">
          {rows.map((row) => (
            <div className="stack stack-sm" key={row.label}>
              <span className="eyebrow">
                <row.icon size={13} /> {row.label}
              </span>
              <p className={compact ? 'xs' : 'small'}>{row.text}</p>
            </div>
          ))}
          {presentation.cue ? (
            <div className="notice">
              <span className="small">{presentation.cue}</span>
            </div>
          ) : null}
        </div>
      </Card>
      <Card
        eyebrow={
          <>
            <Eye size={13} /> {t('learn.watch')}
          </>
        }
      >
        <ul className="stack stack-sm" style={{ paddingInlineStart: 18, margin: 0 }}>
          {watchFor(presentation).map((row) => (
            <li className="small muted" key={row}>
              {row}
            </li>
          ))}
        </ul>
        {lang === 'ar' ? (
          <p className="xs muted">
            {t('explain.fitNote')} <span className="pill pill-warn xs">{t('ui.pending')}</span>
          </p>
        ) : (
          <p className="xs muted">{t('explain.fitNote')}</p>
        )}
      </Card>
    </div>
  );
}
