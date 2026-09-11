# kinē — put the pain on the body, and move from there

kinē is a mobile-first recovery guide for musculoskeletal pain. You place the pain on a 3D body — or
on a 2D map if your device can't open WebGL — answer seven questions, see which pattern your answers
fit (and why), and get a programme of up to four exercises you can finish in under fifteen minutes.
It demonstrates each movement on the same body you just marked, counts your reps to the authored
tempo, asks how it felt, and changes the load next time based on what you told it.

Nothing is uploaded. The journey lives in IndexedDB on the device.

**Stack**: Next.js 16 (App Router) · React 19 · React Three Fiber + three · Tailwind v4 preflight ·
zustand · idb-keyval · vitest · Playwright (optional) · ESLint · Prettier.

## The flow

- `/body` — 3D figure; tap to place a marker, drag it on the skin, up to five markers each graded
  0–10, region search, front/back, male/female.
- `/intake` — seven questions: intensity, onset, duration, pattern, movements, irritability, nerve
  symptoms.
- `/triage` — red-flag screening. An urgent flag pauses session launch; reading stays open.
- `/explain` — ranked patterns with the evidence behind the score, "that doesn't sound like me", the
  next possibility.
- `/plan` — phase, goal, four exercises, dose, tempo, why each one, print link.
- `/session` — the demonstrator, the metronome, spoken cues, the four-number check.
- `/checkin` — how it felt, pain after, and tomorrow's next-morning answer.
- `/progress` — pain trend, weekly adherence, phase track, a scrubbable replay of where the pain
  sat, and the review gate.
- `/learn` — four short readings on pain, plus what your own pattern means.
- `/handout` — the printable plan: three frames per movement, drawn from the same keyframes.
- `/admin/animator` — edit keyframes on the live rig; out-of-range angles block saving; a changed
  content hash clears approval.

## The body, and why it is generated

`npm run assets:build` lofts an anatomy table (`scripts/anatomy/zones.mjs`: 60 bases → 119 regions)
into two GLBs — 46,198 triangles, 1.715 m tall, 1.21 MB each — and emits the region records, the
skeleton contract and the 2D outline from the same measurement. Region identity travels in the mesh
as a `_REGIONID` vertex attribute, so a tap is a triangle lookup rather than a texture sample, and
`_THIN` marks thin skin. The build refuses to write an asset that fails a gate (untagged vertices, a
region too small to tap, a body the wrong height), and `npm run assets:check` fails if the shipped
files don't match the generator.

The locator and the demonstrator use the **same geometry and the same material**: the demonstrator
clones the buffer and skins it at runtime from `src/data/skeleton.json`. They cannot drift apart
visually. Exercise ranges are clamped per pattern, so a guarded shoulder demonstrates the guarded
range.

`public/models/ASSET-SPEC.md` is the measured contract; `DECISIONS.md` is the reasoning.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
npm run verify         # every gate, in the order that fails cheapest first
```

- `assets:build` / `assets:check` — regenerate the body assets, or assert that the shipped ones
  match the generator.
- `content:build` — rebuild exercises, presentations, rules, regions and animation timelines,
  re-signing content hashes.
- `content:validate` — the clinical gate: enums, cue spacing, ROM ranges, no placeholder Arabic,
  translation status.
- `test` — vitest: clinical rules, content contract, headless render contract.
- `e2e` — Playwright if a browser exists, otherwise an HTTP journey against `next start`, and it
  prints which mode it ran.
- `format` / `format:check` — Prettier at 100 columns, then the file gate: nothing over 120 columns
  or 300 lines. Generated JSON is held to 200 columns because a clinical sentence must not be
  wrapped inside its own string; `package-lock.json` is skipped.
- `verify` — `scripts/verify.mjs` runs the gates in order and prints the time each took.

`assets:build` rebuilds the measured fields of `regions.json` and carries the clinical annotations
across, so running it on its own cannot unbind a region from its presentations; `content:build`
still has to run afterwards to re-derive the exercise content against new ids.

## Layout

```
src/
  app/            routes only — one screen per file, no clinical logic
  styles/         one stylesheet per concern, pulled in by globals.css
  modules/
    body/          figure, region picker, pins, camera, studio, 2D tier
    animation/     keyframe evaluation, joint maths, ROM clamp, 2D projection
    demonstrator/  runtime rig, stage props, 3-frame strip, fault split
    intake/        the seven questions, movement vocabulary, rule index
    triage/        pattern scoring, red flags
    reasoning/     the evidence card
    programme/     dose, tempo arithmetic, variants
    session/       clock, metronome, spoken cues, player
    checkin/       daily, post-session, next-morning
    progress/      gates, adherence, charts, pain-map replay
    education/     pain readings, what your pattern means
    handout/       the printable plan
  lib/            types, content access, persistence; i18n/ holds one string table per
                  screen group
  state/          zustand stores and selectors
```

Modules talk to each other through their `index.ts` barrels and nothing else, so `modules/programme`
cannot reach into `modules/body`'s internals; `lib` and `state` are shared.

## Mobile and motion

Bottom tab bar under 720px, 44px minimum targets, `touch-action: none` on the canvas so a drag
rotates the body instead of scrolling the page, portrait and landscape framing, and everything
reachable one-handed. `prefers-reduced-motion: reduce` (or `?no3d`) swaps the animated figure for
the three-frame strip and keeps the same numbers.

## Honest limits

- 60 fps and a <3 s cold start on mid-range Android are targets, not measurements: this environment
  has no GPU, so the render tests are headless geometry assertions. Anyone who runs it on a real
  phone should record the numbers before they are quoted.
- Region boundaries are authored bands on a generated body, not a segmentation traced from imaging.
  Small sites (ear, fingers, toes) exist and are tappable, but they are not clinical imaging.
- Arabic covers the chrome, the navigation, the intake questions, the traffic light and the pattern
  names. Exercise names and cues are English with a visible **translation pending** chip —
  deliberately not machine-filled. A native clinical reviewer must proof the new intake vocabulary
  and the split pattern names.
- This is not a diagnosis, and there is no clinician dashboard, billing or consent flow here. The
  product intentionally ships no legal or account gate; the safety gate is the red-flag screen.

## Licence

MIT.
