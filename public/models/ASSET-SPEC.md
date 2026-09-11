# kinē body asset contract (v2)

Every number on this page is measured from the build, not remembered from a plan. Re-run
`npm run assets:build` and the whole file is reproducible; `npm run assets:check` fails if the
shipped GLBs do not match the generator that claims to have produced them.

## What ships

- `body-male.glb`, `body-female.glb` — `scripts/build-body-assets.mjs` — 23,153 vertices, 46,198
  triangles, 1.715 m tall, 1.21 MB each. Geometry plus the `_REGIONID` and `_THIN` attributes; no
  skin, no morph targets, no embedded textures.
- `skin-albedo.png`, `skin-normal.png`, `skin-orm.png` — same generator — 256², seamless,
  procedural, 117 KB together. Low frequency on purpose: the figure is read at arm's length on a
  phone, and every kilobyte here is paid for again on a cold start.
- `ASSET-REPORT.json` — same generator — triangles, bytes and SHA-256 (16 hex) per body.
- `src/data/regions.json` — same generator, then `content:build` — 119 regions with measured surface
  area, centroid, neighbours and presentation mapping.
- `src/data/skeleton.json` — `scripts/anatomy/rig.mjs` — 26 bones, 13 joints, axis vectors, ROM
  table and base poses; shared by the locator and the demonstrator.
- `src/data/body-outline.json` — same generator — silhouette slices plus 119 anchors, one set per
  sex, for the reduced-motion tier.

The v1 pair (`male.glb`, `female.glb` at 1,400 vertices) and the 2048² `body-regions.png` UV mask
are deleted, not archived: the placeholder mesh was the reason the 3D stage read as broken, and the
mask's source OBJ no longer exists, so nothing could keep the two in step.

## Geometry channels

The GLB is glTF 2.0 with one indexed primitive and these attributes:

- `POSITION`, `NORMAL` — the external skin, metres, Y up, feet at y=0, crown at y≈1.72, face toward
  +Z, subject's left at +X.
- `TEXCOORD_0` — oblique planar projection `(x·0.9+y·0.35, z·0.9+y·0.35)`. Seam-free at pore scale
  by construction. This is a deliberate deviation from an unfolded UV layout: the skin textures are
  procedural and isotropic, so nothing needs an artist's unwrap.
- `_REGIONID` (uint16, `SCALAR`) — the region catalog index + 1 per vertex. `glTF` lower-cases
  unknown attribute names on import, so runtime code reads `_regionid`.
- `_THIN` (uint8, normalised) — soft-tissue thickness proxy: 235 over ear, fingers, toes, face,
  thumb base and nose; 150 over heel and plantar arch; 40 elsewhere.

Region identity lives in the **vertex data**, so a pick is a triangle lookup. There is no texture to
sample on the CPU, no `flipY` convention to keep in sync, and no way for the highlight to disagree
with the label.

## Authoring source

`scripts/anatomy/zones.mjs` holds one table of 60 anatomical bases that `expandZones()` expands to
119 left/right/front/posterior regions. `parts.mjs` lofts the body from cross-section profiles, and
each loft band declares which zone it belongs to. That single table emits the mesh, the region
records and the 2D outline, so an id means the same thing in all three. `build-body-assets.mjs`
refuses to write anything unless:

1. standing height is between 1.55 m and 1.85 m for both sexes;
2. the triangle count is at least 20,000;
3. **no vertex is untagged**;
4. at least 70 regions exist (v2 ships 119);
5. every region measures ≥120 mm² of surface and ≥6 triangles, because a fingertip-sized target
   cannot be tapped on a phone.

## Rendering contract

`src/modules/body/Studio.tsx` is the only lighting rig: a warm key spot, cool fill, amber rim,
hemisphere and ambient, ACES tone mapping at exposure 1.05, 35° lens, a single-frame contact shadow,
and a rectangle lightformer environment instead of an HDRI file (no network fetch, nothing to 404).
`src/modules/body/skinMaterial.ts` produces the shared material — albedo, normal at scale 0.35,
roughness from the ORM's green channel, `metalness 0`, `envMapIntensity 0.6` — plus one shader
injection: the per-vertex `aHi` highlight, tinted stronger where `_THIN` says the skin is thin.

The locator and the demonstrator use **the same geometry and the same material instance rules**; the
demonstrator clones the buffer and adds `skinIndex`/`skinWeight` built at runtime from
`skeleton.json`. That is why the two figures are visually identical by construction. The rig is
built in the browser rather than baked into the GLB on purpose: hand-authored inverse bind matrices
are the kind of thing that silently renders a collapsed body.

## Posing

`src/data/skeleton.json` is the joint contract: for each joint, the bones it drives, an axis vector
**per side**, a ROM window, and the mirror rule (the right vector must be the x-mirror of the left,
asserted in `rig.mjs` at build time). Base poses carry `root.roll/pitch/yaw` plus `root.drop`, the
metres the figure comes down toward its support, so a seated mannequin sits on the chair rather than
hovering half a metre above it. A lying figure is instead measured: `floorLift()` finds the lowest
rotated vertex and rests the body on the floor.

## Measurement rules

- Region area and centroid come from the mesh: each triangle is attributed to the region shared by
  at least two of its corners, and the centroid is area-weighted. A first-corner rule plus a
  vertex-mean centroid made a left muscle measure differently from its mirrored twin.
- `body-outline.json` is generated per sex, because bust and waist shift both the silhouette and the
  anchor positions the 2D tier taps.

## Not certified

Rendering at 60 fps and a cold-interactive under 3 s on mid-range Android are targets of this build,
not measurements of it: there is no GPU or browser in this environment, so the checks that exist are
the headless ones in `tests/render.test.ts` (does the file parse, does every region exist in the
vertex data, does a pose actually deform the body, does a left pose stay on the left). Anyone who
can run it on a real phone should record the numbers here before the figures are quoted anywhere
else.
