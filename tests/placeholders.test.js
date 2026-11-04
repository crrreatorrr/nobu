import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import manifest from '../public/assets/manifest.json';
import { AssetStore } from '../src/art/assets.js';
import { PLACEHOLDERS, placeholderFor } from '../src/art/placeholders.js';
import { PROCEDURAL } from '../src/art/procedural.js';

function modelTemplate({ array = false } = {}) {
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  group.add(new THREE.Mesh(new THREE.BoxGeometry(), array ? [material, material] : material));
  group.userData.aspect = { w: 2, d: 3 };
  group.userData.clips = [new THREE.AnimationClip('idle', 1, [])];
  return group;
}

let contexts;
beforeEach(() => {
  contexts = new WeakMap();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    if (!contexts.has(this)) contexts.set(this, new Proxy({}, {
      get(target, prop) {
        if (!(prop in target)) target[prop] = prop === 'createLinearGradient' || prop === 'createRadialGradient'
          ? vi.fn(() => ({ addColorStop: vi.fn() })) : vi.fn();
        return target[prop];
      },
    }));
    return contexts.get(this);
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
    return `data:image/png;base64,test-${this.width}-${this.height}`;
  });
});
afterEach(() => {
  delete PLACEHOLDERS.model_test_rotation;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('placeholder catalog', () => {
  it('uses existing manifest art or explicitly identified house procedural art', () => {
    for (const [id, entry] of Object.entries(PLACEHOLDERS)) {
      expect(manifest.assets[id], id).toBeUndefined();
      if (entry.procedural) expect(PROCEDURAL[entry.from], entry.from).toBeTypeOf('function');
      else expect(manifest.assets[entry.from], entry.from).toBeDefined();
      for (const key of ['scale', 'tint', 'opacity', 'hue']) {
        if (entry[key] !== undefined) expect(Number.isFinite(entry[key]), `${id}.${key}`).toBe(true);
      }
      if (entry.scale !== undefined) expect(entry.scale).toBeGreaterThan(0);
      if (entry.opacity !== undefined) expect(entry.opacity).toBeGreaterThan(0);
    }
    expect(placeholderFor('toString')).toBeNull();
  });
});

describe('model fallback selection and material ownership', () => {
  it('returns transformed independent clones without changing a shared array material', () => {
    const store = new AssetStore(), source = modelTemplate({ array: true });
    store.models.set('model_vacuum', source);
    const first = store.model('model_roomba_titan', 2);
    const second = store.model('model_roomba_titan', 2);
    expect(first.scale.toArray()).toEqual([9, 9, 9]);
    const original = source.children[0].material[0];
    const tinted = first.children[0].material;
    expect(tinted[0]).not.toBe(original);
    expect(tinted[0]).toBe(tinted[1]);
    expect(tinted[0]).not.toBe(second.children[0].material[0]);
    expect(tinted[0].color.getHex()).toBe(0x3a3d44);
    tinted[0].color.set(0xff0000);
    expect(original.color.getHex()).toBe(0xffffff);
    expect(second.children[0].material[0].color.getHex()).toBe(0x3a3d44);
    expect(source.scale.toArray()).toEqual([1, 1, 1]);
    expect(first.userData.clips).toBe(source.userData.clips);
  });

  it('fades only the ghost clone and supports rotation independently', () => {
    const store = new AssetStore(), source = modelTemplate();
    store.models.set('model_small_cat', source);
    const ghost = store.model('model_ghost_cat');
    expect(ghost.children[0].material).toMatchObject({ opacity: 0.45, transparent: true, depthWrite: false });
    expect(source.children[0].material).toMatchObject({ opacity: 1, transparent: false, depthWrite: true });
    PLACEHOLDERS.model_test_rotation = { from: 'model_small_cat', rot: [0.1, 0.2, 0.3] };
    expect(store.model('model_test_rotation').rotation.toArray().slice(0, 3)).toEqual([0.1, 0.2, 0.3]);
    expect(source.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
  });

  it('prefers a loaded new asset without applying fallback scale or tint', () => {
    const store = new AssetStore(), real = modelTemplate();
    store.models.set('model_vacuum', modelTemplate());
    store.models.set('model_roomba_titan', real);
    const result = store.model('model_roomba_titan', 2);
    expect(result.scale.toArray()).toEqual([2, 2, 2]);
    expect(result.children[0].material.color.getHex()).toBe(0xffffff);
    expect(store.placeholderLogs.size).toBe(0);
  });

  it('uses the source when a manifest-listed new GLB fails to load', async () => {
    const store = new AssetStore();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ assets: {
      model_vacuum: { file: 'vacuum.glb' }, model_roomba_titan: { file: 'missing.glb' },
    } }) }));
    vi.spyOn(store, '_loadGlb').mockResolvedValue();
    vi.spyOn(store, '_loadModel').mockImplementation(async (id) => {
      if (id === 'model_roomba_titan') throw new Error('missing asset');
      store.models.set(id, modelTemplate());
    });
    await store.init();
    expect(store.model('model_roomba_titan').scale.x).toBe(4.5);
    expect(store.model('model_unknown')).toBeNull();
  });
});

describe('texture and URL fallbacks', () => {
  it('keeps alias wrapping independent and uses the existing procedural house background', () => {
    const store = new AssetStore();
    const source = store.tex('bg_house');
    const alias = store.tex('bg_level4');
    expect(alias).not.toBe(source);
    expect(alias.image).toBe(source.image);
    expect(store.url('bg_level4')).toBe(store.url('bg_house'));
    store.tiled('bg_level4');
    expect(alias.wrapS).toBe(THREE.RepeatWrapping);
    expect(source.wrapS).toBe(THREE.ClampToEdgeWrapping);
  });

  it('renders transformed texture URLs without changing the source image or texture', () => {
    const store = new AssetStore(), image = document.createElement('canvas');
    image.width = 32; image.height = 24;
    const source = new THREE.CanvasTexture(image);
    store.textures.set('pill_bot', source);
    store.urls.set('pill_bot', 'original-portrait.webp');
    const portrait = store.tex('portrait_queen');
    expect(portrait.image).not.toBe(image);
    expect(source.image).toBe(image);
    expect(contexts.get(portrait.image).drawImage).toHaveBeenCalledWith(image, 0, 0);
    expect(contexts.get(portrait.image).fillStyle).toBe('#d23cff');
    expect(store.url('portrait_queen')).toMatch(/^data:image\/png/);
    expect(store.url('pill_bot')).toBe('original-portrait.webp');
  });

  it('lets real textures and their URLs override existing fallbacks, and falls back after a load error', async () => {
    const store = new AssetStore(), image = document.createElement('canvas');
    image.width = image.height = 16;
    store.textures.set('bg_level3', new THREE.CanvasTexture(image));
    store.urls.set('bg_level3', 'source.webp');
    store.loader.load = vi.fn((url, loaded, progress, failed) => {
      if (url === 'missing.webp') failed();
      else loaded(new THREE.CanvasTexture(image));
    });
    await expect(store._loadTex('bg_level5', 'missing.webp')).rejects.toThrow('load fail');
    const fallback = store.tex('bg_level5');
    expect(fallback).not.toBe(store.textures.get('bg_level3'));
    expect(contexts.get(fallback.image).drawImage).toHaveBeenCalled();
    await store._loadTex('bg_level5', 'real.webp');
    expect(store.tex('bg_level5')).not.toBe(fallback);
    expect(store.url('bg_level5')).toBe('real.webp');
  });

  it('logs a fallback only once per id in development', () => {
    const store = new AssetStore(), log = vi.spyOn(console, 'info').mockImplementation(() => {});
    store.models.set('model_vacuum', modelTemplate());
    store.model('model_roomba_titan'); store.model('model_roomba_titan');
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('[assets] model_roomba_titan uses placeholder model_vacuum');
  });
});
