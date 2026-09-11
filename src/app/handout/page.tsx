'use client';

/**
 * The print view. Same store, same dose, same frames as the animated figure — and a toolbar
 * that disappears on paper.
 */

import { Printer } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import { useJourney } from '@/state/journey';
import { useDerived } from '@/state/selectors';
import { HandoutDoc } from '@/modules/handout';

export default function HandoutPage() {
  const journey = useJourney((state) => state.journey);
  const derived = useDerived(journey);
  const { t } = useI18n();

  return (
    <div className="page" style={{ maxWidth: 900, padding: 0 }}>
      <div
        className="row row-between no-print"
        style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-line)' }}
      >
        <Link href="/plan" className="btn btn-quiet">
          {t('plan.title')}
        </Link>
        <Button
          variant="primary"
          icon={<Printer size={15} />}
          onClick={() => window.print()}
          testid="print"
        >
          {t('handout.print')}
        </Button>
      </div>
      {journey ? (
        <HandoutDoc journey={journey} items={derived.programme?.items ?? []} />
      ) : (
        <div style={{ padding: 16 }}>
          <p className="small">{t('progress.empty')}</p>
        </div>
      )}
    </div>
  );
}
