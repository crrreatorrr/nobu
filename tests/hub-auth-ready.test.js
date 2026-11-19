// Boot waits for hub.authReady() (the account), not for the ticket sync and flushes init runs after it.
import { beforeEach, expect, it } from 'vitest';
import { hub } from '../src/hub/hubBridge.js';
import { grantSession, resetHub, resetWorld } from './helpers.js';
import { hubError, sdk } from './sdkState.js';

beforeEach(() => { resetWorld(); grantSession(); resetHub(); });

it('resolves once the account is known, while the ticket sync still hangs', async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  sdk.ticketBalance = () => gate.then(() => ({ balance: 7 }));
  let initDone = false;
  const init = hub.init().then(() => { initDone = true; });
  await hub.authReady();
  expect(hub.reach).toBe('ready');
  expect(hub.inSession).toBe(true);
  expect(initDone).toBe(false);
  release();
  await init;
  expect(initDone).toBe(true);
});

it('is the same wait for every caller and starts init once', async () => {
  const a = hub.authReady(), b = hub.authReady();
  expect(a).toBe(b);
  await a;
  expect(sdk.calls.init).toBe(1);
});

it('resolves offline when the hub cannot be reached', async () => {
  sdk.initError = hubError('network_error');
  await hub.authReady();
  expect(hub.reach).toBe('offline');
});
