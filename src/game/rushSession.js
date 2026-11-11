import { Session } from './session.js';
import { createRush, tickRush, hurtRush, defeatRushBoss, rushResult } from './rush.js';
import { RUSH_ARENAS, RushTickets, rushAvailable } from './rushArenas.js';
import { Stage } from '../world/stage.js';
import { FX } from '../entities/fx.js';
import { Projectiles } from '../bosses/common.js';
import { BlueSphere } from '../entities/breakables.js';
import { Breakable } from '../entities/entity.js';
import { BOSS_TALK } from '../story/script.js';
import { audio } from '../audio/audio.js';
import { save } from '../core/save.js';

export class RushSession extends Session {
  constructor(game) {
    super(game, 1);
    this.level = 'rush';
    this.rush = true;
    this.run = createRush({ god: save.data.godMode });
    this._epoch = 0;
    this._waiters = new Map();
    this.disposed = false;
    this.transitioning = false;
  }

  _alive(epoch = this._epoch) {
    return !this.disposed && !this.over && epoch === this._epoch && this.game.session === this;
  }

  _cancelWaiters() {
    for (const [timer, done] of this._waiters) { clearTimeout(timer); done(false); }
    this._waiters.clear();
  }

  _nextEpoch() {
    const epoch = ++this._epoch;
    this._cancelWaiters();
    this.game.ui.cancelSay?.(this._dialog);
    this._dialog = null;
    // Retire animation promises too: disposed arenas no longer receive the
    // updates which would ordinarily resolve their intro/evolve animations.
    this.boss?.introResolve?.();
    if (this.boss) this.boss.introResolve = null;
    this.boss?.evolving?.resolve?.();
    if (this.boss) this.boss.evolving = null;
    return epoch;
  }

  _delay(ms, epoch) {
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        this._waiters.delete(timer);
        resolve(this._alive(epoch));
      }, ms);
      this._waiters.set(timer, resolve);
    });
  }

  async _say(lines) {
    const pending = this.game.ui.say(lines);
    const dialog = this._dialog = this.game.ui.dialog;
    await pending;
    if (this._dialog === dialog) this._dialog = null;
  }

  _newStage(theme) {
    this.stage?.dispose();
    const g = this.game, stage = new Stage(g, theme);
    this.stage = g.stage = stage;
    g.fx = new FX(stage.scene, g.camera.cam);
    this.tickets = g.tickets = new RushTickets();
    this.projectiles = new Projectiles(g, stage);
    return stage;
  }

  async startLevel() {
    if (!rushAvailable(save.data)) return false;
    return this._enterBoss(0);
  }

  async _enterBoss(index, { carryGuard = null } = {}) {
    const epoch = this._nextEpoch(), g = this.game;
    if (!this._alive(epoch)) return;
    this.busy = true;
    this.transitioning = true;
    this.phase = 'boss';
    this.def = RUSH_ARENAS[index];
    g.player.frozen = true;
    g.ui.showLoading(this.def.name, this.def.name);
    g.ui.loadingProgress(.1);
    if (!await this._delay(0, epoch)) return;
    const stage = this._newStage(this.def.bossTheme);
    this.info = this.def.arena(g, stage, this.tickets);
    stage.finalize();
    for (const e of stage.entities) if (e instanceof Breakable) e.countable = false;
    this.boss = stage.add(new this.def.Boss(stage, 0, 0, -6));
    this.boss.phaseCheckpoints = false;
    this.boss.dda = { tele: 1, window: 0 };
    this.bossPhaseCp = 1;
    g.player.setRide(null);
    this._attachActors(this.info);
    if (carryGuard !== null) {
      g.player.guardCharges = carryGuard;
      g.player._paintGear?.();
    }
    g.player.frozen = true;
    g.ui.loadingProgress(.8);
    await this._warmUp();
    if (!this._alive(epoch)) return;
    audio.setRate(this.invincibleT > 0 ? 1.35 : 1);
    audio.playMusic('cutscene');
    g.ui.fade(0, 0);
    await g.ui.hideLoading();
    if (!this._alive(epoch)) return;
    await this.boss.intro?.();
    if (!this._alive(epoch)) return;
    await this._say(BOSS_TALK[this.def.bossKey].intro);
    if (!this._alive(epoch)) return;
    g.camera.endCinematic();
    g.player.frozen = false;
    g.ui.bossShow(this.boss.name, this.boss.portrait, this.boss.stages);
    g.ui.bossCharge(0, false);
    audio.playMusic(stage.theme.music);
    this.boss.start();
    g.camera.opts.focus = this.boss.pos;
    g.camera.opts.focusWeight = g.camera.opts.bossFocus ?? .2;
    this.dying = false;
    this.busy = false;
    this.transitioning = false;
    this._pushHud();
  }

  async onBossPhase(boss, phase) {
    const epoch = this._epoch, g = this.game;
    if (!this._alive(epoch) || boss !== this.boss || this.dying) return;
    this.busy = true;
    boss.active = false;
    this.projectiles.clear();
    boss.dda = { tele: 1, window: 0 };
    if (!await this._delay(600, epoch) || g.player.dead) return;
    g.player.frozen = true;
    await boss.evolve(phase);
    if (!this._alive(epoch) || g.player.dead) return;
    const lines = BOSS_TALK[this.def.bossKey][`phase${phase}`];
    if (lines) await this._say(lines);
    if (!this._alive(epoch) || g.player.dead) return;
    g.camera.endCinematic();
    const sphere = this.info.spheres?.[phase - 1];
    if (sphere) { const e = new BlueSphere(this.stage, sphere.x, sphere.y, sphere.z); e.countable = false; this.stage.add(e); }
    g.ui.bossHp(boss.hp / boss.maxHp, phase);
    boss.stateT = 0;
    boss.active = true;
    boss.beginPhase?.();
    g.player.frozen = false;
    this.busy = false;
  }

  onPlayerHurt() {
    hurtRush(this.run);
    this.boss?.onPlayerHurt();
  }

  onPlayerDeath(type) {
    if (!this._alive() || this.dying || this.transitioning) return;
    const epoch = this._nextEpoch(), g = this.game;
    this.dying = true;
    g.feedback?.('death'); // rumble only; hitstop is off in Rush
    this.busy = false; // As in normal fights, the death penalty stays on the fight clock.
    this.onPlayerHurt();
    this.deaths++;
    this.invincibleT = 0;
    const previousMask = this.mask;
    this.mask = 0;
    g.mask.setLevel(0, previousMask);
    audio.setRate(1);
    this.transition = (async () => {
      if (!await this._delay(type === 'fall' ? 1000 : 1500, epoch)) return;
      g.ui.deathCard(type);
      if (!await this._delay(1700, epoch)) return;
      await g.ui.fade(1, .35);
      if (!this._alive(epoch)) return;
      g.ui.clearScreen();
      await this._enterBoss(this.run.index);
    })();
  }

  onBossDefeated(boss) {
    if (!this._alive() || this.transitioning || this.dying || boss !== this.boss || !boss.defeated) return;
    this.run.godUsed ||= !!(save.data.godMode || this.game.player.god);
    this.run.noHit &&= !boss.tookHitThisFight;
    if (!defeatRushBoss(this.run, this.def.bossKey)) return;
    const epoch = this._nextEpoch(), g = this.game, guard = g.player.guardCharges;
    this.busy = true;
    this.transitioning = true;
    boss.active = false;
    this.projectiles.clear();
    boss.killMinions?.();
    g.player.frozen = true;
    g.ui.bossHp(0, 0);
    audio.stopMusic();
    this.transition = (async () => {
      if (!await this._delay(2600, epoch)) return;
      g.ui.bossHide();
      g.player.victory();
      await g.ui.fade(1);
      if (!this._alive(epoch)) return;
      if (!this.run.complete) return this._enterBoss(this.run.index, { carryGuard: guard });
      this.run.godUsed ||= !!(save.data.godMode || g.player.god);
      const record = rushResult(this.run, save.data.rush);
      if (record) { save.data.rush = record; save.write({ progressOnly: true }); }
      this.over = true;
      audio.setRate(1);
      g.rushCompleted(this, { record: save.data.rush, eligible: !!record, ms: Math.round(this.run.elapsed * 1000), noHit: this.run.noHit });
    })();
  }

  markGodUsed() {
    super.markGodUsed();
    this.run.godUsed = true;
  }

  update(dt) {
    if (this.disposed || this.over || this.game.session !== this) return;
    tickRush(this.run, dt, { active: !!this.boss?.active && !this.boss.defeated,
      busy: this.busy || !!this.game.ui.talking, paused: this.game.state === 'pause', god: save.data.godMode || this.game.player.god });
    this.godUsed = this.run.godUsed;
    if (this.game.state === 'pause') return;
    super.update(dt);
    this.game.ui.trialTime?.(`${Math.floor(this.run.elapsed / 60)}:${(this.run.elapsed % 60).toFixed(2).padStart(5, '0')} · ${Math.min(5, this.run.index + 1)}/5`);
  }

  // No ordinary reward, checkpoint, level-completion or rollback route is valid in Rush.
  addTickets() {}
  addLife() {}
  checkpoint() {}
  rescueDog() {}
  collectHiddenBone() { return false; }
  secretWarp() { return false; }
  reachGoal() {}
  reachBossGate() {}
  _awardBossMedals() {}
  _applyBossDda() { if (this.boss) this.boss.dda = { tele: 1, window: 0 }; }
  _pushHud() { this.game.ui.setHud('mask', this.mask, { show: false }); }
  respawn() {
    this.mask = 0;
    this.invincibleT = 0;
    return this._enterBoss(this.run.index);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this._nextEpoch();
    this.boss && (this.boss.active = false);
    this.projectiles?.clear();
    audio.setRate(1);
    super.dispose();
  }
}
