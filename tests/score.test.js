import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { beforeEach, describe, expect, it } from 'vitest';
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
  it('submits nobu_trial_time only for a new best', () => {
    const session = trialSession(50);
    session._finishTrial();
    expect(sdk.calls.score).toEqual([
      { boardId: 'nobu_trial_time', value: 50, meta: { level: 1 } },
    ]);

    const worse = trialSession(60);
    worse._finishTrial();
    expect(sdk.calls.score).toHaveLength(1);

    const equal = trialSession(50);
    equal._finishTrial();
    expect(sdk.calls.score).toHaveLength(1);

    const better = trialSession(42);
    better._finishTrial();
    expect(sdk.calls.score).toHaveLength(2);
    expect(sdk.calls.score[1]).toMatchObject({ boardId: 'nobu_trial_time', value: 42, meta: { level: 1 } });
  });

  it('never submits a score in god mode', () => {
    save.data.godMode = true;
    const session = trialSession(30);
    session._finishTrial();
    expect(save.data.trials[1].best).toBe(30);
    expect(sdk.calls.score).toHaveLength(0);
  });

  it('does not retry a rejected score, and flush does not send it again', async () => {
    sdk.scoreError = hubError('rpc_failed', 'socket hang up');
    const session = trialSession(33);
    session._finishTrial();
    await Promise.resolve();
    expect(sdk.calls.score).toHaveLength(1);

    await hub.flush();
    expect(sdk.calls.score).toHaveLength(1);

    sdk.scoreError = null;
    const again = trialSession(33);
    again._finishTrial();
    expect(sdk.calls.score).toHaveLength(1);
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
