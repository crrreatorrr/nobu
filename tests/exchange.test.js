import { beforeEach, describe, expect, it } from 'vitest';
import { Game } from '../src/game/game.js';
import { save } from '../src/core/save.js';
import { hub } from '../src/hub/hubBridge.js';
import { readHubStore, readyHub, resetHub, resetWorld } from './helpers.js';
import { sdk } from './sdkState.js';

beforeEach(async () => {
  resetWorld();
  await readyHub();
});

function panel(exAmount = 10, exBusy = false) {
  return Game.prototype._exchangeHtml.call({ exAmount, exBusy });
}

function rememberExchange(response, serverDebit) {
  const server = { tickets: save.data.tickets };
  sdk.exchangeResponder = (tickets, key) => {
    server.tickets -= serverDebit ?? tickets;
    return response;
  };
  return server;
}

describe('case 4: one exchange intent, one receipt', () => {
  it('a lost response and a reload still produce one receipt and one debit', async () => {
    save.data.tickets = 100;
    sdk.loseExchangeOnce = true;
    sdk.exchangeResponder = () => ({
      receiptId: 'rcpt-lost',
      ticketsDebited: 40,
      verseCredited: 4,
    });

    await hub.exchange(40);
    const slot = readHubStore().exchange;
    expect(slot.acked).toBe(false);
    expect(slot.dropped).toBe(false);
    expect(save.data.tickets).toBe(100);
    expect(panel(40)).toContain('ESC close');
    expect(panel(40)).not.toContain('ENTER exchange');

    resetHub(hub);
    await hub.init();

    expect(readHubStore().exchange.acked).toBe(true);
    expect(readHubStore().receipts).toEqual(['rcpt-lost']);
    expect(save.data.tickets).toBe(60);
    expect(sdk.calls.exchange.every((call) => call.key === slot.id && call.tickets === 40)).toBe(true);
    expect(sdk.exchangeLedger.size).toBe(1);
    expect(panel(10)).toContain('ENTER exchange');
  });

  it('a second intent does not overwrite the pending slot', async () => {
    save.data.tickets = 100;
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    sdk.exchangeResponder = async () => {
      await gate;
      return { receiptId: 'rcpt-1', ticketsDebited: 40, verseCredited: 4 };
    };

    const first = hub.exchange(40);
    await viWaitForExchange();
    const slot = readHubStore().exchange;
    const second = hub.exchange(80);
    await Promise.resolve();
    expect(readHubStore().exchange).toMatchObject({ id: slot.id, tickets: 40, acked: false });
    expect(panel()).toContain('ESC close');

    release();
    await first;
    await second;
    expect(readHubStore().exchange.id).toBe(slot.id);
    expect(sdk.exchangeLedger.size).toBe(1);
    expect(save.data.tickets).toBe(60);
    expect(readHubStore().receipts).toEqual(['rcpt-1']);
  });

  it('with no session, no slot opens', async () => {
    sessionStorage.clear();
    resetHub(hub);
    await hub.init();
    expect(hub.inSession).toBe(false);
    save.data.tickets = 80;

    const view = await hub.exchange(40);
    expect(readHubStore()?.exchange ?? null).toBeNull();
    expect(sdk.calls.exchange).toHaveLength(0);
    expect(view.inSession).toBe(false);
    expect(view.pending).toBeNull();
    expect(save.data.tickets).toBe(80);
  });

  it('debits ticketsDebited when that field is present', async () => {
    save.data.tickets = 100;
    const server = rememberExchange({
      receiptId: 'rcpt-debit',
      ticketsDebited: 25,
      verseCredited: 4,
    }, 25);

    await hub.exchange(40);
    expect(save.data.tickets).toBe(75);
    expect(save.data.tickets).toBe(server.tickets);
    expect(readHubStore().exchange.acked).toBe(true);
  });

  it('falls back to floor(verseCredited) * 10 when ticketsDebited is absent', async () => {
    save.data.tickets = 100;
    const server = rememberExchange({ receiptId: 'rcpt-verse', verseCredited: 4 }, 40);

    await hub.exchange(40);
    expect(save.data.tickets).toBe(60);
    expect(save.data.tickets).toBe(server.tickets);
  });

  it('the verseCredited fallback drifts when Verse is not a whole number of 10 Tickets', async () => {
    save.data.tickets = 100;
    // 2.5 Verse is 25 Tickets on the server. floor(2.5) * 10 debits 20 locally.
    const server = rememberExchange({ receiptId: 'rcpt-frac', verseCredited: 2.5 }, 25);

    await hub.exchange(50);
    expect(save.data.tickets).toBe(server.tickets);
  });

  it('an SDK {verse, ticketsLeft, receiptId} partial fill drifts by debiting the request', async () => {
    save.data.tickets = 100;
    // Vendored SDK 0.1.0 returns this shape and can debit less than requested
    // when the daily Verse room is short. The bridge never reads ticketsLeft.
    const server = { tickets: 80 };
    sdk.exchangeResponder = () => ({ verse: 2, ticketsLeft: 80, receiptId: 'rcpt-sdk' });

    await hub.exchange(50);
    expect(save.data.tickets).toBe(server.tickets);
  });

  it('stays locked when the response has no receiptId', async () => {
    save.data.tickets = 100;
    sdk.exchangeResponder = () => ({ verse: 1, ticketsLeft: 90 });

    await hub.exchange(40);
    expect(readHubStore().exchange.acked).toBe(false);
    expect(readHubStore().receipts).toEqual([]);
    expect(save.data.tickets).toBe(100);
    expect(panel(40)).toContain('ESC close');
    expect(panel(40)).not.toContain('ENTER exchange');
  });
});

async function viWaitForExchange() {
  for (let i = 0; i < 20; i++) {
    if (readHubStore()?.exchange?.id) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('exchange slot was not written');
}
