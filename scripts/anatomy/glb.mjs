/**
 * Minimal glTF-binary writer for the generated body.
 *
 * We hand-roll the GLB rather than depend on an exporter: the file needs attributes
 * no exporter knows about (`_REGIONID`, `_THIN`), and a byte-stable pipeline means a
 * regenerated asset is reviewable in a diff.
 *
 * Skinning deliberately lives outside this file — see DECISIONS.md. The demonstrator
 * reuses the locator geometry and is skinned at runtime from `src/data/skeleton.json`
 * with the same deterministic falloff, so both figures are the same mesh under the
 * same material by construction.
 */

const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;
const GLTF = 0x46546c67;
const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;

const SIZES = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };
const WIDTH = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

class Bin {
  constructor() {
    this.chunks = [];
    this.length = 0;
    this.views = [];
    this.accessors = [];
  }

  align(n) {
    const pad = (n - (this.length % n)) % n;
    if (pad) {
      this.chunks.push(Buffer.alloc(pad));
      this.length += pad;
    }
  }

  append(data) {
    this.chunks.push(data);
    this.length += data.length;
    return this.length - data.length;
  }

  /** @returns {number} accessor index */
  attribute(values, { type, componentType, normalized = false, minMax = false, target }) {
    const size = SIZES[componentType];
    const comps = WIDTH[type];
    this.align(size);
    const payload = nodeView(values, componentType);
    const view = { buffer: 0, byteOffset: this.append(payload), byteLength: payload.length };
    if (target) view.target = target;
    this.views.push(view);
    const accessor = {
      bufferView: this.views.length - 1,
      componentType,
      count: Math.floor(values.length / comps),
      type,
    };
    if (normalized) accessor.normalized = true;
    if (minMax) {
      const lo = new Array(comps).fill(Infinity);
      const hi = new Array(comps).fill(-Infinity);
      for (let i = 0; i < values.length; i++) {
        const c = i % comps;
        lo[c] = Math.min(lo[c], values[i]);
        hi[c] = Math.max(hi[c], values[i]);
      }
      accessor.min = lo;
      accessor.max = hi;
    }
    this.accessors.push(accessor);
    return this.accessors.length - 1;
  }

  image(data) {
    this.align(4);
    this.views.push({ buffer: 0, byteOffset: this.append(data), byteLength: data.length });
    return this.views.length - 1;
  }

  toBuffer() {
    this.align(4);
    return Buffer.concat(this.chunks, this.length);
  }
}

function nodeView(values, componentType) {
  if (componentType === 5126) return Buffer.from(Float32Array.from(values).buffer);
  if (componentType === 5123) return Buffer.from(Uint16Array.from(values).buffer);
  if (componentType === 5125) return Buffer.from(Uint32Array.from(values).buffer);
  return Buffer.from(Uint8Array.from(values).buffer);
}

const flatten = (rows, k) => {
  const out = new Float32Array(rows.length * k);
  for (let i = 0; i < rows.length; i++) for (let c = 0; c < k; c++) out[i * k + c] = rows[i][c];
  return out;
};

/**
 * @param {object} input
 * @param {number[][]} input.positions
 * @param {number[][]} input.normals
 * @param {number[]} input.regionIds
 * @param {number[]} [input.thin]
 * @param {number[][]} input.tris
 * @param {{name:string,mime:string,data:Buffer}[]} [input.images]
 * @param {string} [input.materialName]
 * @returns {Buffer} a complete .glb
 */
export function buildGlb(input) {
  const bin = new Bin();
  const attributes = {
    POSITION: bin.attribute(flatten(input.positions, 3), {
      type: 'VEC3',
      componentType: 5126,
      minMax: true,
      target: ARRAY_BUFFER,
    }),
    NORMAL: bin.attribute(flatten(input.normals, 3), {
      type: 'VEC3',
      componentType: 5126,
      target: ARRAY_BUFFER,
    }),
    TEXCOORD_0: bin.attribute(flatten(input.uv ?? input.positions.map(() => [0, 0]), 2), {
      type: 'VEC2',
      componentType: 5126,
      target: ARRAY_BUFFER,
    }),
    _REGIONID: bin.attribute(input.regionIds, {
      type: 'SCALAR',
      componentType: 5123,
      target: ARRAY_BUFFER,
    }),
    _THIN: bin.attribute(input.thin ?? new Array(input.positions.length).fill(0), {
      type: 'SCALAR',
      componentType: 5121,
      normalized: true,
      target: ARRAY_BUFFER,
    }),
  };
  const idx = [];
  for (const t of input.tris) idx.push(t[0], t[1], t[2]);
  const componentType = input.positions.length < 65536 ? 5123 : 5125;
  const indices = bin.attribute(Float32Array.from(idx), {
    type: 'SCALAR',
    componentType,
    target: ELEMENT_ARRAY_BUFFER,
  });

  const images = [];
  const textures = [];
  for (const img of input.images ?? []) {
    images.push({ mimeType: img.mime, name: img.name, bufferView: bin.image(img.data) });
    textures.push({ source: textures.length, sampler: 0 });
  }

  const pbr = { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.56 };
  if (textures.length) {
    pbr.baseColorTexture = { index: 0 };
    pbr.roughnessFactor = 1;
    if (textures.length > 2) pbr.metallicRoughnessTexture = { index: 2 };
  }
  const material = {
    name: input.materialName ?? 'Skin',
    doubleSided: false,
    pbrMetallicRoughness: pbr,
  };

  const json = {
    asset: { version: '2.0', generator: 'kine v2 · scripts/build-body-assets.mjs' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'Body', mesh: 0 }],
    meshes: [{ name: 'Body', primitives: [{ attributes, indices, material: 0 }] }],
    materials: [material],
    accessors: bin.accessors,
    bufferViews: bin.views,
    buffers: [],
  };
  if (images.length) {
    json.images = images;
    json.textures = textures;
    json.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }];
    material.normalTexture = { index: 1 % textures.length, scale: 0.35 };
  }

  const binary = bin.toBuffer();
  json.buffers = [{ byteLength: binary.length }];
  let jsonStr = JSON.stringify(json);
  while (jsonStr.length % 4 !== 0) jsonStr += ' ';
  const jsonBuf = Buffer.from(jsonStr, 'utf8');
  const out = Buffer.alloc(12 + 8 + jsonBuf.length + 8 + binary.length);
  out.writeUInt32LE(GLTF, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jsonBuf.length, 12);
  out.writeUInt32LE(CHUNK_JSON, 16);
  jsonBuf.copy(out, 20);
  out.writeUInt32LE(binary.length, 20 + jsonBuf.length);
  out.writeUInt32LE(CHUNK_BIN, 24 + jsonBuf.length);
  binary.copy(out, 28 + jsonBuf.length);
  return out;
}
