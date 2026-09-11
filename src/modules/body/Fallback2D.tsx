'use client';

/**
 * The 2D tier of the body picker. Used when WebGL is unavailable, when the GLB fails to
 * load, and whenever the patient prefers a flat map. It is the same data: region ids,
 * measured anchors, the same five-pin model, the same pain intensities — so a journey
 * started on the 2D map continues identically in 3D.
 */

import { useMemo, useRef, useState } from 'react';
import { regionById, regions } from '@/lib/content';
import { anchorFor, box, outlinePath, projectX, projectY } from './silhouette';
import type { Pin } from '@/lib/types';

type Props = {
  sex: 'male' | 'female';
  view: 'front' | 'back';
  pins: Pin[];
  activePinId: string | null;
  hoveredRegion: string | null;
  onPickRegion: (regionId: string) => void;
  onHoverRegion?: (regionId: string | null) => void;
  height?: number;
};

const VISIBLE = { front: 'front', back: 'back' } as const;

export function Fallback2D({
  sex,
  view,
  pins,
  activePinId,
  hoveredRegion,
  onPickRegion,
  onHoverRegion,
  height = 520,
}: Props) {
  const b = useMemo(() => box(sex, height), [sex, height]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const dragging = useRef(false);

  const anchors = useMemo(() => {
    const rows = regions
      .filter((region) => region.views.includes(VISIBLE[view]))
      .map((region) => {
        const at = anchorFor(region.id, view, b);
        return at ? { region, at } : null;
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    return rows;
  }, [b, view]);

  const nearest = (event: React.PointerEvent): string | null => {
    const element = svgRef.current;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const scale = b.height / rect.height;
    const x = (event.clientX - rect.left) * scale;
    const y = (event.clientY - rect.top) * scale;
    let best: { id: string; distance: number } | null = null;
    for (const row of anchors) {
      const distance = Math.hypot(row.at.x - x, row.at.y - y);
      const reach = Math.max(row.at.r + 14, 26 / 1);
      if (distance < reach && (!best || distance < best.distance)) {
        best = { id: row.region.id, distance };
      }
    }
    return best?.id ?? null;
  };

  const pinFor = (regionId: string) => pins.find((pin) => pin.regionId === regionId);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${b.width.toFixed(1)} ${b.height}`}
      width="100%"
      height={height}
      role="img"
      aria-label="body map"
      style={{ touchAction: 'none', direction: 'ltr' }}
      data-testid="fallback-2d"
      onPointerDown={(event) => {
        dragging.current = true;
        const hit = nearest(event);
        if (hit) onPickRegion(hit);
      }}
      onPointerMove={(event) => {
        if (!dragging.current) return;
        const hit = nearest(event);
        setPreview(hit);
        onHoverRegion?.(hit);
      }}
      onPointerUp={() => {
        dragging.current = false;
        if (preview) onPickRegion(preview);
        setPreview(null);
        onHoverRegion?.(null);
      }}
      onPointerCancel={() => {
        dragging.current = false;
        setPreview(null);
      }}
    >
      <defs>
        <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0e3d4" />
          <stop offset="55%" stopColor="#e7d5c2" />
          <stop offset="100%" stopColor="#dcc7b1" />
        </linearGradient>
        <radialGradient id="shade" cx="42%" cy="34%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#8a7a68" stopOpacity="0.22" />
        </radialGradient>
      </defs>
      <path d={outlinePath(view, b)} fill="url(#skin)" stroke="#c9bda9" strokeWidth={1} />
      <path d={outlinePath(view, b)} fill="url(#shade)" />
      {anchors.map(({ region, at }) => {
        const pin = pinFor(region.id);
        const isHot = hoveredRegion === region.id || preview === region.id;
        return (
          <g key={region.id}>
            <circle
              cx={at.x}
              cy={at.y}
              r={Math.max(at.r, 11)}
              fill={
                pin
                  ? pin.intensity >= 7
                    ? '#a2402b'
                    : pin.intensity >= 4
                      ? '#b8842a'
                      : '#5c7f52'
                  : isHot
                    ? '#778f66'
                    : '#9a9c8c'
              }
              fillOpacity={pin ? 0.5 : isHot ? 0.24 : 0.07}
              stroke={pin || isHot ? '#4d5c40' : '#b8b3a4'}
              strokeOpacity={pin || isHot ? 0.75 : 0.28}
              strokeWidth={pin || isHot ? 1.4 : 0.8}
              data-testid={`anchor-${region.id}`}
            />
            <circle
              cx={at.x}
              cy={at.y}
              r={Math.max(at.r + 12, 22)}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onPointerEnter={() => onHoverRegion?.(region.id)}
              onPointerLeave={() => onHoverRegion?.(null)}
              onClick={() => onPickRegion(region.id)}
            />
            {activePinId && pin ? (
              <text
                x={at.x + Math.max(at.r, 11) + 6}
                y={at.y + 4}
                fontSize={13}
                fill="#4d5c40"
                style={{ paintOrder: 'stroke', stroke: '#f6f4ee', strokeWidth: 4 }}
              >
                {regionById.get(pin.regionId)?.label ?? ''}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Model-space point to the 2D projection, so a 3D pin can be shown on the flat map too. */
export function pointTo2D(
  point: [number, number, number],
  sex: 'male' | 'female',
  view: 'front' | 'back',
  height = 520,
) {
  const b = box(sex, height);
  return { x: projectX(view === 'back' ? -point[0] : point[0], b), y: projectY(point[1], b) };
}
