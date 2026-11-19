// God Mode never earns hub payouts: no hub.bank (Hub Tickets), hub.reportCone (cones_tip Relic)
// or hub.submitScore (trial board) for a run God Mode was on for at any point.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { save } from '../src/core/save.js';
import { Session } from '../src/game/session.js';
import { Game } from '../src/game/game.js';
import { hub } from '../src/hub/hubBridge.js';
import { audio } from '../src/audio/audio.js';
import { bankAttempt, hubRewardsBlocked, reportConeRelic } from '../src/game/hubRewards.js';
import { UI, GOD_HUB_NOTE } from '../src/ui/ui.js';
import { resetWorld } from './helpers.js';

let bank, cone, score;
beforeEach(() => {
  resetWorld();
  save.data.godMode = false;
  bank = vi.spyOn(hub, 'bank').mockResolvedValue();
  cone = vi.spyOn(hub, 'reportCone').mockResolvedValue();
  score = vi.spyOn(hub, 'submitScore').mockResolvedValue();
  vi.spyOn(hub, 'playerId').mockReturnValue('known-player');
  vi.spyOn(hub, 'flushScores').mockResolvedValue();
  vi.spyOn(audio, 'play').mockImplementation(() => {});
  vi.spyOn(audio, 'stopMusic').mockImplementation(() => {});
});
afterEach(() => { save.data.godMode = false; vi.restoreAllMocks(); });

const run = (extra = {}) => ({ attemptId: 'a-1', attemptDurable: true, levelTickets: 30, godUsed: false, game: { player: {} }, ...extra });
const GOD_STATES = [
  ['God Mode on now', () => { save.data.godMode = true; return run(); }],
  ['God Mode used earlier in the run', () => run({ godUsed: true })],
  ['God-assisted level stats', () => run({ stats: { godUsed: true } })],
];

describe('hubRewardsBlocked', () => {
  it('is false for a clean run and true for every God-assisted state', () => {
    expect(hubRewardsBlocked(run())).toBe(false);
    for (const [, make] of GOD_STATES) expect(hubRewardsBlocked(make())).toBe(true);
  });
});

describe('bankAttempt / reportConeRelic', () => {
  it('a clean run banks its Tickets and reports the Cone', async () => {
    expect(await bankAttempt(run())).toBe(true);
    expect(await reportConeRelic(run())).toBe(true);
    expect(bank).toHaveBeenCalledExactlyOnceWith('a-1', 30, true);
    expect(cone).toHaveBeenCalledExactlyOnceWith('a-1', true);
  });

  it.each(GOD_STATES)('%s: nothing is sent', async (_, make) => {
    expect(await bankAttempt(make())).toBe(false);
    expect(await reportConeRelic(make())).toBe(false);
    expect(bank).not.toHaveBeenCalled();
    expect(cone).not.toHaveBeenCalled();
  });

  it('a failed send is logged, not thrown', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    bank.mockRejectedValueOnce(new Error('down'));
    expect(await bankAttempt(run())).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});

describe('every call site', () => {
  const clear = (s) => ({ level: 1, levelTickets: 25, attemptId: 'a-2', attemptDurable: true, godUsed: false,
    stats: { tickets: 25, broken: 0, breakables: 0, dogs: 0, dogsTotal: 0 }, ...s });

  it.each([false, true])('levelCleared / goalLevelCleared / bonusCleared (god %s)', async (god) => {
    save.data.godMode = god;
    const g = { playCutscene() {}, _showComplete() {}, _unlockMainChapters: Game.prototype._unlockMainChapters };
    Game.prototype.levelCleared.call(g, clear());
    Game.prototype.goalLevelCleared.call(g, clear({ level: 4 }));
    Game.prototype.bonusCleared.call(g, clear({ level: 'cave' }));
    expect(bank).toHaveBeenCalledTimes(god ? 0 : 3);
  });

  it('a run that switched God Mode on and off again still banks nothing', () => {
    const g = { playCutscene() {}, _unlockMainChapters: Game.prototype._unlockMainChapters };
    Game.prototype.levelCleared.call(g, clear({ godUsed: true }));
    expect(bank).not.toHaveBeenCalled();
  });

  const trial = (level = 1) => {
    const game = { player: { pos: new THREE.Vector3() }, ui: { trialTime() {}, fade: () => Promise.resolve() }, trialDone: vi.fn() };
    const s = new Session(game, level, { trial: true });
    game.session = s; s.attemptId = 'a-3'; s.attemptDurable = true; s.levelTickets = 12; s.trialT = 85;
    return s;
  };

  it('a clean time trial banks and posts its score', async () => {
    trial()._finishTrial(); await Promise.resolve();
    expect(bank).toHaveBeenCalledOnce();
    expect(score).toHaveBeenCalledOnce();
  });

  it.each([['on', true, false], ['used', false, true]])('a God Mode (%s) time trial sends neither Tickets nor a score', async (_, on, used) => {
    const s = trial();
    save.data.godMode = on; s.godUsed = used;
    s._finishTrial(); await Promise.resolve();
    expect(bank).not.toHaveBeenCalled();
    expect(score).not.toHaveBeenCalled();
  });

  const defeat = (extra) => Object.assign(Object.create(Session.prototype), {
    game: { ui: { say: vi.fn(), bossHp: vi.fn() }, player: {} }, def: { bossKey: 'cone' }, projectiles: { clear: vi.fn() },
    _awardBossMedals: vi.fn(), attemptId: 'a-4', attemptDurable: true, godUsed: false, ...extra,
  });

  it('beating the Evil Cone reports the Relic only without God Mode', () => {
    vi.useFakeTimers();
    try {
      defeat().onBossDefeated({});
      expect(cone).toHaveBeenCalledOnce();
      defeat({ godUsed: true }).onBossDefeated({});
      save.data.godMode = true;
      defeat().onBossDefeated({});
      expect(cone).toHaveBeenCalledOnce();
    } finally { vi.clearAllTimers(); vi.useRealTimers(); }
  });

  it('a Box Gauntlet first clear in God Mode banks nothing', async () => {
    const s = Object.assign(Object.create(Session.prototype), {
      game: { player: { frozen: false }, gauntletCleared: vi.fn() }, level: 'g1', def: { gauntlet: true },
      stage: { entities: [] }, breakablesTotal: 0, deaths: 0, gauntletT: 10, attemptId: 'a-5', attemptDurable: true,
      levelTickets: 40, godUsed: true, disposed: false,
    });
    s.game.session = s;
    vi.spyOn(save, 'withGauntletEnd').mockResolvedValue({ tickets: 0, medals: [], claimDurable: true });
    vi.spyOn(audio, 'setRate').mockImplementation(() => {});
    await s._finishGauntlet();
    expect(bank).not.toHaveBeenCalled();
  });
});

describe('HUD note', () => {
  it('shows "Hub Tickets & Relics disabled" under GOD MODE only in a hub session', () => {
    const ui = Object.create(UI.prototype);
    ui.god = document.createElement('div');
    ui.god.innerHTML = '<div class="god-hub"></div>';
    ui.godHubEl = ui.god.firstChild;
    ui.godBadge(true, true);
    expect(ui.godHubEl.textContent).toBe(GOD_HUB_NOTE);
    expect(GOD_HUB_NOTE).toBe('Hub Tickets & Relics disabled');
    ui.godBadge(true, false);
    expect(ui.godHubEl.textContent).toBe('');
    ui.godBadge(false, true);
    expect(ui.god.classList.contains('on')).toBe(false);
    expect(ui.godHubEl.textContent).toBe('');
  });
});
