import * as THREE from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Assets } from '../src/art/assets.js';
import { Stage } from '../src/world/stage.js';
import { QueenArena } from '../src/bosses/queenArena.js';
import { PumpQueen } from '../src/bosses/pumpQueen.js';
import { QueenPill, QueenAirdrop } from '../src/bosses/queenHelpers.js';
const noop = () => {};
let previousModels;
beforeEach(() => {
  previousModels = Assets.models;
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
  const texture = new THREE.Texture();
  vi.spyOn(Assets, 'tex').mockReturnValue(texture);
  vi.spyOn(Assets, 'tiled').mockReturnValue(texture);
});
afterEach(() => {
  Assets.models = previousModels;
  vi.restoreAllMocks();
});
function fixture() {
  const player = {
    pos: new THREE.Vector3(0, 0, 11.7),
    vel: new THREE.Vector3(),
    body: { h: 1.3, grounded: true },
    dead: false,
    frozen: false,
    hurt: vi.fn(),
    die: vi.fn()
  };
  const fx = new Proxy({ sparks: { spawn: vi.fn() } }, { get: (o, k) => o[k] ?? (o[k] = vi.fn()) });
  const game = {
    player,
    fx,
    session: { busy: false, nextSeq: () => 1, onBreak: noop, onEnemyDefeated: noop },
    camera: { shake: noop }
  };
  const stage = new Stage(game, 'boss5');
  game.stage = stage;
  const arena = stage.add(new QueenArena(stage));
  stage.queenArena = arena;
  return { player, game, stage, arena };
}
it('pauses actual frozen/busy ring, wave, airdrop and pill clocks without removing support', () => {
  const { player, game, stage, arena } = fixture();
  arena.setPhase(3);
  const tile = arena.ring.tiles[0];
  player.body.ground = tile.solid;
  const pill = stage.add(new QueenPill(stage, arena.pillars[12], { defeated: false }));
  const drop = stage.add(new QueenAirdrop(stage, arena.pillars[13], true));
  const y = drop.pos.y,
    pillY = pill.pos.y,
    pillClock = pill.modeT;
  for (const paused of ['frozen', 'busy']) {
    player.frozen = paused === 'frozen';
    game.session.busy = paused === 'busy';
    arena.ring.update(0.6);
    arena.update(0.6);
    pill.update(0.6);
    drop.update(0.6);
    expect(tile.solid.enabled).toBe(true);
    expect(tile.elapsed).toBe(0);
    expect(arena.clock).toBe(0);
    expect(drop.pos.y).toBe(y);
    expect(pill.pos.y).toBe(pillY);
    expect(pill.modeT).toBe(pillClock);
  }
  player.frozen = false;
  game.session.busy = false;
  arena.ring.update(0.6);
  expect(tile.solid.enabled).toBe(false);
});
it('disposes owned arena/ticker/material resources exactly once through real Stage.dispose', () => {
  const { stage, arena } = fixture();
  const material = vi.spyOn(arena.ring.tiles[0].mesh.material, 'dispose'),
    geometry = vi.spyOn(arena.ring.tiles[0].mesh.geometry, 'dispose');
  const texture = vi.spyOn(arena.tickerTextures.pump, 'dispose');
  stage.dispose();
  stage.dispose();
  expect(material).toHaveBeenCalledTimes(1);
  expect(geometry).toHaveBeenCalledTimes(1);
  expect(texture).toHaveBeenCalledTimes(1);
});
it('frees superseded real AssetStore alias materials, owns rig/crown clones and preserves borrowed source resources', () => {
  const sourceTexture = new THREE.Texture(),
    sourceMaterial = new THREE.MeshLambertMaterial({ color: 0xeeeeee, map: sourceTexture }),
    sourceGeometry = new THREE.BoxGeometry(0.5, 1, 0.4),
    crownGeometry = new THREE.BoxGeometry(0.8, 1, 0.8),
    crownMaterial = sourceMaterial.clone();
  const template = (geo, mat) => {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.5;
    root.add(mesh);
    root.userData.clips = [];
    return root;
  };
  Assets.models.set('model_pill_bot', template(sourceGeometry, sourceMaterial));
  Assets.models.set('model_nobu_champions_crown', template(crownGeometry, crownMaterial));
  const sourceGeoDispose = vi.spyOn(sourceGeometry, 'dispose'),
    sourceMatDispose = vi.spyOn(sourceMaterial, 'dispose'),
    sourceTexDispose = vi.spyOn(sourceTexture, 'dispose'),
    crownGeoDispose = vi.spyOn(crownGeometry, 'dispose'),
    crownMatDispose = vi.spyOn(crownMaterial, 'dispose');
  const model = Assets.model.bind(Assets);
  let discarded;
  vi.spyOn(Assets, 'model').mockImplementation((id, h) => {
    const result = model(id, h);
    if (id === 'model_pump_queen') {
      let mesh;
      result.traverse((o) => {
        if (o.isMesh && !mesh) mesh = o;
      });
      discarded = vi.spyOn(mesh.material, 'dispose');
    }
    return result;
  });
  const { stage, arena } = fixture();
  const boss = stage.add(new PumpQueen(stage));
  const rigMaterial = vi.spyOn(boss.model.children[0].material, 'dispose');
  let crown;
  boss.crown.traverse((o) => {
    if (o.isMesh) crown = o;
  });
  const ownCrown = vi.spyOn(crown.material, 'dispose');
  const pill = stage.add(new QueenPill(stage, arena.pillars[12], boss));
  const pillMat = vi.spyOn(pill.glb.children[0].material, 'dispose');
  pill.reset();
  pill.reset();
  stage.dispose();
  stage.dispose();
  expect(discarded).toHaveBeenCalledTimes(1);
  expect(rigMaterial).toHaveBeenCalledTimes(1);
  expect(ownCrown).toHaveBeenCalledTimes(1);
  expect(pillMat).toHaveBeenCalledTimes(1);
  for (const spy of [sourceGeoDispose, sourceMatDispose, sourceTexDispose, crownGeoDispose, crownMatDispose])
    expect(spy).not.toHaveBeenCalled();
});
it('requires lower capsule overlap for an airdrop impact instead of hurting through a raised candle', () => {
  for (const y of [0, 3]) {
    const { stage, arena, player } = fixture();
    const candle = arena.pillars[12];
    candle.place(3, 0x4aff8a);
    const drop = stage.add(new QueenAirdrop(stage, candle, true));
    player.pos.set(candle.pos.x, y, candle.pos.z);
    drop.update(3);
    expect(player.hurt).toHaveBeenCalledTimes(y === 3 ? 1 : 0);
  }
});
it('drops decoys .8seconds after the real green physically settles, with bounded motion', () => {
  const { arena, player, stage } = fixture();
  arena.setPhase(3);
  const safe = arena.beginUltimate(player, 0.4, 3);
  let settled = null;
  for (let i = 0; i < 1200; i++) {
    stage.world.beginFrame();
    arena.update(1 / 120);
    const u = arena.ultimate;
    if (u.settledAt !== null) {
      settled = u.settledAt;
      const active = u.elapsed - u.tell;
      for (const p of u.decoys) {
        if (active < settled + 0.8 - 1e-6) expect(p.pos.y).toBeGreaterThan(-6);
        if (active > settled + 1.8) expect(p.pos.y).toBeCloseTo(-6);
      }
    }
  }
  expect(settled).not.toBeNull();
  expect(safe.pos.y).toBe(2.5);
});
