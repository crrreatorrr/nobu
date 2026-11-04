import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
import { PumpQueen, QUEEN_PLANS, QUEEN_CHAINS, fitQueenModel } from '../src/bosses/pumpQueen.js';
import { QueenArena, QUEEN_OUTER, QUEEN_INNER } from '../src/bosses/queenArena.js';
import { QueenPill, QueenAirdrop } from '../src/bosses/queenHelpers.js';
import { PumpPill } from '../src/entities/enemies.js';
import { Projectiles } from '../src/bosses/common.js';
import { World } from '../src/world/physics.js';
import { Player } from '../src/player/player.js';
import { BOSS } from '../src/config/difficulty.js';
import { input } from '../src/core/input.js';
import { save } from '../src/core/save.js';
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
    pos: new THREE.Vector3(0, 0, 11.7),
    vel: new THREE.Vector3(),
    body: { grounded: true, h: 1.3, hw: 0.3, hd: 0.3 },
    forward: new THREE.Vector3(0, 0, -1),
    dead: false,
    hurt: vi.fn(),
    die: vi.fn(),
    bounce: vi.fn()
  };
  const fx = new Proxy({ sparks: { spawn: vi.fn() } }, { get: (o, k) => o[k] ?? (o[k] = vi.fn()) });
  const game = {
    player,
    fx,
    maskPickup: vi.fn(),
    camera: { shake: vi.fn() },
    ui: { bossHp: vi.fn(), banner: vi.fn() },
    session: {
      nextSeq: () => 1,
      onBreak: vi.fn(),
      onEnemyDefeated: vi.fn(),
      onBossPhase: vi.fn(),
      onBossDefeated: vi.fn()
    }
  };
  const stage = {
    game,
    world: new World(),
    scene: new THREE.Scene(),
    entities: [],
    add(e) {
      this.entities.push(e);
      this.scene.add(e.obj);
      return e;
    },
    killYAt: () => -20
  };
  game.stage = stage;
  game.session.stage = stage;
  game.session.projectiles = new Projectiles(game, stage);
  const arena = stage.add(new QueenArena(stage));
  stage.queenArena = arena;
  const boss = stage.add(new PumpQueen(stage));
  boss.active = true;
  game.session.boss = boss;
  return { game, stage, player, arena, boss };
}
function step(b, seconds) {
  for (let t = 0; t < seconds - 1e-7; t += 1 / 120) b.update(Math.min(1 / 120, seconds - t));
}
it('keeps live ladders on distinct candles through repeated mint and Ultimate, then returns hover to centre', () => {
  const { boss, arena, stage } = fixture();
  boss.endAttack = vi.fn();
  const candle = arena.pillars[12];
  boss.minions.push(stage.add(new QueenPill(stage, candle, boss, { pump: 3 })));
  for (let i = 0; i < 3; i++) {
    boss.beginAttack('mint');
    step(boss, boss.tell + .02);
    expect(new Set(boss.minions.map(m => m.candle)).size).toBe(boss.minions.length);
    expect(boss.minions.length).toBeLessThanOrEqual(4);
  }
  boss.beginAttack('ultimate');
  const green = boss.trueGreen;
  for (const m of boss.minions) m.reset();
  boss.minions = [stage.add(new QueenPill(stage, green, boss, { pump: 3 }))];
  step(boss, boss.tell + .02);
  expect(boss.minions.filter(m => m.candle === green)).toHaveLength(1);
  step(boss, 5.02);
  expect(boss.state).toBe('pumped');
  expect(Math.hypot(boss.pos.x,boss.pos.z)).toBeGreaterThan(0);
  boss.dump();
  step(boss, .82);
  expect(boss.state).toBe('returnCenter');
  const before = boss.pos.clone();
  step(boss, 1/120);
  expect(boss.pos.distanceTo(before)).toBeLessThanOrEqual(4*boss.sp/120+1e-8);
  step(boss, 3);
  expect(boss.pos.x).toBe(0);
  expect(boss.pos.z).toBe(0);
  expect(boss.pos.y).toBe(3);
});
it('runs the ordinary four-stage planners through their real summon and hazard lifecycles', () => {
  for(const phase of [1,2,3,4]){
    const {boss,arena,stage}=fixture();
    boss.resetToPhase(phase);
    const seen=new Set();
    for(let frame=0;frame<120*90;frame++){
      boss.charge=0;
      stage.world.beginFrame();
      arena.update(1/120);
      for(const entity of stage.entities.slice())if(entity!==arena&&entity!==boss&&!entity.dead)entity.update?.(1/120);
      boss.update(1/120);
      seen.add(boss.state);
    }
    for(const expected of QUEEN_PLANS[phase].filter(s=>s!=='chain'&&s!=='pump'))expect(seen.has(expected),`phase${phase} missing${expected}: ${[...seen]}`).toBe(true);
    expect(seen.has(phase===4?'wake':'pumped')).toBe(true);
    expect(boss.minions.length).toBeLessThanOrEqual(4);
    expect(new Set(boss.minions.map(m=>m.candle)).size).toBe(boss.minions.length);
  }
});
it('builds exact16 moving candles and36ring tiles with no centre floor', () => {
  const { arena: a, stage } = fixture();
  expect(a.pillars.map((p) => [p.pos.x, p.pos.z])).toEqual([...QUEEN_OUTER, ...QUEEN_INNER]);
  expect(a.ring.tiles).toHaveLength(36);
  expect(stage.world.groundBelow(0, 1, 0)).toBe(-Infinity);
  expect(stage.world.groundBelow(0, 1, 11.7)).toBe(0);
});
it('fits the composed Queen placeholder to5.5m and preserves crown-height interpretation', () => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(2, 4, 1),
    new THREE.MeshLambertMaterial({ color: 0xd23cff })
  );
  mesh.scale.setScalar(5);
  expect(fitQueenModel(mesh)).toBe(true);
  const b = new THREE.Box3().setFromObject(mesh);
  expect(b.max.y - b.min.y).toBeCloseTo(5.5);
  const { boss } = fixture();
  expect(boss.pos.y).toBe(3);
  expect(boss.crownPosition().y).toBeCloseTo(8.2);
  for (const phase of [1, 2, 3]) {
    boss.resetToPhase(phase);
    boss.setPump(1);
    boss.alignPumpedCrown();
    expect(boss.crownPosition().y).toBeCloseTo(9 + 5.2 * (boss.stageScale[phase] - 1));
  }
});
it('uses the four-stage ladder and all authored plans/chains', () => {
  const { boss } = fixture();
  expect(boss.hp).toBe(12);
  expect(boss.stages).toBe(4);
  for (const phase of [1, 2, 3, 4]) {
    boss.phase = phase;
    expect(boss.sp).toBeGreaterThanOrEqual(BOSS.titan.speed[Math.min(phase - 1, 2)]);
    expect(boss.W).toBeLessThanOrEqual(BOSS.titan.window[Math.min(phase - 1, 2)]);
    expect(QUEEN_PLANS[phase].filter((x) => x === 'pump' || x === 'wake').length).toBeGreaterThanOrEqual(2);
    expect(QUEEN_CHAINS[phase].every((c) => c.length <= boss.chainLen)).toBe(true);
  }
});
it('gives only the explicit PumpPill new11+2pump bounce while retaining normal squash/defeat behavior', () => {
  const { stage, player, game } = fixture();
  for (const n of [0, 1, 2, 3]) {
    const pill = new PumpPill(stage, 0, 0, 0);
    pill.pump = n;
    pill.onStomp(player);
    expect(player.bounce).toHaveBeenLastCalledWith(11 + 2 * n);
    expect(pill.alive).toBe(false);
  }
  expect(game.session.onEnemyDefeated).toHaveBeenCalledTimes(4);
});
it('keeps a Queen ladder on its moving candle, primed at3, and never resurrects historical summons', () => {
  const { stage, arena, boss } = fixture(),
    c = arena.pillars[12],
    pill = stage.add(new QueenPill(stage, c, boss));
  pill.mode = 'wait';
  pill.pump = 3;
  pill.pos.y = c.pos.y;
  c.place(2, 0x4aff8a);
  pill.behave(0.5);
  expect(pill.pos.y).toBe(2);
  expect(pill.pos.x).toBe(c.pos.x);
  expect(pill.pump).toBe(3);
  expect(pill.mode).toBe('wait');
  pill.reset();
  expect(pill.dead).toBe(true);
  expect(pill.obj.visible).toBe(false);
});
it('never starts pumping an absent ladder, then gives the full DDA tell once a primed candle is viable', () => {
  const { boss, arena, stage } = fixture();
  boss.beginAttack('pump');
  expect(boss.state).toBe('awaitLadder');
  const candle = arena.pillars[12];
  candle.place(2, 0x4aff8a);
  const pill = stage.add(new QueenPill(stage, candle, boss, { pump: 3 }));
  boss.minions.push(pill);
  boss.dda.tele = 1.15;
  boss.update(0.01);
  expect(boss.state).toBe('pump');
  expect(boss.tell).toBeCloseTo(1.4 * 0.82 * 1.15);
  step(boss, boss.tell - 0.02);
  expect(boss.vulnerable).toBe(false);
  step(boss, 0.03);
  expect(boss.state).toBe('pumped');
  expect(boss.vulnerable).toBe(true);
});
it('opens a fresh full crown window after S3 bubble pop and refuses body bites', () => {
  const { boss, player } = fixture();
  boss.resetToPhase(3);
  boss.openWindow();
  expect(boss.vulnerable).toBe(false);
  boss.onBark();
  expect(boss.vulnerable).toBe(true);
  expect(boss.pumpedFor).toBe(boss.W);
  const before = boss.hp;
  player.pos.copy(boss.pos);
  boss.onBite(player);
  expect(boss.hp).toBe(before);
  player.pos.copy(boss.crownPosition());
  player.pos.y -= 0.75;
  boss.onBite(player);
  expect(boss.hp).toBe(before - 1);
});
it('creates symbol-coded airdrops that fall at3m/s and spawn noncountable payloads only on landing', () => {
  const { stage, arena } = fixture();
  const c = arena.pillars[12];
  c.place(2, 0x4aff8a);
  const d = stage.add(new QueenAirdrop(stage, c, true));
  d.update(1);
  expect(d.pos.y).toBe(9);
  expect(d.payload).toBeUndefined();
  d.update(2.2);
  expect(d.payload.countable).toBe(false);
  expect(d.payload.pos.y).toBe(2);
  d.onRespawn();
  expect(d.payload.dead).toBe(true);
});
it('crumples on a live Dust hit while supported by an existing inner candle and restores on checkpoint', () => {
  const { boss, arena, player } = fixture();
  boss.resetToPhase(4);
  boss.lastGreen = arena.pillars[0];
  boss.beginAttack('wake');
  boss.stateT = boss.tell + 0.01;
  player.dustDashing = true;
  player.pos.copy(boss.pos);
  boss.onDash(player);
  expect(boss.state).toBe('pumped');
  expect(boss.vulnerable).toBe(true);
  expect(boss.crownPosition().y).toBeCloseTo(2.2);
  expect(boss.wakeCandle.inner).toBe(true);
  boss.resetToPhase(4);
  expect(boss.hp).toBe(3);
  expect(boss.bubble.visible).toBe(false);
  expect(boss.wake).toBeNull();
  expect(boss.crumpled).toBe(false);
});
function realPlayer(f) {
  const { game, stage } = f;
  save.reset();
  save.data.godMode = false;
  save.data.beaten[4] = true;
  game.loadout = { effects: {}, cosmeticSlots: () => ({}) };
  game.onPlayerDeath = vi.fn();
  game.onFlop = vi.fn();
  game.session.mask = 0;
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
    _updateShadow: noop,
    _paintGear: noop
  });
  p.body = { pos: p.pos, vel: p.vel, hw: 0.3, hd: 0.3, h: 1.3, onLand: (...a) => p._onLand(...a) };
  game.player = p;
  p.spawnAt(new THREE.Vector3());
  return p;
}
it('supports actual cardinal-keyboard slide/bite Dust entry and a subsequent crown bite from all12outer candles', () => {
  const f = fixture(),
    p = realPlayer(f),
    { boss, arena, stage, game } = f;
  let pressed = new Set(),
    held = new Set();
  vi.spyOn(input, 'pressed').mockImplementation((k) => pressed.has(k));
  vi.spyOn(input, 'held').mockImplementation((k) => held.has(k));
  const basis = { right: { x: 1, z: 0 }, forward: { x: 0, z: 1 } };
  const hurt = vi.spyOn(p, 'hurt');
  for (let index = 0; index < 12; index++) {
    boss.resetToPhase(4);
    const outer = arena.pillars[index];
    boss.lastGreen = outer;
    boss.beginAttack('wake');
    boss.stateT = boss.tell + 0.01;
    const target = boss.wakeCandle;
    const dx = outer.pos.x - target.pos.x,
      dz = outer.pos.z - target.pos.z,
      alongX = Math.abs(dx) > Math.abs(dz),
      sign = Math.sign(alongX ? dx : dz);
    const start = outer.pos.clone();
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    if (alongX) {
      start.x = clamp(target.pos.x + sign * 5, outer.pos.x - 1.25, outer.pos.x + 1.25);
      start.z = clamp(target.pos.z, outer.pos.z - 1.25, outer.pos.z + 1.25);
    } else {
      start.z = clamp(target.pos.z + sign * 5, outer.pos.z - 1.25, outer.pos.z + 1.25);
      start.x = clamp(target.pos.x, outer.pos.x - 1.25, outer.pos.x + 1.25);
    }
    p.spawnAt(start, alongX ? Math.atan2(-sign, 0) : Math.atan2(0, -sign));
    p.body.grounded = true;
    p.body.ground = outer.solid;
    hurt.mockClear();
    const hp = boss.hp;
    let damaged = false;
    for (let frame = 0; frame < 130; frame++) {
      input.state.x = alongX && p.mode !== 'normal' ? -sign : 0;
      input.state.y = !alongX && p.mode !== 'normal' ? -sign : 0;
      if (frame === 0) {
        pressed.add('slide');
        held.add('slide');
        input.state.x = alongX ? -sign : 0;
        input.state.y = alongX ? 0 : -sign;
      }
      if (frame === 1) pressed.add('bite');
      if (p.mode === 'normal' && boss.vulnerable) pressed.add('bite');
      stage.world.beginFrame();
      arena.update(1 / 120);
      boss.update(1 / 120);
      p.update(1 / 120, stage, basis);
      game.session.projectiles.update(1 / 120);
      pressed.clear();
      if (boss.hp < hp) {
        damaged = true;
        break;
      }
      if (p.dead) break;
    }
    expect(damaged, `outer${index}, player${p.pos.toArray()}, mode${p.mode}, boss${boss.state}`).toBe(true);
    expect(hurt.mock.calls, `outer${index}`).toHaveLength(0);
    held.clear();
    game.session.projectiles.clear();
  }
  input.state.x = input.state.y = 0;
});
it('reaches every S1–3 crown from each inner candle at the minimum1m height through actual primed-pill stomp, jump and bite', () => {
  const f = fixture(),
    p = realPlayer(f),
    { boss, arena, stage } = f;
  save.data.beaten[3] = true;
  save.data.beaten[1] = true;
  let pressed = new Set(),
    held = new Set();
  vi.spyOn(input, 'pressed').mockImplementation((k) => pressed.has(k));
  vi.spyOn(input, 'held').mockImplementation((k) => held.has(k));
  const basis = { right: { x: 1, z: 0 }, forward: { x: 0, z: 1 } };
  const hurt = vi.spyOn(p, 'hurt');
  for (const phase of [1, 2, 3])
    for (let index = 12; index < 16; index++) {
      boss.resetToPhase(phase);
      const candle = arena.pillars[index];
      candle.place(1, 0x4aff8a);
      const pill = stage.add(new QueenPill(stage, candle, boss, { pump: 3 }));
      pill.mode = 'wait';
      pill.pos.y = 1;
      pill.size0 = 1.51;
      pill.behave(0);
      boss.minions.push(pill);
      boss.pos.set(0, 3, 0);
      boss.setPump(1);
      boss.alignPumpedCrown();
      boss.openWindow();
      boss.refreshBox();
      const start = candle.pos.clone();
      start.y = pill.box.max.y + 0.04;
      p.spawnAt(start, Math.atan2(-start.x, -start.z));
      p.vel.y = -3;
      p.body.grounded = false;
      p.canDouble = false;
      p.barkCool = 0;
      p.barkT = 1;
      hurt.mockClear();
      held.clear();
      pressed.clear();
      if (phase === 3) pressed.add('bark');
      const hp = boss.hp;
      let bounced = false,
        airJumped = false,
        reached = false,
        damaged = false;
      for (let frame = 0; frame < 130; frame++) {
        const distance = Math.hypot(p.pos.x, p.pos.z);
        if (distance < 0.9) reached = true;
        input.state.x = reached ? 0 : -Math.sign(start.x);
        input.state.y = reached ? 0 : -Math.sign(start.z);
        if (bounced && !airJumped && p.vel.y < 1 && p.canDouble) {
          pressed.add('jump');
          held.add('jump');
          airJumped = true;
        }
        if (bounced && distance < 1.3 && p.pos.y + 0.75 >= boss.crownPosition().y - 1.2) pressed.add('bite');
        stage.world.beginFrame();
        boss.update(1 / 120);
        pill.update(1 / 120);
        p.update(1 / 120, stage, basis);
        pressed.clear();
        if (p.vel.y > 15) bounced = true;
        if (boss.hp < hp) {
          damaged = true;
          break;
        }
        if (p.dead) break;
      }
      expect(bounced, `phase${phase}/inner${index}`).toBe(true);
      expect(
        damaged,
        `phase${phase}/inner${index}:p${p.pos.toArray()},boss${boss.state},time${boss.stateT}`
      ).toBe(true);
      expect(hurt.mock.calls, `phase${phase}/inner${index}`).toHaveLength(0);
      held.clear();
    }
  input.state.x = input.state.y = 0;
});
it('keeps every crash/liquidation/ultimate return within9m/s through real Solid deltas', () => {
  const { arena, stage, player } = fixture();
  for (const action of ['crash', 'liquidation', 'ultimate']) {
    arena.setPhase(action === 'liquidation' ? 4 : 3);
    player.pos.set(7.5, 0, 0);
    if (action === 'crash') arena.beginCrash(player, 0.4);
    if (action === 'liquidation') arena.beginLiquidation(player);
    if (action === 'ultimate') arena.beginUltimate(player, 0.8, 3);
    for (let frame = 0; frame < 1600; frame++) {
      stage.world.beginFrame();
      if (action === 'ultimate' && frame === 700) arena.endUltimate();
      arena.update(1 / 120);
      for (const p of arena.pillars)
        expect(Math.abs(p.solid.delta.y), `${action}/candle${p.index}/frame${frame}`).toBeLessThanOrEqual(
          9 / 120 + 1e-8
        );
    }
    expect(arena.pillars.every((p) => !p.returning)).toBe(true);
  }
});
it('selects four symmetric crash targets for every cardinal and intermediate player bearing', () => {
  const { arena, player } = fixture();
  for (let i = 0; i < 24; i++) {
    player.pos.set(Math.cos((i * Math.PI) / 12) * 8, 1, Math.sin((i * Math.PI) / 12) * 8);
    arena.beginCrash(player, 0.6);
    const selected = arena.crash.pillars;
    expect(new Set(selected).size).toBe(4);
    expect(selected.filter((p) => p.inner)).toHaveLength(2);
    expect(selected.reduce((n, p) => n + p.pos.x, 0)).toBeCloseTo(0);
    expect(selected.reduce((n, p) => n + p.pos.z, 0)).toBeCloseTo(0);
  }
});
it('scrolls real ticker label textures and swaps every board to dump/zero status', () => {
  const { arena } = fixture();
  const pump = arena.tickerTextures.pump;
  expect(arena.tickers.every((t) => t.userData.panel.material.map === pump)).toBe(true);
  arena.update(0.1);
  expect(pump.offset.x).toBeGreaterThan(0);
  arena.setPhase(4);
  expect(arena.tickers.every((t) => t.userData.panel.material.map === arena.tickerTextures.dump)).toBe(true);
  arena.setTicker('zero');
  expect(arena.tickers.every((t) => t.userData.panel.material.map === arena.tickerTextures.zero)).toBe(true);
});
it('plays the two-second candle entrance and defeat pop/crown beat without entity or ticket rewards', async () => {
  const f = fixture(),
    p = realPlayer(f),
    { boss, arena, stage } = f;
  boss.active = false;
  const intro = boss.intro();
  expect(boss.introCandle.visible).toBe(true);
  boss.update(1);
  expect(boss.pos.y).toBeCloseTo(-2.5);
  boss.update(1);
  await intro;
  expect(boss.pos.y).toBe(3);
  expect(boss.introCandle.visible).toBe(false);
  expect(boss.chants).toBe(4);
  boss.defeated = true;
  const count = stage.entities.length;
  boss.update(2.01);
  expect(arena.tickerKind).toBe('zero');
  expect(boss.rig.visible).toBe(false);
  expect(boss.crown.parent).toBe(p.root);
  expect(stage.entities.length).toBe(count);
  boss.update(0.7);
  expect(boss.crown.parent).toBe(stage.scene);
  boss.update(1.5);
  expect(boss.crown.visible).toBe(false);
});
it('preserves the earned base bark with a Spell Hat using only base range/cone/height and .9s cooldown', () => {
  const f = fixture(),
    p = realPlayer(f),
    { boss, arena, game, stage } = f;
  save.data.beaten[3] = true;
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
  const earned = vi.spyOn(boss, 'onEarnedBark'),
    spell = vi.spyOn(boss, 'onBark');
  const pose = (earnedMove = true, z = 3.5, facing = Math.PI, y = 3) => {
    save.data.beaten[3] = earnedMove;
    boss.phase = 3;
    boss.pos.set(0, 3, 0);
    boss.openWindow();
    p.pos.set(0, y, z);
    p.facing = facing;
    p.earnedBossBarkCool = 0;
    earned.mockClear();
    spell.mockClear();
  };
  for (const [owned, z, facing, y] of [
    [false, 3.5, Math.PI, 3],
    [true, 7, Math.PI, 3],
    [true, 3.5, 0, 3],
    [true, 3.5, (2 * Math.PI) / 3, 3],
    [true, 3.5, Math.PI, 6]
  ]) {
    game.loadout.effects.spell_bark.y_tol_m = y === 6 ? 9 : 2.5;
    pose(owned, z, facing, y);
    p._bark();
    expect(boss.shielded).toBe(true);
    expect(earned).not.toHaveBeenCalled();
    expect(spell).not.toHaveBeenCalled();
  }
  game.loadout.effects.spell_bark.y_tol_m = 2.5;
  pose();
  p._bark();
  expect(boss.shielded).toBe(false);
  expect(earned).toHaveBeenCalledTimes(1);
  expect(spell).not.toHaveBeenCalled();
  expect(p.earnedBossBarkCool).toBe(0.9);
  expect(p.barkCool).toBe(0.7);
  expect(game.session.onEnemyDefeated).not.toHaveBeenCalled();
  const candle = arena.pillars[12];
  candle.place(1, 0x4aff8a);
  p.pos.copy(candle.pos);
  p.body.grounded = true;
  p.body.ground = candle.solid;
  p.facing = Math.atan2(-p.pos.x, -p.pos.z);
  vi.spyOn(input, 'pressed').mockReturnValue(false);
  vi.spyOn(input, 'held').mockReturnValue(false);
  input.state.x = input.state.y = 0;
  stage.world.beginFrame();
  p.update(0.7, stage, { right: { x: 1, z: 0 }, forward: { x: 0, z: 1 } });
  boss.openWindow();
  p._bark();
  expect(boss.shielded).toBe(true);
  expect(earned).toHaveBeenCalledTimes(1);
  p.update(0.2, stage, { right: { x: 1, z: 0 }, forward: { x: 0, z: 1 } });
  p._bark();
  expect(boss.shielded).toBe(false);
  expect(earned).toHaveBeenCalledTimes(2);
  game.loadout.effects = {};
  pose();
  p._bark();
  expect(spell).toHaveBeenCalledTimes(1);
  expect(earned).not.toHaveBeenCalled();
});
