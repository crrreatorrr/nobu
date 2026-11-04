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

describe('v3 progress shared with older and newer tabs', () => {
  const key = 'nobu-saviour-dog-save-v1';
  const put = (value) => localStorage.setItem(key, JSON.stringify(value));

  it('unions bones and durable progress, maxes counts, and keeps local cosmetic choices', () => {
    save.data.boneBoard = { 1: { golden: false, goodBoy: true, hidden: false, snack: 1 } };
    save.data.beaten = { 1: true };
    save.data.bones = { 2: false };
    save.data.bestDogs = { 1: 4 };
    save.data.bestChain = { 1: 16 };
    save.data.bossMedals = { cat: { clear: true, noHit: false, speed: true, bestMs: 80000 } };
    save.data.kennel = { seen: 1, buddy: 'pug', tint: 'shadow' };
    save.data.dogsFreed = { '1:shiba-a': true };
    save.data.rush = { clear: true, noHit: false, bestMs: 100000 };
    put({ v: 3, beaten: { 2: true }, bones: { 2: true }, open: { 2: true, 6: true },
      boneBoard: { 1: { hidden: true, snack: 3 } }, bestDogs: { 1: 2, 2: 3 }, bestChain: { 1: 12, 2: 18 },
      bossMedals: { cat: { clear: true, noHit: true, bestMs: 70000 } },
      kennel: { seen: 3, buddy: 'corgi', tint: 'cream' }, dogsFreed: { '2:pug-a': true },
      chainBadges: { 2: true }, perfect: { 2: true }, colorBones: { purple: true },
      remix: { 6: { golden: true } }, rush: { noHit: true, bestMs: 90000 } });
    save.write();
    expect(save.data.beaten).toEqual({ 1: true, 2: true });
    expect(save.data.bones[2]).toBe(true);
    expect(save.data.boneBoard[1]).toEqual({ golden: false, goodBoy: true, hidden: true, snack: 3 });
    expect(save.data.bestDogs).toEqual({ 1: 4, 2: 3 });
    expect(save.data.bestChain).toEqual({ 1: 16, 2: 18 });
    expect(save.data.bossMedals.cat).toEqual({ clear: true, noHit: true, speed: true, bestMs: 70000 });
    expect(save.data.kennel).toEqual({ seen: 3, buddy: 'pug', tint: 'shadow', goldenSeen: false, seenMilestones: {} });
    expect(save.data.dogsFreed).toEqual({ '1:shiba-a': true, '2:pug-a': true });
    expect(save.data.open[6]).toBe(true);
    expect(save.data.chainBadges[2]).toBe(true);
    expect(save.data.perfect[2]).toBe(true);
    expect(save.data.colorBones.purple).toBe(true);
    expect(save.data.remix[6].golden).toBe(true);
    expect(save.data.rush).toEqual({ clear: true, noHit: true, bestMs: 90000 });
  });

  it('migrates a v2 disk writer before merging its progress into v3', () => {
    save.data.beaten = { 3: true };
    put({ v: 2, unlocked: 3, beaten: [true, true, false], bones: [true, false, false], bestDogs: [3, 2, 0] });
    save.write();
    expect(save.data.v).toBe(3);
    expect(save.data.beaten).toEqual({ 1: true, 2: true, 3: true });
    expect(save.data.boneBoard[1].golden).toBe(true);
    expect(save.data.bestDogs).toEqual({ 1: 3, 2: 2 });
    expect(save.data.dogsFreed['1:dalmatian-a']).toBe(true);
    expect(save.data.open).toMatchObject({ 1: true, 2: true, 3: true, ride: true, cave: true, kennel: true });
    expect(JSON.parse(localStorage.getItem(key)).beaten).toEqual(save.data.beaten);
  });

  it('merges Classic trial minima and gauntlet aliases including the payment flag', () => {
    save.data.trialsClassic = { 1: { ms: 50000, best: 50, medal: 'gold', pid: null } };
    save.data.gauntlets = { g1: { found: true, allBoxes: true, flawless: false, bestMs: 8000 } };
    put({ v: 3, trialsClassic: { 1: { ms: 45000 } }, gauntlets: { g1: {
      polaroid: true, clear: true, noDeath: true, firstPaid: true, bestMs: 7000,
    } } });
    save.write();
    expect(save.data.trialsClassic[1].ms).toBe(45000);
    expect(save.data.gauntlets.g1).toEqual({ found: true, polaroid: true, clear: true, allBoxes: true,
      flawless: true, noDeath: true, firstPaid: true, bestMs: 7000 });
  });

  it('New Game keeps mastery from both tabs and cannot reset first-clear payments', () => {
    save.data.beaten = { 1: true, 2: true };
    save.data.bones = { 1: true };
    save.data.dogsFreed = { '1:shiba-a': true };
    save.data.open = { 1: true, 2: true, kennel: true };
    save.data.trials = { 1: { ms: 50000, best: 50, medal: 'gold', pid: 'a' } };
    save.data.bossMedals = { bird: { clear: true, noHit: true, speed: false, bestMs: 70000 } };
    save.data.perfect = { 1: true };
    save.data.loadout = { slots: { head: 'nobu_wizard_hat' } };
    put({ v: 3, trials: { 1: { ms: 44000 } }, trialsClassic: { 2: { ms: 60000 } },
      bossMedals: { cat: { clear: true, speed: true, bestMs: 80000 } }, perfect: { 2: true },
      rush: { clear: true, noHit: true, bestMs: 120000 }, gauntlets: {
        g1: { found: true, clear: true, allBoxes: true, flawless: true, firstPaid: true, bestMs: 7000 },
      } });
    save.reset();
    expect(save.data.open).toEqual({ 1: true });
    expect(save.data.beaten).toEqual({});
    expect(save.data.bones).toEqual({});
    expect(save.data.dogsFreed).toEqual({});
    expect(save.data.boneBoard).toEqual({});
    expect(save.data.trials[1]).toBeUndefined();
    expect(save.data.trialsClassic[1].ms).toBe(44000);
    expect(save.data.trialsClassic[2].ms).toBe(60000);
    expect(save.data.bossMedals.bird.noHit).toBe(true);
    expect(save.data.bossMedals.cat.speed).toBe(true);
    expect(save.data.perfect).toEqual({ 1: true, 2: true });
    expect(save.data.rush).toEqual({ clear: true, noHit: true, bestMs: 120000 });
    expect(save.data.gauntlets.g1.firstPaid).toBe(true);
    expect(save.data.gauntlets.g1.flawless).toBe(true);
    expect(save.data.loadout.slots.head).toBe('nobu_wizard_hat');
    save.reset();
    save.load();
    expect(save.data.gauntlets.g1.firstPaid).toBe(true);
  });
});
