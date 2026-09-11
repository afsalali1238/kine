/**
 * Small wrapper that turns journey pins into the highlight channel, so the locator and the
 * progress screen paint from one implementation.
 */

import { regionById, regions } from '@/lib/content';
import type { Pin } from '@/lib/types';
import { paintRegions, type PaintInput } from './skinMaterial';
import type { RegionIndex } from './regionPick';

const valueById = new Map(regions.map((region) => [region.id, region.regionIdValue]));

export const valueOfRegion = (id: string): number => valueById.get(id) ?? 0;

type Geometry = Parameters<typeof paintRegions>[0];

export function paintPins(
  geometry: Geometry,
  index: RegionIndex,
  pins: Pick<Pin, 'regionId' | 'intensity'>[],
  hoveredRegionId: string | null = null,
) {
  const toValues = (id: string): number[] =>
    (regionById.get(id)?.neighbours ?? []).map(valueOfRegion).filter((value) => value > 0);
  const list: PaintInput[] = pins.map((pin) => ({
    regionValue: valueOfRegion(pin.regionId),
    intensity: Math.max(0.12, Math.min(1, pin.intensity / 10)),
    neighbours: toValues(pin.regionId),
  }));
  if (hoveredRegionId) {
    list.push({
      regionValue: valueOfRegion(hoveredRegionId),
      intensity: 0.5,
      neighbours: toValues(hoveredRegionId),
    });
  }
  paintRegions(geometry, index, list);
}
