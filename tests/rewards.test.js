import { describe, it, expect } from 'vitest';
import { createChain, chainHit, tickChain, resetChain, refreshChain, bankChain, chainPitch } from '../src/game/rewards.js';
import { tallyPlan, tallyFrame, tallyEvents } from '../src/game/tally.js';
import { nextGoal, boundedMiss, sectionName } from '../src/game/hints.js';

describe('Chomp Chain', () => {
  it('counts blast hits separately, freezes airborne/busy and expires at 1.1 grounded seconds', () => {
    const c = createChain(); for (let i = 0; i < 6; i++) chainHit(c);
    tickChain(c, 20); tickChain(c, 20, { grounded: true, busy: true });
    expect(c.n).toBe(6); tickChain(c, 1.09, { grounded: true }); expect(c.n).toBe(6);
    expect(tickChain(c, 0.01, { grounded: true })).toBe(6); expect(c.best).toBe(6); expect(c.n).toBe(0);
  });
  it('runs on a ride even airborne and refreshes purposeful zip hits without counting them', () => {
    const c = createChain(); chainHit(c); tickChain(c, 1, { ride: true }); refreshChain(c);
    tickChain(c, 1, { ride: true }); expect(c.n).toBe(1);
    tickChain(c, 0.1, { ride: true }); expect(c.n).toBe(0);
    refreshChain(c); expect(c.t).toBe(0);
  });
  it('awards once per checkpoint/life, never in trials or arena, retaining best across resets', () => {
    const c = createChain(); let drops = 0;
    for (let j = 0; j < 2; j++) { for (let i = 0; i < 16; i++) drops += +chainHit(c).sphere; resetChain(c); }
    expect(drops).toBe(1); expect(c.best).toBe(16);
    resetChain(c, true); for (let i = 0; i < 8; i++) drops += +chainHit(c).sphere;
    expect(drops).toBe(2); expect(chainHit(c, { arena: true })).toBeNull(); expect(c.n).toBe(8);
    const trial = createChain(); for (let i = 0; i < 20; i++) expect(chainHit(trial, { trial: true }).sphere).toBe(false);
  });
  it('banks max and badges only on eligible clear, with no Ticket mutation', () => {
    const data = { tickets: 17 };
    expect(bankChain(data, '1', { bestChain: 15 })).toBe(false);
    expect(data.chainBadges['1']).toBe(true); expect(bankChain(data, '1', { bestChain: 16 })).toBe(true);
    bankChain(data, '1', { bestChain: 4 }); bankChain(data, '2', { bestChain: 20 }, { trial: true });
    expect(data.bestChain).toEqual({ 1: 16 }); expect(data.tickets).toBe(17);
    expect(chainPitch(1)).toBe(1); expect(chainPitch(13)).toBe(2); expect(chainPitch(99)).toBe(2);
  });
});
describe('tally timeline', () => {
  it('reveals counts, board, stamps and typed hint in order at authored timings', () => {
    const p = tallyPlan({ broken: 40, dogs: 5, tickets: 60, bestChain: 15 }, ['golden', 'snack1'], 'hint', [8]);
    expect(p.steps.map((s) => s.key)).toEqual(['backpacks','dogs','tickets','bestChain','board','stamp','stamp','hint','kennel']);
    expect(p.steps[0]).toMatchObject({ start: 0.5, duration: 1.2 });
    expect(p.steps[1].start).toBeCloseTo(2); expect(p.steps[2].start).toBeCloseTo(3.2);
    expect(p.steps[3].start).toBeCloseTo(4.5); expect(p.steps[4].start).toBeCloseTo(5);
    expect(p.steps[5].start).toBeCloseTo(5.4); expect(p.steps[6].start).toBeCloseTo(5.8);
    expect(tallyFrame(p, 1.1)[0].value).toBe(20);
    expect(tallyFrame(p, p.duration).every((s) => s.visible)).toBe(true);
    expect(tallyEvents(p, 0, p.duration).filter((e) => e.key === 'stamp')).toHaveLength(2);
    expect(tallyEvents(p, p.duration, p.duration + 1)).toEqual([]);
  });
  it('keeps zero-count rows and hides chain below five', () => {
    const p = tallyPlan({ broken: 0, dogs: 0, tickets: 0, bestChain: 4 });
    expect(p.steps.some((s) => s.key === 'bestChain')).toBe(false);
    expect(tallyFrame(p, 0.5)[0]).toMatchObject({ visible: true, value: 0 });
  });
});
describe('one next goal', () => {
  it('prioritizes close Golden misses over deaths and names the busiest section', () => {
    const r = nextGoal({}, { breakables: 40, broken: 38, dogs: 5, dogsTotal: 5, sectionMiss: { 'Lily Pond': 2 }, deathsAtGate: 5 });
    expect(r).toMatchObject({ key: 'hintGolden', args: [{ packs: 2, dogs: 0, section: 'Lily Pond' }] });
  });
  it('uses move availability for hidden secrets and prevents fake complete board claims', () => {
    const ctx = { hidden: { section: 'The Burrow', move: 'dust' }, trialAvailable: true };
    expect(nextGoal({ golden: true, goodBoy: true, snack: 3 }, {}, ctx).key).toBe('hintNewMove');
    expect(nextGoal({ golden: true, goodBoy: true, snack: 3 }, {}, ctx, { dust: true }).args).toEqual(['The Burrow']);
    expect(nextGoal({ golden: true, goodBoy: true, hidden: true, snack: 3 }, {}, ctx).key).toBe('hintCompleteTrial');
  });
  it('handles Snack boundary, saved-only miss counts and bounded names', () => {
    expect(nextGoal({ golden: true, goodBoy: true, snack: 2 }, { snackRaw: 72, snackPotential: 100 }).args).toEqual([72, 80]);
    expect(nextGoal({}, { sectionMiss: { Pond: 2 } }).args[0]).toMatchObject({ packs: 2, section: 'Pond' });
    const b = boundedMiss(Object.fromEntries(Array.from({ length: 20 }, (_, i) => ['x'.repeat(50) + i, i + 1])));
    expect(Object.keys(b).every((k) => k.length <= 40)).toBe(true); expect(Object.keys(b).length).toBeLessThanOrEqual(12);
  });
  it('distinguishes overlapping detour objects from the main path', () => {
    const sections = [{ d0: 0, d1: 100, name: 'Main' }, { d0: 20, d1: 40, name: 'Sky', detour: true }];
    expect(sectionName(sections, 25)).toBe('Main'); expect(sectionName(sections, 25, { detour: true })).toBe('Sky');
  });
});
