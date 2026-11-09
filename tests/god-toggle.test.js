import { afterEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../src/game/game.js';
import { input, godCombo, GOD_COMBO_MS } from '../src/core/input.js';
import { save } from '../src/core/save.js';
import { createRush } from '../src/game/rush.js';
import { RushSession } from '../src/game/rushSession.js';

afterEach(() => { save.data.godMode = false; input.clear(); });

const key = (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code }));

describe('99 combo', () => {
  it('fires on a second 9 inside the window, and only once per pair', () => {
    expect(godCombo(null, 1000)).toBe(1000);
    expect(godCombo(1000, 1000 + GOD_COMBO_MS)).toBeNull();
    expect(godCombo(1000, 1001 + GOD_COMBO_MS)).toBe(1001 + GOD_COMBO_MS);
  });

  it('queues the god action from the keyboard', () => {
    input.clear();
    key('Digit9'); input.poll();
    expect(input.pressed('god')).toBe(false);
    key('Numpad9'); input.poll();
    expect(input.pressed('god')).toBe(true);
    key('Digit9'); input.poll();
    expect(input.pressed('god')).toBe(false); // third 9 starts a new pair
  });
});

describe('toggleGod', () => {
  const game = (session) => Object.assign(Object.create(Game.prototype), { ui: { godBadge: vi.fn() }, session });

  it('turning it on marks the run and voids a boss attempt; turning it off keeps the mark', () => {
    const session = { phase: 'boss', bossRun: { void: false }, godUsed: false };
    session.markGodUsed = function () { this.godUsed = true; if (this.phase === 'boss' && this.bossRun) this.bossRun.void = true; };
    const g = game(session);
    save.data.godMode = false;
    expect(g.toggleGod()).toBe(true);
    expect(g.ui.godBadge).toHaveBeenLastCalledWith(true);
    expect(session).toMatchObject({ godUsed: true, bossRun: { void: true } });
    expect(g.toggleGod()).toBe(false);
    expect(g.ui.godBadge).toHaveBeenLastCalledWith(false);
    expect(session.godUsed).toBe(true);
  });

  it('in Boss Rush it also marks the rush run', () => {
    const rush = Object.assign(Object.create(RushSession.prototype), { phase: 'boss', bossRun: { void: false }, run: createRush(), godUsed: false });
    game(rush).toggleGod();
    expect(rush.run.godUsed).toBe(true);
    expect(rush.bossRun.void).toBe(true);
    expect(rush.godUsed).toBe(true);
  });
});
