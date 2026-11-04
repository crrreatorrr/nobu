import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
vi.mock('../src/art/assets.js', () => ({ Assets: { model: () => null, tex: () => new THREE.Texture(), tiled: () => new THREE.Texture(), aspect: () => 1, has: () => false } }));
vi.mock('../src/core/util.js', async (original) => ({ ...(await original()), canvasTex: () => new THREE.Texture() }));
vi.mock('../src/audio/audio.js', () => ({ audio: { play: vi.fn() } }));
vi.mock('../src/story/script.js', () => ({ MYSTERY_SURPRISE: { title: 'SURPRISE!', sub: 'RUN!' } }));
import { World, moveBody } from '../src/world/physics.js';
import { ConedDog } from '../src/entities/dogs.js';
import { DustWall, MoonLedge, SmogVent, ZoomieGate, PitySnacks } from '../src/entities/gatedObjects.js';
import { MysteryBackpack } from '../src/entities/mysteryBackpack.js';
import { gatedCountables, moonLedgeViolations, gateReachable } from '../src/game/gateRules.js';
import { rollMystery } from '../src/game/rng.js';
import { addGatedHelpers, sectionTuples } from '../src/levels/gatedKit.js';
import { Track, turtle } from '../src/world/track.js';
import { Stage } from '../src/world/stage.js';
import { buildGatedTestStrip } from '../src/levels/gatedTestStrip.js';

function fixture(abilities = {}) {
  const player = { pos: new THREE.Vector3(0, 1, 0), vel: new THREE.Vector3(), body: { s: 0, u: 0, grounded: true }, abilities, dead: false, hurt: vi.fn() };
  const session = { level: 1, runSeed: 123, nextSeq: vi.fn(() => 1), onBreak: vi.fn(), checkpoint: vi.fn(), addLife: vi.fn() };
  const game = { player, session, maskPickup: vi.fn(), fx: { burst: vi.fn(), puff: vi.fn(), dust: vi.fn(), sparkle: vi.fn(), explosion: vi.fn(), ring: vi.fn() }, camera: { shake: vi.fn() }, ui: { tutorial: vi.fn(), banner: vi.fn() }, tickets: { spawnFlying: vi.fn() } };
  const stage = { game, world: new World(), entities: [], theme: { platform: 'test' }, add(e) { this.entities.push(e); return e; } };
  const track = new Track(turtle([0, 0, 0], [[60, 90, 0]]));
  const k = addGatedHelpers({ track, W: (x, y, d) => track.toWorld(d, x, y), yawAt: (d) => track.yaw(d) }, game, stage);
  return { player, session, game, stage, k, track };
}

describe('move-gated geometry and bookkeeping', () => {
  it('builds the actual dev strip with all gates, reachable side shelf, and no gated Golden rewards', () => {
    const { game } = fixture(); const stage = new Stage(game, 1);
    const tickets = { add: vi.fn() };
    const info = buildGatedTestStrip(game, stage, tickets);
    expect(info.spawn.z).toBeCloseTo(-1); expect(stage.sections).toHaveLength(4);
    expect(stage.entities.filter((e) => e.kind === 'mystery')).toHaveLength(3);
    expect(gatedCountables(stage.entities)).toEqual([]);
    const moon = stage.entities.find((e) => e.kind === 'moonledge');
    const floor = { min: { x: -4.3, z: -180 }, max: { x: 4.3, y: 0, z: 0 } };
    expect(moonLedgeViolations(moon.pos, [floor, ...stage.world.all.filter((s) => s !== moon.solid)])).toEqual([]);
    const vent = stage.entities.find((e) => e.kind === 'smogvent');
    const shelf = stage.world.all.find((s) => s.max.y === 6);
    expect(shelf.min.x).toBeGreaterThan(vent.pos.x + 0.36);
    expect(stage.pityTestSpot.armed).toBe(false);
    stage.update(0, game.player);
    expect(stage.pityTestSpot.obj.visible).toBe(false);
    const wall = stage.entities.find((e) => e.kind === 'dustwall');
    game.player.dustDashing = true; game.player.abilities.dust = true; wall.onTouch(game.player);
    stage.update(0, game.player); expect(wall.obj.visible).toBe(false);
  });
  it('Dust Wall resists other attacks and unowned state, then breaks permanently with owned Dust Dash', () => {
    const { stage, player, game } = fixture();
    const wall = new DustWall(stage, 0, 0, 0, { yaw: Math.PI / 2 });
    expect(wall.solid.max.x - wall.solid.min.x).toBeCloseTo(0.9);
    expect(wall.solid.max.z - wall.solid.min.z).toBeCloseTo(3);
    for (const hit of ['onBite', 'onStomp', 'onSlide', 'onFlop', 'onBark']) wall[hit](player);
    player.dustDashing = true; wall.onTouch(player); expect(wall.solid.enabled).toBe(true);
    player.abilities.dust = true; wall.onBark(); expect(wall.solid.enabled).toBe(true);
    wall.onTouch(player); expect(wall.solid.enabled).toBe(false);
    wall.onRespawn(); expect(wall.broken).toBe(true); expect(wall.countable).toBe(false);
    expect(game.fx.burst).toHaveBeenCalledWith(0, 1.3, 0, expect.objectContaining({ count: 24 }));
  });
  it('Smog has no solid or lift until an owned bark in range finishes clearing', () => {
    const { stage, player } = fixture(); const vent = new SmogVent(stage, 0, 0, 0);
    expect(stage.world.all).toHaveLength(0); vent.update(1); expect(player.vel.y).toBe(0);
    vent.onBark(); expect(vent.cleared).toBe(false);
    player.abilities.bark = true; player.pos.x = 7; vent.onBark(); expect(vent.cleared).toBe(false);
    player.pos.x = 0; vent.onBark(); vent.update(0.6); vent.update(0.1);
    expect(player.vel.y).toBeCloseTo(6); expect(player.canDouble).toBe(true);
    vent.onRespawn(); expect(vent.cleared).toBe(true);
  });
  it('Moon Ledge is always solid and rejects nearby stepping stones that bypass the move', () => {
    const { stage } = fixture(); const ledge = new MoonLedge(stage, 0, 6.2, 0);
    expect(ledge.solid.enabled).toBe(true); expect(ledge.dots.children).toHaveLength(6);
    const floor = { min: { x: -3, z: -3 }, max: { x: 3, y: 0, z: 3 } };
    const stone = { min: { x: 2, z: 0 }, max: { x: 3, y: 0.6, z: 1 } };
    expect(moonLedgeViolations(ledge.pos, [floor])).toEqual([]);
    expect(moonLedgeViolations(ledge.pos, [floor, stone])).toEqual([stone]);
    expect(moonLedgeViolations({ x: 0, y: 5.7, z: 0 }, [floor])).toEqual([floor]);
  });
  it('Zoomie Gate opens by actual plate crossing, with shorter locked time and respawn rollback', () => {
    const { stage, player, k } = fixture(); const gate = k.zoomieGate(0, 0, 30);
    expect(gate.plateD).toBe(8); player.body.s = 9; gate.update(0.15);
    expect(gate.raise).toBeCloseTo(2.6); expect(gate.timer).toBeCloseTo(0.25);
    expect(stage.world.moving).toContain(gate.solid);
    gate.onRespawn(); expect(gate.raise).toBe(0); expect(gate.timer).toBe(0);
    player.abilities.zoom = true; player.body.s = 7; gate.update(0.01); player.body.s = 9; gate.update(0.15);
    expect(gate.timer).toBeCloseTo(2.35);
    expect(gateReachable(22, 2.5, 8)).toBe(false); expect(gateReachable(22, 2.5, 12.4 * 0.9)).toBe(true);
  });
  it.each([[0, 'z'], [Math.PI / 2, 'x'], [Math.PI / 4, 'z']])('keeps yaw %s shutter bounds finite and physically blocks only while down', (yaw, axis) => {
    const { stage, player } = fixture({ zoom: true });
    player.pos.set(5, 0, 5);
    const gate = new ZoomieGate(stage, 0, 0, 0, { yaw, plateD: 10, platePos: new THREE.Vector3(0, 0, 10) });
    const cross = () => {
      const body = { pos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0 }, hw: 0.36, hd: 0.36, h: 1.5, grounded: false };
      body.pos[axis] = 2; body.vel[axis] = -8;
      for (let i = 0; i < 12; i++) moveBody(stage.world, body, 0.05);
      return body;
    };
    const finite = () => expect([...Object.values(gate.solid.min), ...Object.values(gate.solid.max), ...Object.values(gate.solid.delta)].every(Number.isFinite)).toBe(true);
    gate.update(0.01); finite();
    expect(gate.solid.max.x - gate.solid.min.x).toBeCloseTo(Math.abs(Math.cos(yaw)) * 2.2 + Math.abs(Math.sin(yaw)) * 0.3);
    expect(cross().pos[axis]).toBeGreaterThan(0);
    player.body.s = 11; gate.update(0.15); finite();
    expect(gate.solid.min.y).toBeCloseTo(2.6); expect(gate.solid.max.y).toBeCloseTo(5.2);
    expect(cross().pos[axis]).toBeLessThan(-2);
    player.pos.set(0, 0, 0); gate.update(3); finite();
    expect(gate.timer).toBe(0); expect(gate.raise).toBeCloseTo(2.6); // Occupied closing volume waits.
    player.pos.set(5, 0, 5); gate.update(0.12); finite();
    expect(gate.solid.min.y).toBe(0); expect(cross().pos[axis]).toBeGreaterThan(0);
    gate.onRespawn(); finite(); expect(gate.solid.min.y).toBe(0); expect(gate.solid.max.y).toBe(2.6);
    expect(cross().pos[axis]).toBeGreaterThan(0);
  });
  it('finds countable rewards inside actual declared transformed gate regions, allowing optional rewards', () => {
    const { k, stage } = fixture(); const box = k.gatedArea(-1, 1, -1, 3, 22, 26);
    const gate = k.dustWall(0, 0, 20, { gatedBox: box }); const p = k.W(0, 0, 24);
    const pack = { countable: true, pos: p }, dog = Object.assign(Object.create(ConedDog.prototype), { pos: p }), optional = { countable: false, pos: p };
    expect(gatedCountables([...stage.entities, pack, dog, optional])).toEqual([{ entity: pack, gate }, { entity: dog, gate }]);
  });
});

describe('pity and Mystery pickups', () => {
  it('pity stays dormant and uncountable until armed, and ignores competitive contexts', () => {
    const { stage, session } = fixture(); const pity = new PitySnacks(stage, 0, 0, 0);
    pity.onTouch(); expect(session.checkpoint).not.toHaveBeenCalled(); expect(pity.obj.visible).toBe(false);
    for (const flag of ['trial', 'remix', 'medal', 'rush']) { session[flag] = true; expect(pity.arm()).toBe(false); session[flag] = false; }
    expect(pity.arm()).toBe(true); expect(pity.countable).toBe(false); pity.update(0.5); expect(pity.obj.position.y).toBe(0);
    pity.onRespawn(); expect(pity.armed).toBe(true); pity.onTouch(); expect(session.checkpoint).toHaveBeenCalledOnce(); expect(session.onBreak).not.toHaveBeenCalled();
  });
  it('slots are shared across kits/detours, unique, capped at three, and trials get ordinary backpacks', () => {
    const { k, stage, game, track, session } = fixture(); const k2 = addGatedHelpers({ W: k.W, yawAt: k.yawAt }, game, stage, track);
    expect(k.mystery(0, 0, 1).slot).toBe(0); expect(k2.mystery(0, 0, 2).slot).toBe(1);
    expect(() => k.mystery(0, 0, 3, { slot: 1 })).toThrow(); session.trial = true;
    expect(k.mystery(0, 0, 4).kind).toBe('backpack'); expect(() => k2.mystery(0, 0, 5)).toThrow();
  });
  it.each(['tickets', 'sphere', 'cat', 'tramp', 'oneUp'])('Mystery %s follows deterministic reward and rollback rules', (result) => {
    const { stage, session, game } = fixture();
    let seed = 0; while (rollMystery(seed, 1, 0) !== result) seed++;
    session.runSeed = seed; const m = new MysteryBackpack(stage, 0, 0, 0, { slot: 0, tramp: true });
    m.onBite(); expect(session.onBreak).toHaveBeenCalledWith(m); expect(m.result).toBe(result);
    if (result === 'tickets') expect(game.tickets.spawnFlying).toHaveBeenCalledWith(0, 1, 0, 9, 'mystery');
    else if (result === 'oneUp') expect(session.addLife).toHaveBeenCalledWith(1);
    else { expect(m.spawned[0].countable).toBe(false); if (result === 'cat') expect(m.spawned[0].timer).toBe(0); }
    const spawned = [...m.spawned]; m.restore(); expect(spawned.every((e) => e.dead)).toBe(true); m.onExplosion(); expect(m.result).toBe(result);
  });
  it('trampoline rolls require an authored ledge and otherwise become spheres', () => {
    const { stage, session } = fixture(); let seed = 0; while (rollMystery(seed, 1, 0) !== 'tramp') seed++;
    session.runSeed = seed; const m = new MysteryBackpack(stage, 0, 0, 0, { slot: 0 }); m.onSlide(); expect(m.result).toBe('sphere');
  });
  it.each(['tickets', 'sphere', 'cat', 'tramp', 'oneUp'])('keeps the complete %s outcome within 9 raw Tickets without Snack-eligible trampoline payouts', (result) => {
    const { stage, session, player, game } = fixture();
    let seed = 0; while (rollMystery(seed, 1, 0) !== result) seed++;
    session.runSeed = seed;
    const m = new MysteryBackpack(stage, 0, 0, 0, { slot: 0, tramp: true }); m.onBite();
    if (result === 'tramp') {
      const trampoline = m.spawned[0]; player.bounce = vi.fn();
      for (let i = 0; i < 20; i++) trampoline.onLand(player);
      expect(player.bounce).toHaveBeenCalledTimes(20); // It remains a usable trampoline.
      trampoline.onBite(); trampoline.restore(); trampoline.onLand(player); trampoline.onExplosion();
      expect(game.tickets.spawnFlying).not.toHaveBeenCalled();
    } else if (result === 'sphere') m.spawned[0].onExplosion();
    else if (result === 'cat') { m.spawned[0].onSlide(); m.spawned[0].onExplosion(); }
    const payouts = game.tickets.spawnFlying.mock.calls;
    expect(payouts.reduce((sum, args) => sum + args[3], 0)).toBeLessThanOrEqual(9);
    expect(payouts.every((args) => args[4] === 'mystery')).toBe(true);
  });
  it('records sorted canonical sections with explicit tuple adapter', () => {
    const { k, track, stage } = fixture(); k.section(20, 40, 'Lily Pond'); k.section(0, 20, 'Opening');
    expect(stage.sections).toBe(track.sections);
    expect(track.sections.map((s) => s.name)).toEqual(['Opening', 'Lily Pond']);
    expect(sectionTuples(track.sections)).toEqual([[0, 20, 'Opening'], [20, 40, 'Lily Pond']]);
    expect(() => k.section(1, 1, 'Bad')).toThrow();
  });
});
