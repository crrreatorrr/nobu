import * as THREE from 'three';
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { expect, it, vi } from 'vitest';
import { Assets } from '../src/art/assets.js';
import { Stage } from '../src/world/stage.js';
import { QueenArena } from '../src/bosses/queenArena.js';
import { PumpQueen } from '../src/bosses/pumpQueen.js';
const noop = () => {};
it('bakes the checked-in skinned pill GLB through actual AssetStore aliases before fitting the5.5m Queen rig', async () => {
  const previousModels = Assets.models;
  Assets.models = new Map();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    new Proxy(
      {
        createRadialGradient: () => ({ addColorStop: noop }),
        createLinearGradient: () => ({ addColorStop: noop }),
        measureText: () => ({ width: 100 })
      },
      { get: (o, k) => (k === 'then' ? undefined : (o[k] ?? noop)) }
    )
  );
  vi.spyOn(Assets, 'tex').mockReturnValue(new THREE.Texture());
  vi.spyOn(Assets, 'tiled').mockReturnValue(new THREE.Texture());
  try {
    const loader = new GLTFLoader();
    loader.register(() => ({
      name: 'queenGeometryOnlyTextures',
      loadTexture: () => Promise.resolve(new THREE.Texture())
    }));
    const load = vi.spyOn(GLTFLoader.prototype, 'loadAsync');
    for (const [name, id] of [
      ['pill_bot', 'model_pill_bot'],
      ['nobu_champions_crown', 'model_nobu_champions_crown']
    ]) {
      const bytes = await readFile(new URL('../public/assets/models/' + name + '.glb', import.meta.url));
      const copy = new Uint8Array(bytes.length);
      copy.set(bytes);
      const gltf = await loader.parseAsync(copy.buffer, '');
      load.mockResolvedValueOnce(gltf);
      await Assets._loadModel(id, 'queen-test:' + name);
    }
    load.mockRestore();
    let source;
    Assets.models.get('model_pill_bot').traverse((o) => {
      if (o.isSkinnedMesh && !source) source = o;
    });
    expect(source).toBeTruthy();
    const sourcePositions = source.geometry.attributes.position.array.slice(),
      sourceDispose = vi.spyOn(source.geometry, 'dispose');
    const game = {
      player: { pos: new THREE.Vector3(0, 0, 11.7), body: { h: 1.3 }, dead: false },
      session: { busy: false, onEnemyDefeated: noop },
      ui: { bossHp: noop },
      camera: { shake: noop },
      fx: new Proxy({}, { get: () => noop })
    };
    const stage = new Stage(game, 'boss5');
    game.stage = stage;
    stage.queenArena = stage.add(new QueenArena(stage));
    const boss = stage.add(new PumpQueen(stage));
    boss.model.updateMatrixWorld(true);
    const mesh = boss.model.children.find((o) => o.isSkinnedMesh);
    mesh.computeBoundingBox();
    expect(mesh.boundingBox.getSize(new THREE.Vector3()).y).toBeCloseTo(5.5, 4);
    expect(mesh.boundingBox.min.y).toBeCloseTo(0, 4);
    expect(boss.crownPosition().y).toBeCloseTo(8.2, 4);
    for (const phase of [1, 2, 3]) {
      boss.resetToPhase(phase);
      boss.setPump(1);
      boss.alignPumpedCrown();
      expect(boss.crownPosition().y).toBeCloseTo(9 + 5.2 * (boss.stageScale[phase] - 1), 4);
    }
    stage.dispose();
    expect(sourceDispose).not.toHaveBeenCalled();
    expect(source.geometry.attributes.position.array).toEqual(sourcePositions);
  } finally {
    Assets.models = previousModels;
    vi.restoreAllMocks();
  }
});
