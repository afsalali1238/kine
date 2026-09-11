/**
 * Content contract. These are the invariants the build script is supposed to guarantee; the
 * test exists so a future edit to a JSON file or a generator fails loudly instead of shipping
 * a body map with holes in it.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  animations,
  exerciseById,
  exercises,
  presentationById,
  presentations,
  regionById,
  regions,
  rules,
} from '@/lib/content';
import { assertAnimationsInRange, capExceedances } from '@/modules/animation';

const v1Exercises = JSON.parse(
  readFileSync(new URL('../src/data/v1/exercises.json', import.meta.url), 'utf8'),
) as { id: string; cues: string[] }[];
const v1Presentations = JSON.parse(
  readFileSync(new URL('../src/data/v1/presentations.json', import.meta.url), 'utf8'),
) as { id: string; name: string; nameAr?: string | null }[];

describe('content size and identity', () => {
  it('carries every migrated exercise', () => {
    expect(exercises.length).toBe(136);
    expect(new Set(exercises.map((row) => row.id)).size).toBe(exercises.length);
  });

  it('has at least 70 regions with unique, contiguous ids', () => {
    expect(regions.length).toBeGreaterThanOrEqual(70);
    const values = regions.map((row) => row.regionIdValue).sort((a, b) => a - b);
    expect(values[0]).toBe(1);
    expect(values[values.length - 1]).toBe(regions.length);
    expect(new Set(values).size).toBe(regions.length);
  });

  it('pairs every left region with a right one', () => {
    const orphans = regions
      .filter((row) => row.id.endsWith('-left'))
      .filter((row) => !regionById.get(row.id.replace(/-left$/, '-right')));
    expect(orphans.map((row) => row.id)).toEqual([]);
  });

  /**
   * The mesh is a mirror by construction, so the measured centroids must agree across the
   * sagittal plane. Two centimetres is the tolerance the band sampling can genuinely reach:
   * a region whose azimuth window is authored on a bent limb (the elbow bands) samples a
   * slightly different arc on each side, and that shows up as a vertical offset, not a bug.
   */
  it('mirrors the centroid of a left/right pair across the sagittal plane', () => {
    for (const row of regions.filter((region) => region.id.endsWith('-left'))) {
      const twin = regionById.get(row.id.replace(/-left$/, '-right'));
      if (!twin) continue;
      expect(Math.abs(twin.centroid[0] + row.centroid[0]), row.id).toBeLessThan(0.02);
      expect(Math.abs(twin.centroid[1] - row.centroid[1]), row.id).toBeLessThan(0.02);
      expect(Math.abs(twin.centroid[2] - row.centroid[2]), row.id).toBeLessThan(0.02);
      // Coverage must not be one-sided either: a 20% area gap is a tagging leak.
      const ratio = Math.min(twin.areaMm2, row.areaMm2) / Math.max(twin.areaMm2, row.areaMm2);
      expect(ratio, row.id).toBeGreaterThan(0.8);
    }
  });

  it('keeps every region tappable', () => {
    const tooSmall = regions.filter((row) => row.areaMm2 < 120 || row.triangles < 6);
    expect(tooSmall.map((row) => row.id)).toEqual([]);
  });
});

describe('migration fidelity', () => {
  it('keeps the v1 cue strings verbatim', () => {
    const missing: string[] = [];
    const changed: string[] = [];
    for (const row of v1Exercises) {
      const current = exerciseById.get(row.id);
      if (!current) {
        missing.push(row.id);
        continue;
      }
      if (current.cues.length !== row.cues.length) changed.push(`${row.id}: cue count`);
      row.cues.forEach((cue, index) => {
        if (current.cues[index] !== cue) changed.push(`${row.id} cue ${index}`);
      });
    }
    expect(missing).toEqual([]);
    expect(changed).toEqual([]);
  });

  /**
   * v1 gave every lumbar pattern the same Arabic group name ('نمط ألم أسفل الظهر') while its
   * English names were already pattern-specific. v2 split the Arabic to match, so the
   * invariant that must hold is: nothing migrated lost its Arabic, and nothing is a generic
   * placeholder. See DECISIONS.md.
   */
  it('keeps Arabic for every migrated presentation, and no generic placeholder', () => {
    const generic = ['نمط ألم', 'منطقة الجسم', 'ألم'];
    for (const row of v1Presentations) {
      const current = presentationById.get(row.id);
      expect(current, row.id).toBeTruthy();
      expect(current?.nameAr, row.id).toBeTruthy();
      expect(generic.includes(current!.nameAr ?? ''), row.id).toBe(false);
    }
  });

  it('never invents Arabic for a name the content does not carry', () => {
    const untranslated = exercises.filter((row) => row.nameAr);
    // v1 shipped English exercise names only; v2 keeps them null rather than guessing.
    expect(untranslated.map((row) => row.id)).toEqual([]);
  });
});

describe('machine-readable dosing', () => {
  it('gives every exercise a numeric tempo and numeric dose', () => {
    for (const row of exercises) {
      expect(typeof row.tempo.eccentricMs, row.id).toBe('number');
      expect(typeof row.tempo.concentricMs, row.id).toBe('number');
      expect(row.sets).toBeGreaterThan(0);
      expect(row.reps === null || (row.reps ?? 0) > 0).toBe(true);
      expect(row.holdSeconds === null || row.holdSeconds! > 0).toBe(true);
      expect(row.reps === null || row.holdSeconds === null, row.id).toBe(true);
    }
  });

  it('keeps cue timings at least 400 ms apart', () => {
    for (const animation of animations) {
      const cues = animation.cues.filter((row) => row.cue);
      for (let i = 1; i < cues.length; i++) {
        const gap = (cues[i].t - cues[i - 1].t) * animation.durationMs;
        expect(gap, `${animation.exerciseId} cue ${i}`).toBeGreaterThanOrEqual(400);
      }
    }
  });
});

describe('range of motion', () => {
  it('keeps every authored keyframe inside the rig ROM contract', () => {
    expect(assertAnimationsInRange({ animations })).toEqual([]);
  });

  it('names the pattern windows where a demonstration will be clamped', () => {
    const exceedances = capExceedances({ animations, exercises, presentations });
    // Caps are authored narrower than ROM on purpose; the count is content, not an error.
    expect(exceedances.every((row) => Math.abs(row.requested) > 0)).toBe(true);
  });

  it('fails the build when a keyframe is pushed past the ROM contract', () => {
    const target = { ...animations[0] };
    target.tracks = target.tracks.map((track, index) =>
      index === 0
        ? { ...track, keyframes: track.keyframes.map((key) => ({ ...key, deg: 175 })) }
        : track,
    );
    const violations = assertAnimationsInRange({ animations: [target] });
    expect(violations.length).toBeGreaterThan(0);
  });
});

describe('rule wiring', () => {
  it('has a rule for every presentation that can become a programme', () => {
    const startable = presentations.filter((row) => !row.guidanceOnly);
    expect(rules.length).toBe(startable.length);
    expect(rules.every((row) => !presentationById.get(row.presentationId)?.guidanceOnly)).toBe(
      true,
    );
    expect(regions.every((row) => row.presentationIds.length > 0)).toBe(true);
  });

  it('keeps guidance-only patterns free of a prescribed programme', () => {
    for (const presentation of presentations.filter((row) => row.guidanceOnly)) {
      const pool = exercises.filter((row) => row.presentationIds.includes(presentation.id));
      expect(
        pool.map((row) => row.id),
        presentation.id,
      ).toEqual([]);
    }
  });
});
