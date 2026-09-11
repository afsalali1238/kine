'use client';

/**
 * The body workspace, and the entry point of the product.
 *
 * Three stages on one screen, so the figure never moves out from under the patient:
 *   select   — tap the body, or search a word
 *   pinpoint — drag the marker on the skin until it sits on the exact spot
 *   confirm  — is this exactly where it hurts? yes moves on, adjust goes back to dragging
 *
 * The 3D figure and the 2D fallback are the same page: only the renderer changes, so the
 * journey is identical on a phone that cannot open a WebGL context.
 */

import { useMemo, useState } from 'react';
import { PenLine, Search } from 'lucide-react';
import { BodyLocator, ConfirmPanel, PinStrip, RegionSearch, type PickResult } from '@/modules/body';
import { Button, Segmented, Sheet } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import { useJourney } from '@/state/journey';
import { useUi } from '@/state/ui';
import { findRegion, regionById } from '@/lib/content';

export default function BodyPage() {
  const journey = useJourney((state) => state.journey);
  const placePin = useJourney((state) => state.placePin);
  const movePin = useJourney((state) => state.movePin);
  const chooseRegion = useJourney((state) => state.chooseRegion);
  const setSex = useJourney((state) => state.setSex);
  const start = useJourney((state) => state.start);
  const stage = useUi((state) => state.stage);
  const setStage = useUi((state) => state.setStage);
  const sheet = useUi((state) => state.sheet);
  const setSheet = useUi((state) => state.setSheet);
  const reducedMotion = useUi((state) => state.reducedMotion);
  const { t, maybe } = useI18n();

  const pins = useMemo(() => journey?.pins ?? [], [journey]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<'front' | 'back'>('front');

  const region = useMemo(
    () => findRegion(pins[0]?.regionId ?? journey?.regionId ?? null),
    [pins, journey?.regionId],
  );
  const activePin = pins.find((pin) => pin.id === (activeId ?? pins[0]?.id)) ?? null;
  const activeRegion = findRegion(activePin?.regionId ?? null) ?? region;
  const empty = activeRegion?.emptyState ?? null;
  const label = activeRegion ? maybe(activeRegion.label, activeRegion.labelAr) : null;

  const ensure = () => {
    if (!journey) start('male');
  };

  const onPick = (result: PickResult) => {
    ensure();
    if (pins.length >= 5) {
      movePin(pins[0].id, result.point, result.normal);
      chooseRegion(result.regionId);
      setStage('confirm');
      return;
    }
    const id = placePin({ ...result, intensity: journey?.intake?.pain ?? 4 });
    setActiveId(id);
    setStage('confirm');
  };

  const onDragPin = (pinId: string, result: PickResult) => {
    movePin(pinId, result.point, result.normal);
    if (result.regionId !== activePin?.regionId) {
      chooseRegion(result.regionId);
    }
  };

  const nearby = region
    ? region.neighbours
        .map((id) => regionById.get(id))
        .filter(Boolean)
        .slice(0, 4)
    : [];

  return (
    <div className="page page-wide cols cols-2b">
      <div className="stack">
        <div className="row row-between">
          <Segmented
            ariaLabel="view"
            value={view}
            onChange={(value) => setView(value)}
            options={[
              { value: 'front', label: t('body.front') },
              { value: 'back', label: t('body.back') },
            ]}
          />
          <div className="row">
            <button
              className="btn btn-quiet"
              onClick={() => setSheet('help')}
              data-testid="open-help"
              aria-label={t('stage.explore')}
            >
              ?
            </button>
            <button
              className="btn btn-quiet"
              onClick={() => setSheet('search')}
              data-testid="open-search"
            >
              <Search size={15} />
              {t('body.cantFind')}
            </button>
            <Segmented
              ariaLabel="model"
              value={journey?.sex ?? 'male'}
              onChange={(value) => {
                ensure();
                setSex(value);
              }}
              options={[
                { value: 'male', label: t('body.male') },
                { value: 'female', label: t('body.female') },
              ]}
            />
          </div>
        </div>

        <div className="viewer viewer-fill" style={{ minHeight: 420 }}>
          <BodyLocator
            sex={journey?.sex ?? 'male'}
            pins={pins}
            mode={stage === 'pinpoint' ? 'pinpoint' : 'confirm'}
            view={view}
            activePinId={activePin?.id ?? null}
            focusRegionId={activeRegion?.id ?? null}
            onPick={onPick}
            onDragPin={onDragPin}
            onSelectPin={(id) => {
              setActiveId(id);
              setStage('pinpoint');
            }}
            onPickRegion={(regionId) => {
              ensure();
              placePin({
                regionId,
                point: regionById.get(regionId)?.centroid ?? [0, 1, 0],
                normal: [0, 0, 1],
                intensity: journey?.intake?.pain ?? 4,
              });
              chooseRegion(regionId);
              setStage('confirm');
            }}
            reducedMotion={reducedMotion}
          />
          <div className="viewer-overlay">
            <div className="row row-between">
              <span className="pill" data-testid="stage-label">
                <PenLine size={13} /> {t(`stage.${stage === 'explore' ? 'select' : stage}`)}
              </span>
              {stage === 'pinpoint' ? (
                <button className="btn btn-quiet xs" onClick={() => setStage('confirm')}>
                  {t('body.dragPin')}
                </button>
              ) : null}
            </div>
            <p className="hint" data-testid="orbit-hint">
              {t('body.orbit')}
            </p>
          </div>
        </div>

        <PinStrip
          pins={pins}
          activeId={activeId}
          onSelect={(id) => {
            setActiveId(id);
            setStage('pinpoint');
          }}
        />
      </div>

      <ConfirmPanel
        pins={pins}
        activePin={activePin}
        activeRegion={activeRegion ?? null}
        nearby={nearby}
        label={label}
        empty={empty}
      />

      <RegionSearch
        open={sheet === 'search'}
        onClose={() => setSheet(null)}
        onPick={(regionId) => {
          ensure();
          const row = findRegion(regionId);
          if (!row) return;
          placePin({
            regionId,
            point: row.centroid,
            normal: [0, 0, 1],
            intensity: journey?.intake?.pain ?? 4,
          });
          chooseRegion(regionId);
          setStage('confirm');
          setSheet(null);
        }}
      />
      <Sheet open={sheet === 'help'} onClose={() => setSheet(null)} title={t('body.cantFind')}>
        <div className="stack stack-sm">
          <p className="small">{t('body.dragPin')}</p>
          <p className="xs muted">{t('body.pins', { n: pins.length })}</p>
          <Button variant="quiet" onClick={() => setSheet('search')}>
            <Search size={15} /> {t('body.searchPlaceholder')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
