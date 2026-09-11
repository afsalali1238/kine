'use client';

/**
 * Four short readings, migrated verbatim from v1, including the Arabic v1 already had
 * reviewed. They are chosen for the beliefs that get in the way of moving, not for length.
 */

import { useState } from 'react';
import { Card } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import { ARTICLES, READ_TIME_LABEL, type Article } from './articles';

export function PainSchool({ featured = 0 }: { featured?: number }) {
  const { lang, t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  const pick = (article: Article, index: number) => (
    <button
      className="card"
      key={article.id}
      onClick={() => setOpen(open === index ? null : index)}
      data-testid={`article-${article.id}`}
      style={{ textAlign: 'start' }}
    >
      <span className="eyebrow">
        {lang === 'ar' ? article.tagAr : article.tag} · {READ_TIME_LABEL}
      </span>
      <h3>{lang === 'ar' ? article.titleAr : article.title}</h3>
      {open === index ? (
        <p className="small">{lang === 'ar' ? article.bodyAr : article.body}</p>
      ) : null}
    </button>
  );
  const hero = ARTICLES[featured];
  return (
    <div className="stack">
      <Card
        eyebrow={lang === 'ar' ? hero.tagAr : hero.tag}
        title={lang === 'ar' ? hero.titleAr : hero.title}
      >
        <button
          className="btn btn-quiet"
          style={{ justifyContent: 'flex-start' }}
          onClick={() => setOpen(open === featured ? null : featured)}
          data-testid={`article-${hero.id}`}
        >
          {open === featured ? t('learn.close') : t('learn.read')}
        </button>
        {open === featured ? (
          <p className="small">{lang === 'ar' ? hero.bodyAr : hero.body}</p>
        ) : null}
      </Card>
      <Card eyebrow={t('learn.title')} title={t('learn.belief1')}>
        <p className="small">{t('learn.belief2')}</p>
        <div className="cols cols-2" style={{ marginTop: 4 }}>
          {ARTICLES.map((article, index) => (index === featured ? null : pick(article, index)))}
        </div>
      </Card>
    </div>
  );
}
