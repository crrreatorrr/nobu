import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Player, SLIDE_JUMP, TUNING } from '../src/player/player.js';
import { World } from '../src/world/physics.js';
import { input } from '../src/core/input.js';
import { audio } from '../src/audio/audio.js';
import { resetWorld } from './helpers.js';

/** Slide-jump as a long jump (plan C1, option 1), off in time trials and Box Gauntlets. */
const basis = { right: { x: 1, z: 0 }, forward: { x: 0, z: 1 } };
const DT = 1 / 60;
let pressed, held;
function fixture(session = {}) {
  const fx = new Proxy({}, { get: (o, k) => o[k] ?? (o[k] = vi.fn()) });
  const game = { loadout: { effects: {} }, fx, ui: { setConed() {}, tutorial() {} }, camera: { cam: new THREE.PerspectiveCamera(58), shake() {} }, onPlayerDeath: vi.fn(), onFlop() {} };
  const p = Object.create(Player.prototype);
  Object.assign(p, { game, pos: new THREE.Vector3(), vel: new THREE.Vector3(), root: new THREE.Group(), model: {}, wings: {}, halo: {},
    deathCone: { visible: false, position: new THREE.Vector3() }, stars: {}, _animate() {}, _updateShadow() {}, _paintGear() {} });
  p.body = { pos: p.pos, vel: p.vel, h: 1.3, hw: 0.3, hd: 0.3 };
  p.reset(); p.body.grounded = true; p.barkT = 1; p.barkCool = 0; p.stepT = 0;
  const stage = { game, world: new World(), entities: [], track: null, killYAt: () => -20 };
  p.body.ground = stage.world.addBox(0, -1, 0, 400, 1, 400);
  game.stage = stage; game.player = p;
  game.session = { level: 1, phase: 'level', nextSeq: () => 1, onBreak() {}, rescueDog() {}, ...session };
  p.facing = p.targetFacing = 0; // facing +z, the stick's "up"
  return { p, game, stage };
}
const step = (f, n = 1) => { for (let i = 0; i < n; i++) { f.p.update(DT, f.stage, basis); pressed.clear(); } };
/** Runs up, optionally slides, jumps with Jump held, and returns the air distance. */
function jump(f, { slide = false, during = null } = {}) {
  const { p } = f;
  input.state.x = 0; input.state.y = 1;
  step(f, 40);
  if (slide) { pressed.add('slide'); held.add('slide'); step(f, 1); held.delete('slide'); step(f, 6); expect(p.mode).toBe('slide'); }
  pressed.add('jump'); held.add('jump');
  step(f, 1);
  const from = p.pos.clone();
  let frames = 0, top = 0;
  while (!p.body.grounded && frames < 240) { during?.(frames, f); step(f, 1); frames++; top = Math.max(top, Math.hypot(p.vel.x, p.vel.z)); }
  held.delete('jump');
  return { dist: Math.hypot(p.pos.x - from.x, p.pos.z - from.z), frames, top };
}

beforeEach(() => {
  resetWorld();
  pressed = new Set(); held = new Set();
  vi.spyOn(audio, 'play').mockImplementation(() => {});
  vi.spyOn(input, 'pressed').mockImplementation((a) => pressed.has(a));
  vi.spyOn(input, 'held').mockImplementation((a) => held.has(a));
  input.state.x = 0; input.state.y = 0;
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createLinearGradient: () => gradient, createRadialGradient: () => gradient }, { get: (o, k) => o[k] || (() => {}) });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
});
afterEach(() => { input.state.x = 0; input.state.y = 0; vi.restoreAllMocks(); });

describe('slide-jump', () => {
  it('keeps its tuning outside TUNING, which the gauntlets pin', () => {
    expect(SLIDE_JUMP).toEqual({ decay: 4, cone: 0.5 });
    expect(TUNING.SLIDE_JUMP_SPEED).toBe(10.5);
    expect(TUNING).not.toHaveProperty('SLIDE_JUMP');
  });

  it('is a long jump: 10 to 20 percent further than a running jump, which is unchanged', () => {
    const run = jump(fixture());
    const long = jump(fixture(), { slide: true });
    const trialRun = jump(fixture({ trial: true }));
    expect(run.dist).toBeCloseTo(trialRun.dist, 6);
    expect(run.top).toBeCloseTo(TUNING.RUN, 3);
    expect(long.frames).toBe(run.frames); // same arc, more ground
    expect(long.dist / run.dist).toBeGreaterThan(1.10);
    expect(long.dist / run.dist).toBeLessThan(1.20);
    expect(long.dist).toBeGreaterThan(6.0);
    expect(long.dist).toBeLessThan(6.8);
  });

  it.each([['a time trial', { trial: true }], ['Boss Rush', { rush: true, phase: 'boss' }], ['a story boss fight (Speed medal clock)', { phase: 'boss' }], ['a Box Gauntlet', { def: { gauntlet: true } }]])(
    'is off in %s: the jump falls back to run speed at once, as it always has', (_name, mode) => {
      const f = fixture(mode);
      const off = jump(f, { slide: true });
      const run = jump(fixture(mode));
      expect(f.p.airCarry).toBe(0);
      expect(off.dist - run.dist).toBeLessThan(0.15); // the old 5.52 m against 5.47 m
      expect(off.dist).toBeLessThan(jump(fixture(), { slide: true }).dist - 0.5);
    });

  it('gates on modes that exist: an unset session.ranked changes nothing, and the field keeps the long jump', () => {
    const field = jump(fixture({ phase: 'level', ranked: true }), { slide: true });
    expect(field.dist).toBeCloseTo(jump(fixture(), { slide: true }).dist, 6);
  });

  it('fades at 4 m/s per second and never drops below run speed', () => {
    const f = fixture();
    const speeds = [];
    jump(f, { slide: true, during: (i, { p }) => { if (i > 2) speeds.push(Math.hypot(p.vel.x, p.vel.z)); } });
    for (let i = 1; i < speeds.length; i++) expect(speeds[i]).toBeLessThanOrEqual(speeds[i - 1] + 1e-9);
    expect(speeds[0]).toBeGreaterThan(10);
    expect(speeds[0] - speeds[30]).toBeCloseTo(SLIDE_JUMP.decay * 30 * DT, 1);
    expect(Math.min(...speeds)).toBeGreaterThanOrEqual(TUNING.RUN - 1e-6);
  });

  it('is lost when the stick is released or turned more than 60 degrees away, and does not come back', () => {
    for (const turn of [() => { input.state.x = 0; input.state.y = 0; }, () => { input.state.x = 1; input.state.y = 0.2; }]) {
      const f = fixture();
      let after = null;
      const r = jump(f, { slide: true, during: (i, { p }) => {
        if (i === 6) turn();
        if (i === 8) { expect(p.airCarry).toBe(0); input.state.x = 0; input.state.y = 1; }
        if (i === 30) after = Math.hypot(p.vel.x, p.vel.z);
      } });
      expect(after).toBeLessThanOrEqual(TUNING.RUN + 1e-6);
      expect(r.dist).toBeLessThan(6.2);
    }
  });

  it('is cleared by landing, a belly flop, a hit, an air dash and a reset', () => {
    const f = fixture(), { p } = f;
    jump(f, { slide: true });
    step(f, 1); // this fixture has no body.onLand hook, so the first grounded frame clears it
    expect(p.body.grounded).toBe(true); expect(p.airCarry).toBe(0);
    p.airCarry = 10; p._onLand({}, 0, false); expect(p.airCarry).toBe(0);
    for (const clear of [() => p._startFlop(), () => { f.game.session.mask = 1; f.game.session.setMask = vi.fn(); p._reportHurt = vi.fn(); p.hurt('angel'); },
      () => { f.game.loadout.effects = { air_dash: { distance_m: 3, dash_time_s: 0.18 } }; p.dashCharges = 1; p.body.grounded = false; p.airDashT = 0; p._startAirDash(); }, () => p.reset()]) {
      p.airCarry = 10; p.mode = 'normal'; p.invulnT = 0;
      clear();
      expect(p.airCarry).toBe(0);
    }
  });
});
