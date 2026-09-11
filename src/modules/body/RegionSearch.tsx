'use client';

/**
 * Searchable region list: synonyms from the anatomy table, grouped by family, and a
 * "nothing for this spot yet" state that still moves the journey forward.
 */

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { regions } from '@/lib/content';
import { Sheet } from '@/ui';
import { useI18n } from '@/lib/use-i18n';
import { lookup } from '@/lib/i18n';

const FAMILY_ORDER = [
  'head-jaw',
  'neck',
  'shoulder',
  'upper-back',
  'chest',
  'trunk',
  'lower-back',
  'hip',
  'thigh',
  'knee',
  'lower-leg',
  'ankle',
  'foot',
  'elbow',
  'wrist',
];

export function RegionSearch({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (regionId: string) => void;
}) {
  const { lang, t } = useI18n();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const scored = regions
      .map((region) => {
        if (!needle) return { region, score: 1 };
        const label = region.label.toLowerCase();
        const arabic = region.labelAr ?? '';
        const synonym = region.synonyms.find((word) => word.toLowerCase().includes(needle));
        let score = 0;
        if (label.startsWith(needle)) score += 6;
        else if (label.includes(needle)) score += 4;
        if (synonym) score += 3;
        if (arabic && arabic.includes(needle)) score += 5;
        if (region.family.includes(needle)) score += 1;
        return { region, score };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.region.label.localeCompare(b.region.label));
    return needle ? scored.slice(0, 40) : scored;
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof regions>();
    for (const row of results) {
      const list = map.get(row.region.family) ?? [];
      list.push(row.region);
      map.set(row.region.family, list);
    }
    return [...map.entries()].sort(
      (a, b) => FAMILY_ORDER.indexOf(a[0]) - FAMILY_ORDER.indexOf(b[0]),
    );
  }, [results]);

  return (
    <Sheet open={open} onClose={onClose} title={t('body.searchPlaceholder')}>
      <label className="row row-tight">
        <Search size={16} />
        <input
          autoFocus
          type="text"
          value={query}
          placeholder={lookup('body.searchPlaceholder', lang)}
          onChange={(event) => setQuery(event.target.value)}
          data-testid="region-search-input"
        />
      </label>
      <div className="stack">
        {grouped.map(([family, list]) => (
          <div className="stack stack-sm" key={family}>
            <span className="eyebrow">{family.replace('-', ' ')}</span>
            <div className="row">
              {list.map((region) => (
                <button
                  key={region.id}
                  className="chip"
                  onClick={() => {
                    onPick(region.id);
                    onClose();
                  }}
                  data-testid={`region-${region.id}`}
                >
                  {lang === 'ar' && region.labelAr ? region.labelAr : region.label}
                  {lang === 'ar' && !region.labelAr ? (
                    <span className="pill pill-warn xs">{lookup('ui.pending', 'ar')}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
        {!grouped.length ? <p className="small muted">{t('ui.nothing')}</p> : null}
      </div>
    </Sheet>
  );
}
