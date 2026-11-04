// Classic regression fixtures; active layout2 migration/upload gating is checked separately.
vi.mock('../src/config/trialLayouts.js',()=>({LAYOUT:{1:1,2:1,3:1},HUB_LAYOUT:{1:1,2:1,3:1}}));
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CORRUPT_KEY, SAVE_KEY, migrateSave, save } from '../src/core/save.js';
import { LEVEL_DOGS } from '../src/levels/metadata.js';
import { MAP_ORDER, isOpen } from '../src/levels/registry.js';
import { Game } from '../src/game/game.js';
import { Player } from '../src/player/player.js';
import { hub } from '../src/hub/hubBridge.js';
import { resetWorld } from './helpers.js';

const load = (value) => {
  localStorage.setItem(SAVE_KEY, JSON.stringify(value));
  return save.load();
};
beforeEach(() => resetWorld());

describe('save v3 migration', () => {
  it('starts fresh with keyed defaults and no derived progress', () => {
    expect(save.data).toMatchObject({ v: 3, open: { 1: true }, beaten: {}, bones: {}, bestDogs: {},
      boneBoard: {}, dogsFreed: {}, bestChain: {}, chainBadges: {}, bossMedals: {}, perfect: {},
      remix: {}, rush: { clear: false, noHit: false, bestMs: null }, kennel: { seen: 0, buddy: null, tint: null },
      trialsClassic: {}, gauntlets: {}, lastMiss: {}, secretSeen: false });
    expect(save.data).not.toHaveProperty('moves');
  });

  it('converts v2 arrays and only grants the previously earned Golden slots', () => {
    load({ v: 2, beaten: [true, true, false], bones: [true, false, false], bestDogs: [5, 2, 0] });
    expect(save.data.beaten).toEqual({ 1: true, 2: true });
    expect(save.data.bones).toEqual({ 1: true });
    expect(save.data.bestDogs).toEqual({ 1: 5, 2: 2 });
    expect(save.data.boneBoard).toEqual({ 1: { golden: true, goodBoy: false, hidden: false, snack: 0 } });
  });

  it('maps old unlocks and both bonus discovery paths without opening new content', () => {
    load({ v: 2, unlocked: 3, beaten: [true, false, false] });
    expect(save.data.open).toEqual({ 1: true, 2: true, 3: true, ride: true });
    expect(MAP_ORDER.filter((id) => isOpen(id, save.data))).toEqual([1, 'ride', 2, 3]);
    load({ v: 2, bonus: { cave: { found: true }, ride: { beaten: true } } });
    expect(save.data.open).toEqual({ 1: true, ride: true, cave: true });
    expect(save.data.beaten).toEqual({});
  });

  it('approximates only old main-level dogs using stable authoring order', () => {
    load({ v: 2, bestDogs: [3, 1, 0], bonus: { ride: { beaten: true } } });
    expect(save.data.dogsFreed).toEqual(Object.fromEntries([
      ...Object.keys(LEVEL_DOGS[1]).slice(0, 3).map((id) => [`1:${id}`, true]), ['2:corgi-a', true],
    ]));
    expect(save.data.open.kennel).toBe(true);
    expect(Object.keys(save.data.dogsFreed).some((id) => id.startsWith('ride:'))).toBe(false);
  });

  it('preserves settings, lives, Tickets, wardrobe, story, colors and trial metadata', () => {
    const prior = { v: 2, unlocked: 3, beaten: [true, true, true], lives: 7, tickets: 93,
      seenIntro: true, finished: true, lastLevel: 3, tutorials: { glide: true }, nobuModel: 'classic',
      pixelated: true, godMode: true, loadout: { slots: { head: 'nobu_wizard_hat' } },
      bonus: { ride: { found: true, beaten: true, best: 24 } }, colorBones: { red: true, blue: true },
      musicVol: 0.2, sfxVol: 0.4,
      trials: { 1: { best: 51.23456, ms: 51235, medal: 'gold', at: 123, deaths: 2, freezeMs: 3000, pid: 'p' } } };
    load(prior);
    for (const key of ['lives', 'tickets', 'seenIntro', 'finished', 'lastLevel', 'tutorials', 'nobuModel',
      'pixelated', 'godMode', 'loadout', 'bonus', 'colorBones', 'musicVol', 'sfxVol', 'trials']) {
      expect(save.data[key], key).toEqual(key === 'trials' ? { 1: { ...prior.trials[1], layout: 1, godUsed: false, bestEligibleMs: 51235 } } : prior[key]);
    }
  });

  it('retains the v1 crisp-rendering migration and never mutates its input', () => {
    const prior = { pixelated: true, beaten: [true], bones: [true], bestDogs: [1] };
    const snapshot = structuredClone(prior);
    const migrated = migrateSave(prior);
    expect(prior).toEqual(snapshot);
    expect(migrated).toMatchObject({ v: 3, pixelated: false, beaten: { 1: true } });
    load(prior);
    expect(save.data.pixelated).toBe(false);
  });

  it('is idempotent across loading, writing and reloading', () => {
    load({ v: 2, unlocked: 3, beaten: [true, true, false], bones: [true], bestDogs: [4, 2], trials: { 1: { best: 56 } } });
    const once = structuredClone(save.data);
    save.write();
    save.load();
    expect(save.data).toEqual(once);
    expect(migrateSave(save.data)).toBe(save.data);
  });

  it.each(['xxxx', 123, null])('never derives awards or unlocks from malformed legacy maps %j', (bad) => {
    load({ v: 2, beaten: bad, bones: bad, bestDogs: bad });
    expect(save.data.beaten).toEqual({});
    expect(save.data.bones).toEqual({});
    expect(save.data.boneBoard).toEqual({});
    expect(save.data.dogsFreed).toEqual({});
    expect(save.data.open).toEqual({ 1: true });
  });

  it('does not reinterpret a v3 map as zero-based array data', () => {
    load({ v: 3, beaten: { 1: true, 4: true, 6: true }, bones: { 2: true }, bestDogs: { 6: 7 },
      open: { 1: true, 4: true, 6: true, 5: true }, dogsFreed: { '6:shiba-a': true } });
    expect(save.data.beaten).toEqual({ 1: true, 4: true, 6: true });
    expect(save.data.bestDogs).toEqual({ 6: 7 });
    expect(save.data.dogsFreed).toEqual({ '6:shiba-a': true });
    expect(save.data.boneBoard).toEqual({});
  });

  it('sanitizes every new progress container without losing valid future ids', () => {
    load({ v: 3, beaten: { 4: true, 8: true, 2: 'yes' }, open: { 6: true, kennel: true, bad: true },
      bones: { 6: true }, bestDogs: { 6: 7, bad: 8, 1: -2 }, bestChain: { 4: 18 },
      boneBoard: { 1: { snack: 9, hidden: true, golden: 'yes' }, 6: { snack: -1 }, bad: {} },
      dogsFreed: { 'x:y': true, '1:shiba-a': true, '6:corgi-b': true, '2:pug-a': 1 },
      bossMedals: { queen: { clear: true, noHit: 'yes', speed: true, bestMs: 12345 }, bad: { clear: true } },
      perfect: { 6: true }, remix: { 6: { golden: true }, bad: {} }, chainBadges: { 1: true },
      rush: { clear: true, noHit: 'yes', bestMs: -5 }, kennel: { seen: 999, buddy: 'bad', tint: 'shadow' },
      colorBones: { purple: true, green: true, yellow: true, bad: true }, secretSeen: 'yes' });
    expect(save.data.beaten).toEqual({ 4: true });
    expect(save.data.open).toEqual({ 1: true, 6: true, kennel: true });
    expect(save.data.bones).toEqual({ 6: true });
    expect(save.data.bestDogs).toEqual({ 6: 7 });
    expect(save.data.boneBoard).toEqual({ 1: { snack: 3, hidden: true, golden: false, goodBoy: false },
      6: { snack: 0, hidden: false, golden: false, goodBoy: false } });
    expect(save.data.dogsFreed).toEqual({ '1:shiba-a': true, '6:corgi-b': true });
    expect(save.data.bossMedals).toEqual({ queen: { clear: true, noHit: false, speed: true, bestMs: 12345 } });
    expect(save.data.rush).toEqual({ clear: true, noHit: false, bestMs: null });
    expect(save.data.kennel).toEqual({ seen: 6, buddy: null, tint: 'shadow', goldenSeen: false, seenMilestones: {} });
    expect(save.data.colorBones).toEqual({ green: true, yellow: true, purple: true });
    expect(save.data.secretSeen).toBe(false);
  });

  it('limits last-run hints and accepts both gauntlet schema spellings', () => {
    const sections = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`${i}-${'x'.repeat(60)}`, i + 1]));
    load({ v: 3, lastMiss: { 1: sections, bad: { path: 1 } }, gauntlets: {
      g1: { polaroid: true, noDeath: true, firstPaid: true, bestMs: 1234 },
      g2: { found: true, flawless: true, clear: true, allBoxes: true, bestMs: 999 },
      bad: { found: true },
    } });
    expect(Object.keys(save.data.lastMiss[1])).toHaveLength(12);
    expect(Object.keys(save.data.lastMiss[1]).every((name) => name.length <= 40)).toBe(true);
    expect(save.data.lastMiss.bad).toBeUndefined();
    expect(save.data.gauntlets.g1).toMatchObject({ found: true, polaroid: true, flawless: true, noDeath: true, firstPaid: true, bestMs: 1234 });
    expect(save.data.gauntlets.g2).toMatchObject({ found: true, polaroid: true, flawless: true, noDeath: true, bestMs: null });
    expect(save.data.gauntlets.bad).toBeUndefined();
  });

  it('keeps the original corrupt bytes and fresh v3 defaults', () => {
    localStorage.setItem(SAVE_KEY, '{not json');
    save.load();
    expect(localStorage.getItem(CORRUPT_KEY)).toBe('{not json');
    expect(save.data.v).toBe(3);
    expect(save.data.open).toEqual({ 1: true });
  });
});

describe('keyed runtime readers', () => {
  it('retains earned moves and legacy live-array caller compatibility', () => {
    const player = Object.create(Player.prototype);
    player.game = { session: {}, loadout: { effects: {} } };
    save.data.beaten = { 1: true, 2: true, 3: true, 6: true };
    expect(player.abilities).toMatchObject({ glide: true, zoom: true, bark: true });
    save.data.beaten = [true, true, false];
    expect(player.abilities).toMatchObject({ glide: true, zoom: true, bark: false });
  });

  it('keeps the complete current story and bonus unlock sequence', () => {
    const bank = vi.spyOn(hub, 'bank').mockResolvedValue(undefined);
    const game = { playCutscene: vi.fn() };
    const open = () => MAP_ORDER.filter((id) => isOpen(id, save.data));
    expect(save.hasProgress()).toBe(false);
    expect(open()).toEqual([1]);
    for (const [level, expected] of [[1, [1, 'ride', 2]], [2, [1, 'ride', 2, 'cave', 3]], [3, MAP_ORDER.filter((id) => id !== 'kennel')]]) {
      Game.prototype.levelCleared.call(game, { level, levelTickets: 0 });
      expect(open()).toEqual(expected);
      expect(save.hasProgress()).toBe(true);
    }
    save.write();
    save.load();
    expect(open()).toEqual(MAP_ORDER.filter((id) => id !== 'kennel'));
    bank.mockRestore();
  });

  it.each([1, '1', 2, '2', 3, '3'])('records an existing level %s clear and opens only current successors', (id) => {
    const bank = vi.spyOn(hub, 'bank').mockResolvedValue(undefined);
    const game = { playCutscene: vi.fn() };
    Game.prototype.levelCleared.call(game, { level: id, levelTickets: 0,
      stats: { tickets: 0, broken: 2, breakables: 2, dogs: 2, dogsTotal: 2 } });
    expect(save.beatenOf(id)).toBe(true);
    expect(save.boneOf(id)).toBe(true);
    expect(save.bestDogsOf(id)).toBe(2);
    expect(save.data.boneBoard[id].golden).toBe(true);
    if (Number(id) < 3) expect(isOpen(Number(id) + 1, save.data)).toBe(true);
    if (Number(id) === 1) expect(isOpen('ride', save.data)).toBe(true);
    if (Number(id) === 2) expect(isOpen('cave', save.data)).toBe(true);
    expect(save.data.open[4]).toBeUndefined();
    for (let opened = 1; opened <= Math.min(3, Number(id) + 1); opened++) expect(isOpen(opened, save.data)).toBe(true);
    bank.mockRestore();
  });
});
