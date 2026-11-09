import * as THREE from 'three';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { Session } from '../src/game/session.js';
import { Game } from '../src/game/game.js';
import { Breakable } from '../src/entities/entity.js';
import { ConedDog } from '../src/entities/dogs.js';
import { save } from '../src/core/save.js';
import { hub } from '../src/hub/hubBridge.js';
import { resetWorld } from './helpers.js';
function session(trial = false) {
  const game = { ui: { trialTime() {}, fade: async () => {}, banner: vi.fn() }, player: { frozen: false }, trialDone: vi.fn() };
  const s = new Session(game, 1, { trial }); game.session = s; s.trialT = 49.0004; s.freezeMs = 3000; s.attemptId = 'attempt'; s.attemptDurable = true;
  return s;
}
beforeEach(() => { resetWorld(); vi.spyOn(hub, 'bank').mockResolvedValue(undefined); vi.spyOn(hub, 'playerId').mockReturnValue('clean-player'); vi.spyOn(hub, 'submitScore').mockResolvedValue(true); });
afterEach(() => vi.restoreAllMocks());
it('finishes a clean Platinum trial with the same integer-ms score and matching reload medal', async () => {
  const s = session(true); s._finishTrial(); await Promise.resolve();
  expect(hub.submitScore).toHaveBeenCalledWith(49000, 1, { deaths: 0, freezeMs: 3000 });
  expect(s.game.trialDone).toHaveBeenCalledWith(s, 49.0004, 'platinum', true);
  save.load(); expect(save.data.trials[1]).toMatchObject({ medal: 'platinum', godUsed: false, bestEligibleMs: 49000 });
});
it('sticky god use cannot grant Platinum or upload after toggling off; slower clean run still earns its tag', async () => {
  const god = session(true); god.godUsed = true; god.trialT = 45; save.data.godMode = false; god._finishTrial(); await Promise.resolve();
  expect(hub.submitScore).not.toHaveBeenCalled(); expect(save.data.trials[1]).toMatchObject({ ms: 45000, godUsed: true, medal: 'gold', pid: null });
  const clean = session(true); clean.trialT = 49; clean._finishTrial(); await Promise.resolve();
  expect(hub.submitScore).toHaveBeenCalledWith(49000, 1, { deaths: 0, freezeMs: 3000 });
  expect(save.data.trials[1]).toMatchObject({ ms: 45000, godUsed: true, bestEligibleMs: 49000, medal: 'platinum' });
  expect(clean.game.trialDone).toHaveBeenCalledWith(clean, 49, 'platinum', false);
});
function perfectStage(s) {
  const b = () => Object.assign(Object.create(Breakable.prototype), { countable: true, broken: true });
  const dog = Object.assign(Object.create(ConedDog.prototype), { freed: true, dogId: '1:shiba-a' });
  s.stage = { entities: [b(), b(), dog], sections: [] }; s.breakablesTotal = 2; s.dogsTotal = 1; s.freedIds.add('1:shiba-a');
  s._missedRain = async () => {}; s.startBoss = vi.fn();
}
it('captures a clean level gate before boss retries/DDA and banks Perfect only on actual clear', async () => {
  const s = session(); perfectStage(s); await s.reachBossGate();
  expect(s.stats).toMatchObject({ perfectCandidate: true, deathsAtGate: 0, hiddenFound: false, snackTier: 0 }); expect(save.data.perfect[1]).not.toBe(true);
  s.deaths = 3; s.bossDdaUsed = true;
  Game.prototype.levelCleared.call({ playCutscene() {}, _unlockMainChapters: Game.prototype._unlockMainChapters }, s);
  expect(save.data.perfect[1]).toBe(true); expect(s.stats.perfectFresh).toBe(true); expect(save.data.tickets).toBe(0);
});
it('does not bank a quit gate or god-used run and never awards a Perfect candidate from a bonus', async () => {
  const quit = session(); perfectStage(quit); await quit.reachBossGate(); save.write(); save.load(); expect(save.data.perfect[1]).not.toBe(true);
  const god = session(); perfectStage(god); god.godUsed = true; await god.reachBossGate(); expect(god.stats.perfectCandidate).toBe(false);
  Game.prototype.levelCleared.call({ playCutscene() {}, _unlockMainChapters: Game.prototype._unlockMainChapters }, god); expect(save.data.perfect[1]).not.toBe(true);
  const bonus = session(); perfectStage(bonus); bonus.def = { ...bonus.def, bonus: true }; bonus._recordLevelStats(); expect(bonus.stats.perfectCandidate).toBe(false);
});
it('banks a captured Perfect at the goal of a goal-only main L6 fixture without a boss', async () => {
  vi.useFakeTimers();
  try {
    const s = session(); perfectStage(s); s.level = 6; s.def = { ...s.def, id: 6, goal: true, bossKey: undefined };
    s.freedIds = new Set(['6:shiba-a']); s.game.player.setRide = vi.fn(); const shown = vi.fn();
    s.game.stage = s.stage;
    s.game.goalLevelCleared = (run) => Game.prototype.goalLevelCleared.call({ session:run, stage:run.stage, _showComplete: shown, _unlockMainChapters: Game.prototype._unlockMainChapters }, run);
    const done = s.reachGoal(); await vi.runAllTimersAsync(); await done;
    expect(s.stats.perfectCandidate).toBe(true); expect(save.data.perfect[6]).toBe(true); expect(save.data.beaten[6]).toBe(true); expect(save.data.open[5]).toBe(true); expect(shown).toHaveBeenCalled();
  } finally { vi.useRealTimers(); }
});
