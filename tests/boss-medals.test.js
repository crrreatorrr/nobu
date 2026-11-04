import { describe, expect, it } from 'vitest';
import { BOSS_SPEED_MS, newBossRun, tickBossRun, bossDda, bossMedals } from '../src/bosses/medals.js';

describe('boss fight records and help', () => {
  it('uses dedicated boss-spec speed targets', () => {
    expect(BOSS_SPEED_MS).toEqual({ bird: 70000, cat: 80000, cone: 110000, titan: 120000, queen: 170000 });
  });
  it('counts the whole attempt, pauses cinematic/pause time, and never resets on a retry', () => {
    const run = newBossRun();
    tickBossRun(run, 15, { active: true });
    run.noHit = false; // a retry leaves the clock and hit history intact
    tickBossRun(run, 8, { active: true });
    tickBossRun(run, 20, { active: true, busy: true });
    tickBossRun(run, 30, { active: true, paused: true });
    tickBossRun(run, 5, { active: false });
    expect(run.t).toBe(23);
    expect(bossMedals('bird', run)).toEqual({ clear: true, noHit: false, speed: true, bestMs: 23000 });
  });
  it.each(Object.keys(BOSS_SPEED_MS))('accepts the exact %s target and rejects one millisecond over', (key) => {
    expect(bossMedals(key, { t: BOSS_SPEED_MS[key] / 1000, noHit: true }).speed).toBe(true);
    expect(bossMedals(key, { t: BOSS_SPEED_MS[key] / 1000 + 0.001, noHit: true }).speed).toBe(false);
  });
  it('only improves flags and best time', () => {
    const old = { clear: true, noHit: true, speed: true, bestMs: 20000 };
    expect(bossMedals('bird', { t: 90, noHit: false }, old)).toEqual(old);
    expect(bossMedals('bird', { t: 15, noHit: false }, old).bestMs).toBe(15000);
  });
  it('voids every DDA-helped award without changing prior records', () => {
    const old = { clear: true, noHit: true, speed: true, bestMs: 20000 };
    expect(bossMedals('bird', { t: 1, noHit: true, void: true }, old)).toBeNull();
    expect(old.bestMs).toBe(20000);
  });
  it.each(['god', 'skipped', 'trial', 'remix', 'rush', 'ranked', 'medal'])('excludes %s from ordinary fight records', (mode) => {
    expect(bossMedals('bird', newBossRun(), {}, { [mode]: true })).toBeNull();
  });
  it('only helps at the third death in the same stage', () => {
    expect(bossDda(2)).toEqual({ tele: 1, window: 0, masks: 0 });
    expect(bossDda(3)).toEqual({ tele: 1.15, window: 0.3, masks: 1 });
    expect(bossDda(0)).toEqual({ tele: 1, window: 0, masks: 0 });
  });
  it.each(['god', 'trial', 'remix', 'rush', 'ranked', 'medal'])('keeps DDA off in %s', (mode) => {
    expect(bossDda(9, { [mode]: true })).toEqual({ tele: 1, window: 0, masks: 0 });
  });
});
