import { beforeEach, describe, expect, it } from 'vitest';
import { LEVEL_END_MAX_AMOUNT } from '../src/config/tickets.js';
import { hub } from '../src/hub/hubBridge.js';
import {
  HUB_STORAGE_KEY_V1,
  creditedForBase,
  levelEndCalls,
  readHubStore,
  readyHub,
  resetHub,
  resetWorld,
  writeHubStore,
} from './helpers.js';
import { creditedEarnTotal, hubError, sdk } from './sdkState.js';

beforeEach(async () => {
  resetWorld();
  await readyHub();
});

function creditChunk(amount, reason, key) {
  const prev = sdk.earnLedger.get(key);
  if (prev) {
    if (prev.amount !== amount || prev.reason !== reason) {
      throw hubError('idempotency_mismatch', 'Idempotency key was reused with a different request');
    }
    return prev.result;
  }
  let running = 0;
  for (const rec of sdk.earnLedger.values()) running += rec.amount;
  const result = { balance: running + amount, capped: false };
  sdk.earnLedger.set(key, { amount, reason, result });
  return result;
}

describe('level_end chunks', () => {
  it('an amount of 20 keeps key K and makes one call', async () => {
    const attempt = await hub.beginAttempt(1);
    await hub.bank(attempt.id, 20, true);

    expect(sdk.calls.earn).toEqual([
      { amount: 20, reason: 'level_end', key: attempt.id },
    ]);
    expect(creditedEarnTotal()).toBe(20);
    expect(sdk.earnLedger.size).toBe(1);
  });

  it('an amount of 21 is K:0=20 and K:1=1', async () => {
    const attempt = await hub.beginAttempt(1);
    await hub.bank(attempt.id, 21, true);

    expect(sdk.calls.earn).toEqual([
      { amount: 20, reason: 'level_end', key: `${attempt.id}:0` },
      { amount: 1, reason: 'level_end', key: `${attempt.id}:1` },
    ]);
    expect(creditedEarnTotal()).toBe(21);
    expect(sdk.earnLedger.has(attempt.id)).toBe(false);
  });

  it('an amount of 50 is 20/20/10 and the total credited is 50', async () => {
    const attempt = await hub.beginAttempt(1);
    await hub.bank(attempt.id, 50, true);

    expect(sdk.calls.earn).toEqual([
      { amount: 20, reason: 'level_end', key: `${attempt.id}:0` },
      { amount: 20, reason: 'level_end', key: `${attempt.id}:1` },
      { amount: 10, reason: 'level_end', key: `${attempt.id}:2` },
    ]);
    expect(creditedEarnTotal()).toBe(50);
    expect(readHubStore().earns[attempt.id].amount).toBe(50);
    expect(readHubStore().earns[attempt.id].chunkSize).toBe(LEVEL_END_MAX_AMOUNT);
  });

  it('a resend after reload reuses the same chunk keys and does not credit twice', async () => {
    const attempt = await hub.beginAttempt(1);
    await hub.bank(attempt.id, 50, true);
    const firstKeys = sdk.calls.earn.map((call) => call.key);
    expect(creditedEarnTotal()).toBe(50);

    resetHub(hub);
    await hub.init();
    await hub.bank(attempt.id, 50, true);
    await hub.flush();

    expect(creditedEarnTotal()).toBe(50);
    expect(new Set(sdk.calls.earn.map((call) => call.key))).toEqual(new Set(firstKeys));
    expect(sdk.calls.earn.every((call) => firstKeys.includes(call.key))).toBe(true);
    expect(sdk.earnLedger.size).toBe(3);
  });

  it('replaying the same chunk keys credits nothing extra', async () => {
    const attempt = await hub.beginAttempt(1);
    sdk.earnImpl = (amount, reason, key) => creditChunk(amount, reason, key);
    await hub.bank(attempt.id, 50, true);
    const before = creditedEarnTotal();
    const keys = sdk.calls.earn.map((call) => call.key);

    for (const call of [...sdk.calls.earn]) {
      await hub.sdk.earnTickets(call.amount, call.reason, call.key);
    }
    resetHub(hub);
    await hub.init();

    expect(creditedEarnTotal()).toBe(before);
    expect(creditedEarnTotal()).toBe(50);
    expect(new Set(sdk.earnLedger.keys())).toEqual(new Set(keys));
  });

  it('a cap on K:1 holds later chunks, keeps K:0, and never credits more than the original amount', async () => {
    const attempt = await hub.beginAttempt(1);
    sdk.earnImpl = (amount, reason, key) => {
      if (key === `${attempt.id}:1`) throw hubError('earn_cap', 'cap');
      return creditChunk(amount, reason, key);
    };
    await hub.bank(attempt.id, 50, true);

    expect(sdk.calls.earn.map((call) => call.key)).toEqual([
      `${attempt.id}:0`,
      `${attempt.id}:1`,
    ]);
    expect(creditedEarnTotal()).toBe(20);
    expect(readHubStore().earns[attempt.id]).toMatchObject({ amount: 50, halted: true, credited: 20 });
    expect(readHubStore().carry.amount).toBe(30);
    const tailKey = readHubStore().carry.key;
    expect(tailKey).not.toBe(attempt.id);
    expect(tailKey).not.toBe(`${attempt.id}:0`);
    expect(sdk.calls.earn.filter((call) => call.key === `${attempt.id}:2`)).toHaveLength(0);

    sdk.ticketBalance = { balance: 0, sessionCapLeft: 0, dailyCapLeft: 0 };
    await hub.flush();
    await hub.flush();
    expect(readHubStore().carry.amount).toBe(30);
    expect(readHubStore().earns[attempt.id].parked).toBe(30);
    expect(creditedEarnTotal()).toBe(20);
    expect(sdk.calls.earn.filter((call) => call.key === `${attempt.id}:0`)).toHaveLength(1);

    sdk.earnImpl = (amount, reason, key) => creditChunk(amount, reason, key);
    sdk.ticketBalance = { balance: 0, sessionCapLeft: 1000, dailyCapLeft: 1000 };
    await hub.bankCarry();
    await hub.flush();
    expect(creditedEarnTotal()).toBe(50);
    expect(creditedForBase(attempt.id)).toBe(20);
    expect(creditedForBase(tailKey)).toBe(30);
    expect(sdk.earnLedger.has(`${attempt.id}:0`)).toBe(true);
    expect(sdk.calls.earn.filter((call) => call.key === `${attempt.id}:0`).every((call) => call.amount === 20)).toBe(true);
  });

  it('a carry over 20 is chunked the same way', async () => {
    sdk.ticketBalance = { balance: 0, sessionCapLeft: 0, dailyCapLeft: 1000 };
    const attempt = await hub.beginAttempt(1);
    await hub.bank(attempt.id, 50, true);
    expect(sdk.calls.earn).toHaveLength(0);
    const carry = readHubStore().carry;
    expect(carry.amount).toBe(50);

    sdk.ticketBalance = { balance: 0, sessionCapLeft: 1000, dailyCapLeft: 1000 };
    await hub.bankCarry();
    expect(sdk.calls.earn).toEqual([
      { amount: 20, reason: 'level_end', key: `${carry.key}:0` },
      { amount: 20, reason: 'level_end', key: `${carry.key}:1` },
      { amount: 10, reason: 'level_end', key: `${carry.key}:2` },
    ]);
    expect(creditedEarnTotal()).toBe(50);
    expect(sdk.earnLedger.has(carry.key)).toBe(false);
  });

  it('a reload mid-sequence resumes the same chunk keys and does not double-credit', async () => {
    const attempt = await hub.beginAttempt(1);
    sdk.earnImpl = (amount, reason, key) => {
      if (key === `${attempt.id}:1`) throw hubError('rpc_failed', 'lost');
      return creditChunk(amount, reason, key);
    };
    await hub.bank(attempt.id, 50, true);
    expect(readHubStore().earns[attempt.id].credited).toBe(20);
    expect(sdk.calls.earn.map((call) => [call.key, call.amount])).toEqual([
      [`${attempt.id}:0`, 20],
      [`${attempt.id}:1`, 20],
    ]);

    sdk.earnImpl = (amount, reason, key) => creditChunk(amount, reason, key);
    const sent = sdk.calls.earn.length;
    resetHub(hub);
    await hub.init();

    expect(sdk.calls.earn.slice(sent).map((call) => [call.key, call.amount])).toEqual([
      [`${attempt.id}:1`, 20],
      [`${attempt.id}:2`, 10],
    ]);
    expect(creditedEarnTotal()).toBe(50);
    expect([...sdk.earnLedger.keys()].sort()).toEqual([
      `${attempt.id}:0`,
      `${attempt.id}:1`,
      `${attempt.id}:2`,
    ].sort());
  });

  it('two tabs flushing the same level_end chunks credit each key once', async () => {
    const tabA = await import('../src/hub/hubBridge.js?chunk-tab-a');
    const tabB = await import('../src/hub/hubBridge.js?chunk-tab-b');
    resetHub(tabA.hub);
    resetHub(tabB.hub);
    await readyHub(tabA.hub);
    await readyHub(tabB.hub);
    const attempt = await tabA.hub.beginAttempt(1);

    await Promise.all([
      tabA.hub.bank(attempt.id, 50, true),
      tabB.hub.bank(attempt.id, 50, true),
    ]);
    await tabA.hub.flush();
    await tabB.hub.flush();

    expect(creditedEarnTotal()).toBe(50);
    expect(sdk.earnLedger.get(`${attempt.id}:0`).amount).toBe(20);
    expect(sdk.earnLedger.get(`${attempt.id}:1`).amount).toBe(20);
    expect(sdk.earnLedger.get(`${attempt.id}:2`).amount).toBe(10);
    expect(sdk.earnLedger.size).toBe(3);
  });

  it('unknown_reason is terminal: no retry and no re-key', async () => {
    const attempt = await hub.beginAttempt(1);
    sdk.earnError = hubError('unknown_reason', 'unknown_reason from hub');
    await hub.bank(attempt.id, 30, true);

    const row = readHubStore().earns[attempt.id];
    expect(row).toMatchObject({ amount: 30, acked: true, dropped: true });
    expect(creditedEarnTotal()).toBe(0);
    const keys = sdk.calls.earn.map((call) => call.key);
    expect(keys).toEqual([`${attempt.id}:0`]);

    sdk.earnError = null;
    const sends = sdk.calls.earn.length;
    await hub.flush();
    const sameEarn = sdk.calls.earn.filter((call) => call.key === attempt.id || call.key.startsWith(`${attempt.id}:`));
    expect(sameEarn).toHaveLength(1);
    expect(sdk.calls.earn.filter((call) => call.key === attempt.id || call.key.startsWith(`${attempt.id}:`)).length).toBe(sends);
    expect(creditedEarnTotal()).toBeLessThanOrEqual(30);
    expect(sdk.calls.earn.some((call) => call.key === `${attempt.id}:1`)).toBe(false);
  });

  it('discards nobu-hub-writes-v1 rows with a warning and never sends them', async () => {
    const staleId = 'stale-attempt';
    localStorage.setItem(HUB_STORAGE_KEY_V1, JSON.stringify({
      v: 1,
      attempts: { [staleId]: { level: '1' } },
      earns: { [staleId]: { amount: 40, acked: false, dropped: false, covers: [] } },
      relics: {},
      held: {},
      carry: { key: 'stale-carry', amount: 25, day: '2026-06-15' },
      carryClearedKey: null,
      exchange: null,
      receipts: [],
    }));
    console.warn.mockClear();
    resetHub(hub);
    await hub.init();
    await hub.flush();

    expect(localStorage.getItem(HUB_STORAGE_KEY_V1)).toBeNull();
    const warned = console.warn.mock.calls.some((args) => args.map(String).join(' ').includes('discarded nobu-hub-writes-v1'));
    expect(warned).toBe(true);
    expect(sdk.calls.earn.some((call) => (
      call.key === staleId
      || call.key.startsWith(`${staleId}:`)
      || call.key === 'stale-carry'
      || call.key.startsWith('stale-carry:')
    ))).toBe(false);
    expect(readHubStore()?.earns?.[staleId]).toBeUndefined();
    expect(readHubStore()?.carry?.key).not.toBe('stale-carry');
  });

  it('keeps an in-flight earn on its stored chunk size when that differs from the cap', async () => {
    const id = 'sized-attempt';
    writeHubStore({
      v: 1,
      attempts: { [id]: { level: '1' } },
      earns: {
        [id]: { amount: 50, acked: false, dropped: false, covers: [], chunkSize: 25 },
      },
      relics: {},
      held: {},
      carry: null,
      carryClearedKey: null,
      carryQueue: [],
      carryApplied: {},
      exchange: null,
      receipts: [],
    });
    resetHub(hub);
    await hub.init();

    expect(sdk.calls.earn).toEqual([
      { amount: 25, reason: 'level_end', key: `${id}:0` },
      { amount: 25, reason: 'level_end', key: `${id}:1` },
    ]);
    expect(creditedEarnTotal()).toBe(50);
    expect(readHubStore().earns[id].chunkSize).toBe(25);
    expect(LEVEL_END_MAX_AMOUNT).toBe(20);

    const keys = sdk.calls.earn.map((call) => call.key);
    resetHub(hub);
    await hub.init();
    await hub.flush();
    expect(creditedEarnTotal()).toBe(50);
    expect(new Set(sdk.calls.earn.map((call) => call.key))).toEqual(new Set(keys));
    expect(sdk.earnLedger.size).toBe(2);
  });

  it('a busy carry is queued, applied once, and never lost or double-paid', async () => {
    sdk.ticketBalance = { balance: 0, sessionCapLeft: 0, dailyCapLeft: 0 };
    const first = await hub.beginAttempt(1);
    await hub.bank(first.id, 10, true);
    expect(sdk.calls.earn).toHaveLength(0);
    expect(readHubStore().carry.amount).toBe(10);
    const carryKey = readHubStore().carry.key;

    sdk.ticketBalance = { balance: 0, sessionCapLeft: 1000, dailyCapLeft: 1000 };
    sdk.earnError = hubError('rpc_failed', 'socket hang up');
    await hub.bankCarry();
    expect(readHubStore().earns[carryKey]).toMatchObject({ amount: 10, acked: false, dropped: false });

    console.warn.mockClear();
    sdk.ticketBalance = { balance: 0, sessionCapLeft: 0, dailyCapLeft: 0 };
    const second = await hub.beginAttempt(2);
    await hub.bank(second.id, 12, true);
    const discarded = console.warn.mock.calls.some((args) => String(args[0]).includes('discarded tickets'));
    expect(discarded).toBe(false);
    expect(readHubStore().carry.amount).toBe(10);
    const queued = readHubStore().carryQueue.reduce((sum, entry) => sum + entry.amount, 0);
    expect(queued).toBeGreaterThanOrEqual(12);

    sdk.earnError = null;
    sdk.ticketBalance = { balance: 0, sessionCapLeft: 1000, dailyCapLeft: 1000 };
    await hub.flush();
    const afterApply = readHubStore().carry.amount;
    expect(afterApply).toBe(12);
    await hub.bankCarry();
    await hub.flush();
    expect(creditedEarnTotal()).toBe(22);
    expect(creditedForBase(carryKey)).toBe(10);
    await hub.bankCarry();
    expect(creditedEarnTotal()).toBe(22);
  });

  it('two tabs halting on the same tail park it once and pay it once', async () => {
    const tabA = await import('../src/hub/hubBridge.js?park-tab-a');
    const tabB = await import('../src/hub/hubBridge.js?park-tab-b');
    resetHub(tabA.hub);
    resetHub(tabB.hub);
    await readyHub(tabA.hub);
    await readyHub(tabB.hub);
    const attempt = await tabA.hub.beginAttempt(1);
    const store = readHubStore();
    store.earns[attempt.id] = {
      amount: 50,
      acked: false,
      dropped: false,
      covers: [],
      chunkSize: 20,
      credited: 20,
      halted: true,
    };
    writeHubStore(store);

    await Promise.all([
      tabA.hub.bank(attempt.id, 50, true),
      tabB.hub.bank(attempt.id, 50, true),
    ]);

    expect(readHubStore().carry.amount).toBe(30);
    expect(readHubStore().earns[attempt.id].parked).toBe(30);

    await tabA.hub.bankCarry();
    await tabB.hub.bankCarry();
    await tabA.hub.flush();
    expect(creditedEarnTotal()).toBe(30);
    const tailKey = readHubStore().earns && Object.keys(readHubStore().earns).find((key) => key !== attempt.id);
    expect(creditedForBase(tailKey)).toBe(30);
  });
});
