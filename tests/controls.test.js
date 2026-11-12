import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACTION_IDS, CONTROLS_KEY, DEFAULT_DEADZONE, bind, defaultControls, keymapOf, loadControls, normalizeControls,
  padLayoutOf, saveControls, setDeadzone, unbind, keyLabel, buttonLabel,
} from '../src/core/controls.js';
import { PAD, PAD_LAYOUT } from '../src/core/gamepad.js';
import { input } from '../src/core/input.js';

// The pre-remap key map from input.js, kept here so the defaults cannot drift from the README layout.
const OLD_KEYMAP = {
  ArrowLeft: ['left'], KeyA: ['left'], ArrowRight: ['right'], KeyD: ['right'], ArrowUp: ['up'], KeyW: ['up'], ArrowDown: ['down'], KeyS: ['down'],
  Space: ['jump'], KeyJ: ['bite'], ShiftLeft: ['bite'], ShiftRight: ['bite'], KeyK: ['slide'], ControlLeft: ['slide'], ControlRight: ['slide'],
  KeyL: ['bark', 'sniffer'], KeyE: ['bark', 'sniffer'], KeyT: ['trial'], KeyG: ['gauntlet'], KeyR: ['remix'], KeyI: ['wardrobe'],
  KeyU: ['dash'], KeyQ: ['dash'], KeyX: ['exchange'], KeyH: ['hub'], Escape: ['pause'], KeyP: ['pause'], Enter: ['confirm'], Backspace: ['back'],
};

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m }; };
const key = (code, type = 'keydown') => { window.dispatchEvent(new KeyboardEvent(type, { code })); input.poll(); };
let buttons, pads;

beforeEach(() => {
  buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
  pads = [{ connected: true, index: 0, id: 'pad', mapping: 'standard', axes: [0, 0, 0, 0], buttons }];
  vi.stubGlobal('navigator', { getGamepads: () => pads });
  input.setBindings(defaultControls());
  input.clear(); input.codes.clear(); input._recompute(); input.poll();
});
afterEach(() => { input.setBindings(defaultControls()); input.codes.clear(); input._recompute(); input.clear(); vi.unstubAllGlobals(); });

describe('defaults', () => {
  it('are the shipped keyboard map and pad layout', () => {
    const map = keymapOf(defaultControls());
    for (const [code, acts] of Object.entries(OLD_KEYMAP)) expect([...map[code]].sort(), code).toEqual([...acts].sort());
    expect(Object.keys(map).sort()).toEqual(Object.keys(OLD_KEYMAP).sort());
    const layout = padLayoutOf(defaultControls());
    for (const [action, list] of Object.entries(PAD_LAYOUT)) expect(layout[action]).toEqual(list);
    expect(defaultControls().leftDeadzone).toBe(0.2);
  });

  it('every action has a key, and labels read well', () => {
    const c = defaultControls();
    for (const id of ACTION_IDS) expect(c.keys[id].length, id).toBeGreaterThan(0);
    expect(keyLabel('KeyJ')).toBe('J'); expect(keyLabel('Space')).toBe('SPACE'); expect(keyLabel('ArrowUp')).toBe('↑');
    expect(buttonLabel(PAD.A)).toBe('A'); expect(buttonLabel(PAD.LT)).toBe('LT'); expect(buttonLabel(undefined)).toBe('—');
  });
});

describe('binding', () => {
  it('swaps a key taken by another action in the same group', () => {
    const c = defaultControls();
    const res = bind(c, 'keys', 'jump', 0, 'KeyJ'); // J was Bite
    expect(res).toEqual({ ok: true, swapped: 'bite' });
    expect(c.keys.jump).toEqual(['KeyJ']);
    expect(c.keys.bite).toEqual(['Space', 'ShiftLeft', 'ShiftRight']);
  });

  it('lets a map shortcut share a gameplay key (different screens), as the defaults do', () => {
    const c = defaultControls();
    expect(bind(c, 'keys', 'trial', 0, 'KeyJ')).toEqual({ ok: true });
    expect(c.keys.bite).toContain('KeyJ'); expect(c.keys.trial).toEqual(['KeyJ']);
  });

  it('swaps pad buttons too, and appends into an empty second slot', () => {
    const c = defaultControls();
    expect(bind(c, 'pad', 'bark', 0, PAD.A)).toEqual({ ok: true, swapped: 'jump' });
    expect(c.pad.bark).toEqual([PAD.A]); expect(c.pad.jump).toEqual([PAD.Y]);
    expect(bind(c, 'pad', 'jump', 1, PAD.R3)).toEqual({ ok: true });
    expect(c.pad.jump).toEqual([PAD.Y, PAD.R3]);
  });

  it('refuses reserved keys and leaves the bindings alone', () => {
    const c = defaultControls(), before = JSON.stringify(c);
    for (const code of ['Escape', 'KeyN', 'Digit9', 'F11', 'Tab']) expect(bind(c, 'keys', 'jump', 0, code).ok, code).toBe(false);
    expect(bind(c, 'pad', 'jump', 0, 16).ok).toBe(false); // Home
    expect(JSON.stringify(c)).toBe(before);
  });

  it('refuses a swap that would leave the other action with nothing', () => {
    const c = defaultControls();
    bind(c, 'keys', 'jump', 1, 'KeyM'); // jump: Space, M
    const before = JSON.stringify(c);
    // Bite's empty slot takes Space: jump keeps M. Then taking M too would leave jump empty.
    expect(bind(c, 'keys', 'bite', 3, 'Space').ok).toBe(true);
    expect(c.keys.jump).toEqual(['KeyM']);
    expect(bind(c, 'keys', 'bite', 4, 'KeyM')).toMatchObject({ ok: false, reason: 'conflict', with: 'jump' });
    expect(JSON.stringify(c)).not.toBe(before);
    expect(c.keys.jump).toEqual(['KeyM']);
  });

  it('clears only extra slots', () => {
    const c = defaultControls();
    expect(unbind(c, 'keys', 'jump', 0)).toBe(false);
    expect(unbind(c, 'keys', 'bite', 1)).toBe(true);
    expect(c.keys.bite).toEqual(['KeyJ', 'ShiftRight']);
    expect(unbind(c, 'pad', 'hub', 0)).toBe(false); // nothing there
    bind(c, 'pad', 'hub', 0, PAD.R3);
    expect(unbind(c, 'pad', 'hub', 0)).toBe(true); // no default pad button: may be cleared again
  });

  it('clamps the dead zone', () => {
    const c = defaultControls();
    expect(setDeadzone(c, 0.9)).toBe(0.5); expect(setDeadzone(c, -1)).toBe(0.05); expect(setDeadzone(c, 'x')).toBe(DEFAULT_DEADZONE);
  });
});

describe('storage', () => {
  it('round-trips under the game key and survives garbage', () => {
    const store = memory();
    const c = defaultControls();
    bind(c, 'keys', 'jump', 0, 'KeyM'); setDeadzone(c, 0.35);
    expect(saveControls(c, store)).toBe(true);
    expect(store.map.has(CONTROLS_KEY)).toBe(true);
    expect(loadControls(store)).toEqual(c);
    store.setItem(CONTROLS_KEY, '{nope');
    expect(loadControls(store)).toEqual(defaultControls());
    expect(normalizeControls({ keys: { jump: [], bite: ['KeyN', 42], nonsense: ['KeyZ'] }, pad: { jump: [99] }, leftDeadzone: 7 }))
      .toEqual({ ...defaultControls(), leftDeadzone: 0.5 });
  });

  it('a storage that throws gives the defaults and does not throw', () => {
    const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('full'); } };
    expect(loadControls(bad)).toEqual(defaultControls());
    expect(saveControls(defaultControls(), bad)).toBe(false);
  });
});

describe('Input applies bindings live', () => {
  it('a remapped key acts and the old one stops', () => {
    const c = defaultControls();
    bind(c, 'keys', 'jump', 0, 'KeyM');
    input.setBindings(c);
    key('KeyM'); expect(input.pressed('jump')).toBe(true); expect(input.held('jump')).toBe(true); key('KeyM', 'keyup');
    key('Space'); expect(input.pressed('jump')).toBe(false); key('Space', 'keyup');
  });

  it('a remapped pad button acts, D-pad menu moves stay, and the dead zone reaches the stick', () => {
    const c = defaultControls();
    bind(c, 'pad', 'bite', 0, PAD.Y); // swaps Bark onto X
    setDeadzone(c, 0.4);
    input.setBindings(c);
    buttons[PAD.Y].pressed = true; input.poll();
    expect(input.pressed('bite')).toBe(true); expect(input.pressed('bark')).toBe(false);
    buttons[PAD.Y].pressed = false; input.poll();
    buttons[PAD.DOWN].pressed = true; input.poll();
    expect(input.pressed('down')).toBe(true); expect(input.padDir('down')).toBe(true);
    buttons[PAD.DOWN].pressed = false;
    pads[0].axes[0] = 0.3; input.poll();
    expect(input.state.x).toBe(0); // inside the 0.4 dead zone
    pads[0].axes[0] = 0.8; input.poll();
    expect(input.state.x).toBeGreaterThan(0);
  });

  it('captureKey takes a key before the game sees it', () => {
    const got = [];
    input.captureKey = (code) => got.push(code);
    key('Space');
    expect(got).toEqual(['Space']); expect(input.pressed('jump')).toBe(false);
    input.captureKey = null; key('Space', 'keyup');
  });
});

describe('Esc in browser full screen', () => {
  it('only leaves full screen: no pause, no menu back', () => {
    let el = document.documentElement;
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => el });
    document.exitFullscreen = vi.fn(() => { el = null; return Promise.resolve(); });
    key('Escape');
    expect(document.exitFullscreen).toHaveBeenCalledOnce();
    expect(input.pressed('pause')).toBe(false); expect(input.rawKey('Escape')).toBe(false);
    key('Escape', 'keyup');
    key('Escape'); // out of full screen: Esc pauses again
    expect(input.pressed('pause')).toBe(true);
    key('Escape', 'keyup');
    delete document.fullscreenElement; delete document.exitFullscreen;
  });
});
