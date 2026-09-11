/**
 * The render contract, verified headlessly.
 *
 * There is no GPU in CI, so the tests that matter most are the ones that do not need a
 * framebuffer: does the shipped GLB parse with its region and thickness channels, does every
 * region exist in the vertex data the picker reads, does the runtime rig actually deform the
 * body under a pose, and does a left-sided pin move only the left side. A black canvas and a
 * mis-tagged body both fail here, long before a person sees them.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { loadShippedMesh } from './glb';
import { buildRegionIndex, paintRegions } from '@/modules/body';
import { weldHit, weightsFromPoint, triangleAt } from '@/modules/body/picker-types';
import { buildRig, applyPose, floorLift, skinWeights } from '@/modules/demonstrator/rig';
import { rotationsForPose, setJoint, emptyPose, mirrored, basePoseFor } from '@/modules/animation';
import { drawPose, svgPath } from '@/modules/animation/pose2d';
import { regions } from '@/lib/content';

type Loaded = { geometry: THREE.BufferGeometry };
let loaded: Loaded | null = null;

beforeAll(async () => {
  const mesh = await loadShippedMesh();
  loaded = { geometry: mesh.geometry };
});

const geometry = () => {
  if (!loaded) throw new Error('assets not loaded');
  return loaded.geometry;
};

describe('the shipped body', () => {
  it('parses with the channels the picker and the skin depend on', () => {
    const names = Object.keys(geometry().attributes);
    expect(names).toEqual(
      expect.arrayContaining(['position', 'normal', 'uv', '_regionid', '_thin']),
    );
    expect(geometry().getAttribute('position').count).toBeGreaterThan(20000);
  });

  it('carries every region id in the vertex data, with enough vertices to tap', () => {
    const ids = geometry().getAttribute('_regionid');
    const seen = new Map<number, number>();
    for (let i = 0; i < ids.count; i++) {
      const value = ids.getX(i);
      seen.set(value, (seen.get(value) ?? 0) + 1);
    }
    expect(seen.size).toBe(regions.length);
    for (const region of regions) {
      expect(seen.get(region.regionIdValue) ?? 0, region.id).toBeGreaterThanOrEqual(6);
    }
    expect(seen.get(0) ?? 0, 'untagged vertices').toBe(0);
  });

  it('records a thickness channel so thin skin reads differently', () => {
    const thin = geometry().getAttribute('_thin');
    const values = new Set<number>();
    for (let i = 0; i < thin.count; i += 97) values.add(thin.getX(i));
    expect(values.size).toBeGreaterThan(1);
  });

  it('indexes regions and paints a highlight that fades into the neighbours', () => {
    const index = buildRegionIndex(geometry());
    expect(index.lists.size).toBe(regions.length);
    const region = regionBy('lumbar-spine');
    const neighbour = region.neighbours[0];
    const neighbourRegion = regionBy(neighbour);
    const attribute = geometry().getAttribute('aHi') as THREE.BufferAttribute | undefined;
    expect(attribute, 'aHi is created by painting').toBeUndefined();
    paintRegions(geometry(), index, [
      {
        regionValue: region.regionIdValue,
        intensity: 0.8,
        neighbours: [neighbourRegion.regionIdValue],
      },
    ]);
    const painted = geometry().getAttribute('aHi') as THREE.BufferAttribute;
    const array = painted.array as Float32Array;
    let own = 0;
    let edge = 0;
    for (let i = 0; i < array.length; i++) {
      if (array[i] > 0.6) own++;
      else if (array[i] > 0) edge++;
    }
    expect(own, 'core of the pinned region').toBeGreaterThanOrEqual(region.vertexCount * 0.5);
    expect(edge, 'neighbour falloff').toBeGreaterThan(0);
  });
});

function regionBy(id: string) {
  const row = regions.find((region) => region.id === id);
  if (!row) throw new Error(`unknown region ${id}`);
  return row;
}

describe('welding and hit tests', () => {
  it('lifts a hit onto the surface along a unit normal', () => {
    const welded = weldHit([0.1, 1.2, 0.02], [0, 0, 4], 0.006);
    expect(welded.normal).toEqual([0, 0, 1]);
    expect(welded.point[2]).toBeCloseTo(0.026, 6);
  });

  it('gives the nearest vertex the dominant weight', () => {
    const tri = { a: 0, b: 1, c: 2 };
    const positions = [0, 0, 0, 1, 0, 0, 0, 1, 0];
    const weights = weightsFromPoint(positions, tri, [0.02, 0.01, 0]);
    expect(weights[0]).toBeGreaterThan(weights[1]);
    expect(weights[0]).toBeGreaterThan(weights[2]);
    expect(weights[0] + weights[1] + weights[2]).toBeCloseTo(1, 6);
  });

  it('reads a triangle from the index buffer', () => {
    const tri = triangleAt(geometry(), 0);
    expect(tri).not.toBeNull();
    expect(Math.max(tri!.a, tri!.b, tri!.c)).toBeLessThan(
      geometry().getAttribute('position').count,
    );
  });
});

describe('the runtime rig', () => {
  it('weights every vertex to bones that sum to one', () => {
    const positions = geometry().getAttribute('position').array as Float32Array;
    const { indices, weights } = skinWeights(positions);
    let worst = 0;
    for (let i = 0; i < positions.length / 3; i++) {
      const total = weights[i * 4] + weights[i * 4 + 1] + weights[i * 4 + 2] + weights[i * 4 + 3];
      worst = Math.max(worst, Math.abs(1 - total));
      expect(Number.isFinite(total), `vertex ${i}`).toBe(true);
      expect(indices[i * 4]).toBeLessThan(26);
    }
    expect(worst).toBeLessThan(1e-5);
  });

  it('poses the figure: a knee flexion moves the leg and not the head', () => {
    const rig = buildRig(geometry(), new THREE.MeshStandardMaterial(), 'test:main');
    const at = (name: string) => {
      const point = new THREE.Vector3();
      rig.bones.get(name)!.getWorldPosition(point);
      return point.clone();
    };
    const calfBefore = at('calf_l');
    const headBefore = at('head');
    const pose = setJoint(setJoint(emptyPose('both'), 'knee', 'flexion', 90), 'hip', 'flexion', 88);
    applyPose(rig, pose);
    rig.mesh.updateMatrixWorld(true);
    rig.mesh.skeleton.update();
    const matrices = rig.mesh.skeleton.boneMatrices;
    expect(matrices).not.toBeNull();
    expect(matrices!.every((value) => Number.isFinite(value))).toBe(true);
    expect(at('calf_l').distanceTo(calfBefore)).toBeGreaterThan(0.1);
    expect(at('head').distanceTo(headBefore)).toBeLessThan(0.01);
    // The bind pose must be recoverable, or the locator and the demo would disagree.
    applyPose(rig, emptyPose('both'));
    rig.mesh.updateMatrixWorld(true);
    expect(at('calf_l').distanceTo(calfBefore)).toBeLessThan(1e-6);
  });

  it('lifts a lying figure onto the floor', () => {
    const standing = floorLift(geometry(), { roll: 0, pitch: 0, yaw: 0, drop: 0 });
    const lying = floorLift(geometry(), { roll: -90, pitch: 0, yaw: 0, drop: 0 });
    const seated = floorLift(geometry(), { roll: 0, pitch: 0, yaw: 0, drop: 0.51 });
    expect(standing).toBeLessThan(0.02);
    expect(lying).toBeGreaterThan(0.05);
    expect(seated).toBeCloseTo(standing, 6);
  });

  it('keeps a left-sided pose on the left side only', () => {
    const left = rotationsForPose(setJoint(emptyPose('left'), 'knee', 'flexion', 60));
    const right = rotationsForPose(setJoint(emptyPose('right'), 'knee', 'flexion', 60));
    expect(left.map((row) => row.bone)).toEqual(['calf_l']);
    expect(right.map((row) => row.bone)).toEqual(['calf_r']);
    // Abduction is the axis whose direction genuinely reverses across the sagittal plane: the
    // mirrored side must rotate about its own vector, which is how one record serves both.
    const leftAbduction = rotationsForPose(
      setJoint(emptyPose('left'), 'shoulder', 'abduction', 45),
    );
    const rightAbduction = rotationsForPose(
      setJoint(emptyPose('right'), 'shoulder', 'abduction', 45),
    );
    expect(leftAbduction[0].axis).not.toEqual(rightAbduction[0].axis);
    expect(leftAbduction[0].axis[2]).toBeCloseTo(-rightAbduction[0].axis[2], 6);
    expect(leftAbduction[0].deg).toBeCloseTo(rightAbduction[0].deg, 6);
  });

  it('mirrors a pose by side, not by duplicating records', () => {
    const pose = setJoint(emptyPose('left'), 'shoulder', 'abduction', 45);
    const flip = mirrored(pose);
    expect(flip.side).toBe('right');
    expect(flip.joints).toEqual(pose.joints);
    expect(JSON.stringify(flip) !== JSON.stringify(pose)).toBe(true);
  });

  it('shares one authored record between the two tiers', () => {
    const root = basePoseFor('seated').root;
    expect(root.drop).toBeGreaterThan(0.4);
    const standing = drawPose(emptyPose('both'), 'side');
    const seated = drawPose(basePoseFor('seated').pose, 'side', root);
    const yOf = (drawing: typeof standing) => Math.max(...drawing.segments.map((row) => row.to[1]));
    expect(Math.abs(yOf(standing) - yOf(seated))).toBeGreaterThan(0.05);
    const path = svgPath(seated, 200);
    expect(path.d).toContain('M');
    expect(path.viewBox).toMatch(/^0 0 \d+\.\d+ 200$/);
    expect(path.d).not.toContain('NaN');
  });
});
