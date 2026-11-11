import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../src/game/game.js';
import { Session } from '../src/game/session.js';
import { Enemy } from '../src/entities/enemies.js';
import { Boss } from '../src/bosses/common.js';
import { World } from '../src/world/physics.js';
import { input } from '../src/core/input.js';
import { save } from '../src/core/save.js';
import { audio } from '../src/audio/audio.js';
import { HITSTOP_MS, RUMBLE, KILL_SHAKE } from '../src/config/feedback.js';
import { newBossRun } from '../src/bosses/medals.js';

/** Hitstop, rumble and kill feedback (plan C2, C3, C4). */
function playGame(session = {}) {
  const game = Object.create(Game.prototype);
  Object.assign(game, { state: 'play', ui: { talking: false }, openPause: vi.fn(), _updateFlyingMasks: vi.fn(), camera: { peekInput: [0, 0] },
    session: { dying: false, update: vi.fn(), updateFrozen: vi.fn(), ...session } });
  return game;
}
const frame = (game, dt = 1 / 60) => { input.poll(); game.updatePlay(dt); };
const key = (code, type = 'keydown') => window.dispatchEvent(new KeyboardEvent(type, { code }));

beforeEach(() => {
  save.reset(); save.data.rumble = true;
  input.clear(); input.codes.clear(); input.down.clear(); input.lastDevice = 'keyboard';
  vi.spyOn(audio, 'play').mockImplementation(() => {});
});
afterEach(() => { input.clear(); input.codes.clear(); input.down.clear(); input.lastDevice = 'keyboard'; vi.restoreAllMocks(); });

describe('hitstop', () => {
  it('uses the plan values', () => {
    expect(HITSTOP_MS).toEqual({ kill: 40, bossHit: 80, maskLost: 60 });
    expect(KILL_SHAKE).toEqual({ amp: 0.12, dur: 0.12 });
  });

  it('holds the session for the stop, with the frozen tick getting the real dt, then resumes', () => {
    const game = playGame();
    frame(game); expect(game.session.update).toHaveBeenCalledTimes(1);
    game.hitstop(40);
    frame(game); frame(game); // 33 ms of the 40
    expect(game.session.update).toHaveBeenCalledTimes(1);
    expect(game.session.updateFrozen).toHaveBeenCalledTimes(2);
    expect(game.session.updateFrozen).toHaveBeenLastCalledWith(1 / 60);
    frame(game); // 50 ms: the last frozen frame
    frame(game);
    expect(game.session.update).toHaveBeenCalledTimes(2);
    expect(game.session.update).toHaveBeenLastCalledWith(1 / 60);
  });

  it('does not stack: a longer stop replaces a shorter one, never the reverse', () => {
    const game = playGame();
    game.hitstop(80); game.hitstop(40);
    expect(game.hitstopT).toBeCloseTo(0.08);
    game.feedback('kill'); game.feedback('bossHit'); game.feedback('maskLost');
    expect(game.hitstopT).toBeCloseTo(0.08);
  });

  it('keeps a press made during the stop for the first live frame', () => {
    const game = playGame();
    let sawJump = false;
    game.session.update = vi.fn(() => { sawJump ||= input.pressed('jump'); });
    game.hitstop(40);
    key('Space');
    frame(game); frame(game); frame(game);
    expect(game.session.update).not.toHaveBeenCalled();
    frame(game);
    expect(game.session.update).toHaveBeenCalledTimes(1);
    expect(sawJump).toBe(true);
    key('Space', 'keyup');
    frame(game);
    expect(input.pressed('jump')).toBe(false); // carried once, not repeated
  });

  it.each([['trial', { trial: true }], ['ranked', { ranked: true }], ['Boss Rush', { rush: true }], ['Box Gauntlet', { def: { gauntlet: true } }]])(
    'is off in %s, so no clock is shortened', (_name, mode) => {
      const game = playGame(mode);
      game.feedback('kill'); game.feedback('bossHit'); game.feedback('maskLost'); game.hitstop(500);
      expect(game.hitstopT || 0).toBe(0);
      frame(game); frame(game);
      expect(game.session.update).toHaveBeenCalledTimes(2);
      expect(game.session.updateFrozen).not.toHaveBeenCalled();
    });

  it('a frozen frame advances the boss medal clock by the real dt and moves nothing else', () => {
    const game = { state: 'play', loadout: { effects: {} }, ui: {}, camera: { update: vi.fn() }, fx: { update: vi.fn() }, mask: { update: vi.fn() },
      player: { god: false, update: vi.fn(), pos: new THREE.Vector3() } };
    const s = new Session(game, 1); game.session = s;
    const stage = { game, world: new World(), entities: [], track: null, update: vi.fn(), followSky: vi.fn() };
    s.stage = stage; s.phase = 'boss'; s.bossRun = newBossRun();
    s.boss = new Boss(stage, 0, 0, 0, { key: 'bird' }); s.boss.active = true;
    s.updateFrozen(0.05); s.updateFrozen(0.03);
    expect(s.bossRun.t).toBeCloseTo(0.08); expect(s.bossClock).toBeCloseTo(0.08);
    expect(stage.update).not.toHaveBeenCalled(); expect(game.player.update).not.toHaveBeenCalled();
    expect(game.camera.update).toHaveBeenCalledWith(0.03, game.player); // shake keeps decaying
    expect(game.fx.update).toHaveBeenCalledWith(0.03);
    s.busy = true; s.updateFrozen(1); expect(s.bossRun.t).toBeCloseTo(0.08); // same rules as a live frame
  });
});

describe('hit feedback call sites', () => {
  function enemy() {
    const game = { camera: { shake: vi.fn() }, feedback: vi.fn(), session: { onEnemyDefeated: vi.fn(), chainSoundPitch: 1 },
      player: { pos: new THREE.Vector3() }, fx: { sparkle: vi.fn() } };
    const e = Object.create(Enemy.prototype);
    Object.assign(e, { stage: { game }, game, state: 'alive', stateT: 0, dead: false, interactive: true, pos: new THREE.Vector3(2, 0, 0), knockV: new THREE.Vector3() });
    return { e, game };
  }
  it.each(['knock', 'squash'])('an enemy %s shakes the camera a little and asks for kill feedback, once', (how) => {
    const { e, game } = enemy();
    expect(e.alive).toBe(true);
    e[how](); e[how]();
    expect(game.camera.shake).toHaveBeenCalledTimes(1);
    expect(game.camera.shake).toHaveBeenCalledWith(0.12, 0.12);
    expect(game.feedback).toHaveBeenCalledTimes(1);
    expect(game.feedback).toHaveBeenCalledWith('kill');
    expect(game.session.onEnemyDefeated).toHaveBeenCalledTimes(1);
  });

  it('a boss hit asks for bossHit feedback', () => {
    const game = { camera: { shake: vi.fn() }, feedback: vi.fn(), ui: { bossHp: vi.fn() }, fx: { sparkle: vi.fn() }, session: { onBossPhase: vi.fn(), onBossDefeated: vi.fn() } };
    const stage = { game, world: new World(), entities: [], scene: new THREE.Scene() };
    const boss = new Boss(stage, 0, 0, 0, { key: 'bird' });
    boss.vulnerable = true; boss.hitCool = 0;
    expect(boss.damage()).toBe(true);
    expect(game.feedback).toHaveBeenCalledWith('bossHit');
    expect(boss.damage()).toBe(false); // not vulnerable: no second stop
    expect(game.feedback).toHaveBeenCalledTimes(1);
  });
});

describe('rumble', () => {
  const padWith = (playEffect) => ({ connected: true, index: 0, id: 'pad', mapping: 'standard', axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), vibrationActuator: playEffect ? { playEffect } : undefined });
  function withPad(pad, device = 'pad') {
    vi.stubGlobal('navigator', { getGamepads: () => [pad] });
    input.poll(); input.lastDevice = device;
  }
  afterEach(() => { vi.stubGlobal('navigator', { getGamepads: () => [] }); input.poll(); vi.unstubAllGlobals(); });

  it('uses the plan values', () => {
    expect(RUMBLE).toEqual({ maskLost: [150, 0.8, 0.4], death: [250, 1, 0.6], flop: [90, 0.6, 0.2], bossHit: [120, 0.7, 0.5] });
  });

  it('plays a dual-rumble effect for a pad player, and feedback() picks the event values', () => {
    const playEffect = vi.fn(() => Promise.resolve('complete'));
    withPad(padWith(playEffect));
    const game = playGame();
    game.feedback('death');
    expect(playEffect).toHaveBeenCalledWith('dual-rumble', { startDelay: 0, duration: 250, strongMagnitude: 1, weakMagnitude: 0.6 });
    game.feedback('kill'); // a kill has hitstop but no rumble
    expect(playEffect).toHaveBeenCalledTimes(1);
    game.feedback('flop');
    expect(playEffect).toHaveBeenLastCalledWith('dual-rumble', { startDelay: 0, duration: 90, strongMagnitude: 0.6, weakMagnitude: 0.2 });
  });

  it('stays silent when rumble is off, for a keyboard player, and on a pad without an actuator', () => {
    const playEffect = vi.fn(() => Promise.resolve());
    const game = playGame();
    withPad(padWith(playEffect));
    save.data.rumble = false; game.feedback('death');
    save.data.rumble = true; input.lastDevice = 'keyboard'; game.feedback('death');
    expect(playEffect).not.toHaveBeenCalled();
    withPad(padWith(null));
    expect(() => game.feedback('death')).not.toThrow();
    withPad(padWith(() => { throw new Error('no haptics'); }));
    expect(() => game.feedback('death')).not.toThrow();
  });

  it('still rumbles in a trial, where hitstop is off', () => {
    const playEffect = vi.fn(() => Promise.resolve());
    withPad(padWith(playEffect));
    const game = playGame({ trial: true });
    game.feedback('maskLost');
    expect(playEffect).toHaveBeenCalledTimes(1);
    expect(game.hitstopT || 0).toBe(0);
  });

  it('the pause menu has a RUMBLE item that toggles and saves', () => {
    const game = Object.create(Game.prototype);
    Object.assign(game, { state: 'pause', session: null, pauseSel: 0, pauseExitSel: null, _drawPause: vi.fn() });
    vi.spyOn(save, 'write').mockImplementation(() => {});
    game.pauseSel = game._pauseItems().findIndex((i) => i.id === 'rumble');
    expect(game._pauseItems()[game.pauseSel].label).toBe('RUMBLE: ON');
    input._pressed = new Set(['confirm']); game.updatePause();
    expect(save.data.rumble).toBe(false);
    expect(game._pauseItems()[game.pauseSel].label).toBe('RUMBLE: OFF');
    input._pressed = new Set(['confirm']); game.updatePause();
    expect(save.data.rumble).toBe(true);
    expect(save.write).toHaveBeenCalledTimes(2);
  });
});
