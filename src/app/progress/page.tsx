'use client';

/**
 * The trend, the review gate, and the two buttons the gate actually allows. Progression is a
 * decision about load, so it is stated as one: what is done, what the trend says, what the
 * next morning said — and only then, advance.
 */

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Download, RotateCcw, Sparkles, Upload } from 'lucide-react';
import { Button, Card, TrafficLight } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import { useJourney } from '@/state/journey';
import { useDerived, lightFor } from '@/state/selectors';
import { PainMapReplay, PhaseTrack, Sparkline, WeekBars } from '@/modules/progress';
import { exportJourney, importJourney } from '@/lib/persistence';
import { sampleJourney } from '@/state/demo';

export default function ProgressPage() {
  const journey = useJourney((state) => state.journey);
  const advance = useJourney((state) => state.advancePhase);
  const reset = useJourney((state) => state.reset);
  const loadDemo = useJourney((state) => state.loadDemo);
  const derived = useDerived(journey);
  const { t, lang } = useI18n();
  const [message, setMessage] = useState<string | null>(null);
  const gate = derived.gate;

  if (!journey) {
    return (
      <div className="page cols cols-2" style={{ maxWidth: 980 }}>
        <Card eyebrow={t('progress.title')} title={t('progress.empty')}>
          <div className="row">
            <Link href="/body" className="btn btn-primary">
              {t('nav.body')} <ArrowRight size={16} />
            </Link>
            <Button
              icon={<Sparkles size={15} />}
              onClick={() => {
                loadDemo(sampleJourney());
                setMessage(t('ui.demo'));
              }}
              testid="load-sample"
            >
              {t('ui.demo')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const adapt =
    gate.trend < -0.6
      ? t('progress.adding')
      : gate.trend > 1
        ? t('progress.reducing')
        : t('progress.holding');

  return (
    <div className="page cols cols-2">
      <div className="stack">
        <Card
          eyebrow={t('progress.pain')}
          title={t('progress.adapt', {
            from: journey.daily[0]?.pain ?? '—',
            to: journey.daily.at(-1)?.pain ?? '—',
            done: gate.doneInBlock,
            total: gate.need,
            change: adapt,
          })}
        >
          <Sparkline rows={journey.daily} />
          <div className="row row-between">
            <span className="xs muted">{t('progress.week')}</span>
            <TrafficLight tone={lightFor(journey)} lang={lang} />
          </div>
          <PhaseTrack journey={journey} />
        </Card>

        <Card eyebrow={t('progress.adherence')} title={`${gate.adherence}%`}>
          <WeekBars journey={journey} />
          <div className="meter" data-testid="adherence-meter">
            <i style={{ width: `${gate.adherence}%` }} />
          </div>
        </Card>

        <Card
          eyebrow={t('progress.map')}
          title={`${journey.sessions.length} ${t('progress.sessions') ?? ''}`.trim()}
        >
          <PainMapReplay journey={journey} />
        </Card>
      </div>

      <div className="stack">
        <Card
          eyebrow={t('progress.review')}
          title={t('progress.reviewBody', { done: gate.doneInBlock, need: gate.need })}
        >
          <div className="stack stack-sm">
            {gate.blockedReasons.length ? (
              gate.blockedReasons.map((reason) => (
                <p key={reason} className="small" data-testid="gate-reason">
                  · {t(reason)}
                </p>
              ))
            ) : (
              <p className="small" data-testid="gate-ready">
                {t('progress.advance', { n: Math.min(3, journey.phase + 1) })}
              </p>
            )}
          </div>
          <div className="row">
            <Button
              variant="primary"
              disabled={!gate.eligible}
              onClick={advance}
              testid="advance-phase"
            >
              {t('progress.advance', { n: Math.min(3, journey.phase + 1) })}
            </Button>
            <Button
              variant="quiet"
              onClick={() => setMessage(t('progress.hold'))}
              testid="hold-phase"
            >
              {t('progress.hold')}
            </Button>
          </div>
          {message ? (
            <p className="xs muted" role="status">
              {message}
            </p>
          ) : null}
        </Card>

        <Card eyebrow="data" title={t('ui.reset')} className="card-tight">
          <p className="xs muted">{t('learn.offline')}</p>
          <div className="row">
            <a
              className="btn"
              href={`data:application/json;charset=utf-8,${encodeURIComponent(exportJourney(journey))}`}
              download="kine-journey.json"
              data-testid="export-journey"
            >
              <Download size={15} /> JSON
            </a>
            <label className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Upload size={15} /> JSON
              <input
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    loadDemo(importJourney(text));
                    setMessage(t('checkin.saved'));
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : 'import failed');
                  }
                }}
                data-testid="import-journey"
              />
            </label>
            <Button
              variant="danger"
              icon={<RotateCcw size={15} />}
              onClick={() => {
                reset();
                setMessage(t('ui.reset'));
              }}
              testid="reset-journey"
            >
              {t('ui.reset')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
