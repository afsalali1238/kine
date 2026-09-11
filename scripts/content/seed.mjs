/**
 * The demo journey and the camera anchor table. Both are derived from the built content,
 * so they live apart from the builder that sequences them (C2: one screen per file).
 */

/** Pin anchors: one camera target per region base, averaged over its split pieces. */
export function anchorsFor(regions) {
  const byBase = new Map();
  for (const r of regions) {
    const c = r.centroid ?? r.focusTarget;
    if (!c) continue;
    const entry = byBase.get(r.base) ?? { n: 0, c: [0, 0, 0], radius: 0 };
    entry.n += 1;
    entry.c = entry.c.map((v, i) => v + c[i]);
    entry.radius = Math.max(entry.radius, r.focusRadius ?? 0.05);
    byBase.set(r.base, entry);
  }
  const anchors = {};
  for (const [base, e] of byBase) {
    anchors[base] = {
      target: e.c.map((v) => Number((v / e.n).toFixed(3))),
      radius: Number((e.radius ?? 0.05).toFixed(3)),
    };
  }
  anchors.hips = anchors['lumbar-spine'] ?? { target: [0, 0.95, 0], radius: 0.12 };
  anchors.chest = anchors['thoracic-spine'] ?? { target: [0, 1.25, 0], radius: 0.14 };
  anchors.head = anchors['occiput'] ?? { target: [0, 1.62, 0], radius: 0.1 };
  anchors.knees = anchors['knee-anterior'] ?? { target: [0, 0.48, 0.03], radius: 0.07 };
  anchors.foot = anchors['ankle-lateral'] ?? { target: [0, 0.09, 0], radius: 0.06 };
  return { version: 2, anchors };
}

/** Seeded journey so progress, the weekly review and the pain map are populated. */
export function demoSeed(exercises) {
  const iso = exercises.find((e) => e.type === 'isometric') ?? exercises[0];
  const mobility = exercises.find((e) => e.type === 'mobility') ?? exercises[1];
  const strength = exercises.find((e) => e.type === 'strength') ?? exercises[2];
  const stretch = exercises.find((e) => e.type === 'breathing') ?? exercises[3];
  const plan = [iso, mobility, strength, stretch].filter(Boolean).map((e, i) => ({
    exerciseId: e.id,
    phase: 1,
    order: i,
    sets: e.sets,
    reps: e.reps,
    holdSeconds: e.holdSeconds,
  }));
  const days = 21;
  const logs = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    const done = i % 7 !== 2 && i % 11 !== 5;
    const base = 6 - Math.round((days - i) / 6);
    const pain = Math.max(1, Math.min(9, base + ((i % 3) - 1)));
    logs.push({
      date,
      pain,
      feeling: pain <= 3 ? 'better' : pain <= 5 ? 'same' : 'worse',
      session: done,
      phase: i < 7 ? 2 : 1,
      completed: done ? plan.map((p) => p.exerciseId) : [],
      settled: done ? pain <= 5 : null,
      morningWorse: done ? pain >= 6 : null,
      effort: pain <= 3 ? 'easy' : pain <= 5 ? 'right' : 'hard',
      swaps:
        i === 9
          ? [{ from: strength.id, to: strength.easierVariantId ?? strength.id, reason: 'pain' }]
          : [],
    });
  }
  return {
    version: 2,
    note: 'Seeded journey so the progress and weekly-review screens are populated on a fresh install.',
    journey: {
      regionId: 'lumbar-spine',
      sex: 'male',
      presentationId: 'back-flexion',
      phase: 1,
      goal: 'Carry my daughter without wincing',
      programme: plan,
    },
    logs,
  };
}
