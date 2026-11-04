import { beforeEach, describe, expect, it, vi } from 'vitest';
const versions = vi.hoisted(() => ({ LAYOUT: { 1: 2, 2: 2, 3: 1 }, HUB_LAYOUT: { 1: 1, 2: 1, 3: 1 } }));
vi.mock('../src/config/trialLayouts.js', () => versions);
import { save, SAVE_KEY } from '../src/core/save.js';
import { trialMedal, trialVariant, trialMsInBounds, canUploadTrial } from '../src/config/trials.js';
import { enqueue, pendingRows, knownBest, readQueue, SCORE_QUEUE_KEY, classify, flushQueue } from '../src/hub/scoreQueue.js';
import { hub } from '../src/hub/hubBridge.js';
import { Game } from '../src/game/game.js';
import { Session } from '../src/game/session.js';
import { readyHub, resetWorld } from './helpers.js';
import { sdk, hubError } from './sdkState.js';
const load = (d) => { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); return save.load(); };
beforeEach(() => {
  Object.assign(versions.LAYOUT, { 1: 2, 2: 2, 3: 1 });
  Object.assign(versions.HUB_LAYOUT, { 1: 1, 2: 1, 3: 1 });
  resetWorld();
});

describe('per-level layout upgrades', () => {
  it('archives old bests only for levels whose geometry has changed, idempotently', () => {
    load({ v: 2, trials: { 1: { ms: 52000 }, 3: { ms: 43000 } } });
    expect(save.data.trialsClassic[1]).toMatchObject({ ms: 52000, layout: 1 });
    expect(save.data.trials[1]).toBeUndefined();
    expect(save.data.trials[3]).toMatchObject({ ms: 43000, layout: 1 });
    const snapshot = structuredClone(save.data);
    save.write(); save.load();
    expect(save.data).toEqual(snapshot);
  });
  it('also migrates already-v3 saves and never treats a Classic time as a layout-2 best', () => {
    load({ v: 3, trials: { 1: { ms: 16000 } }, trialsClassic: { 1: { ms: 18000, layout: 1 } } });
    expect(save.data.trialsClassic[1].ms).toBe(16000);
    expect(save.data.trials).toEqual({});
    load({ v: 3, trials: { 1: { ms: 25699, layout: 2 } } });
    expect(save.data.trials).toEqual({});
    expect(save.data.trialsClassic).toEqual({});
  });
  it('merges faster times separately across mixed-version tabs and keeps both through New Game', () => {
    load({ v: 3, trials: { 1: { ms: 90000, layout: 2 } }, trialsClassic: { 1: { ms: 52000, layout: 1 } } });
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 2, trials: { 1: { ms: 49000 } } }));
    save.write();
    expect(save.data.trials[1].ms).toBe(90000);
    expect(save.data.trialsClassic[1].ms).toBe(49000);
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 3, trials: { 1: { ms: 88000, layout: 2 } }, trialsClassic: { 1: { ms: 50000, layout: 1 } } }));
    save.reset();
    expect(save.data.trials[1].ms).toBe(88000);
    expect(save.data.trialsClassic[1].ms).toBe(49000);
  });
  it('shows a local Classic best and its separate archived world record', () => {
    load({ v: 3, trialsClassic: { 1: { ms: 52000, layout: 1 } } });
    const game = { _tops: { '1v2': { at: Date.now(), top: { value: 94000 }, classic: { value: 51000 } } } };
    const html = Game.prototype._worldLine.call(game, 1);
    expect(html).toContain('WORLD top 1:34.00');
    expect(html).toContain('Classic best 0:52.00');
    expect(html).toContain('Classic WR 0:51.00');
    versions.LAYOUT[1] = 1;
    game._tops['1'] = { at: Date.now(), top: { value: 51000 }, classic: { value: 51000 } };
    expect(Game.prototype._worldLine.call(game, 1)).not.toContain('Classic');
  });
  it('preserves an earned Golden Bone and old dog best through a partial extended clear', () => {
    save.setBone(1); save.setBestDogs(1, 5);
    const bank = vi.spyOn(hub, 'bank').mockResolvedValue(undefined);
    const show = vi.fn(), game = { _showComplete: show, playCutscene: (_scene, done) => done() };
    Game.prototype.levelCleared.call(game, { level: 1, levelTickets: 0,
      stats: { tickets: 0, broken: 41, breakables: 86, dogs: 4, dogsTotal: 9 } });
    expect(save.boneOf(1)).toBe(true);
    expect(save.bestDogsOf(1)).toBe(5);
    expect(show.mock.calls[0][1]).toMatchObject({ goldenEarned: true, broken: 41, breakables: 86 });
    bank.mockRestore();
  });
  it('finishes using the current variant targets and stamps the run layout', async () => {
    load({ v: 3, trialsClassic: { 1: { ms: 52000, layout: 1 } } });
    const bank = vi.spyOn(hub, 'bank').mockResolvedValue(undefined);
    const done = vi.fn(), game = { player: {}, ui: { trialTime: vi.fn(), fade: () => Promise.resolve() }, trialDone: done };
    const session = { game, level: 1, trialT: 85, deaths: 2, freezeMs: 1000, levelTickets: 0 };
    Session.prototype._finishTrial.call(session);
    await Promise.resolve();
    expect(save.data.trials[1]).toMatchObject({ ms: 85000, layout: 2, medal: 'platinum' });
    expect(save.data.trialsClassic[1].ms).toBe(52000);
    expect(done).toHaveBeenCalledWith(session, 85, 'platinum', true);
    bank.mockRestore();
  });
  it('renders the fourth target and its label without changing Classic targets', () => {
    const screen = vi.fn(), game = { ui: { setScreen: screen, screen: { style: {} }, fade: vi.fn() } };
    Game.prototype.trialDone.call(game, { level: 1 }, 85, 'platinum', true);
    expect(screen.mock.calls[0][0]).toContain('PLATINUM TAG!');
    expect(screen.mock.calls[0][0]).toContain('💎 1:26.00');
    expect(screen.mock.calls[0][0]).not.toContain('undefined');
    versions.LAYOUT[1] = 1;
    Game.prototype.trialDone.call(game, { level: 1 }, 54, 'gold', true);
    expect(screen.mock.calls[1][0]).not.toContain('💎');
  });
  it('keeps exact Classic/v2 floors and medal targets', () => {
    expect(trialVariant(1)).toBe('1v2');
    expect(trialVariant(3)).toBe('3');
    for (const [variant, floor] of [['1', 15000], ['2', 15000], ['3', 12000], ['1v2', 25700], ['2v2', 26000], ['3v2', 20600]]) {
      expect(trialMsInBounds(variant, floor)).toBe(true);
      expect(trialMsInBounds(variant, floor - 1)).toBe(false);
    }
    expect(trialMedal('1v2', 85)).toBe('platinum');
    expect(trialMedal('1v2', 94)).toBe('gold');
    expect(trialMedal('1', 55)).toBe('gold');
  });
});

describe('queue upgrade and production deployment gate', () => {
  it('drops only upgraded unsent Classic rows, retains posted history and the other levels', () => {
    localStorage.setItem(SCORE_QUEUE_KEY, JSON.stringify({ v: 1, rows: { p: {
      'nobu_trial_time:1': { ms: 52000 }, 'nobu_trial_time:3': { ms: 43000 },
    } }, posted: { p: { 1: 51000 } } }));
    expect(pendingRows('p').map((r) => r.variant)).toEqual(['3']);
    expect(knownBest('p', '1')).toBe(51000);
    expect(readQueue().v).toBe(2);
    versions.LAYOUT[3] = 2;
    expect(pendingRows('p')).toEqual([]); // works even after queue schema is already v2
  });
  it('does not queue or submit a v2 run before the owner confirms production support', async () => {
    await readyHub();
    expect(canUploadTrial('1v2')).toBe(false);
    expect(enqueue('player-1', '1v2', 90000)).toBe(false);
    expect(await hub.submitScore(90000, 1)).toBe(false);
    expect(pendingRows('player-1')).toEqual([]);
    expect(sdk.calls.score).toEqual([]);
  });
  it('uses separate variant keys, string metadata and floor validation after deployment', async () => {
    versions.HUB_LAYOUT[2] = 2;
    expect(enqueue('p', '2v2', 25999)).toBe(false);
    expect(enqueue('p', '2v2', 26000)).toBe(true);
    expect(pendingRows('p')).toMatchObject([{ variant: '2v2', level: 2, ms: 26000, meta: { level: '2v2', layout: 2 } }]);
    const send = vi.fn().mockResolvedValue({ accepted: true });
    await flushQueue({ submitScore: send }, 'p');
    expect(send).toHaveBeenCalledWith('nobu_trial_time', 26000, expect.objectContaining({ level: '2v2' }));
    expect(knownBest('p', '2v2')).toBe(26000);
    expect(knownBest('p', '2')).toBeNull();
  });
  it('retains bad_variant v2 errors for retry while Classic final errors stay terminal', () => {
    expect(classify(null, hubError('bad_variant'), '2v2')).toBe('keep');
    expect(classify({ accepted: false, reason: 'bad_variant' }, null, '2v2')).toBe('keep');
    expect(classify(null, hubError('bad_variant'), '2')).toBe('drop');
  });
  it('reads current and Classic boards through distinct cache keys', async () => {
    await readyHub();
    await hub.trialTop(1); await hub.trialTopClassic(1);
    expect(sdk.calls.board.map((c) => c.opts.variant)).toEqual(['1v2', '1']);
    await hub.trialTop(1); await hub.trialTopClassic(1);
    expect(sdk.calls.board).toHaveLength(2);
  });
});
