import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CARRY_MAX,
  COCONUT_CAP_PER_CLEAR,
  LEVEL_END_MAX_AMOUNT,
  NOBU_TICKET_SCALE,
  rawTicketsForWhole,
  wholeTicketsFromRaw,
} from '../src/config/tickets.js';
import { input } from '../src/core/input.js';
import { save } from '../src/core/save.js';
import { CoconutRoller } from '../src/entities/props.js';
import { Game } from '../src/game/game.js';
import { Session } from '../src/game/session.js';
import { hub } from '../src/hub/hubBridge.js';
import { readHubStore, readyHub, resetHub, resetWorld } from './helpers.js';
import { creditedEarnTotal, hubError, sdk } from './sdkState.js';

const DAY = '2026-06-15T12:00:00.000Z';
const DAY_STAMP = '2026-06-15';
const NEXT_DAY = '2026-06-16T00:00:00.000Z';
const DENOM = Math.round(1 / NOBU_TICKET_SCALE);
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

beforeEach(async () => {
  resetWorld();
  await readyHub();
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse(DAY));
});

afterEach(() => {
  input._pressed = new Set();
  input._anyPressed = false;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function playSession() {
  const session = Object.create(Session.prototype);
  session.game = {
    ui: { setHud() {}, banner() {}, fade: () => Promise.resolve(), trialTime() {} },
    player: { spawnAt() {}, ride: null, frozen: false, pos: new THREE.Vector3(), victory() {} },
    camera: { snap() {}, cinematic() {} },
    mask: { snapTo() {} },
    fx: { clear() {}, burst() {} },
    startLevel() {},
    trialDone() {},
  };
  session.game.session = session;
  session.level = 1;
  session.levelTickets = 0;
  session.fieldRaw = 0;
  session.coconutRaw = 0;
  session.coconutSpawned = 0;
  session.coconutSeq = 0;
  session.collectedCoconuts = new Set();
  session.phase = 'level';
  session.trial = false;
  session.busy = false;
  session.stage = { entities: [], scene: new THREE.Scene() };
  session.tickets = { flying: [], game: session.game, restoreAfter() {}, clearFlying() {} };
  session.projectiles = { clear() {} };
  session.deathsAtCp = 0;
  session.cp = {
    pos: { clone() { return {}; } },
    facing: 0,
    seq: 0,
    tickets: 0,
    levelTickets: 0,
    fieldRaw: 0,
    coconutRaw: 0,
  };
  session._pushHud = () => {};
  session.setMask = () => {};
  session.oneUps = 0;
  return session;
}

function press(action) {
  input._pressed = new Set([action]);
  input._anyPressed = true;
}

async function trackedBank(run) {
  const pending = [];
  const orig = hub.bank.bind(hub);
  hub.bank = (...args) => {
    const promise = orig(...args);
    pending.push(promise);
    return promise;
  };
  try {
    const result = run();
    await Promise.all(pending);
    return result;
  } finally {
    hub.bank = orig;
  }
}

describe('ticket scale', () => {
  it('perfect clears bank the scaled whole amount and drop a fractional remainder', async () => {
    const perfect = [100, 75, 46];
    for (const whole of perfect) {
      const raw = rawTicketsForWhole(whole);
      const session = playSession();
      session.addTickets(raw);
      expect(session.levelTickets).toBe(wholeTicketsFromRaw(raw));
      expect(raw - rawTicketsForWhole(session.levelTickets)).toBe(0);
      const attempt = await hub.beginAttempt(whole);
      await hub.bank(attempt.id, session.levelTickets, true);
    }
    expect(creditedEarnTotal()).toBe(perfect.reduce((sum, whole) => sum + wholeTicketsFromRaw(rawTicketsForWhole(whole)), 0));
    expect(readHubStore().carry).toBeNull();

    const glowwormRaw = 125;
    const glowworm = playSession();
    glowworm.addTickets(glowwormRaw);
    const whole = wholeTicketsFromRaw(glowwormRaw);
    const dropped = glowwormRaw - rawTicketsForWhole(whole);
    expect(dropped).toBeGreaterThan(0);
    expect(dropped).toBeLessThan(DENOM);
    expect(glowworm.levelTickets).toBe(whole);

    const attempt = await hub.beginAttempt('cave');
    await hub.bank(attempt.id, glowworm.levelTickets, true);
    expect(sdk.earnLedger.get(attempt.id).amount).toBe(whole);
    expect(readHubStore().carry).toBeNull();

    const again = playSession();
    again.addTickets(glowwormRaw);
    expect(again.levelTickets).toBe(whole);
    const second = await hub.beginAttempt('cave');
    await hub.bank(second.id, again.levelTickets, true);
    expect(creditedEarnTotal()).toBe(
      perfect.reduce((sum, n) => sum + wholeTicketsFromRaw(rawTicketsForWhole(n)), 0) + whole * 2,
    );
  });
});

describe('coconuts', () => {
  it('a clear banks at most the config cap, and the excess is not earned or carried', async () => {
    const session = playSession();
    const capRaw = rawTicketsForWhole(COCONUT_CAP_PER_CLEAR);
    session.addTickets(capRaw + DENOM * 4, 'coconut');
    expect(session.coconutRaw).toBe(capRaw);
    expect(session.levelTickets).toBe(Math.min(COCONUT_CAP_PER_CLEAR, wholeTicketsFromRaw(session.coconutRaw)));

    const attempt = await hub.beginAttempt(1);
    await hub.bank(attempt.id, session.levelTickets, true);
    expect(creditedEarnTotal()).toBe(COCONUT_CAP_PER_CLEAR);
    expect(readHubStore().carry).toBeNull();
    expect(sdk.calls.earn.every((call) => call.amount <= COCONUT_CAP_PER_CLEAR)).toBe(true);
  });

  it('coconuts do not respawn after death', () => {
    const session = playSession();
    const capRaw = rawTicketsForWhole(COCONUT_CAP_PER_CLEAR);
    const track = {
      toWorld(d, u, y, target) {
        const point = target || new THREE.Vector3();
        point.set(u, y || 0, -d);
        return point;
      },
      groundAt() { return { y: 0 }; },
      heightAt() { return 0; },
    };
    const stage = { game: session.game, scene: new THREE.Scene() };
    session.game.player.body = { s: 180 };
    session.game.player.dead = false;
    session.game.player.pos.set(500, 0, 500);
    const roller = new CoconutRoller(stage, track, 200, { every: 0.01, speed: 1, lanes: [0], until: 160 });

    for (let i = 0; i < capRaw + 5; i++) roller.update(1);
    expect(session.coconutSpawned).toBe(capRaw);
    const spawned = session.coconutSpawned;

    roller.reset();
    session.collectedCoconuts.add(1);
    save.data.lives -= 1;
    session.respawn();
    for (let i = 0; i < 5; i++) roller.update(1);

    expect(session.coconutSpawned).toBe(spawned);
    expect(session.collectedCoconuts.has(1)).toBe(true);
    expect(roller.balls.length).toBe(0);
  });
});

describe('local-only tickets', () => {
  async function expectStillLocal(amount) {
    expect(sdk.calls.earn).toHaveLength(0);
    expect(readHubStore()?.carry ?? null).toBeNull();
    expect(save.data.tickets).toBe(amount);

    resetHub(hub);
    await hub.init();
    expect(sdk.calls.earn).toHaveLength(0);
    expect(readHubStore()?.carry ?? null).toBeNull();

    const next = await hub.beginAttempt(2);
    await hub.bankCarry();
    await hub.bank(next.id, wholeTicketsFromRaw(DENOM), true);
    expect(sdk.calls.earn.every((call) => call.amount !== amount)).toBe(true);
    expect(creditedEarnTotal()).toBe(wholeTicketsFromRaw(DENOM));
  }

  it('quit banks 0 and those tickets never ride a later earn, carry, or reload', async () => {
    const session = playSession();
    const amount = wholeTicketsFromRaw(rawTicketsForWhole(12));
    session.levelTickets = amount;
    session.attemptId = (await hub.beginAttempt(1)).id;
    session.attemptDurable = true;
    save.data.tickets = amount;
    const game = Object.create(Game.prototype);
    game.session = session;
    game.pauseSel = 6;
    game.ui = { pinHud() {}, fade: () => Promise.resolve(), setScreen() {} };
    game._drawPause = () => {};
    game.toMap = () => {};
    press('confirm');
    game.updatePause();
    await expectStillLocal(amount);
  });

  it('game over banks 0 and those tickets never ride a later earn, carry, or reload', async () => {
    const session = playSession();
    const amount = wholeTicketsFromRaw(rawTicketsForWhole(9));
    session.level = 1;
    session.levelTickets = amount;
    save.data.tickets = amount;
    const game = Object.create(Game.prototype);
    game.session = session;
    game.goT = 1;
    game.goSel = 0;
    game.ui = { hideHud() {}, bossHide() {}, fade() {}, setScreen() {} };
    game.startLevel = () => {};
    game.toTitle = () => {};
    game._drawGameOver = () => {};
    press('confirm');
    game.updateGameOver(0);
    await expectStillLocal(amount);
  });

  it('a secret warp banks 0 and those tickets never ride a later earn, carry, or reload', async () => {
    const session = playSession();
    const amount = wholeTicketsFromRaw(rawTicketsForWhole(8));
    session.levelTickets = amount;
    save.data.tickets = amount;
    vi.useFakeTimers();
    expect(session.secretWarp('cave')).toBe(true);
    vi.clearAllTimers();
    await expectStillLocal(amount);
  });

  it('quit tickets are not offered to the hub by exchange', async () => {
    const amount = wholeTicketsFromRaw(rawTicketsForWhole(12));
    save.data.tickets = amount;
    const session = playSession();
    session.levelTickets = amount;
    const game = Object.create(Game.prototype);
    game.session = session;
    game.pauseSel = 6;
    game.ui = { pinHud() {}, fade: () => Promise.resolve(), setScreen() {} };
    game._drawPause = () => {};
    game.toMap = () => {};
    press('confirm');
    game.updatePause();

    await Game.prototype._confirmExchange.call({
      exAmount: amount,
      exBusy: false,
      exchangeOpen: true,
      state: 'map',
      _drawMap() {},
    });
    expect(sdk.calls.exchange, 'the local-only wallet was submitted to hub.exchange').toHaveLength(0);
  });

  it('a finished trial banks and a quit trial does not', async () => {
    const finished = playSession();
    const amount = wholeTicketsFromRaw(rawTicketsForWhole(7));
    const attempt = await hub.beginAttempt(1);
    finished.attemptId = attempt.id;
    finished.attemptDurable = true;
    finished.levelTickets = amount;
    finished.trialT = 40;
    await trackedBank(() => finished._finishTrial());
    expect(sdk.earnLedger.get(attempt.id).amount).toBe(amount);

    resetWorld();
    await readyHub();
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(DAY));
    const quit = playSession();
    quit.trial = true;
    const abandoned = await hub.beginAttempt(1);
    quit.attemptId = abandoned.id;
    quit.attemptDurable = true;
    quit.levelTickets = amount;
    save.data.tickets = amount;
    const game = Object.create(Game.prototype);
    game.session = quit;
    game.pauseSel = 6;
    game.ui = { pinHud() {}, fade: () => Promise.resolve(), setScreen() {} };
    game._drawPause = () => {};
    game.toMap = () => {};
    press('confirm');
    game.updatePause();
    expect(sdk.calls.earn).toHaveLength(0);
    resetHub(hub);
    await hub.init();
    expect(sdk.earnLedger.has(abandoned.id)).toBe(false);
    expect(readHubStore()?.carry ?? null).toBeNull();
  });
});

describe('carry', () => {
  it('banks min(earned, allowance, level-end max) and carries the rest under its own key', async () => {
    hub.sessionAllowance = 50;
    const attempt = await hub.beginAttempt(1);
    const earned = 200;
    await hub.bank(attempt.id, earned, true);

    const sent = Math.min(earned, hub.sessionAllowance, LEVEL_END_MAX_AMOUNT);
    expect(sdk.calls.earn).toEqual([
      { amount: sent, reason: 'level_end', key: attempt.id },
    ]);
    const carry = readHubStore().carry;
    expect(carry.key).toMatch(UUID_V7);
    expect(carry.key).not.toBe(attempt.id);
    expect(carry.day).toBe(DAY_STAMP);
    expect(carry.amount).toBe(Math.min(CARRY_MAX, earned - sent));
    expect(carry.amount).toBeLessThanOrEqual(CARRY_MAX);
  });

  it('with no allowance, the bank is still capped and does not retry', async () => {
    expect(hub.sessionAllowance).toBeNull();
    const attempt = await hub.beginAttempt(1);
    const earned = 500;
    await hub.bank(attempt.id, earned, true);
    expect(sdk.calls.earn).toEqual([
      { amount: LEVEL_END_MAX_AMOUNT, reason: 'level_end', key: attempt.id },
    ]);
    expect(readHubStore().carry.amount).toBe(Math.min(CARRY_MAX, earned - LEVEL_END_MAX_AMOUNT));
    expect(sdk.calls.earn).toHaveLength(1);
  });

  it('the carry banks at the next level start, before that level earns', async () => {
    const first = await hub.beginAttempt(1);
    await hub.bank(first.id, LEVEL_END_MAX_AMOUNT + 40, true);
    const carryKey = readHubStore().carry.key;
    expect(carryKey).not.toBe(first.id);

    const next = await hub.beginAttempt(2);
    await hub.bankCarry();
    expect(sdk.earnLedger.has(carryKey)).toBe(true);
    expect(sdk.earnLedger.has(next.id)).toBe(false);

    await hub.bank(next.id, 5, true);
    const keys = sdk.calls.earn.map((call) => call.key);
    expect(keys.indexOf(carryKey)).toBeLessThan(keys.indexOf(next.id));
  });

  it('a partial carry keeps the remainder on a new key and the two keys do not credit the same tickets', async () => {
    const first = await hub.beginAttempt(1);
    await hub.bank(first.id, LEVEL_END_MAX_AMOUNT + 90, true);
    const original = readHubStore().carry.amount;
    expect(original).toBe(Math.min(CARRY_MAX, 90));
    const oldKey = readHubStore().carry.key;
    hub.sessionAllowance = 40;

    await hub.bankCarry();
    const remainder = readHubStore().carry;
    expect(remainder.key).not.toBe(oldKey);
    expect(remainder.key).toMatch(UUID_V7);
    expect(remainder.amount).toBe(original - 40);
    expect(sdk.earnLedger.get(oldKey).amount).toBe(40);
    expect(sdk.earnLedger.has(remainder.key)).toBe(false);

    hub.sessionAllowance = null;
    await hub.bankCarry();
    expect(sdk.earnLedger.get(remainder.key).amount).toBe(original - 40);
    expect(sdk.earnLedger.get(oldKey).amount).toBe(40);
    expect(sdk.earnLedger.get(oldKey).amount + sdk.earnLedger.get(remainder.key).amount).toBe(original);
  });

  it('a reload between the partial ack and the re-key does not credit the acked portion again', async () => {
    const first = await hub.beginAttempt(1);
    await hub.bank(first.id, LEVEL_END_MAX_AMOUNT + 90, true);
    const original = readHubStore().carry.amount;
    const oldKey = readHubStore().carry.key;
    hub.sessionAllowance = 40;
    hub._replaceCarry = () => { throw new Error('reload'); };
    await expect(hub.bankCarry()).rejects.toThrow('reload');
    expect(readHubStore().carry).toMatchObject({ key: oldKey, amount: original });
    expect(readHubStore().earns[oldKey]).toMatchObject({ amount: 40, acked: true });

    delete hub._replaceCarry;
    resetHub(hub);
    await hub.init();
    expect(sdk.earnLedger.get(oldKey).amount).toBe(40);
    expect(sdk.calls.earn.filter((call) => call.key === oldKey && call.amount !== 40)).toHaveLength(0);
    const remainder = readHubStore().carry;
    expect(remainder.key).not.toBe(oldKey);
    expect(remainder.amount).toBe(original - 40);

    await hub.bankCarry();
    const carryCredits = [...sdk.earnLedger.entries()]
      .filter(([key]) => key !== first.id)
      .reduce((sum, [, rec]) => sum + rec.amount, 0);
    expect(carryCredits).toBe(original);
  });

  it('a lost carry response still credits once, and the remainder is a new key', async () => {
    const first = await hub.beginAttempt(1);
    await hub.bank(first.id, LEVEL_END_MAX_AMOUNT + 90, true);
    const original = readHubStore().carry.amount;
    const oldKey = readHubStore().carry.key;
    hub.sessionAllowance = 40;
    sdk.loseEarnOnce = true;

    await hub.bankCarry();
    expect(readHubStore().earns[oldKey].acked).toBe(false);
    expect(readHubStore().carry.key).not.toBe(oldKey);
    expect(readHubStore().carry.amount).toBe(original - 40);

    resetHub(hub);
    await hub.init();
    await hub.bankCarry();
    const carryCredits = [...sdk.earnLedger.entries()]
      .filter(([key]) => key !== first.id)
      .reduce((sum, [, rec]) => sum + rec.amount, 0);
    expect(carryCredits).toBe(original);
    expect(sdk.earnLedger.get(oldKey).amount).toBe(40);
  });

  it('two tabs cannot both credit the same carry', async () => {
    const tabA = await import('../src/hub/hubBridge.js?carry-a');
    const tabB = await import('../src/hub/hubBridge.js?carry-b');
    resetHub(tabA.hub);
    resetHub(tabB.hub);
    await readyHub(tabA.hub);
    await readyHub(tabB.hub);
    const attempt = await tabA.hub.beginAttempt(1);
    await tabA.hub.bank(attempt.id, LEVEL_END_MAX_AMOUNT + 80, true);
    const original = readHubStore().carry.amount;
    const before = creditedEarnTotal();

    await Promise.all([tabA.hub.bankCarry(), tabB.hub.bankCarry()]);
    await tabA.hub.bankCarry();
    await tabB.hub.bankCarry();

    const carryCredits = creditedEarnTotal() - before;
    expect(carryCredits).toBeLessThanOrEqual(original);
    expect(carryCredits).toBe(original);
  });

  it('keeps an expired carry alive when the client clock is wound back', async () => {
    const attempt = await hub.beginAttempt(1);
    await hub.bank(attempt.id, LEVEL_END_MAX_AMOUNT + 40, true);
    const carry = readHubStore().carry;
    expect(carry.day).toBe(DAY_STAMP);

    // Server midnight has passed. The game clock is still the previous UTC day.
    const serverNow = Date.parse(NEXT_DAY);
    expect(new Date(serverNow).toISOString().slice(0, 10)).not.toBe(carry.day);
    Date.now.mockReturnValue(Date.parse(DAY));

    await hub.bankCarry();
    expect(sdk.earnLedger.has(carry.key), 'client Date.now kept an expired carry alive and credited it').toBe(false);
    expect(readHubStore().carry, 'client Date.now kept an expired carry alive').toBeNull();
  });

  it('expires a live carry when the client clock jumps forward', async () => {
    const attempt = await hub.beginAttempt(1);
    await hub.bank(attempt.id, LEVEL_END_MAX_AMOUNT + 40, true);
    const carry = readHubStore().carry;
    const serverStill = Date.parse(DAY);
    expect(new Date(serverStill).toISOString().slice(0, 10)).toBe(carry.day);

    Date.now.mockReturnValue(Date.parse(NEXT_DAY));
    await hub.bankCarry();
    expect(readHubStore().carry?.key, 'client Date.now expired a carry the server day still allowed').toBe(carry.key);
    expect(sdk.earnLedger.has(carry.key)).toBe(true);
  });
});
