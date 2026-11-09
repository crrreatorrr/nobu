// Classic regression fixtures; active layout2 migration/upload gating is checked separately.
vi.mock('../src/config/trialLayouts.js',()=>({LAYOUT:{1:1,2:1,3:1},HUB_LAYOUT:{1:1,2:1,3:1}}));
import { createChain } from '../src/game/rewards.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { save } from '../src/core/save.js';
import { hub } from '../src/hub/hubBridge.js';
import { Session } from '../src/game/session.js';
import { readyHub, resetWorld } from './helpers.js';
import { hubError, sdk } from './sdkState.js';

const execFileAsync = promisify(execFile);

beforeEach(async () => {
  resetWorld();
  await readyHub();
});

function trialSession(seconds) {
  const session = Object.create(Session.prototype);
  session.chain = createChain();
  session.level = 1;
  session.levelTickets = 0;
  session.trialT = seconds;
  session.trialRunning = true;
  session.attemptId = null;
  session.attemptDurable = false;
  session.game = {
    ui: { trialTime() {}, fade: () => Promise.resolve() },
    player: { frozen: false },
    trialDone() {},
  };
  return session;
}

describe('case 6: trial score and window.__nobu', () => {
  it('submits nobu_trial_time in integer ms with the level as variant, once per new best', async () => {
    const session = trialSession(50);
    session._finishTrial();
    await hub.flushScores();
    expect(sdk.calls.score).toHaveLength(1);
    expect(sdk.calls.score[0]).toMatchObject({
      boardId: 'nobu_trial_time',
      value: 50000,
      meta: { level: 1, deaths: 0, freezeMs: 0, v: 1 },
    });
    expect(typeof sdk.calls.score[0].meta.build).toBe('string');
    expect(save.data.trials[1]).toMatchObject({ best: 50, ms: 50000, medal: 'platinum', pid: 'player-1' });

    const worse = trialSession(60);
    worse._finishTrial();
    await hub.flushScores();
    expect(sdk.calls.score).toHaveLength(1);

    const equal = trialSession(50);
    equal._finishTrial();
    await hub.flushScores();
    expect(sdk.calls.score).toHaveLength(1);

    const better = trialSession(42.3456);
    better._finishTrial();
    await hub.flushScores();
    expect(sdk.calls.score).toHaveLength(2);
    expect(sdk.calls.score[1]).toMatchObject({ boardId: 'nobu_trial_time', value: 42346, meta: { level: 1 } });
  });

  it('sends deaths and freeze time as meta', async () => {
    const session = trialSession(40);
    session.deaths = 2;
    session.freezeMs = 3000;
    session._finishTrial();
    await hub.flushScores();
    expect(sdk.calls.score[0].meta).toMatchObject({ level: 1, deaths: 2, freezeMs: 3000 });
  });

  it('never submits a score in god mode, and a god-mode record is never uploaded later', async () => {
    save.data.godMode = true;
    const session = trialSession(30);
    session._finishTrial();
    await hub.flushScores();
    expect(save.data.trials[1].best).toBe(30);
    expect(save.data.trials[1].pid).toBe(null);
    expect(sdk.calls.score).toHaveLength(0);

    save.data.godMode = false;
    const slower = trialSession(45);
    slower._finishTrial();
    await hub.flushScores();
    // Only this run goes, not the god-mode 30 s.
    expect(sdk.calls.score.map((c) => c.value)).toEqual([45000]);
  });

  it('keeps a failed score queued and sends it again on the next flush', async () => {
    sdk.scoreError = hubError('rpc_failed', 'socket hang up');
    const session = trialSession(33);
    session._finishTrial();
    await hub.flushScores();
    expect(sdk.calls.score).toHaveLength(1);
    hub.cancelScoreRetry();

    sdk.scoreError = null;
    await hub.flushScores();
    expect(sdk.calls.score).toHaveLength(2);
    expect(sdk.calls.score[1]).toMatchObject({ value: 33000, meta: { level: 1 } });

    // Acked: nothing left to send.
    await hub.flushScores();
    expect(sdk.calls.score).toHaveLength(2);
  });

  it('a slower run resends this player\'s own local best when its first send was lost', async () => {
    sdk.scoreError = hubError('session_closed');
    trialSession(33)._finishTrial();
    await hub.flushScores();
    hub.cancelScoreRetry();
    // The queue row is lost too (another device cleared storage, say). The save still has the best.
    localStorage.removeItem('nobu-hub-scores-v1');
    sdk.scoreError = null;
    trialSession(48)._finishTrial();
    await hub.flushScores();
    expect(sdk.calls.score.map((c) => c.value)).toEqual([33000, 33000]);
  });

  it('the production build does not assign window.__nobu', async () => {
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf8');
    expect(main).toContain('import.meta.env.DEV');
    expect(main).toContain('window.__nobu');

    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nobu-prod-'));
    await execFileAsync(process.execPath, [
      path.resolve('node_modules/vite/bin/vite.js'),
      'build',
      '--outDir', outDir,
      '--emptyOutDir',
      '--logLevel', 'error',
    ], {
      cwd: path.resolve('.'),
      timeout: 180000,
      // Vitest sets NODE_ENV=test. Vite keeps import.meta.env.DEV true in that
      // case, so the child has to build as a real production bundle.
      env: { ...process.env, NODE_ENV: 'production' },
    });

    const js = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.js')) js.push(fs.readFileSync(full, 'utf8'));
      }
    };
    walk(outDir);
    expect(js.length).toBeGreaterThan(0);
    expect(js.join('\n')).not.toContain('__nobu');
  }, 180000);
});
