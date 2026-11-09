import { describe, expect, it } from 'vitest';
import { sphereBox } from '../src/core/util.js';
import { L2_CHASE, L2_CHASE_BREAKABLES } from '../src/levels/data/l2-chase.js';
import { budget, run, chaseStops, checkpointSegments, wallManeuver } from '../tools/audit/chaseModel.js';

function violations(items) {
  const failures = [];
  for (const segment of checkpointSegments(L2_CHASE, items)) {
    const earlier = [];
    for (const stop of chaseStops(items).filter(({ d }) => d > segment.start && d < segment.until)) {
      const available = budget(segment, earlier, stop.d);
      if (stop.dur > available * 0.75) failures.push({ d: stop.d, needed: stop.dur, available });
      earlier.push({ d: stop.d - 0.8, dur: stop.dur });
    }
  }
  return failures;
}

describe('Scratchpost Canyon checkpoint rollback feasibility', () => {
  it('keeps every required stop inside 75% of its budget, including earlier stops', () => {
    expect(violations(L2_CHASE_BREAKABLES)).toEqual([]);
  });
  it('catches the original impossible final segment', () => {
    const original = L2_CHASE_BREAKABLES.filter((item) => !(item.kind === 'snacks' && item.d >= 238))
      .map((item) => item.kind === 'stack' ? { ...item, d: 246 } : item.kind === 'pack' && item.d === 275 ? { ...item, kind: 'zipped', d: 270 } : item);
    original.push({ kind: 'pack', x: 0, y: 0, d: 250 });
    expect(violations(original).some(({ d }) => d === 250)).toBe(true);
  });
  it('gives the final dock a generous budget after the late checkpoint', () => {
    const dockBudget = (items) => {
      const segment = checkpointSegments(L2_CHASE, items).at(-1);
      const earlier = chaseStops(items).filter(({ d }) => d > segment.start && d < 293)
        .map(({ d, dur }) => ({ d: d - 0.8, dur }));
      return budget(segment, earlier, 293);
    };
    expect(dockBudget(L2_CHASE_BREAKABLES)).toBeGreaterThan(2);
    expect(dockBudget(L2_CHASE_BREAKABLES.filter((item) => item.d !== 268))).toBeLessThan(1);
  });
  it('leaves 25 m of running before the next required stop after a long maneuver', () => {
    const stops = chaseStops(L2_CHASE_BREAKABLES).filter(({ dur }) => dur > 0);
    for (let i = 0; i < stops.length - 1; i++) {
      if (stops[i].dur > 1) expect(stops[i + 1].d - stops[i].d).toBeGreaterThanOrEqual(25);
    }
    const auditPack = stops.find(({ d }) => d === 275);
    expect(auditPack.d - 5 - 250).toBeLessThan(25);
  });
  it('checks all four checkpoints and leaves the gate at authoring d302', () => {
    expect(L2_CHASE_BREAKABLES.filter(({ kind }) => kind === 'snacks').map(({ d }) => d)).toEqual([97, 173, 238, 268]);
    expect(L2_CHASE.gate).toBe(302);
  });
  it('models gapped-wall two-hit geometry and includes cooldown and lateral travel', () => {
    const wall = L2_CHASE_BREAKABLES.filter(({ d }) => d === 250);
    const { centers, dur } = wallManeuver(wall.map(({ x }) => x));
    expect(centers).toEqual([-2.7, 2.7]);
    for (const { x, d } of wall) {
      // Same sphereBox used by Player._contacts: bite at y .75, .75 m ahead of
      // player stopped .8 m before the wall; Backpack.setBox(.95,1.05,.95).
      const box = { min: { x: x - 0.475, y: 0, z: d - 0.475 }, max: { x: x + 0.475, y: 1.05, z: d + 0.475 } };
      expect(centers.some((center) => sphereBox(center, 0.75, d - 0.8 + 0.75, 0.95, box))).toBe(true);
    }
    expect(dur).toBeCloseTo(2 * 0.34 + 0.08 + 5.4 / 8);
  });
  it('simulates actual pursuit failure when stationary too long', () => {
    const segment = checkpointSegments(L2_CHASE, L2_CHASE_BREAKABLES)[0];
    expect(run({ ...segment, stops: [{ d: 28.2, dur: 6 }] }).dead).toBe(true);
    expect(run({ ...segment }).dead).toBe(false);
  });
});


describe('segment chase budget options', () => {
  const coconut = { start: 30, catStart: 17, delay: 1.2, until: 80, model: 'giant_coconut', scale: 5, speed: 7, catchUp: 1 };
  it('simulates a second model/scale fixture and catches an overlong stop', () => {
    expect(run(coconut).dead).toBe(false);
    expect(run({ ...coconut, stops: [{ d: 40, dur: 8 }] }).dead).toBe(true);
    expect(run({ ...coconut, scale: 2 })).toEqual(run(coconut));
  });
  it('DDA increases the stop budget', () => {
    expect(budget({ ...coconut, dda: .92 }, [], 45)).toBeGreaterThan(budget(coconut, [], 45));
  });
});
