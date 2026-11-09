import { describe, it, expect } from 'vitest';
import { applyRunResults, runBones, savedBoard, snackTier } from '../src/game/bones.js';
const stats = { level: 1, breakables: 40, broken: 40, dogs: 5, dogsTotal: 5, deathsAtGate: 3, snackRaw: 128, snackPotential: 212 };
describe('Bone Board rules', () => {
  it('requires every actual gate breakable and dog, and at least one breakable', () => {
    expect(runBones(stats).golden).toBe(true);
    for (const update of [{ broken: 39 }, { dogs: 4 }, { breakables: 0 }]) expect(runBones({ ...stats, ...update }).golden).toBe(false);
  });
  it('uses the frozen gate death count and excludes god mode', () => {
    expect(runBones(stats).goodBoy).toBe(true);
    expect(runBones({ ...stats, deathsAtGate: 4 }).goodBoy).toBe(false);
    expect(runBones(stats, { god: true }).goodBoy).toBe(false);
  });
  it('measures raw thresholds without scale/remainder rounding', () => {
    expect([84, 85, 128, 170].map((n) => snackTier(n, 212))).toEqual([0, 1, 2, 3]);
    expect(snackTier(5, 0)).toBe(0);
  });
  it.each(['trial', 'remix', 'rush'])('does not award the normal board in %s', (flag) => expect(runBones(stats, { [flag]: true })).toBeNull());
  it('never revokes records, including the legacy Golden map', () => {
    const d = { bones: { 2: true }, boneBoard: { 2: { snack: 3 } } };
    expect(applyRunResults(d, '2', { golden: false, snack: 1 })).toEqual([]);
    expect(savedBoard(d, 2)).toEqual({ golden: true, goodBoy: false, hidden: false, snack: 3 });
  });
  it('stamps in order and keeps legacy map in step', () => {
    const d = {};
    expect(applyRunResults(d, '2', { golden: true, goodBoy: true, snack: 2 })).toEqual(['golden', 'goodBoy', 'snack1', 'snack2']);
    expect(d.bones[2]).toBe(true);
  });
  it('keeps bonus boards at three slots', () => {
    const d = {};
    expect(applyRunResults(d, 'ride', { golden: true, goodBoy: true, hidden: true, snack: 3 }, { bonus: true })).toEqual(['golden', 'goodBoy', 'hidden']);
    expect(d.boneBoard.ride.snack).toBe(0);
  });
});
