'use client';

/**
 * The shared look: three-point lights, a rectangle studio instead of an HDRI file, and a
 * single-frame contact shadow. Both figures mount this, so the demonstrator and the
 * locator are lit identically by construction — not by two copies of a light rig that
 * drift a week later.
 */

import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { LIGHTS } from './lights';

export function Studio({ mini = false, shadows = true }: { mini?: boolean; shadows?: boolean }) {
  return (
    <group>
      <ambientLight intensity={LIGHTS.ambient.intensity} color={LIGHTS.ambient.color} />
      <hemisphereLight intensity={0.24} color="#f5efe4" groundColor="#b3a996" />
      <spotLight
        position={LIGHTS.key.position}
        intensity={LIGHTS.key.intensity}
        color={LIGHTS.key.color}
        angle={LIGHTS.key.angle}
        penumbra={LIGHTS.key.penumbra}
        distance={7}
        decay={1.6}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
      />
      <directionalLight
        position={LIGHTS.fill.position}
        intensity={LIGHTS.fill.intensity}
        color={LIGHTS.fill.color}
      />
      <pointLight
        position={LIGHTS.rim.position}
        intensity={LIGHTS.rim.intensity}
        color={LIGHTS.rim.color}
      />
      <Environment resolution={mini ? 32 : 128}>
        <Lightformer
          form="rect"
          intensity={2.4}
          color="#fff3e2"
          position={[1.6, 2, 2]}
          scale={[3, 3, 1]}
          target={[0, 1, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.1}
          color="#e4ecff"
          position={[-2.4, 1.2, 1.4]}
          scale={[3, 2, 1]}
          target={[0, 1, 0]}
        />
        <Lightformer
          form="ring"
          intensity={1.6}
          color="#ffd9bd"
          position={[-0.6, 1.8, -2.4]}
          scale={[2, 2, 1]}
          target={[0, 1.1, 0]}
        />
      </Environment>
      {shadows ? (
        <ContactShadows
          position={[0, 0.002, 0]}
          scale={2.6}
          resolution={512}
          blur={2.6}
          opacity={0.24}
          far={1.6}
          frames={1}
        />
      ) : null}
    </group>
  );
}
