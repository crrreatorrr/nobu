// Shrinks the Higgsfield GLBs in public/assets/models in place: textures resized and re-encoded as
// WebP (EXT_texture_webp), geometry meshopt-compressed (EXT_meshopt_compression; Assets wires
// three's MeshoptDecoder). A GLB that already uses EXT_meshopt_compression is skipped, so this is
// safe to re-run after adding a new raw GLB. The originals stay in git history (before this tool).
//
//   npm i --no-save @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer sharp
//   node tools/optimize_glbs.mjs [--dir public/assets/models] [--dry]
//
// Texture sizes: on screen these models are at most a few hundred pixels tall at game resolution,
// so 512² keeps every texel the screen can show for props, enemies and dogs; Nobu (follow camera,
// title close-up) and the boss models (and the two models the Roomba Titan and Pump Queen are made
// from) keep 1024².
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const DIR = opt('--dir', new URL('../public/assets/models/', import.meta.url).pathname);
const DRY = args.includes('--dry');

let core, ext, fn, meshopt, sharp;
try {
  core = await import('@gltf-transform/core');
  ext = await import('@gltf-transform/extensions');
  fn = await import('@gltf-transform/functions');
  meshopt = await import('meshoptimizer');
  sharp = (await import('sharp')).default;
} catch {
  console.error('Needs @gltf-transform/{core,extensions,functions}@4, meshoptimizer and sharp (see the header).');
  process.exit(2);
}
const { NodeIO } = core;
const { ALL_EXTENSIONS, EXTMeshoptCompression } = ext;
const { dedup, prune, reorder, quantize, textureCompress } = fn;
const { MeshoptEncoder, MeshoptDecoder } = meshopt;

const TEXTURE_SIZE = {
  nobu: 1024, mecha_bird: 1024, big_cat: 1024, evil_cone: 1024, vacuum: 1024, pill_bot: 1024, sproto_mask: 1024,
};
const DEFAULT_SIZE = 512;
// Bosses re-rig these meshes at runtime (src/bosses/autorig.js, pumpQueen.js bakeQueenRestPose) by
// writing new vertex positions. Quantized (normalized int16) positions would clamp there, so their
// geometry keeps float32 and is compressed without quantization.
const FLOAT_GEOMETRY = new Set(['mecha_bird', 'big_cat', 'evil_cone', 'pill_bot']);
// The crown is drawn matte (Assets overrides every model to roughness 0.9, metalness 0, no env map),
// so its normal and ORM maps change nothing on screen.
const COLOR_ONLY = new Set(['nobu_champions_crown']);
// nobu.glb embeds the original scan texture (it has a third pupil); the retouched one replaces it.
const REPLACE_BASE_COLOR = { nobu: 'nobu_tex_fixed.jpg' };

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

let before = 0, after = 0;
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.glb')).sort()) {
  const id = file.replace(/\.glb$/, '');
  const full = path.join(DIR, file);
  const doc = await io.read(full);
  const root = doc.getRoot();
  if (root.listExtensionsUsed().some((e) => e.extensionName === 'EXT_meshopt_compression')) {
    console.log(`${file.padEnd(28)} already optimized`);
    continue;
  }
  const size0 = fs.statSync(full).size;
  if (REPLACE_BASE_COLOR[id]) {
    const bytes = fs.readFileSync(path.join(DIR, REPLACE_BASE_COLOR[id]));
    for (const m of root.listMaterials()) m.getBaseColorTexture()?.setImage(new Uint8Array(bytes)).setMimeType('image/jpeg');
  }
  if (COLOR_ONLY.has(id)) for (const m of root.listMaterials()) { m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); }
  const size = TEXTURE_SIZE[id] ?? DEFAULT_SIZE;
  await doc.transform(
    dedup(),
    // Only textures orphaned above: nodes, skins and leaves stay as authored (bones are looked up by name).
    prune({ propertyTypes: ['Texture'] }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality: 88 }),
    reorder({ encoder: MeshoptEncoder }),
    ...(FLOAT_GEOMETRY.has(id) ? [] : [quantize()]),
  );
  // QUANTIZE = no meshopt filters. FILTER would also store normals as int8, which the Queen's
  // computeVertexNormals then accumulates into and clamps (she rendered black).
  doc.createExtension(EXTMeshoptCompression).setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const out = await io.writeBinary(doc);
  before += size0; after += out.byteLength;
  console.log(`${file.padEnd(28)} ${(size0 / 1024) | 0} KB -> ${(out.byteLength / 1024) | 0} KB (textures ${size}², ${FLOAT_GEOMETRY.has(id) ? 'float' : 'quantized'} geometry)`);
  if (!DRY) fs.writeFileSync(full, out);
}
if (before) console.log(`total ${(before / 1048576).toFixed(2)} MiB -> ${(after / 1048576).toFixed(2)} MiB`);
