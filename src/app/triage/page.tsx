'use client';

/**
 * The safety check, shown before anything else about the pattern. An urgent flag pauses
 * session launch — reading is allowed, exercising is not — and it stays on screen until the
 * patient acknowledges it. That is a product behaviour, not a banner.
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, PhoneCall } from 'lucide-react';
import { Button, Card } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import { useJourney } from '@/state/journey';
import { useUi } from '@/state/ui';
import { redFlags } from '@/modules/triage';
import { defaultIntake } from '@/modules/intake/questions';

export default function TriagePage() {
  const journey = useJourney((state) => state.journey);
  const setStage = useUi((state) => state.setStage);
  const { t } = useI18n();
  const router = useRouter();
  const flag = redFlags(journey?.intake ?? defaultIntake);

  useEffect(() => {
    if (flag) return;
    setStage('explain');
    router.replace('/explain');
  }, [flag, router, setStage]);

  // No answers yet means there is nothing to screen: say so instead of rendering a blank
  // frame while the redirect lands, so the route is never a dead end on a slow phone.
  if (!flag && !journey?.intake) {
    return (
      <div className="page" style={{ maxWidth: 620 }}>
        <Card eyebrow={t('nav.body')} title={t('stage.intake')} testid="needs-journey">
          <p className="small">{t('q.intake.intro')}</p>
          <Link href="/body" className="btn btn-primary">
            {t('nav.body')} <ArrowRight size={16} />
          </Link>
        </Card>
      </div>
    );
  }
  if (!flag) return null;
  const urgent = flag.level === 'urgent';

  return (
    <div className="page" style={{ maxWidth: 660 }}>
      <Card
        eyebrow={urgent ? t('triage.urgent.title') : t('triage.review.title')}
        title={urgent ? t('triage.urgent.title') : t('triage.review.title')}
      >
        <div
          className={`notice ${urgent ? 'notice-danger' : 'notice-warn'}`}
          role="status"
          data-testid="triage-message"
        >
          <div className="stack stack-sm">
            <p className="small">{t(flag.key)}</p>
            {urgent ? (
              <p className="xs">{t('triage.urgent.body')}</p>
            ) : (
              <p className="xs">{t('triage.review.body')}</p>
            )}
          </div>
        </div>
        <div className="row">
          <Button
            variant="primary"
            onClick={() => {
              setStage('explain');
              router.push('/explain');
            }}
            testid="triage-read"
          >
            {t('triage.read')}
            <ArrowRight size={16} />
          </Button>
          {urgent ? (
            <a className="btn btn-danger" href="tel:998" data-testid="triage-emergency">
              <PhoneCall size={15} /> {t('triage.emergency')}
            </a>
          ) : null}
          <Link href="/intake" className="btn btn-quiet">
            {t('triage.close')}
          </Link>
        </div>
        {urgent ? (
          <p className="xs muted" data-testid="session-blocked">
            {t('triage.urgent.body')}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
