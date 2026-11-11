import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/art/assets.js', () => ({
  Assets: {
    model: vi.fn(() => null),
    tex: () => new THREE.Texture(),
    tiled: () => new THREE.Texture(),
    has: () => false,
    aspect: () => 1
  }
}));
vi.mock('../src/audio/audio.js', () => ({ audio: { play: vi.fn() } }));
import { TitanArena, TITAN_PILLARS, TITAN_TNT, buildTitanArena } from '../src/bosses/titanArena.js';
import { RoombaTitan, TITAN_PLANS, TITAN_CHAINS, normalizeTitanModel } from '../src/bosses/roombaTitan.js';
import { Projectiles } from '../src/bosses/common.js';
import { World, moveBody } from '../src/world/physics.js';
import { Stage } from '../src/world/stage.js';
import { Player } from '../src/player/player.js';
import { Session } from '../src/game/session.js';
import { BOSS } from '../src/config/difficulty.js';
import { input } from '../src/core/input.js';
import { save } from '../src/core/save.js';
import { buildBoss4Arena } from '../src/levels/boss4Arena.js';
const noop = () => {};
beforeEach(() => {
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
});
afterEach(() => vi.restoreAllMocks());
function fixture() {
  const player = {
    pos: new THREE.Vector3(0, 0, 9),
    vel: new THREE.Vector3(),
    body: { grounded: true, hw: 0.3, hd: 0.3, h: 1.3 },
    forward: new THREE.Vector3(0, 0, 1),
    biteT: -1,
    mode: 'normal',
    dead: false,
    hurt: vi.fn(),
    bounce: vi.fn()
  };
  const fx = new Proxy({ sparks: { spawn: vi.fn() } }, { get: (o, k) => o[k] ?? (o[k] = vi.fn()) });
  const game = {
    player,
    fx,
    camera: { shake: vi.fn() },
    ui: { bossHp: vi.fn(), banner: vi.fn() },
    session: { onBossPhase: vi.fn(), onBossDefeated: vi.fn(), nextSeq: () => 1, onBreak: vi.fn() }
  };
  const stage = {
    game,
    scene: new THREE.Scene(),
    world: new World(),
    entities: [],
    sun: { intensity: 1.3 },
    hemi: { intensity: 1.1 },
    add(e) {
      this.entities.push(e);
      this.scene.add(e.obj);
      return e;
    }
  };
  game.session.stage = stage;
  game.session.projectiles = new Projectiles(game, stage);
  const pieces = buildTitanArena(stage);
  const boss = stage.add(new RoombaTitan(stage));
  game.session.boss = boss;
  boss.active = true;
  return { game, stage, player, boss, ...pieces };
}
function step(boss, seconds) {
  for (let t = 0; t < seconds - 1e-7; t += 1 / 120) boss.update(Math.min(1 / 120, seconds - t));
}
describe('Titan arena physical contract', () => {
  it('builds exact pillars, walls, spawn, sphere and7raw tickets', () => {
    const { game } = fixture();
    vi.spyOn(Stage.prototype, 'decor').mockImplementation(noop);
    const stage = new Stage(game, 'house'),
      tickets = { add: vi.fn() };
    const info = buildBoss4Arena(game, stage, tickets);
    expect(info.pillars.map((e) => [e.pos.x, e.pos.z])).toEqual(TITAN_PILLARS);
    expect(info.tntSpots.map((s) => [s.x, s.z])).toEqual(TITAN_TNT);
    expect(info.walls).toHaveLength(4);
    expect(info.spawn.toArray()).toEqual([0, 0, 9]);
    expect(tickets.add).toHaveBeenCalledTimes(7);
    expect(stage.world.groundBelow(12, 1, 12)).toBe(0);
  });
  it('pushes throughclosingwallsinward aroundboth near furniturelegs withoutcrushing', () => {
    const { player, stage, titanArena: a } = fixture();
    stage.world.addBox(0, -6, 0, 26, 6, 26);
    player.body.pos = player.pos;
    player.body.vel = player.vel;
    for (const sign of [-1, 1]) {
      player.pos.set(sign * 12.6, 0, 3);
      for (let i = 0; i <= 180; i++) {
        a.setWalls(13 - (3.25 * i) / 180);
        moveBody(stage.world, player.body, 1 / 120);
        expect(Math.abs(player.pos.x) + 0.3).toBeLessThan(a.wallR);
        for (const p of a.pillars)
          expect(Math.abs(player.pos.x - p.pos.x) < 0.9 && Math.abs(player.pos.z - p.pos.z) < 0.9).toBe(
            false
          );
      }
      a.setWalls(13);
    }
    expect(player.hurt).not.toHaveBeenCalled();
  });
  it('turnsrug aftersix seconds withone-second arrowtell andreal externalpush', () => {
    const { titanArena: a, player } = fixture();
    a.setPhase(2);
    player.pos.set(0, 0, 0);
    a.conveyor.update(5.1);
    expect(a.conveyor.dir.z).toBe(1);
    expect(a.conveyor.arrow.rotation.y).toBeCloseTo(Math.PI / 2);
    a.conveyor.update(0.9);
    expect(a.conveyor.dir.x).toBeCloseTo(1);
    expect(player.pushX).toBeCloseTo(3);
    a.setPhase(1);
    player.pushX = player.pushZ = 0;
    a.conveyor.update(1);
    expect(player.pushX).toBe(0);
  });
  it('keepsTNT noncountable withactual2.3 explosion andsix-secondrespawn', () => {
    const { titanArena: a, player, game } = fixture();
    a.setPhase(3);
    const c = a.tntSpots[0].cat;
    player.pos.copy(c.pos).add(new THREE.Vector3(2, 0, 0));
    c.pounce();
    expect(player.hurt).toHaveBeenCalledWith('flat', c.pos.x, c.pos.z);
    expect(c.countable).toBe(false);
    expect(game.session.onBreak).not.toHaveBeenCalled();
    a.update(5.99);
    expect(c.dead).toBe(true);
    a.update(0.01);
    expect(c.dead).toBe(false);
  });
  it('restoreslights,walls,legs,TNTandconveyor correctlyatphasecheckpoint', () => {
    const { titanArena: a, stage } = fixture();
    a.setPhase(3);
    a.darken();
    a.setWalls(9.75);
    const leg = a.addLeg(2, 2);
    expect(stage.sun.intensity).toBe(0.12);
    expect(a.lumi.radius).toBe(4);
    a.update(8);
    expect(stage.sun.intensity).toBe(1.3);
    a.reset();
    expect(leg.solid.enabled).toBe(false);
    expect(a.wallR).toBe(13);
    expect(a.stocked).toBe(true);
    expect(a.conveyor.enabled).toBe(true);
    expect(a.lumi.visible).toBe(false);
  });
});
describe('Titan actual attack states', () => {
  it('normalizescomposedfallbackheightwithouttouchingitsmaterial', () => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3, 1.8, 20),
      new THREE.MeshLambertMaterial({ color: 0x3a3d44 })
    );
    m.position.y = 4;
    m.scale.setScalar(4.5);
    const color = m.material.color.getHex();
    expect(normalizeTitanModel(m)).toBeCloseTo(3);
    const b = new THREE.Box3().setFromObject(m);
    expect(b.max.y - b.min.y).toBeCloseTo(1.8);
    expect(b.min.y).toBeCloseTo(0);
    expect(m.material.color.getHex()).toBe(color);
  });
  it('usesfullDDAtellandlocksitslane.3secondsbeforelaunch', () => {
    const { boss, player } = fixture();
    boss.dda.tele = 1.15;
    boss.beginAttack('charge');
    expect(boss.tell).toBeCloseTo(0.78 * 1.15);
    step(boss, 0.65);
    player.pos.x = 4;
    step(boss, 0.03);
    const locked = boss.chargeDir.clone();
    player.pos.x = -4;
    step(boss, 0.2);
    expect(boss.chargeDir.toArray()).toEqual(locked.toArray());
    expect(boss.pos.toArray()).toEqual([0, 0, -6]);
  });
  it('stunsatfirstwallwellbefore20secondsandrequiresbuttonflop', () => {
    const { boss, player } = fixture();
    boss.beginAttack('charge');
    for (let i = 0; i < 500 && boss.state !== 'stunned'; i++) boss.update(1 / 120);
    expect(boss.state).toBe('stunned');
    expect(boss.vulnerable).toBe(true);
    player.pos.copy(boss.pos);
    player.pos.y = 1.6;
    boss.onStomp(player);
    expect(boss.hp).toBe(9);
    expect(player.bounce).toHaveBeenCalled();
    player.mode = 'flop';
    boss.onStomp(player);
    expect(boss.hp).toBe(8);
  });
  it('withholdsfirstS2wallstunonlyforfreshrechargeandstunssecondwall', () => {
    const { boss } = fixture();
    boss.phase = 2;
    boss.arena.setPhase(2);
    expect(boss.startChain(['charge', 'recharge'])).toBe(true);
    for (let i = 0; i < 800 && boss.state !== 'recharge'; i++) boss.update(1 / 120);
    expect(boss.state).toBe('recharge');
    expect(boss.vulnerable).toBe(false);
    expect(boss.tell).toBeCloseTo(0.656);
    for (let i = 0; i < 1000 && boss.state !== 'stunned'; i++) boss.update(1 / 120);
    expect(boss.state).toBe('stunned');
  });
  it('limitsS3reflectionsto3andwaitsnormalTNTrespawnbeforefreshcharge', () => {
    const { boss, titanArena: a, player } = fixture();
    boss.phase = 3;
    a.setPhase(3);
    a.tntSpots[0].cat.pounce();
    boss.beginAttack('charge');
    step(boss, 1);
    expect(boss.pos.toArray()).toEqual([0, 0, -6]);
    a.update(6);
    boss.update(0.01);
    expect(boss.stateT).toBe(0);
    expect(boss.tell).toBeCloseTo(0.68);
    a.pillars.forEach((p) => (p.solid.enabled = false));
    a.tntSpots.forEach((s) => s.cat.pos.set(100, 0, 100));
    player.pos.set(6, 0, 8);
    boss.beginAttack('charge');
    for (let i = 0; i < 1500 && boss.state === 'charge'; i++) boss.update(1 / 120);
    expect(boss.bounces).toBeLessThanOrEqual(3);
    expect(boss.state).not.toBe('charge');
  });
  it('cancelsactualsuctionwithbark,usingcanonicaldistancepulland.8stun', () => {
    const { boss, player } = fixture();
    boss.phase = 2;
    player.pos.set(0, 0, 0);
    boss.beginAttack('suction');
    step(boss, 0.4);
    boss.onBark();
    expect(boss.state).toBe('suction');
    step(boss, 0.2);
    expect(player.pushZ).toBeLessThan(0);
    boss.onBark();
    expect(boss.state).toBe('stunned');
    expect(boss.stunFor).toBe(0.8);
  });
  it('landsthreelegsolidsandremovesthemafter2seconds', () => {
    const { boss, game, titanArena: a } = fixture();
    boss.phase = 3;
    a.setPhase(3);
    boss.beginAttack('stomp');
    for (let i = 0; i < 190; i++) {
      boss.update(1 / 120);
      game.session.projectiles.update(1 / 120);
    }
    expect(a.legs).toHaveLength(3);
    expect(a.legs.every((l) => l.solid.enabled && l.dimensions.h === 6)).toBe(true);
    a.update(2);
    expect(a.legs.every((l) => !l.solid.enabled)).toBe(true);
  });
  it('leg stomp markers stay readable during Lights Out: an unlit rim that is not black', () => {
    const { boss, game, stage, titanArena: a } = fixture();
    stage.sun = { intensity: 1 }; stage.hemi = { intensity: 1 };
    boss.phase = 3;
    a.setPhase(3);
    a.darken();
    expect(a.darkT).toBeGreaterThan(0);
    expect(stage.sun.intensity).toBeLessThan(0.2);
    boss.beginAttack('stomp');
    for (let i = 0; i < 100; i++) { boss.update(1 / 120); game.session.projectiles.update(1 / 120); }
    const legs = game.session.projectiles.list.filter((pr) => pr.kind === 'drop');
    expect(legs).toHaveLength(3);
    expect(a.darkT).toBeGreaterThan(0);
    for (const pr of legs) {
      const rim = pr.marker.userData.rim;
      expect(pr.marker.visible).toBe(true);
      expect(rim.material.isMeshBasicMaterial).toBe(true); // unlit: the dimmed sun does not reach it
      expect(rim.material.fog).toBe(false);
      expect(rim.material.color.getHex()).not.toBe(0x000000);
      expect(rim.material.color.getHSL({}).l).toBeGreaterThan(0.5);
      expect(rim.material.opacity).toBeGreaterThanOrEqual(0.35);
    }
  });
  it('finishestotalvacuumwithfullbonuswindowandresetcannotleaveitlocked', () => {
    const { boss, titanArena: a } = fixture();
    boss.pos.set(0, 0, 0);
    boss.beginAttack('ultimate');
    step(boss, 3.21);
    expect(a.wallR).toBe(9.75);
    step(boss, 5.41);
    expect(boss.state).toBe('stunned');
    expect(boss.stunFor).toBeCloseTo(boss.W + 1);
    expect(boss.ulting).toBe(false);
    boss.resetToPhase(3);
    expect(boss.hp).toBe(3);
    expect(a.wallR).toBe(13);
    expect(a.stocked).toBe(true);
  });
  it('landsactualkeyboardjumpthenfloponthebuttonineveryphasewithoutpaidmovement', () => {
    save.reset();
    save.data.godMode = false;
    const { game, stage, boss } = fixture();
    game.stage = stage;
    stage.killYAt = () => -14;
    stage.world.addBox(0, -6, 0, 26, 6, 26);
    game.loadout = { effects: {}, cosmeticSlots: () => ({}) };
    game.onFlop = vi.fn();
    game.onPlayerDeath = vi.fn();
    const p = Object.create(Player.prototype);
    Object.assign(p, {
      game,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      root: new THREE.Group(),
      model: {},
      wings: new THREE.Group(),
      halo: new THREE.Group(),
      stars: new THREE.Group(),
      deathCone: new THREE.Group(),
      _animate: noop,
      _updateShadow: noop
    });
    p.body = { pos: p.pos, vel: p.vel, h: 1.3, hw: 0.3, hd: 0.3, onLand: (...args) => p._onLand(...args) };
    game.player = p;
    let tick = 0;
    vi.spyOn(input, 'pressed').mockImplementation(
      (k) => (k === 'jump' && tick === 0) || (k === 'slide' && tick === 56)
    );
    vi.spyOn(input, 'held').mockImplementation((k) => k === 'jump');
    input.state.x = 0;
    input.state.y = -1;
    const basis = { right: { x: 1, z: 0 }, forward: { x: 0, z: 1 } };
    for (const phase of [1, 2, 3]) {
      boss.resetToPhase(phase);
      boss.pos.set(0, 0, 0);
      boss.updateBox();
      boss.stun();
      p.spawnAt(new THREE.Vector3(0, 0, 3.8));
      p.vel.z = -8;
      p.body.grounded = true;
      p.body.ground = stage.world.all.find((s) => s.max.y === 0);
      const before = boss.hp;
      for (tick = 0; tick < 120 && boss.hp === before; tick++) {
        stage.world.beginFrame();
        boss.update(1 / 120);
        p.update(1 / 120, stage, basis);
      }
      expect(boss.hp, `phase${phase}`).toBe(before - 1);
      expect(p.vel.y).toBeGreaterThan(0);
    }
    input.state.y = 0;
  });
  it('warnsontheactualinitialcableposeandpreservesfulltellafterdrivingtosocket', () => {
    const { boss, game } = fixture();
    boss.beginAttack('cable');
    step(boss, 0.6);
    expect(game.session.projectiles.list).toHaveLength(0);
    while (boss.approaching) boss.update(1 / 120);
    step(boss, boss.tell - 0.02);
    expect(boss.lane.rotation.y).toBeCloseTo(-Math.PI / 3);
    expect(boss.lane.position.x).toBeCloseTo(-7 * Math.sin(Math.PI / 3));
    expect(game.session.projectiles.list).toHaveLength(0);
    step(boss, 0.03);
    const cable = game.session.projectiles.list.find((p) => p.kind === 'cable');
    expect(cable.a0).toBeCloseTo(-Math.PI / 3);
    expect(cable.pivot.z).toBe(-12);
  });
  it('retainsauthoredplansandboundedchains', () => {
    for (const phase of [1, 2, 3]) {
      expect(TITAN_PLANS[phase]).toContain('chain');
      for (const c of TITAN_CHAINS[phase]) expect(c.length).toBeLessThanOrEqual(phase === 3 ? 3 : 2);
    }
  });
});

function realPlayer(f) {
  const { game, stage } = f;
  game.stage = stage;
  stage.killYAt = () => -14;
  stage.world.addBox(0, -6, 0, 26, 6, 26);
  game.loadout = { effects: {}, cosmeticSlots: () => ({}) };
  game.onFlop = vi.fn();
  game.onPlayerDeath = vi.fn();
  const p = Object.create(Player.prototype);
  Object.assign(p, {
    game,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    root: new THREE.Group(),
    model: {},
    wings: new THREE.Group(),
    halo: new THREE.Group(),
    stars: new THREE.Group(),
    deathCone: new THREE.Group(),
    _animate: noop,
    _updateShadow: noop
  });
  p.body = { pos: p.pos, vel: p.vel, h: 1.3, hw: 0.3, hd: 0.3, onLand: (...args) => p._onLand(...args) };
  game.player = p;
  p.spawnAt(new THREE.Vector3());
  return p;
}
it('flings the real Player from an unstunned top at8m/s until clear despite opposing input, without invulnerability', () => {
  save.reset();
  save.data.godMode = false;
  const f = fixture(),
    p = realPlayer(f),
    { boss, stage } = f;
  boss.pos.set(0, 0, 0);
  boss.updateBox();
  boss.ai = noop;
  p.pos.set(0, 1.7, 0);
  p.facing = Math.PI;
  vi.spyOn(input, 'pressed').mockReturnValue(false);
  vi.spyOn(input, 'held').mockReturnValue(false);
  input.state.x = 0;
  input.state.y = -1;
  const hurt = vi.spyOn(p, 'hurt');
  boss.onTouch(p);
  expect(p.bossFling.source).toBe(boss);
  let escaped = false;
  for (let i = 0; i < 96; i++) {
    stage.world.beginFrame();
    boss.update(1 / 120);
    p.update(1 / 120, stage, { right: { x: 1, z: 0 }, forward: { x: 0, z: 1 } });
    expect(p.invulnT).toBe(0);
    if (Math.hypot(p.pos.x, p.pos.z) > boss.radius + 0.5) {
      escaped = true;
      break;
    }
    expect(p.vel.z).toBe(8);
  }
  expect(escaped).toBe(true);
  expect(hurt).not.toHaveBeenCalled();
  p.update(1 / 120, stage, { right: { x: 1, z: 0 }, forward: { x: 0, z: 1 } });
  expect(p.bossFling).toBeNull();
  input.state.y = 0;
});
it('keeps unrelated damage and reset active during a Titan outward fling', () => {
  save.reset();
  save.data.godMode = false;
  const f = fixture(),
    p = realPlayer(f),
    { boss, game } = f;
  boss.pos.set(0, 0, 0);
  p.pos.set(0, 1.7, 0);
  boss.onTouch(p);
  game.session.mask = 1;
  game.session.setMask = (n) => (game.session.mask = n);
  expect(p.invulnT).toBe(0);
  expect(p.hurt('flat', 9, 9)).toBe(true);
  expect(game.session.mask).toBe(0);
  expect(boss.tookHitThisFight).toBe(true);
  p.reset();
  expect(p.bossFling).toBeNull();
});
it('routes actual Player Mega Bark into Titan suction and preserves paid Spell Bark exclusion', () => {
  save.reset();
  const f = fixture(),
    p = realPlayer(f),
    { boss, game } = f;
  boss.phase = 2;
  boss.pos.set(0, 0, 0);
  p.pos.set(0, 0, 3.5);
  p.facing = Math.PI;
  boss.beginAttack('suction');
  boss.stateT = boss.tell + 0.01;
  p._bark();
  expect(boss.state).toBe('stunned');
  expect(boss.stunFor).toBe(0.8);
  boss.beginAttack('suction');
  boss.stateT = boss.tell + 0.01;
  game.loadout.effects.spell_bark = {
    range_m: 9,
    cone_dot: 0.4,
    cooldown_s: 0.7,
    y_tol_m: 2.5,
    rings: 4,
    ring_step_m: 2.2,
    color: 0xa66bff,
    skip_bosses: true
  };
  p._bark();
  expect(boss.state).toBe('suction');
});
it('finishes the promised two-second intro and defeat cosmetics never create entities or ticket sources', async () => {
  const { boss, stage } = fixture();
  boss.active = false;
  const intro = boss.intro();
  boss.update(1);
  expect(boss.pos.z).toBe(-11);
  boss.update(1);
  await intro;
  expect(boss.pos.z).toBe(-6);
  expect(boss.scan.visible).toBe(false);
  const count = stage.entities.length;
  boss.defeated = true;
  boss.update(0.1);
  expect(boss.defeatProps).toHaveLength(10);
  expect(stage.entities.length).toBe(count);
  expect(boss.ledRing.visible).toBe(false);
  boss.update(2);
  expect(boss.defeatLEDs.every((l) => l.material.opacity === 0)).toBe(true);
  expect(boss.defeatProps.every((p) => p.mesh.position.y >= 0.2)).toBe(true);
});

it('actual Session retry never resurrects historical swarms and clears old leg collisions before reset placement', () => {
  save.reset();
  save.data.godMode = false;
  const f = fixture(),
    p = realPlayer(f),
    { boss, stage, game, titanArena: a } = f;
  const s = (game.session = new Session(game, 3));
  s.stage = stage;
  s.boss = boss;
  s.phase = 'boss';
  s.bossPhaseCp = 3;
  s.projectiles = new Projectiles(game, stage);
  s.tickets = { restoreAfter: vi.fn(), clearFlying: vi.fn() };
  s._pushHud = vi.fn();
  s._undoLifeLinesAbove = vi.fn();
  game.mask = { snapTo: vi.fn(), setLevel: vi.fn() };
  game.ui.setHud = vi.fn();
  game.camera.snap = vi.fn();
  s.cp = {
    pos: new THREE.Vector3(0, 0, 9),
    facing: Math.PI,
    seq: 0,
    tickets: 0,
    levelTickets: 0,
    lifeLine: 0,
    freedIds: new Set()
  };
  boss.phase = 3;
  a.setPhase(3);
  boss.spawnSwarm();
  const retired = boss.minions.slice();
  boss.killMinions();
  boss.spawnSwarm();
  const current = boss.minions.slice();
  const leg = a.addLeg(0, 9);
  p.pos.set(0, 0, 9);
  a.reset();
  expect(p.pos.toArray()).toEqual([0, 0, 9]);
  expect(leg.solid.enabled).toBe(false);
  s.respawn();
  expect(p.pos.toArray()).toEqual([0, 0, 9]);
  expect([...retired, ...current].every((m) => m.dead && !m.obj.visible)).toBe(true);
  expect(boss.minions).toHaveLength(0);
  expect(boss.hp).toBe(3);
  expect(a.wallR).toBe(13);
  expect(a.stocked).toBe(true);
  expect(a.lumi.visible).toBe(false);
  boss.spawnSwarm();
  expect(boss.minions).toHaveLength(3);
  expect(stage.entities.filter((e) => e instanceof retired[0].constructor && !e.dead)).toHaveLength(3);
});

it('keeps every Titan phase harder than the corresponding Cone phase through the live difficulty getters', () => {
  const { boss } = fixture();
  for (const phase of [1, 2, 3]) {
    boss.phase = phase;
    expect(boss.sp).toBeGreaterThan(BOSS.cone.speed[phase - 1]);
    expect(boss.W).toBeLessThan(BOSS.cone.window[phase - 1]);
    expect(boss.tele(1)).toBeLessThanOrEqual(BOSS.cone.tele[phase - 1]);
    expect(boss.chainLen).toBeGreaterThanOrEqual(BOSS.cone.chain[phase - 1]);
  }
  expect(boss.maxHp).toBeGreaterThanOrEqual(BOSS.cone.hp);
});
