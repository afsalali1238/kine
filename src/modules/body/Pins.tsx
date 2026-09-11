'use client';

/**
 * Pain markers. Each pin is welded to the skin: its position is the hit point offset along
 * the surface normal of the triangle under the finger, and its orientation is that normal,
 * so a pin on the temple or the sole stands up off the surface instead of sticking through
 * the figure. Dragging is continuous — the pointer is not required to stay on the pin.
 */

import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { Pin } from '@/lib/types';
import { pinScaleFor } from './picker-types';
import { regionById } from '@/lib/content';

type Props = {
  pins: Pin[];
  activeId: string | null;
  _draggingId: string | null;
  onGrab: (id: string, event: ThreeEvent<PointerEvent>) => void;
  onHover: (id: string | null) => void;
};

const UP = new THREE.Vector3(0, 1, 0);

export function Pins({ pins, activeId, _draggingId, onGrab, onHover }: Props) {
  const dpr = useThree((state) => state.viewport.dpr);
  const quaternion = useMemo(() => new THREE.Quaternion(), []);
  const normal = useMemo(() => new THREE.Vector3(), []);

  return (
    <group>
      {pins.map((pin) => {
        const area = regionById.get(pin.regionId)?.areaMm2 ?? 20000;
        const scale = pinScaleFor(area) * (1 / Math.max(0.75, Math.min(1.6, dpr)));
        normal.set(pin.normal[0], pin.normal[1], pin.normal[2]);
        if (normal.lengthSq() < 1e-6) normal.set(0, 0, 1);
        quaternion.setFromUnitVectors(UP, normal.normalize());
        const isActive = activeId === pin.id;
        const size = (isActive ? 0.0135 : 0.011) * scale;
        const stem = 0.02 * scale;
        const hue = pin.intensity >= 7 ? '#a2402b' : pin.intensity >= 4 ? '#b8842a' : '#5c7f52';
        return (
          <group key={pin.id} position={pin.point} quaternion={quaternion} renderOrder={4}>
            <mesh
              onPointerDown={(event) => {
                event.stopPropagation();
                onGrab(pin.id, event);
              }}
              onPointerOver={(event) => {
                event.stopPropagation();
                onHover(pin.id);
              }}
              onPointerOut={() => onHover(null)}
            >
              {/* Invisible fat hit target: 44 CSS px is impossible in metres at arm's
                  length, so the touch area is generous and the visual stays small. */}
              <cylinderGeometry args={[size * 3.1, size * 3.1, 0.03, 12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <mesh position={[0, stem / 2, 0]} raycast={() => null}>
              <cylinderGeometry args={[size * 0.16, size * 0.16, stem, 8]} />
              <meshStandardMaterial color="#fdfcf7" roughness={0.55} metalness={0} />
            </mesh>
            <mesh position={[0, stem, 0]} raycast={() => null}>
              <sphereGeometry args={[size, 20, 14]} />
              <meshStandardMaterial
                color={hue}
                roughness={0.32}
                metalness={0}
                emissive={hue}
                emissiveIntensity={isActive ? 0.55 : 0.22}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0012, 0]} raycast={() => null}>
              <ringGeometry args={[size * 1.5, size * 2.1, 26]} />
              <meshBasicMaterial
                color={hue}
                transparent
                opacity={isActive ? 0.55 : 0.34}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
