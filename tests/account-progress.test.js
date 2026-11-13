// Progress belongs to the hub account that earned it (src/core/save.js, hub SDK createProgressStore).
import { beforeEach, describe, expect, it } from 'vitest';
import {
  LOCAL_KEY, PROGRESS_KEY, SAVE_KEY, SETTINGS_KEY, START_LIVES,
  mergeProgress, normalizeProgress, progressModel, save,
} from '../src/core/save.js';
import { save as otherTab } from '../src/core/save.js?account-second-tab';
import { hub } from '../src/hub/hubBridge.js';
import { trialLayout } from '../src/config/trials.js';
import { LEVEL_IDS, LEVEL_DOGS } from '../src/levels/metadata.js';
import { KENNEL_MILESTONES } from '../src/game/progress.js';
import { TUTORIALS } from '../src/story/script.js';
import { SAVE_MAX_BYTES } from '../vendor/hub-sdk/dist/types.js';
import { encodeSave } from '../vendor/hub-sdk/dist/save.js';
import { readyHub, resetHub, resetWorld } from './helpers.js';
import { sdk } from './sdkState.js';

/** The hub's cloud save: one JSON object per player, shared by every device. */
function cloudFor(saves, playerId) {
  return {
    async loadSave() {
      const body = saves.get(playerId);
      return { data: body ? JSON.parse(body) : null, updatedAt: body ? 1 : null };
    },
    async writeSave(data) {
      saves.set(playerId, encodeSave(data));
      return { ok: true };
    },
  };
}
const cloudCopy = (saves, playerId) => (saves.has(playerId) ? JSON.parse(saves.get(playerId)) : null);
const stored = (key) => JSON.parse(localStorage.getItem(key) || 'null');

/** A hub visit: the page loads, holds progress, then the session turns out live for `playerId`. */
async function hubVisit(saves, playerId) {
  save.load();
  save.hold();
  await save.attach(cloudFor(saves, playerId), playerId);
}

/** A browser that played a lot outside the hub (and before progress moved to the store). */
function usedBrowser() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    v: 3, unlocked: 3, open: { 1: true, 2: true, 3: true, kennel: true }, beaten: { 1: true, 2: true },
    seenIntro: true, finished: true, tickets: 340, lives: 9, lastLevel: 3,
    loadout: { slots: { head: 'nobu_wizard_hat', neck: null, back: null, body: null } },
    kennel: { seen: 2, buddy: 'pug', tint: 'cream' }, dogsFreed: { '1:shiba-a': true },
    trials: { 4: { ms: 60000, layout: 1, pid: null } }, gauntlets: { g1: { found: true, firstPaid: true } },
    musicVol: 0.2, rumble: false,
  }));
  save.load();
  save.data.beaten[3] = true;
  save.data.tickets = 500;
  save.write();
}

let saves;
beforeEach(() => {
  resetWorld();
  saves = new Map();
});

describe('account isolation', () => {
  it('a new account on a used browser starts with nothing: no progress, wallet, lives or gear', async () => {
    usedBrowser();
    expect(save.data.beaten).toEqual({ 1: true, 2: true, 3: true });
    expect(save.data.tickets).toBe(500);

    await hubVisit(saves, 'new-player');
    expect(save.owner()).toEqual({ kind: 'account', playerId: 'new-player' });
    expect(save.data.beaten).toEqual({});
    expect(save.data.unlocked).toBe(1);
    expect(save.data.open).toEqual({ 1: true });
    expect(save.data.seenIntro).toBe(false);
    expect(save.hasProgress()).toBe(false);
    expect(save.data.trials).toEqual({});
    expect(save.data.gauntlets).toEqual({});
    expect(save.data.dogsFreed).toEqual({});
    expect(save.data.tickets).toBe(0);
    expect(save.data.lives).toBe(START_LIVES);
    expect(save.data.lastLevel).toBe(1);
    expect(save.data.loadout.slots.head).toBe(null);
    expect(save.data.kennel).toMatchObject({ seen: 0, buddy: null, tint: null });
    // Settings belong to this browser, whoever plays.
    expect(save.data.musicVol).toBe(0.2);
    expect(save.data.rumble).toBe(false);
  });

  it('two accounts on one browser never see each other', async () => {
    await hubVisit(saves, 'alice');
    save.data.beaten[1] = true;
    save.data.tickets = 70;
    save.write();
    await save.flush();

    await hubVisit(saves, 'bob');
    expect(save.data.beaten).toEqual({});
    expect(save.data.tickets).toBe(0);
    save.data.bones[2] = true;
    save.write();
    await save.flush();

    await hubVisit(saves, 'alice');
    expect(save.data.beaten).toEqual({ 1: true });
    expect(save.data.bones).toEqual({});
    expect(save.data.tickets).toBe(70);
    expect(cloudCopy(saves, 'alice').beaten).toEqual({ 1: true });
    expect(cloudCopy(saves, 'bob').beaten).toEqual({});
  });
});

describe('device progress never reaches an account', () => {
  it('play outside the hub stays in this browser, before and after a hub visit', async () => {
    save.load();
    save.data.beaten[1] = true;
    save.data.trials[4] = { ms: 61000, layout: 1, pid: null };
    save.write();

    await hubVisit(saves, 'p1');
    expect(save.data.beaten).toEqual({});
    save.data.beaten[2] = true;
    save.write();
    await save.flush();
    expect(cloudCopy(saves, 'p1').beaten).toEqual({ 2: true });
    expect(cloudCopy(saves, 'p1').trials).toEqual({});
    expect(stored(`${PROGRESS_KEY}@p1`).beaten).toEqual({ 2: true });

    // Back outside the hub: the device copy is as it was, without the account's win.
    save.load();
    expect(save.owner()).toEqual({ kind: 'device' });
    expect(save.data.beaten).toEqual({ 1: true });
    expect(stored(PROGRESS_KEY).beaten).toEqual({ 1: true });
    save.data.beaten[3] = true;
    save.write();

    await hubVisit(saves, 'p1');
    expect(save.data.beaten).toEqual({ 2: true });
  });

  it('play before an account is attached, outside any hub visit, stays on the device', async () => {
    save.load();
    save.data.beaten[1] = true; // no write: still in memory when the session goes live
    await save.attach(cloudFor(saves, 'p1'), 'p1');
    expect(save.data.beaten).toEqual({});
    expect(cloudCopy(saves, 'p1')).toBeNull(); // nothing earned: nothing written
    expect(stored(PROGRESS_KEY).beaten).toEqual({ 1: true });
  });
});

describe('a second device', () => {
  it('loads the account cloud save, wallet aside', async () => {
    await hubVisit(saves, 'p1');
    save.data.beaten = { 1: true, 2: true };
    save.data.unlocked = 3;
    save.data.trials[4] = { ms: 58000, layout: 1, pid: 'p1', at: 1700000000000 };
    save.data.bossMedals.cat = { clear: true, noHit: true, speed: false, bestMs: 70000 };
    save.data.tickets = 90;
    save.write();
    await save.flush();
    expect(save.sync()).toBe('synced');

    // Another browser: nothing stored at all.
    localStorage.clear();
    await hubVisit(saves, 'p1');
    expect(save.data.beaten).toEqual({ 1: true, 2: true });
    expect(save.data.unlocked).toBe(3);
    expect(save.data.trials[4]).toMatchObject({ ms: 58000, best: 58, pid: 'p1', at: 1700000000000 });
    expect(save.data.trials[4].medal).toBeTruthy();
    expect(save.data.bossMedals.cat).toEqual({ clear: true, noHit: true, speed: false, bestMs: 70000 });
    // The local wallet is not synced; in a hub session the server balance fills it.
    expect(save.data.tickets).toBe(0);
  });

  it('a device that was offline merges its own wins with the cloud instead of overwriting it', async () => {
    await hubVisit(saves, 'p1');
    save.data.beaten[1] = true;
    save.data.trials[4] = { ms: 60000, layout: 1, pid: 'p1', at: 1 };
    save.write();
    await save.flush();

    // Meanwhile device B wins level 2 and a faster trial.
    const cloud = cloudCopy(saves, 'p1');
    const other = normalizeProgress({ ...cloud, beaten: { 2: true }, trials: { 4: { ms: 55000, layout: 1, pid: 'p1', at: 2 } } });
    saves.set('p1', encodeSave(progressModel.toCloud(other)));

    save.data.beaten[3] = true;
    save.write();
    await save.flush();
    expect(save.data.beaten).toEqual({ 1: true, 2: true, 3: true });
    expect(save.data.trials[4].ms).toBe(55000);
    expect(cloudCopy(saves, 'p1').beaten).toEqual({ 1: true, 2: true, 3: true });
  });

  it('New Game on one device starts a new playthrough on every device, keeping mastery', async () => {
    await hubVisit(saves, 'p1');
    save.data.beaten = { 1: true, 2: true };
    save.data.perfect = { 1: true };
    save.write();
    await save.flush();

    // Device B (offline copy still has the old playthrough) and device A starts a New Game.
    const deviceB = stored(`${PROGRESS_KEY}@p1`);
    save.reset();
    await save.flush();
    expect(cloudCopy(saves, 'p1')).toMatchObject({ playthrough: 1, beaten: {}, perfect: { 1: true } });

    localStorage.clear();
    localStorage.setItem(`${PROGRESS_KEY}@p1`, JSON.stringify({ ...deviceB, beaten: { 1: true, 2: true, 3: true } }));
    await hubVisit(saves, 'p1');
    expect(save.data.playthrough).toBe(1);
    expect(save.data.beaten).toEqual({});
    expect(save.data.perfect).toEqual({ 1: true });
  });
});

describe('a hub visit that is still starting', () => {
  it('gives wins made before the account is known to that account', async () => {
    usedBrowser();
    save.load();
    save.hold();
    expect(save.owner()).toEqual({ kind: 'pending' });
    expect(save.data.beaten).toEqual({});
    save.data.beaten[1] = true;
    save.data.tutorials.glide = true;
    save.write();
    expect(stored(PROGRESS_KEY).beaten).toEqual({ 1: true, 2: true, 3: true }); // untouched

    await save.attach(cloudFor(saves, 'p1'), 'p1');
    expect(save.data.beaten).toEqual({ 1: true });
    expect(save.data.tutorials).toEqual({ glide: true });
    expect(cloudCopy(saves, 'p1').beaten).toEqual({ 1: true });
    expect(stored(`${PROGRESS_KEY}@p1`).beaten).toEqual({ 1: true });
    expect(stored(PROGRESS_KEY).beaten).toEqual({ 1: true, 2: true, 3: true });
  });

  it('gives them to this browser when the visit turns out standalone', () => {
    save.load();
    save.hold();
    save.data.beaten[2] = true;
    save.write();
    save.release();
    expect(save.owner()).toEqual({ kind: 'device' });
    expect(save.data.beaten).toEqual({ 2: true });
    expect(stored(PROGRESS_KEY).beaten).toEqual({ 2: true });
  });
});

describe('legacy keys', () => {
  it('the save from before the store stays on the device and never reaches an account', async () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 3, beaten: { 1: true }, unlocked: 2, tickets: 44,
      trials: { 4: { ms: 59000, layout: 1, pid: 'someone-else' } }, sfxVol: 0.3 }));
    save.load();
    expect(save.data.beaten).toEqual({ 1: true });
    expect(save.data.tickets).toBe(44);
    expect(save.data.sfxVol).toBe(0.3);

    await save.attach(cloudFor(saves, 'p1'), 'p1');
    expect(save.data.beaten).toEqual({});
    expect(save.data.trials).toEqual({});
    expect(save.data.tickets).toBe(0);
    save.data.bones[3] = true;
    save.write();
    await save.flush();
    expect(cloudCopy(saves, 'p1')).toMatchObject({ beaten: {}, trials: {}, bones: { 3: true } });
    expect(stored(`${PROGRESS_KEY}@p1`).beaten).toEqual({});

    // The legacy save is read, never written, and still feeds the device copy.
    expect(stored(SAVE_KEY).bones).toBeUndefined();
    save.load();
    expect(save.data.beaten).toEqual({ 1: true });
    expect(save.data.trials[4].ms).toBe(59000);
  });

  it('seeds this browser settings and wallet once, then leaves them alone', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 3, tickets: 12, lives: 2, musicVol: 0.1, godMode: true }));
    save.load();
    expect(save.data).toMatchObject({ tickets: 12, lives: 2, musicVol: 0.1, godMode: true });
    save.data.tickets = 5;
    save.data.musicVol = 0.9;
    save.write();
    save.load();
    expect(save.data).toMatchObject({ tickets: 5, musicVol: 0.9 });
    expect(stored(LOCAL_KEY).tickets).toBe(5);
    expect(stored(SETTINGS_KEY).musicVol).toBe(0.9);
  });
});

describe('hub bridge', () => {
  it('attaches progress to the live session player and keeps the server wallet there', async () => {
    usedBrowser();
    sdk.ticketBalance = { balance: 33 };
    await readyHub();
    await hub.progressReady;
    expect(save.owner()).toEqual({ kind: 'account', playerId: 'player-1' });
    expect(save.data.beaten).toEqual({});
    expect(save.data.tickets).toBe(33);
    expect(stored(`${LOCAL_KEY}@player-1`).tickets).toBe(33);
    expect(stored(LOCAL_KEY).tickets).toBe(500);
    save.data.beaten[1] = true;
    save.write();
    await save.flush();
    expect(JSON.parse(sdk.cloudSaves.get('player-1')).beaten).toEqual({ 1: true });
  });

  it('releases held progress to the device when the visit is standalone', async () => {
    save.load();
    save.hold();
    save.data.beaten[4] = true;
    sessionStorage.clear();
    resetHub(hub);
    await hub.init();
    expect(save.owner()).toEqual({ kind: 'device' });
    expect(save.data.beaten).toEqual({ 4: true });
    expect(stored(PROGRESS_KEY).beaten).toEqual({ 4: true });
  });

  it('releases to the device when hub init fails', async () => {
    save.load();
    save.hold();
    sdk.initError = Object.assign(new Error('down'), { code: 'network' });
    resetHub(hub);
    await hub.init();
    expect(save.owner()).toEqual({ kind: 'device' });
  });
});

describe('other tabs', () => {
  it('a storage event brings another tab’s account progress into this one', async () => {
    await hubVisit(saves, 'p1');
    otherTab.load();
    otherTab.hold();
    await otherTab.attach(cloudFor(saves, 'p1'), 'p1');
    otherTab.data.beaten[5] = true;
    otherTab.write();

    expect(save.data.beaten).toEqual({});
    save.storageChanged(`${PROGRESS_KEY}@p1`);
    expect(save.data.beaten).toEqual({ 5: true });
    // Another owner's key is not this tab's business.
    save.storageChanged(PROGRESS_KEY);
    save.storageChanged(`${PROGRESS_KEY}@p2`);
    expect(save.data.beaten).toEqual({ 5: true });
  });

  it('unsaved changes in this tab survive a refresh', async () => {
    await hubVisit(saves, 'p1');
    save.data.beaten[1] = true; // not written yet
    otherTab.load();
    await otherTab.attach(cloudFor(saves, 'p1'), 'p1');
    otherTab.data.beaten[2] = true;
    otherTab.write();
    save.storageChanged(`${PROGRESS_KEY}@p1`);
    expect(save.data.beaten).toEqual({ 1: true, 2: true });
  });
});

// ------------------------------------------------------------------ the model itself

function maximalProgress() {
  const all = (ids) => Object.fromEntries(ids.map((id) => [id, true]));
  const big = 9_007_199_254_740_991;
  const pid = 'x'.repeat(64);
  const record = (level, layout) => ({ ms: 1_799_999, layout, at: big, deaths: big, freezeMs: big, pid, godUsed: false, bestEligibleMs: 1_799_999 });
  const levels = [1, 2, 3, 4, 5, 6];
  return {
    v: 3, playthrough: big,
    unlocked: 3,
    open: all([...LEVEL_IDS, 'kennel', 'g1', 'g2', 'g3']),
    beaten: all(LEVEL_IDS), bones: all(LEVEL_IDS), perfect: all(LEVEL_IDS), chainBadges: all(LEVEL_IDS),
    bestDogs: Object.fromEntries(LEVEL_IDS.map((id) => [id, big])),
    bestChain: Object.fromEntries(LEVEL_IDS.map((id) => [id, big])),
    boneBoard: Object.fromEntries(LEVEL_IDS.map((id) => [id, { golden: true, goodBoy: true, hidden: true, snack: 3 }])),
    // Every known dog, plus far more well-formed future ids than are kept.
    dogsFreed: {
      ...all(Object.entries(LEVEL_DOGS).flatMap(([id, dogs]) => Object.keys(dogs).map((dog) => `${id}:${dog}`))),
      ...all(Array.from({ length: 500 }, (_, i) => `cave:zzzzzzzzzzzzzzzzzzzz-${String(i).padStart(4, '0')}`)),
    },
    remix: Object.fromEntries(LEVEL_IDS.map((id) => [id, { golden: true }])),
    kennel: { seen: 6, goldenSeen: true, seenMilestones: all(KENNEL_MILESTONES.map((m) => m.id)) },
    bonus: Object.fromEntries(LEVEL_IDS.map((id) => [id, { found: true, beaten: true, best: big, extra: 'x'.repeat(500) }])),
    colorBones: all(['red', 'blue', 'green', 'yellow', 'purple']),
    secretSeen: true, seenIntro: true, finished: true, seenCh2: true,
    tutorials: { ...all([...Object.keys(TUTORIALS), 'tallySeen']), ...all(Array.from({ length: 500 }, (_, i) => `unknown${i}`)) },
    trials: Object.fromEntries(levels.map((l) => [l, record(l, trialLayout(l))])),
    trialsClassic: Object.fromEntries(levels.map((l) => [l, record(l, 1)])),
    bossMedals: Object.fromEntries(['bird', 'cat', 'cone', 'titan', 'queen'].map((k) => [k, { clear: true, noHit: true, speed: true, bestMs: big }])),
    rush: { clear: true, noHit: true, bestMs: big },
    gauntlets: Object.fromEntries(['g1', 'g2', 'g3'].map((g) => [g, { found: true, polaroid: true, clear: true, allBoxes: true,
      flawless: true, noDeath: true, firstPaid: true, bestMs: big }])),
    // Local-only fields never reach the cloud form, however big.
    lastMiss: Object.fromEntries(LEVEL_IDS.map((id) => [id, Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`${'m'.repeat(40)}${i}`, big]))])),
    tickets: big, lives: big, loadout: { slots: { head: 'x'.repeat(2000) } }, musicVol: 1,
  };
}

const cloudBytes = (value) => new TextEncoder().encode(encodeSave(progressModel.toCloud(value))).length;

describe('progress model', () => {
  it('the largest possible save fits in the cloud save with room to spare', () => {
    const value = normalizeProgress(maximalProgress());
    expect(Object.keys(value.trials)).toHaveLength(6);
    expect(Object.keys(value.trialsClassic)).toHaveLength(6);
    expect(Object.keys(value.dogsFreed).length).toBeLessThanOrEqual(Object.values(LEVEL_DOGS).reduce((n, d) => n + Object.keys(d).length, 0) + 16);
    for (const k of ['lastMiss', 'tickets', 'lives', 'loadout', 'musicVol']) expect(value).not.toHaveProperty(k);
    // Every field at its largest, with absurd numbers and 64-character player ids: under 10 KB of
    // the 16 KB, leaving room for more levels, dogs and trials before a compact form is needed.
    expect(cloudBytes(value)).toBeLessThan(10 * 1024);
    // Merging two maximal copies stays the same size.
    expect(encodeSave(progressModel.toCloud(mergeProgress(value, value))).length).toBe(encodeSave(progressModel.toCloud(value)).length);
    // The cloud form reads back to the same progress.
    expect(normalizeProgress(progressModel.toCloud(value))).toEqual(value);
  });

  it('a complete real save (every unlock, every record) uses well under half the cloud save', () => {
    const full = maximalProgress();
    const pid = '0b8f1f4e-6f6b-4a43-9a8e-3f0c3e1f2a7d';
    for (const map of [full.trials, full.trialsClassic]) {
      for (const e of Object.values(map)) Object.assign(e, { ms: 61234, bestEligibleMs: 61234, pid, at: 1_789_000_000_000, deaths: 12, freezeMs: 4500 });
    }
    full.dogsFreed = Object.fromEntries(Object.keys(full.dogsFreed).filter((id) => !id.includes('zzz')).map((id) => [id, true]));
    for (const k of ['bestDogs', 'bestChain']) for (const id of Object.keys(full[k])) full[k][id] = 120;
    for (const m of [...Object.values(full.bossMedals), full.rush, ...Object.values(full.gauntlets)]) m.bestMs = 95_000;
    for (const b of Object.values(full.bonus)) b.best = 400;
    full.playthrough = 12;
    expect(cloudBytes(normalizeProgress(full))).toBeLessThan(SAVE_MAX_BYTES / 2);
  });

  const samples = () => [
    normalizeProgress(null),
    normalizeProgress({ v: 3, beaten: { 1: true }, unlocked: 2, bestDogs: { 1: 3 }, trials: { 4: { ms: 60000, layout: 1, pid: 'a', at: 1 } },
      bonus: { ride: { found: true } }, kennel: { seen: 2, seenMilestones: { jukebox: true } }, gauntlets: { g1: { found: true, bestMs: 9000 } } }),
    normalizeProgress({ v: 3, beaten: { 2: true }, bestDogs: { 1: 5 }, trials: { 4: { ms: 60000, layout: 1, pid: 'b', at: 2 } },
      bonus: { ride: { beaten: true, best: 7 } }, rush: { clear: true, bestMs: 50000 }, gauntlets: { g1: { firstPaid: true, bestMs: 8000 } } }),
    normalizeProgress({ v: 3, playthrough: 1, open: { 2: true }, perfect: { 3: true }, trials: { 4: { ms: 59000, layout: 1, pid: null, godUsed: true } },
      bossMedals: { cat: { clear: true, bestMs: 60000 } }, tutorials: { glide: true } }),
  ];

  it('merge keeps or improves, and gives the same result in any order', () => {
    const s = samples();
    const json = (v) => JSON.stringify(normalizeProgress(v), Object.keys(v).sort());
    for (const a of s) {
      expect(normalizeProgress(mergeProgress(a, a))).toEqual(a);
      for (const b of s) {
        expect(normalizeProgress(mergeProgress(a, b))).toEqual(normalizeProgress(mergeProgress(b, a)));
        for (const c of s) {
          expect(json(mergeProgress(mergeProgress(a, b), c))).toBe(json(mergeProgress(a, mergeProgress(b, c))));
        }
      }
    }
    const [, one, two] = s;
    const both = mergeProgress(one, two);
    expect(both.beaten).toEqual({ 1: true, 2: true });
    expect(both.bestDogs).toEqual({ 1: 5 });
    expect(both.bonus.ride).toEqual({ found: true, beaten: true, best: 7 });
    expect(both.gauntlets.g1).toMatchObject({ found: true, firstPaid: true, bestMs: 8000 });
    // Two equal times: the same record wins whichever copy came first.
    expect(both.trials[4].pid).toBe(mergeProgress(two, one).trials[4].pid);
  });

  it('a newer playthrough replaces story progress but never mastery', () => {
    const [, one, , newer] = samples();
    const merged = mergeProgress(one, newer);
    expect(merged.playthrough).toBe(1);
    expect(merged.beaten).toEqual({});
    expect(merged.open).toEqual({ 1: true, 2: true });
    expect(merged.trials[4].ms).toBe(59000);
    expect(merged.gauntlets.g1.found).toBe(true);
    expect(merged.perfect).toEqual({ 3: true });
  });
});
