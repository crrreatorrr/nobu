import { describe, expect, it } from 'vitest';
import { BOSS_SPEED_MS } from '../src/bosses/medals.js';
import { TRIAL_FLOOR_MS } from '../src/config/trials.js';
import { masteryTargets, masteryTrialMedal, trialMastery, mergeTrialMastery, perfectRun, bankPerfect, bossMedalRows } from '../src/game/mastery.js';
import { trialTargetLine, bossMedalPanel, perfectPaw, eligibleTrialLine } from '../src/game/masteryView.js';
const def = { id: 1, shipped: true, bonus: false }, perfect = { breakables: 10, broken: 10, dogs: 5, dogsTotal: 5, deathsAtGate: 0 };
const rec = (ms, godUsed, more = {}) => ({ ms, best: ms / 1000, layout: 1, pid: godUsed ? null : 'clean-player', godUsed, ...more });
const copy = { bossNames: { bird: 'MECHA BIRD' }, noHit: 'No-Hit', speed: 'Speed', perfect: 'PERFECT RUN!', eligibleBest: (t) => `Eligible best ${t}` };

describe('Platinum eligibility records', () => {
  it('uses current50/47/41 targets above hubfloor and below gold; keeps authored future targets', () => {
    for (const id of [1, 2, 3]) { const [gold,,, platinum] = masteryTargets(id); expect(platinum * 1000).toBeGreaterThan(TRIAL_FLOOR_MS[id]); expect(platinum).toBeLessThan(gold); }
    expect(masteryTargets('1v2')[3]).toBe(86);
    expect(masteryTrialMedal(1, 50)).toBe('platinum'); expect(masteryTrialMedal(1, 50.001)).toBe('gold');
    expect(masteryTrialMedal(1, 49, { godUsed: true })).toBe('gold'); expect(masteryTrialMedal(1, 0)).toBeNull();
  });
  it('uses accepted integer milliseconds at the live/result/reload Platinum rounding boundary', () => {
    for (const seconds of [49.9994, 49.9995, 50, 50.0004, 50.0005, 50.0006]) {
      const ms = Math.round(seconds * 1000), expected = ms <= 50000 ? 'platinum' : 'gold';
      const live = masteryTrialMedal(1, seconds);
      const stored = trialMastery(1, rec(ms, false, { best: seconds }));
      const reloaded = trialMastery(1, JSON.parse(JSON.stringify(stored)));
      expect(live).toBe(expected); expect(stored.medal).toBe(live); expect(reloaded.medal).toBe(live);
    }
  });
  it('persists a god-used best as ineligible even after the current toggle is off and reload normalization', () => {
    const first = trialMastery(1, rec(45000, true));
    expect(first).toMatchObject({ godUsed: true, bestEligibleMs: null, medal: 'gold' });
    expect(trialMastery(1, JSON.parse(JSON.stringify(first)))).toEqual(first);
  });
  it('allows clean49s Platinum after a faster45s god practice best and keeps their metadata associated', () => {
    const merged = mergeTrialMastery(1, rec(45000, true, { at: 1 }), rec(49000, false, { at: 2 }));
    expect(merged).toMatchObject({ ms: 45000, best: 45, godUsed: true, pid: null, at: 1, bestEligibleMs: 49000, medal: 'platinum' });
    expect(eligibleTrialLine(merged, copy)).toBe('Eligible best 0:49.00');
    expect(trialMastery(1, JSON.parse(JSON.stringify(merged)))).toEqual(merged);
    expect(mergeTrialMastery(1, rec(49000, false), rec(45000, true))).toMatchObject({ ms: 45000, godUsed: true, bestEligibleMs: 49000, medal: 'platinum' });
  });
  it('prefers a clean equal-time record atomically and never copies its pid onto a faster god record', () => {
    const clean = rec(49000, false, { deaths: 0, freezeMs: 100 }), god = rec(49000, true, { deaths: 4, freezeMs: 0 });
    expect(mergeTrialMastery(1, god, clean)).toMatchObject(clean);
    expect(mergeTrialMastery(1, clean, god)).toMatchObject(clean);
    expect(mergeTrialMastery(1, clean, rec(45000, true))).toMatchObject({ ms: 45000, godUsed: true, pid: null });
  });
  it('upgrades unknown historical records as required, without guessing god use from standalone pid', () => {
    const unknown = { ms: 49000, best: 49, pid: null, layout: 1 };
    expect(trialMastery(1, unknown)).toMatchObject({ godUsed: false, bestEligibleMs: 49000, medal: 'platinum' });
    expect(trialMastery(1, rec(45000, true, { bestEligibleMs: 1 }))).toMatchObject({ bestEligibleMs: null, medal: 'gold' });
    expect(trialMastery('1v2', rec(45000, false))).toBeNull();
    expect(trialMastery(1, rec(45000, true, { bestEligibleMs: 40000 }))).toMatchObject({ bestEligibleMs: null, medal: 'gold' });
  });
  it('reveals the Platinum target only after gold and leaves hub integer time units unchanged', () => {
    expect(trialTargetLine(1, null)).not.toContain('💎'); expect(trialTargetLine(1, { medal: 'silver' })).not.toContain('💎');
    expect(trialTargetLine(1, { medal: 'gold' })).toContain('💎 0:50.00');
    expect(trialMastery(1, rec(49123, false)).ms).toBe(49123);
  });
});

describe('Perfect Run ordinary-run rule', () => {
  it('requires breakables, dogs and zero gate deaths without requiring Hidden or Snack bones', () => {
    expect(perfectRun({ ...perfect, hiddenFound: false, snackTier: 0 }, {}, def)).toBe(true);
    expect(perfectRun({ ...perfect, hiddenFound: true, snackTier: 3, broken: 9 }, {}, def)).toBe(false);
    expect(perfectRun({ ...perfect, godUsed: true }, {}, def)).toBe(false);
    expect(perfectRun({ ...perfect, dogs: 4 }, {}, def)).toBe(false); expect(perfectRun({ ...perfect, deathsAtGate: 1 }, {}, def)).toBe(false);
    expect(perfectRun({ ...perfect, breakables: 0, broken: 0 }, {}, def)).toBe(false);
  });
  it('excludes competitive and god contexts and bonus/meta/unshipped content but includes goal-onlyL6', () => {
    for (const flag of ['trial', 'remix', 'rush', 'god', 'godUsed']) expect(perfectRun(perfect, { [flag]: true }, def)).toBe(false);
    for (const other of [{ ...def, bonus: true }, { ...def, meta: true }, { ...def, shipped: false }, { ...def, id: 'g1' }]) expect(perfectRun(perfect, {}, other)).toBe(false);
    expect(perfectRun(perfect, {}, { id: 6, shipped: true, goal: true })).toBe(true);
  });
  it('banks a gate candidate once, never revokes old relics, and refuses invalid contexts/ids', () => {
    const data = { perfect: {} }; expect(bankPerfect(data, 1, true)).toBe(true); expect(bankPerfect(data, 1, true)).toBe(false);
    expect(bankPerfect(data, 1, false)).toBe(false); expect(data.perfect[1]).toBe(true);
    expect(bankPerfect(data, 2, true, { godUsed: true })).toBe(false); expect(bankPerfect(data, 'ride', true)).toBe(false);
    const cleanGate = perfectRun(perfect, {}, def);
    expect(bankPerfect(data, 3, cleanGate, { dda: true, ddaUsed: true, bossDeaths: 3 })).toBe(true);
  });
});

describe('shipped boss and paw presentation', () => {
  it('lists only beaten shipped bosses with existing dedicated thresholds and no goal/meta placeholders', () => {
    const registry = { 1: { ...def, bossKey: 'bird' }, 2: { id: 2, shipped: true, bossKey: 'cat' }, 4: { id: 4, shipped: false, bossKey: 'titan' }, 6: { id: 6, shipped: true, goal: true }, kennel: { id: 'kennel', shipped: true, meta: true } };
    const data = { beaten: { 1: true, 4: true, 6: true }, bossMedals: { bird: { clear: true, noHit: false, speed: true, bestMs: 69000 } } };
    const rows = bossMedalRows(data, registry); expect(rows).toHaveLength(1); expect(rows[0].targetMs).toBe(BOSS_SPEED_MS.bird);
    expect(bossMedalPanel(data, registry, 1, copy)).toContain('Speed 1:09.00 / 1:10.00 ✓'); expect(bossMedalPanel(data, registry, 2, copy)).toBe('');
    expect(perfectPaw(true, copy)).toContain('aria-label="PERFECT RUN!"'); expect(perfectPaw(false, copy)).toBe('');
  });
});
