import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { input } from '../src/core/input.js';
import { Game } from '../src/game/game.js';
import { MOVES, TUTORIALS } from '../src/story/script.js';
import { padPrompt } from '../src/core/prompts.js';

/** The pause menu's MOVES page: two inputs from pause (Down, Confirm), and it lists only owned moves. */
function pausedGame({ abilities = {}, gear = {} } = {}) {
  const screen = { html: '' };
  const game = Object.create(Game.prototype);
  Object.assign(game, {
    state: 'play', session: null, player: { abilities, gear },
    ui: { pinHud: vi.fn(), clearScreen: vi.fn(), setScreen: (html) => { screen.html = input.prompt(html); } },
  });
  game.openPause();
  return { game, screen };
}
const press = (action) => { input._pressed = new Set([action]); };
const open = (game) => { press('down'); game.updatePause(); press('confirm'); game.updatePause(); };
const ALL = { glide: true, zoom: true, bark: true, dustDash: true, moonJump: true };

beforeEach(() => { input._pressed = new Set(); input.lastDevice = 'keyboard'; });
afterEach(() => { input._pressed = new Set(); input.lastDevice = 'keyboard'; vi.restoreAllMocks(); });

describe('pause menu MOVES page', () => {
  it('sits right after RESUME and opens in two inputs', () => {
    const { game, screen } = pausedGame();
    expect(game._pauseItems().map((i) => i.id).slice(0, 2)).toEqual(['resume', 'moves']);
    open(game);
    expect(game.state).toBe('pause');
    expect(screen.html).toContain('MOVES');
    for (const id of ['jump', 'bite', 'slide', 'flop']) expect(screen.html).toContain(TUTORIALS[id].text);
  });

  it('hides earned moves until their boss is beaten: no Moon Jump before the Queen', () => {
    const { game, screen } = pausedGame({ abilities: { ...ALL, moonJump: false } });
    open(game);
    expect(screen.html).toContain('ZOOMIES');
    expect(screen.html).toContain(TUTORIALS.dustDash.text);
    expect(screen.html).not.toContain('MOON JUMP');
    expect(screen.html).not.toContain(TUTORIALS.moonJump.text);
  });

  it('lists every earned move from the README table once all five bosses are beaten', () => {
    const { game, screen } = pausedGame({ abilities: ALL });
    open(game);
    for (const title of ['TAIL GLIDE', 'ZOOMIES', 'MEGA BARK', 'DUST DASH', 'MOON JUMP']) expect(screen.html).toContain(`<b>${title}</b>`);
    expect(game._moveRows().filter((m) => m.group === 'earned')).toHaveLength(5);
    expect(MOVES.filter((m) => m.ability).map((m) => m.ability)).toEqual(Object.keys(ALL));
  });

  it('says how to earn moves when none are owned, and shows gear moves only while worn', () => {
    const bare = pausedGame(); open(bare.game);
    expect(bare.screen.html).toContain('Beat a boss');
    expect(bare.screen.html).not.toContain('AIR DASH');
    const geared = pausedGame({ gear: { air_dash: { charges_per_jump: 1 }, extra_air_jumps: { count: 1 } } }); open(geared.game);
    expect(geared.screen.html).toContain('AIR DASH');
    expect(geared.screen.html).toContain('TRIPLE JUMP');
  });

  it('shows pad buttons to a pad player', () => {
    input.lastDevice = 'pad';
    const { game, screen } = pausedGame({ abilities: ALL, gear: { air_dash: {} } });
    open(game);
    expect(screen.html).toContain(padPrompt(TUTORIALS.bite.text));
    expect(screen.html).toContain('<span class="key">LT</span>');
    expect(screen.html).not.toMatch(/class="key">(J|K|SHIFT|CTRL|SPACE|U|Q|L|E)</);
  });

  it('a keyboard/pad switch on the MOVES page redraws the MOVES page, not the pause menu', () => {
    const { game, screen } = pausedGame({ abilities: ALL });
    open(game);
    input.lastDevice = 'pad';
    game.refreshPrompts();
    expect(game.pauseMoves).toBe(true);
    expect(screen.html).toContain('<b>ZOOMIES</b>');
    expect(screen.html).not.toContain('PAUSED');
    expect(screen.html).toContain(padPrompt(TUTORIALS.bite.text));
  });

  it.each(['pause', 'back'])('%s returns to the pause menu, not to play', (action) => {
    const { game, screen } = pausedGame();
    open(game);
    press(action); game.updatePause();
    expect(game.state).toBe('pause');
    expect(game.pauseMoves).toBe(false);
    expect(screen.html).toContain('PAUSED');
    press('pause'); game.updatePause();
    expect(game.state).toBe('play');
  });
});
