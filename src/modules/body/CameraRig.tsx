'use client';

/**
 * Camera: one finger orbits, two fingers zoom, and a focus request glides to the region
 * that was just tapped. The transition is exponential damping toward a spherical goal, so
 * a tap never snaps the figure out from under the finger, and reduced motion snaps instead.
 */

import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export type Focus = {
  target: [number, number, number];
  distance: number;
  azimuth: number;
  elevation?: number;
  /** Any value that changes when the same region should be re-focused (e.g. re-tapped). */
  nonce?: string | number;
};

type Props = {
  focus: Focus | null;
  enabled: boolean;
  reducedMotion: boolean;
  /** Front view is azimuth 0, back view is π; portrait framing sets the distance. */
  fitHeight?: number;
};

export function CameraRig({ focus, enabled, reducedMotion, fitHeight = 1.62 }: Props) {
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((state) => state.camera);
  const goal = useRef<{
    position: THREE.Vector3;
    target: THREE.Vector3;
    until: number;
  } | null>(null);
  const scratch = useMemo(() => ({ sph: new THREE.Spherical(), vec: new THREE.Vector3() }), []);

  useEffect(() => {
    if (!focus) return;
    const target = new THREE.Vector3(...focus.target);
    const distance = Math.max(0.32, focus.distance * (fitHeight / 1.62));
    const elevation = focus.elevation ?? 1.42;
    const position = scratch.vec
      .setFromSphericalCoords(distance, elevation, focus.azimuth)
      .add(target)
      .clone();
    goal.current = {
      position,
      target,
      until: performance.now() + (reducedMotion ? 0 : 620),
    };
    if (reducedMotion) {
      camera.position.copy(position);
      controls.current?.target.copy(target);
      controls.current?.update();
    }
  }, [focus, camera, reducedMotion, fitHeight, scratch]);

  useFrame((state, delta) => {
    const pending = goal.current;
    if (!pending) return;
    if (pending.until < state.clock.elapsedTime * 1000 && performance.now() > pending.until) {
      goal.current = null;
      return;
    }
    const damping = 1 - Math.exp(-7.5 * Math.min(0.05, delta));
    camera.position.lerp(pending.position, damping);
    const control = controls.current;
    if (control) {
      control.target.lerp(pending.target, damping);
      control.update();
    }
    if (camera.position.distanceTo(pending.position) < 0.004) goal.current = null;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={enabled}
      enablePan={false}
      enableDamping={!reducedMotion}
      dampingFactor={0.08}
      rotateSpeed={0.62}
      zoomSpeed={0.85}
      minDistance={0.3}
      maxDistance={2.6}
      minPolarAngle={0.22}
      maxPolarAngle={Math.PI - 0.18}
      target={[0, 1.02, 0]}
    />
  );
}

/** Front and back poses for the same region, from its focus parameters. */
export function focusForRegion(
  region: { focusTarget: [number, number, number]; focusDistance: number },
  side: 'front' | 'back',
): Focus {
  return {
    target: region.focusTarget,
    distance: region.focusDistance,
    azimuth: side === 'front' ? 0 : Math.PI,
    elevation: 1.46,
    nonce: Date.now(),
  };
}

export const REST_FOCUS: Focus = {
  target: [0, 0.98, 0],
  distance: 2.1,
  azimuth: 0,
  elevation: 1.5,
};
