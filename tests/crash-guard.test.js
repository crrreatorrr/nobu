// Crash guard (src/core/crashGuard.js) and the main loop (Game.loop): one throw never stops the
// game forever, render runs inside the guard, CRASH_HALT_FRAMES failing frames in a row halt the
// game and show the "Something broke" panel, one bad frame recovers, and the console is not spammed.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../src/game/game.js';
import { CRASH_HALT_FRAMES, CRASH_LOG_LIMIT, CrashGuard, isBenignError, isBenignRejection } from '../src/core/crashGuard.js';
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
    crash: new CrashGuard(CRASH_HALT_FRAMES, CRASH_LOG_LIMIT, log, null),
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
    // Every line the guard writes (errors, the halt line, the "further errors" note) fits the cap.
    expect(log.mock.calls.length).toBeLessThanOrEqual(CRASH_LOG_LIMIT);
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

  it('window error and unhandledrejection are counted and never preventDefault-ed', () => {
    const log = vi.fn();
    const g = new CrashGuard(3, 5, log, null);
    g.installGlobal(window);
    const thrown = new Error('handler threw');
    const err = new ErrorEvent('error', { error: thrown, message: 'handler threw', cancelable: true });
    window.dispatchEvent(err);
    const rej = new Event('unhandledrejection', { cancelable: true });
    rej.reason = new Error('rejected');
    window.dispatchEvent(rej);
    window.dispatchEvent(new ErrorEvent('error', { error: thrown, message: 'handler threw', cancelable: true }));
    expect(g.total).toBe(3);
    // The browser keeps logging them itself (past our log cap, too).
    expect(err.defaultPrevented).toBe(false);
    expect(rej.defaultPrevented).toBe(false);
    expect(log.mock.calls.filter((c) => /^\[Crash\] (error|unhandledrejection):/.test(c[0])).length).toBe(2);
    g.uninstallGlobal();
    const quiet = (e) => e.preventDefault(); // keep jsdom from reporting the test's own event
    window.addEventListener('error', quiet);
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('later'), cancelable: true }));
    window.removeEventListener('error', quiet);
    expect(g.total).toBe(3);
  });

  it('global errors alone never halt the game (async preload, a hidden tab)', () => {
    const g = new CrashGuard(3, 5, () => {}, null);
    const { fire } = fakeWindow(g);
    for (let i = 0; i < 10; i++) fire('unhandledrejection', { reason: new Error(`fetch ${i}`) });
    expect(g.total).toBe(10);
    expect(g.halted).toBe(false);
    g.frameFailed(new Error('frame')); // a streak of one, not eleven
    expect(g.halted).toBe(false);
  });

  it('global errors can tip the halt once the streak has a failing frame', () => {
    const g = new CrashGuard(3, 5, () => {}, null);
    const { fire } = fakeWindow(g);
    g.frameFailed(new Error('frame'));
    fire('error', { error: new Error('a'), message: 'a' });
    expect(g.halted).toBe(false);
    fire('error', { error: new Error('b'), message: 'b' });
    expect(g.halted).toBe(true);
  });

  it('resetStreak (boot done, tab visible again) clears the streak but not a halt', () => {
    const g = new CrashGuard(3, 5, () => {}, null);
    g.frameFailed(new Error('a'));
    g.frameFailed(new Error('a'));
    g.resetStreak();
    g.frameFailed(new Error('a'));
    expect(g.halted).toBe(false);
    g.frameFailed(new Error('a'));
    g.frameFailed(new Error('a'));
    expect(g.halted).toBe(true);
    g.resetStreak();
    expect(g.halted).toBe(true);
  });

  it('ignores browser noise and other origins', () => {
    const g = new CrashGuard(3, 5, () => {}, null);
    const { fire } = fakeWindow(g, 'https://game.example');
    fire('error', { message: 'ResizeObserver loop completed with undelivered notifications.', error: null });
    fire('error', { message: 'Script error.', error: null, filename: '' });
    fire('error', { message: 'Uncaught Error: ext', error: new Error('ext'), filename: 'chrome-extension://abc/content.js' });
    fire('error', { message: 'Uncaught Error: ad', error: new Error('ad'), filename: 'https://ads.example/x.js' });
    fire('unhandledrejection', { reason: Object.assign(new Error('The play() request was interrupted'), { name: 'AbortError' }) });
    fire('unhandledrejection', { reason: { name: 'NotAllowedError', message: 'autoplay refused' } });
    expect(g.total).toBe(0);
    fire('error', { message: 'Uncaught Error: ours', error: new Error('ours'), filename: 'https://game.example/assets/index.js' });
    fire('error', { message: 'Uncaught Error: nofile', error: new Error('nofile'), filename: '' });
    expect(g.total).toBe(2);
    expect(isBenignError({ message: 'Script error.', error: new Error('x') }, 'https://game.example')).toBe(false);
    expect(isBenignError({ message: 'x', error: new Error('x'), filename: '/a.js' }, 'https://game.example')).toBe(false);
    expect(isBenignRejection(new Error('a'))).toBe(false);
  });

  it('hands each new frame error to reportError once, without counting it twice', () => {
    const surfaced = [];
    let fire;
    // Like the browser's reportError: it dispatches a window "error" event for the same object.
    const g = new CrashGuard(10, 5, () => {}, (err) => {
      surfaced.push(err);
      fire('error', { error: err, message: err.message });
    });
    fire = fakeWindow(g).fire;
    const throwAt = (msg) => { try { throw new Error(msg); } catch (err) { return err; } };
    const a1 = throwAt('a');
    g.frameFailed(a1);
    g.frameFailed(a1);
    g.frameFailed(throwAt('b'));
    expect(surfaced).toEqual([a1, expect.objectContaining({ message: 'b' })]);
    expect(g.total).toBe(3);
    fire('error', { error: new Error('c'), message: 'c' }); // global errors are not re-surfaced
    expect(surfaced.length).toBe(2);
  });

  it('Game.loop surfaces its error so page-error checks still see it', () => {
    const { game } = fakeGame({ updateThrows: (n) => n === 2 });
    const surfaced = [];
    game.crash = new CrashGuard(CRASH_HALT_FRAMES, CRASH_LOG_LIMIT, () => {}, (err) => surfaced.push(err));
    game.loop(now);
    pump(4, game);
    expect(surfaced.map((e) => e.message)).toEqual(['boom from update']);
  });

  it('dedupes by message and stack, not message alone', () => {
    const log = vi.fn();
    const g = new CrashGuard(100, 5, log, null);
    const e1 = new Error('same'); e1.stack = 'Error: same\n    at a (game.js:1:1)';
    const e2 = new Error('same'); e2.stack = 'Error: same\n    at b (game.js:9:9)';
    const e3 = new Error('same'); e3.stack = e1.stack;
    g.frameFailed(e1); g.frameFailed(e2); g.frameFailed(e3);
    expect(log).toHaveBeenCalledTimes(2);
  });

  it('keeps the "further errors" note and the halt line inside the log cap', () => {
    const log = vi.fn();
    const g = new CrashGuard(3, 5, log, null);
    for (let i = 0; i < 20; i++) g.frameFailed(new Error(`distinct ${i}`));
    expect(log.mock.calls.length).toBe(5);
    expect(String(log.mock.calls[4][0])).toContain('further errors are counted but not logged');
    expect(log.mock.calls.some((c) => String(c[0]).includes('halted'))).toBe(true);
  });

  it('describes non-Error rejection reasons usefully', () => {
    const g = new CrashGuard(3, 5, () => {}, null);
    const seen = [];
    g.onCrash((info) => seen.push(info.message));
    const img = document.createElement('img');
    img.src = 'https://game.example/a.png';
    const ev = new Event('error');
    img.dispatchEvent(ev);
    g.report(ev, 'unhandledrejection');
    g.report({ name: 'NetworkError', message: 'offline' }, 'unhandledrejection');
    g.report({ code: 7 }, 'unhandledrejection');
    expect(seen).toEqual(['Event "error" on <img src="https://game.example/a.png">', 'NetworkError: offline', '{"code":7}']);
  });
});

/** A stand-in window: install the guard, then fire events at its listeners. */
function fakeWindow(g, origin = 'https://game.example') {
  const listeners = {};
  const target = {
    addEventListener: (type, fn) => (listeners[type] ??= []).push(fn),
    removeEventListener: (type, fn) => { listeners[type] = (listeners[type] || []).filter((f) => f !== fn); },
  };
  g.installGlobal(target, origin);
  const fire = (type, extra) => { for (const fn of (listeners[type] || []).slice()) fn({ type, ...extra }); };
  return { fire, listeners };
}

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
