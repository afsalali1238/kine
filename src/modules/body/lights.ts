/**
 * The three-point rig, as data rather than JSX, so the locator and the demonstrator light
 * their figures identically from one place. No HDRI and no network fetch: the environment
 * comes from three's procedural room, which is what makes the specular response on skin
 * believable offline.
 */

export type LightSetup = {
  key: {
    position: [number, number, number];
    intensity: number;
    color: string;
    angle: number;
    penumbra: number;
  };
  fill: { position: [number, number, number]; intensity: number; color: string };
  rim: { position: [number, number, number]; intensity: number; color: string };
  ambient: { intensity: number; color: string };
  exposure: number;
};

export const LIGHTS: LightSetup = {
  key: {
    position: [1.05, 1.95, 1.35],
    intensity: 22,
    color: '#fff4e2',
    angle: 0.72,
    penumbra: 0.72,
  },
  fill: { position: [-1.35, 1.05, 1.15], intensity: 0.42, color: '#dfe7ff' },
  rim: { position: [-0.55, 1.62, -1.65], intensity: 0.95, color: '#ffd9b8' },
  ambient: { intensity: 0.3, color: '#f2eee6' },
  exposure: 1.05,
};

export const VIEW = { fov: 35, near: 0.08, far: 12 };

export const GROUND = { y: 0, size: 3.4, opacity: 0.2 };
