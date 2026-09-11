'use client';

/**
 * The reasoning made legible: the ranked patterns, the fit score with the answers that
 * produced it, and two ways out — take the next possibility, or go back and change the
 * movement answers. A score is a pattern fit, and the card says so in the sentence, not in
 * a footnote.
 */

import { ChevronRight, Shuffle } from 'lucide-react';
import { Button, Card, PendingTranslation } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import { movementLabel } from '@/modules/intake';
import { CONFIDENCE_LABEL, type Scored } from '@/modules/triage';

const EYEBROW: Record<Scored['confidence'], string> = {
  strong: 'Stronger pattern match',
  possible: 'Possible pattern match',
  early: 'Early pattern match',
};

export function EvidenceRow({ item }: { item: Scored }) {
  const { lang } = useI18n();
  if (!item.evidence.length) {
    return (
      <p className="xs muted">
        {lang === 'ar'
          ? 'لا توجد إجابات مرجِّحة بعد.'
          : 'No answers are pushing this one up or down yet.'}
      </p>
    );
  }
  return (
    <ul className="row" style={{ gap: 6, listStyle: 'none', padding: 0, margin: 0 }}>
      {item.evidence.map((row, index) => (
        <li
          key={`${row.type}-${row.key}-${index}`}
          className={`pill ${row.delta < 0 ? 'pill-danger' : 'pill-sage'}`}
          style={{ fontWeight: 500 }}
        >
          {row.type === 'worse'
            ? `${lang === 'ar' ? 'يزيد' : 'worse with'}: ${movementLabel(row.key, lang)}`
            : row.type === 'eases'
              ? `${lang === 'ar' ? 'يريح' : 'eased by'}: ${movementLabel(row.key, lang)}`
              : row.type === 'neuro'
                ? `${lang === 'ar' ? 'أعراض عصبية' : 'nerve symptoms'}`
                : row.type === 'onset'
                  ? `${lang === 'ar' ? 'البداية' : 'onset'}`
                  : row.type === 'pattern'
                    ? `${lang === 'ar' ? 'نمط اليوم' : 'day pattern'}`
                    : row.type === 'affinity'
                      ? `${lang === 'ar' ? 'موضع العلامة' : 'marker position'}`
                      : `${lang === 'ar' ? 'موضع مُدرج' : 'listed site'}`}
          <span
            className="tnum"
            style={{ color: row.delta < 0 ? 'var(--color-danger)' : 'var(--color-sage-deep)' }}
          >
            {row.delta > 0 ? `+${row.delta}` : row.delta}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ExplainCard({
  items,
  chosenId,
  onChoose,
  onReject,
  onRerank,
  onBackToIntake,
}: {
  items: Scored[];
  chosenId: string | null;
  onChoose: (id: string) => void;
  onReject: (id: string) => void;
  onRerank: () => void;
  onBackToIntake: () => void;
}) {
  const { t, lang, maybe } = useI18n();
  const [top, ...rest] = items;
  if (!top) {
    return (
      <Card eyebrow={t('explain.title')} title={t('ui.nothing')}>
        <p className="small">{t('body.cantFind')}</p>
        <Button onClick={onBackToIntake} variant="primary">
          {t('q.back')}
          <ChevronRight size={16} />
        </Button>
      </Card>
    );
  }
  const name = maybe(top.presentation.name, top.presentation.nameAr);
  return (
    <div className="stack">
      <Card
        eyebrow={
          <>
            <span className="live-dot" /> {EYEBROW[top.confidence]} · {t('explain.fit')}{' '}
            <span className="tnum">{top.score}</span>
          </>
        }
        title={<PendingTranslation text={name.text} pending={name.pending} />}
        actions={
          chosenId === top.presentation.id ? (
            <span className="pill pill-sage">{t('checkin.saved')}</span>
          ) : null
        }
      >
        <p className="small">
          <PendingTranslation text={top.presentation.explanation} pending={lang === 'ar'} />
        </p>
        <details>
          <summary>{t('plan.why')}</summary>
          <EvidenceRow item={top} />
          <p className="xs muted">{t('explain.fitNote')}</p>
        </details>
        <div className="row">
          <Button
            variant="primary"
            onClick={() => onChoose(top.presentation.id)}
            testid="choose-pattern"
          >
            {t('explain.start')}
            <ChevronRight size={16} />
          </Button>
          <Button
            variant="quiet"
            onClick={() => onReject(top.presentation.id)}
            testid="reject-pattern"
          >
            {t('explain.notLikeMe')}
          </Button>
        </div>
      </Card>

      {rest.length ? (
        <Card eyebrow={t('explain.secondary')}>
          <div className="stack stack-sm">
            {rest.slice(0, 3).map((item) => {
              const alt = maybe(item.presentation.name, item.presentation.nameAr);
              return (
                <div className="row row-between" key={item.presentation.id}>
                  <div className="stack stack-sm">
                    <strong className="small">
                      <PendingTranslation text={alt.text} pending={alt.pending} />
                    </strong>
                    <span className="xs muted">
                      {t('explain.fit')} <span className="tnum">{item.score}</span>
                    </span>
                  </div>
                  <Button variant="quiet" onClick={() => onChoose(item.presentation.id)}>
                    {t('q.next')}
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="row">
            <Button onClick={onRerank} icon={<Shuffle size={15} />}>
              {t('explain.rerank')}
            </Button>
            <Button variant="quiet" onClick={onBackToIntake}>
              {t('explain.backToQuestions')}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export const CONFIDENCE = CONFIDENCE_LABEL;
