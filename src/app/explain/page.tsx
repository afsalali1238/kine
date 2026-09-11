'use client';

/**
 * What the answers look like, said plainly: the ranked patterns, the evidence behind the top
 * one, and two exits that both lead somewhere real — take the next possibility, or go back
 * and change the movement answers. A guidance-only pattern is not a dead end either: the
 * next startable pattern is offered, with its programme.
 */

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button, Card } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import { useJourney } from '@/state/journey';
import { useUi } from '@/state/ui';
import { useDerived } from '@/state/selectors';
import { ExplainCard } from '@/modules/reasoning';
import { PresentationEducation } from '@/modules/education';
import { redFlags } from '@/modules/triage';
import { defaultIntake } from '@/modules/intake';

export default function ExplainPage() {
  const journey = useJourney((state) => state.journey);
  const accept = useJourney((state) => state.acceptPresentation);
  const reject = useJourney((state) => state.rejectPresentation);
  const setStage = useUi((state) => state.setStage);
  const setStep = useUi((state) => state.setStep);
  const derived = useDerived(journey);
  const { t } = useI18n();
  const router = useRouter();
  const flag = redFlags(journey?.intake ?? defaultIntake);
  const blocked = flag?.level === 'urgent';

  useEffect(() => {
    setStage('explain');
  }, [setStage]);

  const choose = (id: string) => {
    accept(id);
    router.push('/plan');
  };

  if (!journey || !derived.region) {
    return (
      <div className="page">
        <Card eyebrow={t('nav.body')} title={t('stage.explore')} testid="needs-journey">
          <Link href="/body" className="btn btn-primary">
            {t('nav.body')} <ArrowRight size={16} />
          </Link>
        </Card>
      </div>
    );
  }

  const top = derived.matches[0];
  const guidanceOnly = top?.presentation.guidanceOnly && !derived.startable;

  return (
    <div className="page cols cols-2">
      <div className="stack">
        {blocked ? (
          <div className="notice notice-danger" role="status" data-testid="explain-blocked">
            <div className="stack stack-sm">
              <strong className="small">{t('triage.urgent.title')}</strong>
              <span className="xs">{t('triage.urgent.body')}</span>
              <Link
                href="/triage"
                className="btn btn-quiet"
                style={{ justifyContent: 'flex-start' }}
              >
                {t('triage.read')}
              </Link>
            </div>
          </div>
        ) : null}
        {!derived.matches.length ? (
          <Card eyebrow={t('explain.title')} title={t('ui.nothing')}>
            <p className="small">{t('q.movements.label')}</p>
            <Button
              variant="primary"
              onClick={() => {
                setStep(4);
                router.push('/intake');
              }}
            >
              {t('explain.backToQuestions')}
            </Button>
          </Card>
        ) : (
          <ExplainCard
            items={derived.matches}
            chosenId={journey.presentationId}
            onChoose={choose}
            onReject={reject}
            onRerank={() => {
              if (top) reject(top.presentation.id);
            }}
            onBackToIntake={() => {
              setStep(4);
              router.push('/intake');
            }}
          />
        )}
      </div>

      <div className="stack">
        {guidanceOnly && top ? (
          <Card eyebrow={t('triage.review.title')} title={t('explain.notLikeMe')}>
            <p className="small">{t('triage.review.body')}</p>
            {derived.startable ? (
              <Button
                variant="primary"
                onClick={() => choose(derived.startable!.presentation.id)}
                testid="take-next-pattern"
              >
                {derived.startable.presentation.name}
                <ArrowRight size={16} />
              </Button>
            ) : (
              <Button variant="quiet" onClick={() => router.push('/learn')}>
                {t('learn.title')}
                <ArrowRight size={15} />
              </Button>
            )}
          </Card>
        ) : null}
        {(derived.startable ?? top) ? (
          <PresentationEducation presentation={(derived.startable ?? top)!.presentation} />
        ) : null}
      </div>
    </div>
  );
}
