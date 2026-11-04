import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { DEATH_KEY, SECTION_KEY, appendDeath, readRecords, deathCounts, advanceTimer, sectionFor } from '../src/dev/tuningData.js';
import { installTuningTools } from '../src/dev/tuning.js';

const death = (i, extra = {}) => ({ level: 1, d: i, x: 0, cause: 'fall', t: i, ...extra });
const sections = [{ d0: 0, d1: 10, name: 'Lily Pond' }, { d0: 10, d1: 30, name: 'Box Run' },
  { d0: 12, d1: 20, name: 'Sky Walk', detour: true }];
function fixture() {
  const player = { pos: new THREE.Vector3(0, 0, -5), body: { s: 5, u: 0 }, dead: false, frozen: false };
  const track = { sections, heightAt: () => 0, groundAt: () => ({ y: 0 }),
    project: (x, z) => ({ s: -z, u: x }), toWorld: (d, x) => new THREE.Vector3(x, 0, -d) };
  const stage = { track, scene: new THREE.Scene(), detours: [{ y: 10, solids: new Set() }] };
  const game = { player, ui: {}, startLevel: vi.fn(async () => {}) };
  const session = { game, stage, level: 1, phase: 'level' }; game.session = session;
  return { game, session, stage, player };
}
afterEach(() => { localStorage.clear(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('development telemetry data', () => {
  it('merges persisted deaths, rejects corrupt records, and keeps the newest 2000 by time', () => {
    localStorage.setItem(DEATH_KEY, JSON.stringify(Array.from({ length: 2000 }, (_, i) => death(i))));
    const rows = appendDeath(localStorage, death(2000));
    expect(rows).toHaveLength(2000); expect(rows[0].t).toBe(1);
    expect(readRecords(localStorage, DEATH_KEY).at(-1).t).toBe(2000);
    localStorage.setItem(DEATH_KEY, JSON.stringify([null, {}, death(2)]));
    expect(appendDeath(localStorage, death(3))).toEqual([death(2), death(3)]);
    localStorage.setItem(DEATH_KEY, '{bad');
    expect(appendDeath(localStorage, death(4))).toEqual([death(4)]);
    localStorage.setItem(DEATH_KEY, '{}'); expect(readRecords(localStorage, DEATH_KEY)).toEqual([]);
  });
  it('survives disabled storage and quota exhaustion', () => {
    const blocked = { getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } };
    expect(appendDeath(blocked, death(0))).toEqual([death(0)]);
    expect(appendDeath(undefined, death(0))).toEqual([death(0)]);
  });
  it('groups by level and canonical section, retaining captured detour context', () => {
    expect(deathCounts([death(2), death(15), death(15, { section: 'Sky Walk' }), death(2, { level: 2 })], 1, sections))
      .toEqual({ 'Lily Pond': 1, 'Box Run': 1, 'Sky Walk': 1 });
  });
  it('times section transitions and returns, excluding inactive play without resetting on death', () => {
    const { session, player } = fixture(), times = Object.create(null);
    advanceTimer(session, player, 2, times);
    player.body.s = 15; advanceTimer(session, player, 3, times);
    for (const key of ['busy', 'dying', 'bonusRound', 'over']) {
      session[key] = true; advanceTimer(session, player, 50, times); session[key] = false;
    }
    for (const key of ['dead', 'frozen']) {
      player[key] = true; advanceTimer(session, player, 50, times); player[key] = false;
    }
    session.game.ui.talking = true; advanceTimer(session, player, 50, times); session.game.ui.talking = false;
    session.phase = 'boss'; advanceTimer(session, player, 50, times); session.phase = 'level';
    player.body.s = 5; advanceTimer(session, player, 1, times);
    expect(times).toEqual({ 'Lily Pond': 3, 'Box Run': 3 });
  });
  it('distinguishes overlapping sky and main sections using player support or height', () => {
    const { stage, player } = fixture(); player.body.s = 15;
    expect(sectionFor(stage, player).name).toBe('Box Run');
    player.pos.y = 10; expect(sectionFor(stage, player).name).toBe('Sky Walk');
    player.pos.y = 0; player.body.ground = {}; stage.detours[0].solids.add(player.body.ground);
    expect(sectionFor(stage, player).name).toBe('Sky Walk');
  });
  it('attributes an airborne fall to its detour until the player lands on the main path', () => {
    const { stage, player } = fixture(), context = {}; player.body.s = 15; player.pos.y = 10;
    expect(sectionFor(stage, player, 15, context).name).toBe('Sky Walk');
    player.pos.y = -10;
    expect(sectionFor(stage, player, 15, context).name).toBe('Sky Walk');
    player.body.grounded = true; player.pos.y = 0;
    expect(sectionFor(stage, player, 15, context).name).toBe('Box Run');
  });
});

describe('development-only tooling integration', () => {
  it('records projected deaths, persists sprites across a level rebuild, and flushes the gate once', async () => {
    const { game, session, stage, player } = fixture(), T = {};
    const table = vi.spyOn(console, 'table').mockImplementation(() => {});
    installTuningTools(game, T); T.heatmap(true);
    player.pos.set(2, 0, -5);
    game.devTuning.update(session, 2); game.devTuning.death(session, 'fall');
    expect(readRecords(localStorage, DEATH_KEY)[0]).toMatchObject({ d: 5, x: 2, cause: 'fall', section: 'Lily Pond' });
    expect(T.deaths()).toEqual({ 'Lily Pond': 1 });
    let dot = stage.scene.getObjectByName('dev-death-heatmap').children[0];
    expect(dot.position.toArray()).toEqual([2, .2, -5]);
    expect(dot.scale.x).toBe(.4); expect(dot.material.opacity).toBe(.5);
    session.stage = { ...stage, scene: new THREE.Scene() };
    await game.startLevel(1);
    expect(stage.scene.children).toHaveLength(0);
    expect(session.stage.scene.getObjectByName('dev-death-heatmap').children).toHaveLength(1);
    game.devTuning.gate(session); game.devTuning.gate(session);
    expect(table).toHaveBeenCalledTimes(1);
    expect(readRecords(localStorage, SECTION_KEY)).toHaveLength(1);
    expect(readRecords(localStorage, SECTION_KEY)[0].sections['Lily Pond']).toEqual({ seconds: 2, deaths: 1 });
    T.clearDeaths(); expect(T.deaths()).toEqual({});
    expect(session.stage.scene.getObjectByName('dev-death-heatmap').children).toHaveLength(0);
  });
  it('adds no methods, storage reads, renderer objects or start wrapper when DEV is false', () => {
    vi.stubEnv('DEV', false);
    const { game, stage } = fixture(), T = {}, start = game.startLevel;
    const storageRead = vi.spyOn(Storage.prototype, 'getItem');
    installTuningTools(game, T);
    expect(game.devTuning).toBeUndefined(); expect(T).toEqual({});
    expect(game.startLevel).toBe(start); expect(stage.scene.children).toHaveLength(0);
    expect(storageRead).not.toHaveBeenCalled();
  });
});
