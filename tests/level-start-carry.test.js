import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hub } from '../src/hub/hubBridge.js';
import { readyHub, resetWorld } from './helpers.js';

beforeEach(async () => {
  resetWorld();
  await readyHub();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

describe('level start and the carry', () => {
  it('startCarry returns at once while the hub has not answered', async () => {
    const stalled = deferred();
    vi.spyOn(hub, 'bankCarry').mockReturnValue(stalled.promise);
    const started = hub.startCarry();
    const raced = await Promise.race([started.then(() => 'carry'), new Promise((r) => setTimeout(() => r('timeout'), 20))]);
    expect(raced).toBe('timeout');
    stalled.resolve();
    await started;
  });

  it('a level-end bank waits for the carry from level start', async () => {
    const stalled = deferred();
    vi.spyOn(hub, 'bankCarry').mockReturnValue(stalled.promise);
    const sent = vi.spyOn(hub, '_bankAmount');
    const attempt = await hub.beginAttempt(2);
    hub.startCarry();
    const banking = hub.bank(attempt.id, 20, true);
    await new Promise((r) => setTimeout(r, 20));
    expect(sent).not.toHaveBeenCalled();
    stalled.resolve();
    await banking;
    expect(sent).toHaveBeenCalled();
  });

  it('a failed carry does not stop the level-end bank', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(hub, 'bankCarry').mockRejectedValue(new Error('hub down'));
    const sent = vi.spyOn(hub, '_bankAmount');
    const attempt = await hub.beginAttempt(1);
    hub.startCarry();
    await hub.bank(attempt.id, 20, true);
    expect(sent).toHaveBeenCalled();
  });
});
