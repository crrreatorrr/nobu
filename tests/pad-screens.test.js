import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { input } from '../src/core/input.js';
import { Game } from '../src/game/game.js';
import { resetWorld } from './helpers.js';

// Real Input + real Game screen handlers on small fake game objects, with a fake standard pad.
let pads, buttons, axes;
const reset = () => { input.clear(); input.codes.clear(); input.down.clear(); input.pad.held.clear(); input.lastDevice = 'keyboard'; };
const press = (i) => { buttons[i].pressed = true; buttons[i].value = 1; input.poll(); };
const release = (i) => { buttons[i].pressed = false; buttons[i].value = 0; input.poll(); };
const key = (code, type = 'keydown') => { window.dispatchEvent(new KeyboardEvent(type, { code })); input.poll(); };

beforeEach(() => {
  resetWorld(); reset();
  buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
  axes = [0, 0, 0, 0];
  pads = [{ connected: true, index: 0, id: 'pad', mapping: 'standard', axes, buttons }];
  vi.stubGlobal('navigator', { getGamepads: () => pads });
  input.poll();
});
afterEach(() => { key('KeyQ', 'keyup'); pads = []; input.poll(); reset(); vi.unstubAllGlobals(); });

function playGame() {
  return { session: { dying: false, update: vi.fn() }, ui: { talking: false }, openPause: vi.fn(), _updateFlyingMasks: vi.fn(), camera: { peekInput: [0, 0] } };
}

test('Q is a left-hand Clown Collar dash key next to U', () => {
  key('KeyQ');
  expect(input.pressed('dash')).toBe(true); expect(input.held('dash')).toBe(true);
  key('KeyQ', 'keyup'); key('KeyU');
  expect(input.pressed('dash')).toBe(true);
  key('KeyU', 'keyup');
});

test('the right stick reaches the camera as a peek, and play keeps running', () => {
  const g = playGame();
  axes[2] = 1; input.poll();
  Game.prototype.updatePlay.call(g, 1 / 60);
  expect(g.camera.peekInput[0]).toBeGreaterThan(0.9);
  expect(g.session.update).toHaveBeenCalled(); expect(g.openPause).not.toHaveBeenCalled();
});

test('Start pauses; losing the pad mid-level pauses too, but only for a pad player', () => {
  const g = playGame();
  press(9); Game.prototype.updatePlay.call(g, 1 / 60);
  expect(g.openPause).toHaveBeenCalledOnce();
  release(9);
  pads = []; input.poll(); Game.prototype.updatePlay.call(g, 1 / 60);
  expect(g.openPause).toHaveBeenCalledTimes(2);

  // A keyboard player whose idle pad drops out keeps playing.
  pads = [{ connected: true, index: 0, id: 'pad', mapping: 'standard', axes, buttons }]; input.poll();
  key('KeyW'); key('KeyW', 'keyup');
  pads = []; input.poll(); Game.prototype.updatePlay.call(g, 1 / 60);
  expect(g.openPause).toHaveBeenCalledTimes(2);
});

test('pause menu: B and Backspace resume like Start and Esc', () => {
  for (const [down, up] of [[() => press(1), () => release(1)], [() => key('Backspace'), () => key('Backspace', 'keyup')], [() => press(9), () => release(9)]]) {
    const g = { pauseExitSel: null, pauseSel: 0, closePause: vi.fn(), _drawPause: vi.fn(), _pauseItems: Game.prototype._pauseItems };
    down(); Game.prototype.updatePause.call(g);
    expect(g.closePause).toHaveBeenCalledOnce();
    up();
  }
  const g = { pauseExitSel: 1, _drawPause: vi.fn(), _drawPauseExit: vi.fn(), _pauseExitItems: Game.prototype._pauseExitItems, updatePauseExit: Game.prototype.updatePauseExit, exitToHub: vi.fn() };
  press(1); Game.prototype.updatePause.call(g);
  expect(g.pauseExitSel).toBe(null); expect(g.exitToHub).not.toHaveBeenCalled();
});

test('a hub A press still held when the game loads does not skip the title screen', () => {
  pads = []; input.poll();
  buttons[0].pressed = true; buttons[0].value = 1;
  pads = [{ connected: true, index: 0, id: 'pad', mapping: 'standard', axes, buttons }];
  input.poll();
  expect(input.anyPressed()).toBe(false); expect(input.confirmPressed()).toBe(false);
  input.poll(); expect(input.held('jump')).toBe(false);
  release(0); press(0);
  expect(input.anyPressed()).toBe(true); expect(input.confirmPressed()).toBe(true);
});

test('map: Y is the time trial and View the Sniffer, so they never collide', () => {
  press(3);
  expect(input.pressed('trial')).toBe(true); expect(input.pressed('sniffer')).toBe(false);
  release(3); press(8);
  expect(input.pressed('sniffer')).toBe(true); expect(input.pressed('trial')).toBe(false); expect(input.pressed('back')).toBe(false);
  release(8);
  key('KeyE');
  expect(input.pressed('sniffer')).toBe(true); expect(input.pressed('bark')).toBe(true);
  key('KeyE', 'keyup');
});
