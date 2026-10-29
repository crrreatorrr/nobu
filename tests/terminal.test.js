import { beforeEach, describe, expect, it } from 'vitest';
import { save } from '../src/core/save.js';
import { hub } from '../src/hub/hubBridge.js';
import { readHubStore, readyHub, resetWorld } from './helpers.js';
import { creditedEarnTotal, hubError, sdk } from './sdkState.js';

const TERMINAL = [
  'idempotency_mismatch',
  'amount_over_rule',
  'verse_cap',
  'session_ticket_cap',
  'earn_cap',
  'tickets_cap',
];

const TRANSPORT = ['rpc_failed', 'rejected', 'network_error'];

beforeEach(async () => {
  resetWorld();
  await readyHub();
});

describe('case 7: terminal errors stop, transport errors stay queued', () => {
  it.each(TERMINAL)('earn %s is acked as dropped and is not retried or credited', async (code) => {
    const attempt = await hub.beginAttempt(1);
    sdk.earnError = hubError(code, `${code} from hub`);
    await hub.bank(attempt.id, 30, true);

    expect(readHubStore().earns[attempt.id]).toMatchObject({ amount: 30, acked: true, dropped: true });
    expect(creditedEarnTotal()).toBe(0);
    const attemptSends = sdk.calls.earn.filter((call) => call.key === attempt.id).length;
    expect(attemptSends).toBeGreaterThan(0);

    sdk.earnError = null;
    await hub.flush();
    expect(sdk.calls.earn.filter((call) => call.key === attempt.id)).toHaveLength(attemptSends);
    expect(creditedEarnTotal()).toBeLessThanOrEqual(30);
  });

  it('banking the same attempt again after a terminal drop does not credit the tickets twice', async () => {
    const attempt = await hub.beginAttempt(1);
    sdk.earnError = hubError('verse_cap');
    await hub.bank(attempt.id, 30, true);
    sdk.earnError = null;
    await hub.bank(attempt.id, 30, true);
    await hub.bankCarry();
    expect(creditedEarnTotal()).toBeLessThanOrEqual(30);
  });

  it.each(TRANSPORT)('earn %s stays queued and a later send credits the same key once', async (code) => {
    const attempt = await hub.beginAttempt(1);
    sdk.earnError = hubError(code, 'transport');
    await hub.bank(attempt.id, 12, true);

    expect(readHubStore().earns[attempt.id]).toMatchObject({ amount: 12, acked: false, dropped: false });
    expect(creditedEarnTotal()).toBe(0);
    expect(sdk.calls.earn.every((call) => call.key === attempt.id && call.amount === 12 && call.reason === 'level_end')).toBe(true);

    sdk.earnError = null;
    await hub.flush();
    expect(creditedEarnTotal()).toBe(12);
    expect(sdk.earnLedger.size).toBe(1);
    expect(sdk.calls.earn.every((call) => call.key === attempt.id && call.amount === 12)).toBe(true);
    expect(readHubStore().earns[attempt.id].acked).toBe(true);
  });

  it('rpc_failed whose message mentions verse_cap still stays queued', async () => {
    const attempt = await hub.beginAttempt(1);
    sdk.earnError = hubError('rpc_failed', JSON.stringify({ error: 'verse_cap', message: 'daily cap' }));
    await hub.bank(attempt.id, 8, true);
    expect(readHubStore().earns[attempt.id]).toMatchObject({ acked: false, dropped: false });

    sdk.earnError = null;
    await hub.flush();
    expect(creditedEarnTotal()).toBe(8);
  });

  it('an error with no code stays queued', async () => {
    const attempt = await hub.beginAttempt(1);
    sdk.earnError = new Error('Failed to fetch');
    await hub.bank(attempt.id, 9, true);
    expect(readHubStore().earns[attempt.id]).toMatchObject({ acked: false, dropped: false });
    sdk.earnError = null;
    await hub.flush();
    expect(creditedEarnTotal()).toBe(9);
  });

  it('a terminal relic error is not retried', async () => {
    const attempt = await hub.beginAttempt(3);
    sdk.eventError = hubError('amount_over_rule');
    await hub.reportCone(attempt.id, true);
    const key = readHubStore().relics[attempt.id].key;
    expect(readHubStore().relics[attempt.id]).toMatchObject({ key, acked: true, dropped: true });
    expect(sdk.relicGrants).toBe(0);
    const sends = sdk.calls.event.length;

    sdk.eventError = null;
    await hub.flush();
    await hub.reportCone(attempt.id, true);
    expect(sdk.calls.event).toHaveLength(sends);
    expect(sdk.relicGrants).toBe(0);
  });

  it('a terminal exchange error does not debit and is not retried', async () => {
    save.data.tickets = 80;
    sdk.exchangeError = hubError('verse_cap', 'Daily Verse cap reached');
    await hub.exchange(40);

    expect(readHubStore().exchange).toMatchObject({ tickets: 40, acked: true, dropped: true });
    expect(save.data.tickets).toBe(80);
    expect(hub.view().pending).toBeNull();
    const sends = sdk.calls.exchange.length;

    sdk.exchangeError = null;
    await hub.resendExchange();
    await hub.flush();
    expect(sdk.calls.exchange).toHaveLength(sends);
    expect(save.data.tickets).toBe(80);
  });

});
