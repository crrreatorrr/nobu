// Classic regression fixtures; active layout2 migration/upload gating is checked separately.
vi.mock('../src/config/trialLayouts.js',()=>({LAYOUT:{1:1,2:1,3:1},HUB_LAYOUT:{1:1,2:1,3:1}}));
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hub } from '../src/hub/hubBridge.js';
import {
  SCORE_QUEUE_KEY,
  classify,
  enqueue,
  flushQueue,
  knownBest,
  pendingRows,
  readQueue,
  retryDelay,
} from '../src/hub/scoreQueue.js';
import { grantSession, readyHub, resetHub, resetWorld } from './helpers.js';
import { hubError, sdk } from './sdkState.js';

beforeEach(() => {
  resetWorld();
});

describe('score queue', () => {
  it('a score set while the hub is unreachable is queued and sent on the next init', async () => {
    grantSession();
    sdk.initError = hubError('rpc_failed', 'offline');
    await hub.init();
    expect(hub.reach).toBe('offline');
    expect(hub.inSession).toBe(true);
    await hub.submitScore(41000, 2, { deaths: 0, freezeMs: 0 });
    expect(sdk.calls.score).toHaveLength(0);
    expect(pendingRows('player-1')).toEqual([expect.objectContaining({ level: 2, ms: 41000 })]);

    sdk.initError = null;
    resetHub(hub);
    await hub.init();
    expect(sdk.calls.score).toEqual([
      { boardId: 'nobu_trial_time', value: 41000, meta: expect.objectContaining({ level: 2, v: 1 }) },
    ]);
    expect(pendingRows('player-1')).toEqual([]);
    expect(knownBest('player-1', 2)).toBe(41000);
  });

  it('keeps the row on session_closed, rate_limited and transport errors', async () => {
    await readyHub();
    for (const code of ['session_closed', 'not_game_session', 'rate_limited', 'rpc_failed']) {
      sdk.scoreError = hubError(code);
      await hub.submitScore(40000, 1);
      await hub.flushScores();
      hub.cancelScoreRetry();
      expect(pendingRows('player-1').map((r) => r.ms)).toEqual([40000]);
    }
    expect(pendingRows('player-1')[0].tries).toBeGreaterThan(0);
  });

  it('keeps the row when an old SDK resolves nothing', async () => {
    await readyHub();
    sdk.scoreLegacy = true;
    await hub.submitScore(40000, 1);
    hub.cancelScoreRetry();
    expect(sdk.calls.score).toHaveLength(1);
    expect(pendingRows('player-1').map((r) => r.ms)).toEqual([40000]);
  });

  it('drops the row on implausible_score and the other final codes', async () => {
    await readyHub();
    for (const code of ['implausible_score', 'bad_board', 'bad_score', 'bad_variant']) {
      sdk.scoreError = hubError(code);
      await hub.submitScore(40000, 1);
      expect(pendingRows('player-1')).toEqual([]);
      // Not acked, so the same time may be queued again.
      expect(knownBest('player-1', 1)).toBe(null);
    }
  });

  it('drops the row on god_mode / server_board / unranked without marking it posted', async () => {
    await readyHub();
    for (const reason of ['god_mode', 'server_board', 'unranked']) {
      sdk.scoreImpl = () => ({ accepted: false, reason });
      await hub.submitScore(40000, 1);
      expect(pendingRows('player-1')).toEqual([]);
      expect(knownBest('player-1', 1)).toBe(null);
    }
  });

  it('keeps only the fastest time per level, and never one slower than what the hub holds', async () => {
    expect(enqueue('p', 1, 50000, {})).toBe(true);
    expect(enqueue('p', 1, 52000, {})).toBe(false);
    expect(enqueue('p', 1, 50000, {})).toBe(false);
    expect(enqueue('p', 1, 47000, {})).toBe(true);
    expect(enqueue('p', 3, 30000, {})).toBe(true);
    expect(pendingRows('p').map((r) => [r.level, r.ms])).toEqual([[1, 47000], [3, 30000]]);

    const fake = { submitScore: async (_b, value) => ({ accepted: true, posted: true, value: value - 1000 }) };
    const res = await flushQueue(fake, 'p');
    expect(res).toMatchObject({ sent: 2, acked: 2, kept: 0 });
    // The hub said it holds 46 s, so 46.5 s is not worth sending.
    expect(knownBest('p', 1)).toBe(46000);
    expect(enqueue('p', 1, 46500, {})).toBe(false);
    expect(enqueue('p', 1, 45000, {})).toBe(true);
  });

  it('keeps each player separate and flushes only the current one', async () => {
    enqueue('player-1', 1, 50000, {});
    enqueue('someone-else', 1, 20000, {});
    await readyHub();
    expect(sdk.calls.score.map((c) => c.value)).toEqual([50000]);
    expect(pendingRows('someone-else').map((r) => r.ms)).toEqual([20000]);
    expect(readQueue().posted['someone-else']).toBeUndefined();
  });

  it('never queues out-of-bounds or non-integer times', () => {
    expect(enqueue('p', 1, 14999, {})).toBe(false);
    expect(enqueue('p', 3, 11999, {})).toBe(false);
    expect(enqueue('p', 3, 12000, {})).toBe(true);
    expect(enqueue('p', 2, 1_800_001, {})).toBe(false);
    expect(enqueue('p', 2, 40000.5, {})).toBe(false);
    expect(enqueue('p', 7, 40000, {})).toBe(false);
    expect(enqueue('p', 'ride', 40000, {})).toBe(false);
    expect(enqueue('', 1, 40000, {})).toBe(false);
    expect(pendingRows('p').map((r) => r.ms)).toEqual([12000]);
  });

  it('a standalone run is never queued', async () => {
    await hub.init();
    expect(hub.inSession).toBe(false);
    await hub.submitScore(40000, 1);
    expect(localStorage.getItem(SCORE_QUEUE_KEY)).toBe(null);
  });

  it('survives unreadable queue storage', () => {
    localStorage.setItem(SCORE_QUEUE_KEY, '{nope');
    expect(pendingRows('p')).toEqual([]);
    expect(enqueue('p', 1, 40000, {})).toBe(true);
    expect(pendingRows('p').map((r) => r.ms)).toEqual([40000]);
  });

  it('classifies answers', () => {
    expect(classify({ accepted: true, posted: false })).toBe('ack');
    expect(classify(undefined)).toBe('keep');
    expect(classify(null, hubError('rate_limited'))).toBe('keep');
    expect(classify(null, new Error('fetch failed'))).toBe('keep');
    expect(classify(null, hubError('implausible_score'))).toBe('drop');
    expect(classify({ accepted: false, reason: 'unranked' })).toBe('drop');
  });

  it('backs off 2 s, 10 s, 60 s, then 5 min', () => {
    expect([1, 2, 3, 4, 9].map(retryDelay)).toEqual([2000, 10000, 60000, 300000, 300000]);
  });

  it('flushes again when the tab becomes visible or the network comes back', async () => {
    await readyHub();
    sdk.scoreError = hubError('rpc_failed');
    await hub.submitScore(40000, 1);
    hub.cancelScoreRetry();
    sdk.scoreError = null;
    window.dispatchEvent(new Event('online'));
    await hub._scoreJob;
    expect(pendingRows('player-1')).toEqual([]);
    expect(sdk.calls.score).toHaveLength(2);

    sdk.scoreError = hubError('rpc_failed');
    await hub.submitScore(39000, 1);
    hub.cancelScoreRetry();
    sdk.scoreError = null;
    document.dispatchEvent(new Event('visibilitychange'));
    await hub._scoreJob;
    expect(pendingRows('player-1')).toEqual([]);
  });

  it('the map reads the world record through getLeaderboard and shows nothing without it', async () => {
    await readyHub();
    await hub.submitScore(40000, 1);
    const top = await hub.trialTop(1);
    expect(top).toMatchObject({ value: 40000, me: { rank: 1, value: 40000 } });
    expect(sdk.calls.board[0]).toEqual({ boardId: 'nobu_trial_time', opts: { variant: '1', limit: 1 } });
    // Cached for a minute.
    await hub.trialTop(1);
    expect(sdk.calls.board).toHaveLength(1);

    resetWorld();
    sdk.noBoardRead = true;
    await readyHub();
    expect(await hub.trialTop(1)).toBe(null);

    resetWorld();
    await hub.init();
    expect(await hub.trialTop(1)).toBe(null);
  });
});
