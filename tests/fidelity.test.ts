/**
 * The two promises the 3D rebuild is staked on, asserted instead of narrated.
 *
 * 1. The figure that demonstrates a movement is the same body the patient marked — not a
 *    second model that happens to look alike. The rig is built from the shipped geometry and
 *    painted with the shipped material instance, so drift is structurally impossible; these
 *    tests fail if that ever stops being true.
 * 2. An edit to a keyframe breaks the signature the approval rests on. Every published record
 *    in the library must still hash to its own `contentHash`, and changing one degree must
 *    change the digest — which is what clears the approval on `/admin/animator`.
 */

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { attr, loadShippedMesh } from './glb';
import { buildRig, disposeRigs } from '@/modules/demonstrator/rig';
import { createSkinMaterial } from '@/modules/body/skinMaterial';
import { hashAnimation, payloadOf } from '@/modules/demonstrator/overrides';
import { animations } from '@/lib/content';
import type { ExerciseAnimation } from '@/lib/types';

describe('the demonstrator is the locator', () => {
  it('skins the shipped geometry without reordering a single vertex', async () => {
    const mesh = await loadShippedMesh();
    const source = mesh.geometry as THREE.BufferGeometry;
    const rig = buildRig(source, mesh.material as THREE.Material, 'test:same-body');
    for (const name of ['position', 'normal', 'uv', '_regionid', '_thin']) {
      const before = attr(source, name);
      const after = attr(rig.geometry, name);
      expect(after.count, name).toBe(before.count);
      expect(Array.from(after.array as ArrayLike<number>), name).toEqual(
        Array.from(before.array as ArrayLike<number>),
      );
    }
    // The skin channels are added; nothing authored is replaced.
    expect(rig.geometry.hasAttribute('skinWeight')).toBe(true);
    expect(rig.geometry).not.toBe(source);
    disposeRigs();
  });

  it('paints the demonstrated figure with the same material instance', async () => {
    const mesh = await loadShippedMesh();
    const handle = createSkinMaterial(mesh.material as THREE.MeshStandardMaterial);
    const rig = buildRig(mesh.geometry as THREE.BufferGeometry, handle.material, 'test:material');
    expect(rig.mesh.material).toBe(handle.material);
    expect(handle.material.name).toBe('kine-skin');
    disposeRigs();
  });

  it('clones the shading but keeps the shipped textures, never a second set', () => {
    const map = new THREE.Texture();
    const normalMap = new THREE.Texture();
    const source = new THREE.MeshStandardMaterial({ map, normalMap });
    const handle = createSkinMaterial(source, { highlight: '#b5462c' });
    expect(handle.material.map).toBe(map);
    expect(handle.material.normalMap).toBe(normalMap);
    // The shading contract the asset spec promises, checked on the object that renders it.
    expect(handle.material.roughness).toBe(1);
    expect(handle.material.metalness).toBe(0);
    expect(handle.material.flatShading).toBe(false);
  });
});

describe('the signature chain', () => {
  const sample = () => {
    if (!animations.length) throw new Error('no animation records built');
    return animations;
  };

  it('signs every published record in the library', async () => {
    const rows = sample();
    expect(rows.length).toBeGreaterThan(100);
    const broken: string[] = [];
    for (const row of rows) {
      const hash = await hashAnimation(row);
      if (hash !== row.contentHash) broken.push(`${row.exerciseId}: ${hash} != ${row.contentHash}`);
    }
    expect(broken).toEqual([]);
  });

  it('changes the digest when one degree changes', async () => {
    const row = structuredClone(sample()[0]) as ExerciseAnimation;
    const before = await hashAnimation(row);
    const track = row.tracks[0];
    if (!track) throw new Error('this record needs a track');
    track.keyframes[track.keyframes.length - 1].deg += 1;
    const after = await hashAnimation(row);
    expect(after).not.toBe(before);
  });

  it('ignores approval fields, so signing is about the movement', async () => {
    const row = sample()[0];
    const payload = payloadOf(row);
    const edited = structuredClone(row) as ExerciseAnimation & {
      reviewedBy?: string | null;
      status?: string;
    };
    edited.status = 'draft';
    edited.reviewedBy = 'someone';
    expect(payloadOf(edited)).toBe(payload);
    expect(await hashAnimation(edited)).toBe(await hashAnimation(row));
  });
});
