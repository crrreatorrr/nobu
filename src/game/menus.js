// The options every menu carries (MAIN MENU, hub, CONTROLLER SETTINGS, FULL SCREEN), the system
// menu that brings them to screens without a list of their own (the level map, the Kennel and the
// results screens), mouse clicks on menu items, and the keyboard gesture for FULL SCREEN.
// Game.prototype gets MENU_METHODS (see the end of game.js), so `this` is the Game.
import { input } from '../core/input.js';
import { HINTS } from '../core/prompts.js';
import { audio } from '../audio/audio.js';
import { save } from '../core/save.js';
import { levelDef, LEVELS } from '../levels/registry.js';
import { isFinalStoryLevel } from './mainProgression.js';
import { fullscreen } from '../ui/fullscreen.js';
import { ControlsScreen } from '../ui/controlsScreen.js';

export const MAIN_MENU = { id: 'title', label: 'MAIN MENU' };
export const CONTROLS = { id: 'controls', label: 'CONTROLLER SETTINGS' };
export const exitHub = (label = 'EXIT TO HUB') => ({ id: 'hub', label });
/** FULL SCREEN: ON/OFF, or nothing where the browser cannot go full screen. */
export const fullscreenItems = () => (fullscreen.supported() ? [{ id: 'fullscreen', label: fullscreen.label() }] : []);

/** A menu list. data-menu/data-mi let a click find the item; data-mi comes before class so the markup still reads `menu-item sel">LABEL`. */
export function menuHtml(kind, items, sel) {
  return `<div class="menu" data-menu="${kind}">${items.map((it, i) => `<div data-mi="${i}" data-id="${it.id}" class="menu-item ${i === sel ? 'sel' : ''}">${it.label}</div>`).join('')}</div>`;
}

// Confirm (Enter, Space, pad A/Start) or Bite, as every NOBU menu reads it.
const CONFIRM_ACTS = ['confirm', 'jump', 'bite'];

/** Results screens: a small "ESC: menu" corner tip (added once; refreshPrompts rewrites it for a pad). */
export function ensureMenuTip(ui) {
  const screen = ui?.screen;
  if (!screen?.querySelector || screen.querySelector('.menu-tip')) return;
  screen.insertAdjacentHTML('beforeend', `<div class="hint menu-tip">${input.prompt(HINTS.resultsMenu)}</div>`);
}

const SYS_RESUME = { map: 'BACK TO MAP', kennel: 'BACK TO KENNEL', complete: 'CONTINUE' };

export const MENU_METHODS = {
  // ---------------- system menu (map, Kennel, results) ----------------
  _sysItems(kind = this.sysMenu?.kind) {
    return [
      { id: 'resume', label: SYS_RESUME[kind] || 'BACK' },
      ...(kind === 'kennel' ? [{ id: 'map', label: 'LEVEL MAP' }] : []),
      MAIN_MENU,
      exitHub(),
      CONTROLS,
      ...fullscreenItems(),
    ];
  },

  openSystemMenu(kind) {
    this.sysMenu = { kind, sel: 0 };
    audio.play('menu');
    this._drawSysMenu();
  },

  _drawSysMenu() {
    if (!this.sysMenu) return;
    const items = this._sysItems();
    this.sysMenu.sel = Math.min(this.sysMenu.sel, items.length - 1);
    this.ui.setModal(`<div class="sys-panel"><div class="big-title">MENU</div>${menuHtml('sys', items, this.sysMenu.sel)}
      <div class="hint" style="margin-top:14px">${HINTS.sys}</div></div>`, 'dim sys-menu');
  },

  closeSystemMenu() {
    this.sysMenu = null;
    this.ui.clearModal();
    input.clear(); // the closing press must not also act on the screen underneath
  },

  updateSysMenu() {
    const items = this._sysItems();
    const n = items.length;
    if (input.pressed('up')) { this.sysMenu.sel = (this.sysMenu.sel + n - 1) % n; audio.play('menu'); this._drawSysMenu(); }
    if (input.pressed('down')) { this.sysMenu.sel = (this.sysMenu.sel + 1) % n; audio.play('menu'); this._drawSysMenu(); }
    if (input.confirmPressed() || input.pressed('bite')) { this._sysActivate(items[this.sysMenu.sel]); return; }
    if (input.pressed('pause') || input.pressed('back')) { audio.play('menu'); this.closeSystemMenu(); }
  },

  _sysActivate(it) {
    const kind = this.sysMenu.kind;
    if (it.id === 'resume') { audio.play('menu'); this.closeSystemMenu(); return; }
    if (it.id === 'controls') { this.openControls(() => this._drawSysMenu()); return; }
    if (it.id === 'fullscreen') { this._toggleFullscreen(); return; }
    audio.play('select');
    this.closeSystemMenu();
    if (kind === 'kennel') this.kennel?.dispose?.();
    if (kind === 'complete') this._leaveResults();
    if (it.id === 'map') this.toMap('kennel');
    else if (it.id === 'title') this.toTitle();
    else if (it.id === 'hub') this.exitToHub();
  },

  /**
   * Leaving a results screen early skips what follows it (dialogue, the ending, the credits). The
   * save is already written by then, except the "finished" flag the credits set, which opens Chapter 2.
   */
  _leaveResults() {
    const next = this.completeNext;
    this.completeNext = null;
    if (this.ui?.screen?.style) this.ui.screen.style.background = '';
    if (!next || next.bonus) return;
    const n = next.n;
    if (n === 3 || (n === 5 && levelDef(5)?.shipped) || isFinalStoryLevel(n, LEVELS)) { save.data.finished = true; save.write(); }
  },

  // ---------------- controller settings ----------------
  /** Opens CONTROLLER SETTINGS over the current menu; `back` redraws that menu when it closes. */
  openControls(back) {
    audio.play('select');
    this.controlsScreen = new ControlsScreen({
      ui: this.ui, input, save, audio,
      onClose: () => { this.controlsScreen = null; input.clear(); back?.(); },
    });
  },

  // ---------------- full screen ----------------
  _toggleFullscreen() {
    audio.play('menu');
    fullscreen.activate(); // the label redraws on fullscreenchange (Game.boot)
  },

  /** The item a confirm press would activate right now, or null (for the keyboard gesture). */
  _activeMenuItem() {
    if (this.controlsScreen) return null;
    if (this.sysMenu) return this._sysItems()[this.sysMenu.sel] || null;
    if (this.state === 'title' && this.titleMenu) return this._titleItems()[this.titleSel] || null;
    if (this.state === 'pause' && this.pauseExitSel == null && !this.pauseMoves) return this._pauseItems()[this.pauseSel] || null;
    if (this.state === 'gameover' && this.goT > 0.8) return this._gameOverItems()[this.goSel] || null;
    return null;
  },

  /** Input.gestureHook: a confirm key on FULL SCREEN toggles inside keydown, where the browser allows it. */
  _menuGesture(acts) {
    if (this.held || !acts.some((a) => CONFIRM_ACTS.includes(a))) return false;
    if (this._activeMenuItem()?.id !== 'fullscreen') return false;
    return fullscreen.toggle(true);
  },

  // ---------------- mouse ----------------
  /** A click on a menu item selects and activates it, the same as moving there and confirming. */
  _onMenuClick(e) {
    if (this.held) return;
    if (this.controlsScreen) { if (this.controlsScreen.click(e)) input.clear(); return; }
    const el = e.target?.closest?.('[data-mi]');
    const kind = el?.closest('[data-menu]')?.dataset.menu;
    if (!kind) return;
    const i = Number(el.dataset.mi);
    if (this.sysMenu && kind !== 'sys') return; // the system menu is on top
    const pick = {
      sys: () => { const it = this._sysItems()[i]; if (it) { this.sysMenu.sel = i; return [it, () => this._sysActivate(it)]; } return null; },
      title: () => { const it = this.state === 'title' && this.titleMenu && this._titleItems()[i]; if (it) { this.titleSel = i; return [it, () => this._titleActivate(it)]; } return null; },
      pause: () => { const it = this.state === 'pause' && this._pauseItems()[i]; if (it) { this.pauseSel = i; return [it, () => this._pauseActivate(it)]; } return null; },
      pauseExit: () => { const it = this.state === 'pause' && this._pauseExitItems()[i]; if (it) { this.pauseExitSel = i; return [it, () => this._pauseExitActivate(it)]; } return null; },
      gameover: () => { const it = this.state === 'gameover' && this.goT > 0.8 && this._gameOverItems()[i]; if (it) { this.goSel = i; return [it, () => this._gameOverActivate(it)]; } return null; },
    }[kind]?.();
    if (!pick) return;
    const [it, activate] = pick;
    if (it.id === 'fullscreen') fullscreen.toggle(true); // inside the click: the browser allows it
    activate();
    if (it.id === 'fullscreen') this.refreshPrompts(); // the selection moved to the clicked item
    input.clear(); // the click's pointerdown counted as "any key"
  },
};
