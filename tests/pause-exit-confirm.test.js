import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { input } from '../src/core/input.js';
import { Game } from '../src/game/game.js';

/** EXIT TO HUB from the pause menu (always mid-level) asks before leaving. */
function pausedGame() {
  const screen = { html: '' };
  const game = Object.create(Game.prototype);
  Object.assign(game, {
    state: 'play',
    session: null,
    ui: { pinHud: vi.fn(), clearScreen: vi.fn(), setScreen: (html) => { screen.html = html; } },
  });
  game._drawPause = vi.fn();
  game.exitToHub = vi.fn();
  game.openPause();
  game.pauseSel = game._pauseItems().findIndex((i) => i.id === 'hub');
  return { game, screen };
}

function press(action) {
  input._pressed = new Set([action]);
  input._anyPressed = true;
}

beforeEach(() => { input._pressed = new Set(); });
afterEach(() => { input._pressed = new Set(); vi.restoreAllMocks(); });

describe('pause menu EXIT TO HUB', () => {
  it('asks first instead of leaving, with KEEP PLAYING selected', () => {
    const { game, screen } = pausedGame();
    press('confirm');
    game.updatePause();
    expect(game.exitToHub).not.toHaveBeenCalled();
    expect(game.state).toBe('pause');
    expect(screen.html).toContain('EXIT TO HUB?');
    expect(screen.html).toMatch(/menu-item sel">KEEP PLAYING/);
  });

  it('leaves once EXIT TO HUB is confirmed', () => {
    const { game } = pausedGame();
    press('confirm');
    game.updatePause();
    press('down');
    game.updatePause();
    press('confirm');
    game.updatePause();
    expect(game.exitToHub).toHaveBeenCalledTimes(1);
  });

  it('KEEP PLAYING resumes the level', () => {
    const { game } = pausedGame();
    press('confirm');
    game.updatePause();
    press('confirm');
    game.updatePause();
    expect(game.exitToHub).not.toHaveBeenCalled();
    expect(game.state).toBe('play');
  });

  it('ESC backs out to the pause menu', () => {
    const { game } = pausedGame();
    press('confirm');
    game.updatePause();
    press('pause');
    game.updatePause();
    expect(game.exitToHub).not.toHaveBeenCalled();
    expect(game.state).toBe('pause');
    expect(game.pauseExitSel).toBeNull();
    expect(game._drawPause).toHaveBeenCalled();
  });

  it('a fresh pause starts on the pause menu, not the question', () => {
    const { game } = pausedGame();
    press('confirm');
    game.updatePause();
    game.openPause();
    expect(game.pauseExitSel).toBeNull();
  });
});
