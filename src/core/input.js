// Keyboard + Gamepad input with per-frame edge detection.
// Actions: left/right/up/down (analog-ish), jump, bite, slide, bark, dash, pause, confirm, back,
// and the map shortcuts (trial, gauntlet, remix, wardrobe, exchange, hub, sniffer).
// The pad layout, deadzones, latch and menu auto-repeat live in gamepad.js; prompts in prompts.js.
import { PadReader, PAD_TUNING } from './gamepad.js';
import { padPrompt } from './prompts.js';
import { defaultControls, keymapOf, padLayoutOf, loadControls } from './controls.js';

// keyboard code -> actions. Built from the player's bindings (src/core/controls.js, edited in
// CONTROLLER SETTINGS); the defaults are the README layout.
let KEYMAP = keymapOf(defaultControls());

const actionsOf = (code) => KEYMAP[code] || [];

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
    this.rawKeysQ = new Set();    // key codes pressed since last frame, whatever they are bound to
    this._rawKeys = new Set();
    this._padButtons = new Set(); // raw pad buttons pressed this frame
    this._padDirs = new Set();    // menu directions from the physical D-pad / left stick this frame
    /** Set while CONTROLLER SETTINGS waits for a key: gets the code instead of the game. */
    this.captureKey = null;
    /**
     * Called from inside keydown with the key's actions: returns true when it handled the press as a
     * user gesture (the menus' FULL SCREEN item, which the browser only allows from an input event).
     */
    this.gestureHook = null;
    this.controls = defaultControls();
    window.addEventListener('keydown', (e) => {
      // In browser full screen, Esc only leaves full screen (as browsers do when they keep the key):
      // it must not also pause, close a menu or cancel a bind on the same press.
      if (e.code === 'Escape' && typeof document !== 'undefined' && document.fullscreenElement) {
        e.preventDefault();
        if (!e.repeat) { try { document.exitFullscreen?.()?.catch?.(() => {}); } catch { /* already leaving */ } }
        return;
      }
      if (this.captureKey) {
        e.preventDefault();
        if (!e.repeat) this.captureKey(e.code);
        this.lastDevice = 'keyboard';
        return;
      }
      const acts = actionsOf(e.code);
      if (!e.repeat && acts.length && this.gestureHook) {
        try { this.gestureHook(acts, e); } catch { /* the press still reaches the game */ }
      }
      if (!e.repeat) this.rawKeysQ.add(e.code);
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
    this._rawKeys = this.rawKeysQ;
    this.rawKeysQ = new Set();

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
    this._padButtons = frame.buttons || new Set();
    this._padDirs = new Set([...frame.pressed].filter((a) => a === 'up' || a === 'down' || a === 'left' || a === 'right'));
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

  /**
   * Apply a bindings object (src/core/controls.js): the keyboard map, the pad layout and the left
   * stick dead zone. Takes effect on the next frame; held keys are re-read under the new map.
   */
  setBindings(controls) {
    this.controls = controls;
    KEYMAP = keymapOf(controls);
    this.padReader.layout = padLayoutOf(controls);
    this.padReader.tuning = { ...PAD_TUNING, leftDeadzone: controls.leftDeadzone ?? PAD_TUNING.leftDeadzone };
    this._recompute();
  }
  /** Load the saved bindings (missing or unreadable storage gives the defaults) and apply them. */
  loadBindings(storage) { this.setBindings(loadControls(storage)); return this.controls; }

  held(a) { return this.down.has(a) || this.pad.held.has(a); }
  /** A key code pressed this frame, whatever it is bound to (controller settings navigation). */
  rawKey(code) { return this._rawKeys.has(code); }
  /** A raw pad button index pressed this frame. */
  padButton(i) { return this._padButtons.has(i); }
  /** Raw pad buttons pressed this frame. */
  padButtons() { return this._padButtons; }
  /** A menu direction from the physical D-pad or left stick this frame (with auto-repeat). */
  padDir(d) { return this._padDirs.has(d); }
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
  // Forget every held key and queued press (the feedback window swallows the keyups).
  releaseAll() { this.codes.clear(); this._recompute(); this._god9 = null; this.clear(); }
  clear() {
    this._pressed = new Set(); this._anyPressed = false; this.pressedQ.clear(); this.anyKeyQ = false; this._padLost = false;
    this._rawKeys = new Set(); this.rawKeysQ.clear(); this._padButtons = new Set(); this._padDirs = new Set();
  }
}

export const input = new Input();
