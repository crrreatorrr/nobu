import * as THREE from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../src/art/assets.js', () => ({
  Assets: {
    model: () => null,
    tex: () => new THREE.Texture(),
    tiled: () => new THREE.Texture(),
    has: () => false,
    aspect: () => 1
  }
}));
vi.mock('../src/audio/audio.js', () => ({ audio: { play: vi.fn() } }));
import { Player, MOON_JUMP, TUNING } from '../src/player/player.js';
import { World } from '../src/world/physics.js';
import { save } from '../src/core/save.js';
import { input } from '../src/core/input.js';
import { audio } from '../src/audio/audio.js';
const noop = () => {},
  basis = { right: { x: 1, z: 0 }, forward: { x: 0, z: 1 } };
function fixture(earned = true) {
  save.reset();
  save.data.godMode = false;
  save.data.beaten[5] = earned;
  const fx = new Proxy({}, { get: (o, k) => o[k] ?? (o[k] = vi.fn()) });
  const game = {
    loadout: { effects: {}, cosmeticSlots: () => ({}) },
    fx,
    ui: { tutorial: noop, setConed: noop },
    camera: { shake: noop },
    onFlop: noop,
    onPlayerDeath: vi.fn()
  };
  const p = Object.create(Player.prototype);
  Object.assign(p, {
    game,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    root: new THREE.Group(),
    model: {},
    wings: {},
    halo: {},
    stars: {},
    deathCone: { position: new THREE.Vector3() },
    _animate: noop,
    _updateShadow: noop,
    _paintGear: noop
  });
  p.body = { pos: p.pos, vel: p.vel, h: 1.3, hw: 0.3, hd: 0.3, onLand: (...a) => p._onLand(...a) };
  const stage = { game, world: new World(), entities: [], killYAt: () => -20 };
  game.stage = stage;
  game.player = p;
  game.session = { trial: false, nextSeq: () => 1, mask: 0 };
  const floor = stage.world.addBox(0, -1, 0, 80, 1, 80);
  p.spawnAt(new THREE.Vector3(), 0);
  p.body.grounded = true;
  p.body.ground = floor;
  return { p, game, stage };
}
let pressed = new Set(),
  held = new Set();
beforeEach(() => {
  pressed = new Set();
  held = new Set();
  input.state.x = input.state.y = 0;
  vi.spyOn(input, 'pressed').mockImplementation((k) => pressed.has(k));
  vi.spyOn(input, 'held').mockImplementation((k) => held.has(k));
});
afterEach(() => vi.restoreAllMocks());
function tick(f, dt = 1 / 120) {
  f.p.update(dt, f.stage, basis);
  pressed.clear();
}
function charge(f) {
  pressed.add('slide');
  held.add('slide');
  for (let i = 0; i < 72; i++) tick(f);
}
it('keeps unearned slides immediate and earned neutral taps become the same standing slide on early release', () => {
  let f = fixture(false);
  pressed.add('slide');
  held.add('slide');
  tick(f);
  expect(f.p.mode).toBe('slide');
  expect(f.p.slideT).toBeGreaterThan(0);
  f = fixture();
  pressed.add('slide');
  held.add('slide');
  tick(f, 0.1);
  expect(f.p.mode).toBe('normal');
  held.delete('slide');
  tick(f);
  expect(f.p.mode).toBe('slide');
  expect(f.p.moonHold).toBeNull();
  expect(f.p.vel.z).toBeCloseTo(TUNING.SLIDE_SPEED);
});
it('charges exactly.6seconds from press and launches only on a later jump with air jumps preserved', () => {
  const f = fixture();
  charge(f);
  expect(f.p.moonHold.charged).toBe(true);
  expect(f.p.body.h).toBe(0.8);
  expect(audio.play).toHaveBeenCalledWith('chime');
  pressed.add('jump');
  held.add('jump');
  tick(f);
  expect(f.p.vel.y).toBeCloseTo(MOON_JUMP.speed - TUNING.GRAVITY / 120);
  expect(f.p.canDouble).toBe(true);
  expect(f.p.moonHold).toBeNull();
  expect(f.p.body.h).toBe(1.3);
  expect(f.p.zoomArmed).toBe(false);
});
it('does not replace ordinary jumps, directional slides or paid air dashes', () => {
  let f = fixture();
  pressed.add('jump');
  held.add('jump');
  tick(f);
  expect(f.p.vel.y).toBeCloseTo(TUNING.JUMP - TUNING.GRAVITY / 120);
  f = fixture();
  input.state.y = 1;
  pressed.add('slide');
  held.add('slide');
  tick(f);
  expect(f.p.mode).toBe('slide');
  expect(f.p.moonHold).toBeNull();
  f = fixture();
  f.game.loadout.effects.air_dash = { charges_per_jump: 1, dash_time_s: 0.2, distance_m: 3 };
  f.p.body.grounded = false;
  f.p.dashCharges = 1;
  pressed.add('dash');
  tick(f);
  expect(f.p.airDashT).toBeGreaterThan(0);
  expect(f.p.dashCharges).toBe(0);
  expect(f.p.moonHold).toBeNull();
});
it('cancels on steering, release, damage and reset without arming Zoomies', () => {
  const f = fixture();
  save.data.beaten[2] = true;
  charge(f);
  input.state.x = 1;
  tick(f);
  expect(f.p.moonHold).toBeNull();
  expect(f.p.zoomArmed).toBe(false);
  input.state.x = 0;
  held.clear();
  charge(f);
  held.clear();
  tick(f);
  expect(f.p.moonHold).toBeNull();
  expect(f.p.mode).toBe('normal');
  charge(f);
  f.game.session.mask = 1;
  f.game.session.setMask = (n) => (f.game.session.mask = n);
  f.p.hurt('angel');
  expect(f.p.moonHold).toBeNull();
  f.p.reset();
  expect(f.p.moonHold).toBeNull();
});
it('allows the earned move in trials and keeps its launch-height advantage in real gravity', () => {
  const f = fixture();
  f.game.session.trial = true;
  charge(f);
  pressed.add('jump');
  held.add('jump');
  tick(f);
  let high = f.p.pos.y;
  for (let i = 0; i < 160; i++) {
    tick(f);
    high = Math.max(high, f.p.pos.y);
  }
  expect(high).toBeGreaterThan(4.8);
  expect(high).toBeLessThan(5.1);
});
it('measures real normal/Crown/Moon apexes and retains the extra jump after Moon launch', () => {
  const peak = (moon, crown) => {
    const f = fixture(moon);
    if (crown) f.game.loadout.effects.extra_air_jumps = { count: 1 };
    if (moon) charge(f);
    pressed.add('jump');
    held.add('jump');
    tick(f);
    let high = f.p.pos.y;
    for (let i = 0; i < 360; i++) {
      if (f.p.vel.y < 0.4 && f.p.vel.y > -0.8 && f.p.canDouble) pressed.add('jump');
      tick(f);
      high = Math.max(high, f.p.pos.y);
    }
    return high;
  };
  const normal = peak(false, false),
    crown = peak(false, true),
    moon = peak(true, false);
  expect(normal).toBeLessThan(4.3);
  expect(crown).toBeLessThan(6.3);
  expect(moon).toBeGreaterThan(6.3);
});
it('lands on a6.2m Moon ledge with real collision while an ordinary Crown triple cannot reach it', () => {
  const attempt = (moon, crown) => {
    const f=fixture(moon), ledge=f.stage.world.addBox(0,5.7,5,4,.5,4);
    if(crown)f.game.loadout.effects.extra_air_jumps={count:1};
    if(moon)charge(f);
    pressed.add('jump');held.add('jump');tick(f);
    let landed=false;
    for(let i=0;i<360;i++){
      if(f.p.vel.y<.4&&f.p.vel.y>-.8&&f.p.canDouble)pressed.add('jump');
      input.state.y=f.p.pos.z<4.5?1:0;
      tick(f);
      if(f.p.body.grounded&&f.p.body.ground===ledge){landed=true;break;}
    }
    input.state.y=0;held.clear();pressed.clear();
    return landed;
  };
  expect(attempt(false,true)).toBe(false);
  expect(attempt(true,false)).toBe(true);
});
it('tests neutral charge against raw stick axes even when a side camera scales or ignores depth', () => {
  for (const [amount, ignoreDepth] of [
    [0.3, false],
    [1, true]
  ]) {
    const f = fixture();
    f.game.camera.sideAxis = true;
    f.game.camera.opts = { ignoreDepth };
    input.state.x = 0;
    input.state.y = amount;
    pressed.add('slide');
    held.add('slide');
    tick(f);
    expect(f.p.moonHold).toBeNull();
    expect(f.p.mode).toBe('slide');
    held.clear();
  }
  const f = fixture();
  input.state.y = 0.19;
  pressed.add('slide');
  held.add('slide');
  for (let i = 0; i < 72; i++) tick(f);
  expect(f.p.moonHold.charged).toBe(true);
  expect(f.p.pos.x).toBe(0);
  expect(f.p.pos.z).toBe(0);
});
