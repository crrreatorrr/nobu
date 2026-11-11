// Keyboard + Gamepad input with per-frame edge detection.
// Actions: left/right/up/down (analog-ish), jump, bite, slide, bark, dash, pause, confirm, back,
// and the map shortcuts (trial, gauntlet, remix, wardrobe, exchange, hub, sniffer).
// The pad layout, deadzones, latch and menu auto-repeat live in gamepad.js; prompts in prompts.js.
import { PadReader } from './gamepad.js';
import { padPrompt } from './prompts.js';

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump',
  KeyJ: 'bite', ShiftLeft: 'bite', ShiftRight: 'bite',
  KeyK: 'slide', ControlLeft: 'slide', ControlRight: 'slide',
  KeyL: ['bark', 'sniffer'], KeyE: ['bark', 'sniffer'], // the map's Sniffer shortcut is the bark key
  KeyT: 'trial',
  KeyG: 'gauntlet',
  KeyR: 'remix',
  KeyI: 'wardrobe',
  KeyU: 'dash', KeyQ: 'dash', // Q is the left-hand reach next to WASD/E; U sits above J/K/L
  KeyX: 'exchange',
  KeyH: 'hub',
  Escape: 'pause', KeyP: 'pause',
  Enter: 'confirm',
  Backspace: 'back',
};

const actionsOf = (code) => { const a = KEYMAP[code]; return !a ? [] : Array.isArray(a) ? a : [a]; };

// Typing 9 twice quickly (main row or numpad) queues the 'god' action: God Mode on/off mid-game.
export const GOD_KEYS = new Set(['Digit9', 'Numpad9']);
export const GOD_COMBO_MS = 600;
// Returns the new pending time: null once the combo fires (so 999 is one toggle, 9999 two).
export function godCombo(pending, t) {
  return pending != null && t - pending <= GOD_COMBO_MS ? null : t;
}

class Input {
  constructor() {
    this.down = new Set();        // actions currently held (keyboard)
    this.pressedQ = new Set();    // actions pressed since last frame (keyboard)
    this.anyKeyQ = false;
    this.pad = { axes: [0, 0], held: new Set(), prev: new Set(), connected: false };
    this.look = [0, 0];           // right stick after its deadzone (x right, y down): camera peek
    this._padLost = false;
    this.padReader = new PadReader();
    this.state = { x: 0, y: 0 };
    this._pressed = new Set();
    this._anyPressed = false;
    this.lastDevice = 'keyboard'; // 'keyboard' or 'pad': picks which control prompts are shown
    this._shownDevice = 'keyboard';
    this._deviceSwitched = false;

    this.codes = new Set();
    this._god9 = null;
    window.addEventListener('keydown', (e) => {
      const acts = actionsOf(e.code);
      if (acts.length) {
        e.preventDefault();
        if (!e.repeat) for (const a of acts) this.pressedQ.add(a);
      }
      // Ctrl+key combos would trigger browser shortcuts while sliding; swallow what we can.
      if (e.ctrlKey && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyL', 'KeyE', 'KeyQ', 'KeyU', 'Space'].includes(e.code)) e.preventDefault();
      if (GOD_KEYS.has(e.code) && !e.repeat) {
        const was = this._god9;
        this._god9 = godCombo(was, e.timeStamp);
        if (was != null && this._god9 == null) this.pressedQ.add('god');
      }
      this.codes.add(e.code);
      this._recompute();
      if (!e.repeat) this.anyKeyQ = true;
      this.lastDevice = 'keyboard';
    });
    window.addEventListener('keyup', (e) => {
      this.codes.delete(e.code);
      this._recompute();
    });
    window.addEventListener('blur', () => { this.codes.clear(); this._recompute(); });
    window.addEventListener('pointerdown', () => { this.anyKeyQ = true; });
  }

  // Called once per frame before game update.
  poll(now = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    this._pressed = this.pressedQ;
    this.pressedQ = new Set();
    this._anyPressed = this.anyKeyQ;
    this.anyKeyQ = false;

    // Gamepad: polled every frame (hot-plug safe), latched on connect. See gamepad.js.
    let pads;
    try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch { pads = []; }
    const frame = this.padReader.read(pads, now);
    this.pad.prev = this.pad.held;
    this.pad.held = frame.held;
    this.pad.axes = frame.move;
    this.pad.connected = frame.connected;
    this.look = frame.look;
    this._padLost = frame.lost && this.lastDevice === 'pad'; // only if the player was using it
    for (const a of frame.pressed) this._pressed.add(a);
    if (frame.any) this._anyPressed = true; // buttons only: a stick push is not "any key"
    if (frame.active) this.lastDevice = 'pad';
    this._deviceSwitched = this.lastDevice !== this._shownDevice;
    this._shownDevice = this.lastDevice;

    // Movement vector: x = right, y = up (screen space)
    let x = 0, y = 0;
    if (this.held('left')) x -= 1;
    if (this.held('right')) x += 1;
    if (this.held('up')) y += 1;
    if (this.held('down')) y -= 1;
    if (this.pad.axes[0] || this.pad.axes[1]) { x = this.pad.axes[0]; y = -this.pad.axes[1]; }
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    this.state.x = x;
    this.state.y = y;
  }

  _recompute() {
    this.down = new Set();
    for (const c of this.codes) for (const a of actionsOf(c)) this.down.add(a);
  }

  held(a) { return this.down.has(a) || this.pad.held.has(a); }
  pressed(a) { return this._pressed.has(a); }
  anyPressed() { return this._anyPressed; }
  // Confirm in menus: Enter, Space (jump) or pad A/Start
  confirmPressed() { return this.pressed('confirm') || this.pressed('jump'); }
  // True for the one frame after the player switches between keyboard and pad.
  deviceSwitched() { return this._deviceSwitched; }
  // True on the frame the gamepad disappears (unplugged, battery, Bluetooth drop).
  padLost() { return this._padLost; }
  // Control prompt for the last device used: prompt(text) rewrites keyboard phrases for a pad
  // player; prompt(keyboardText, padText) picks one.
  prompt(kb, pad) {
    if (this.lastDevice !== 'pad') return kb;
    return pad === undefined ? padPrompt(kb) : pad;
  }
  /** Rumble, only for a player who is using the pad. */
  rumble(ms, strong, weak) { return this.lastDevice === 'pad' && this.padReader.rumble(ms, strong, weak); }
  /** Keeps this frame's presses for the next frame: a hitstop frame must not eat a jump or a bite. */
  carry(actions) { for (const a of this._pressed) if (!actions || actions.includes(a)) this.pressedQ.add(a); }
  /** Forgets this frame's presses of the given actions. */
  drop(actions) { for (const a of actions) this._pressed.delete(a); }
  clear() { this._pressed = new Set(); this._anyPressed = false; this.pressedQ.clear(); this.anyKeyQ = false; this._padLost = false; }
}

export const input = new Input();
