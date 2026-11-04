// Art loader: reads assets/manifest.json (Higgsfield-generated art), loads textures + the Nobu GLB,
// and supplies procedural canvas fallbacks for anything missing so the game always runs.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { drawFallback } from './fallbacks.js';
import { placeholderFor } from './placeholders.js';

const BASE = `${import.meta.env.BASE_URL}assets/`;

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
  }

  async init(onProgress = () => {}) {
    try {
      const r = await fetch(BASE + 'manifest.json', { cache: 'no-cache' });
      if (r.ok) this.manifest = await r.json();
    } catch (e) {
      console.warn('[assets] manifest missing, using fallbacks');
    }
    const entries = Object.entries(this.manifest.assets || {}).filter(([, a]) => !a.file.endsWith('.glb'));
    const models = Object.entries(this.manifest.assets || {}).filter(([id, a]) => a.file.endsWith('.glb') && id.startsWith('model_'));
    const total = entries.length + models.length + 1;
    let done = 0;
    const tick = () => onProgress(++done / total);

    await Promise.all([
      ...entries.map(([id, a]) => this._loadTex(id, BASE + a.file).then(tick, tick)),
      this._loadGlb().then(tick, tick),
      ...models.map(([id, a]) => this._loadModel(id, BASE + a.file).then(tick, tick)),
    ]);
  }

  async _loadModel(id, url) {
    const gltf = await new GLTFLoader().loadAsync(url);
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
        resolve(t);
      }, undefined, () => reject(new Error('load fail ' + url)));
    });
  }

  async _loadGlb() {
    try {
      const gltf = await new GLTFLoader().loadAsync(BASE + 'models/nobu.glb');
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
      const fallback = placeholderFor(id);
      if (fallback && !id.startsWith('model_')) {
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
    if (!this.urls.has(id)) this.tex(id);
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
