'use client';

/**
 * The body itself: one geometry, one material, shared with the demonstrator. Breathing is
 * a transform on the wrapper, never a geometry rewrite, and it stops while the patient is
 * dragging a pin so the hit test cannot drift under their finger.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

type Props = {
  breathing: boolean;
  highlight: boolean;
  children?: React.ReactNode;
};

export function Figure({ breathing, highlight, children }: Props) {
  const group = useRef<THREE.Group>(null);
  const clock = useRef(0);
  const lastPaint = useRef(0);

  useFrame((state, delta) => {
    const target = group.current;
    if (!target) return;
    const active = breathing && !state.scene.userData.dragging;
    if (active) {
      clock.current += delta;
      if (clock.current - lastPaint.current > 1 / 24) {
        lastPaint.current = clock.current;
        const phase = clock.current * 1.05;
        const swell = Math.sin(phase) * 0.0022 + Math.sin(phase * 2.3) * 0.0007;
        target.scale.set(1 + swell * 0.5, 1 + swell * 0.25, 1 + swell);
        if (highlight) {
          state.scene.userData.skin?.setTime?.(clock.current);
        }
      }
    } else if (target.scale.x !== 1) {
      target.scale.set(1, 1, 1);
    }
  });

  // The breathing transform lives on the wrapper, so the pick target inside it moves with
  // it and the raycast can never disagree with what the eye sees.
  return (
    <group ref={group} name="figure">
      {children}
    </group>
  );
}
