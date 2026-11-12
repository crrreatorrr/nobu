// Controller settings: the keyboard keys and gamepad buttons bound to each action, and the left
// stick dead zone. Saved in localStorage under CONTROLS_KEY (separate from the progress save, so
// "New game" keeps them); rumble on/off stays in the progress save (save.data.rumble) where the pause
// menu's RUMBLE toggle has always kept it. No DOM here, so tests can drive it directly.
// input.js turns a bindings object into its key map and pad layout (Input.setBindings); the screen
// that edits them is src/ui/controlsScreen.js.
import { PAD, PAD_LAYOUT, PAD_TUNING } from './gamepad.js';

export const CONTROLS_KEY = 'nobu-saviour-dog-controls-v1';

// Every action the game reads, in the order the controller screen lists them. `group` decides
// conflicts: two actions in the same group cannot share a key or button (binding one swaps it),
// while different groups may, because they are read on different screens (the map shortcuts share
// buttons with gameplay moves by design). Dash has its own group: by default it shares LT with Slide
// on purpose (with the Clown Collar, LT dashes in the air and slides on the ground).
export const ACTIONS = [
  { id: 'up', label: 'Move up / menu up', group: 'play' },
  { id: 'down', label: 'Move down / menu down', group: 'play' },
  { id: 'left', label: 'Move left / menu left', group: 'play' },
  { id: 'right', label: 'Move right / menu right', group: 'play' },
  { id: 'jump', label: 'Jump (also confirms)', group: 'play' },
  { id: 'bite', label: 'Bite', group: 'play' },
  { id: 'slide', label: 'Slide / Belly Flop', group: 'play' },
  { id: 'bark', label: 'Mega Bark', group: 'play' },
  { id: 'pause', label: 'Pause / resume', group: 'play' },
  { id: 'dash', label: 'Clown Collar air dash', group: 'gear' },
  { id: 'confirm', label: 'Menu: confirm', group: 'menu' },
  { id: 'back', label: 'Menu: back', group: 'menu' },
  { id: 'trial', label: 'Map: time trial', group: 'map' },
  { id: 'gauntlet', label: 'Map: Box Gauntlet', group: 'map' },
  { id: 'remix', label: 'Map: Smog Remix', group: 'map' },
  { id: 'wardrobe', label: 'Map: wardrobe', group: 'map' },
  { id: 'exchange', label: 'Map: Ticket exchange', group: 'map' },
  { id: 'sniffer', label: 'Map: Sniffer', group: 'map' },
  { id: 'hub', label: 'Map: exit to hub', group: 'map' },
];
export const ACTION_IDS = ACTIONS.map((a) => a.id);
const GROUP = Object.fromEntries(ACTIONS.map((a) => [a.id, a.group]));

// The shipped keyboard layout (README "Controls"). Several codes per action: both hands, or arrows and WASD.
export const DEFAULT_KEYS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  bite: ['KeyJ', 'ShiftLeft', 'ShiftRight'],
  slide: ['KeyK', 'ControlLeft', 'ControlRight'],
  bark: ['KeyL', 'KeyE'],
  pause: ['Escape', 'KeyP'],
  dash: ['KeyU', 'KeyQ'], // Q is the left-hand reach next to WASD/E; U sits above J/K/L
  confirm: ['Enter'],
  back: ['Backspace'],
  trial: ['KeyT'], gauntlet: ['KeyG'], remix: ['KeyR'], wardrobe: ['KeyI'], exchange: ['KeyX'],
  sniffer: ['KeyL', 'KeyE'], // the map's Sniffer shortcut is the bark key
  hub: ['KeyH'],
};

export const DEFAULT_PAD = Object.fromEntries(ACTION_IDS.map((id) => [id, [...(PAD_LAYOUT[id] || [])]]));
export const DEFAULT_DEADZONE = PAD_TUNING.leftDeadzone;
export const DEADZONE_MIN = 0.05;
export const DEADZONE_MAX = 0.5;
export const DEADZONE_STEP = 0.05;

// Keys the binder refuses: Escape cancels a bind, N N opens the hub feedback window, 9 9 is God Mode,
// and the F-keys, Tab and the OS keys belong to the browser.
export const RESERVED_KEYS = new Set(['Escape', 'KeyN', 'Digit9', 'Numpad9', 'Tab', 'MetaLeft', 'MetaRight', 'ContextMenu', 'OSLeft', 'OSRight',
  ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`)]);
// Bindable pad buttons: the 16 standard ones. 16 (Home/Guide) belongs to the OS.
const PAD_MAX = 15;

export function defaultControls() {
  return {
    keys: Object.fromEntries(ACTION_IDS.map((id) => [id, [...DEFAULT_KEYS[id]]])),
    pad: Object.fromEntries(ACTION_IDS.map((id) => [id, [...DEFAULT_PAD[id]]])),
    leftDeadzone: DEFAULT_DEADZONE,
  };
}

const validCode = (c) => typeof c === 'string' && /^[A-Za-z0-9]{1,24}$/.test(c) && !RESERVED_KEYS.has(c) || c === 'Escape';
const validButton = (b) => Number.isInteger(b) && b >= 0 && b <= PAD_MAX;
const clampDeadzone = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return DEFAULT_DEADZONE;
  return Math.round(Math.max(DEADZONE_MIN, Math.min(DEADZONE_MAX, n)) * 100) / 100;
};

/** A bindings object from untrusted data (storage): unknown actions dropped, bad entries replaced by defaults. */
export function normalizeControls(raw) {
  const out = defaultControls();
  if (!raw || typeof raw !== 'object') return out;
  for (const id of ACTION_IDS) {
    const keys = raw.keys?.[id];
    if (Array.isArray(keys)) {
      const list = [...new Set(keys.filter(validCode))].slice(0, 4);
      if (list.length) out.keys[id] = list;
    }
    const pad = raw.pad?.[id];
    if (Array.isArray(pad)) {
      const list = [...new Set(pad.filter(validButton))].slice(0, 4);
      if (list.length || DEFAULT_PAD[id].length === 0) out.pad[id] = list;
    }
  }
  if (raw.leftDeadzone != null) out.leftDeadzone = clampDeadzone(raw.leftDeadzone);
  return out;
}

export function loadControls(storage = globalThis.localStorage) {
  try {
    const text = storage?.getItem(CONTROLS_KEY);
    return normalizeControls(text ? JSON.parse(text) : null);
  } catch {
    return defaultControls();
  }
}

export function saveControls(controls, storage = globalThis.localStorage) {
  try {
    storage?.setItem(CONTROLS_KEY, JSON.stringify(controls));
    return true;
  } catch {
    return false; // private mode or full storage: the bindings still apply for this visit
  }
}

/** keyboard code -> actions, for Input. */
export function keymapOf(controls) {
  const map = {};
  for (const id of ACTION_IDS) for (const code of controls.keys[id] || []) (map[code] ||= []).push(id);
  return map;
}

/** action -> pad buttons, for PadReader. */
export function padLayoutOf(controls) {
  return Object.fromEntries(ACTION_IDS.map((id) => [id, [...(controls.pad[id] || [])]]));
}

/**
 * Bind `value` (a key code for device 'keys', a button index for 'pad') to slot `slot` of `action`.
 * A slot is an index into the action's list (the screen shows slots 0 and 1); a slot past the end
 * appends. Conflicts inside the action's group swap: the other action takes this slot's previous key,
 * or just loses the key when the slot was empty. Returns { ok, swapped?: actionId, reason? }; nothing
 * changes when ok is false.
 */
export function bind(controls, device, action, slot, value) {
  if (!ACTION_IDS.includes(action) || (device !== 'keys' && device !== 'pad')) return { ok: false, reason: 'unknown' };
  if (device === 'keys' ? (RESERVED_KEYS.has(value) || !validCode(value)) : !validButton(value)) return { ok: false, reason: 'reserved' };
  const next = { ...controls[device] };
  for (const id of ACTION_IDS) next[id] = [...(controls[device][id] || [])];
  const list = next[action];
  const i = Math.max(0, Math.min(slot, list.length));
  const old = list[i];
  if (old === value) return { ok: true };
  const already = list.indexOf(value);
  if (already >= 0) {
    // Moving a key between this action's own slots: swap them.
    if (old === undefined) list.splice(already, 1);
    else list[already] = old;
    list[Math.min(i, list.length)] = value;
    controls[device] = next;
    return { ok: true };
  }
  let swapped = null;
  for (const id of ACTION_IDS) {
    if (id === action || GROUP[id] !== GROUP[action]) continue;
    const other = next[id], j = other.indexOf(value);
    if (j < 0) continue;
    if (old !== undefined && !other.includes(old)) other[j] = old;
    else other.splice(j, 1);
    if (!other.length) return { ok: false, reason: 'conflict', with: id };
    swapped = id;
  }
  list[i] = value;
  controls[device] = next;
  return swapped ? { ok: true, swapped } : { ok: true };
}

/**
 * Clears one slot. The first slot cannot be cleared, so every action keeps at least one key or
 * button, except a pad action that has no button by default (Map: exit to hub).
 */
export function unbind(controls, device, action, slot) {
  const list = controls[device]?.[action];
  const first = device === 'pad' && DEFAULT_PAD[action]?.length === 0 ? 0 : 1;
  if (!list || slot < first || slot >= list.length) return false;
  controls[device] = { ...controls[device], [action]: list.filter((_, j) => j !== slot) };
  return true;
}

export function setDeadzone(controls, value) {
  controls.leftDeadzone = clampDeadzone(value);
  return controls.leftDeadzone;
}

// ---------- labels ----------
const KEY_NAMES = {
  Space: 'SPACE', Enter: 'ENTER', Escape: 'ESC', Backspace: 'BACKSPACE', Delete: 'DEL',
  ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL', AltLeft: 'L-ALT', AltRight: 'R-ALT',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  CapsLock: 'CAPS', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
  Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', PageUp: 'PG UP', PageDown: 'PG DN', Insert: 'INS',
};
export function keyLabel(code) {
  if (!code) return '—';
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad/.test(code)) return `NUM ${code.slice(6)}`;
  return code.toUpperCase();
}

const PAD_NAMES = { [PAD.A]: 'A', [PAD.B]: 'B', [PAD.X]: 'X', [PAD.Y]: 'Y', [PAD.LB]: 'LB', [PAD.RB]: 'RB', [PAD.LT]: 'LT', [PAD.RT]: 'RT',
  [PAD.VIEW]: 'VIEW', [PAD.START]: 'START', [PAD.L3]: 'L3', [PAD.R3]: 'R3', [PAD.UP]: 'D-PAD ↑', [PAD.DOWN]: 'D-PAD ↓', [PAD.LEFT]: 'D-PAD ←', [PAD.RIGHT]: 'D-PAD →' };
export function buttonLabel(b) { return b == null ? '—' : PAD_NAMES[b] ?? `BUTTON ${b}`; }
export function actionLabel(id) { return ACTIONS.find((a) => a.id === id)?.label ?? id; }
