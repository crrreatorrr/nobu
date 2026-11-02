import { beforeEach, describe, expect, it } from 'vitest';
import { save } from '../src/core/save.js';
import { levelEndCalls, readHubStore, readyHub, resetHub, resetWorld } from './helpers.js';
import { creditedEarnTotal, sdk } from './sdkState.js';

let tabA;
let tabB;

beforeEach(async () => {
  resetWorld();
  tabA ??= await import('../src/hub/hubBridge.js?tab=a');
  tabB ??= await import('../src/hub/hubBridge.js?tab=b');
  resetHub(tabA.hub);
  resetHub(tabB.hub);
  expect(tabA.hub).not.toBe(tabB.hub);
  await readyHub(tabA.hub);
  await readyHub(tabB.hub);
});

describe('case 3: two tabs share the key store', () => {
  it('interleaved attempt and earn writes keep every key and do not double-credit', async () => {
    const [left, right] = await Promise.all([
      (async () => {
        const attempt = await tabA.hub.beginAttempt(1);
        await tabA.hub.bank(attempt.id, 40, attempt.ok);
        return attempt;
      })(),
      (async () => {
        const attempt = await tabB.hub.beginAttempt(2);
        await tabB.hub.bank(attempt.id, 15, attempt.ok);
        return attempt;
      })(),
    ]);

    const store = readHubStore();
    expect(store.attempts[left.id]).toEqual({ level: '1' });
    expect(store.attempts[right.id]).toEqual({ level: '2' });
    expect(store.earns[left.id].amount).toBe(40);
    expect(store.earns[right.id].amount).toBe(15);
    expect(creditedEarnTotal()).toBe(55);
    expect(sdk.earnLedger.size).toBe(levelEndCalls(left.id, 40).length + 1);

    const byKey = new Map();
    for (const call of sdk.calls.earn) {
      const list = byKey.get(call.key) ?? [];
      list.push(call.amount);
      byKey.set(call.key, list);
    }
    expect([...byKey.keys()].sort()).toEqual([...levelEndCalls(left.id, 40).map((call) => call.key), right.id].sort());
    expect(byKey.get(`${left.id}:0`).every((amount) => amount === 20)).toBe(true);
    expect(byKey.get(`${left.id}:1`).every((amount) => amount === 20)).toBe(true);
    expect(byKey.get(right.id).every((amount) => amount === 15)).toBe(true);
  });

  it('two tabs banking one attempt credit that key once', async () => {
    const attempt = await tabA.hub.beginAttempt(1);
    await Promise.all([
      tabA.hub.bank(attempt.id, 40, true),
      tabB.hub.bank(attempt.id, 40, true),
    ]);

    expect(Object.keys(readHubStore().earns)).toEqual([attempt.id]);
    expect(readHubStore().earns[attempt.id].amount).toBe(40);
    expect(creditedEarnTotal()).toBe(40);
    expect(sdk.earnLedger.size).toBe(2);
    expect(sdk.calls.earn.every((call) => (
      (call.key === `${attempt.id}:0` || call.key === `${attempt.id}:1`) && call.amount === 20
    ))).toBe(true);
  });

  it('two tabs opening an exchange produce one receipt and one debit', async () => {
    save.data.tickets = 100;
    await Promise.all([
      tabA.hub.exchange(30),
      tabB.hub.exchange(50),
    ]);

    const store = readHubStore();
    expect(store.exchange.acked).toBe(true);
    expect(sdk.exchangeLedger.size).toBe(1);
    const [only] = [...sdk.exchangeLedger.keys()];
    expect(store.exchange.id).toBe(only);
    expect(sdk.calls.exchange.every((call) => call.key === only)).toBe(true);
    const debited = store.exchange.tickets;
    expect([30, 50]).toContain(debited);
    expect(save.data.tickets).toBe(100 - debited);
    expect(store.receipts).toHaveLength(1);
  });
});
