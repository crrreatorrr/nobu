import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { input } from '../src/core/input.js';
import { Game } from '../src/game/game.js';
import { save } from '../src/core/save.js';
import { audio } from '../src/audio/audio.js';
import { fullscreen } from '../src/ui/fullscreen.js';
import { ControlsScreen } from '../src/ui/controlsScreen.js';
import { CONTROLS_KEY, defaultControls } from '../src/core/controls.js';
import { PAD } from '../src/core/gamepad.js';
import { resetWorld } from './helpers.js';

// Every menu carries MAIN MENU (except the main menu itself), the hub, CONTROLLER SETTINGS and FULL SCREEN.
const STANDARD = ['title', 'hub', 'controls', 'fullscreen'];
const ids = (items) => items.map((i) => i.id);

function fakeUi() {
  const screen = document.createElement('div'), modal = document.createElement('div');
  return {
    screen, modal,
    setScreen(html) { screen.innerHTML = html; }, clearScreen() { screen.innerHTML = ''; },
    setModal(html) { modal.innerHTML = html; modal.className = 'screen modal show'; }, clearModal() { modal.innerHTML = ''; modal.className = 'screen modal'; },
    pinHud: vi.fn(), hideHud: vi.fn(), bossHide: vi.fn(), fade: vi.fn(() => Promise.resolve()), banner: vi.fn(),
  };
}
function game(extra = {}) {
  const g = Object.create(Game.prototype);
  Object.assign(g, { ui: fakeUi(), state: 'title', session: null, toTitle: vi.fn(), toMap: vi.fn(), exitToHub: vi.fn(), startLevel: vi.fn() }, extra);
  return g;
}
const press = (...actions) => { input._pressed = new Set(actions); input._anyPressed = true; };
let fsEnabled, fsElement;

beforeEach(() => {
  resetWorld();
  input.clear();
  vi.spyOn(audio, 'play').mockImplementation(() => {});
  fsEnabled = true; fsElement = null;
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => fsEnabled });
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fsElement });
  document.documentElement.requestFullscreen = vi.fn(() => { fsElement = document.documentElement; return Promise.resolve(); });
  document.exitFullscreen = vi.fn(() => { fsElement = null; return Promise.resolve(); });
  fullscreen.reset();
});
afterEach(() => {
  input.clear(); input.captureKey = null; input.setBindings(defaultControls());
  delete document.fullscreenEnabled; delete document.fullscreenElement;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('menu option sets', () => {
  it('title menu: hub, controller settings and full screen, but no MAIN MENU', () => {
    const g = game();
    const list = ids(g._titleItems());
    expect(list).toEqual(expect.arrayContaining(['hub', 'controls', 'fullscreen', 'new', 'wardrobe', 'model', 'pixel', 'god']));
    expect(list).not.toContain('title');
    expect(g._titleItems().find((i) => i.id === 'hub').label).toBe('RETURN TO HUB');
  });

  it('pause, game over and every system menu have the full set plus what they had', () => {
    const g = game();
    expect(ids(g._pauseItems())).toEqual(expect.arrayContaining([...STANDARD, 'resume', 'moves', 'wardrobe', 'model', 'pixel', 'music', 'sfx', 'rumble', 'feedback', 'quit']));
    expect(ids(g._gameOverItems())).toEqual(expect.arrayContaining([...STANDARD, 'continue']));
    for (const kind of ['map', 'kennel', 'complete']) expect(ids(g._sysItems(kind)), kind).toEqual(expect.arrayContaining([...STANDARD, 'resume']));
    expect(ids(g._sysItems('kennel'))).toContain('map');
  });

  it('FULL SCREEN is hidden where the browser cannot go full screen', () => {
    fsEnabled = false;
    const g = game();
    for (const items of [g._titleItems(), g._pauseItems(), g._gameOverItems(), g._sysItems('map')]) expect(ids(items)).not.toContain('fullscreen');
  });
});

describe('menu actions', () => {
  it('pause MAIN MENU asks first, then quits the level to the title', async () => {
    const g = game({ state: 'pause', session: { level: 2, def: {} } });
    g.openPause();
    g.pauseSel = ids(g._pauseItems()).indexOf('title');
    press('confirm'); g.updatePause();
    expect(g.toTitle).not.toHaveBeenCalled();
    expect(g.ui.screen.innerHTML).toContain('QUIT TO MAIN MENU?');
    expect(g.ui.screen.innerHTML).toMatch(/menu-item sel">KEEP PLAYING/);
    press('down'); g.updatePause();
    press('confirm'); g.updatePause();
    await Promise.resolve(); await Promise.resolve();
    expect(g.toTitle).toHaveBeenCalledOnce();
  });

  it('map: Esc opens its menu; MAIN MENU goes to the title; Esc closes it again', () => {
    const g = game({ state: 'map', mapSel: 1, _drawMap: vi.fn() });
    press('pause'); g.updateMap();
    expect(g.sysMenu?.kind).toBe('map');
    expect(g.ui.modal.innerHTML).toContain('MAIN MENU');
    press('pause'); g.update(0.016);
    expect(g.sysMenu).toBeNull();
    g.openSystemMenu('map');
    g.sysMenu.sel = ids(g._sysItems()).indexOf('title');
    press('confirm'); g.update(0.016);
    expect(g.toTitle).toHaveBeenCalledOnce(); expect(g.sysMenu).toBeNull();
  });

  it('results: Esc opens the menu; leaving the last story level still sets the Chapter 2 flag', () => {
    const g = game({ state: 'complete', completeMode: 'trial', completeT: 0, completeNext: { n: 3, bonus: false } });
    save.data.finished = false;
    press('pause'); g.update(0.016);
    expect(g.sysMenu?.kind).toBe('complete');
    expect(g.ui.screen.querySelector('.menu-tip')).toBeTruthy();
    g.sysMenu.sel = ids(g._sysItems()).indexOf('hub');
    press('confirm'); g.update(0.016);
    expect(g.exitToHub).toHaveBeenCalledOnce();
    expect(save.data.finished).toBe(true);
  });

  it('game over: up/down cycle through all five items and EXIT TO HUB leaves', () => {
    const g = game({ state: 'gameover', goT: 1, goSel: 0, session: { level: 1 }, _drawGameOver: vi.fn() });
    vi.spyOn(save, 'write').mockImplementation(() => {});
    for (let i = 0; i < 2; i++) { press('down'); g.updateGameOver(0); }
    expect(g._gameOverItems()[g.goSel].id).toBe('hub');
    press('confirm'); g.updateGameOver(0);
    expect(g.exitToHub).toHaveBeenCalledOnce();
  });

  it('a click on a menu item selects and activates it', () => {
    const g = game({ state: 'title', titleMenu: true, titleSel: 0 });
    g._drawTitleMenu = Game.prototype._drawTitleMenu;
    g.ui.screen.innerHTML = '';
    g.ui.setScreen(`<div class="menu" data-menu="title">${g._titleItems().map((it, i) => `<div data-mi="${i}" class="menu-item">${it.label}</div>`).join('')}</div>`);
    const hub = g.ui.screen.querySelector(`[data-mi="${ids(g._titleItems()).indexOf('hub')}"]`);
    g._onMenuClick({ target: hub });
    expect(g.exitToHub).toHaveBeenCalledOnce();
  });
});

describe('FULL SCREEN', () => {
  it('a confirm key on the item toggles inside keydown, and the menu frame does not toggle again', () => {
    const g = game({ state: 'pause', session: null });
    g.openPause();
    g.pauseSel = ids(g._pauseItems()).indexOf('fullscreen');
    input.gestureHook = (acts) => g._menuGesture(acts);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
    expect(document.documentElement.requestFullscreen).toHaveBeenCalledOnce();
    input.poll(); g.updatePause();
    expect(document.documentElement.requestFullscreen).toHaveBeenCalledOnce();
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' }));
    // A pad press has no keydown: the menu frame toggles (exits here).
    fullscreen.reset(); press('confirm'); g.updatePause();
    expect(document.exitFullscreen).toHaveBeenCalledOnce();
    expect(g._pauseItems().find((i) => i.id === 'fullscreen').label).toBe('FULL SCREEN: OFF');
    input.gestureHook = null;
  });

  it('a key on another item is not a full screen gesture', () => {
    const g = game({ state: 'pause', session: null });
    g.openPause();
    expect(g._menuGesture(['confirm'])).toBe(false);
    expect(document.documentElement.requestFullscreen).not.toHaveBeenCalled();
  });

  it('a refused request is caught and reported', async () => {
    const refused = vi.fn();
    fullscreen.onRefused = refused;
    document.documentElement.requestFullscreen = vi.fn(() => Promise.reject(new Error('no gesture')));
    expect(fullscreen.activate()).toBe(true);
    await Promise.resolve(); await Promise.resolve();
    expect(refused).toHaveBeenCalledOnce();
    fullscreen.onRefused = null;
  });
});

describe('CONTROLLER SETTINGS screen', () => {
  function screen(storage) {
    const ui = fakeUi(), onClose = vi.fn();
    const writes = vi.spyOn(save, 'write').mockImplementation(() => {});
    const s = new ControlsScreen({ ui, input, save, audio, onClose, storage });
    return { s, ui, onClose, writes };
  }
  const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m }; };

  it('lists every action with its keys and buttons', () => {
    const { ui } = screen(store());
    const text = ui.modal.textContent;
    for (const label of ['Jump', 'Bite', 'Slide', 'Mega Bark', 'Pause', 'air dash', 'Map: time trial', 'VIBRATION', 'LEFT STICK DEAD ZONE', 'RESET TO DEFAULTS', 'BACK']) expect(text).toContain(label);
    expect(ui.modal.querySelector('[data-ctl-row="4"]').textContent).toContain('SPACE'); // jump, KEY 1
  });

  it('binds a pressed key, saves it, applies it, and Reset restores the defaults', () => {
    const st = store();
    const { s } = screen(st);
    s.row = 4; s.col = 0; // Jump, KEY 1
    input._rawKeys = new Set(['Enter']); s.update(0.016);
    expect(s.listening).toBeTruthy();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
    s.update(0.016);
    expect(s.listening).toBeNull();
    expect(input.controls.keys.jump[0]).toBe('KeyM');
    expect(JSON.parse(st.m.get(CONTROLS_KEY)).keys.jump[0]).toBe('KeyM');
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyM' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' })); input.poll();
    expect(input.pressed('jump')).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyM' }));
    s.reset();
    expect(input.controls.keys.jump).toEqual(['Space']);
  });

  it('Esc cancels a bind; a pad button binds a pad slot; B and Esc close it', () => {
    const { s, onClose } = screen(store());
    s.row = 5; s.col = 2; // Bite, PAD 1
    s.activate();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    s.update(0.016);
    expect(s.listening).toBeNull(); expect(input.controls.pad.bite[0]).toBe(PAD.X);
    s.activate();
    input._padButtons = new Set([PAD.R3]); s.update(0.016);
    expect(input.controls.pad.bite[0]).toBe(PAD.R3);
    input._padButtons = new Set([PAD.B]); s.update(0.016);
    expect(onClose).toHaveBeenCalledOnce(); expect(s.closed).toBe(true);
  });

  it('toggles vibration in the save and nudges the dead zone', () => {
    const { s, writes } = screen(store());
    s.row = s.rows.findIndex((r) => r.kind === 'vibration');
    save.data.rumble = true;
    s.activate();
    expect(save.data.rumble).toBe(false); expect(writes).toHaveBeenCalled();
    s.row = s.rows.findIndex((r) => r.kind === 'deadzone');
    input._rawKeys = new Set(['ArrowRight']); s.update(0.016);
    expect(input.controls.leftDeadzone).toBe(0.25);
    expect(input.padReader.tuning.leftDeadzone).toBe(0.25);
  });

  it('a listen with no answer times out', () => {
    const { s } = screen(store());
    s.row = 4; s.col = 1; s.activate();
    for (let i = 0; i < 6; i++) s.update(1);
    expect(s.listening).toBeNull(); expect(input.captureKey).toBeNull();
  });
});
