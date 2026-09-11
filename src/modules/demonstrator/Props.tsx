'use client';

/**
 * The things an exercise needs: wall, chair, step, band, weight, towel, pillow. Flat matte
 * primitives with real dimensions, because a 0.15 m step that looks 0.3 m tall teaches the
 * wrong dose. Props are placed from the base pose, not authored per exercise.
 */

import * as THREE from 'three';
import { useMemo } from 'react';
import type { Exercise } from '@/lib/types';

const propMaterial = (color: string, roughness = 0.85) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

/**
 * Returns the objects to place for one exercise, in model space (y up, +z anterior),
 * positioned against the figure's own proportions rather than floating in the origin.
 */
export function stagePropsFor(
  equipment: Exercise['equipment'],
  pose: Exercise['positionRequired'],
) {
  const list: {
    key: string;
    geometry: 'box' | 'cylinder' | 'torus' | 'plane';
    args: number[];
    position: [number, number, number];
    rotation?: [number, number, number];
    color: string;
  }[] = [];
  if (equipment === 'none') return list;
  if (equipment === 'wall' || pose === 'wall_standing') {
    list.push({
      key: 'wall',
      geometry: 'box',
      args: [1.6, 2.2, 0.05],
      position: [0, 1.1, -0.34],
      color: '#e6e2d6',
    });
  }
  if (equipment === 'chair' || pose === 'seated') {
    list.push({
      key: 'seat',
      geometry: 'box',
      args: [0.46, 0.05, 0.44],
      position: [0, 0.44, 0.02],
      color: '#cbb79c',
    });
    list.push({
      key: 'back',
      geometry: 'box',
      args: [0.46, 0.5, 0.05],
      position: [0, 0.7, -0.2],
      color: '#c4b095',
    });
    for (const x of [-0.2, 0.2]) {
      for (const z of [-0.17, 0.21]) {
        list.push({
          key: `leg-${x}-${z}`,
          geometry: 'cylinder',
          args: [0.02, 0.02, 0.44, 10],
          position: [x, 0.22, z],
          color: '#a89681',
        });
      }
    }
  }
  if (equipment === 'step') {
    list.push({
      key: 'step',
      geometry: 'box',
      args: [0.5, 0.15, 0.36],
      position: [0, 0.075, 0.26],
      color: '#b9c3ac',
    });
  }
  if (equipment === 'weight') {
    list.push({
      key: 'dumbbell',
      geometry: 'cylinder',
      args: [0.055, 0.055, 0.2, 14],
      position: [0.34, 0.86, 0.06],
      rotation: [0, 0, Math.PI / 2],
      color: '#5b6169',
    });
  }
  if (equipment === 'band') {
    list.push({
      key: 'band',
      geometry: 'torus',
      args: [0.28, 0.012, 8, 28],
      position: [0, 1.02, 0.18],
      rotation: [Math.PI / 2, 0, 0],
      color: '#7f9c6f',
    });
  }
  if (
    equipment === 'towel' ||
    equipment === 'pillow' ||
    pose === 'supine' ||
    pose === 'prone' ||
    pose === 'side_lying'
  ) {
    list.push({
      key: 'support',
      geometry: 'box',
      args: [0.9, 0.06, 1.5],
      position: [0, 0.03, 0],
      color: pose === 'supine' || pose === 'side_lying' ? '#dfe3d5' : '#e4e0d3',
    });
  }
  return list;
}

export function StageProps({
  equipment,
  pose,
}: {
  equipment: Exercise['equipment'];
  pose: Exercise['positionRequired'];
}) {
  const items = useMemo(() => stagePropsFor(equipment, pose), [equipment, pose]);
  if (!items.length) return null;
  return (
    <group>
      {items.map((item) => (
        <mesh
          key={item.key}
          position={item.position}
          rotation={item.rotation ?? [0, 0, 0]}
          receiveShadow
          material={materialFor(item.color)}
        >
          {item.geometry === 'box' ? (
            <boxGeometry args={item.args as [number, number, number]} />
          ) : item.geometry === 'cylinder' ? (
            <cylinderGeometry args={item.args as [number, number, number, number]} />
          ) : item.geometry === 'torus' ? (
            <torusGeometry args={item.args as [number, number, number, number]} />
          ) : (
            <planeGeometry args={item.args as [number, number]} />
          )}
        </mesh>
      ))}
    </group>
  );
}

const materials = new Map<string, THREE.MeshStandardMaterial>();

function materialFor(color: string) {
  const existing = materials.get(color);
  if (existing) return existing;
  const created = propMaterial(color);
  materials.set(color, created);
  return created;
}
