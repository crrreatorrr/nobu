import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TRIAL_BOARD, TRIAL_CEIL_MS, TRIAL_FLOOR_MS, trialMsInBounds, trialLayout, trialVariant } from '../src/config/trials.js';
import { extendedD } from '../src/levels/data/l2-extended.js';
import { shiftL3 } from '../src/levels/data/l3-layout.js';
import { TUNING } from '../src/player/player.js';

// Track distance from the level spawn to the boss-gate trigger that ends the trial.
// Read from the level source so a moved gate or spawn fails this test.
function trackD(src, expr, layout, level) {
  const e = expr.trim();
  const direct = Number(e);
  if (Number.isFinite(direct)) return direct;
  // L1 keeps both authored layouts while the registry selects one.
  const conditional = e.match(/^extended\s*\?\s*(\d+)\s*:\s*(\d+)$/);
  if (conditional) return Number(conditional[layout > 1 ? 1 : 2]);
  // Level 2 writes D(302), with `const D = (d) => d + O`.
  const d = e.match(/^D\((\d+(?:\.\d+)?)\)$/);
  expect(d, `track expression ${e}`).toBeTruthy();
  if(level===2&&layout===2)return extendedD(Number(d[1]));
  const o = src.match(/const O = (-?\d+(?:\.\d+)?)/);
  return Number(d[1]) + (o ? Number(o[1]) : 0);
}

function gateDistance(level, layout = trialLayout(level)) {
  const src = fs.readFileSync(path.resolve(`src/levels/level${level}${level===2&&layout===2?'Extended':''}.js`), 'utf8');
  const gate = src.match(/k\.trigger\(([^,]+),\s*\(\)\s*=>\s*game\.session\.reachBossGate\(\)\)/);
  const spawn = src.match(/spawn:\s*k\.W\(0,\s*0,\s*([^)]+\)?)\)/);
  expect(gate, `level ${level} boss gate trigger`).toBeTruthy();
  expect(spawn, `level ${level} spawn`).toBeTruthy();
  // Factory layout2 applies this authoring transform through shiftedFactoryKit.
  const transform = level === 3 && layout === 2 ? shiftL3 : d => d;
  return transform(trackD(src, gate[1], layout,level)) - transform(trackD(src, spawn[1], layout,level));
}

describe('trial bounds (metaverse-hub CONTRACT C13)', () => {
  it('preserves Classic hub bounds and declares gated v2 bounds', () => {
    expect(TRIAL_BOARD).toBe('nobu_trial_time');
    expect(TRIAL_FLOOR_MS).toEqual({ 1: 15000, 2: 15000, 3: 12000, '1v2': 25700, '2v2': 26000, '3v2': 20600, 4: 24000, 6: 30000 });
    expect(TRIAL_CEIL_MS).toBe(1_800_000);
  });

  it('every floor is below the fastest physically possible run', () => {
    expect(TUNING.SLIDE_SPEED).toBe(12.5);
    for (const level of [1, 2, 3]) for (const layout of new Set([1, trialLayout(level)])) {
      const dist = gateDistance(level, layout);
      expect(dist).toBeGreaterThan(layout > 1 ? 400 : 200);
      const fastestMs = (dist / TUNING.SLIDE_SPEED) * 1000;
      expect(fastestMs, `level ${level}: ${dist} m`).toBeGreaterThan(TRIAL_FLOOR_MS[trialVariant(level, layout)]);
    }
  });

  it('trialMsInBounds takes integers inside the floor and ceiling only', () => {
    expect(trialMsInBounds(1, 15000)).toBe(true);
    expect(trialMsInBounds(1, 14999)).toBe(false);
    expect(trialMsInBounds(3, 12000)).toBe(true);
    expect(trialMsInBounds(2, TRIAL_CEIL_MS)).toBe(true);
    expect(trialMsInBounds(2, TRIAL_CEIL_MS + 1)).toBe(false);
    expect(trialMsInBounds(2, 20000.5)).toBe(false);
    expect(trialMsInBounds(0, 20000)).toBe(false);
  });
});
