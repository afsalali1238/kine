'use client';

/**
 * The movement demonstrator.
 *
 * It is the same geometry, the same material and the same studio as the locator, re-rigged
 * at runtime from `skeleton.json`: one buffer, two roles. Time is an input rather than
 * internal state — the session clock owns elapsed milliseconds, so the metronome, the
 * caption and the figure cannot drift apart — and `autoPlay` exists for the plan preview and
 * the animator.
 *
 * Every angle is clamped by the pattern's range caps before it reaches a bone, so a guarded
 * shoulder demonstrates the prescribed range, not the textbook one.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import {
  CameraRig,
  Studio,
  VIEW,
  buildRegionIndex,
  createSkinMaterial,
  hasWebGL,
  loadBody,
  paintRegions,
  type Focus,
} from '@/modules/body';
import {
  basePoseFor,
  capsFor,
  clampPose,
  combine,
  poseAtTracks,
  segmentsFor,
  tAt,
  totalCycleMs,
  type Side,
} from '@/modules/animation';
import { findExercise, findPresentation, regionById } from '@/lib/content';
import type { ExerciseAnimation } from '@/lib/types';
import { FrameStrip } from './FrameStrip';
import { StageProps } from './Props';
import { applyPose, buildRig, floorLift, type Rig } from './rig';

export type DemonstratorProps = {
  sex: 'male' | 'female';
  animation: ExerciseAnimation;
  exerciseId: string;
  presentationId: string;
  side?: Side;
  cameraId?: 'primary' | 'secondary';
  faultId?: string | null;
  dose?: { sets?: number; reps?: number | null; holdSeconds?: number | null };
  timeRef?: React.MutableRefObject<number>;
  autoPlay?: boolean;
  reducedMotion?: boolean;
  mini?: boolean;
  rigKey?: string;
  className?: string;
  /** Cue index to highlight, reported back for captions and audio. */
  onCue?: (index: number) => void;
};

export function Demonstrator(props: DemonstratorProps) {
  const [support, setSupport] = useState(true);
  useEffect(() => {
    // WebGL support only exists in a browser, and a prerendered shell must match the
    // client's first paint, so this is a post-mount capability read, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupport(hasWebGL());
  }, []);
  const [failed, setFailed] = useState(false);
  const exercise = findExercise(props.exerciseId);
  if (!exercise) return null;
  const flat = !support || failed || props.reducedMotion;

  if (flat) {
    return (
      <div className={`viewer ${props.className ?? ''}`} data-testid="demo-strip">
        <div style={{ padding: 12, width: '100%' }}>
          <FrameStrip
            animation={props.animation}
            side={props.side ?? 'both'}
            view={props.cameraId === 'secondary' ? 'front' : 'side'}
            height={props.mini ? 120 : 190}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`viewer ${props.mini ? '' : 'viewer-fill'} ${props.className ?? ''}`}
      dir="ltr"
      data-testid="demonstrator"
    >
      <Canvas
        shadows={!props.mini}
        dpr={[1, props.mini ? 1.2 : 1.75]}
        frameloop={props.reducedMotion ? 'demand' : 'always'}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: VIEW.fov, near: VIEW.near, far: VIEW.far, position: [0, 1.05, 2.05] }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          scene.background = null;
        }}
      >
        {!props.mini ? <Adaptive /> : null}
        <Suspense fallback={null}>
          <Loader {...props} onFail={() => setFailed(true)} />
        </Suspense>
      </Canvas>
    </div>
  );
}

function Adaptive() {
  const setDpr = useThree((state) => state.setDpr);
  return <PerformanceMonitor onDecline={() => setDpr(1.2)} flipflops={3} />;
}

type Loaded = {
  rig: Rig;
  handle: ReturnType<typeof createSkinMaterial>;
  index: ReturnType<typeof buildRegionIndex>;
};

function Loader(props: DemonstratorProps & { onFail: () => void }) {
  const { sex, rigKey, onFail } = props;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadBody(sex)
      .then(({ geometry, material }) => {
        if (cancelled) return;
        const handle = createSkinMaterial(material, { highlight: '#b5462c' });
        const rig = buildRig(geometry, handle.material, `${sex}:${rigKey ?? 'main'}`);
        setLoaded({ rig, handle, index: buildRegionIndex(rig.geometry) });
      })
      .catch(() => {
        if (!cancelled) onFail();
      });
    return () => {
      cancelled = true;
    };
  }, [sex, rigKey, onFail]);

  if (!loaded) return null;
  return <Playing {...props} rig={loaded.rig} handle={loaded.handle} index={loaded.index} />;
}

type PlayingProps = DemonstratorProps & {
  rig: Rig;
  handle: ReturnType<typeof createSkinMaterial>;
  index: ReturnType<typeof buildRegionIndex>;
};

function Playing(props: PlayingProps) {
  const {
    rig,
    handle,
    index,
    animation,
    exerciseId,
    presentationId,
    faultId = null,
    mini = false,
  } = props;
  const exercise = findExercise(exerciseId)!;
  const presentation = findPresentation(presentationId);
  const local = useRef(0);
  const lastCue = useRef(-1);
  const scene = useThree((state) => state.scene);

  const caps = useMemo(() => capsFor(presentation, exercise), [presentation, exercise]);
  const dose = useMemo(
    () => ({
      ...exercise,
      sets: props.dose?.sets ?? exercise.sets,
      reps: props.dose?.reps !== undefined ? props.dose.reps : exercise.reps,
      holdSeconds:
        props.dose?.holdSeconds !== undefined ? props.dose.holdSeconds : exercise.holdSeconds,
    }),
    [exercise, props.dose],
  );
  const segments = useMemo(() => segmentsFor(animation, dose), [animation, dose]);
  const cycle = useMemo(() => totalCycleMs(segments), [segments]);
  const base = useMemo(() => basePoseFor(animation.basePose), [animation.basePose]);
  const lift = useMemo(() => floorLift(rig.geometry, base.root), [rig, base.root]);
  const tracks = useMemo(() => {
    if (!faultId) return animation.tracks;
    return animation.faultTracks.find((row) => row.faultId === faultId)?.tracks ?? animation.tracks;
  }, [animation, faultId]);

  const focus = useMemo<Focus | null>(() => {
    const entry =
      animation.cameras.find((row) => row.id === (props.cameraId ?? 'primary')) ??
      animation.cameras[0];
    const region = regionById.get(entry?.target ?? animation.highlightRegions[0] ?? '');
    const distance = entry?.distance
      ? Math.max(0.5, Math.min(2.4, entry.distance * 0.55))
      : (region?.focusDistance ?? 1);
    return {
      target: (region?.focusTarget ?? [0, 1.02, 0]) as [number, number, number],
      distance,
      azimuth: ((entry?.azimuth ?? 25) * Math.PI) / 180,
      elevation: Math.PI / 2 - ((entry?.elevation ?? 8) * Math.PI) / 180,
      nonce: entry?.id ?? 'primary',
    };
  }, [animation, props.cameraId]);

  useEffect(() => {
    // three.js objects are mutated directly on purpose: userData is the channel the
    // picker shares with the renderer, and routing it through React state would rebuild
    // the scene graph on every frame.
    // eslint-disable-next-line react-hooks/immutability
    scene.userData.skin = handle;
  }, [scene, handle]);

  useEffect(() => {
    const list = animation.highlightRegions
      .map((id) => regionById.get(id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map((region) => ({
        regionValue: region.regionIdValue,
        intensity: faultId ? 0.4 : 0.7,
        neighbours: region.neighbours
          .map((id) => regionById.get(id)?.regionIdValue ?? 0)
          .filter((value) => value > 0),
      }));
    paintRegions(rig.geometry, index, list);
  }, [animation, index, rig, faultId]);

  useFrame((state, delta) => {
    const ms = props.timeRef
      ? props.timeRef.current
      : props.autoPlay
        ? local.current + delta * 1000
        : 0;
    local.current = ms;
    const position = cycle > 0 ? ms % cycle : 0;
    const { t } = tAt(segments, position);
    const raw = poseAtTracks(tracks as never, t, props.side ?? 'both');
    const pose = clampPose(combine(base.pose, raw), caps).pose;
    applyPose(rig, pose);
    handle.setTime(state.clock.elapsedTime);
    const cueIndex = cueBefore(animation.cues, t);
    if (cueIndex !== lastCue.current) {
      lastCue.current = cueIndex;
      props.onCue?.(cueIndex);
    }
  });

  return (
    <group>
      <Studio mini={mini} shadows={!mini} />
      <group
        position={[0, lift - base.root.drop, 0]}
        rotation={[toRad(base.root.roll), toRad(base.root.pitch), toRad(base.root.yaw)]}
      >
        <primitive object={rig.mesh} />
        <StageProps equipment={exercise.equipment} pose={exercise.positionRequired} />
      </group>
      {!mini ? (
        <CameraRig focus={focus} enabled reducedMotion={Boolean(props.reducedMotion)} />
      ) : null}
    </group>
  );
}

const toRad = (value: number) => (value * Math.PI) / 180;

function cueBefore(cues: { t: number }[], t: number): number {
  let index = -1;
  for (let i = 0; i < cues.length; i++) if (cues[i].t <= t) index = i;
  return index;
}
