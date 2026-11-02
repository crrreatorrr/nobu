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
import { hub, TICKETS_PER_VERSE } from '../src/hub/hubBridge.js';
import { creditedForBase, grantSession, levelEndCalls, readHubStore, readyHub, resetHub, resetWorld } from './helpers.js';
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
    expect(creditedForBase(attempt.id)).toBe(whole);
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

  it('a session sync drops local-only tickets from the wallet so they are not banked or exchanged', async () => {
    sessionStorage.clear();
    resetHub(hub);
    sdk.ticketBalance = { balance: 4, sessionCapLeft: 100, dailyCapLeft: 80 };
    await hub.init();
    expect(hub.inSession).toBe(false);
    const localOnly = wholeTicketsFromRaw(rawTicketsForWhole(12));
    save.data.tickets = localOnly;
    expect(save.data.tickets).toBe(localOnly);
    await hub.exchange(localOnly);
    expect(sdk.calls.exchange).toHaveLength(0);
    expect(sdk.calls.earn).toHaveLength(0);

    grantSession();
    resetHub(hub);
    await hub.init();
    expect(hub.inSession).toBe(true);
    expect(save.data.tickets).toBe(4);
    expect(hub.sessionCapLeft).toBe(100);
    expect(hub.dailyCapLeft).toBe(80);

    const confirm = (exAmount) => Game.prototype._confirmExchange.call({
      exAmount,
      exBusy: false,
      exchangeOpen: true,
      state: 'map',
      _drawMap() {},
    });
    // 4 is below 10 tickets = 1 Verse, so the panel must not send an exchange.
    await confirm(save.data.tickets);
    await confirm(localOnly);
    expect(sdk.calls.exchange).toHaveLength(0);
    expect(sdk.calls.earn).toHaveLength(0);

    resetHub(hub);
    await hub.init();
    expect(save.data.tickets).toBe(4);
    const next = await hub.beginAttempt(2);
    await hub.bankCarry();
    await hub.bank(next.id, wholeTicketsFromRaw(DENOM), true);
    const localOnlyLeft = localOnly - 4;
    expect(sdk.calls.earn.every((call) => call.amount !== localOnly && call.amount !== localOnlyLeft)).toBe(true);
    expect(sdk.calls.exchange).toHaveLength(0);
  });

  it('a server balance of 12 caps the exchange below the old local wallet', async () => {
    sessionStorage.clear();
    resetHub(hub);
    const serverBalance = 12;
    const oldLocal = serverBalance + TICKETS_PER_VERSE;
    sdk.ticketBalance = { balance: serverBalance, sessionCapLeft: 100, dailyCapLeft: 80 };
    await hub.init();
    save.data.tickets = oldLocal;

    grantSession();
    resetHub(hub);
    await hub.init();
    expect(save.data.tickets).toBe(serverBalance);
    expect(sdk.calls.earn).toHaveLength(0);

    const confirm = (exAmount) => Game.prototype._confirmExchange.call({
      exAmount,
      exBusy: false,
      exchangeOpen: true,
      state: 'map',
      _drawMap() {},
    });
    await confirm(oldLocal);
    await confirm(TICKETS_PER_VERSE);
    const sent = sdk.calls.exchange.reduce((sum, call) => sum + call.tickets, 0);
    expect(sent).toBeLessThanOrEqual(serverBalance);
    expect(sdk.calls.exchange.every((call) => call.tickets <= serverBalance && call.tickets !== oldLocal)).toBe(true);
    expect(sdk.calls.earn).toHaveLength(0);
  });

  it('a zero_value rejection does not debit the local wallet', async () => {
    const wallet = 40;
    save.data.tickets = wallet;
    sdk.exchangeError = hubError('zero_value');
    await hub.exchange(TICKETS_PER_VERSE * 2);

    expect(sdk.calls.exchange.map((call) => call.tickets)).toEqual([TICKETS_PER_VERSE * 2]);
    expect(save.data.tickets).toBe(wallet);
    expect(readHubStore().exchange).toMatchObject({
      tickets: TICKETS_PER_VERSE * 2,
      acked: true,
      dropped: true,
    });

    sdk.exchangeError = null;
    await hub.flush();
    await hub.resendExchange();
    expect(save.data.tickets).toBe(wallet);
    expect(sdk.calls.exchange).toHaveLength(1);
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
  it('banks min(earned, allowance) in level-end chunks and carries the rest under its own key', async () => {
    sdk.ticketBalance = { balance: 0, sessionCapLeft: 80, dailyCapLeft: 50 };
    resetHub(hub);
    await hub.init();
    const attempt = await hub.beginAttempt(1);
    const earned = 200;
    await hub.bank(attempt.id, earned, true);

    const allowance = Math.min(80, 50);
    const sent = Math.min(earned, allowance);
    expect(sdk.calls.earn).toEqual(levelEndCalls(attempt.id, sent));
    expect(sdk.calls.earn.every((call) => call.amount <= LEVEL_END_MAX_AMOUNT)).toBe(true);
    expect(sdk.calls.earn.reduce((sum, call) => sum + call.amount, 0)).toBe(sent);
    const carry = readHubStore().carry;
    expect(carry.key).toMatch(UUID_V7);
    expect(carry.key).not.toBe(attempt.id);
    expect(carry.day).toBe(DAY_STAMP);
    expect(carry.amount).toBe(Math.min(CARRY_MAX, earned - sent));
    expect(carry.amount).toBeLessThanOrEqual(CARRY_MAX);
  });

  it('uses the one cap that is present, treats 0 as a hard stop, and uses capLeft only as a fallback', async () => {
    const isolate = async (account) => {
      localStorage.removeItem('nobu-hub-writes-v1');
      localStorage.removeItem('nobu-hub-writes-v2');
      sdk.calls.earn.length = 0;
      sdk.earnLedger.clear();
      sdk.ticketBalance = account;
      resetHub(hub);
      await hub.init();
    };

    await isolate({ balance: 0, dailyCapLeft: 40 });
    let attempt = await hub.beginAttempt(1);
    await hub.bank(attempt.id, 200, true);
    expect(sdk.calls.earn).toEqual(levelEndCalls(attempt.id, 40));

    await isolate({ balance: 0, sessionCapLeft: 30 });
    attempt = await hub.beginAttempt(1);
    await hub.bank(attempt.id, 200, true);
    expect(sdk.calls.earn).toEqual(levelEndCalls(attempt.id, 30));

    await isolate({ balance: 0, sessionCapLeft: 0, dailyCapLeft: 100 });
    attempt = await hub.beginAttempt(1);
    await hub.bank(attempt.id, 50, true);
    expect(sdk.calls.earn).toHaveLength(0);
    expect(readHubStore().carry.amount).toBe(Math.min(CARRY_MAX, 50));

    await isolate({ balance: 0, capLeft: 25 });
    expect(hub.sessionCapLeft).toBeNull();
    expect(hub.dailyCapLeft).toBeNull();
    expect(hub.rejectionRemaining).toBe(25);
    attempt = await hub.beginAttempt(1);
    await hub.bank(attempt.id, 200, true);
    expect(sdk.calls.earn).toEqual(levelEndCalls(attempt.id, 25));
  });

  it('a sync after a lost ack retries the same key and the same amount', async () => {
    sdk.ticketBalance = { balance: 0, sessionCapLeft: 500, dailyCapLeft: 500 };
    resetHub(hub);
    await hub.init();
    const attempt = await hub.beginAttempt(1);
    sdk.loseEarnOnce = true;
    sdk.ticketBalance = { balance: 80, sessionCapLeft: 420, dailyCapLeft: 420 };
    await hub.bank(attempt.id, 80, true);
    expect(readHubStore().earns[attempt.id]).toMatchObject({ amount: 80, acked: false, dropped: false });

    resetHub(hub);
    await hub.init();
    expect(save.data.tickets).toBe(80);
    const chunks = levelEndCalls(attempt.id, 80);
    const sends = sdk.calls.earn.filter((call) => chunks.some((chunk) => chunk.key === call.key));
    expect(sends.filter((call) => call.key === `${attempt.id}:0`).length).toBeGreaterThan(1);
    expect(new Set(sends.map((call) => call.amount))).toEqual(new Set([20]));
    expect(new Set(sends.map((call) => call.key))).toEqual(new Set(chunks.map((chunk) => chunk.key)));
    expect(creditedForBase(attempt.id)).toBe(80);
    expect(sdk.earnLedger.has(attempt.id)).toBe(false);
  });

  it('with no allowance, the earn is chunked at the level-end max and is not retried', async () => {
    expect(hub.sessionCapLeft).toBeNull();
    expect(hub.dailyCapLeft).toBeNull();
    const attempt = await hub.beginAttempt(1);
    const earned = 500;
    await hub.bank(attempt.id, earned, true);
    const calls = levelEndCalls(attempt.id, earned);
    expect(sdk.calls.earn).toEqual(calls);
    expect(calls.every((call) => call.amount <= LEVEL_END_MAX_AMOUNT)).toBe(true);
    expect(creditedEarnTotal()).toBe(earned);
    expect(readHubStore().carry).toBeNull();
    expect(new Set(sdk.calls.earn.map((call) => call.key)).size).toBe(calls.length);
  });

  it('the carry banks at the next level start, before that level earns', async () => {
    sdk.ticketBalance = { balance: 0, sessionCapLeft: LEVEL_END_MAX_AMOUNT, dailyCapLeft: 1000 };
    const first = await hub.beginAttempt(1);
    await hub.bank(first.id, LEVEL_END_MAX_AMOUNT + 40, true);
    const carryKey = readHubStore().carry.key;
    expect(carryKey).not.toBe(first.id);
    expect(readHubStore().carry.amount).toBe(40);

    sdk.ticketBalance = { balance: LEVEL_END_MAX_AMOUNT, sessionCapLeft: 1000, dailyCapLeft: 1000 };
    const next = await hub.beginAttempt(2);
    await hub.bankCarry();
    const carryChunks = levelEndCalls(carryKey, 40);
    expect(carryChunks.map((call) => call.key).every((key) => sdk.earnLedger.has(key))).toBe(true);
    expect(creditedForBase(carryKey)).toBe(40);
    expect(sdk.earnLedger.has(next.id)).toBe(false);

    await hub.bank(next.id, 5, true);
    const keys = sdk.calls.earn.map((call) => call.key);
    expect(keys.indexOf(carryChunks[0].key)).toBeLessThan(keys.indexOf(next.id));
    expect(keys.indexOf(carryChunks[1].key)).toBeLessThan(keys.indexOf(next.id));
  });

  it('a partial carry keeps the remainder on a new key and the two keys do not credit the same tickets', async () => {
    sdk.ticketBalance = { balance: 0, sessionCapLeft: LEVEL_END_MAX_AMOUNT, dailyCapLeft: 1000 };
    const first = await hub.beginAttempt(1);
    await hub.bank(first.id, LEVEL_END_MAX_AMOUNT + 90, true);
    const original = readHubStore().carry.amount;
    expect(original).toBe(Math.min(CARRY_MAX, 90));
    const oldKey = readHubStore().carry.key;
    sdk.ticketBalance = { balance: 0, sessionCapLeft: 40, dailyCapLeft: 200 };

    await hub.bankCarry();
    const remainder = readHubStore().carry;
    expect(remainder.key).not.toBe(oldKey);
    expect(remainder.key).toMatch(UUID_V7);
    expect(remainder.amount).toBe(original - 40);
    expect(creditedForBase(oldKey)).toBe(40);
    expect(sdk.calls.earn.filter((call) => call.key === oldKey || call.key.startsWith(`${oldKey}:`))).toEqual(levelEndCalls(oldKey, 40));
    expect(sdk.earnLedger.has(remainder.key)).toBe(false);

    sdk.ticketBalance = { balance: 0, sessionCapLeft: 500, dailyCapLeft: 500 };
    await hub.bankCarry();
    expect(creditedForBase(remainder.key)).toBe(original - 40);
    expect(creditedForBase(oldKey)).toBe(40);
    expect(creditedForBase(oldKey) + creditedForBase(remainder.key)).toBe(original);
  });

  it('a reload between the partial ack and the re-key does not credit the acked portion again', async () => {
    sdk.ticketBalance = { balance: 0, sessionCapLeft: LEVEL_END_MAX_AMOUNT, dailyCapLeft: 1000 };
    const first = await hub.beginAttempt(1);
    await hub.bank(first.id, LEVEL_END_MAX_AMOUNT + 90, true);
    const original = readHubStore().carry.amount;
    const oldKey = readHubStore().carry.key;
    sdk.ticketBalance = { balance: 0, sessionCapLeft: 40, dailyCapLeft: 200 };
    hub._replaceCarry = () => { throw new Error('reload'); };
    await expect(hub.bankCarry()).rejects.toThrow('reload');
    expect(readHubStore().carry).toMatchObject({ key: oldKey, amount: original });
    expect(readHubStore().earns[oldKey]).toMatchObject({ amount: 40, acked: true });

    sdk.ticketBalance = { balance: 0, sessionCapLeft: 500, dailyCapLeft: 500 };
    delete hub._replaceCarry;
    resetHub(hub);
    await hub.init();
    expect(creditedForBase(oldKey)).toBe(40);
    const paid = levelEndCalls(oldKey, 40);
    expect(sdk.calls.earn.filter((call) => call.key === oldKey || call.key.startsWith(`${oldKey}:`))).toEqual(paid);
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
    sdk.ticketBalance = { balance: 0, sessionCapLeft: LEVEL_END_MAX_AMOUNT, dailyCapLeft: 1000 };
    const first = await hub.beginAttempt(1);
    await hub.bank(first.id, LEVEL_END_MAX_AMOUNT + 90, true);
    const original = readHubStore().carry.amount;
    const oldKey = readHubStore().carry.key;
    sdk.ticketBalance = { balance: 0, sessionCapLeft: 40, dailyCapLeft: 200 };
    sdk.loseEarnOnce = true;

    await hub.bankCarry();
    expect(readHubStore().earns[oldKey].acked).toBe(false);
    expect(readHubStore().carry.key).not.toBe(oldKey);
    expect(readHubStore().carry.amount).toBe(original - 40);

    sdk.ticketBalance = { balance: 0, sessionCapLeft: 500, dailyCapLeft: 500 };
    resetHub(hub);
    await hub.init();
    await hub.bankCarry();
    const carryCredits = [...sdk.earnLedger.entries()]
      .filter(([key]) => key !== first.id)
      .reduce((sum, [, rec]) => sum + rec.amount, 0);
    expect(carryCredits).toBe(original);
    expect(creditedForBase(oldKey)).toBe(40);
  });

  it('two tabs cannot both credit the same carry', async () => {
    const tabA = await import('../src/hub/hubBridge.js?carry-a');
    const tabB = await import('../src/hub/hubBridge.js?carry-b');
    resetHub(tabA.hub);
    resetHub(tabB.hub);
    await readyHub(tabA.hub);
    await readyHub(tabB.hub);
    sdk.ticketBalance = { balance: 0, sessionCapLeft: LEVEL_END_MAX_AMOUNT, dailyCapLeft: 1000 };
    const attempt = await tabA.hub.beginAttempt(1);
    await tabA.hub.bank(attempt.id, LEVEL_END_MAX_AMOUNT + 80, true);
    const original = readHubStore().carry.amount;
    expect(original).toBe(80);
    const before = creditedEarnTotal();
    sdk.ticketBalance = { balance: LEVEL_END_MAX_AMOUNT, sessionCapLeft: 1000, dailyCapLeft: 1000 };

    await Promise.all([tabA.hub.bankCarry(), tabB.hub.bankCarry()]);
    await tabA.hub.bankCarry();
    await tabB.hub.bankCarry();

    const carryCredits = creditedEarnTotal() - before;
    expect(carryCredits).toBeLessThanOrEqual(original);
    expect(carryCredits).toBe(original);
  });

  const WOUND_BACK = '2026-06-14T12:00:00.000Z';

  async function armServerClock(ms) {
    sdk.serverNow = ms;
    resetHub(hub);
    await hub.init();
  }

  async function parkForty() {
    sdk.ticketBalance = { balance: 0, sessionCapLeft: LEVEL_END_MAX_AMOUNT, dailyCapLeft: 1000 };
    const attempt = await hub.beginAttempt(1);
    await hub.bank(attempt.id, LEVEL_END_MAX_AMOUNT + 40, true);
    const carry = readHubStore().carry;
    expect(carry.amount).toBe(40);
    expect(carry.day).toBe(DAY_STAMP);
    sdk.ticketBalance = { balance: LEVEL_END_MAX_AMOUNT, sessionCapLeft: 1000, dailyCapLeft: 1000 };
    return { attempt, carry };
  }

  function carryCredits(attemptId) {
    return [...sdk.earnLedger.entries()]
      .filter(([key]) => key !== attemptId)
      .map(([key, rec]) => [key, rec.amount]);
  }

  it('drops a carry when the server day rolls even if the client clock is wound back to 06-15', async () => {
    await armServerClock(Date.parse(DAY));
    const { attempt, carry } = await parkForty();

    sdk.serverNow = Date.parse(NEXT_DAY);
    Date.now.mockReturnValue(Date.parse(DAY));
    const before = creditedEarnTotal();
    await hub.bankCarry();

    expect(sdk.earnLedger.has(carry.key)).toBe(false);
    expect(sdk.earnLedger.has(`${carry.key}:0`)).toBe(false);
    expect(carryCredits(attempt.id)).toEqual([]);
    expect(creditedEarnTotal()).toBe(before);
    expect(readHubStore().carry).toBeNull();
  });

  it('credits a carry once when the client clock jumps to 06-16 and the server stays on 06-15', async () => {
    await armServerClock(Date.parse(DAY));
    const { attempt, carry } = await parkForty();

    Date.now.mockReturnValue(Date.parse(NEXT_DAY));
    const before = creditedEarnTotal();
    await hub.bankCarry();

    expect(carryCredits(attempt.id)).toEqual(levelEndCalls(carry.key, carry.amount).map((call) => [call.key, call.amount]));
    expect(creditedEarnTotal() - before).toBe(carry.amount);
    expect(readHubStore().earns[carry.key]).toMatchObject({ amount: carry.amount, acked: true, dropped: false });

    await hub.bankCarry();
    expect(carryCredits(attempt.id)).toEqual(levelEndCalls(carry.key, carry.amount).map((call) => [call.key, call.amount]));
    expect(creditedEarnTotal() - before).toBe(carry.amount);
  });

  it('ignores a wound-back or wound-forward client clock when serverTime is missing or 0', async () => {
    async function outcome(serverNow, clientIso) {
      resetWorld();
      Date.now.mockReturnValue(Date.parse(DAY));
      if (serverNow !== undefined) sdk.serverNow = serverNow;
      await readyHub();
      const { attempt, carry } = await parkForty();
      Date.now.mockReturnValue(Date.parse(clientIso));
      const before = creditedEarnTotal();
      await hub.bankCarry();
      await hub.bankCarry();
      return {
        delta: creditedEarnTotal() - before,
        amount: carry.amount,
        credits: carryCredits(attempt.id),
        key: carry.key,
      };
    }

    const clocks = [DAY, WOUND_BACK, NEXT_DAY];
    for (const serverNow of [undefined, 0]) {
      const runs = [];
      for (const clientIso of clocks) runs.push(await outcome(serverNow, clientIso));
      for (const run of runs) {
        expect(run.delta).toBe(run.amount);
        expect(run.credits).toEqual(levelEndCalls(run.key, run.amount).map((call) => [call.key, call.amount]));
      }
      expect(runs.map((run) => run.delta)).toEqual(runs.map(() => runs[0].amount));
      expect(new Set(runs.map((run) => run.delta)).size).toBe(1);
    }
  });

  it('drops a carry when the server day changes between init and bankCarry', async () => {
    await armServerClock(Date.parse(DAY));
    expect(hub.serverDay).toBe(DAY_STAMP);
    const { attempt, carry } = await parkForty();

    // Init's snapshot is still 06-15. Only the getTicketBalance re-read has moved.
    sdk.serverNow = Date.parse(NEXT_DAY);
    Date.now.mockReturnValue(Date.parse(DAY));
    const before = creditedEarnTotal();
    await hub.bankCarry();

    expect(hub.serverDay).toBe('2026-06-16');
    expect(sdk.earnLedger.has(carry.key)).toBe(false);
    expect(sdk.earnLedger.has(`${carry.key}:0`)).toBe(false);
    expect(carryCredits(attempt.id)).toEqual([]);
    expect(creditedEarnTotal()).toBe(before);
    expect(readHubStore().carry).toBeNull();
  });
});
