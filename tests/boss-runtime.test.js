import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Player } from '../src/player/player.js';
import { Session } from '../src/game/session.js';
import { Boss } from '../src/bosses/common.js';
import { newBossRun } from '../src/bosses/medals.js';
import { BOSS_PHASE_CHECKPOINTS } from '../src/config/difficulty.js';
import { World } from '../src/world/physics.js';
import { UI } from '../src/ui/ui.js';
import { save } from '../src/core/save.js';
import { input } from '../src/core/input.js';
import { audio } from '../src/audio/audio.js';

function fixture() {
  const game = { state: 'play', loadout: { effects: {} }, ui: { setConed: vi.fn(), setHud: vi.fn(), bossHp: vi.fn(), banner: vi.fn() },
    camera: { shake: vi.fn(), snap: vi.fn() }, mask: { setLevel: vi.fn(), snapTo: vi.fn() }, fx: { clear: vi.fn(), puff: vi.fn(), shock: vi.fn(), dust: vi.fn() }, onPlayerDeath: vi.fn(), onFlop: vi.fn() };
  const p = Object.create(Player.prototype);
  Object.assign(p, { game, pos: new THREE.Vector3(), vel: new THREE.Vector3(), root: new THREE.Group(),
    model: {}, wings: {}, halo: {}, deathCone: { visible: false, position: new THREE.Vector3() }, stars: {},
    _animate: vi.fn(), _updateShadow: vi.fn(), _paintGear: vi.fn() });
  p.body = { pos: p.pos, vel: p.vel, h: 1.3, hw: 0.36, hd: 0.36 };
  p.reset(); p.body.grounded = true; p.barkT = 1; p.barkCool = 0;
  game.player = p;
  const session = new Session(game, 1); game.session = session;
  session.phase = 'boss';
  const stage = { game, world: new World(), entities: [], track: null, killYAt: () => -20 };
  stage.world.addBox(0, -1, 0, 30, 1, 30);
  session.stage = stage;
  session.boss = new Boss(stage, 0, 0, 0, { key: 'bird' });
  session.boss.active = true;
  session.bossRun = newBossRun();
  return { game, p, session, stage };
}
const basis = { right: { x: 1, z: 0 }, forward: { x: 0, z: 1 } };
beforeEach(() => {
  save.reset(); save.data.godMode = false; save.data.bossMedals = {};
  vi.spyOn(audio, 'play').mockImplementation(() => {});
  vi.spyOn(audio, 'setRate').mockImplementation(() => {});
  vi.spyOn(input, 'pressed').mockReturnValue(false);
  vi.spyOn(input, 'held').mockReturnValue(false);
  input.state.x = 0; input.state.y = 0;
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('player boss status and damage hooks', () => {
  it('reports mask loss, collar saves and a direct pit death as hits', () => {
    const { game, p, session } = fixture();
    session.mask = 1;
    expect(p.hurt()).toBe(true);
    expect(session.bossRun.noHit).toBe(false); expect(session.boss.sinceHurt).toBe(0);
    session.bossRun.noHit = true; session.boss.sinceHurt = 9; p.invulnT = 0;
    game.loadout.effects = { damage_guard: { invuln_s: 1, knockback: 6 } }; p.guardCharges = 1;
    expect(p.hurt()).toBe(true);
    expect(p.dead).toBe(false); expect(p.guardCharges).toBe(0);
    expect(session.bossRun.noHit).toBe(false); expect(session.boss.sinceHurt).toBe(0);
    session.bossRun.noHit = true; p.invulnT = 0;
    p.die('fall');
    expect(p.dead).toBe(true); expect(session.bossRun.noHit).toBe(false);
    expect(game.onPlayerDeath).toHaveBeenCalledWith('fall');
  });
  it('does not break No-Hit on rejected damage', () => {
    const { p, session } = fixture(); p.invulnT = 1;
    expect(p.hurt()).toBe(false); expect(session.bossRun.noHit).toBe(true);
  });
  it('freezes horizontal movement but keeps gravity, and bite presses reduce the trap', () => {
    const { p, session, stage } = fixture(); session.mask = 1;
    p.pos.y = 3; p.body.grounded = false; p.vel.set(8, 0, 4);
    expect(p.trap(2)).toBe(true);
    input.pressed.mockImplementation(action => action === 'bite');
    p.update(0.1, stage, basis);
    expect(p.trapT).toBeCloseTo(1.65);
    expect(p.pos.x).toBe(0); expect(p.pos.z).toBe(0); expect(p.pos.y).toBeLessThan(3);
    expect(session.mask).toBe(1); expect(session.bossRun.noHit).toBe(true);
  });
  it('only permits the slide reaction in the first .3 seconds', () => {
    const { p, stage } = fixture(); p.trap(2);
    p.trapElapsed = 0.31;
    input.pressed.mockImplementation(action => action === 'slide');
    p.update(0.01, stage, basis); expect(p.mode).toBe('trapped');
    p.trap(2); p.update(0.01, stage, basis); expect(p.mode).not.toBe('trapped');
  });
  it('respects temporary immunity for traps and clears a zipline hang on capture', () => {
    const { p, session } = fixture(); p.invulnT = 1;
    expect(p.trap(1)).toBe(false);
    p.invulnT = 0; session.invincibleT = 1; expect(p.trap(1)).toBe(false);
    session.invincibleT = 0; p.hang = { line: {} }; expect(p.trap(1)).toBe(true); expect(p.hang).toBeNull();
  });
  it('consumes a mask for a cone, otherwise blocks bite until an air jump or flop landing', () => {
    const { p, session, game } = fixture(); session.mask = 1;
    p.cone(3); expect(session.mask).toBe(0); expect(p.conedT).toBe(0);
    expect(session.bossRun.noHit).toBe(false);
    p.cone(3); p._startBite(); expect(p.biteT).toBe(-1);
    expect(p.deathCone.visible).toBe(true); expect(game.ui.setConed).toHaveBeenLastCalledWith(true);
    p._airJump(); expect(p.conedT).toBe(0); expect(p.deathCone.visible).toBe(false);
    p.cone(3); p.mode = 'flop'; p.flopPhase = 'fall';
    p._onLand({}, -20, false); expect(p.conedT).toBe(0);
  });
  it('dispatches Dash contact once to an overlapped target', () => {
    const { p } = fixture();
    const e = { interactive: true, pos: { z: 0 }, box: { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 1, z: 1 } }, onDash: vi.fn(), onTouch: vi.fn() };
    p.dustDashT = 0.2; p._interact({ entities: [e] }); p._interact({ entities: [e] });
    expect(e.onDash).toHaveBeenCalledOnce();
  });
  it('reads canonical new boss unlocks and compatibility aliases', () => {
    const { p } = fixture(); save.data.beaten[4] = true; save.data.beaten[5] = true;
    expect(p.abilities).toMatchObject({ dustDash: true, moonJump: true, dust: true, moon: true });
  });
});

describe('session boss retries and awards', () => {
  function prepareRespawn(f) {
    const { session, p } = f;
    session.cp = { pos: new THREE.Vector3(), facing: 0, seq: 0, tickets: 0, levelTickets: 0, lifeLine: 0 };
    session.tickets = { restoreAfter: vi.fn(), clearFlying: vi.fn() };
    session.projectiles = { clear: vi.fn() };
    session._undoLifeLinesAbove = vi.fn(); session._pushHud = vi.fn();
    p.spawnAt = vi.fn(); session.boss.resetToPhase = vi.fn(phase => { session.boss.phase = phase; });
    session.bossPhaseCp = 2; session.bossRun.t = 27; session.bossRun.noHit = false;
  }
  it.each([true, false])('honors the explicit checkpoint policy %s without resetting fight history', (policy) => {
    const f = fixture(); prepareRespawn(f);
    f.session.boss.phaseCheckpoints = policy;
    f.session.respawn();
    expect(f.session.boss.resetToPhase).toHaveBeenCalledWith(policy ? 2 : 1);
    expect(f.session.bossRun.t).toBe(27); expect(f.session.bossRun.noHit).toBe(false);
  });
  it('counts actual Session fight updates across death, pauses busy/pause time and stops at defeat', () => {
    const { session: s, game, stage, p } = fixture();
    Object.assign(stage, { update: vi.fn(), followSky: vi.fn() });
    p.update = vi.fn(); s.tickets = { update: vi.fn() }; s.projectiles = { update: vi.fn() };
    game.mask.update = vi.fn(); game.camera.update = vi.fn(); game.fx.update = vi.fn();
    s.update(0.5); p.mode = 'dead'; s.update(1);
    expect(s.bossClock).toBe(1.5);
    s.busy = true; s.update(2); s.busy = false;
    game.state = 'pause'; s.update(2); game.state = 'play';
    s.boss.defeated = true; s.update(2);
    expect(s.bossRun.t).toBe(1.5);
    s.boss.defeated = false; save.data.godMode = true; s.update(0.1);
    save.data.godMode = false; s.update(0.1);
    expect(s.bossRun.void).toBe(true);
  });
  it('uses the owner-selected Bird/Cat stage-1 restart policy', () => {
    expect(BOSS_PHASE_CHECKPOINTS).toMatchObject({ bird: false, cat: false, cone: true });
  });
  it('counts deaths once per stage, then helps on the third retry and permanently voids medals', () => {
    vi.useFakeTimers(); const f = fixture(); prepareRespawn(f);
    const s = f.session; s.boss.phaseCheckpoints = true; s.boss.phase = 2;
    for (let i = 0; i < 3; i++) { s.dying = false; s.onPlayerDeath('fall'); }
    expect(s.bossDeaths[2]).toBe(3);
    s.respawn(); expect(s.boss.dda).toEqual({ tele: 1.15, window: 0.3 });
    expect(s.mask).toBe(1); expect(s.bossRun.void).toBe(true); expect(s.bossDdaUsed).toBe(true);
    s.bossDeaths[2] = 0; s.respawn(); expect(s.boss.dda).toEqual({ tele: 1, window: 0 });
    expect(s.bossRun.void).toBe(true);
  });
  it.each(['bird', 'cat'])('counts deaths across the whole fight for %s, which restarts at stage 1', async (key) => {
    vi.useFakeTimers(); const f = fixture(); prepareRespawn(f);
    const { session: s, game, p } = f;
    s.def = { ...s.def, bossKey: key };
    s.boss.phaseCheckpoints = false;
    // One death in each stage: no single stage reaches three, the fight does.
    for (const phase of [1, 2]) { s.boss.phase = phase; s.dying = false; s.onPlayerDeath('fall'); }
    vi.clearAllTimers(); s.dying = false;
    s.respawn();
    expect(s.boss.phase).toBe(1); expect(s.boss.dda).toEqual({ tele: 1, window: 0 });
    expect(s.mask).toBe(0); expect(s.bossDdaUsed).toBe(false); expect(s.bossRun.void).toBe(false);
    s.boss.phase = 3; s.dying = false; s.onPlayerDeath('fall'); vi.clearAllTimers(); s.dying = false;
    expect(s.bossDeaths).toEqual({ 1: 1, 2: 1, 3: 1 });
    s.respawn();
    expect(s.boss.resetToPhase).toHaveBeenLastCalledWith(1);
    expect(s.boss.dda).toEqual({ tele: 1.15, window: 0.3 });
    expect(s.mask).toBe(1); expect(s.bossRun.void).toBe(true); expect(s.bossDdaUsed).toBe(true);
    // The help carries into later stages through the real phase-entry orchestration.
    game.camera.cinematic = vi.fn(); game.camera.endCinematic = vi.fn(); game.ui.say = vi.fn(async () => {});
    s.info = { spheres: [] }; s.boss.evolve = vi.fn(async () => {});
    s.boss.phase = 2; p.mode = 'normal'; s.mask = 0;
    const entry = s.onBossPhase(s.boss, 2); await vi.runAllTimersAsync(); await entry;
    expect(s.boss.dda).toEqual({ tele: 1.15, window: 0.3 });
    expect(s.mask).toBe(1);
    s.mask = 2; s._applyBossDda(2); expect(s.mask).toBe(2);
    expect(s.bossStageDeaths).toBe(1); // the per-stage count is still reported as before
  });
  it('keeps per-stage counting for bosses with stage checkpoints', () => {
    const f = fixture(); prepareRespawn(f); const s = f.session;
    s.boss.phaseCheckpoints = true; s.bossDeaths = { 1: 2, 2: 2, 3: 2 };
    s.respawn();
    expect(s.boss.dda).toEqual({ tele: 1, window: 0 }); expect(s.mask).toBe(0); expect(s.bossRun.void).toBe(false);
  });
  it('boss deaths cost no lives, so a fight cannot end in Game Over; field deaths still do', async () => {
    vi.useFakeTimers(); const f = fixture(); prepareRespawn(f);
    const { session: s, game } = f;
    Object.assign(game.ui, { deathCard: vi.fn(), fade: vi.fn(async () => {}), clearScreen: vi.fn(), showHud: vi.fn() });
    game.gameOver = vi.fn(); vi.spyOn(save, 'write').mockImplementation(() => {});
    save.data.lives = 0; // the plan's acceptance case: no lives left at the gate
    for (let i = 0; i < 4; i++) { s.onPlayerDeath('angel'); await vi.advanceTimersByTimeAsync(2500); }
    expect(save.data.lives).toBe(0); expect(game.gameOver).not.toHaveBeenCalled();
    expect(f.p.spawnAt).toHaveBeenCalledTimes(4); expect(s.dying).toBe(false); expect(s.boss.active).toBe(true);
    s.phase = 'level'; s.boss = null; save.data.lives = 2;
    s.onPlayerDeath('fall'); await vi.advanceTimersByTimeAsync(2500);
    expect(save.data.lives).toBe(1); expect(game.gameOver).not.toHaveBeenCalled();
    save.data.lives = 0; s.onPlayerDeath('fall'); await vi.advanceTimersByTimeAsync(2500);
    expect(save.data.lives).toBe(-1); expect(game.gameOver).toHaveBeenCalledWith(s);
  });
  it.each([['fall', 3.05], ['angel', 3.55]])('a %s death costs the boss Speed clock what it always did (%s s), skipped card or not', async (type, cost) => {
    for (const skip of [false, true]) {
      vi.useFakeTimers(); const f = fixture(); prepareRespawn(f);
      const { session: s, game, stage, p } = f;
      Object.assign(game.ui, { deathCard: vi.fn(), fade: vi.fn(async () => {}), clearScreen: vi.fn(), showHud: vi.fn() });
      Object.assign(stage, { update: vi.fn(), followSky: vi.fn() }); p.update = vi.fn();
      s.tickets.update = vi.fn(); s.projectiles.update = vi.fn(); game.mask.update = vi.fn(); game.camera.update = vi.fn(); game.fx.update = vi.fn();
      s.bossRun.t = 10; s.update(0.5);
      s.onPlayerDeath(type);
      expect(s.bossRun.t).toBeCloseTo(10.5 + cost); expect(s.bossClock).toBeCloseTo(10.5 + cost);
      // The fight clock is stopped for the whole death flow, however long the player lets it run.
      for (let i = 0; i < 30 && s.dying; i++) { if (skip && i === 20) input.pressed.mockReturnValue(true); s.update(0.05); await vi.advanceTimersByTimeAsync(50); }
      if (skip) expect(s.dying).toBe(false); // the card was skipped inside the loop
      input.pressed.mockReturnValue(false);
      await vi.advanceTimersByTimeAsync(2500);
      expect(s.dying).toBe(false);
      expect(s.bossRun.t).toBeCloseTo(10.5 + cost);
      s.update(0.25); expect(s.bossRun.t).toBeCloseTo(10.75 + cost); // and runs again after the respawn
      vi.useRealTimers();
    }
  });
  it('a Box Gauntlet death costs its clock the old 3.05 s and the clock stops while Nobu is dead', async () => {
    vi.useFakeTimers(); const f = fixture(); prepareRespawn(f);
    const { session: s, game, stage, p } = f;
    Object.assign(game.ui, { deathCard: vi.fn(), fade: vi.fn(async () => {}), clearScreen: vi.fn(), showHud: vi.fn() });
    Object.assign(stage, { update: vi.fn(), followSky: vi.fn() }); p.update = vi.fn();
    s.tickets.update = vi.fn(); s.projectiles.update = vi.fn(); game.mask.update = vi.fn(); game.camera.update = vi.fn(); game.fx.update = vi.fn();
    s.phase = 'level'; s.boss = null; s.def = { ...s.def, gauntlet: true }; s.gauntletT = 20; save.data.lives = 9;
    s.update(0.5); expect(s.gauntletT).toBeCloseTo(20.5);
    s.onPlayerDeath('fall'); expect(s.gauntletT).toBeCloseTo(23.55);
    for (let i = 0; i < 20; i++) { s.update(0.05); await vi.advanceTimersByTimeAsync(50); }
    await vi.advanceTimersByTimeAsync(2500);
    expect(s.dying).toBe(false); expect(s.gauntletT).toBeCloseTo(23.55);
    s.update(0.5); expect(s.gauntletT).toBeCloseTo(24.05);
  });
  it('a trial death in the field still costs no life', async () => {
    vi.useFakeTimers(); const f = fixture(); prepareRespawn(f);
    const { session: s, game } = f;
    Object.assign(game.ui, { deathCard: vi.fn(), fade: vi.fn(async () => {}), clearScreen: vi.fn(), showHud: vi.fn() });
    s.phase = 'level'; s.boss = null; s.trial = true; const lives = save.data.lives;
    s.onPlayerDeath('fall'); await vi.advanceTimersByTimeAsync(2500);
    expect(save.data.lives).toBe(lives);
  });
  it.each(['rush', 'remix', 'trial'])('does not grant even a generic pity mask in %s boss fights', (mode) => {
    const f = fixture(); prepareRespawn(f);
    f.session[mode] = true; f.session.boss.phaseCheckpoints = true; f.session.bossDeaths[2] = 9;
    f.session.deathsAtCp = 9; f.session.respawn();
    expect(f.session.mask).toBe(0); expect(f.session.boss.dda).toEqual({ tele: 1, window: 0 });
  });
  it('persists earned medals and shows only newly earned banners', () => {
    const { session: s, game } = fixture();
    s.bossRun.t = 69; s._awardBossMedals(s.boss); s._showBossMedals();
    expect(save.data.bossMedals.bird).toEqual({ clear: true, noHit: true, speed: true, bestMs: 69000 });
    expect(game.ui.banner).toHaveBeenCalledWith('NO-HIT!', 'SPEED MEDAL', 3);
    game.ui.banner.mockClear(); s._awardBossMedals(s.boss); s._showBossMedals();
    expect(game.ui.banner).not.toHaveBeenCalled();
    s.bossDdaUsed = true; s.bossRun.t = 1; s._awardBossMedals(s.boss);
    expect(save.data.bossMedals.bird.bestMs).toBe(69000);
  });
  it('shows four pips only for four-stage bosses', () => {
    const ui = { bbFill: { style: {} }, bbPhase: {}, bossStages: 4 };
    UI.prototype.bossHp.call(ui, 0.5, 2); expect(ui.bbPhase.textContent).toBe('PHASE 2 ●●○○');
    ui.bossStages = 3; UI.prototype.bossHp.call(ui, 0.5, 2); expect(ui.bbPhase.textContent).toBe('PHASE 2');
  });
});
