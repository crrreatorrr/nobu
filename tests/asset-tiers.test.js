// Tiered asset loading (src/art/assets.js, src/art/assetTiers.js): boot loads only the title's files,
// loadRest the remaining runtime art, and DOM-only pictures are never decoded up front.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { AssetStore } from '../src/art/assets.js';
import { BOOT_TEXTURES, BOOT_MODELS, LAZY, UNUSED } from '../src/art/assetTiers.js';
import manifest from '../public/assets/manifest.json';

let store, loaded;
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => structuredClone(manifest) })));
  store = new AssetStore();
  loaded = [];
  store._loadTex = vi.fn(async (id, url) => { loaded.push(id); const t = new THREE.Texture(); store.textures.set(id, t); store.urls.set(id, url); return t; });
  store._loadModel = vi.fn(async (id) => { loaded.push(id); store.models.set(id, new THREE.Group()); });
  store._loadGlb = vi.fn(async () => { loaded.push('nobu_glb'); });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const ids = Object.keys(manifest.assets);

it('every tier names real manifest ids', () => {
  for (const id of [...BOOT_TEXTURES, ...BOOT_MODELS, ...LAZY, ...UNUSED]) expect(ids).toContain(id);
});

it('boot loads only the title screen files', async () => {
  const progress = [];
  await store.initBoot((p) => progress.push(p));
  expect(new Set(loaded)).toEqual(new Set([...BOOT_TEXTURES, ...BOOT_MODELS, 'nobu_glb']));
  expect(progress.at(-1)).toBe(1);
  expect(store.isReady()).toBe(true); // nothing in flight yet
});

it('loadRest loads every other runtime asset except the lazy and unused ones', async () => {
  await store.initBoot();
  loaded.length = 0;
  const p = store.loadRest();
  expect(store.isReady()).toBe(false);
  let waited = false;
  const w = store.whenReady(() => {}).then(() => { waited = true; });
  await p; await w;
  expect(waited).toBe(true);
  expect(store.isReady()).toBe(true);
  const expected = ids.filter((id) => !LAZY.has(id) && !UNUSED.has(id) && id !== 'nobu_glb' &&
    !BOOT_TEXTURES.includes(id) && !BOOT_MODELS.includes(id));
  expect(new Set(loaded)).toEqual(new Set(expected));
  for (const id of LAZY) expect(store.textures.has(id)).toBe(false);
  expect(store.loadRest()).toBe(p); // one background load
});

it('url() of a lazy picture is its file and decodes nothing', async () => {
  await store.initBoot();
  expect(store.url('story_intro_1')).toMatch(/assets\/story\/intro_1\.jpg$/);
  expect(store.url('level_map')).toMatch(/assets\/backgrounds\/level_map\.jpg$/);
  // an untinted placeholder points at its source's file
  expect(store.url('story_ch2_1')).toMatch(/assets\/story\/ending\.jpg$/);
  expect(store.textures.has('story_intro_1')).toBe(false);
});

it('tex() of a lazy picture loads it on first use', async () => {
  await store.initBoot();
  const load = vi.spyOn(store.loader, 'load').mockImplementation(() => new THREE.Texture());
  const t = store.tex('story_ending');
  expect(load).toHaveBeenCalledOnce();
  expect(load.mock.calls[0][0]).toMatch(/story\/ending\.jpg$/);
  expect(store.tex('story_ending')).toBe(t);
  expect(load).toHaveBeenCalledOnce();
});

it('a placeholder whose source is still loading is built when the source arrives', async () => {
  await store.initBoot();
  let onLoad;
  vi.spyOn(store.loader, 'load').mockImplementation((url, ok) => { onLoad = ok; return new THREE.Texture(); });
  const alias = store.tex('death_splash'); // untinted alias of death_angel (lazy)
  expect(alias).toBeInstanceOf(THREE.Texture);
  const source = store.textures.get('death_angel');
  source.image = { width: 10, height: 10, complete: true };
  onLoad(source);
  expect(store.tex('death_splash')).toBe(alias);
  expect(alias.image).toBe(source.image);
});

it('unused authoring files are never loaded', async () => {
  await store.initBoot();
  await store.loadRest();
  for (const id of UNUSED) expect(loaded).not.toContain(id);
});

// jsdom has no 2D canvas: a context that accepts every call, enough for drawFallback.
const stubCanvas = () => {
  const noop = () => {};
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({
    createRadialGradient: () => ({ addColorStop: noop }), createLinearGradient: () => ({ addColorStop: noop }),
    measureText: () => ({ width: 10 }),
  }, { get: (o, k) => (k === 'then' ? undefined : (o[k] ?? noop)), set: () => true }));
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,');
};

it('a picture that failed to load gets its procedural fallback from url() and tex()', async () => {
  stubCanvas();
  await store.initBoot();
  store._loadTex = AssetStore.prototype._loadTex;
  vi.spyOn(store.loader, 'load').mockImplementation((url, ok, progress, fail) => { fail(new Error('404')); return new THREE.Texture(); });
  await expect(store._loadTex('portrait_bird', '/x.webp')).rejects.toThrow();
  expect(store.url('portrait_bird')).toMatch(/^data:/);
  expect(store.tex('portrait_bird')).toBeInstanceOf(THREE.CanvasTexture);
});

it('an alias of a source that failed is built from the source fallback, in the texture callers hold', async () => {
  stubCanvas();
  await store.initBoot();
  let fail;
  vi.spyOn(store.loader, 'load').mockImplementation((url, ok, progress, onError) => { fail = onError; return new THREE.Texture(); });
  const alias = store.tex('death_whirl'); // untinted alias of death_angel (lazy)
  fail(new Error('404'));
  expect(store.tex('death_whirl')).toBe(alias);
  expect(alias.image?.width).toBeGreaterThan(0);
});

it('a model that fails loads its sprite picture in the background tier', async () => {
  await store.initBoot();
  store._loadModel = vi.fn(async (id) => { if (id === 'model_dog_pug_coned') throw new Error('404'); store.models.set(id, new THREE.Group()); });
  loaded.length = 0;
  await store.loadRest();
  expect(loaded).toContain('dog_pug_coned');
  expect(loaded).not.toContain('dog_corgi_coned');
});
