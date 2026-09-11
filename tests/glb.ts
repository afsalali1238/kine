/**
 * The shipped male body, parsed exactly the way the app parses it, for tests that assert on
 * real buffer data instead of a stand-in.
 *
 * Node has no `Image` element, so three's `ImageLoader` is handed a stub: the GLB embeds its
 * skin textures, and only the geometry matters to these assertions.
 */

import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let mesh: THREE.Mesh | null = null;

export async function loadShippedMesh(): Promise<THREE.Mesh> {
  if (mesh) return mesh;
  (
    THREE as unknown as { ImageLoader: { prototype: Record<string, unknown> } }
  ).ImageLoader.prototype.load = function stub(
    this: unknown,
    _url: string,
    onLoad?: (image: unknown) => void,
  ) {
    const image = { width: 4, height: 4 };
    if (onLoad) queueMicrotask(() => onLoad(image));
    return image;
  };
  (globalThis as Record<string, unknown>).self = globalThis;
  const bytes = readFileSync(new URL('../public/models/body-male.glb', import.meta.url));
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
    new GLTFLoader().parse(
      buffer,
      '',
      (result) => resolve(result as { scene: THREE.Group }),
      reject,
    );
  });
  gltf.scene.traverse((object) => {
    if (!mesh && (object as THREE.Mesh).isMesh) mesh = object as THREE.Mesh;
  });
  if (!mesh) throw new Error('no mesh in the shipped GLB');
  return mesh;
}

/** GLTFLoader lower-cases unknown attributes, so the channels are read by their real names. */
export function attr(geometry: THREE.BufferGeometry, name: string) {
  return geometry.getAttribute(name.toLowerCase()) as THREE.BufferAttribute;
}
