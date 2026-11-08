// Crash guard (src/core/crashGuard.js) and the main loop (Game.loop): one throw never stops the
// game forever, render runs inside the guard, CRASH_HALT_FRAMES failing frames in a row halt the
// game and show the "Something broke" panel, one bad frame recovers, and the console is not spammed.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../src/game/game.js';
import { CRASH_HALT_FRAMES, CRASH_LOG_LIMIT, CrashGuard } from '../src/core/crashGuard.js';
import { CRASH_PANEL_ID, CrashPanel } from '../src/ui/crashPanel.js';

let queued = [];
let now = 1000;

function pump(frames, game) {
  for (let i = 0; i < frames; i++) {
    const calls = queued;
    queued = [];
    now += 16.7;
    for (const fn of calls) fn(now);
  }
  return game;
}

function fakeGame({ updateThrows = () => false, renderThrows = () => false } = {}) {
  const log = vi.fn();
  const game = {
    last: now,
    crash: new CrashGuard(CRASH_HALT_FRAMES, CRASH_LOG_LIMIT, log),
    updates: 0,
    renders: 0,
    ui: { update: vi.fn() },
    update() {
      this.updates++;
      if (updateThrows(this.updates)) throw new Error('boom from update');
    },
    render() {
      this.renders++;
      if (renderThrows(this.renders)) throw new Error('boom from render');
    },
  };
  game.loop = (t, manual) => Game.prototype.loop.call(game, t, manual);
  return { game, log };
}

beforeEach(() => {
  queued = [];
  now = 1000;
  vi.stubGlobal('requestAnimationFrame', (fn) => {
    queued.push(fn);
    return queued.length;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('Game.loop survives exceptions', () => {
  it('keeps scheduling frames after update throws once, and recovers', () => {
    const { game } = fakeGame({ updateThrows: (n) => n === 2 });
    game.loop(now);
    pump(5, game);
    expect(queued.length).toBe(1);
    expect(game.updates).toBe(6);
    expect(game.crash.total).toBe(1);
    expect(game.crash.halted).toBe(false);
  });

  it('a throw from render() is caught too (render runs inside the guard)', () => {
    const { game } = fakeGame({ renderThrows: () => true });
    game.loop(now);
    pump(4, game);
    expect(queued.length).toBe(1);
    expect(game.crash.halted).toBe(true);
  });

  it('halts after CRASH_HALT_FRAMES failing frames: one halt, simulation paused, loop alive', () => {
    const { game } = fakeGame({ updateThrows: () => true });
    const halts = [];
    game.crash.onHalt((info) => halts.push(info));
    game.loop(now);
    pump(CRASH_HALT_FRAMES - 1, game);
    expect(game.crash.halted).toBe(true);
    const at = game.updates;
    pump(60, game);
    expect(game.updates).toBe(at);
    expect(queued.length).toBe(1);
    expect(halts.length).toBe(1);
  });

  it('does not spam the console when every frame throws', () => {
    const { game, log } = fakeGame({ updateThrows: () => true });
    game.loop(now);
    for (let i = 0; i < 600; i++) {
      pump(1, game);
      if (game.crash.halted) game.crash.resume();
    }
    expect(game.crash.total).toBeGreaterThan(500);
    expect(log.mock.calls.length).toBeLessThanOrEqual(CRASH_LOG_LIMIT + 2 + 600 / CRASH_HALT_FRAMES);
    expect(log.mock.calls[0][1]).toBeInstanceOf(Error);
  });

  it('a manual (hidden-tab) frame does not schedule another rAF', () => {
    const { game } = fakeGame({ updateThrows: () => true });
    game.loop(now, true);
    expect(queued.length).toBe(0);
    expect(game.crash.total).toBe(1);
  });
});

describe('CrashGuard', () => {
  it('a good frame resets the streak; boot failure halts at once', () => {
    const g = new CrashGuard(3, 5, () => {});
    g.frameFailed(new Error('a'));
    g.frameFailed(new Error('a'));
    g.frameOk();
    g.frameFailed(new Error('a'));
    expect(g.halted).toBe(false);
    g.report(new Error('chunk'), 'boot');
    expect(g.halted).toBe(true);
  });

  it('onCrash sees every error; a throwing listener does not break the guard', () => {
    const g = new CrashGuard(3, 5, () => {});
    const seen = [];
    g.onCrash(() => { throw new Error('bad listener'); });
    const off = g.onCrash((info) => seen.push(`${info.source}:${info.message}`));
    g.report(new Error('x'), 'frame');
    off();
    g.report(new Error('y'), 'frame');
    expect(seen).toEqual(['frame:Error: x']);
  });

  it('window error and unhandledrejection feed the same counter, logged once each', () => {
    const log = vi.fn();
    const g = new CrashGuard(3, 5, log);
    g.installGlobal(window);
    const err = new ErrorEvent('error', { error: new Error('handler threw'), message: 'handler threw', cancelable: true });
    window.dispatchEvent(err);
    const rej = new Event('unhandledrejection', { cancelable: true });
    rej.reason = new Error('rejected');
    window.dispatchEvent(rej);
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('handler threw'), message: 'handler threw', cancelable: true }));
    expect(g.total).toBe(3);
    expect(g.halted).toBe(true);
    expect(err.defaultPrevented).toBe(true);
    expect(log.mock.calls.filter((c) => /^\[Crash\] (error|unhandledrejection):/.test(c[0])).length).toBe(2);
    g.uninstallGlobal();
    const quiet = (e) => e.preventDefault(); // keep jsdom from reporting the test's own event
    window.addEventListener('error', quiet);
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('later'), cancelable: true }));
    window.removeEventListener('error', quiet);
    expect(g.total).toBe(3);
  });
});

describe('CrashPanel', () => {
  it('shows "Something broke" with a Reload button, once', () => {
    const reload = vi.fn();
    const panel = new CrashPanel(document, reload);
    panel.show('reload');
    panel.show('reload');
    const roots = document.querySelectorAll(`#${CRASH_PANEL_ID}`);
    expect(roots.length).toBe(1);
    expect(roots[0].textContent).toContain('Something broke');
    const button = roots[0].querySelector('button');
    expect(button.textContent).toBe('RELOAD');
    button.click();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('says RETRY for a boot failure', () => {
    new CrashPanel(document, () => {}).show('retry');
    expect(document.querySelector(`#${CRASH_PANEL_ID} button`).textContent).toBe('RETRY');
  });
});
