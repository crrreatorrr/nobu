// The feedback window's adapter: Game.hold()/release() freeze and restore any state, and
// feedbackContext() reads the session without throwing when parts are missing.
import { describe, it, expect, vi } from 'vitest';
import { Game } from '../src/game/game.js';
import { input } from '../src/core/input.js';
import { feedbackContext, installGameFeedback } from '../src/hub/feedback.js';

// The SDK's window is not under test here: keep the options NOBU passes to it.
const installed = vi.hoisted(() => ({ options: null }));
vi.mock('@metaverse/hub-sdk', async (importOriginal) => ({
  ...(await importOriginal()),
  installFeedback: (options) => {
    installed.options = options;
    return { open() {}, close() {}, isOpen: () => false, breadcrumb() {}, dispose: vi.fn() };
  },
  feedbackTransportFromSdk: () => ({ access: async () => ({ ok: true }), submit: async () => ({ id: 'T-1' }) }),
}));

function fakeGame(state) {
  const g = Object.create(Game.prototype);
  Object.assign(g, { state, held: false, still: false, last: 0, crash: { halted: false, frameOk() {}, frameFailed(e) { throw e; } },
    update: vi.fn(), render: vi.fn(), refreshPrompts() {}, ui: { update: vi.fn() } });
  return g;
}

describe('feedback hold', () => {
  it.each(['play', 'pause', 'cutscene', 'map'])('freezes and restores "%s" untouched', (state) => {
    const g = fakeGame(state);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    expect(input.held('right')).toBe(true);
    const token = g.hold();
    expect(input.held('right')).toBe(false);
    g.loop(1000, true); g.loop(1500, true);
    expect(g.update).not.toHaveBeenCalled();
    expect(g.ui.update).not.toHaveBeenCalled();
    expect(g.render).toHaveBeenCalledTimes(2);
    expect(g.state).toBe(state);
    g.release(token);
    expect(g.held).toBe(false);
    expect(g.state).toBe(state);
    g.loop(performance.now() + 16, true);
    expect(g.update).toHaveBeenCalledTimes(1);
    expect(g.update.mock.calls[0][0]).toBeLessThanOrEqual(0.05);
  });

  it('drops presses made while held', () => {
    const g = fakeGame('play');
    const token = g.hold();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    g.loop(1000, true);
    g.release(token);
    g.loop(1016, true);
    expect(input.pressed('pause')).toBe(false);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape' }));
  });

  it('has a SEND FEEDBACK pause item that opens the window', () => {
    const g = fakeGame('pause');
    g.feedback = { open: vi.fn() };
    g.pauseExitSel = null;
    g.pauseSel = g._pauseItems().findIndex((i) => i.id === 'feedback');
    expect(g.pauseSel).toBeGreaterThan(0);
    const confirm = vi.spyOn(input, 'confirmPressed').mockReturnValue(true);
    g.updatePause();
    confirm.mockRestore();
    expect(g.feedback.open).toHaveBeenCalledTimes(1);
    expect(g.state).toBe('pause');
  });
});

// SDK 0.7.2 draws the page's HTML over the canvas copy in the screenshot. The game draws no new
// frame from the copy until the window opens, so the HTML's fonts and images are not starved.
describe('feedback screenshot', () => {
  function install(state = 'pause') {
    const g = fakeGame(state);
    g.canvas = document.createElement('canvas');
    const handle = installGameFeedback(g, { transport: { access: async () => ({ ok: true }), submit: async () => ({ id: 'T-1' }) } });
    return { g, handle, options: installed.options };
  }

  it('copies the game canvas and lets the SDK draw the HTML UI over it', () => {
    const { g, handle, options } = install();
    expect(options.canvases()).toEqual([g.canvas]);
    expect(options.overlay).toBeUndefined();
    handle.dispose();
  });

  it('draws the frame to copy, then nothing until the window holds the game', () => {
    const { g, handle, options } = install('play');
    options.beforeCapture();
    expect(g.render).toHaveBeenCalledTimes(1);
    expect(g.still).toBe(true);
    g.loop(1000, true); g.loop(1016, true);
    expect(g.render).toHaveBeenCalledTimes(1);
    expect(g.update).not.toHaveBeenCalled();
    const token = options.pause();
    expect(g.still).toBe(false);
    expect(g.held).toBe(true);
    g.loop(1032, true);
    expect(g.render).toHaveBeenCalledTimes(2);
    options.resume(token);
    expect(g.held).toBe(false);
    g.loop(performance.now() + 16, true);
    expect(g.update).toHaveBeenCalledTimes(1);
    handle.dispose();
  });

  it('starts again by itself when no window opens, and on dispose', () => {
    vi.useFakeTimers();
    try {
      const { g, handle, options } = install();
      options.beforeCapture();
      vi.advanceTimersByTime(4999);
      expect(g.still).toBe(true);
      vi.advanceTimersByTime(1);
      expect(g.still).toBe(false);
      options.beforeCapture();
      handle.dispose();
      expect(g.still).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('feedbackContext', () => {
  it('reports a menu without a session', () => {
    expect(feedbackContext({ state: 'title' })).toMatchObject({ level: '', mode: 'menu', extra: { screen: 'title' } });
  });

  it('reports level, mode, position, clock, player and boss', () => {
    const ctx = feedbackContext({
      state: 'play', ui: { talking: false },
      player: { pos: { x: 1.234, y: 2, z: -3 }, vel: { x: 0, y: 0, z: 0 }, grounded: true, mode: 'normal', dead: false },
      session: { level: 1, trial: true, def: { name: 'Bark Jungle', tier: 1, bossKey: 'bird' }, phase: 'boss', trialT: 12.5, mask: 2, deaths: 3, deathsAtCp: 1,
        snack: { raw: 4, potential: 10 }, freedIds: new Set(['a']), dogsTotal: 5, cp: { pos: { x: 0, y: 0, z: 9 } },
        boss: { key: 'bird', phase: 2, hp: 4, maxHp: 6 } },
    });
    expect(ctx).toMatchObject({ level: '1', mode: 'time trial', position: { x: 1.23, y: 2, z: -3 }, gameTime: 12.5,
      player: { masks: 2, deaths: 3, checkpoint: { x: 0, y: 0, z: 9 }, grounded: true, state: 'normal', dogsFreed: 1 },
      extra: { levelName: 'Bark Jungle', layout: 2, variant: '1v2', phase: 'boss', boss: { key: 'bird', phase: 2, hp: 4 } } });
  });
});
