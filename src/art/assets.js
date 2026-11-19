// Art loader: reads assets/manifest.json (Higgsfield-generated art), loads textures + the Nobu GLB,
// and supplies procedural canvas fallbacks for anything missing so the game always runs.
// Loading is tiered (src/art/assetTiers.js): initBoot() loads the title screen's few files,
// loadRest() the rest in the background, and DOM-only pictures load only when first shown.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { drawFallback } from './fallbacks.js';
import { placeholderFor } from './placeholders.js';
import { BOOT_TEXTURES, BOOT_MODELS, LAZY, UNUSED } from './assetTiers.js';

const BASE = `${import.meta.env.BASE_URL}assets/`;

// The model GLBs are meshopt-compressed with WebP textures (tools/optimize_glbs.mjs).
function gltfLoader() {
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
}

if (typeof document !== 'undefined') {
  const textbox = new URL(`${BASE}ui/textbox.webp`, document.baseURI).href;
  document.documentElement.style.setProperty('--nobu-textbox', `url("${textbox}")`);
}

export class AssetStore {
  constructor() {
    this.manifest = { assets: {} };
    this.textures = new Map();
    this.urls = new Map();
    this.glb = null;
    this.models = new Map();   // id -> normalized THREE.Group template (static item GLBs)
    this.loader = new THREE.TextureLoader();
    this.placeholderLogs = new Set();
    this._failed = new Set(); // manifest files that did not load: the procedural fallback stands in
  }

  // Everything at once (the old boot): the boot tier, then the rest. Used by tools and tests.
  async init(onProgress = () => {}) {
    await this.initBoot((p) => onProgress(p / 2));
    await this.loadRest((p) => onProgress(0.5 + p / 2));
  }

  async _loadManifest() {
    try {
      const r = await fetch(BASE + 'manifest.json', { cache: 'no-cache' });
      if (r.ok) this.manifest = await r.json();
    } catch (e) {
      console.warn('[assets] manifest missing, using fallbacks');
    }
    this.manifest.assets ||= {};
  }

  _entry(id) {
    const a = this.manifest.assets?.[id];
    return a && !UNUSED.has(id) ? a : null;
  }

  // The title screen's files only: the manifest, the Nobu GLB and the BOOT_* tiers.
  async initBoot(onProgress = () => {}) {
    await this._loadManifest();
    const tex = BOOT_TEXTURES.filter((id) => this._entry(id));
    const models = BOOT_MODELS.filter((id) => this._entry(id));
    const total = tex.length + models.length + 1;
    let done = 0;
    const tick = () => onProgress(++done / total);
    await Promise.all([
      ...tex.map((id) => this._loadTex(id, BASE + this._entry(id).file).then(tick, tick)),
      this._loadGlb().then(tick, tick),
      ...models.map((id) => this._loadModel(id, BASE + this._entry(id).file).then(tick, tick)),
    ]);
  }

  // Every other runtime texture and model, except the lazy tier. Safe to call more than once.
  loadRest(onProgress = () => {}) {
    if (!this._rest) {
      const all = Object.entries(this.manifest.assets || {}).filter(([id]) => this._entry(id) && !LAZY.has(id));
      const tex = all.filter(([id, a]) => !a.file.endsWith('.glb') && !this.textures.has(id));
      const models = all.filter(([id, a]) => a.file.endsWith('.glb') && id.startsWith('model_') && !this.models.has(id));
      const total = tex.length + models.length;
      let done = 0;
      this.restProgress = total ? 0 : 1;
      this._restListeners = new Set();
      const tick = () => {
        this.restProgress = ++done / total;
        for (const fn of this._restListeners) fn(this.restProgress);
      };
      this._rest = Promise.all([
        // A texture already taken on demand (Assets.tex) keeps that load.
        ...tex.map(([id, a]) => (this.textures.has(id) ? Promise.resolve() : this._loadTex(id, BASE + a.file)).then(tick, tick)),
        // A model that fails falls back to a sprite of its picture (src/entities/dogs.js), which
        // then needs its real size: load that lazy picture here, before any level is built.
        ...models.map(([id, a]) => this._loadModel(id, BASE + a.file).then(tick, () => this._spriteFallback(id).then(tick, tick))),
      ]).then(() => { this.restReady = true; this._restListeners.clear(); });
    }
    if (this.restReady) onProgress(1);
    else this._restListeners.add(onProgress);
    return this._rest;
  }

  _spriteFallback(modelId) {
    const pic = modelId.replace(/^model_/, '');
    const entry = LAZY.has(pic) && !this.textures.has(pic) && this._entry(pic);
    return entry ? this._loadTex(pic, BASE + entry.file) : Promise.resolve();
  }

  /** True unless the background load has started and not finished yet. */
  isReady() { return !this._rest || !!this.restReady; }

  /** Resolves once the background load is done (at once when none is running). */
  whenReady(onProgress = () => {}) {
    if (this.isReady()) return Promise.resolve();
    onProgress(this.restProgress || 0);
    return this.loadRest(onProgress);
  }

  async _loadModel(id, url) {
    const gltf = await gltfLoader().loadAsync(url);
    const root = gltf.scene;
    let skinned = false;
    root.traverse((o) => {
      if (o.isSkinnedMesh) { skinned = true; o.frustumCulled = false; }
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
        const m = o.material;
        if (m && m.isMeshStandardMaterial) { m.roughness = 0.9; m.metalness = 0; m.envMapIntensity = 0; }
        if (m && m.map) { m.map.anisotropy = 4; }
      }
    });
    // normalize: unit height, centered on x/z, feet at y = 0
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group();
    root.position.set(-c.x, -box.min.y, -c.z);
    const norm = new THREE.Group();
    norm.add(root);
    norm.scale.setScalar(1 / Math.max(0.001, size.y));
    holder.add(norm);
    holder.userData.aspect = { w: size.x / size.y, d: size.z / size.y };
    holder.userData.skinned = skinned;
    holder.userData.clips = (gltf.animations || []).map(inPlace);
    this.models.set(id, holder);
  }

  // Start a looping animation on a model clone (rigged Higgsfield models). Returns the mixer or null.
  animate(obj, index = 0, timeScale = 1) {
    const clips = obj?.userData?.clips;
    if (!clips || !clips.length) return null;
    const mixer = new THREE.AnimationMixer(obj);
    const a = mixer.clipAction(clips[Math.min(index, clips.length - 1)]);
    a.timeScale = timeScale;
    a.time = Math.random() * clips[0].duration; // de-sync crowds
    a.play();
    return mixer;
  }

  // Clone of a static item model scaled to `height` meters (null if it failed to load).
  model(id, height = 1) {
    const fallback = !this.models.has(id) && placeholderFor(id);
    const t = this.models.get(fallback ? fallback.from : id);
    if (!t) return null;
    const c = t.userData.skinned ? cloneSkinned(t) : t.clone(true);
    c.scale.setScalar(height);
    c.userData.aspect = t.userData.aspect;
    c.userData.clips = t.userData.clips;
    c.userData.skinned = t.userData.skinned;
    if (fallback) {
      this._placeholderUsed(id, fallback.from);
      c.scale.multiplyScalar(fallback.scale ?? 1);
      if (fallback.rot) c.rotation.set(...fallback.rot);
      // Skinned/static clones both share materials by default. Clone each material
      // once per result, including array materials, before tinting or fading it.
      const materials = new Map();
      const cloneMaterial = (source) => {
        if (!source) return source;
        if (!materials.has(source)) {
          const material = source.clone();
          if (fallback.tint !== undefined && material.color) material.color.multiply(new THREE.Color(fallback.tint));
          if (fallback.opacity !== undefined) {
            material.opacity *= fallback.opacity;
            material.transparent ||= material.opacity < 1;
            if (material.opacity < 1) material.depthWrite = false;
          }
          materials.set(source, material);
        }
        return materials.get(source);
      };
      c.traverse((obj) => {
        if (obj.isMesh) obj.material = Array.isArray(obj.material)
          ? obj.material.map(cloneMaterial) : cloneMaterial(obj.material);
      });
    }
    return c;
  }

  _placeholderUsed(id, from) {
    if (!import.meta.env.DEV || this.placeholderLogs.has(id)) return;
    this.placeholderLogs.add(id);
    console.info(`[assets] ${id} uses placeholder ${from}`);
  }

  _loadTex(id, url) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        this.textures.set(id, t);
        this.urls.set(id, url);
        this._loaded(id);
        resolve(t);
      }, undefined, () => { this._failed.add(id); this._loaded(id); reject(new Error('load fail ' + url)); });
    });
  }

  // First use of a lazy picture as a texture: returned at once, its pixels arrive when loaded
  // (a failed load draws the procedural fallback into it).
  _lazyTex(id, url) {
    const t = this.loader.load(url, () => { this._loaded(id); }, undefined, () => {
      this._failed.add(id);
      t.image = drawFallback(id);
      t.needsUpdate = true;
      this.urls.set(id, t.image.toDataURL());
      this._loaded(id);
    });
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    this.textures.set(id, t);
    this.urls.set(id, url);
    return t;
  }

  _imageReady(t) {
    const img = t?.image;
    return !!img && (img.width > 0 || img.naturalWidth > 0) && img.complete !== false;
  }

  _afterLoad(id, fn) {
    (this._pending ||= new Map());
    if (!this._pending.has(id)) this._pending.set(id, []);
    this._pending.get(id).push(fn);
  }

  _loaded(id) {
    const fns = this._pending?.get(id);
    if (!fns) return;
    this._pending.delete(id);
    for (const fn of fns) fn();
  }

  async _loadGlb() {
    try {
      const gltf = await gltfLoader().loadAsync(BASE + 'models/nobu.glb');
      this.glb = gltf;
    } catch (e) {
      console.warn('[assets] nobu.glb unavailable, using primitive Nobu');
      this.glb = null;
    }
  }

  has(id) { return this.textures.has(id); }

  // THREE texture (generated art, or a procedural fallback canvas).
  tex(id) {
    if (!this.textures.has(id)) {
      const entry = this._failed.has(id) ? null : this._entry(id);
      const fallback = !entry && placeholderFor(id);
      if (entry && !entry.file.endsWith('.glb')) {
        this._lazyTex(id, BASE + entry.file);
      } else if (fallback && !id.startsWith('model_') && !this._imageReady(this.tex(fallback.from))) {
        // The source is still loading (lazy tier): build the alias once it arrives.
        const t = new THREE.Texture();
        t.colorSpace = THREE.SRGBColorSpace;
        this.textures.set(id, t);
        this._afterLoad(fallback.from, () => {
          // The source has loaded (or failed, and now draws its fallback): build the alias as usual
          // and move it into the texture callers already hold.
          this.textures.delete(id);
          const built = this.tex(id);
          t.copy(built);
          t.needsUpdate = true;
          this.textures.set(id, t);
        });
      } else if (fallback && !id.startsWith('model_')) {
        const source = this.tex(fallback.from);
        this._placeholderUsed(id, fallback.from);
        // Even untransformed aliases get their own Texture: tiled() must not
        // change the wrapping of a source also used as a sky or portrait.
        const texture = source.clone();
        // Texture.clone shares THREE.Source; assigning image on that clone would
        // otherwise replace the original portrait's pixels too.
        texture.source = new THREE.Source(source.image);
        const transformed = fallback.tint !== undefined || fallback.hue !== undefined || fallback.opacity !== undefined;
        if (transformed) {
          const canvas = document.createElement('canvas');
          canvas.width = source.image.width; canvas.height = source.image.height;
          const ctx = canvas.getContext('2d');
          ctx.filter = fallback.hue === undefined ? 'none' : `hue-rotate(${fallback.hue}deg)`;
          ctx.drawImage(source.image, 0, 0);
          ctx.filter = 'none';
          if (fallback.tint !== undefined) {
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = `#${fallback.tint.toString(16).padStart(6, '0')}`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Keep the alpha of a source portrait instead of filling its border.
            ctx.globalCompositeOperation = 'destination-in';
            ctx.globalAlpha = fallback.opacity ?? 1;
            ctx.drawImage(source.image, 0, 0);
          } else if (fallback.opacity !== undefined) {
            ctx.globalCompositeOperation = 'destination-in';
            ctx.fillStyle = `rgba(255,255,255,${fallback.opacity})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          texture.image = canvas;
          this.urls.set(id, canvas.toDataURL());
        } else this.urls.set(id, this.url(fallback.from));
        texture.needsUpdate = true;
        this.textures.set(id, texture);
      } else {
        const canvas = drawFallback(id);
        const t = new THREE.CanvasTexture(canvas);
        t.colorSpace = THREE.SRGBColorSpace;
        this.textures.set(id, t);
        this.urls.set(id, canvas.toDataURL());
      }
    }
    return this.textures.get(id);
  }

  // URL usable by <img> / CSS.
  url(id) {
    if (this.urls.has(id)) return this.urls.get(id);
    // A manifest picture's URL is its file: no texture is decoded for an <img>. One that failed to
    // load falls through to tex(), which draws its procedural fallback.
    const entry = this._failed.has(id) ? null : this._entry(id);
    if (entry && !entry.file.endsWith('.glb')) return BASE + entry.file;
    const fallback = placeholderFor(id);
    if (fallback && !id.startsWith('model_') && fallback.tint === undefined && fallback.hue === undefined && fallback.opacity === undefined) return this.url(fallback.from);
    this.tex(id);
    return this.urls.get(id);
  }

  // Texture configured for world-space tiling (geometry UVs are in meters / tileSize).
  tiled(id) {
    const t = this.tex(id);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.needsUpdate = true;
    return t;
  }

  aspect(id) {
    const t = this.tex(id);
    const img = t.image;
    return img && img.width ? img.width / img.height : 1;
  }
}

// Strip horizontal root motion so walk/run clips loop in place.
function inPlace(clip) {
  for (const tr of clip.tracks) {
    if (!/hips\.position$/i.test(tr.name)) continue;
    const v = tr.values;
    const x0 = v[0], z0 = v[2];
    for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
  }
  return clip;
}

export const Assets = new AssetStore();
