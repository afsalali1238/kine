'use client';

/**
 * The confirm step of the body screen: the name of the spot you marked, its severity, the
 * neighbouring regions in case the marker landed one structure over, and the two ways out
 * (continue, or drag again). The empty state — a region the library cannot prescribe for
 * yet — is shown here too, because that is where a patient would otherwise get stuck.
 */

import { ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { regionById } from '@/lib/content';
import { useI18n } from '@/lib/use-i18n';
import { useJourney } from '@/state/journey';
import { useUi } from '@/state/ui';
import { Button, Card, PendingTranslation } from '@/ui';
import type { EmptyState, Pin, Region } from '@/lib/types';

export function ConfirmPanel({
  pins,
  activePin,
  activeRegion,
  nearby,
  label,
  empty,
}: {
  pins: Pin[];
  activePin: Pin | null;
  activeRegion: Region | null;
  nearby: (Region | undefined)[];
  label: { text: string; pending: boolean } | null;
  empty: EmptyState | null;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const journey = useJourney((state) => state.journey);
  const start = useJourney((state) => state.start);
  const chooseRegion = useJourney((state) => state.chooseRegion);
  const placePin = useJourney((state) => state.placePin);
  const setPinIntensity = useJourney((state) => state.setPinIntensity);
  const setStage = useUi((state) => state.setStage);
  const setSheet = useUi((state) => state.setSheet);

  return (
    <div className="stack">
      <Card
        eyebrow={t('stage.confirm')}
        title={
          label ? (
            <PendingTranslation text={label.text} pending={label.pending} />
          ) : (
            t('stage.explore')
          )
        }
      >
        {!pins.length ? (
          <p className="small">{t('body.dragPin')}</p>
        ) : (
          <div className="stack stack-sm">
            <p className="small">{t('stage.confirm')}</p>
            {activePin ? (
              <label className="row row-between">
                <span className="eyebrow">{t('body.intensity')}</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={activePin.intensity}
                  style={{ flex: 1, marginInlineStart: 10 }}
                  onChange={(event) => setPinIntensity(activePin.id, Number(event.target.value))}
                  data-testid="pin-intensity"
                />
                <b className="tnum">{activePin.intensity}</b>
              </label>
            ) : null}
            {nearby.length ? (
              <div className="row">
                <span className="eyebrow">nearby</span>
                {nearby.map((row) => (
                  <button
                    key={row!.id}
                    className="chip"
                    data-selected={row!.id === activeRegion?.id}
                    onClick={() => {
                      chooseRegion(row!.id);
                      placePin({
                        regionId: row!.id,
                        point: row!.centroid,
                        normal: [0, 0, 1],
                        intensity: journey?.intake?.pain ?? 4,
                      });
                    }}
                    data-testid={`nearby-${row!.id}`}
                  >
                    {lang === 'ar' ? (row!.labelAr ?? row!.label) : row!.label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="row">
              <Button
                variant="primary"
                onClick={() => {
                  setStage('intake');
                  router.push('/intake');
                }}
                testid="confirm-region"
              >
                {t('body.yes')}
                <ArrowRight size={16} />
              </Button>
              <Button onClick={() => setStage('pinpoint')}>{t('body.adjust')}</Button>
              <Button variant="quiet" onClick={() => setSheet('search')}>
                {t('body.somewhere')}
              </Button>
            </div>
          </div>
        )}

        {empty ? (
          <div className="notice notice-warn" data-testid="region-empty">
            <span className="eyebrow">
              <Sparkles size={13} /> {t('ui.nothing')}
            </span>
            <p className="small">
              <PendingTranslation
                text={empty.headline}
                pending={lang === 'ar' && !empty.headlineAr}
              />
            </p>
            <p className="xs">{empty.body}</p>
            {empty.seeAlso ? <p className="xs muted">{empty.seeAlso}</p> : null}
            {empty.redirectTo ? (
              <Button
                variant="quiet"
                onClick={() => {
                  chooseRegion(empty.redirectTo as string);
                  setStage('intake');
                  router.push('/intake');
                }}
                testid="redirect-region"
              >
                {regionById.get(empty.redirectTo ?? '')?.label ?? ''}
                <ArrowRight size={15} />
              </Button>
            ) : null}
          </div>
        ) : null}
      </Card>

      {!journey ? (
        <Card eyebrow="demo" title={t('ui.demo')} tone="pale">
          <p className="xs">{t('q.intake.intro')}</p>
          <Button
            variant="quiet"
            onClick={() => {
              start('male');
              setSheet(null);
            }}
          >
            {t('body.male')} / {t('body.female')}
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
