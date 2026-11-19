// A chunked earn reads tickets.balance once after its chunks, not once per chunk. The other read
// is the allowance check before sending. (It was 11 reads for a 200-Ticket clear.)
import { beforeEach, expect, it } from 'vitest';
import { hub } from '../src/hub/hubBridge.js';
import { save } from '../src/core/save.js';
import { readyHub, resetWorld } from './helpers.js';
import { sdk } from './sdkState.js';

let reads;
beforeEach(async () => {
  resetWorld();
  reads = 0;
  sdk.ticketBalance = () => { reads += 1; return { balance: [...sdk.earnLedger.values()].reduce((n, r) => n + r.amount, 0) }; };
  await readyHub();
  reads = 0;
});

it('a 200-Ticket clear sends 10 chunks and reads the balance twice, not 11 times', async () => {
  const attempt = await hub.beginAttempt(1);
  await hub.bank(attempt.id, 200, true);
  expect(sdk.calls.earn).toHaveLength(10);
  expect(reads).toBe(2);
  expect(save.data.tickets).toBe(200);
  expect(hub.serverBalance).toBe(200);
});

it('a one-chunk clear reads it twice as before', async () => {
  const attempt = await hub.beginAttempt(1);
  await hub.bank(attempt.id, 15, true);
  expect(sdk.calls.earn).toHaveLength(1);
  expect(reads).toBe(2);
});

it('caps an earn result carries are not spent a second time', async () => {
  const attempt = await hub.beginAttempt(1);
  sdk.earnImpl = (amount, reason, key) => {
    const prev = sdk.earnLedger.get(key);
    if (prev) return prev.result;
    const spent = [...sdk.earnLedger.values()].reduce((n, r) => n + r.amount, 0) + amount;
    const result = { balance: spent, capped: false, sessionCapLeft: 500 - spent };
    sdk.earnLedger.set(key, { amount, reason, result });
    return result;
  };
  sdk.ticketBalance = () => { throw new Error('balance down'); };
  await hub.bank(attempt.id, 60, true);
  expect(sdk.calls.earn).toHaveLength(3);
  expect(hub.sessionCapLeft).toBe(440);
});
