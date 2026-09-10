# kinē — clinical and product decisions

## Scope and architecture

This is an internal-testing MVP, not a completed clinical validation exercise. Built on the supplied **Next.js App Router + TypeScript + PostgreSQL/Drizzle** project rather than replacing the host with Vite. React Three Fiber/Drei own all WebGL. Plain React state is sufficient for a single persisted recovery journey; no account, consent, legal gate, subscription, or onboarding modal exists.

Local storage provides immediate persistence. A random anonymous recovery identifier is used to upsert the same state through `/api/recovery` into PostgreSQL. No identity is requested. The UI distinguishes device-only storage from successful sync. Losing both local storage and the random identifier means there is no account-based recovery. Assessment state and session data persist; transient UI navigation does not.

The starting screen is the body workspace, not a marketing landing page. Returning assessed users land on today's dominant session action. A warm off-white canvas and sage palette were chosen to preserve skin contrast and a calm, non-hospital feel; this is intentionally lighter than the brief's deep-neutral preference. Mobile navigation moves to the bottom. Arabic mirrors chrome, not the 3D coordinate system. Core chrome, intake and traffic-light messaging are translated; **presentation-specific prose and the full 136 exercise names need a qualified clinical Arabic translation pass**. Generic Arabic exercise-type labels are interim, not equivalent clinical translations.

## Clinical reasoning

- Editable JSON ships 28 presentations across eight regional families, scored matching rules, 31 coarse region records, 120 primary movement records plus 16 explicit boundary variants. Scores are transparent pattern-fit scores, **not calibrated diagnostic probabilities**. A top and secondary match are shown, with a rejection action that reranks or takes the user back to movement questions.
- Seven screens maximum. Questions expose different branches based on region, trauma history, night symptoms and neuro symptoms, rather than adding extra screening forms. Questions about aggravation/easing are regional and mutually exclusive for a movement. NPRS best ≤ current ≤ worst is enforced.
- Irritability is an explicit dosage control, not a diagnosis. High starts with short, reduced-dose movement/holds. Moderate starts with controlled motion/light load. Low can use early strength without requiring two weeks of arbitrary rest. Duration informs the explanation: persistent symptoms emphasise confidence and capacity, not fragility.
- Shoulder stiffness in multiple directions plus gradual onset weights the frozen-shoulder pattern. That presentation cannot receive phase-two/three strengthening even if the user selects low irritability. This is a cautious provisional pattern, not proof of adhesive capsulitis.
- Directional preference increases the fit of flexion- or extension-preferring back patterns. Supported extension is excluded from a flexion-preferring plan. Nerve symptoms require monitoring for distal spread. This small rule set is a clinician-editable starting point, not a diagnostic system.
- Pattern matching cannot establish SI-joint, meniscal, inflammatory or nerve diagnoses without examination. The presentation education deliberately avoids confident structural statements.

## Safety is a product behaviour

The usual 4/10 / 24-hour / no-worse-next-morning guidance is presented as a **load-monitoring heuristic, not universal permission to exercise**. Pain >4, lingering symptoms, or a worse morning calls for less load. New or progressive neurological symptoms override traffic-light reassurance.

New bladder/bowel changes, saddle symptoms, bilateral symptoms, chest symptoms, or a first sudden severe headache trigger urgent wording. Significant trauma, progressive weakness, night-waking pain, fever or unexplained weight loss trigger in-person review. The calm card retains “Continue anyway” to explore the explanation, as requested; **urgent findings still pause session launch**. Allowing someone with possible cauda equina or acute chest symptoms to override into exercise would be a clinical product failure. This is an intentional deviation from an unrestricted override.

Night pain alone is non-specific; its appearance triggers an assessment recommendation rather than a scary diagnosis. A worsening pain trend or no improvement over approximately four weeks also prompts an in-person assessment. Screening cannot detect information the person does not report.

## Dosage and progression

The brief conflicts on low-irritability duration (20–30 minutes) and an absolute 15-minute cap. The **15-minute maximum wins**, because adherence is the product priority. Four exercises per session. High-irritability plans may use 1 set, 6 reps or 15-second holds rather than five long isometric holds; initial tolerability takes precedence over a blanket dose. Prescribing five 45-second holds for every exercise would break both the short-session goal and irritability logic.

Progression is never calendar-triggered. It requires ≥70% of a ten-session review block, stable/falling pain, manageable effort, and a next-day recovery check. The ten-session block is a transparent MVP simplification; it is not a full scheduling/adherence calendar. A same-day daily check-in cannot certify next-morning recovery. The next-day single check-in compares current pain and perceived direction against the recent session; explicit 24-hour recovery timing remains more precise in a future follow-up design.

“Too painful” immediately swaps to the linked easier movement and records the change for the next session. The first movement in each family has a real reduced-dose variant. “Too easy” offers the linked harder variant only if it is not contraindicated. The post-session high-pain response reduces future dosage. A phase does not advance after an exercise-level easy response alone.

Capacity ordering uses the recovery goal (walking, family activities, training or desk comfort) while keeping the same clinical contraindications. Recovery can hold or regress; an ordinary bad day does not mean failure. Plans and reviews explain their changes visibly.

## Content provenance and limitations

MakeHuman core geometry and macro targets are CC0; details and production asset requirements are in `public/models/ASSET-SPEC.md`. Public-domain reference records from `yuhonas/free-exercise-db` are in `src/data/open-source-reference.json`. These are reference examples, not a claim that its gym database contains rehabilitation prescriptions. The 120 primary rehab movement records and their clinical cues are authored for this MVP. Wger is not queried at runtime, and no external API credentials are needed.

**Requires clinical content review before patient testing:** progression links, all movement cues, equipment/position classifications, per-presentation exclusions, scoring weights, exact exercise dose, and Arabic terminology. Boundary variants and named records are not equivalent to 136 independently validated exercise protocols.

Session media is an **explicitly labelled animated movement illustration**, plus the same anatomical target viewer and exercise-specific written cues. It is not a filmed demonstration or a biomechanically accurate exercise rig. The SVG motion is illustrative, not a substitute for a proper instruction video. No remote video link or “coming soon” screen is used.

## 3D trade-offs, stated plainly

- Real small skin GLBs, not generated primitive mannequins. Mesh size is below the 40k–80k requested detail band; triangles were not artificially added just to satisfy a count.
- CPU UV sampling and shader masking agree. The corrected PNG orientation uses `flipY=true` for the OBJ-style atlas. Coarse segmentation is approximate; complete fine-grained muscular boundaries need an anatomist-authored atlas.
- Three-point lighting, wrap diffuse, warm rim response, subtle pore normal, narrow lens, contact shadows, and breathing are implemented. There is no scanned skin texture set, HDRI, dedicated AO/roughness texture, KTX2/Draco, SMAA or postprocessed bloom. Do not describe this as meeting the full photographic-skin specification.
- Front/back and focus use damped spherical camera transitions. Pins have a surface-normal offset and distance-scaled size. Five points can be added, individually graded, removed, and relocated by re-tapping; **continuous pin dragging and per-surface-normal pin orientation are not implemented**.
- Demand mode, DPR ≤1.75 (reduced to ≤1.5 after sustained slow drag frames), reduced-motion support and a real model-loading percentage are present. Breathing invalidates at 24 Hz while idle and visible; it pauses during dragging. Performance still needs measurement on representative hardware.
- Progress uses the same viewer and current pain-dependent highlight intensity. The sample chart is clearly labelled and is replaced by real logs. There is no fully time-scrubbable historical pain-map replay yet.

## Validation

`node scripts/smoke-test.mjs` runs a real browser through body selection → seven questions → ranked explanation → goal → programme → traffic light → painful exercise swap → completed session → progress; also checks mobile overflow and runtime errors. `scripts/clinical-tests.ts` covers dosage differences, phase safety and progression boundaries. `node scripts/asset-check.mjs` validates the committed 3D assets without a browser — GLTFLoader parse, single indexed skin primitive, ≥20k triangles, feet at Y=0/crown ~1.8 m, 2048² mask containing all 31 region IDs, and ≥95% picker UV coverage with every region reachable; it fails against the 2,600-triangle placeholder assets that prompted the check. Final delivery requires Next type generation, TypeScript, production build, and platform healthcheck.
