import { describe, expect, it, vi } from 'vitest';
import { startChain, endAttack, pickChain } from '../src/bosses/chain.js';
import { Boss } from '../src/bosses/common.js';
import { FLOOR } from '../src/config/difficulty.js';

function fighter(overrides = {}) {
  return { phase: 3, chainLen: 3, state: 'idle', sinceHurt: 9, game: { player: { dead: false } },
    beginAttack: vi.fn(), afterAttack: vi.fn(), ...overrides };
}
describe('boss attack chains', () => {
  it('enters every attack through its full tell in order, without touching its timer', () => {
    const b = fighter({ stateT: 0.87 });
    expect(startChain(b, ['cage', 'laser', 'aim'])).toBe(true);
    endAttack(b); endAttack(b); endAttack(b);
    expect(b.beginAttack.mock.calls.map(([name]) => name)).toEqual(['cage', 'laser', 'aim']);
    expect(b.afterAttack).toHaveBeenCalledOnce();
    expect(b.stateT).toBe(0.87);
    expect(b.chained).toBe(false);
  });
  it.each([0, 0.25, 0.5])('abandons a combo %ss after a landed hit', (sinceHurt) => {
    const b = fighter();
    startChain(b, ['cage', 'aim']); b.sinceHurt = sinceHurt;
    expect(endAttack(b)).toBe(false);
    expect(b.beginAttack).toHaveBeenCalledTimes(1);
    expect(b.chainQ).toBeNull();
    expect(startChain(b, ['cage', 'aim'])).toBe(false);
  });
  it('permits a new complete tell after the half-second grace', () => {
    const b = fighter({ sinceHurt: 0.50001 });
    expect(startChain(b, ['cage', 'aim'])).toBe(true);
    expect(endAttack(b)).toBe(true);
  });
  it.each(['stuck', 'tired', 'dizzy', 'overheat', 'stunned', 'pumped', 'ultimate', 'frenzy'])('never starts or continues during %s', (state) => {
    const b = fighter(); startChain(b, ['cage', 'aim']); b.state = state;
    expect(endAttack(b)).toBe(false);
    expect(startChain(b, ['cage', 'aim'])).toBe(false);
  });
  it.each([{ evolving: {} }, { ulting: true }, { vulnerable: true }, { defeated: true }, { game: { player: { dead: true } } }])('stops for state guard %j', (guard) => {
    const b = fighter(guard);
    expect(startChain(b, ['cage', 'aim'])).toBe(false);
  });
  it('filters oversized combos without changing authored tables', () => {
    const CHAINS = { 3: [['one'], ['one', 'two'], ['one', 'two', 'three']] };
    const b = fighter({ CHAINS, chainLen: 2 });
    expect(pickChain(b, () => 0)).toEqual(['one', 'two']);
    expect(CHAINS[3]).toHaveLength(3);
    expect(startChain(b, CHAINS[3][2])).toBe(false);
  });
  it('records a hit and clamps even DDA-adjusted stage-four tells and windows', () => {
    const b = new Boss({ game: {} }, 0, 0, 0, { key: 'queen' });
    b.phase = 4; b.dda = { tele: 1.15, window: 0.3 };
    b.onPlayerHurt();
    expect(b.sinceHurt).toBe(0); expect(b.tookHitThisFight).toBe(true);
    expect(b.tele(0)).toBe(FLOOR.teleSec);
    expect(b.W).toBeGreaterThanOrEqual(FLOOR.windowSec);
    b.dda.window = -5;
    expect(b.W).toBe(FLOOR.windowSec);
    b.active = true; b.stageAura = () => {}; b.ai = () => {};
    b.update(6);
    expect(b.charge).toBe(0.5);
    expect(b.stageScale[4]).toBe(1.32);
    expect(b.stageNames[4]).toBeTruthy();
  });
});
