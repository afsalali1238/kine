/**
 * kinē — body asset pipeline (deterministic).
 *
 * Emits, from one source of truth (`scripts/anatomy/*`):
 *   public/models/body-male.glb        locator mesh, `_REGIONID` vertex channel
 *   public/models/body-female.glb      same contract, lazy-loaded
 *   src/data/skeleton.json             bones, joint axes, ROM ceilings, base poses
 *   src/data/regions.json              region records derived from the mesh itself
 *   public/models/skin-*.png           procedural PBR set
 *   public/models/ASSET-REPORT.json    triangle counts, per-region vertex counts, hash
 *
 * `npm run assets:build`. Regeneration is byte-stable: a rebuild with no source
 * change must produce the same hashes, which is what lets `verify` fail loudly when
 * a shipped asset and the data files disagree.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildBody } from './anatomy/mesh.mjs';
import { expandZones } from './anatomy/zones.mjs';
import { skeleton } from './anatomy/rig.mjs';
import { buildGlb } from './anatomy/glb.mjs';
import { skinTextureSet } from './anatomy/textures.mjs';
import { writePng } from './lib/png.mjs';
import { renderPanels } from './anatomy/preview.mjs';
import { checkShippedAssets } from './anatomy/check-shipped.mjs';
import { outline, regionRecords } from './anatomy/measure.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const MODELS = path.join(ROOT, 'public', 'models');
const DATA = path.join(ROOT, 'src', 'data');
const PREVIEW = path.join(ROOT, '.preview');
const THIN_REGIONS = ['ear', 'fingers', 'toes', 'face', 'thumb-base', 'nose'];
const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
// `--check` must not touch the tree: a verification step that rewrites the thing it is
// verifying can never fail, and it is how v1's asset gate stayed quiet for a whole release.
const WRITE = !has('--check');
const quality = Number(argv[argv.indexOf('--quality') + 1] || 1);
const qualityScale = { 0: 0.6, 1: 1.55, 2: 2.1 }[quality] ?? 1.55;

function pngBuffer(width, height, rgba) {
  const tmp = path.join(PREVIEW, `_tmp-${Math.random().toString(36).slice(2)}.png`);
  fs.mkdirSync(PREVIEW, { recursive: true });
  writePng(tmp, width, height, rgba);
  const data = fs.readFileSync(tmp);
  fs.unlinkSync(tmp);
  return data;
}

const hash = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);

function tagFor(body, i) {
  const base = body.resolved[i]?.replace(/-(left|right)$/, '') ?? '';
  return THIN_REGIONS.includes(base) ? 235 : base === 'heel' || base === 'plantar-arch' ? 150 : 40;
}

function uvsFor(positions) {
  // Oblique planar mapping: no seams, and pore-scale detail does not care about
  // a mirrored or unfolded UV layout.
  return positions.map((p) => [p[0] * 0.9 + p[1] * 0.35, p[2] * 0.9 + p[1] * 0.35]);
}

function buildFigure(sex, images) {
  const body = buildBody({ sex, quality: qualityScale });
  const thin = body.positions.map((p, i) => tagFor(body, i));
  const glb = buildGlb({
    positions: body.positions,
    normals: body.normals,
    uv: uvsFor(body.positions),
    regionIds: body.regionIds,
    thin,
    tris: body.tris,
    images,
  });
  return { body, glb };
}

/** Region metadata measured from the mesh, never authored by hand. */

function main() {
  fs.mkdirSync(MODELS, { recursive: true });
  fs.mkdirSync(DATA, { recursive: true });
  const tex = skinTextureSet((w, h, rgba) => ({ w, h, rgba }));
  const images = [
    {
      name: 'skin-albedo',
      mime: 'image/png',
      data: pngBuffer(tex.albedo.w, tex.albedo.h, tex.albedo.rgba),
    },
    {
      name: 'skin-normal',
      mime: 'image/png',
      data: pngBuffer(tex.normal.w, tex.normal.h, tex.normal.rgba),
    },
    {
      name: 'skin-roughness',
      mime: 'image/png',
      data: pngBuffer(tex.roughness.w, tex.roughness.h, tex.roughness.rgba),
    },
  ];
  for (const [name, entry] of [
    ['skin-albedo.png', tex.albedo],
    ['skin-normal.png', tex.normal],
    ['skin-orm.png', tex.roughness],
  ]) {
    if (WRITE) fs.writeFileSync(path.join(MODELS, name), pngBuffer(entry.w, entry.h, entry.rgba));
  }

  const report = { generator: 'scripts/build-body-assets.mjs', quality, bodies: {}, regions: 0 };
  let first = null;
  let assets = null;
  const outlines = {};
  for (const sex of ['male', 'female']) {
    const { body, glb } = buildFigure(sex, images);
    outlines[sex] = outline(body);
    if (!first) first = body;
    // The URL carries the digest, so the browser can cache the body forever: a rebuild that
    // changes a triangle changes the filename, and nothing can serve a stale mesh against a
    // fresh region table.
    const assetFile = `body-${sex}.${hash(glb).slice(0, 10)}.glb`;
    (assets ??= {})[sex] = {
      file: assetFile,
      url: `/models/${assetFile}`,
      hash: hash(glb),
      bytes: glb.length,
      triangles: body.triangleCount,
    };
    if (WRITE) {
      fs.writeFileSync(path.join(MODELS, assetFile), glb);
      for (const stale of fs.readdirSync(MODELS)) {
        if (stale.startsWith(`body-${sex}.`) && stale.endsWith('.glb') && stale !== assetFile)
          fs.unlinkSync(path.join(MODELS, stale));
      }
      // v1 shipped an unhashed name; a leftover would let a stale URL resolve silently.
      const legacy = path.join(MODELS, `body-${sex}.glb`);
      if (fs.existsSync(legacy)) fs.unlinkSync(legacy);
    }
    // Sanity gates: a body that fails these must never reach a browser.
    const height = body.bounds.hi[1] - body.bounds.lo[1];
    if (height < 1.55 || height > 1.85)
      throw new Error(`${sex}: unexpected standing height ${height}`);
    if (body.triangleCount < 20000)
      throw new Error(`${sex}: too few triangles (${body.triangleCount})`);
    let untagged = 0;
    for (const id of body.regionIds) if (!id) untagged++;
    if (untagged) throw new Error(`${sex}: ${untagged} vertices without a region id`);
    report.bodies[sex] = {
      triangles: body.triangleCount,
      vertices: body.positions.length,
      bytes: glb.length,
      hash: hash(glb),
      height: Number(height.toFixed(3)),
    };
    if (has('--preview')) {
      const img = renderPanels(body, { highlight: 'lumbar-spine' });
      fs.mkdirSync(PREVIEW, { recursive: true });
      writePng(path.join(PREVIEW, `body-${sex}.png`), img.width, img.height, img.rgba);
    }
  }

  const skel = skeleton();
  if (WRITE)
    fs.writeFileSync(path.join(DATA, 'skeleton.json'), `${JSON.stringify(skel, null, 2)}\n`);
  const regions = regionRecords(first);
  report.regions = regions.length;
  const expected = expandZones();
  const absent = expected.filter((z) => !regions.some((r) => r.id === z.id));
  if (absent.length) {
    throw new Error(
      `regions authored but absent from the mesh (a band never claimed any vertex): ${absent
        .map((a) => a.id)
        .join(', ')}`,
    );
  }
  if (regions.length < 70)
    throw new Error(`only ${regions.length} regions — the brief requires 70+`);
  // A region the size of a fingertip or smaller cannot be tapped on a phone.
  const sparse = regions.filter((r) => r.areaMm2 < 120 || r.triangles < 6);
  if (sparse.length) {
    throw new Error(
      `regions too small to be tappable: ${sparse.map((s) => `${s.id} (${s.areaMm2}mm2)`).join(', ')}`,
    );
  }
  // The clinical annotations on a region row — which patterns it belongs to, what the
  // matcher weighs it at, what to show when the library has nothing for it — are written by
  // `content:build` from these ids, not from this geometry. Rebuild the measured fields and
  // carry everything else across, so `assets:build` on its own can never silently unbind a
  // region from its presentations.
  const previousPath = path.join(DATA, 'regions.json');
  const measured = [
    'id',
    'regionIdValue',
    'base',
    'label',
    'labelAr',
    'family',
    'side',
    'views',
    'group',
    'synonyms',
    'vertexCount',
    'triangles',
    'areaMm2',
    'centroid',
    'focusTarget',
    'focusRadius',
    'focusDistance',
    'neighbours',
  ];
  if (fs.existsSync(previousPath)) {
    let previous = [];
    try {
      previous = JSON.parse(fs.readFileSync(previousPath, 'utf8'));
    } catch {
      console.warn('regions.json was unreadable; writing the geometric fields only');
    }
    const byId = new Map(previous.map((row) => [row.id, row]));
    const merged = regions.map((row) => {
      const was = byId.get(row.id);
      if (!was) return row;
      const next = { ...was };
      for (const key of measured) next[key] = row[key];
      return next;
    });
    regions.length = 0;
    regions.push(...merged);
  }
  if (WRITE) fs.writeFileSync(previousPath, `${JSON.stringify(regions, null, 2)}\n`);
  // Per sex, because the fallback silhouette and its anchors must match the figure the
  // patient actually loaded: bust width and waist shift the outline and the anchors.
  if (WRITE)
    fs.writeFileSync(
      path.join(DATA, 'body-outline.json'),
      `${JSON.stringify({ male: outlines.male, female: outlines.female }, null, 2)}\n`,
    );
  if (WRITE) {
    fs.writeFileSync(
      path.join(MODELS, 'ASSET-REPORT.json'),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    fs.writeFileSync(path.join(DATA, 'models.json'), `${JSON.stringify(assets, null, 2)}\n`);
  }
  if (has('--check')) checkShippedAssets({ MODELS, DATA, report, hash });

  console.log(
    `body assets: ${report.bodies.male.triangles} + ${report.bodies.female.triangles} triangles, ` +
      `${report.regions} regions, ${(
        (report.bodies.male.bytes + report.bodies.female.bytes) /
        1e6
      ).toFixed(2)} MB of GLB`,
  );
}

main();
