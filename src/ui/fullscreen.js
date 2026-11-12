// Browser full screen for the menus' FULL SCREEN item. The game already fills the window (#app is
// position:fixed, inset 0, and the renderer follows innerWidth/innerHeight); this toggles the
// Fullscreen API on top of that.
//
// Browsers only allow requestFullscreen() during a user gesture. A click on the item calls toggle()
// from the click handler, and a confirm key does it from inside keydown (Input.gestureHook). The menu
// code then runs activate() on its next frame: that is a no-op after a gesture toggle, and the only
// call for a gamepad press, which the browser may refuse (no key or click recently). The refusal is
// caught; onRefused tells the player to use a key, a click or F11.

const doc = () => (typeof document === 'undefined' ? null : document);

export const fullscreen = {
  _handled: false,
  /** Called when the browser refuses (no recent user gesture, or a frame that forbids it). */
  onRefused: null,

  /** False when the page cannot go full screen (iframe without allowfullscreen, iPhone Safari, tests). */
  supported() { return !!doc()?.fullscreenEnabled; },
  isOn() { return !!doc()?.fullscreenElement; },
  label() { return `FULL SCREEN: ${this.isOn() ? 'ON' : 'OFF'}`; },

  /** Toggle now. `gesture` marks a call made from inside an input event handler. */
  toggle(gesture = false) {
    const d = doc();
    if (!d || !this.supported()) return false;
    if (gesture) this._handled = true;
    try {
      const p = d.fullscreenElement ? d.exitFullscreen() : d.documentElement.requestFullscreen({ navigationUI: 'hide' });
      p?.catch?.((err) => { if (!d.fullscreenElement) this.onRefused?.(err); });
    } catch (err) {
      this.onRefused?.(err);
      return false;
    }
    return true;
  },

  /** The menu's own activation: toggles unless a gesture handler already did it for this press. */
  activate() {
    if (this._handled) { this._handled = false; return false; }
    return this.toggle(false);
  },

  /** Drop a gesture mark that no menu frame consumed (the menu changed under the key press). */
  reset() { this._handled = false; },

  /** fn() on every change, including the player leaving with Esc or F11. Returns an unsubscribe function. */
  onChange(fn) {
    const d = doc();
    if (!d) return () => {};
    d.addEventListener('fullscreenchange', fn);
    return () => d.removeEventListener('fullscreenchange', fn);
  },
};
