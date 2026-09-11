/**
 * The skin material, shared by the locator and the demonstrator so the two figures are
 * the same object under the same light.
 *
 * Shader surgery is kept to one injection: a per-vertex highlight channel (`aHi`) mixed
 * into the finished fragment. Everything else that makes the figure read as skin — the
 * albedo/normal/ORM set, the room environment, the warm rim, ACES tone mapping, the
 * breathing — is scene or texture work, because an unverified custom lighting model is the
 * kind of change that ships a black figure.
 */

import * as THREE from 'three';
import type { RegionIndex } from './regionPick';
import { attr } from './assets';

export type SkinOptions = {
  highlight?: THREE.ColorRepresentation;
  pulse?: number;
};

export type SkinHandle = {
  material: THREE.MeshStandardMaterial;
  uniforms: { uHiColor: { value: THREE.Color }; uHiPulse: { value: number } };
  setTime: (seconds: number) => void;
};

export function createSkinMaterial(
  source: THREE.MeshStandardMaterial | undefined,
  options: SkinOptions = {},
): SkinHandle {
  const material = source ? source.clone() : new THREE.MeshStandardMaterial({ color: '#d9b199' });
  material.name = 'kine-skin';
  material.metalness = 0;
  material.roughness = 1;
  material.envMapIntensity = 0.6;
  material.flatShading = false;

  const uniforms = {
    uHiColor: { value: new THREE.Color(options.highlight ?? '#b5462c') },
    uHiPulse: { value: options.pulse ?? 0 },
  };

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHiColor = uniforms.uHiColor;
    shader.uniforms.uHiPulse = uniforms.uHiPulse;
    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      ['attribute float aHi;', 'varying float vHi;', 'void main() {', '  vHi = aHi;'].join('\n'),
    );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        [
          'uniform vec3 uHiColor;',
          'uniform float uHiPulse;',
          'varying float vHi;',
          'void main() {',
        ].join('\n'),
      )
      .replace(
        '#include <dithering_fragment>',
        [
          '  float hi = clamp( vHi, 0.0, 1.0 );',
          '  float pulse = 0.88 + 0.12 * sin( uHiPulse * 2.4 );',
          '  gl_FragColor.rgb = mix( gl_FragColor.rgb, uHiColor, hi * 0.34 * pulse );',
          '  gl_FragColor.rgb += vec3( 0.22, 0.05, 0.02 ) * hi * hi * 0.55;',
          '  gl_FragColor.rgb *= 1.0 + hi * 0.06;',
          '  #include <dithering_fragment>',
        ].join('\n'),
      );
  };
  material.customProgramCacheKey = () => 'kine-skin';
  material.needsUpdate = true;
  return { material, uniforms, setTime: (seconds) => (uniforms.uHiPulse.value = seconds) };
}

export function ensureHighlightChannel(geometry: THREE.BufferGeometry) {
  if (geometry.getAttribute('aHi')) return geometry.getAttribute('aHi') as THREE.BufferAttribute;
  const count = geometry.getAttribute('position').count;
  const attribute = new THREE.BufferAttribute(new Float32Array(count), 1);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aHi', attribute);
  return attribute;
}

export type PaintInput = {
  /** The `_REGIONID` value, not the region id string. */
  regionValue: number;
  intensity: number;
  /** Neighbour regions, already resolved to their `_REGIONID` values. */
  neighbours?: number[];
};

/**
 * Writes the highlight channel for the pinned regions. Region neighbours get a quarter of
 * the intensity, which is both a softer edge and an honest statement: the borders between
 * muscles in this atlas are authored bands, not measured separations.
 */
export function paintRegions(
  geometry: THREE.BufferGeometry,
  index: RegionIndex,
  regionList: PaintInput[],
): void {
  const attribute = ensureHighlightChannel(geometry);
  const array = attribute.array as Float32Array;
  array.fill(0);
  const thin = attr(geometry, '_THIN');
  const thinArray = thin ? (thin.array as ArrayLike<number>) : null;

  for (const input of regionList) {
    const list = index.lists.get(input.regionValue);
    if (!list) continue;
    const strength = Math.max(0, Math.min(1, input.intensity));
    for (let i = 0; i < list.length; i++) {
      const vertex = list[i];
      const thinFactor = thinArray ? 0.78 + (thinArray[vertex] / 255) * 0.4 : 1;
      array[vertex] = Math.max(array[vertex], strength * thinFactor);
    }
    for (const neighbour of input.neighbours ?? []) {
      const neighbourList = index.lists.get(neighbour);
      if (!neighbourList) continue;
      for (let i = 0; i < neighbourList.length; i++) {
        const vertex = neighbourList[i];
        array[vertex] = Math.max(array[vertex], strength * 0.26);
      }
    }
  }
  attribute.needsUpdate = true;
}
