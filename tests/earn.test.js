import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../src/game/game.js';
import { Session } from '../src/game/session.js';
import { hub } from '../src/hub/hubBridge.js';
import { save, START_LIVES } from '../src/core/save.js';
import { captureBank, creditedForBase, levelEndCalls, readHubStore, readyHub, resetHub, resetWorld } from './helpers.js';
import { CARRY_MAX, rawTicketsForWhole } from '../src/config/tickets.js';
import { creditedEarnTotal, hubError, sdk } from './sdkState.js';

beforeEach(async () => {
  resetWorld();
  await readyHub();
});

function bareSession(attempt) {
  const session = Object.create(Session.prototype);
  session.game = {
    ui: { setHud() {}, banner() {}, fade: () => Promise.resolve() },
    player: { spawnAt() {}, ride: null },
    camera: { snap() {} },
    mask: { snapTo() {} },
    fx: { clear() {} },
  };
  session.level = 1;
  session.levelTickets = 0;
  session.fieldRaw = 0;
  session.coconutRaw = 0;
  session.attemptId = attempt.id;
  session.attemptDurable = attempt.ok;
  session.stage = { entities: [], track: null };
  session.tickets = { restoreAfter() {}, clearFlying() {} };
  session.projectiles = { clear() {} };
  session.deathsAtCp = 0;
  session.phase = 'level';
  session.trial = false;
  session.cp = {
    pos: { clone() { return {}; } },
    facing: 0,
    seq: 0,
    tickets: save.data.tickets,
    levelTickets: 0,
  };
  session._pushHud = () => {};
  session.setMask = () => {};
  return session;
}

describe('case 1: one attempt produces one earn key', () => {
  it('mints one level_end key at attempt start and banks that amount once', async () => {
    const attempt = await hub.beginAttempt(1);
    expect(attempt.ok).toBe(true);
    expect(readHubStore().attempts[attempt.id]).toEqual({ level: '1' });

    await hub.bank(attempt.id, 18, attempt.ok);

    expect(Object.keys(readHubStore().earns)).toEqual([attempt.id]);
    expect(sdk.calls.earn).toEqual([{ amount: 18, reason: 'level_end', key: attempt.id }]);
    expect(creditedEarnTotal()).toBe(18);
    expect(readHubStore().earns[attempt.id].acked).toBe(true);
  });

  it('a resend after rpc_failed uses the same key and the same amount', async () => {
    const attempt = await hub.beginAttempt(1);
    sdk.earnError = hubError('rpc_failed', 'socket hang up');
    await hub.bank(attempt.id, 40, true);
    expect(sdk.calls.earn.length).toBeGreaterThan(0);
    expect(creditedEarnTotal()).toBe(0);
    expect(readHubStore().earns[attempt.id]).toMatchObject({ amount: 40, acked: false, dropped: false });

    sdk.earnError = null;
    // A later clear in the same attempt may see a different haul. The key stays put.
    await hub.bank(attempt.id, 99, true);

    const chunks = levelEndCalls(attempt.id, 40);
    expect(sdk.calls.earn.every((call) => chunks.some((chunk) => chunk.key === call.key && chunk.amount === call.amount && chunk.reason === call.reason))).toBe(true);
    expect(sdk.calls.earn.some((call) => call.key === attempt.id || call.amount === 99)).toBe(false);
    expect(creditedEarnTotal()).toBe(40);
    expect(sdk.earnLedger.size).toBe(chunks.length);
  });

  it('a reload mid-attempt keeps the attempt key and does not send an earn', async () => {
    const attempt = await hub.beginAttempt(2);
    expect(sdk.calls.earn).toHaveLength(0);

    resetHub(hub);
    await hub.init();
    expect(sdk.calls.earn).toHaveLength(0);
    expect(readHubStore().attempts[attempt.id]).toEqual({ level: '2' });

    const restarted = await hub.beginAttempt(2);
    expect(restarted.id).not.toBe(attempt.id);
    expect(Object.keys(readHubStore().attempts).sort()).toEqual([attempt.id, restarted.id].sort());
    expect(sdk.calls.earn).toHaveLength(0);
    expect(creditedEarnTotal()).toBe(0);
  });

  it('death and respawn keep the same attempt and bank the rolled-back haul', async () => {
    const attempt = await hub.beginAttempt(1);
    const session = bareSession(attempt);
    save.data.tickets = 10;
    session.fieldRaw = rawTicketsForWhole(10);
    session.coconutRaw = 0;
    session.levelTickets = 10;
    session.cp.tickets = 10;
    session.cp.levelTickets = 10;
    session.cp.fieldRaw = rawTicketsForWhole(10);
    session.cp.coconutRaw = 0;
    session.addTickets(rawTicketsForWhole(50));
    expect(session.levelTickets).toBe(60);

    save.data.lives -= 1;
    session.respawn();

    expect(session.attemptId).toBe(attempt.id);
    expect(Object.keys(readHubStore().attempts)).toEqual([attempt.id]);
    expect(session.levelTickets).toBe(10);
    expect(save.data.tickets).toBe(10);

    await hub.bank(session.attemptId, session.levelTickets, session.attemptDurable);
    expect(sdk.calls.earn).toEqual([{ amount: 10, reason: 'level_end', key: attempt.id }]);
    expect(creditedEarnTotal()).toBe(10);
  });

  it('levelCleared then bonusCleared on one attempt cannot credit twice', async () => {
    const attempt = await hub.beginAttempt(1);
    const tracker = captureBank(hub);
    const session = {
      level: 1,
      levelTickets: 25,
      attemptId: attempt.id,
      attemptDurable: true,
      stats: { tickets: 25, broken: 0, breakables: 0, dogs: 0, dogsTotal: 0 },
    };
    try {
      Game.prototype.levelCleared.call({ playCutscene() {} }, session);
      await Promise.all(tracker.pending);
      tracker.pending.length = 0;
      session.levelTickets = 40;
      session.stats = { tickets: 40, broken: 0, breakables: 0, dogs: 0, dogsTotal: 0 };
      Game.prototype.bonusCleared.call({ _showComplete() {} }, session);
      await Promise.all(tracker.pending);
    } finally {
      tracker.restore();
    }

    // The bonus clear keeps the attempt key and the first amount. The extra 15
    // is a carry with its own key, credited once at the next bankCarry, not added
    // onto the attempt and not summed with it.
    expect(readHubStore().earns[attempt.id]).toMatchObject({ amount: 25, acked: true });
    expect(sdk.calls.earn.filter((call) => call.key === attempt.id || call.key.startsWith(`${attempt.id}:`))).toEqual(levelEndCalls(attempt.id, 25));
    expect(creditedEarnTotal()).toBe(25);
    const carry = readHubStore().carry;
    expect(carry.amount).toBe(15);
    expect(carry.key).not.toBe(attempt.id);

    await hub.bankCarry();
    expect(creditedEarnTotal()).toBe(40);
    expect(sdk.earnLedger.get(carry.key).amount).toBe(15);
    expect(creditedForBase(attempt.id)).toBe(25);
    expect(save.data.lives).toBe(START_LIVES);
    expect(CARRY_MAX).toBeGreaterThan(15);
  });

  it('store writes merge, so a second attempt does not replace the first earn', async () => {
    const first = await hub.beginAttempt(1);
    await hub.bank(first.id, 11, true);
    const second = await hub.beginAttempt(3);
    await hub.bank(second.id, 7, true);

    const store = readHubStore();
    expect(store.earns[first.id].amount).toBe(11);
    expect(store.earns[second.id].amount).toBe(7);
    expect(store.attempts[first.id].level).toBe('1');
    expect(store.attempts[second.id].level).toBe('3');
    expect(creditedEarnTotal()).toBe(18);
  });

  it('a persist failure sends nothing', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    try {
      const attempt = await hub.beginAttempt(1);
      expect(attempt.ok).toBe(false);
      await hub.bank(attempt.id, 15, attempt.ok);
      expect(sdk.calls.earn).toHaveLength(0);
      expect(creditedEarnTotal()).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });

  it('a persist failure while saving the earn key sends nothing', async () => {
    const attempt = await hub.beginAttempt(1);
    expect(attempt.ok).toBe(true);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    try {
      await hub.bank(attempt.id, 15, true);
      expect(sdk.calls.earn).toHaveLength(0);
      expect(readHubStore().earns?.[attempt.id]).toBeUndefined();
      expect(creditedEarnTotal()).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
