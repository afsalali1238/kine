'use client';

/**
 * The row of placed pins. Tapping a chip re-selects it for dragging; the × removes it.
 * Severity lives in the confirm panel, because the number belongs next to the question
 * "is this exactly where it hurts?".
 */

import { X } from 'lucide-react';
import { regionById } from '@/lib/content';
import { useI18n } from '@/lib/use-i18n';
import { useJourney } from '@/state/journey';
import type { Pin } from '@/lib/types';

export function PinStrip({
  pins,
  activeId,
  onSelect,
}: {
  pins: Pin[];
  activeId: string | null;
  onSelect: (pinId: string) => void;
}) {
  const { lang } = useI18n();
  const removePin = useJourney((state) => state.removePin);
  if (!pins.length) return null;
  return (
    <div className="row" data-testid="pin-strip">
      {pins.map((pin, index) => {
        const row = regionById.get(pin.regionId);
        return (
          <button
            key={pin.id}
            className="chip"
            data-selected={(activeId ?? pins[0].id) === pin.id}
            onClick={() => onSelect(pin.id)}
            data-testid={`pin-chip-${index}`}
          >
            {row ? (lang === 'ar' ? (row.labelAr ?? row.label) : row.label) : pin.regionId}
            <span className="tnum muted xs">{pin.intensity}/10</span>
            <X
              size={13}
              onClick={(event) => {
                event.stopPropagation();
                removePin(pin.id);
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
