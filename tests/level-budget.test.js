import { test, vi, expect } from 'vitest';
import * as THREE from 'three';

vi.mock('../src/art/assets.js', () => ({ Assets: {
  has: () => false, model: () => null, animate: () => null, aspect: () => 1,
  tex: () => new THREE.Texture({ width: 256, height: 256 }),
  tiled: () => new THREE.Texture({ width: 256, height: 256 }),
  url: () => '',
} }));

const gradient = { addColorStop() {} };
const ctx = new Proxy({
  measureText: () => ({ width: 100 }),
  createLinearGradient: () => gradient,
  createRadialGradient: () => gradient,
  createImageData: (w,h) => ({ data: new Uint8ClampedArray(w*h*4) }),
  getImageData: (x,y,w,h) => ({ data: new Uint8ClampedArray(w*h*4) }),
}, { get: (obj,k) => k in obj ? obj[k] : () => {}, set: (obj,k,v) => (obj[k]=v,true) });
HTMLCanvasElement.prototype.getContext = () => ctx;
HTMLCanvasElement.prototype.toDataURL = () => '';

const { Stage } = await import('../src/world/stage.js');
const { TicketSystem } = await import('../src/entities/tickets.js');
const { Backpack, ZippedBackpack, Trampoline, Cat, Rug } = await import('../src/entities/breakables.js');
const { MysteryBackpack } = await import('../src/entities/mysteryBackpack.js');
const { LEVELS } = await import('../src/levels/registry.js');
const PLAYABLE_IDS = Object.values(LEVELS).filter((def) => def.shipped && !def.meta && !def.gauntlet && typeof def.build === 'function').map((def) => String(def.id));
const { LEVEL_BUDGETS } = await import('../src/levels/data/budgets.js');
const { LEVEL_TICKET_CAP } = await import('../src/config/tickets.js');
const { measureTicketBudget } = await import('../src/game/measureTicketBudget.js');
const { checkTicketBudget, ticketBudget, budgetDifferences } = await import('../src/game/ticketBudget.js');
const { save } = await import('../src/core/save.js');
const { Session } = await import('../src/game/session.js');
vi.spyOn(Stage.prototype, 'decor').mockImplementation(() => {});

function partialSession(Cls) {
  save.load(); save.data.tickets = 0;
  const noop = () => {};
  const game = {
    player: { pos: new THREE.Vector3(), facing: Math.PI, abilities: {}, spawnAt: noop },
    ui: { tutorial: noop, banner: noop, setHud: noop },
    fx: { clear: noop, burst: noop, puff: noop },
    camera: { snap: noop, shake: noop }, mask: { snapTo: noop, setLevel: noop },
  };
  const session = new Session(game, '1'); game.session = session;
  const stage = new Stage(game, LEVELS['1'].theme); session.stage = stage;
  const tickets = { restoreAfter: noop, clearFlying: noop,
    spawnFlying(_x, _y, _z, n, source) { session.addTickets(n, source); } };
  session.tickets = game.tickets = tickets;
  session.projectiles = { clear: noop };
  // The initial actor snapshot precedes partial interactions. There is no
  // entity checkpoint snapshot until a real later checkpoint is reached.
  session.checkpoint(new THREE.Vector3());
  const payer = new Cls(stage, 0, 0, 0); stage.add(payer);
  const partial = () => payer instanceof Trampoline ? payer.onLand({ bounce: noop }) : payer.onBite();
  return { session, payer, partial, max: payer.authoredTickets ?? payer.ticketsMax };
}

for (const Cls of [ZippedBackpack, Trampoline]) {
  test(`real Session checkpoints conserve ${Cls.name} payload across repeated death restores`, () => {
    const { session, payer, partial, max } = partialSession(Cls);
    partial(); session.checkpoint(new THREE.Vector3());
    partial(); session.checkpoint(new THREE.Vector3());
    expect(session.cp.fieldRaw).toBe(2);
    for (let i = 0; i < 5; i++) {
      payer.onExplosion();
      expect(session.fieldRaw).toBe(max);
      expect(session.snack.raw).toBe(max);
      session.respawn();
      expect(session.fieldRaw).toBe(2);
      expect(session.snack.raw).toBe(2);
      expect(payer instanceof Trampoline ? payer.ticketsLeft : payer.tickets).toBe(max - 2);
      expect(payer.broken).toBe(false);
    }
    payer.onExplosion();
    expect(session.fieldRaw).toBe(max);
    expect(session.levelTickets).toBe(Math.floor(max / 3));
  });

  test(`real Session respawn rewinds unbroken ${Cls.name} partial payouts before any later checkpoint`, () => {
    const { session, payer, partial, max } = partialSession(Cls);
    partial(); partial(); expect(session.fieldRaw).toBe(2);
    expect(payer.broken).toBe(false);
    session.respawn();
    expect(session.fieldRaw).toBe(0);
    expect(session.snack.raw).toBe(0);
    expect(payer instanceof Trampoline ? payer.ticketsLeft : payer.tickets).toBe(max);
    payer.onExplosion(); expect(session.fieldRaw).toBe(max);
  });
}

function build(id, arena = false, roll = .001, options = {}) {
  const random = vi.spyOn(Math, 'random').mockReturnValue(roll);
  try {
    save.load();
    const game = {
      player: { pos: new THREE.Vector3(), body: { s: 0, u: 0, h: 1.3 }, abilities: {} },
      ui: { tutorial() {}, banner() {} }, fx: {}, camera: { shake() {} },
      session: { level: id, deaths: 0, runSeed: 42, nextSeq: () => 1, onBreak() {}, addTickets() {} },
    };
    const def = LEVELS[id], stage = new Stage(game, arena ? def.bossTheme : def.theme);
    const tickets = new TicketSystem(game, stage); game.tickets = tickets;
    (arena ? def.arena : def.build)(game, stage, tickets, options); tickets.finalize();
    return { stage, tickets, measured: measureTicketBudget(stage, tickets) };
  } finally { random.mockRestore(); }
}

for (const id of PLAYABLE_IDS) {
  test(`actual ${id} builder and arena match declared maximum and fixed cap`, () => {
    const low = build(id), high = build(id, false, .999999);
    expect(low.measured).toEqual(high.measured); // Worst case, independent of rolled pack payout.
    const arena = LEVELS[id].arena ? build(id, true).measured : null;
    if (arena) {
      expect(arena.field).toBeLessThanOrEqual(7);
      expect(ticketBudget(arena).raw).toBe(arena.field);
    }
    const measured = { ...low.measured, arena: arena ? ticketBudget(arena).raw : 0 };
    expect(budgetDifferences(LEVEL_BUDGETS[id], measured)).toEqual([]);
    expect(checkTicketBudget(id, measured).wholeMax).toBeLessThanOrEqual(LEVEL_TICKET_CAP[id]);
  });
}

test('an authored extra payout beyond a fixed cap fails rather than growing the cap', () => {
  const { stage, tickets } = build('1');
  const cap = LEVEL_TICKET_CAP[1];
  stage.add(new Backpack(stage, 0, 0, 0, { tickets: cap * 3 }));
  const measured = measureTicketBudget(stage, tickets, 7);
  expect(budgetDifferences(LEVEL_BUDGETS[1], measured)).not.toEqual([]);
  expect(() => checkTicketBudget(1, measured)).toThrow(/exceeds fixed cap/);
  expect(LEVEL_TICKET_CAP[1]).toBe(cap);
});

test('non-countable authored packs, every Bark Rock and trampoline are included; Mystery never doubles its inherited payload', () => {
  const { stage, tickets } = build('1');
  const before = measureTicketBudget(stage, tickets);
  const pack = new Backpack(stage, 0, 0, 0, { tickets: 11 }); pack.countable = false; stage.add(pack);
  const zipped = new ZippedBackpack(stage, 0, 0, 0); zipped.countable = false; stage.add(zipped);
  const trampoline = new Trampoline(stage, 0, 0, 0, { tickets: 12 }); trampoline.countable = false; stage.add(trampoline);
  const m = new MysteryBackpack(stage, 0, 0, 0, { slot: 2 }); stage.add(m);
  const prize = new Trampoline(stage, 0, 0, 0, { tickets: 0 }); m.spawned.push(prize); stage.add(prize);
  const measured = measureTicketBudget(stage, tickets);
  expect(measured.packs - before.packs).toBe(11);
  expect(measured.zipped - before.zipped).toBe(8);
  expect(measured.trampoline - before.trampoline).toBe(12);
  expect(measured.mystery - before.mystery).toBe(1);
  expect(ticketBudget(measured).raw - ticketBudget(before).raw).toBe(40);
  expect(before.bark).toBe(10); // L1's oneUp Bark Rock also pays ten Tickets.
});

test('every shipped registry id has a declaration and fixed cap, and planned level 6 has a cap', () => {
  const budgetIds = Object.values(LEVELS).filter(def => def.shipped && !def.meta && typeof def.build === 'function').map(def => String(def.id));
  expect(Object.keys(LEVEL_BUDGETS).sort()).toEqual(budgetIds.sort());
  for (const id of [...budgetIds, '4', '6', '5']) expect(LEVEL_TICKET_CAP[id]).toBeGreaterThan(0);
  expect(Object.entries(LEVEL_BUDGETS).filter(([, b]) => b.coconut).map(([id]) => id)).toEqual(['1', '4']);
  expect(() => checkTicketBudget('missing', LEVEL_BUDGETS[1])).toThrow(/Missing Ticket cap/);
});

test('ordinary stage and arena share raw remainder before floor; coconut is a separate shared allowance', () => {
  expect(ticketBudget(LEVEL_BUDGETS[2])).toEqual({ raw: 51, coconut: 0, wholeMax: 17 });
  expect(ticketBudget(LEVEL_BUDGETS[1])).toEqual({ raw: 565, coconut: 15, wholeMax: 203 });
});

for (const id of ['1', '2', '3']) {
  test(`level ${id} ${id==='1'?'Classic ':''}Mystery slots are optional, on permanent floor, before any later move, and four metres from Cats/Rugs`, () => {
    const { stage } = build(id,false,.001,['1','3'].includes(id)?{layout:1}:{}), track = stage.track;
    const mysteries = stage.entities.filter((e) => e instanceof MysteryBackpack);
    expect(mysteries.map((e) => e.slot)).toEqual([0, 1]);
    for (const m of mysteries) {
      const p = track.project(m.pos.x, m.pos.z);
      expect(Math.abs(p.u)).toBeGreaterThanOrEqual(id==='2'?1.7:2.8); // Side path, clear central running lane.
      const ground = track.groundAt(p.s, p.u);
      expect(ground).not.toBeNull();
      expect(m.pos.y).toBeCloseTo(ground.y, 1);
      expect(m.allowTramp).toBe(false); // No optional ledge is required by these layout-1 slots.
      for (const e of stage.entities.filter((e) => e instanceof Cat || e instanceof Rug)) {
        expect(m.pos.distanceTo(e.pos)).toBeGreaterThanOrEqual(4);
      }
      // A Cat result has solid escape room forward and back on this side floor.
      for (const ds of [-1.5, 1.5]) expect(track.groundAt(p.s + ds, p.u)).not.toBeNull();
    }
  });
}


test('L2 Mysteries sit in the held Fort and sunken loop and do not re-hit a newly spawned Cat in the same bite scan', async () => {
  const { Player } = await import('../src/player/player.js');
  const { rollMystery } = await import('../src/game/rng.js');
  for (const [slot,d] of [[0,267.5],[1,400]]) {
    const { stage } = build('2'), track = stage.track;
    const mystery = stage.entities.find(e=>e.kind==='mystery'&&e.slot===slot),at=track.project(mystery.pos.x,mystery.pos.z);
    expect(at.s).toBeCloseTo(d,1);
    const p={pos:mystery.pos.clone().addScaledVector(track.tangent(d),-1),body:{s:d,u:at.u,h:1.1},mode:'normal',biteT:.3,bitten:new Set(),forward:track.tangent(d),biteRange:.95,vel:new THREE.Vector3(),invincible:false};
    stage.game.player=p;stage.game.fx=new Proxy({},{get:()=>()=>{}});
    if(slot===0){stage.chaseCat.begin(d-13,0);stage.chaseCat.state='run';stage.chaseCat.update(.01);expect(stage.chaseCat.state).toBe('stop');}
    else{stage.chaseCat.y=track.heightAt(d);expect(stage.chaseCat.canCatch(1,p)).toBe(false);expect(stage.canyonRiver.detour.loop).toBe(true);}
    let seed=0;while(rollMystery(seed,'2',slot)!=='cat')seed++;stage.game.session.runSeed=seed;stage.entities=[mystery];
    Player.prototype._interact.call(p,stage);expect(mystery.broken).toBe(true);
    const cat=mystery.spawned[0];expect(cat.kind).toBe('cat');expect(cat.dead).toBe(false);expect(cat.timer).toBe(0);expect(p.bitten.has(cat)).toBe(true);
  }
});

test('each level module re-exports its budget declaration', async () => {
  for (const [id, name] of Object.entries({ 1: 'level1', 2: 'level2Extended', 3: 'level3', 5: 'level5', 6: 'level6', ride: 'bonusRide', cave: 'bonusCave' })) {
    expect((await import(`../src/levels/${name}.js`)).BUDGET).toBe(LEVEL_BUDGETS[id]);
  }
});


test('T.budget reports measured changes and rejects special contexts', async () => {
  const { inspectTicketBudget } = await import('../src/game/devTicketBudget.js');
  const { stage, tickets } = build('1');
  const game = { session: { level: 1, stage, tickets } };
  const table = vi.spyOn(console, 'table').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(inspectTicketBudget(game)).toMatchObject({ wholeMax: 203, cap: 205, differences: [] });
    stage.add(new Backpack(stage, 0, 0, 0, { tickets: 12 }));
    expect(inspectTicketBudget(game)).toMatchObject({ differences: [{ source: 'packs', declared: 262, measured: 274 }], error: expect.stringMatching(/exceeds fixed cap/) });
    game.session.devStrip = true;
    expect(() => inspectTicketBudget(game)).toThrow(/fresh ordinary level/);
  } finally { table.mockRestore(); error.mockRestore(); }
});


test('partial paying entities conserve their authored maximum across checkpoint/death cycles', () => {
  for (const Cls of [ZippedBackpack, Trampoline]) {
    const { stage } = build('1');
    let attemptRaw = 0, bankedRaw = 0;
    stage.game.tickets = { spawnFlying: (x, y, z, n) => { attemptRaw += n; } };
    stage.game.fx = new Proxy({}, { get: () => () => {} });
    const e = new Cls(stage, 0, 0, 0), max = e.authoredTickets ?? e.ticketsMax;
    const partial = () => e instanceof Trampoline ? e.onLand({ bounce() {} }) : e.onBite();
    const die = () => {
      attemptRaw = bankedRaw;
      if (e.broken) e.restore();
      e.onRespawn();
    };
    partial(); partial();
    bankedRaw = attemptRaw; e.onCheckpoint();
    const atCp = e instanceof Trampoline ? e.ticketsLeft : e.tickets;
    for (let i = 0; i < 5; i++) {
      e.onExplosion();
      expect(attemptRaw).toBe(max);
      die();
      expect(e instanceof Trampoline ? e.ticketsLeft : e.tickets).toBe(atCp);
      if (e instanceof ZippedBackpack) {
        expect(e.hits).toBe(1); expect(e.tags.map((t) => t.visible)).toEqual([true, false, false]);
      }
    }
    e.onExplosion(); expect(attemptRaw).toBe(max);
  }
});

test('unbanked partial hits rewind on death, while later checkpoints preserve remaining payload', () => {
  for (const Cls of [ZippedBackpack, Trampoline]) {
    const { stage } = build('1');
    const e = new Cls(stage, 0, 0, 0);
    stage.game.tickets = { spawnFlying() {} };
    stage.game.fx = new Proxy({}, { get: () => () => {} });
    const partial = () => e instanceof Trampoline ? e.onLand({ bounce() {} }) : e.onBite();
    const remaining = () => e instanceof Trampoline ? e.ticketsLeft : e.tickets;
    const max = remaining();
    partial(); e.onRespawn(); expect(remaining()).toBe(max);
    partial(); e.onCheckpoint(); partial(); e.onRespawn(); expect(remaining()).toBe(max - 1);
    partial(); e.onCheckpoint(); e.onExplosion(); e.restore(); e.onRespawn(); expect(remaining()).toBe(max - 2);
  }
});


test('authored low-payload Zipped budgets cover the three-hit payout floor', () => {
  const { stage, tickets } = build('1');
  const before = measureTicketBudget(stage, tickets);
  let paid = 0;
  stage.game.tickets = { spawnFlying: (x, y, z, n) => { paid += n; } };
  stage.game.fx = new Proxy({}, { get: () => () => {} });
  for (const authored of [0, 1, 2]) {
    const e = new ZippedBackpack(stage, 0, 0, 0, { tickets: authored }); stage.add(e);
    const prior = paid;
    e.onBite(); e.onBite(); e.onBite();
    expect(paid - prior).toBe(3);
  }
  expect(measureTicketBudget(stage, tickets).zipped - before.zipped).toBe(9);
});

test('an opening explosion cannot immediately shorten a newly spawned Cat fuse', async () => {
  const { explode } = await import('../src/entities/breakables.js');
  const { rollMystery } = await import('../src/game/rng.js');
  const { stage } = build('1');
  const m = stage.entities.find((e) => e.kind === 'mystery');
  let seed = 0; while (rollMystery(seed, '1', m.slot) !== 'cat') seed++;
  stage.game.session.runSeed = seed;
  stage.game.fx = new Proxy({}, { get: () => () => {} });
  stage.game.player.pos = new THREE.Vector3(999, 0, 999);
  stage.entities = [m];
  explode(stage, m.pos.x, m.pos.y, m.pos.z, 3);
  expect(m.spawned[0].kind).toBe('cat');
  expect(m.spawned[0].timer).toBe(0);
  expect(m.spawned[0].dead).toBe(false);
});
