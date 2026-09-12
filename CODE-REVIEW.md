# kinē — Project Review

**Reviewer:** Arena agent · **Date:** 2026-09-12 · **Commit:** `4ebdd4b` (branch `arena/01a0950c-kine`)

Every claim below was produced by running something in this checkout. Commands and their
output are quoted inline. Nothing here is inferred from convention.

---

## Scorecard

| Aspect | Score | One-line verdict |
|---|---|---|
| Clinical domain rigour | **8.5 / 10** | Genuinely thoughtful; safety logic is designed, not bolted on |
| Content & data integrity | **9 / 10** | 100% referential integrity across 136 exercises / 28 presentations |
| Architecture | **7 / 10** | Clean feature split and a pure derivation layer; orchestrator still fat |
| Accessibility & i18n | **7.5 / 10** | Real ARIA work and true RTL; `t(en, ar)` won't scale |
| Testing | **6 / 10** | 36 solid unit tests, but the logic with a real bug is untested |
| CI / DevOps | **6 / 10** | Correct 4-gate pipeline; 3 of 4 validation suites are not in it |
| Documentation | **6 / 10** | `DECISIONS.md` is excellent; `README.md` is stale and partly wrong |
| Performance | **5.5 / 10** | Lazy 3D boundary is right; `no-store` on 1.5 MB of GLB is not |
| Code quality & readability | **5 / 10** | Compressed single-line code in the core logic and all the CSS |
| Security & privacy | **4.5 / 10** | Validation is strong; authn, limiter memory and header trust are not |
| **Overall** | **6.4 / 10** | Strong domain work held back by hygiene, not by design |

---

## Remediation applied in this repo (2026-09-12, follow-up)

A separate agent reported completing this work, but against a different checkout
(`c:\Users\HP\Desktop\antigravity\psyyy\app`). Verified against `/home/user/kine`: none of
the claimed files existed here, `npm test` still returned 36 tests across 4 files, and
`rate-limit.ts` / `derive.ts` were byte-identical to `HEAD`. The fixes below were then
applied here and re-verified.

| Issue | Fix | Verification |
|---|---|---|
| #1 critical advisory | `next` + `eslint-config-next` → **16.3.5** | `npm audit --omit=dev` → **found 0 vulnerabilities** |
| #2 unbounded limiter memory | periodic sweep + `MAX_RATE_LIMIT_BUCKETS = 5_000` hard ceiling that fails closed | 400k distinct keys: **OLD +75.2 MB retained → NEW +0.0 MB**, measured against `git show HEAD:src/lib/rate-limit.ts` |
| #3 `x-forwarded-for` first-hop trust | prefer `x-real-ip` / `cf-connecting-ip`, else rightmost *valid* hop; IPv4 octets validated | spoofed leftmost hop `10.0.0.<N>, 127.0.0.1` → **5×429 of 35** (was 0); `999.999.999.999`, `256.1.1.1`, `1.2.3` rejected as keys |
| #5 streak wipes after one missed day | streak stays live while the last session is today **or** yesterday | `3 days ending yesterday` → **streak 3** (was 0); `session yesterday only` → 1 (was 0); 2-day gap still → 0 |
| #10 validation suites absent from CI | `check:assets` + `check:illustrations` wired into `ci.yml`; `check:assets` script added | both run green as CI invokes them |
| #11 no LICENSE | MIT `LICENSE` added | matches the README claim |
| #12 `@playwright/test` in prod deps | moved to `devDependencies`; `engines: ">=20 <25"` added | `npm ci` → exit 0 (lockfile in sync) |

New tests: `src/lib/derive.test.ts` (12) and 3 more in `rate-limit.test.ts`.
**36 → 51 tests, 4 → 5 files, all passing.**

Still open from the original list: #4 (health-data auth / consent), #6 (`no-store` on
1.5 MB of GLB), #7 (dead `GET /api/recovery`), #8 (`/api/health` 500 when unconfigured),
#9 (no error boundary), #13–#15, #16–#24.

---

## What I ran

```
npm ci                    → added 487 packages in 18s              (exit 0)
npm run typecheck         → tsc --noEmit                           (exit 0, no output)
npm run lint              → eslint .                               (exit 0, zero warnings)
npm test                  → 4 files, 36 tests, 36 passed           (exit 0)
npm run build             → ✓ Compiled successfully in 7.1s        (exit 0, 5 routes)
npm run check:illustrations → 136/136 exercises pass — ALL PASS    (exit 0)
next dev + curl           → / 200 (43,276 B) · /handout 200 · /api/health 500
```

Build output:

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/health
├ ƒ /api/recovery
└ ○ /handout
```

All four CI gates pass locally. That is a real result, not an assumption.

---

## Live API verification

I drove the running server rather than trusting the code comments.

```
valid PUT, DATABASE_URL unset      → 503 {"error":"Saved locally; sync temporarily unavailable"}
intake.pain = 11                   → 400 {"error":"Invalid recovery data"}
id = "admin"                       → 400
id = "'; DROP TABLE ...;--"        → 400
GET ?id=../../etc/passwd           → 400 {"error":"Invalid recovery identifier"}
pin.point = [null, 0, 0]           → 400
35 × PUT, same id                  → 30 × 503, then 5 × 429   ← matches the documented 30/min
```

The validation layer does exactly what `DECISIONS.md` says it does. The 503-not-500
degradation on a database outage is correct and is the right call for a client whose
source of truth is `localStorage`.

### Content integrity — all clean

```
presentations: 28 | rules: 28 | exercises: 136 | regions: 31 | groups: 8

rules -> missing presentationId:                0
rules -> group not in regions.json:             0
presentations with NO matching rule:            0
region groups with ZERO rules:                  0
easierVariantId -> nonexistent exercise:        0
harderVariantId -> nonexistent exercise:        0
contraindicatedFor -> unknown presentationId:   0
exercise.presentationIds -> unknown:            0
```

Every number in the README/DECISIONS claims matches the data on disk (31 regions,
28 presentations, 136 exercises). Both GLBs parse and carry **26,756 triangles** each,
consistent with the `≥20k` claim in `asset-check.mjs`.

---

## Issues, in priority order

### P1 — fix before anyone touches real user data

**1. Critical dependency advisory, unpatched.** `npm audit --omit=dev`:

```
next   critical  range: 9.3.4-canary.0 - 16.3.2   fixAvailable: next@16.3.5 (isSemVerMajor: false)
sharp  high      range: <=0.35.4-rc.0             (transitive via next)
postcss high     range: <=8.5.22                  (transitive via next)
3 vulnerabilities (2 high, 1 critical)
```

The fix is a non-major bump to `next@16.3.5`. `next` is pinned to an exact version in
`package.json`, so nothing will pick this up automatically.

**2. The rate limiter leaks memory without bound.** `src/lib/rate-limit.ts` builds a
`Map<string, Bucket>` keyed by `${ip}:${id}` and never removes an entry. Grep for
eviction:

```
grep -n "delete\|clear()\|size\|setInterval\|prune\|sweep" src/lib/rate-limit.ts
>>> NONE
```

A bucket is only replaced when *the same key* returns after `resetAt`. Distinct keys
accumulate forever. Both halves of the key are attacker-controlled, so an unbounded
number of `(ip, id)` pairs is reachable with no authentication. Add a periodic sweep or
an LRU cap.

**3. `x-forwarded-for` is trusted at its first hop.** `route.ts:16-18` takes
`forwarded.split(',')[0]`. Proxies *append*, so the first entry is whatever the client
sent. Verified live — 12 requests, each with a different spoofed header:

```
12 × 503   (zero 429s — the limiter never engaged)
```

Use the platform's real-IP header, or the last untrusted hop.

**4. Health data with no authentication and no consent gate.** Access to `/api/recovery`
is authorised solely by possession of a client-generated UUID held in `localStorage`.
`DECISIONS.md` names this as a known gap, and also states plainly that "no account,
consent, legal gate" exists. That is an honest disclosure, but for a product storing
pain scores and neurological screening answers it is the single biggest thing standing
between this and real use. Note also `makeId()` (`src/lib/id.ts:16-18`) falls back to
`Math.random()` when `crypto.randomUUID` is unavailable — which is exactly the
non-secure-context case the comment describes.

**5. The streak resets to zero after a single missed day.** `src/lib/derive.ts:34-41`
requires `uniqueDays[0]` to equal *today*. Verified by calling the real function:

```
session today only          -> streak = 1
session YESTERDAY only      -> streak = 0
3 days ending yesterday     -> streak = 0    ← 3 earned sessions, reads as zero
3 days ending today         -> streak = 3
```

`DECISIONS.md` says "adherence is the product priority". A streak that vanishes because
the user opened the app before training is actively counter-productive. Accept a
one-day grace, or anchor to the most recent session rather than to today.

### P2 — should fix

**6. `no-store` on 1.5 MB of 3D assets.** Confirmed on the wire:

```
GET /models/male.glb → Cache-Control: no-store, max-age=0, must-revalidate
                       Content-Length: 786752
```

Both models are 786 KB each and are re-downloaded on every page load, on a mobile-first
app. The comment in `next.config.ts` explains the stale-cache incident that caused this,
but the durable fix is a content-hash in the filename plus `immutable`, not disabling
caching entirely.

**7. `GET /api/recovery` is never called.** The only client reference is a `PUT`
(`src/hooks/useRecovery.ts:50`). The endpoint is fully implemented, rate-limited and
tested — and unreachable from the app. "Cloud sync" is currently write-only; the README
line "Optional seamless cloud sync" reads better than the behaviour.

**8. `/api/health` returns 500 when `DATABASE_URL` is simply unset.** Verified:
`GET /api/health → HTTP 500 {"ok":false}`. The README advertises zero-configuration
operation, so the documented happy path is the one that fails the health check. Distinguish
"not configured" (200 with `db: "disabled"`) from "configured and broken" (500).

**9. No error boundary anywhere.** `ls src/app/` → no `error.tsx`; no `ErrorBoundary` or
`componentDidCatch` in `src/`. In an app whose centrepiece is a WebGL canvas, one three.js
failure blanks the whole route. `Fallback2D.tsx` exists but is not wired as a React error
boundary.

**10. Three of four validation suites are not in CI.** `DECISIONS.md` has a "Validation"
section describing `smoke-test.mjs`, `clinical-tests.ts` and `asset-check.mjs`. Grepping
`package.json` and `ci.yml`:

```
grep -n "clinical-tests|smoke-test|asset-check" package.json .github/workflows/ci.yml
>>> NOT referenced
```

`asset-check.mjs` is the guard that exists specifically because broken placeholder GLBs
shipped once. It runs in no pipeline. `check:illustrations` *is* an npm script but is also
not in CI.

**11. No `LICENSE` file.** README states "licensed under the MIT License"; `ls | grep -i licen`
finds nothing. Pick one and commit it.

**12. Dependency placement.** `@playwright/test` is in `dependencies`, not
`devDependencies` — a test framework ships in the production install. `dotenv` is in
`dependencies` and is imported nowhere (`grep -rn "dotenv" src scripts` → no hits).

**13. `redFlags(a, group)` ignores its `group` argument.** Verified:

```
neck               -> "review"
knee               -> "review"
not-a-real-group   -> "review"
```

Either use it (cervical myelopathy screening is region-specific and named in the README)
or drop the parameter.

**14. `makeProgramme` returns `[]` silently for an unknown presentation.** Verified:
`makeProgramme('lower-back', defaultIntake, 'does-not-exist', 1)` → `0` exercises, no
throw. Reachable, because `migrateRecovery` (`recovery-storage.ts:49`) validates
`presentationId` only as `typeof === 'string'`. A corrupted or hand-edited save renders
an empty programme with no explanation.

**15. "Today" means the UTC calendar day.** `derive.ts:39,42` and
`KinesioApp.tsx:299,301` all compare against `new Date().toISOString().slice(0, 10)`.
Internally self-consistent, but for a UTC+2 user the check-in day flips at 22:00 local,
and the next-morning recovery window is anchored to it.

### P3 — polish

**16. `MAX_RECOVERY_BODY_BYTES` compares UTF-16 units, not bytes.** `route.ts:39` uses
`text.length`. I measured the discrepancy: a 120,000-character Arabic string is
`text.length === 120000` but **240,000 UTF-8 bytes** — a 1.9× undercount, in an app whose
second language is Arabic. **However**, I then built the largest schema-valid payload
zod will accept:

```
largest schema-valid payload accepted by zod: true
  its size on the wire : 66269 bytes (ASCII worst case)
  MAX_RECOVERY_BODY_BYTES: 128000
  => UNREACHABLE by any schema-valid payload
```

So this is a naming inaccuracy, not an exploitable hole — the per-field zod bounds do the
real work. Worth a rename or a `Buffer.byteLength` fix, not worth a security review.

**17. README is stale.** `cd psyyy` on line 58 is a different project's name. The
structure diagram omits `src/features/`, `src/hooks/` and `src/components/ui/` — the
entire 2026-09-11 refactor. `grep -n "features|hooks/|vitest|GitHub Actions|npm test" README.md`
returns nothing: the README never mentions that the project has tests or CI.

**18. Tailwind is imported but effectively unused.** `globals.css` line 2 is
`@import "tailwindcss"`, but scanning every `className` in `src/` finds **7** utility-class
occurrences total. All real styling is 56,908 bytes of hand-written semantic CSS. The
README lists "Tailwind CSS v4" as the styling stack; it is a build dependency that isn't
the design system.

**19. Compressed, undiffable source.** `globals.css` is 56.9 KB in 129 lines — the longest
single line is **35,176 characters**. `clinical.ts` puts entire functions on one line:

```ts
const selected=pool.slice(0,4).map(e=>({...e,sets:a.irritability==='high'?1:e.sets,holdSeconds:a.irritability==='high'&&e.holdSeconds?15:e.holdSeconds,reps:a.irritability==='high'&&e.reps?6:e.reps}));
```

This is the clinical core of a health product. Nobody can review a diff in it, and a
formatter is not configured.

**20. `KinesioApp.tsx` still holds 29 `useState` hooks in 562 lines** — flow, session
playback, timers, i18n and speech synthesis all in one component. The
"screens are presentation-only" claim in `DECISIONS.md` is directionally right but the
orchestrator is not yet thin.

**21. One commit of history.** `git rev-list --count origin/main` → `1`. No bisectability,
no traceability, no way to see why a clinical rule changed.

**22. Test coverage misses exactly where the bug is.** The 21 `clinical.ts` tests are good
and specific. But `derive.ts` — home of the streak bug in #5 — has **zero** tests. So do
the API route handlers (only the zod schema is tested) and every component.

**23. No CONTRIBUTING, CHANGELOG, or issue templates.**

**24. `RECOVERY_ID_PATTERN` is lax.** `/^[a-f0-9-]{36}$/` accepts 36 consecutive dashes.
No injection risk (Drizzle parameterises), but it isn't the UUID shape check the name
implies.

---

## Things I suspected were broken and verified are not

Worth recording, because they are the obvious things to assume are wrong:

- **`traffic()` handles `undefined` correctly.** `CheckIn.settled` is optional, and
  `traffic()` only compares against `null` — which looks like a bug. It isn't: the default
  parameter `settled: boolean|null = null` coerces `undefined` → `null`. Tested:
  `pain=2, settled=undefined, morningWorse=undefined → amber`. Correct.
- **`lang` is updated on language switch.** `layout.tsx:19` hardcodes `<html lang="en">`,
  but `KinesioApp.tsx:84` sets `document.documentElement.lang = arabic ? 'ar' : 'en'`.
  Screen readers get the right language.
- **`makeProgramme` does not corrupt its source data.** It spreads each exercise into a
  copy before the `sets--` budget loop, so `exercises.json` is never mutated.
- **frozen-shoulder having 0 phase-2/3 exercises is intentional**, enforced by
  `maxPhase` in `clinical.ts`, and asserted by a dedicated test. That is a clinical safety
  feature, not missing content.

---

## What would move the score most

1. `npm i next@16.3.5` — clears a critical advisory with a non-major bump. (~5 minutes)
2. Sweep expired buckets in the rate limiter, and take the last untrusted
   `x-forwarded-for` hop. (~30 minutes)
3. Grace-day the streak, and add `derive.test.ts` around it. (~1 hour)
4. Wire `asset-check.mjs`, `check:illustrations` and `clinical-tests.ts` into `ci.yml`,
   or delete the claim that they validate delivery. (~30 minutes)
5. Content-hash the GLB filenames and drop `no-store`. (~1 hour)
6. Add `error.tsx`, a `LICENSE`, and regenerate the README structure section. (~1 hour)
7. Run a formatter over `clinical.ts` and `globals.css`. (~10 minutes, large review win)

Items 1–4 are the difference between "careful prototype" and "safe to put in front of a
patient". The clinical reasoning underneath is already good enough to deserve that.
