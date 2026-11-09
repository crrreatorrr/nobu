import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Session } from '../src/game/session.js';
import { BOSS_TALK } from '../src/story/script.js';
import { hub } from '../src/hub/hubBridge.js';
import { audio } from '../src/audio/audio.js';
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(audio, 'stopMusic').mockImplementation(() => {});
  vi.spyOn(audio, 'play').mockImplementation(() => {});
  vi.spyOn(hub, 'reportCone').mockResolvedValue(undefined);
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });
it.each(['queen', 'cone', 'bird'])('dispatches the authored %s defeat without changing Cone reporting', key => {
  const ui = { say: vi.fn(), bossHp: vi.fn() };
  const s = Object.assign(Object.create(Session.prototype), {
    game: { ui, player: {} }, def: { bossKey: key }, projectiles: { clear: vi.fn() },
    _awardBossMedals: vi.fn(), attemptId: 'defeat-test', attemptDurable: true,
  });
  s.onBossDefeated({});
  if (key === 'queen' || key === 'cone') expect(ui.say).toHaveBeenCalledExactlyOnceWith(BOSS_TALK[key].death);
  else expect(ui.say).not.toHaveBeenCalled();
  expect(hub.reportCone).toHaveBeenCalledTimes(key === 'cone' ? 1 : 0);
  expect(s.busy).toBe(true);
  expect(s.projectiles.clear).toHaveBeenCalledOnce();
  expect(s.game.player.frozen).toBe(true);
});
