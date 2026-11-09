import { expect, it } from 'vitest';
import { remixAvailable, sessionModes, remixGateResult, applyRemixResult } from '../src/game/remix.js';
import { runBones } from '../src/game/bones.js';

const stats = { breakables: 12, broken: 12, dogsTotal: 7, dogs: 7 };
it('requires the Queen and an actual shipped main builder', () => {
  const def = { id: 6, shipped: true, build() {} };
  expect(remixAvailable({ beaten: { 5: true } }, def)).toBe(true);
  for (const patch of [{ shipped: false }, { bonus: true }, { meta: true }, { build: undefined }, { id: 'ride' }])
    expect(remixAvailable({ beaten: { 5: true } }, { ...def, ...patch })).toBe(false);
  expect(remixAvailable({ beaten: { 4: true } }, def)).toBe(false);
});
it('rejects conflicting modes instead of silently starting a ranked remix', () => {
  expect(sessionModes({ remix: true })).toEqual({ remix: true, trial: false, rush: false });
  for (const flags of [{ remix: true, trial: true }, { remix: true, rush: true }, { trial: true, rush: true }])
    expect(() => sessionModes(flags)).toThrow('mutually exclusive');
});
it('captures all countables and dogs at the gate, before boss deaths or rain', () => {
  const mutable = { ...stats }, gate = remixGateResult(mutable, { remix: true });
  mutable.broken = 0; mutable.dogs = 0; mutable.deathsAtGate = 20;
  expect(gate).toEqual({ golden: true }); expect(Object.isFrozen(gate)).toBe(true);
  for (const patch of [{ broken: 11 }, { dogs: 6 }, { breakables: 0 }, { broken: Infinity }, { dogsTotal: NaN }])
    expect(remixGateResult({ ...stats, ...patch }, { remix: true }).golden).toBe(false);
});
it('banks only the remix bone after completion, idempotently and without ordinary progress', () => {
  const data = { beaten: { 5: true }, boneBoard: { 1: { golden: false } }, dogsFreed: {}, tickets: 10, open: { 1: true } };
  const before = structuredClone(data), gate = remixGateResult(stats, { remix: true });
  expect(applyRemixResult(data, 1, gate, { remix: true })).toBe(false);
  expect(data).toEqual(before);
  expect(applyRemixResult(data, 1, gate, { remix: true, completed: true })).toBe(true);
  expect(data).toEqual({ ...before, remix: { 1: { golden: true } } });
  expect(applyRemixResult(data, 1, gate, { remix: true, completed: true })).toBe(false);
  expect(applyRemixResult(data, 1, { golden: false }, { remix: true, completed: true })).toBe(false);
  expect(data.remix[1].golden).toBe(true);
});
it('rejects sticky God use for mastery without changing ordinary God Golden eligibility', () => {
  expect(runBones(stats, { god: true }).golden).toBe(true);
  for (const flags of [{ god: true }, { godUsed: true }, { trial: true }, { rush: true }]) {
    expect(remixGateResult(stats, { remix: true, ...flags }).golden).toBe(false);
    expect(applyRemixResult({}, 1, { golden: true }, { remix: true, completed: true, ...flags })).toBe(false);
  }
  expect(remixGateResult({ ...stats, godUsed: true }, { remix: true }).golden).toBe(false);
});
