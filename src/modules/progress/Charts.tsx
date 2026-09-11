'use client';

/**
 * The trend, told in four parts: a pain line, a bar per week of sessions, the phase
 * history, and a replay of where the pain actually sat. Everything is drawn from the stored
 * logs — no placeholder chart, and the replay scrubs real sessions.
 */

import { useState } from 'react';
import { useI18n } from '@/lib/use-i18n';
import { regionById } from '@/lib/content';
import type { DailyLog, Journey } from '@/lib/types';
import { mapFrames, weeklyAdherence } from './progression';

export function Sparkline({ rows, height = 76 }: { rows: DailyLog[]; height?: number }) {
  if (rows.length < 2) {
    return <p className="xs muted">—</p>;
  }
  const width = 300;
  const step = width / (rows.length - 1);
  const y = (value: number) => height - (value / 10) * height;
  const points = rows.map((row, index) => `${(index * step).toFixed(1)},${y(row.pain).toFixed(1)}`);
  const first = rows[0].pain;
  const last = rows[rows.length - 1].pain;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label="pain trend · اتجاه الألم"
      data-testid="sparkline"
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={last <= first ? 'var(--color-ok)' : 'var(--color-clay)'}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <polyline
        points={`${points[points.length - 1]} ${width},${height}`}
        fill="none"
        stroke="transparent"
      />
      {rows.map((row, index) => (
        <circle
          key={row.date}
          cx={index * step}
          cy={y(row.pain)}
          r={2.6}
          fill="var(--color-sage-deep)"
        />
      ))}
    </svg>
  );
}

export function WeekBars({ journey }: { journey: Journey }) {
  const rows = weeklyAdherence(journey);
  const max = Math.max(1, ...rows.map((row) => row.sessions));
  return (
    <div
      className="row"
      style={{ alignItems: 'flex-end', gap: 6, height: 92 }}
      data-testid="week-bars"
    >
      {rows.map((row) => (
        <div key={row.week} className="stack stack-sm" style={{ flex: 1, alignItems: 'center' }}>
          <div
            style={{
              width: '100%',
              height: `${Math.max(4, (row.sessions / max) * 68)}px`,
              background: row.sessions ? 'var(--color-sage)' : 'var(--color-line)',
              borderRadius: 6,
            }}
            title={`${row.sessions} sessions · ${row.minutes} min`}
          />
          <span className="xs muted">W{row.week}</span>
        </div>
      ))}
    </div>
  );
}

export function PhaseTrack({ journey }: { journey: Journey }) {
  const { t } = useI18n();
  return (
    <div className="row" style={{ gap: 6 }}>
      {[1, 2, 3].map((phase) => (
        <span
          key={phase}
          className={`pill ${phase === journey.phase ? 'pill-sage' : ''}`}
          data-testid={`phase-${phase}`}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          {t('plan.phase', { n: phase })} · {t(`plan.phase${phase}`)}
        </span>
      ))}
    </div>
  );
}

/**
 * The pain map over time. Rendered as the 2D body rather than a 3D scene on purpose: it has
 * to be readable at a glance, and it has to work on the same devices the 3D tier does not.
 */
export function PainMapReplay({ journey }: { journey: Journey }) {
  const { t } = useI18n();
  const frames = mapFrames(journey);
  const [index, setIndex] = useState(frames.length ? frames.length - 1 : 0);
  if (!frames.length) return <p className="small muted">{t('progress.empty')}</p>;
  const frame = frames[Math.min(index, frames.length - 1)];
  const bounds = { x0: -0.4, x1: 0.4, y0: 0, y1: 1.75 };
  const project = (point: [number, number, number]) => ({
    cx: ((point[0] - bounds.x0) / (bounds.x1 - bounds.x0)) * 120,
    cy: (1 - (point[1] - bounds.y0) / (bounds.y1 - bounds.y0)) * 320,
  });
  return (
    <div className="stack stack-sm">
      <svg
        viewBox="0 0 120 320"
        width="100%"
        height={260}
        role="img"
        aria-label="pain map · خريطة الألم"
        data-testid="pain-map"
      >
        <rect x={0} y={0} width={120} height={320} fill="none" />
        <ellipse cx={60} cy={160} rx={34} ry={150} fill="var(--color-pale)" opacity={0.5} />
        <circle cx={60} cy={26} r={17} fill="var(--color-pale)" opacity={0.6} />
        {frame.pins.map((pin) => {
          const at = project(pin.point);
          const area = regionById.get(pin.regionId)?.areaMm2 ?? 20000;
          const r = Math.max(4, Math.min(13, Math.sqrt(area / 1000) * 2.2));
          const tone =
            pin.intensity >= 7
              ? 'var(--color-danger)'
              : pin.intensity >= 4
                ? 'var(--color-warn)'
                : 'var(--color-ok)';
          return (
            <g key={`${frame.date}-${pin.id}`}>
              <circle
                cx={at.cx}
                cy={at.cy}
                r={r}
                fill={tone}
                fillOpacity={0.32 + pin.intensity * 0.05}
              />
              <circle cx={at.cx} cy={at.cy} r={2.4} fill={tone} />
            </g>
          );
        })}
      </svg>
      <input
        type="range"
        min={0}
        max={frames.length - 1}
        value={Math.min(index, frames.length - 1)}
        onChange={(event) => setIndex(Number(event.target.value))}
        aria-label="session · الجلسة"
        data-testid="map-scrub"
      />
      <div className="row row-between">
        <span className="xs muted">
          {frame.date} ·{' '}
          {frame.pins.map((pin) => regionById.get(pin.regionId)?.label ?? pin.regionId).join(', ')}
        </span>
        <span className="pill xs">
          {t('progress.pain')} {frame.pain ?? '—'}
        </span>
      </div>
    </div>
  );
}
