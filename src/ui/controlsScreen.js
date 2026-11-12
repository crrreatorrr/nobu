// CONTROLLER SETTINGS: every action with its keyboard keys and gamepad buttons, press-to-bind
// remapping, vibration on/off, the left stick dead zone and Reset to defaults. Opened from every menu
// (Game.openControls); it draws in the UI's modal layer over whatever menu opened it.
//
// It navigates with fixed physical inputs (arrows/WASD, Enter/Space, Esc/Backspace, Delete; pad
// D-pad/left stick, A/START, B, X) rather than the remappable actions, so a bad binding can always
// be repaired here. Bindings live in src/core/controls.js and are applied through Input.setBindings.
import {
  ACTION_IDS, bind, unbind, setDeadzone, saveControls, defaultControls, normalizeControls,
  keyLabel, buttonLabel, actionLabel, DEADZONE_STEP,
} from '../core/controls.js';
import { PAD } from '../core/gamepad.js';

export const LISTEN_TIMEOUT_SEC = 5;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const COLS = [
  { device: 'keys', slot: 0, head: 'KEY 1' },
  { device: 'keys', slot: 1, head: 'KEY 2' },
  { device: 'pad', slot: 0, head: 'PAD 1' },
  { device: 'pad', slot: 1, head: 'PAD 2' },
];
const clone = (c) => normalizeControls(JSON.parse(JSON.stringify(c)));

export class ControlsScreen {
  /**
   * deps: { ui, input, save, audio, onClose, storage? }. ui needs setModal(html, cls, { raw }) and
   * clearModal(); input is the shared Input; save is the progress save (rumble lives there).
   */
  constructor(deps) {
    Object.assign(this, deps);
    this.rows = [
      ...ACTION_IDS.map((id) => ({ kind: 'bind', action: id })),
      { kind: 'vibration' }, { kind: 'deadzone' }, { kind: 'reset' }, { kind: 'back' },
    ];
    this.row = 0;
    this.col = 0;
    this.listening = null; // { device, action, slot, t, code? }
    this.msg = '';
    this.closed = false;
    this.draw();
  }

  get controls() { return this.input.controls; }

  _apply(controls) {
    this.input.setBindings(controls);
    saveControls(controls, this.storage);
  }

  // ---------- binding ----------
  listen(action, col) {
    const { device, slot } = COLS[col];
    this.listening = { device, action, slot, t: 0 };
    this.msg = '';
    // Keyboard keys come straight from keydown, before the game's key map sees them.
    this.input.captureKey = (code) => { if (this.listening) this.listening.code = code; };
    this.audio?.play?.('menu');
    this.draw();
  }

  stopListening(msg = '') {
    this.listening = null;
    this.input.captureKey = null;
    this.input.clear(); // the bound key's own press must not also act on the menu
    this.msg = msg;
    this.draw();
  }

  _commit(device, value) {
    const { action, slot } = this.listening;
    const next = clone(this.controls);
    const label = device === 'keys' ? keyLabel(value) : buttonLabel(value);
    const res = bind(next, device, action, slot, value);
    if (!res.ok) {
      const why = res.reason === 'reserved' ? `${label} is reserved` : res.reason === 'conflict' ? `${label} is the last ${device === 'keys' ? 'key' : 'button'} of ${actionLabel(res.with).toUpperCase()}` : 'Not bound';
      this.audio?.play?.('hurt');
      this.stopListening(why);
      return res;
    }
    this._apply(next);
    this.audio?.play?.('select');
    this.stopListening(res.swapped ? `${label}: ${actionLabel(action).toUpperCase()} · swapped with ${actionLabel(res.swapped).toUpperCase()}` : `${label}: ${actionLabel(action).toUpperCase()}`);
    return res;
  }

  _updateListening(dt) {
    const l = this.listening;
    l.t += dt;
    if (l.code !== undefined) {
      const code = l.code;
      l.code = undefined;
      if (code === 'Escape') { this.stopListening('Cancelled'); return; }
      if (l.device === 'keys') { this._commit('keys', code); return; }
    }
    const buttons = [...this.input.padButtons()];
    if (buttons.length) {
      if (l.device === 'pad') { this._commit('pad', buttons[0]); return; }
      if (buttons.includes(PAD.B)) { this.stopListening('Cancelled'); return; }
    }
    if (l.t >= LISTEN_TIMEOUT_SEC) this.stopListening('Cancelled');
    else if (Math.floor(l.t) !== Math.floor(l.t - dt)) this.draw(); // countdown
  }

  // ---------- other rows ----------
  clearSelected() {
    const r = this.rows[this.row];
    if (r.kind !== 'bind') return false;
    const { device, slot } = COLS[this.col];
    const next = clone(this.controls);
    if (!unbind(next, device, r.action, slot)) { this.msg = slot === 0 ? 'The first slot cannot be empty' : 'Nothing to clear'; this.draw(); return false; }
    this._apply(next);
    this.msg = 'Cleared';
    this.audio?.play?.('menu');
    this.draw();
    return true;
  }

  toggleVibration() {
    this.save.data.rumble = this.save.data.rumble === false;
    this.save.write();
    if (this.save.data.rumble) this.input.rumble?.(220, 0.6, 0.8); // a sample, like the pause menu's RUMBLE
    this.audio?.play?.('menu');
    this.draw();
  }

  nudgeDeadzone(dir) {
    const next = clone(this.controls);
    setDeadzone(next, next.leftDeadzone + dir * DEADZONE_STEP);
    this._apply(next);
    this.audio?.play?.('menu');
    this.draw();
  }

  reset() {
    this._apply(defaultControls());
    this.msg = 'Controls reset to defaults';
    this.audio?.play?.('select');
    this.draw();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.input.captureKey = null;
    this.ui.clearModal();
    this.audio?.play?.('menu');
    this.onClose?.();
  }

  activate() {
    const r = this.rows[this.row];
    if (r.kind === 'bind') this.listen(r.action, this.col);
    else if (r.kind === 'vibration') this.toggleVibration();
    else if (r.kind === 'deadzone') this.nudgeDeadzone(1);
    else if (r.kind === 'reset') this.reset();
    else if (r.kind === 'back') this.close();
  }

  // ---------- frame ----------
  update(dt) {
    if (this.closed) return;
    if (this.listening) { this._updateListening(dt); return; }
    const i = this.input;
    const key = (...codes) => codes.some((c) => i.rawKey(c));
    const up = key('ArrowUp', 'KeyW') || i.padDir('up');
    const down = key('ArrowDown', 'KeyS') || i.padDir('down');
    const left = key('ArrowLeft', 'KeyA') || i.padDir('left');
    const right = key('ArrowRight', 'KeyD') || i.padDir('right');
    const n = this.rows.length;
    if (up || down) { this.row = (this.row + (down ? 1 : -1) + n) % n; this.msg = ''; this.audio?.play?.('menu'); this.draw(); }
    const r = this.rows[this.row];
    if (left || right) {
      const d = right ? 1 : -1;
      if (r.kind === 'bind') { this.col = (this.col + d + COLS.length) % COLS.length; this.audio?.play?.('menu'); this.draw(); }
      else if (r.kind === 'deadzone') this.nudgeDeadzone(d);
      else if (r.kind === 'vibration') this.toggleVibration();
    }
    if (key('Escape', 'Backspace') || i.padButton(PAD.B)) { this.close(); return; }
    if (key('Delete') || i.padButton(PAD.X)) { this.clearSelected(); return; }
    if (key('Enter', 'NumpadEnter', 'Space') || i.padButton(PAD.A) || i.padButton(PAD.START)) this.activate();
  }

  /** Mouse: a cell binds, a row toggles or adjusts, Back closes. */
  click(e) {
    const el = e.target?.closest?.('[data-ctl-row]');
    if (!el) return false;
    if (this.listening) { this.stopListening('Cancelled'); return true; }
    this.row = Number(el.dataset.ctlRow);
    const cell = e.target.closest('[data-ctl-col]');
    if (cell) this.col = Number(cell.dataset.ctlCol);
    const r = this.rows[this.row];
    if (r.kind === 'bind' && !cell) { this.draw(); return true; }
    if (r.kind === 'deadzone') {
      const nudge = e.target.closest('[data-ctl-nudge]');
      this.nudgeDeadzone(nudge ? Number(nudge.dataset.ctlNudge) : 1);
      return true;
    }
    this.activate();
    return true;
  }

  // ---------- drawing ----------
  _cell(r, col, ri) {
    const { device, slot } = COLS[col];
    const list = this.controls[device][r.action] || [];
    const label = device === 'keys' ? keyLabel(list[slot]) : buttonLabel(list[slot]);
    const extra = slot === 1 && list.length > 2 ? ` <small>+${list.slice(2).map(device === 'keys' ? keyLabel : buttonLabel).join(' +')}</small>` : '';
    const sel = ri === this.row && col === this.col;
    const waiting = sel && this.listening;
    const text = waiting ? (device === 'keys' ? 'PRESS A KEY…' : 'PRESS A BUTTON…') : `${esc(label)}${extra}`;
    return `<div class="ctl-cell${sel ? ' sel' : ''}${waiting ? ' wait' : ''}${list[slot] === undefined ? ' empty' : ''}" data-ctl-col="${col}">${text}</div>`;
  }

  html() {
    const rows = this.rows.map((r, ri) => {
      const sel = ri === this.row ? ' sel' : '';
      if (r.kind === 'bind') return `<div class="ctl-row${sel}" data-ctl-row="${ri}"><div class="ctl-name">${esc(actionLabel(r.action))}</div>${COLS.map((_, c) => this._cell(r, c, ri)).join('')}</div>`;
      if (r.kind === 'vibration') return `<div class="ctl-row ctl-wide${sel}" data-ctl-row="${ri}"><div class="ctl-name">VIBRATION</div><div class="ctl-value">${this.save.data.rumble === false ? 'OFF' : 'ON'}</div></div>`;
      if (r.kind === 'deadzone') {
        const dz = this.controls.leftDeadzone;
        return `<div class="ctl-row ctl-wide${sel}" data-ctl-row="${ri}"><div class="ctl-name">LEFT STICK DEAD ZONE</div><div class="ctl-value"><span data-ctl-nudge="-1">◀</span> ${dz.toFixed(2)} <span data-ctl-nudge="1">▶</span><span class="ctl-bar"><span style="width:${Math.round(dz / 0.5 * 100)}%"></span></span></div></div>`;
      }
      if (r.kind === 'reset') return `<div class="ctl-row ctl-wide ctl-action${sel}" data-ctl-row="${ri}"><div class="ctl-name">RESET TO DEFAULTS</div></div>`;
      return `<div class="ctl-row ctl-wide ctl-action${sel}" data-ctl-row="${ri}"><div class="ctl-name">BACK</div></div>`;
    }).join('');
    const pad = this.input.lastDevice === 'pad';
    const l = this.listening;
    const hint = l
      ? (l.device === 'keys'
        ? `Press a key for ${esc(actionLabel(l.action).toUpperCase())} · ESC${pad ? ' / B' : ''} cancel · ${Math.ceil(LISTEN_TIMEOUT_SEC - l.t)}`
        : `Press a button for ${esc(actionLabel(l.action).toUpperCase())} · ESC cancel · ${Math.ceil(LISTEN_TIMEOUT_SEC - l.t)}`)
      : pad ? 'D-pad choose · A bind / toggle · X clear · B back' : '↑ ↓ ← → choose · ENTER bind / toggle · DEL clear · ESC back';
    return `<div class="ctl-panel">
      <div class="sub-title">CONTROLLER SETTINGS</div>
      <div class="ctl-row ctl-head"><div class="ctl-name">ACTION</div>${COLS.map((c) => `<div class="ctl-cell">${c.head}</div>`).join('')}</div>
      <div class="ctl-list">${rows}</div>
      <div class="hint ctl-msg">${esc(this.msg)}</div>
      <div class="hint ctl-hint">${hint}</div>
      <div class="hint ctl-fixed">Left stick moves · right stick peeks the camera · D-pad and left stick always move through menus · 9 9 God Mode · N N feedback</div>
    </div>`;
  }

  draw() {
    if (this.closed) return;
    this.ui.setModal(this.html(), 'controls-screen', { raw: true });
    // Keep the selected row in view inside the list (never scroll the page).
    const list = this.ui.modal?.querySelector?.('.ctl-list');
    const sel = list?.querySelector?.('.ctl-row.sel');
    if (list && sel && list.clientHeight) {
      if (sel.offsetTop < list.scrollTop) list.scrollTop = sel.offsetTop;
      else if (sel.offsetTop + sel.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = sel.offsetTop + sel.offsetHeight - list.clientHeight;
    }
  }
}
