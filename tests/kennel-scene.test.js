import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { KennelYard } from '../src/game/kennelScene.js';
import { checkDogMetadata, installKennelChecks } from '../src/game/kennelChecks.js';
import { ConedDog } from '../src/entities/dogs.js';
import { Assets } from '../src/art/assets.js';
const registry = { 1: { id: 1, shipped: true, dogs: Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`shiba-${String.fromCharCode(97 + i)}`, 'Yard'])) } };
const data = { dogsFreed: Object.fromEntries(Object.keys(registry[1].dogs).map((id) => [`1:${id}`, true])) };
afterEach(() => vi.restoreAllMocks());
it('builds actual Three scene crowd with fixed dance offsets and lowGPU cap, and frees owned resources only', () => {
  const source = new THREE.Group(), sourceMat = new THREE.MeshLambertMaterial(), sourceGeo = new THREE.BoxGeometry();
  source.add(new THREE.Mesh(sourceGeo, sourceMat));
  source.userData.clips = [new THREE.AnimationClip('walk', 2, []), new THREE.AnimationClip('dance', 2, [])];
  vi.spyOn(Assets, 'model').mockImplementation(() => source.clone(true));
  const sourceDispose = vi.spyOn(sourceGeo, 'dispose'), titleScene = new THREE.Scene(); titleScene.add(new THREE.HemisphereLight());
  const game = { titleScene, titleMask: new THREE.Group(), camera: { cam: { aspect: 2 } }, renderer: { capabilities: { maxTextures: 8 }, getPixelRatio: () => 1 } };
  const yard = new KennelYard(game, data, registry);
  expect(yard.dogs).toHaveLength(12); expect(yard.hidden).toBe(5); expect(yard.camera.aspect).toBe(2);
  expect(yard.mixers[1].clipAction(source.userData.clips[1]).time).toBeCloseTo(.37);
  yard.update(.1); expect(yard.mixers[1].clipAction(source.userData.clips[1]).time).toBeCloseTo(.48);
  const resource = [...yard.resources][0], dispose = vi.spyOn(resource, 'dispose');
  yard.dispose(); expect(dispose).toHaveBeenCalledOnce(); expect(sourceDispose).not.toHaveBeenCalled(); expect(yard.scene.children).toHaveLength(0);
});
it('checks actual ConedDog identity, static section and missing authored dogs without constructing a level', () => {
  const dog = Object.create(ConedDog.prototype); dog.dogId = '1:shiba-a'; dog.pos = new THREE.Vector3(0, 0, -5);
  const session = { level: 1, def: { dogs: { 'shiba-a': 'Start' } }, stage: { entities: [dog], track: { project: (x, z) => ({ s: -z }), sections: [{ d0: 0, d1: 10, name: 'Start' }] } } };
  expect(checkDogMetadata(session)).toEqual([]);
  session.def.dogs['shiba-a'] = 'Other'; expect(checkDogMetadata(session)[0].problem).toBe('dog section mismatch');
  dog.dogId = '1:pug-z'; expect(checkDogMetadata(session).map((e) => e.problem)).toEqual(['dog id mismatch', 'missing authored dog']);
});

it('runs metadata validation after awaited Game start, chains existing wrappers and ignores synthetic strips', async () => {
  const report = vi.fn(), game = { startLevel: vi.fn(async (id) => {
    game.session = { phase: 'level', level: id, def: { dogs: { 'shiba-a': 'Start' } }, stage: { entities: [], track: { sections: [] } } };
    return id;
  }) };
  installKennelChecks(game, report); expect(await game.startLevel(1)).toBe(1);
  expect(report).toHaveBeenCalledWith('[kennel metadata]', expect.objectContaining({ problem: 'missing authored dog' }));
  const original = game.startLevel; const outer = { startLevel: async () => { game.session.devStrip = true; return 9; }, get session() { return game.session; } };
  report.mockClear(); installKennelChecks(outer, report); expect(await outer.startLevel()).toBe(9); expect(report).not.toHaveBeenCalled();
  expect(original).toBe(game.startLevel);
});

it('accepts trial-omitted detour dogs while still checking main dogs and ordinary censuses',()=>{
  const dog=Object.create(ConedDog.prototype);dog.dogId='6:shiba-a';dog.pos=new THREE.Vector3(0,0,-5);
  const session={level:6,trial:true,def:{dogs:{'shiba-a':'Start','pug-b':'Rain Gutter'},sections:[{name:'Rain Gutter',detour:true}]},
    stage:{entities:[dog],track:{project:(x,z)=>({s:-z}),sections:[{d0:0,d1:10,name:'Start'}]}}};
  expect(checkDogMetadata(session)).toEqual([]);
  session.stage.entities=[];
  expect(checkDogMetadata(session)).toEqual([{level:6,id:'shiba-a',problem:'missing authored dog'}]);
  session.stage.entities=[dog];session.trial=false;
  expect(checkDogMetadata(session)).toEqual([{level:6,id:'pug-b',problem:'missing authored dog'}]);
});
