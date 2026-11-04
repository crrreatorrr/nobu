import * as THREE from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../src/art/assets.js', () => ({ Assets: {
  has: () => false, model: () => null, animate: () => null, aspect: () => 1,
  tex: () => new THREE.Texture({ width: 16, height: 16 }),
  tiled: () => new THREE.Texture({ width: 16, height: 16 }), url: () => '',
} }));
vi.mock('../src/audio/audio.js', () => ({ audio: {
  play: vi.fn(), playMusic: vi.fn(), stopMusic: vi.fn(), setRate: vi.fn(),
} }));
vi.mock('../src/entities/fx.js', async original => {
  const module = await original();
  return { ...module, FX: class {
    constructor() { return new Proxy({ sparks: { spawn: vi.fn() } }, { get: (o, k) => o[k] ?? (o[k] = vi.fn()) }); }
  } };
});
import { RushSession } from '../src/game/rushSession.js';
import { Game } from '../src/game/game.js';
import { RUSH_ARENAS } from '../src/game/rushArenas.js';
import { Player } from '../src/player/player.js';
import { GameCamera } from '../src/camera/camera.js';
import { BlueSphere } from '../src/entities/breakables.js';
import { save } from '../src/core/save.js';
import { hub } from '../src/hub/hubBridge.js';
import { itemById } from '../src/gear/catalog.js';
import { masteryPoints } from '../src/game/progress.js';
import { resetWorld } from './helpers.js';
const noop = () => {};
const sessions = [];
beforeEach(() => {
  vi.useFakeTimers(); resetWorld();
  const ctx = new Proxy({
    createRadialGradient: () => ({ addColorStop: noop }), createLinearGradient: () => ({ addColorStop: noop }),
    measureText: () => ({ width: 20 }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  }, { get: (o, k) => k === 'then' ? undefined : o[k] ?? noop });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('');
  for (const d of RUSH_ARENAS) if (d.Boss.prototype.intro) vi.spyOn(d.Boss.prototype, 'intro').mockResolvedValue(undefined);
  for (const method of ['beginAttempt', 'startCarry', 'bank', 'reportCone', 'submitScore']) vi.spyOn(hub, method);
  save.data.beaten = { 1: true, 2: true, 3: true, 4: true, 5: true };
  Object.assign(save.data, { tickets: 77, lives: 5 }); save.write();
});
afterEach(() => { for (const s of sessions.splice(0)) s.dispose(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });
function fixture(effects = {}) {
  const ui = new Proxy({ talking: false, say: vi.fn(async () => {}), hideLoading: vi.fn(async () => {}), fade: vi.fn(async () => {}) },
    { get: (o, k) => o[k] ?? (o[k] = vi.fn()) });
  const game = { state: 'play', ui, camera: new GameCamera(1.5),
    loadout: { effects, cosmeticSlots: () => ({}) },
    mask: { attach: vi.fn(), setLevel: vi.fn(), snapTo: vi.fn(), update: vi.fn() },
    rushCompleted: vi.fn(), levelCleared: vi.fn(), goalLevelCleared: vi.fn(), gameOver: vi.fn(),
  };
  game.player = new Player(game);
  const session = game.session = new RushSession(game); sessions.push(session);
  game.onPlayerDeath = Game.prototype.onPlayerDeath;
  game.maskPickup = () => session.setMask(session.mask + 1);
  return { game, session };
}
async function enter(session, index = 0, opts) {
  const done = session._enterBoss(index, opts);
  await vi.advanceTimersByTimeAsync(0); await done;
}
async function defeat(session) {
  const boss = session.boss;
  boss.hp = 1; boss.vulnerable = true; boss.hitCool = 0;
  boss.damage();
  await vi.advanceTimersByTimeAsync(2601); await session.transition;
}
function noExternalWrites() {
  for (const method of ['beginAttempt', 'startCarry', 'bank', 'reportCone', 'submitScore']) expect(hub[method]).not.toHaveBeenCalled();
}
it('runs all five actual arenas, carries mask and depleted collar, and writes only Rush results', async () => {
  const { game, session: s } = fixture({ damage_guard: { guard_charges: 2, invuln_s: 1, knockback: 2 } });
  const before = structuredClone(save.data);
  await enter(s);
  s.setMask(1); game.player.guardCharges = 0;
  for (let i = 0; i < 5; i++) {
    expect(s.boss.key).toBe(RUSH_ARENAS[i].bossKey);
    expect(s.boss.phaseCheckpoints).toBe(false);
    expect(s.boss.dda).toEqual({ tele: 1, window: 0 });
    expect(s.tickets.list).toEqual([]); expect(s.tickets.flying).toEqual([]);
    expect(s.mask).toBe(1); expect(game.player.guardCharges).toBe(0);
    if (i === 4) expect(s.info.spheres).toHaveLength(4);
    s.update(.1);
    await defeat(s);
  }
  expect(game.rushCompleted).toHaveBeenCalledOnce();
  expect(save.data.rush.clear).toBe(true); expect(save.data.rush.noHit).toBe(true);
  expect(save.data.rush.bestMs).toBe(500);
  expect({ ...save.data, rush: before.rush }).toEqual(before);
  expect(game.levelCleared).not.toHaveBeenCalled(); expect(game.goalLevelCleared).not.toHaveBeenCalled();
  noExternalWrites();
  const record = structuredClone(save.data.rush);
  save.load(); save.reset();
  expect(save.data.rush).toEqual(record);
  expect(masteryPoints(save.data, { rush: { id: 'rush', shipped: true, meta: true } })).toBe(6);
});
it.each([0, 1, 2, 3, 4])('death restarts actual boss %i at stage1 without story loss or DDA', async index => {
  const { game, session: s } = fixture(); s.run.index = index;
  await enter(s, index);
  const old = s.boss; old.phase = old.stages;
  s.mask = 2; s.run.elapsed = 10;
  game.player.die('fall');
  expect(s.run.noHit).toBe(false); expect(s.mask).toBe(0);
  s.update(.5); expect(s.run.elapsed).toBe(10.5);
  await vi.advanceTimersByTimeAsync(3000); await s.transition;
  expect(s.boss).not.toBe(old); expect(s.boss.phase).toBe(1); expect(s.boss.hp).toBe(s.boss.maxHp);
  expect(s.boss.phaseCheckpoints).toBe(false); expect(s.boss.dda).toEqual({ tele: 1, window: 0 });
  expect(s.mask).toBe(0); expect(s.run.index).toBe(index); expect(s.run.elapsed).toBe(10.5);
  expect(save.data.lives).toBe(5); expect(save.data.tickets).toBe(77);
  expect(game.gameOver).not.toHaveBeenCalled(); noExternalWrites();
});
it('uses real mask/collar/pit hurt paths and never grants ordinary arena economy', async () => {
  const { game, session: s } = fixture({ damage_guard: { guard_charges: 1, invuln_s: .1, knockback: 0 } });
  await enter(s); s.setMask(1);
  game.player.hurt('angel'); expect(s.run.noHit).toBe(false); expect(s.mask).toBe(0);
  s.run.noHit = true; game.player.invulnT = 0;
  game.player.hurt('angel'); expect(s.run.noHit).toBe(false); expect(game.player.guardCharges).toBe(0);
  s.addTickets(30, 'coconut'); s.addLife(2); s.checkpoint(game.player.pos);
  s.tickets.add(0, 0, 0); s.tickets.spawnFlying(0, 0, 0, 100);
  expect(s.levelTickets).toBe(0); expect(save.data.tickets).toBe(77); expect(save.data.lives).toBe(5);
  const sphere = s.stage.entities.find(e => e instanceof BlueSphere); sphere.pop();
  expect(s.mask).toBe(1); noExternalWrites();
});
it('keeps time and God use sticky across pause, dialogue and wins without refreshing invincibility', async () => {
  const { game, session: s } = fixture(); await enter(s);
  s.update(.2); game.state = 'pause'; s.update(2);
  game.state = 'play'; s.busy = true; s.update(2);
  save.data.godMode = true; s.update(.1); save.data.godMode = false;
  expect(s.run.elapsed).toBe(.2); expect(s.run.godUsed).toBe(true);
  s.busy = false; s.setMask(3); s.invincibleT = 4;
  await defeat(s);
  expect(s.mask).toBe(3); expect(s.invincibleT).toBe(4);
});
it('cannot write or advance a disposed run after deferred intro, phase or defeat transitions', async () => {
  const { game, session: s } = fixture();
  let resume;
  game.ui.say.mockImplementationOnce(() => new Promise(resolve => { resume = resolve; }));
  const entering = s.startLevel(); await vi.advanceTimersByTimeAsync(0);
  s.dispose(); game.session = null; resume(); await entering;
  expect(s.boss.active).toBe(false); expect(game.rushCompleted).not.toHaveBeenCalled();
  noExternalWrites();
});
it('requires Queen completion before public Rush startup', async () => {
  const { game, session: s } = fixture(); delete save.data.beaten[5];
  expect(await s.startLevel()).toBe(false);
  expect(s.stage).toBeUndefined(); expect(game.ui.showLoading).not.toHaveBeenCalled();
  noExternalWrites();
});
it('supports the actual fourth phase sphere without DDA and safely cancels an in-flight evolution', async () => {
  const { game, session: s } = fixture(); s.run.index = 4; await enter(s, 4);
  const boss = s.boss; boss.phase = 4; boss.hp = 3;
  const phase = s.onBossPhase(boss, 4);
  await vi.advanceTimersByTimeAsync(600);
  expect(boss.evolving.n).toBe(4);
  s.stage.update(3.2, game.player); await phase;
  const sphere = s.stage.entities.filter(e => e instanceof BlueSphere).at(-1);
  expect(sphere.pos.toArray()).toEqual(s.info.spheres[3].toArray());
  expect(boss.active).toBe(true); expect(s.busy).toBe(false);
  s.bossDeaths[4] = 9; s._applyBossDda(4, true);
  expect(boss.dda).toEqual({ tele: 1, window: 0 }); expect(s.mask).toBe(0);
  const pending = s.onBossPhase(boss, 4); await vi.advanceTimersByTimeAsync(600);
  s.dispose(); game.session = null;
  const uiCalls = game.ui.bossHp.mock.calls.length;
  await pending;
  expect(game.ui.bossHp).toHaveBeenCalledTimes(uiCalls);
  expect(game.rushCompleted).not.toHaveBeenCalled(); noExternalWrites();
});
it('does not settle a final result after quitting during its deferred fade', async () => {
  const { game, session: s } = fixture(); s.run.index = 4; await enter(s, 4);
  let resume;
  game.ui.fade.mockImplementationOnce(() => new Promise(resolve => { resume = resolve; }));
  const boss = s.boss; boss.hp = 1; boss.hitCool = 0; boss.vulnerable = true; boss.damage();
  await vi.advanceTimersByTimeAsync(2600);
  s.dispose(); game.session = null;
  resume(); await s.transition;
  expect(save.data.rush.clear).toBe(false);
  expect(game.rushCompleted).not.toHaveBeenCalled(); noExternalWrites();
});
it('never rolls back currency changed during the death delay and does not revive earned DDA', async () => {
  const { game, session: s } = fixture(); await enter(s);
  game.player.die('fall');
  save.data.tickets = 123; save.data.lives = 9; save.data.beaten[6] = true; save.write();
  await vi.advanceTimersByTimeAsync(3000); await s.transition;
  expect(save.data.tickets).toBe(123); expect(save.data.lives).toBe(9); expect(save.data.beaten[6]).toBe(true);
  s.bossDeaths[1] = 99; s._applyBossDda(1, true);
  expect(s.mask).toBe(0); expect(s.boss.dda).toEqual({ tele: 1, window: 0 });
  noExternalWrites();
});
it('cannot skip a fight with an actual Wizard Hat loadout', async () => {
  const { game, session: s } = fixture({ spell_bark: itemById('nobu_wizard_hat').effect.params });
  await enter(s);
  game.player.pos.copy(s.boss.pos).add(new THREE.Vector3(0, 0, 2)); game.player.facing = Math.PI;
  const hp = s.boss.hp;
  game.player._bark();
  expect(s.boss.hp).toBe(hp); expect(s.boss.active).toBe(true);
  expect(s.run.index).toBe(0); expect(s.run.complete).toBe(false); expect(save.data.rush.clear).toBe(false);
  noExternalWrites();
});
it('does not award or write a God-assisted complete run even after God is switched off', async () => {
  const { game, session: s } = fixture(); await enter(s);
  const write = vi.spyOn(save, 'write');
  save.data.godMode = true; s.update(.01); save.data.godMode = false;
  for (let i = 0; i < 5; i++) await defeat(s);
  expect(game.rushCompleted).toHaveBeenCalledOnce();
  expect(game.rushCompleted.mock.calls[0][1].eligible).toBe(false);
  expect(save.data.rush.clear).toBe(false); expect(write).not.toHaveBeenCalled();
  noExternalWrites();
});
