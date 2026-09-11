'use client';

/**
 * Understanding, in the amount a person will actually read on a phone: four short pain-science
 * readings plus what their own pattern means, and the traffic light restated where it is
 * used. No article list that leads to an empty page.
 */

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import { useJourney } from '@/state/journey';
import { useDerived } from '@/state/selectors';
import { PainSchool, PresentationEducation } from '@/modules/education';
import { TrafficRule } from '@/ui';

export default function LearnPage() {
  const journey = useJourney((state) => state.journey);
  const derived = useDerived(journey);
  const { t, lang } = useI18n();

  return (
    <div className="page cols cols-2">
      <div className="stack">
        <PainSchool />
      </div>
      <div className="stack">
        {derived.presentation ? (
          <PresentationEducation presentation={derived.presentation} compact />
        ) : (
          <Card eyebrow={t('learn.title')} title={t('explain.title')}>
            <p className="small">{t('progress.empty')}</p>
            <Link href="/body" className="btn btn-quiet" style={{ justifyContent: 'flex-start' }}>
              <ArrowLeft size={15} /> {t('nav.body')}
            </Link>
          </Card>
        )}
        <Card eyebrow={t('light.title')} className="card-tight">
          <TrafficRule lang={lang} />
        </Card>
      </div>
    </div>
  );
}
