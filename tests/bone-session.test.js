import * as THREE from 'three';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { Session } from '../src/game/session.js';
import { Game } from '../src/game/game.js';
import { Breakable } from '../src/entities/entity.js';
import { ConedDog } from '../src/entities/dogs.js';
import { save } from '../src/core/save.js';
import { runBones, boneContext } from '../src/game/bones.js';
import { resetWorld } from './helpers.js';
beforeEach(() => { resetWorld(); vi.useFakeTimers(); });
afterEach(() => vi.useRealTimers());
function session() {
 const game = { ui: { setHud() {}, banner() {}, fade: async () => {} }, player: { facing: 0, spawnAt() {}, pos: new THREE.Vector3(), setRide() {} }, camera: { snap() {} }, mask: { snapTo() {} }, fx: { clear() {} } };
 const s = new Session(game, 1); game.session = s;
 s.stage = { entities: [] }; s.tickets = { restoreAfter() {}, clearFlying() {} }; s.projectiles = { clear() {} }; s.setMask = () => {}; s._pushHud = () => {};
 s.breakablesTotal = 2; s.dogsTotal = 1; s.snack.potential = 10;
 s.checkpoint(new THREE.Vector3());
 return s;
}
it('counts raw before whole scaling, excludes all four tagged sources, and restores exact checkpoint raw and dog IDs', () => {
 const s = session();
 s.addTickets(2); expect(s.levelTickets).toBe(0); expect(s.snack.raw).toBe(2);
 s.freedIds.add('1:shiba-a'); s.checkpoint(new THREE.Vector3());
 s.addTickets(4); s.freedIds.add('1:pug-a');
 for (const source of ['coconut','mystery','jackpot','bark']) s.addTickets(1, source);
 expect(s.snack.raw).toBe(6);
 s.respawn(); expect(s.snack.raw).toBe(2); expect([...s.freedIds]).toEqual(['1:shiba-a']);
});
it('freezes actual gate counts before arena deaths and banks only on clear', async () => {
 const s = session();
 const b = Object.create(Breakable.prototype); b.countable = true; b.broken = true;
 const missed = Object.create(Breakable.prototype); missed.countable = true; missed.broken = false;
 const d = Object.create(ConedDog.prototype); d.freed = true; d.dogId = '1:shiba-a';
 s.stage.entities = [b, missed, d]; s.rescueDog(d); s.deaths = 3;
 s._missedRain = async () => {}; s.startBoss = vi.fn();
 await s.reachBossGate();
 expect(s.stats).toMatchObject({ broken: 1, breakables: 2, dogs: 1, dogsTotal: 1, deathsAtGate: 3, freedIds: ['1:shiba-a'] });
 s.deaths = 7;
 expect(runBones(s.stats, boneContext(s)).goodBoy).toBe(true);
 expect(save.data.boneBoard[1]).toBeUndefined();
 Game.prototype.levelCleared.call({ playCutscene() {} }, s);
 expect(save.data.boneBoard[1]).toMatchObject({ golden: false, goodBoy: true });
 expect(save.data.dogsFreed['1:shiba-a']).toBe(true);
});
it('hidden saves immediately, survives reload and death, permits god but suppresses trial/remix/rush', () => {
 const s = session(); save.data.godMode = true;
 expect(s.collectHiddenBone()).toBe(true);
 s.respawn(); save.load(); expect(save.data.boneBoard[1].hidden).toBe(true);
 for (const flag of ['trial','remix','rush']) { const other = session(); other[flag] = true; expect(other.collectHiddenBone()).toBe(false); }
});
it('losing a Treat Tray restores its raw snapshot without reverting a permanent hidden bone', async () => {
 const s = session(); s.addTickets(2); s.collectHiddenBone();
 s.bonusRound = { seq: 0, tickets: save.data.tickets, levelTickets: s.levelTickets, fieldRaw: s.fieldRaw, coconutRaw: 0, snackRaw: 2, freedIds: new Set(), R: { back: new THREE.Vector3(), facing: 0 } };
 s.addTickets(5); await s._leaveBonusRound(false);
 expect(s.snack.raw).toBe(2); expect(save.data.boneBoard[1].hidden).toBe(true);
});
it('routes a main goal clear through main completion and finishes its trial at the goal', async () => {
 const s = session(); s.def = { ...s.def, bonus: false, goal: true }; s._missedRain = async () => {};
 s.game.goalLevelCleared = vi.fn();
 const promise = s.reachGoal(); await vi.runAllTimersAsync(); await promise;
 expect(s.game.goalLevelCleared).toHaveBeenCalledWith(s);
 const t = session(); t.trial = true; t._finishTrial = vi.fn(); await t.reachGoal(); expect(t._finishTrial).toHaveBeenCalledOnce();
});
it('restores dog entities and raw pickups together after checkpoint rollback', () => {
 const s = session();
 const d = Object.create(ConedDog.prototype); d.freed = true; d.seq = 2; d.restore = vi.fn(() => { d.freed = false; });
 s.stage.entities.push(d); s.seq = 2; s.freedIds.add('1:shiba-a'); s.addTickets(8);
 s.respawn(); expect(d.restore).toHaveBeenCalledOnce(); expect(s.liveStats().dogs).toBe(0); expect(s.freedIds.size).toBe(0); expect(s.snack.raw).toBe(0);
});
it.each(['trial', 'remix', 'rush'])('cannot bank normal bones or dogs on a %s clear', (flag) => {
 const s = session(); s[flag] = true;
 s.stats = { ...s.liveStats(), broken: 2, dogs: 1, deathsAtGate: 0, freedIds: ['1:shiba-a'] };
 Game.prototype.levelCleared.call({ playCutscene() {} }, s);
 expect(save.data.boneBoard[1]).toBeUndefined(); expect(save.data.dogsFreed['1:shiba-a']).toBeUndefined();
});
