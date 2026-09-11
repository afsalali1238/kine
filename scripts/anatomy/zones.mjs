/**
 * kinē — anatomical region catalogue (v2).
 *
 * Single source of truth for both the generated mesh (`_REGIONID` vertex channel)
 * and `src/data/regions.json`. A region cannot exist in one and not the other,
 * because both are written from this file by `scripts/build-body-assets.mjs`.
 *
 * Coordinate contract (see public/models/ASSET-SPEC.md):
 *   metres, Y up, feet at y=0, crown ~1.72, face toward +Z, subject's LEFT is +X.
 *
 * `side` for a paired region is the anatomical side of the person, not the viewer.
 * `views` lists the surfaces on which the region can be touched: front, back,
 * left, right, top, bottom. The 2D fallback and the search list use these.
 */

import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const read = (p) => JSON.parse(fs.readFileSync(path.join(HERE, p), 'utf8'));

/** Lifted to `data/arabic-labels.json` so the table is reviewed as data. */
export const AR = read('data/arabic-labels.json');

/** Lifted to `data/synonyms.json` so the table is reviewed as data. */
export const SYN = read('data/synonyms.json');

/**
 * The catalogue. `base` is the unpaired root id used for Arabic/synonym lookup and
 * for presentation retargeting; the emitted region id appends `-left` / `-right`
 * for paired entries.
 */
/** Lifted to `data/zones.json` so the table is reviewed as data. */
export const ZONES = read('data/zones.json');

/** English display labels, authored per base id. */
/** Lifted to `data/region-labels.json` so the table is reviewed as data. */
export const LABELS = read('data/region-labels.json');

/**
 * Expand the catalogue into flat region records with ids, labels, Arabic labels and
 * synonyms. Paired bases emit `<base>-left` and `<base>-right`.
 * @returns {object[]}
 */
export function expandZones() {
  const out = [];
  for (const zone of ZONES) {
    const label = LABELS[zone.base];
    const ar = AR[zone.base] ?? null;
    const syn = SYN[zone.base] ?? [];
    const emit = (id, side) =>
      out.push({
        id,
        base: zone.base,
        label: side === 'center' ? label : `${label}, ${side === 'left' ? 'left' : 'right'}`,
        labelAr:
          ar === null
            ? null
            : side === 'center'
              ? ar
              : `${ar} ${side === 'left' ? 'اليسرى' : 'اليمنى'}`,
        family: zone.family,
        side,
        views: zone.views,
        synonyms: side === 'center' ? syn : syn.map((s) => `${s} ${side}`),
        fallback: !!zone.fallback,
      });
    if (zone.side === 'paired') {
      emit(`${zone.base}-left`, 'left');
      emit(`${zone.base}-right`, 'right');
    } else {
      emit(zone.base, 'center');
    }
  }
  return out;
}

/** Ordered region ids — index + 1 becomes the `_REGIONID` vertex value. */
export function regionIds() {
  return expandZones().map((r) => r.id);
}
