import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Session } from '../src/game/session.js';
import { hub } from '../src/hub/hubBridge.js';
import { readHubStore, readyHub, resetHub, resetWorld } from './helpers.js';
import { hubError, sdk } from './sdkState.js';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

beforeEach(async () => {
  resetWorld();
  await readyHub();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function bossSession(attempt, bossKey) {
  const session = Object.create(Session.prototype);
  session.attemptId = attempt.id;
  session.attemptDurable = true;
  session.def = { bossKey };
  session.projectiles = { clear() {} };
  session.game = {
    player: {
      frozen: false,
      victory() {},
      pos: { clone() { return { clone() { return this; }, add() { return this; } }; } },
    },
    ui: {
      bossHp() {},
      bossHide() {},
      say: () => Promise.resolve(),
      fade: () => Promise.resolve(),
    },
    camera: { cinematic() {} },
    levelCleared() {},
  };
  return session;
}

describe('case 2: relic key is separate from the earn key', () => {
  it('nobu.boss_defeated {boss:cone} uses its own uuid v7 key', async () => {
    const attempt = await hub.beginAttempt(3);
    await hub.reportCone(attempt.id, true);

    const relic = readHubStore().relics[attempt.id];
    expect(relic.key).toMatch(UUID_V7);
    expect(relic.key).not.toBe(attempt.id);
    expect(sdk.calls.event).toEqual([
      { eventId: 'nobu.boss_defeated', data: { boss: 'cone' }, key: relic.key },
    ]);
    expect(sdk.relicGrants).toBe(1);
    expect(sdk.relics.has('cones_tip')).toBe(true);
    expect(sdk.calls.earn).toHaveLength(0);
  });

  it('a retry and a reload reuse the relic key', async () => {
    const attempt = await hub.beginAttempt(3);
    sdk.eventError = hubError('rpc_failed', 'socket hang up');
    await hub.reportCone(attempt.id, true);
    const key = readHubStore().relics[attempt.id].key;
    expect(readHubStore().relics[attempt.id].acked).toBe(false);
    expect(sdk.relicGrants).toBe(0);

    sdk.eventError = null;
    resetHub(hub);
    await hub.init();

    expect(sdk.calls.event.every((call) => call.key === key)).toBe(true);
    expect(sdk.calls.event.length).toBeGreaterThan(1);
    expect(readHubStore().relics[attempt.id]).toMatchObject({ key, acked: true });
    expect(sdk.relicGrants).toBe(1);

    await hub.reportCone(attempt.id, true);
    expect(sdk.calls.event.filter((call) => call.key !== key)).toHaveLength(0);
    expect(sdk.relicGrants).toBe(1);
  });

  it('a second defeat does not grant cones_tip again', async () => {
    const first = await hub.beginAttempt(3);
    await hub.reportCone(first.id, true);
    const firstKey = readHubStore().relics[first.id].key;

    const second = await hub.beginAttempt(3);
    await hub.reportCone(second.id, true);
    const secondKey = readHubStore().relics[second.id].key;

    // Same attempt is stable (covered above). A later attempt mints its own
    // client key; the server still grants cones_tip only once.
    expect(secondKey).not.toBe(firstKey);
    expect(secondKey).not.toBe(second.id);
    expect(sdk.relicGrants).toBe(1);
    expect([...sdk.relics]).toEqual(['cones_tip']);
  });

  it('only the cone boss reports the relic', async () => {
    vi.useFakeTimers();
    const attempt = await hub.beginAttempt(1);
    const pending = [];
    const orig = hub.reportCone.bind(hub);
    vi.spyOn(hub, 'reportCone').mockImplementation((...args) => {
      const promise = orig(...args);
      pending.push(promise);
      return promise;
    });

    const bird = bossSession(attempt, 'bird');
    bird.onBossDefeated({});
    expect(hub.reportCone).not.toHaveBeenCalled();
    vi.clearAllTimers();

    const cone = bossSession(attempt, 'cone');
    cone.onBossDefeated({});
    expect(hub.reportCone).toHaveBeenCalledWith(attempt.id, true);
    vi.clearAllTimers();
    await Promise.all(pending);
    expect(sdk.calls.event).toHaveLength(1);
    expect(sdk.calls.event[0].data).toEqual({ boss: 'cone' });
  });
});
