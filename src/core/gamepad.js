// Gamepad reading with no DOM access, so it can be tested with fake Gamepad objects.
// Uses the W3C "standard" mapping shared by the Sproto hub and every Sproto game.
// input.js calls PadReader.read() once per frame with navigator.getGamepads().

export const PAD = {
  A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7,
  VIEW: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15,
  // 16 is Home/Guide: the OS or browser owns it, so it is never bound.
};

export const PAD_TUNING = {
  leftDeadzone: 0.2, // radial, rescaled so motion starts smoothly from 0
  rightDeadzone: 0.15, // radial, for the camera peek
  triggerThreshold: 0.5, // LT/RT count as pressed above this value
  menuThreshold: 0.5, // left stick past this moves menu focus
  repeatDelayMs: 350, // held menu direction: first repeat
  repeatRateMs: 120, // held menu direction: later repeats
};

// Default layout: action -> buttons. Several actions share a button where they live on
// different screens (map shortcuts vs. gameplay moves); each screen reads only its own actions.
// Slide sits on B and on the shoulders and triggers so it can be held while the right thumb
// presses A (Moon Jump) or X (Dust Dash). The right stick is the camera peek (see `look`).
export const PAD_LAYOUT = {
  // gameplay
  jump: [PAD.A],
  bite: [PAD.X, PAD.RB],
  slide: [PAD.B, PAD.LB, PAD.LT, PAD.RT],
  bark: [PAD.Y],
  dash: [PAD.LT],
  pause: [PAD.START],
  // menus
  confirm: [PAD.A, PAD.START],
  back: [PAD.B],
  up: [PAD.UP], down: [PAD.DOWN], left: [PAD.LEFT], right: [PAD.RIGHT],
  // level-select map shortcuts
  trial: [PAD.Y],
  gauntlet: [PAD.RB],
  wardrobe: [PAD.LB],
  remix: [PAD.RT],
  exchange: [PAD.LT],
  sniffer: [PAD.VIEW],
};

const DIRS = ['up', 'down', 'left', 'right'];

/** Radial deadzone, rescaled so the output grows from 0 at the edge of the deadzone to 1. */
export function radialDeadzone(x, y, dz) {
  const mag = Math.hypot(x, y);
  if (mag <= dz || !mag) return [0, 0];
  const k = Math.min(1, (mag - dz) / (1 - dz)) / mag;
  return [x * k, y * k];
}

/** First connected pad, preferring one with the standard mapping. */
export function pickPad(pads) {
  let first = null;
  for (const p of pads || []) {
    if (!p || p.connected === false) continue;
    if (p.mapping === 'standard') return p;
    first ||= p;
  }
  return first;
}

/** Indices of the buttons held down on a pad. Triggers use an analog threshold. */
export function buttonsDown(gp, tuning = PAD_TUNING) {
  const down = new Set();
  const list = gp?.buttons || [];
  for (let i = 0; i < list.length; i++) {
    if (i === 16) continue;
    const b = list[i];
    if (!b) continue;
    const value = typeof b === 'number' ? b : typeof b.value === 'number' ? b.value : (b.pressed ? 1 : 0);
    const on = i === PAD.LT || i === PAD.RT ? value > tuning.triggerThreshold : typeof b === 'number' ? value > 0.5 : !!b.pressed;
    if (on) down.add(i);
  }
  return down;
}

/** Actions held for a set of held button indices. */
export function actionsFor(down, layout = PAD_LAYOUT) {
  const held = new Set();
  for (const [action, buttons] of Object.entries(layout)) {
    if (buttons.some((b) => down.has(b))) held.add(action);
  }
  return held;
}

/** One menu direction from the D-pad, else the left stick's dominant axis past the threshold. */
export function menuDirection(down, ax, ay, tuning = PAD_TUNING) {
  if (down.has(PAD.UP)) return 'up';
  if (down.has(PAD.DOWN)) return 'down';
  if (down.has(PAD.LEFT)) return 'left';
  if (down.has(PAD.RIGHT)) return 'right';
  const t = tuning.menuThreshold;
  if (Math.abs(ax) >= Math.abs(ay)) {
    if (ax <= -t) return 'left';
    if (ax >= t) return 'right';
  } else {
    if (ay <= -t) return 'up';
    if (ay >= t) return 'down';
  }
  return null;
}


export class PadReader {
  constructor(layout = PAD_LAYOUT, tuning = PAD_TUNING) {
    this.layout = layout;
    this.tuning = tuning;
    this.key = null; // identity of the pad being read
    this.pad = null; // the Gamepad last read, for rumble
    this.latched = new Set(); // buttons held when the pad appeared, ignored until released
    this.prevHeld = new Set();
    this.prevRaw = new Set();
    this.dir = null;
    this.nextRepeat = Infinity;
  }

  /**
   * Read one frame. Returns { connected, held, pressed, any, move, look, active, lost }:
   * held/pressed are action sets; any is true when a button (not a stick) went down; move and
   * look are the left and right sticks after their deadzones (x right, y down); active is true
   * when the player used the pad this frame; lost is true on the frame the pad disappears.
   */
  read(pads, now) {
    const gp = pickPad(pads);
    this.pad = gp || null;
    if (!gp) {
      const lost = this.key !== null;
      this.key = null;
      this.prevHeld = new Set();
      this.prevRaw = new Set();
      this.dir = null;
      return { connected: false, held: new Set(), pressed: new Set(), any: false, move: [0, 0], look: [0, 0], active: false, lost };
    }
    const t = this.tuning;
    const raw = buttonsDown(gp, t);
    const rx = gp.axes?.[0] || 0, ry = gp.axes?.[1] || 0;
    const key = `${gp.index ?? 0}|${gp.id ?? ''}`;
    if (key !== this.key) {
      // Latch on connect: whatever is held now (the hub's portal confirm, say) stays ignored
      // until released, and a held stick does not count as a fresh menu move.
      this.key = key;
      this.latched = new Set(raw);
      this.prevHeld = new Set();
      this.prevRaw = new Set();
      this.dir = menuDirection(raw, rx, ry, t);
      this.nextRepeat = Infinity;
    }
    for (const b of this.latched) if (!raw.has(b)) this.latched.delete(b);
    const down = new Set([...raw].filter((b) => !this.latched.has(b)));

    let any = false;
    for (const b of down) if (!this.prevRaw.has(b)) any = true;
    this.prevRaw = down;

    const held = actionsFor(down, this.layout);
    const pressed = new Set();
    for (const a of held) if (!this.prevHeld.has(a) && !DIRS.includes(a)) pressed.add(a);
    this.prevHeld = held;

    // Menu directions: one press on change, then key-repeat style auto-repeat while held.
    const dir = menuDirection(down, rx, ry, t);
    if (dir !== this.dir) {
      this.dir = dir;
      if (dir) { pressed.add(dir); this.nextRepeat = now + t.repeatDelayMs; }
    } else if (dir && now >= this.nextRepeat) {
      pressed.add(dir);
      this.nextRepeat = now + t.repeatRateMs;
    }

    const move = radialDeadzone(rx, ry, t.leftDeadzone);
    const look = radialDeadzone(gp.axes?.[2] || 0, gp.axes?.[3] || 0, t.rightDeadzone);
    const active = any || pressed.size > 0 || move[0] !== 0 || move[1] !== 0 || look[0] !== 0 || look[1] !== 0;
    return { connected: true, held, pressed, any, move, look, active, lost: false };
  }

  /** Dual-motor rumble on the pad being read. A no-op without a pad or without a vibration actuator. */
  rumble(ms, strong = 1, weak = 1) {
    const actuator = this.pad?.vibrationActuator;
    if (!actuator?.playEffect || !(ms > 0)) return false;
    const clamp = (v) => Math.max(0, Math.min(1, Number(v) || 0));
    try {
      const done = actuator.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: clamp(strong), weakMagnitude: clamp(weak) });
      done?.catch?.(() => {}); // unsupported effect or a pad that just left: not worth an error
    } catch { return false; }
    return true;
  }
}
