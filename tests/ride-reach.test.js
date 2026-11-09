import { describe, expect, it, vi } from 'vitest';
import { ZippedBackpack } from '../src/entities/breakables.js';
import { audio } from '../src/audio/audio.js';
import { RIDE_SPLICES, shiftDistance } from '../src/levels/data/bonus-layout2.js';
import { RIDE_BREAKABLES, RIDE_EXTENSION_BREAKABLES, RIDE_SOFA_BREAKABLES } from '../src/levels/data/ride-breakables.js';

// player.js ride branch: 10.5 m/s forward, 6.8 sideways. Player half-width .36,
// backpack half-width .475. Add the audit's 1 m steering margin.
const stagger = (dx) => Math.max(0, (Math.abs(dx) - 1.67) / 6.8 * 10.5 + 1);
function unreachable(items) {
  const targets = items.filter(({ kind }) => kind !== 'rug').sort((a, b) => a.d - b.d);
  const pairs = [];
  for (let i = 0; i < targets.length; i++) for (let j = i + 1; j < targets.length; j++) {
    const a = targets[i], b = targets[j];
    if (b.d - a.d < stagger(b.x - a.x)) pairs.push([a, b]);
  }
  return pairs;
}

describe('Roomba Rush countable reachability', () => {
  it('allows every pair in one ride with a steering margin', () => {
    expect(unreachable(RIDE_BREAKABLES)).toEqual([]);
  });
  it('keeps every main-lap layout2 countable reachable with the audit margin', () => {
    const main = [...RIDE_BREAKABLES.map(e=>({...e,d:shiftDistance(e.d,RIDE_SPLICES)})),...RIDE_EXTENSION_BREAKABLES];
    expect(unreachable(main)).toEqual([]);
    expect(unreachable(RIDE_SOFA_BREAKABLES)).toEqual([]);
  });
  it('catches all four original side-by-side groups', () => {
    const oldDistances = new Map([[64, 68], [67.5, 68], [71, 68], [157, 160], [164, 160], [219, 222], [226, 222], [267, 270]]);
    const old = RIDE_BREAKABLES.map((item) => ({ ...item, d: oldDistances.get(item.d) ?? item.d }));
    expect([...new Set(unreachable(old).map(([a]) => a.d))]).toEqual([68, 160, 222, 270]);
  });
  it('a single ride ram tears a fresh Zipped Backpack open', () => {
    const sound = vi.spyOn(audio, 'play').mockImplementation(() => {});
    try {
      const onBreak = vi.fn(), spawnFlying = vi.fn();
      const pack = Object.assign(Object.create(ZippedBackpack.prototype), {
        hits: 3, broken: false, countable: true, tickets: 8,
        pos: { x: -2.4, y: 0, z: 157 }, obj: { visible: true }, solid: { enabled: true },
        game: { session: { nextSeq: () => 1, onBreak }, tickets: { spawnFlying }, fx: { burst: vi.fn(), puff: vi.fn() } },
      });
      // Player treats a ride collision as a slide; exercise inherited onSlide and real break.
      pack.onSlide({ ride: {} });
      expect(pack.broken).toBe(true);
      expect(pack.solid.enabled).toBe(false);
      expect(onBreak).toHaveBeenCalledOnce();
      expect(spawnFlying).toHaveBeenCalledWith(-2.4, 0.8, 157, 8, undefined);
    } finally { sound.mockRestore(); }
  });
  it('keeps the rugs behind a reachable dock that clears them remotely', () => {
    const dock = RIDE_BREAKABLES.find(({ kind }) => kind === 'vacSwitch');
    expect(dock).toMatchObject({ x: 0, d: 286 });
    expect(RIDE_BREAKABLES.filter(({ kind }) => kind === 'rug').every(({ d }) => d < dock.d)).toBe(true);
  });
});
