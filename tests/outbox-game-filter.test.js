import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hub } from '../src/hub/hubBridge.js';
import { grantSession, resetHub, resetWorld } from './helpers.js';
import { HUB_OUTBOX_DB } from './hubSdkMock.js';
import { hubError, sdk } from './sdkState.js';

// Every game on the production origin shares the SDK's `hub-outbox` IndexedDB. Each row
// carries the `gameId` of the session that queued it. nobu may only pick or delete its own.

// getAll() returns rows in key order, so the other game's row sorts first.
const OTHER_ROW = {
  key: '01900000-0000-7000-8000-000000000001',
  rpc: 'tickets.earn',
  body: { amount: 5, reason: 'level_clear' },
  token: 'other-token',
  gameId: 'hpos10i',
};
const NOBU_ROW = {
  key: '01910000-0000-7000-8000-000000000002',
  rpc: 'tickets.earn',
  body: { amount: 3, reason: 'level_end' },
  token: 't',
  gameId: 'nobu',
};

function openOutbox() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HUB_OUTBOX_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('writes', { keyPath: 'key' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function seed(rows) {
  const db = await openOutbox();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('writes', 'readwrite');
    for (const row of rows) tx.objectStore('writes').put(row);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function outboxKeys() {
  const db = await openOutbox();
  const rows = await new Promise((resolve, reject) => {
    const read = db.transaction('writes').objectStore('writes').getAll();
    read.onsuccess = () => resolve(read.result);
    read.onerror = () => reject(read.error);
  });
  db.close();
  return rows.map((row) => row.key);
}

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  resetWorld();
  grantSession();
});
afterEach(() => vi.unstubAllGlobals());

describe('shared hub outbox: nobu touches only its own rows', () => {
  it('a terminal init error drops the nobu row, not another game queued ahead of it', async () => {
    await seed([OTHER_ROW, NOBU_ROW]);
    sdk.initError = hubError('daily_ticket_cap', 'daily cap');
    sdk.initErrorOnce = true;

    resetHub(hub);
    await hub.init();

    expect(await outboxKeys()).toEqual([OTHER_ROW.key]);
    expect(hub.reach).toBe('ready');
  });

  it('with only another game queued, a terminal init error deletes nothing', async () => {
    await seed([OTHER_ROW]);
    sdk.initError = hubError('daily_ticket_cap', 'daily cap');
    sdk.initErrorOnce = true;

    resetHub(hub);
    await hub.init();

    expect(await outboxKeys()).toEqual([OTHER_ROW.key]);
    expect(sdk.calls.init).toBe(1);
    expect(hub.reach).toBe('offline');
  });

  it('dropping a write by key leaves a row another game queued under that key', async () => {
    await seed([OTHER_ROW, NOBU_ROW]);
    resetHub(hub);
    await hub.init();

    expect(await hub._failWrite(hubError('daily_ticket_cap'), OTHER_ROW.key)).toBe(true);
    expect(await hub._failWrite(hubError('daily_ticket_cap'), NOBU_ROW.key)).toBe(true);

    expect(await outboxKeys()).toEqual([OTHER_ROW.key]);
  });

  it('a row with no gameId is never treated as nobu', async () => {
    const { gameId: _drop, ...legacy } = OTHER_ROW;
    await seed([legacy, NOBU_ROW]);
    sdk.initError = hubError('daily_ticket_cap', 'daily cap');
    sdk.initErrorOnce = true;

    resetHub(hub);
    await hub.init();

    expect(await outboxKeys()).toEqual([legacy.key]);
  });
});
