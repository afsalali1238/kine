/**
 * Region index over the shipped geometry: which vertices belong to which `_REGIONID`
 * value. Built once per geometry so painting a region is a bounded typed-array write
 * instead of a shader lookup, and so the neighbour falloff can be applied per vertex.
 */

import { regions } from '@/lib/content';
import { bindRegionIndex } from './picker-types';

bindRegionIndex(regions.map((region) => ({ id: region.id, regionIdValue: region.regionIdValue })));

type GeometryLike = {
  getAttribute(name: string): { array: ArrayLike<number> } | undefined;
};

export type RegionIndex = {
  lists: Map<number, Int32Array>;
  total: number;
};

export function buildRegionIndex(geometry: GeometryLike): RegionIndex {
  const ids = geometry.getAttribute('_regionid') ?? geometry.getAttribute('_REGIONID');
  const buckets = new Map<number, number[]>();
  if (!ids) return { lists: new Map(), total: 0 };
  const array = ids.array;
  for (let i = 0; i < array.length; i++) {
    const value = array[i];
    const bucket = buckets.get(value);
    if (bucket) bucket.push(i);
    else buckets.set(value, [i]);
  }
  return {
    lists: new Map([...buckets].map(([key, rows]) => [key, Int32Array.from(rows)])),
    total: array.length,
  };
}
