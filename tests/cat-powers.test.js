import * as THREE from 'three';
import { test, expect, vi } from 'vitest';
vi.mock('../src/art/assets.js', () => ({ Assets: { model: () => null, has: () => false, tex: () => new THREE.Texture(), tiled: () => new THREE.Texture(), aspect: () => 1 } }));
vi.mock('../src/core/util.js', async (original) => ({ ...(await original()), canvasTex: () => new THREE.Texture() }));
vi.mock('../src/entities/fx.js', async (original) => ({ ...(await original()), textTexture: () => new THREE.Texture(), makeShadow: () => new THREE.Group() }));
vi.mock('../src/audio/audio.js', () => ({ audio: { play: vi.fn(), setRate: vi.fn() } }));
import { BigCatBoss } from '../src/bosses/bigCat.js';
import { Projectiles } from '../src/bosses/common.js';
import { CatArena, catRingRects } from '../src/bosses/catArena.js';
import { ghostConflicts } from '../src/bosses/catPowers.js';
import { Stage } from '../src/world/stage.js';
import { World } from '../src/world/physics.js';
import { CAT_STAGE_POWERS } from '../src/story/script.js';

function fixture(phase = 1) {
  let seq = 0;
  const player = { pos: new THREE.Vector3(0, 0, 8), vel: new THREE.Vector3(), forward: new THREE.Vector3(0, 0, -1), body: { grounded: true, ground: null }, bitten: new Set(), hurt: vi.fn(() => false), bounce: vi.fn() };
  const game = { player, ui: { banner: vi.fn(), tutorial: vi.fn(), bossHp: vi.fn() }, camera: { shake: vi.fn() },
    fx: new Proxy({ sparks: { spawn() {} } }, { get: (target, key) => target[key] ?? (() => {}) }), tickets: { spawnFlying: vi.fn() }, session: { phase: 'boss', nextSeq: () => ++seq, onBreak: vi.fn(), onBossPhase: vi.fn(), onBossDefeated: vi.fn() } };
  const stage = { game, scene: new THREE.Scene(), world: new World(), entities: [], add(e) { this.entities.push(e); this.scene.add(e.obj); return e; } };
  stage.catArena = stage.add(new CatArena(stage));
  const projectiles = new Projectiles(game, stage); game.session.projectiles = projectiles;
  const boss = new BigCatBoss(stage, 0, 0, -6); boss.phase = phase; boss.active = true; boss.beginPhase();
  return { player, game, stage, boss, projectiles };
}
function step(boss, seconds, dt = 1 / 120) { for (let i = 0; i < seconds / dt; i++) boss.update(dt); }

test('Cat arena has exact solid ring coverage without overlap and preserves permanent safe floor for every edge tailspin', () => {
  const rects = catRingRects();
  expect(rects.reduce((sum, r) => sum + r.w * r.d, 0)).toBe(25 * 25 - 21 * 21);
  for (let x = -12.4; x < 12.5; x += .2) for (let z = -12.4; z < 12.5; z += .2) {
    const count = rects.filter(r => Math.abs(x - r.x) < r.w / 2 && Math.abs(z - r.z) < r.d / 2).length;
    expect(count + (Math.abs(x) < 10.5 && Math.abs(z) < 10.5 ? 1 : 0)).toBe(1);
  }
  for (let x = -9.5; x <= 9.5; x += 1.9) for (let z = -9.5; z <= 9.5; z += 1.9) {
    // Opposite permanent inner corner is always outside tail radius, even when
    // every edge tile is absent. At least an entire1m square remains safe.
    const sx = x >= 0 ? -8 : 8, sz = z >= 0 ? -8 : 8;
    expect(Math.hypot(sx - x, sz - z)).toBeGreaterThan(4.9 + Math.SQRT2);
  }
});

test('ledges rise to2.4 in one second; stage3 retains them and tells before ring crumble; retries restore floor', () => {
  const { stage, player } = fixture(), arena = stage.catArena, tile = arena.tiles[0];
  expect(arena.ledges.every(l => !l.solid.enabled)).toBe(true);
  arena.setPhase(2); arena.update(.5); expect(arena.ledges[0].solid.max.y).toBeCloseTo(.95);
  arena.update(.5); expect(arena.ledges[0].solid.max.y).toBeCloseTo(2.4);
  arena.setPhase(3); expect(arena.ledges[0].solid.max.y).toBeCloseTo(2.4);
  player.body.ground = tile.solid; arena.update(.99); expect(tile.timer).toBeNull();
  arena.update(.02); arena.update(.57); expect(tile.solid.enabled).toBe(true);
  arena.update(.03); expect(tile.solid.enabled).toBe(false);
  arena.update(4); expect(tile.solid.enabled).toBe(true);
  arena.onRespawn(); expect(arena.phase).toBe(1); expect(arena.tiles.every(t => t.solid.enabled)).toBe(true);
});

test('laser dot visits four waypoints, locks exact player target, pounces twice and rewards a wall miss', () => {
  const { boss, player } = fixture(); player.pos.set(12.05, 0, 0); boss.beginAttack('dot');
  let leaps = 0, last = null, finalLock;
  for (let i = 0; i < 1600 && boss.state !== 'dizzy'; i++) {
    if (boss.powers.step === 'leap' && last !== 'leap') { leaps++; if (leaps === 2) { finalLock = boss.powers.target.clone(); player.pos.set(0, 0, 8); } }
    last = boss.powers.step; boss.update(1 / 120);
  }
  expect(leaps).toBe(2); expect(finalLock.x).toBeCloseTo(12.05); expect(finalLock.z).toBe(0);
  expect(boss.state).toBe('dizzy'); expect(boss.wallBonus).toBe(true); expect(boss.powers.dot.visible).toBe(false);
  expect(boss.powers.lastLeap.target.x).toBeCloseTo(12.05);
});

test('all actual Cat attack tells consume stage tele and DDA and never fall below.4s', () => {
  for (const phase of [1, 2, 3]) {
    const { boss, projectiles } = fixture(phase); const spy = vi.spyOn(boss, 'tele');
    boss.dda.tele = 1.15;
    for (const state of ['swipeUp', 'cough', 'yarn', 'claws', 'tailspin', 'countdown', 'zoomies', 'frenzy', 'dot', 'table']) {
      projectiles.clear(); boss.clearChain(); boss.beginAttack(state === 'countdown' ? 'pounce' : state);
      if (state === 'frenzy') { boss.fz = 'charge'; boss.did = false; }
      if (state === 'zoomies') boss.dashesLeft = 1;
      spy.mockClear(); step(boss, state === 'dot' ? 1.9 : state === 'table' ? 1.2 : .02);
      expect(spy, state).toHaveBeenCalled();
      for (const result of spy.mock.results) expect(result.value).toBeGreaterThanOrEqual(.4);
    }
    expect(boss.tele(1)).toBeCloseTo(boss.D.tele[phase - 1] * 1.15);
  }
});

test('table volley has exactly one lit TNT, zero-Ticket non-countable backpacks, spacing and no punish', () => {
  for (const phase of [2, 3]) {
    const { boss, projectiles, stage, game } = fixture(phase);
    const falls = []; vi.spyOn(projectiles, 'falling').mockImplementation((x, z, o) => { falls.push({ x, z, ...o }); return {}; });
    boss.beginAttack('table');
    for (let i = 0; i < 1600 && boss.state === 'table'; i++) boss.update(1 / 120);
    expect(falls).toHaveLength(phase === 2 ? 3 : 4); expect(falls.filter(f => f.kind === 'cat')).toHaveLength(1);
    falls.forEach(f => f.onLand());
    const cats = boss.powers.spawned.filter(e => e.kind === 'cat'), packs = boss.powers.spawned.filter(e => e.kind === 'backpack');
    expect(cats[0].timer).toBe(0); expect(packs.every(e => !e.countable && e.tickets === 0)).toBe(true);
    packs.forEach(e => e.onBite()); expect(game.tickets.spawnFlying.mock.calls.every(c => c[3] === 0)).toBe(true);
    expect(boss.vulnerable).toBe(false); expect(boss.state).toBe('stalk');
    // Force another volley target onto active TNT: the authored placement finder moves it.
    boss.powers.dropCount = 1; boss.player.pos.copy(cats[0].pos); boss.powers.dropObject();
    const next = falls.at(-1); expect(Math.hypot(next.x - cats[0].pos.x, next.z - cats[0].pos.z)).toBeGreaterThanOrEqual(4.6);
    expect(stage.entities.filter(e => e.countable).length).toBe(0);
  }
});

test('ghosts snapshot the last leap, cap at two, delay conflicts by.5, and disappear after replay', () => {
  const { boss, player } = fixture(3), powers = boss.powers;
  const from = new THREE.Vector3(-6, 0, -6), target = new THREE.Vector3(6, 0, 0);
  powers.recordLeap(from, target, .75); from.set(99, 99, 99); target.set(99, 99, 99);
  expect(powers.ghost()).toBe(true); expect(powers.ghost()).toBe(true); expect(powers.ghost()).toBe(false);
  expect(powers.ghosts[0].from.x).toBe(-6);
  boss.marker.visible = true; boss.marker.position.set(6, 0, 0); expect(ghostConflicts(powers.ghosts[0].target, boss)).toBe(true);
  powers.update(1.5); expect(powers.ghosts[0].wait).toBe(.5); expect(powers.ghosts[0].t).toBe(0);
  boss.marker.visible = false; player.pos.set(0, 0, 8); powers.update(.5); powers.update(.76);
  expect(powers.ghosts).toHaveLength(0); expect(player.hurt).not.toHaveBeenCalled();
});

test('stage3 catnip is6–9m away on permanent floor, optional eight-second speed/window reward and20-second reuse', () => {
  const { boss } = fixture(3), powers = boss.powers, nip = powers.catnip;
  expect(nip.pos.distanceTo(boss.pos)).toBeGreaterThanOrEqual(6); expect(nip.pos.distanceTo(boss.pos)).toBeLessThanOrEqual(9);
  expect(Math.abs(nip.pos.x)).toBeLessThanOrEqual(9.5); expect(Math.abs(nip.pos.z)).toBeLessThanOrEqual(9.5);
  expect(nip.countable).toBeUndefined(); const normal = boss.sp; nip.onBite(); nip.onBite();
  expect(powers.catnipT).toBe(8); expect(boss.sp).toBeCloseTo(normal * 1.25);
  boss.setState('dizzy'); boss.landT = 0; boss.stateT = boss.W + .1; boss.ai(0); expect(boss.state).toBe('dizzy');
  powers.update(8); expect(boss.sp).toBe(normal); powers.update(11.9); expect(powers.catnip).toBeNull(); powers.update(.2); expect(powers.catnip).not.toBeNull();
});

test('punish guarantee, table cooldown, chain tells, phase reset and copy stay coherent', () => {
  const { boss } = fixture(3); expect(boss.stagePowers).toEqual(CAT_STAGE_POWERS);
  for (let i = 0; i < 200; i++) { boss.sinceVuln = 2; boss.chooseAttack(8); expect(['countdown', 'zoomies']).toContain(boss.state); }
  boss.beginAttack('table'); boss.beginAttack('cough'); expect(boss.attackHistory.slice(-2)).toContain('table');
  boss.clearChain(); boss.vulnerable = false; boss.setState('stalk'); boss.sinceHurt = 9;
  // Intermediate M0 has chainLen1; explicit instance override tests actual H20 policy
  // until the root's serial cat-only M2 configuration lands.
  Object.defineProperty(boss, 'chainLen', { value: 2 });
  expect(boss.startChain(['claws', 'pounce'])).toBe(true); expect(boss.state).toBe('claws');
  boss.endAttack(); expect(boss.state).toBe('countdown'); expect(boss.stateT).toBe(0);
  boss.resetToPhase(1); expect(boss.powers.ghosts).toHaveLength(0); expect(boss.powers.catnip).toBeNull(); expect(boss.powers.dot.visible).toBe(false); expect(boss.stage.catArena.phase).toBe(1);
});

test('literal stage2 pool and proposed chain-enabled option are separately testable', () => {
  const { boss } = fixture(2); Object.defineProperty(boss, 'chainLen', { value: 2 });
  const rng = vi.spyOn(Math, 'random').mockReturnValue(.9999);
  try {
    boss.sinceVuln = 0; boss.chooseAttack(8); expect(boss.state).toBe('table'); expect(boss.chained).toBe(false);
    boss.stage2Chains = true; boss.attackHistory = []; boss.lastAttack = ''; boss.sinceVuln = 0; boss.setState('stalk'); boss.chooseAttack(8);
    expect(boss.chained).toBe(true); expect(['claws', 'tailspin']).toContain(boss.state);
    const next = boss.chainQ[0]; boss.endAttack(); expect(boss.state).toBe(next === 'pounce' ? 'countdown' : 'cough');
  } finally { rng.mockRestore(); }
});

test('scratch trails follow actual waves and frenzy stars contain four2.5m segments', () => {
  const { boss, projectiles } = fixture(2); const scratch = vi.spyOn(projectiles, 'scratch');
  const pr = projectiles.clawWave(new THREE.Vector3(), new THREE.Vector3(1, 0, 0));
  boss.powers.trail(pr); pr.mesh.position.x = 1; boss.powers.update(.1);
  expect(scratch).toHaveBeenCalledWith(expect.objectContaining({ x: 0 }), expect.objectContaining({ x: 1 }), 3);
  scratch.mockClear(); boss.powers.scratchStar(); expect(scratch).toHaveBeenCalledTimes(4);
  for (const [a, b, life] of scratch.mock.calls) { expect(a.distanceTo(b)).toBeCloseTo(2.5); expect(life).toBe(3); }
  projectiles.clear(); boss.powers.update(.1); expect(boss.powers.trails).toHaveLength(0);
});

test('wall, ultimate and optional catnip punish bonuses are exact and consumed on a hit', () => {
  const { boss } = fixture(3); boss.wallBonus = true; boss.longDizzy = true; boss.powers.catnipT = 8;
  boss.setState('dizzy'); boss.landT = 0; boss.stateT = boss.W * 2 + 1.2 + .6 - .01; boss.ai(0);
  expect(boss.state).toBe('dizzy'); boss.stateT += .02; boss.ai(0); expect(boss.state).toBe('stalk');
  boss.wallBonus = true; boss.longDizzy = true; boss.onHit(); expect(boss.wallBonus).toBe(false); expect(boss.longDizzy).toBe(false);
});

test('actual Cat arena builder exposes three sphere stages, no hidden outer slab and unchanged seven raw pickups', async () => {
  const { buildBoss2Arena } = await import('../src/levels/level2.js');
  const { game } = fixture(); const stage = new Stage(game, 2), tickets = { add: vi.fn() };
  vi.spyOn(stage, 'decor').mockImplementation(() => {});
  const info = buildBoss2Arena(game, stage, tickets);
  expect(info.spheres.map(v => v.toArray())).toEqual([[9, 0, 9], [-9, 0, -9], [0, 0, 9]]);
  expect(info.ledges).toHaveLength(2); expect(stage.killY).toBe(-6);
  expect(tickets.add).toHaveBeenCalledTimes(7);
  expect(stage.world.groundBelow(11.2, 1, 0)).toBe(0);
  for (const tile of stage.catArena.tiles) tile.solid.enabled = false;
  expect(stage.world.groundBelow(11.2, 1, 0)).toBe(-Infinity);
  expect(stage.world.groundBelow(0, 1, 0)).toBe(0);
});

test('a real pounce marker appearing during ghost flight postpones that landing rather than overlapping it', () => {
  const { boss, player } = fixture(3), powers = boss.powers;
  powers.recordLeap(new THREE.Vector3(-6, 0, 0), new THREE.Vector3(6, 0, 0), .75);
  powers.ghost();
  powers.ghosts[0].wait = 0; powers.update(.2); const time = powers.ghosts[0].t;
  boss.marker.visible = true; boss.marker.position.set(6, 0, 0); player.pos.set(6, 0, 0);
  powers.update(.7); expect(powers.ghosts[0].wait).toBe(.5); expect(powers.ghosts[0].t).toBe(time); expect(player.hurt).not.toHaveBeenCalled();
});

test.each([1, 2, 3])('actual stage%s frenzy produces its pounce count, scratch upgrades and final ghost', (phase) => {
  const { boss } = fixture(phase);
  const stars = vi.spyOn(boss.powers, 'scratchStar'), ghost = vi.spyOn(boss.powers, 'ghost');
  const landings = vi.spyOn(boss.proj, 'shockwave');
  boss.setState('frenzy'); boss.did = false; boss.fz = 'charge';
  for (let i = 0; i < 2000 && boss.state !== 'dizzy'; i++) boss.update(1 / 120);
  const count = phase === 3 ? 5 : 4;
  expect(boss.state).toBe('dizzy'); expect(boss.longDizzy).toBe(true);
  expect(landings).toHaveBeenCalledTimes(count); expect(stars).toHaveBeenCalledTimes(phase >= 2 ? count : 0);
  expect(ghost).toHaveBeenCalledTimes(phase === 3 ? 1 : 0);
});

test('stage3 damage releases a saved-pounce ghost, and defeat removes every Cat power object', () => {
  const { boss, player, game } = fixture(3);
  boss.powers.recordLeap(new THREE.Vector3(-4, 0, 0), new THREE.Vector3(4, 0, 0), .5);
  boss.onHit(); expect(boss.powers.ghosts).toHaveLength(1);
  const model = boss.powers.ghosts[0].mesh, nip = boss.powers.catnip;
  boss.hp = 1; boss.hitCool = 0; boss.vulnerable = true; boss.damage(player);
  expect(game.session.onBossDefeated).toHaveBeenCalledWith(boss);
  expect(boss.powers.ghosts).toHaveLength(0); expect(model.parent).toBeNull(); expect(nip.dead).toBe(true);
});
