'use client';

/**
 * The pointer state machine for the body stage.
 *
 *   tap the skin      → the active pin lands on that region, welded to the surface
 *   drag a pin        → continuous welding along the skin; the region changes as it crosses
 *   drag anywhere else→ orbit (the controls own that, this hook stays out of the way)
 *   tap a pin         → select it, so intensity and removal apply to the right marker
 *
 * Raycasting is budgeted rather than per-event: a 120 Hz phone emits far more moves than a
 * 46k-triangle intersect can answer, so hits are collected and applied once per frame, and
 * a cast that overruns the budget drops the rate instead of dropping frames.
 */

import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  regionByValue,
  triangleAt,
  weldHit,
  weightsFromPoint,
  type PickResult,
} from './picker-types';

export type { PickResult } from './picker-types';

type Options = {
  enabled: boolean;
  onPick: (result: PickResult) => void;
  onDrag: (result: PickResult) => void;
  onSelect: (pinId: string) => void;
  onDragState: (dragging: boolean) => void;
};

export function useRegionPicker({ enabled, onPick, onDrag, onSelect, onDragState }: Options) {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const raycaster = useRef(new THREE.Raycaster());
  const skin = useRef<THREE.Mesh | null>(null);
  const queued = useRef<PickResult | null>(null);
  const lastCast = useRef(0);
  const minInterval = useRef(16);
  const dragId = useRef<string | null>(null);
  const ndc = useRef(new THREE.Vector2());
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const down = useRef<{ x: number; y: number; time: number; pinId: string | null } | null>(null);
  const moved = useRef(0);

  const setSkin = useCallback((mesh: THREE.Mesh | null) => {
    skin.current = mesh;
  }, []);

  const hitFrom = useCallback(
    (
      point: THREE.Vector3,
      face: { a: number; b: number; c: number; normal: THREE.Vector3 } | null,
      faceIndex: number | null,
      object: THREE.Object3D,
    ): PickResult | null => {
      if (!face || faceIndex === null) return null;
      const mesh = object as THREE.Mesh;
      const geometry = mesh.geometry as THREE.BufferGeometry;
      const tri = triangleAt(geometry, faceIndex);
      if (!tri) return null;
      const local = mesh.worldToLocal(point.clone());
      const positions = geometry.getAttribute('position').array as ArrayLike<number>;
      const weights = weightsFromPoint(positions, tri, [local.x, local.y, local.z]);
      const value = regionValue(geometry, tri, weights);
      const region = value === null ? undefined : regionByValue.get(value);
      if (!region) return null;
      const normal = face.normal
        .clone()
        .applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld))
        .normalize();
      const welded = weldHit([point.x, point.y, point.z], [normal.x, normal.y, normal.z], 0.006);
      return { regionId: region.id, point: welded.point, normal: welded.normal };
    },
    [],
  );

  const castFromPointer = useCallback(
    (clientX: number, clientY: number): PickResult | null => {
      const mesh = skin.current;
      const element = gl.domElement;
      if (!mesh) return null;
      const rect = element.getBoundingClientRect();
      ndc.current.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(ndc.current, camera);
      const hits = raycaster.current.intersectObject(mesh, false);
      const hit = hits[0];
      if (!hit) return null;
      return hitFrom(hit.point, hit.face ?? null, hit.faceIndex ?? null, hit.object);
    },
    [camera, gl, hitFrom],
  );

  // One application per frame, whatever the pointer device threw at us in between.
  useFrame((state) => {
    const result = queued.current;
    if (!result) return;
    queued.current = null;
    onDrag(result);
    void state;
  });

  useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => {
      moved.current = Math.max(
        moved.current,
        Math.hypot(event.clientX - (down.current?.x ?? 0), event.clientY - (down.current?.y ?? 0)),
      );
      const now = performance.now();
      if (now - lastCast.current < minInterval.current) return;
      const started = performance.now();
      const hit = castFromPointer(event.clientX, event.clientY);
      lastCast.current = now;
      const cost = performance.now() - started;
      minInterval.current =
        cost > 9
          ? Math.min(80, minInterval.current * 1.5)
          : Math.max(16, minInterval.current * 0.9);
      if (hit) queued.current = hit;
    };
    const finish = () => {
      setDragging(false);
      onDragState(false);
      dragId.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, [dragging, castFromPointer, onDragState]);

  const onPointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!enabled) return;
      down.current = {
        x: event.nativeEvent.clientX,
        y: event.nativeEvent.clientY,
        time: Date.now(),
        pinId: null,
      };
      moved.current = 0;
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!enabled || dragId.current) return;
      const hit = hitFrom(event.point, event.face ?? null, event.faceIndex ?? null, event.object);
      setHovered(hit ? hit.regionId : null);
    },
    [enabled, hitFrom],
  );

  const onPointerUp = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!enabled || dragId.current) return;
      const start = down.current;
      down.current = null;
      if (!start) return;
      if (moved.current > 24) return;
      const hit = hitFrom(event.point, event.face ?? null, event.faceIndex ?? null, event.object);
      if (hit) onPick(hit);
    },
    [enabled, hitFrom, onPick],
  );

  const onPointerOut = useCallback(() => setHovered(null), []);

  const grabPin = useCallback(
    (pinId: string, event: ThreeEvent<PointerEvent>) => {
      if (!enabled) return;
      event.stopPropagation();
      onSelect(pinId);
      down.current = {
        x: event.nativeEvent.clientX,
        y: event.nativeEvent.clientY,
        time: Date.now(),
        pinId,
      };
      moved.current = 0;
      dragId.current = pinId;
      setDragging(true);
      onDragState(true);
    },
    [enabled, onDragState, onSelect],
  );

  useEffect(() => {
    // three.js objects are mutated directly on purpose: userData is the channel the
    // picker shares with the renderer, and routing it through React state would rebuild
    // the scene graph on every frame.
    // eslint-disable-next-line react-hooks/immutability
    scene.userData.dragging = dragging;
  }, [dragging, scene]);

  return {
    setSkin,
    hovered,
    dragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerOut,
    grabPin,
    castFromPointer,
  };
}

function regionValue(
  geometry: THREE.BufferGeometry,
  tri: { a: number; b: number; c: number },
  weights: [number, number, number],
): number | null {
  const ids =
    (geometry.getAttribute('_regionid') as THREE.BufferAttribute | undefined) ??
    (geometry.getAttribute('_REGIONID') as THREE.BufferAttribute | undefined);
  if (!ids) return null;
  const list = [ids.getX(tri.a), ids.getX(tri.b), ids.getX(tri.c)];
  if (list[0] === list[1] && list[1] === list[2]) return list[0];
  const order = [0, 1, 2].sort((a, b) => weights[b] - weights[a]);
  for (const i of order) {
    const others = order.filter((j) => j !== i);
    const agreed = others.every((j) => list[j] === list[i] && weights[j] > 0.08);
    if (agreed || weights[i] > 0.66) return list[i];
  }
  return list[order[0]];
}
