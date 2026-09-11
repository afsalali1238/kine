'use client';

/**
 * The body locator: the figure, the pins, and the camera.
 *
 * The pointer model is deliberate, because v1's weakness was a picker that felt like a
 * slideshow:
 *   · a tap on the skin places or moves the active pin — no modal, no separate add button;
 *   · a grabbed pin follows the finger continuously, welded to the surface and oriented by
 *     the triangle normal it stands on;
 *   · dragging across a border re-targets the pin: same point, different anatomy;
 *   · dragging empty space orbits, and a drag that ends like a tap still counts as a tap.
 *
 * Everything degrades to `Fallback2D`, which reads the same region ids, so a device without
 * WebGL gets the same journey rather than a stub.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { regionById } from '@/lib/content';
import { buildRegionIndex } from './regionPick';
import { createSkinMaterial, paintRegions, type SkinHandle } from './skinMaterial';
import { hasWebGL, loadBody } from './assets';
import { useRegionPicker, type PickResult } from './useRegionPicker';
import { CameraRig, REST_FOCUS, focusForRegion, type Focus } from './CameraRig';
import { Fallback2D } from './Fallback2D';
import { LIGHTS, VIEW } from './lights';
import { Studio } from './Studio';

export type LocatorMode = 'explore' | 'pinpoint' | 'confirm' | 'mini';

export type BodyLocatorProps = {
  sex: 'male' | 'female';
  pins: import('@/lib/types').Pin[];
  mode?: LocatorMode;
  view?: 'front' | 'back';
  activePinId?: string | null;
  focusRegionId?: string | null;
  onPick?: (result: PickResult) => void;
  onDragPin?: (pinId: string, result: PickResult) => void;
  onSelectPin?: (pinId: string) => void;
  onPickRegion?: (regionId: string) => void;
  reducedMotion?: boolean;
};

export function BodyLocator(props: BodyLocatorProps) {
  const { sex, view = 'front', mode = 'explore', reducedMotion = false } = props;
  const [support, setSupport] = useState(true);
  useEffect(() => {
    // WebGL support only exists in a browser, and a prerendered shell must match the
    // client's first paint, so this is a post-mount capability read, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupport(hasWebGL());
  }, []);
  const [assets, setAssets] = useState<Assets>({
    geometry: null,
    handle: null,
    index: null,
    progress: 0,
    error: null,
  });
  const [interacting, setInteracting] = useState(false);
  const [flatHover, setFlatHover] = useState<string | null>(null);

  useEffect(() => {
    if (!support) return;
    let cancelled = false;
    loadBody(sex, (ratio) => {
      if (cancelled) return;
      // The reset lives in the callback for the same reason as the load itself: an effect
      // body that sets state synchronously re-renders before it has anything to show.
      setAssets((state) => ({ ...state, progress: Math.max(state.progress, ratio) }));
    })
      .then(({ geometry, material }) => {
        if (cancelled) return;
        setAssets({
          geometry,
          handle: createSkinMaterial(material, { highlight: '#b5462c' }),
          index: buildRegionIndex(geometry),
          progress: 1,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAssets((state) => ({
          ...state,
          progress: 1,
          error: error instanceof Error ? error.message : String(error),
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [sex, support]);

  const ready = Boolean(assets.geometry && assets.handle && assets.index);
  const focus = useMemo<Focus | null>(() => {
    if (mode === 'mini') return null;
    const region = regionById.get(props.focusRegionId ?? props.pins[0]?.regionId ?? '');
    if (!region) return REST_FOCUS;
    return focusForRegion(region, view);
  }, [props.focusRegionId, props.pins, view, mode]);

  if (!support || assets.error) {
    return (
      <Shell mode={mode} loading={false} progress={0} note={assets.error ? ASSET_NOTE : null}>
        <Fallback2D
          sex={sex}
          view={view}
          pins={props.pins}
          activePinId={props.activePinId ?? null}
          hoveredRegion={flatHover}
          onPickRegion={(id) => props.onPickRegion?.(id)}
          onHoverRegion={setFlatHover}
          height={mode === 'mini' ? 300 : 520}
        />
      </Shell>
    );
  }

  return (
    <Shell mode={mode} loading={!ready} progress={assets.progress} note={null}>
      {ready ? (
        <Canvas
          shadows={mode !== 'mini'}
          dpr={[1, mode === 'mini' ? 1.2 : 1.75]}
          frameloop={reducedMotion ? 'demand' : 'always'}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ fov: VIEW.fov, near: VIEW.near, far: VIEW.far, position: [0, 1.02, 2.15] }}
          onCreated={({ gl, scene }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = LIGHTS.exposure;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            scene.background = null;
          }}
        >
          {mode !== 'mini' ? <AdaptiveQuality /> : null}
          <Suspense fallback={null}>
            <Scene
              {...props}
              mode={mode}
              view={view}
              geometry={assets.geometry!}
              handle={assets.handle!}
              index={assets.index!}
              focus={focus}
              interacting={interacting}
              setInteracting={setInteracting}
              reducedMotion={reducedMotion}
            />
          </Suspense>
        </Canvas>
      ) : null}
    </Shell>
  );
}

type Assets = {
  geometry: THREE.BufferGeometry | null;
  handle: SkinHandle | null;
  index: ReturnType<typeof buildRegionIndex> | null;
  progress: number;
  error: string | null;
};

type SceneProps = Required<Pick<BodyLocatorProps, 'pins' | 'mode' | 'view'>> &
  BodyLocatorProps & {
    geometry: THREE.BufferGeometry;
    handle: SkinHandle;
    index: ReturnType<typeof buildRegionIndex>;
    focus: Focus | null;
    interacting: boolean;
    reducedMotion: boolean;
    setInteracting: (value: boolean) => void;
  };

const ASSET_NOTE = 'model unavailable — using the body map';

function Scene(props: SceneProps) {
  const { geometry, handle, index, pins, mode, reducedMotion } = props;
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);
  const activePinId = props.activePinId ?? null;
  const meshRef = useRef<THREE.Mesh>(null);

  const picker = useRegionPicker({
    enabled: mode !== 'mini',
    onPick: (result) => props.onPick?.(result),
    onDrag: (result) => {
      if (activePinId) props.onDragPin?.(activePinId, result);
    },
    onSelect: (id) => props.onSelectPin?.(id),
    onDragState: props.setInteracting,
  });

  useEffect(() => {
    picker.setSkin(meshRef.current);
  });

  useEffect(() => {
    // three.js objects are mutated directly on purpose: userData is the channel the
    // picker shares with the renderer, and routing it through React state would rebuild
    // the scene graph on every frame.
    // eslint-disable-next-line react-hooks/immutability
    scene.userData.skin = handle;
  }, [scene, handle]);

  const hoveredRegion = picker.hovered;
  useEffect(() => {
    const list = pins.map((pin) => ({
      regionValue: regionById.get(pin.regionId)?.regionIdValue ?? 0,
      intensity: Math.max(0.14, Math.min(1, pin.intensity / 10)),
      neighbours: neighbourValues(pin.regionId),
    }));
    if (hoveredRegion && mode !== 'mini' && !pins.some((pin) => pin.regionId === hoveredRegion)) {
      list.push({
        regionValue: regionById.get(hoveredRegion)?.regionIdValue ?? 0,
        intensity: 0.34,
        neighbours: neighbourValues(hoveredRegion),
      });
    }
    paintRegions(geometry, index, list);
    invalidate();
  }, [pins, hoveredRegion, geometry, index, mode, invalidate]);

  return (
    <group>
      <Studio mini={mode === 'mini'} shadows={mode !== 'mini'} />

      {mode !== 'mini' ? (
        <CameraRig focus={props.focus} enabled={!props.interacting} reducedMotion={reducedMotion} />
      ) : null}
    </group>
  );
}

function neighbourValues(regionId: string): number[] {
  const region = regionById.get(regionId);
  if (!region) return [];
  return region.neighbours
    .map((id) => regionById.get(id)?.regionIdValue ?? 0)
    .filter((value) => value > 0);
}

/** Drops resolution when frames slip, which is the only adaptive step that helps on a phone. */
function AdaptiveQuality() {
  const setDpr = useThree((state) => state.setDpr);
  return <PerformanceMonitor onDecline={() => setDpr(1.2)} flipflops={3} />;
}

function Shell({
  children,
  mode,
  loading,
  progress,
  note,
}: {
  children: React.ReactNode;
  mode: LocatorMode;
  loading: boolean;
  progress: number;
  note: string | null;
}) {
  return (
    <div
      className={`viewer ${mode === 'mini' ? '' : 'viewer-fill'}`}
      style={mode === 'mini' ? { minHeight: 300 } : undefined}
      dir="ltr"
      data-testid={`viewer-${mode}`}
    >
      {children}
      {loading ? (
        <>
          <div className="hint" role="status" data-testid="loading-hint">
            {Math.round(progress * 100)}%
          </div>
          <div className="loadbar">
            <i style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }} />
          </div>
        </>
      ) : null}
      {note ? (
        <div className="hint" role="status">
          {note}
        </div>
      ) : null}
    </div>
  );
}
