// A play session for one level: the path stage, then its boss arena (bonus stages end at a goal instead).
// Owns checkpoints (with Crash-style rollback on death), lives, tickets, masks, invincibility and stats.
import * as THREE from 'three';
import { Stage } from '../world/stage.js';
import { TicketSystem } from '../entities/tickets.js';
import { FX } from '../entities/fx.js';
import { Projectiles } from '../bosses/common.js';
import { MechaBird } from '../bosses/mechaBird.js';
import { BigCatBoss } from '../bosses/bigCat.js';
import { EvilCone } from '../bosses/evilCone.js';
import { BlueSphere, backpackModel } from '../entities/breakables.js';
import { Breakable } from '../entities/entity.js';
import { Enemy } from '../entities/enemies.js';
import { ConedDog } from '../entities/dogs.js';
import { CrumblePlatform, CrackedFloor, CoconutRoller } from '../entities/props.js';
import { FreezePack } from '../entities/secrets.js';
import { Backpack, ZippedBackpack } from '../entities/breakables.js';
import { buildLevel1, buildBoss1Arena } from '../levels/level1.js';
import { buildLevel2, buildBoss2Arena } from '../levels/level2.js';
import { buildLevel3, buildBoss3Arena } from '../levels/level3.js';
import { buildBonusRide } from '../levels/bonusRide.js';
import { buildBonusCave } from '../levels/bonusCave.js';
import { LEVEL_INTRO, BOSS_TALK } from '../story/script.js';
import { audio } from '../audio/audio.js';
import { save, START_LIVES } from '../core/save.js';
import { input } from '../core/input.js';
import { rand } from '../core/util.js';
import { hub } from '../hub/hubBridge.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Time trial targets per level, in seconds: [gold, silver, bronze] dog tags
export const TRIAL_TARGETS = { 1: [55, 70, 92], 2: [52, 66, 90], 3: [45, 58, 78] };
export function trialMedal(level, t) {
  const g = TRIAL_TARGETS[level];
  if (!g) return null;
  return t <= g[0] ? 'gold' : t <= g[1] ? 'silver' : t <= g[2] ? 'bronze' : null;
}
export const fmtTime = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

const LEVELS = {
  1: { build: buildLevel1, arena: buildBoss1Arena, Boss: MechaBird, bossKey: 'bird', theme: 1, bossTheme: 'boss1', name: 'Bark Jungle' },
  2: { build: buildLevel2, arena: buildBoss2Arena, Boss: BigCatBoss, bossKey: 'cat', theme: 2, bossTheme: 'boss2', name: 'Scratchpost Canyon' },
  3: { build: buildLevel3, arena: buildBoss3Arena, Boss: EvilCone, bossKey: 'cone', theme: 3, bossTheme: 'boss3', name: 'The Cone Factory' },
  // bonus stages: no boss, unlocked on the map by beating the boss before them
  ride: { build: buildBonusRide, theme: 'house', name: 'Roomba Rush', bonus: true },
  cave: { build: buildBonusCave, theme: 'cave', name: 'Glowworm Grotto', bonus: true },
};
export const LEVEL_NAMES = Object.fromEntries(Object.entries(LEVELS).map(([k, v]) => [k, v.name]));

export class Session {
  constructor(game, level, { trial = false } = {}) {
    this.game = game;
    this.level = level;
    this.def = LEVELS[level];
    this.trial = trial;      // time trial run: clock, freeze packs, no lives lost, ends at the boss gate
    this.trialT = 0;
    this.freezeT = 0;
    this.deaths = 0;
    this.seq = 0;
    this.mask = 0;
    this.invincibleT = 0;
    this.phase = 'level';
    this.levelTickets = 0;
    this.stats = null;
    this.deathsAtCp = 0;
    this.busy = false;     // transitions / dialogue
    this.over = false;
  }

  nextSeq() { return ++this.seq; }

  // ---------- stage setup ----------
  _newStage(themeKey) {
    const g = this.game;
    if (this.stage) this.stage.dispose();
    const stage = new Stage(g, themeKey);
    this.stage = stage;
    g.stage = stage;
    g.fx = new FX(stage.scene, g.camera.cam);
    this.tickets = new TicketSystem(g, stage);
    g.tickets = this.tickets;
    this.projectiles = new Projectiles(g, stage);
    return stage;
  }

  _attachActors(info) {
    const g = this.game;
    const stage = this.stage;
    g.player.attach(stage.scene);
    g.mask.attach(stage.scene);
    g.player.spawnAt(info.spawn, info.facing);
    g.mask.setLevel(this.mask, this.mask);
    g.mask.snapTo(g.player);
    g.camera.setMode(info.camera.mode, info.camera);
    g.camera.cam.fov = info.fov || 58;
    g.camera.cam.updateProjectionMatrix();
    g.camera.endCinematic();
    g.camera.snap(g.player);
    this.cp = { pos: info.spawn.clone(), facing: info.facing, seq: this.seq, tickets: save.data.tickets, levelTickets: this.levelTickets };
    this.deathsAtCp = 0;
  }

  async startLevel() {
    const g = this.game;
    const attempt = await hub.beginAttempt(this.level);
    this.attemptId = attempt.id;
    this.attemptDurable = attempt.ok;
    this.busy = true;
    this.phase = 'level';
    const stage = this._newStage(this.def.theme);
    const info = this.def.build(g, stage, this.tickets);
    stage.finalize();
    this.tickets.finalize();
    this.info = info;
    this.chase = info.chase || null;
    this._attachActors(info);
    this.breakablesTotal = stage.entities.filter((e) => e instanceof Breakable && e.countable).length;
    this.dogsTotal = stage.entities.filter((e) => e instanceof ConedDog).length;
    audio.setRate(1);
    audio.playMusic(stage.theme.music);
    g.ui.showHud(4);
    this._pushHud();
    await g.ui.fade(0);
    g.player.setRide(info.ride || null);
    if (this.trial) this._setupTrial();
    g.ui.banner(this.def.name.toUpperCase(), this.trial ? 'TIME TRIAL · break ice packs to freeze the clock' : this.def.bonus ? 'BONUS STAGE' : `LEVEL ${this.level}`, 2.2);
    if (LEVEL_INTRO[this.level] && !this.trial) {
      g.player.frozen = true;
      await g.ui.say(LEVEL_INTRO[this.level]);
      g.player.frozen = false;
    }
    if (this.chase) this._startChase(this.chase.s, 1.8, true);
    if (info.ride) { g.ui.banner('GO!', 'Steer ◀ ▶ · SPACE hops', 1.6); audio.play('whirr'); }
    // newly earned boss moves get a pop-up the first time
    const ab = g.player.abilities;
    for (const id of ['glide', 'zoom', 'bark']) if (ab[id]) { g.ui.tutorial(id); break; }
    this.busy = false;
  }

  // Time trial: every 4th plain backpack becomes a Freeze Pack (1-3 s), and the clock starts.
  _setupTrial() {
    const packs = this.stage.entities.filter((e) => e instanceof Backpack && !(e instanceof ZippedBackpack) && !(e instanceof FreezePack));
    packs.forEach((b, i) => {
      if (i % 4 !== 2) return;
      b.hide(); b.countable = false; b.broken = true;
      const f = new FreezePack(this.stage, b.pos.x, b.pos.y, b.pos.z, { secs: 1 + (Math.floor(i / 4) % 3) });
      f.obj.rotation.y = b.obj.rotation.y;
      this.stage.add(f);
    });
    this.trialT = 0;
    this.freezeT = 0;
    this.trialRunning = true;
    this.game.ui.trialTime(fmtTime(0), false);
  }

  // ---------- Treat Tray bonus round ----------
  async enterBonusRound(tray) {
    if (this.busy || this.bonusRound) return;
    const g = this.game, p = g.player, R = tray.round;
    this.busy = true;
    p.frozen = true;
    audio.play('boing');
    await g.ui.fade(1, 0.25);
    this.bonusRound = { tray, R, seq: this.nextSeq(), tickets: save.data.tickets, levelTickets: this.levelTickets };
    p.spawnAt(R.start, R.facing);
    g.camera.snap(p);
    g.mask.snapTo(p);
    await g.ui.fade(0, 0.25);
    g.ui.banner('BONUS ROUND!', 'Fall off and the haul is lost (but not a life)', 2);
    p.frozen = false;
    this.busy = false;
  }

  async _leaveBonusRound(kept) {
    const g = this.game, p = g.player, B = this.bonusRound;
    this.busy = true;
    p.frozen = true;
    if (!kept) {
      // roll back everything grabbed up there
      for (const e of this.stage.entities) if (e instanceof Breakable && e.broken && e.brokenSeq > B.seq) e.restore();
      this.tickets.restoreAfter(B.seq);
      this.tickets.clearFlying();
      save.data.tickets = B.tickets;
      this.levelTickets = B.levelTickets;
      this._pushHud();
    } else B.tray.used = true;
    audio.play(kept ? 'checkpoint' : 'fade');
    await g.ui.fade(1, 0.25);
    this.bonusRound = null;
    p.spawnAt(B.R.back, B.R.facing);
    g.camera.snap(p);
    g.mask.snapTo(p);
    await g.ui.fade(0, 0.25);
    g.ui.banner(kept ? 'BONUS CLEAR!' : 'BONUS LOST', kept ? 'Haul kept!' : 'Try again, or carry on', 1.6);
    p.frozen = false;
    this.busy = false;
  }
  finishBonusRound() { if (this.bonusRound && !this.busy) this._leaveBonusRound(true); }

  // Quit, time trial, warp, and game over keep the tickets in the local save.
  // Queue them once so the next level_end bank can include them.
  holdUnbanked() {
    if (this.hubHeld) return;
    this.hubHeld = true;
    hub.hold(this.attemptId, this.levelTickets, this.attemptDurable).catch((err) => console.warn('[hub] hold failed', err));
  }

  // ---------- secret warp ----------
  secretWarp(target) {
    if (this.trial || this.busy || this.phase !== 'level' || !LEVELS[target]) return false;
    const g = this.game;
    this.busy = true;
    g.player.frozen = true;
    save.data.bonus ||= {};
    save.data.bonus[target] = { ...(save.data.bonus[target] || {}), found: true };
    save.write();
    this.holdUnbanked();
    audio.play('whoosh');
    audio.play('oneUp');
    g.ui.banner('SECRET WARP!', LEVEL_NAMES[target], 2);
    setTimeout(() => g.startLevel(target), 1200);
    return true;
  }

  freezeClock(secs) {
    if (!this.trial) return;
    this.freezeT += secs;
    this.game.ui.banner(`CLOCK FROZEN +${secs}s`, '', 1);
    audio.play('chime');
  }

  _finishTrial() {
    const g = this.game, t = this.trialT;
    this.trialRunning = false;
    const medal = trialMedal(this.level, t);
    const d = save.data;
    d.trials ||= {};
    const prev = d.trials[this.level];
    const best = !prev || t < prev.best;
    if (best) d.trials[this.level] = { best: t, medal: trialMedal(this.level, t) };
    save.write();
    this.holdUnbanked();
    if (best && !d.godMode) hub.submitScore(t, this.level);
    g.ui.trialTime(null);
    g.player.frozen = true;
    audio.play(medal ? 'oneUp' : 'checkpoint');
    g.ui.fade(1).then(() => g.trialDone(this, t, medal, best));
  }

  _startChase(s, delay, first) {
    this.chase.begin(s, delay);
    if (first) setTimeout(() => this.game.ui.banner('RUN!', 'Hold ↓ / S toward the camera', 2.2), delay * 1000 - 300);
  }

  async reachBossGate() {
    if (this.phase !== 'level' || this.busy) return;
    if (this.trial) { this.busy = true; this._finishTrial(); return; }
    this.busy = true;
    this._recordLevelStats();
    if (this.chase) this.chase.state = 'stop';
    this.game.player.frozen = true;
    await this._missedRain();
    this.game.ui.fade(1).then(() => this.startBoss());
  }

  // End of a bonus stage (no boss): the missed-backpack rain, then the results screen.
  async reachGoal() {
    if (this.phase !== 'level' || this.busy) return;
    const g = this.game;
    this.busy = true;
    this._recordLevelStats();
    g.player.frozen = true;
    audio.play('checkpoint');
    g.ui.banner('STAGE CLEAR!', this.def.name, 1.6);
    await wait(900);
    await this._missedRain();
    await g.ui.fade(1);
    g.player.setRide(null);
    g.bonusCleared(this);
  }

  // Every breakable Nobu skipped drops on his head, one by one, before the level ends.
  async _missedRain() {
    const g = this.game, p = g.player;
    if (!this.breakablesTotal) return;
    const missed = this.stage.entities.filter((e) => e instanceof Breakable && e.countable && !e.broken).length;
    await wait(350);
    if (!missed) {
      g.ui.banner('PERFECT!', 'Not a single backpack missed', 1.8);
      audio.play('oneUp');
      await wait(1500);
      return;
    }
    const tc = g.camera.basis?.toCamera;
    if (tc !== undefined) p.facing = p.targetFacing = tc;
    g.ui.banner('MISSED!', `0 / ${missed}`, 30);
    this.rain = { list: [], total: missed, spawned: 0, hit: 0, t: 0.2, gap: Math.max(0.07, Math.min(0.3, 3 / missed)) };
    await new Promise((resolve) => { this.rain.done = resolve; });
    this.rain = null;
    g.ui.banner('MISSED!', `${missed} backpack${missed > 1 ? 's' : ''} left behind`, 1.4);
    await wait(900);
  }

  _updateRain(dt) {
    const R = this.rain, g = this.game, p = g.player;
    R.t -= dt;
    if (R.spawned < R.total && R.t <= 0) {
      R.t = R.gap;
      const m = backpackModel();
      m.scale.setScalar(0.75);
      m.position.set(p.pos.x + rand(-0.12, 0.12), p.pos.y + 9, p.pos.z + rand(-0.12, 0.12));
      m.rotation.set(rand(-0.6, 0.6), rand(0, 6), rand(-0.6, 0.6));
      this.stage.scene.add(m);
      R.list.push({ m, v: 4 });
      R.spawned++;
    }
    for (const d of R.list) {
      d.v += 34 * dt;
      d.m.position.y -= d.v * dt;
      d.m.rotation.y += dt * 6;
      const head = p.pos.y + (p.ride ? 1.85 : 1.45);
      if (d.m.position.y <= head) {
        d.done = true;
        this.stage.scene.remove(d.m);
        R.hit++;
        g.fx.burst(p.pos.x, head + 0.2, p.pos.z, { count: 8, colors: [0x2b2b33, 0x3d3d48, 0xff8a12], speed: 4, size: 0.16, floor: p.pos.y });
        audio.play('bonk');
        p.landT = 0; p.landImpact = 0.9;
        g.ui.banner('MISSED!', `${R.hit} / ${R.total}`, 30);
      }
    }
    R.list = R.list.filter((d) => !d.done);
    p.landT = Math.min(1, p.landT + dt);
    if (R.hit >= R.total) R.done();
  }

  _recordLevelStats() {
    const ents = this.stage.entities;
    this.stats = {
      tickets: this.levelTickets,
      broken: ents.filter((e) => e instanceof Breakable && e.countable && e.broken).length,
      breakables: this.breakablesTotal,
      dogs: ents.filter((e) => e instanceof ConedDog && e.freed).length,
      dogsTotal: this.dogsTotal,
    };
  }

  async startBoss() {
    const g = this.game;
    this.phase = 'boss';
    this.tickets.clearFlying?.();
    const stage = this._newStage(this.def.bossTheme);
    const info = this.def.arena(g, stage, this.tickets);
    stage.finalize();
    this.tickets.finalize();
    // arena pick-ups don't count toward the level reward
    for (const e of stage.entities) if (e instanceof Breakable) e.countable = false;
    this.info = info;
    this.chase = null;
    g.player.setRide(null);
    const boss = new this.def.Boss(stage, 0, 0, -6);
    stage.add(boss);
    this.boss = boss;
    this.bossPhaseCp = 1;
    this._attachActors(info);
    g.player.frozen = true;
    audio.playMusic('cutscene');
    // intro shot on the boss
    const bp = boss.pos.clone();
    g.camera.cinematic(new THREE.Vector3(bp.x + 3, Math.max(3, bp.y + 1.5), bp.z + 9), new THREE.Vector3(bp.x, bp.y + 1, bp.z), 2.5);
    g.camera.pos.set(bp.x + 6, bp.y + 4, bp.z + 16);
    await g.ui.fade(0);
    audio.play('bossRoar');
    g.camera.shake(0.4, 0.5);
    await g.ui.say(BOSS_TALK[this.def.bossKey].intro);
    g.camera.endCinematic();
    g.player.frozen = false;
    g.ui.bossShow(boss.name, boss.portrait);
    g.ui.bossCharge(0, false);
    audio.playMusic(stage.theme.music);
    g.ui.banner('FIGHT!', boss.name, 1.4);
    boss.start();
    g.camera.opts.focus = boss.pos;
    g.camera.opts.focusWeight = 0.2;
    this.busy = false;
  }

  async onBossPhase(boss, phase) {
    const g = this.game;
    this.busy = true;
    boss.active = false;
    this.projectiles.clear();
    this.bossPhaseCp = phase;
    await wait(600);
    if (g.player.dead || this.over) { this.busy = false; return; }
    g.player.frozen = true;
    // the boss evolves: camera swings round to watch the transformation
    const bp = boss.pos.clone();
    const away = g.player.pos.clone().sub(bp).setY(0);
    if (away.lengthSq() < 0.01) away.set(0, 0, 1);
    away.normalize();
    const gy = boss.ground ?? bp.y;
    g.camera.cinematic(new THREE.Vector3(bp.x + away.x * 10 + away.z * 3, gy + 4.2, bp.z + away.z * 10 - away.x * 3), new THREE.Vector3(bp.x, Math.max(gy + 1.6, bp.y + 0.6), bp.z), 1.4);
    await boss.evolve(phase);
    g.ui.banner(`STAGE ${phase}: ${boss.stageNames[phase]}`, boss.stagePowers[phase], 2.6);
    await wait(1300);
    const lines = BOSS_TALK[this.def.bossKey]['phase' + phase];
    if (lines) await g.ui.say(lines);
    g.camera.endCinematic();
    g.player.frozen = false;
    g.ui.bossHp(boss.hp / boss.maxHp, phase);
    // a little help: a fresh Blue Sphere each phase
    const sp = this.info.spheres?.[phase - 1];
    if (sp) { const s = new BlueSphere(this.stage, sp.x, sp.y, sp.z); s.countable = false; this.stage.add(s); }
    boss.stateT = 0; // the phase-change reaction (rage/roar) starts now, after the dialogue
    boss.active = true;
    boss.beginPhase?.();
    this.busy = false;
  }

  onBossDefeated(boss) {
    const g = this.game;
    if (this.def.bossKey === 'cone') hub.reportCone(this.attemptId, this.attemptDurable).catch((err) => console.warn('[hub] relic failed', err));
    this.busy = true;
    this.projectiles.clear();
    g.player.frozen = true;
    g.ui.bossHp(0, 0);
    audio.stopMusic();
    audio.play('bossRoar');
    if (this.def.bossKey === 'cone') g.ui.say(BOSS_TALK.cone.death);
    setTimeout(() => {
      g.ui.bossHide();
      g.player.victory();
      g.camera.cinematic(g.player.pos.clone().add(new THREE.Vector3(0, 2.2, 5.5)), g.player.pos.clone().add(new THREE.Vector3(0, 1, 0)), 2);
      audio.playMusic('complete');
    }, 2600);
    setTimeout(() => {
      g.ui.fade(1).then(() => g.levelCleared(this));
    }, 6200);
  }

  // ---------- events from entities ----------
  onBreak() { this._pushHud(); }
  onEnemyDefeated() {}

  addTickets(n) {
    const before = save.data.tickets;
    save.data.tickets += n;
    this.levelTickets += n;
    const gained = Math.floor(save.data.tickets / 100) - Math.floor(before / 100);
    for (let i = 0; i < gained; i++) this.addLife(1);
    this.game.ui.setHud('tickets', save.data.tickets);
  }

  addLife(n) {
    save.data.lives = Math.min(99, save.data.lives + n);
    this.game.ui.setHud('lives', save.data.lives);
    audio.play('oneUp');
    this.game.ui.banner('1UP!', '', 1);
  }

  setMask(n) {
    const prev = this.mask;
    n = Math.max(0, Math.min(3, n));
    if (n >= 3) {
      if (this.invincibleT <= 0) { audio.play('invincible'); this.game.ui.banner('INVINCIBLE!', 'Sproto power x3', 1.6); }
      this.invincibleT = 20;
      audio.setRate(1.35);
    }
    this.mask = n;
    this.game.mask.setLevel(n, prev);
    this.game.ui.setHud('mask', n);
  }

  rescueDog() {
    const freed = this.stage.entities.filter((e) => e instanceof ConedDog && e.freed).length;
    this.game.ui.setHud('dogs', `${freed}/${this.dogsTotal}`);
    if (freed === this.dogsTotal && this.dogsTotal > 0) this.game.ui.banner('ALL DOGS FREE!', '', 1.6);
  }

  checkpoint(pos, snacks) {
    this.cp = { pos: pos.clone(), facing: this.game.player.facing, seq: this.seq, tickets: save.data.tickets, levelTickets: this.levelTickets };
    this.deathsAtCp = 0;
    this.game.ui.banner('CHECKPOINT!', 'yum', 1.4);
  }

  _pushHud() {
    const ui = this.game.ui;
    ui.setHud('tickets', save.data.tickets, { show: false });
    ui.setHud('lives', save.data.lives, { show: false });
    ui.setHud('mask', this.mask, { show: false });
    const freed = this.stage ? this.stage.entities.filter((e) => e instanceof ConedDog && e.freed).length : 0;
    ui.setHud('dogs', `${freed}/${this.dogsTotal ?? 0}`, { show: false });
  }

  // ---------- death + respawn ----------
  onPlayerDeath(type) {
    if (this.dying) return;
    this.dying = true;
    this.deaths++;
    const g = this.game;
    this.invincibleT = 0;
    audio.setRate(1);
    const prevMask = this.mask;
    this.mask = 0;
    g.mask.setLevel(0, prevMask);
    const wait = type === 'fall' ? 1.0 : 1.5;
    setTimeout(async () => {
      g.ui.deathCard(type);
      await new Promise((r) => setTimeout(r, 1700));
      await g.ui.fade(1, 0.35);
      g.ui.clearScreen();
      if (!this.trial) save.data.lives -= 1; // time trials never cost lives
      if (save.data.lives < 0) {
        this.over = true;
        this.dying = false;
        g.gameOver(this);
        return;
      }
      this.respawn();
      this.dying = false;
      g.ui.showHud(2.5);
      await g.ui.fade(0, 0.35);
    }, wait * 1000);
  }

  respawn() {
    const g = this.game;
    const cp = this.cp;
    this.deathsAtCp++;
    // roll back everything broken/collected after the checkpoint
    for (const e of this.stage.entities) {
      if (e instanceof Breakable && e.broken && e.brokenSeq > cp.seq) e.restore();
      else if (e instanceof ConedDog && e.freed && e.seq > cp.seq) e.restore();
      if (e instanceof Enemy) e.reset();
      if (e instanceof CrumblePlatform || e instanceof CrackedFloor || e instanceof CoconutRoller) e.reset();
      e.onRespawn?.();
    }
    this.tickets.restoreAfter(cp.seq);
    this.tickets.clearFlying();
    save.data.tickets = cp.tickets;
    this.levelTickets = cp.levelTickets;
    this.projectiles.clear();
    g.fx.clear();
    g.player.spawnAt(cp.pos, cp.facing);
    if (g.player.ride) g.player.ride.speedK = 0;
    g.camera.snap(g.player);
    // pity mask after a few deaths at the same checkpoint (classic!)
    this.setMask(this.deathsAtCp >= 3 ? 1 : 0);
    g.mask.snapTo(g.player);
    this._pushHud();
    if (this.chase && this.stage.track) {
      const pr = this.stage.track.project(cp.pos.x, cp.pos.z);
      this.chase.begin(pr.s - 13, 1.6);
    }
    if (this.phase === 'boss' && this.boss) {
      this.boss.killMinions?.();
      const phase = this.def.bossKey === 'cone' ? this.bossPhaseCp : 1;
      this.boss.resetToPhase(phase);
      g.ui.bossHp(this.boss.hp / this.boss.maxHp, phase);
      this.boss.active = true;
    }
  }

  // ---------- per-frame ----------
  update(dt) {
    const g = this.game;
    if (!this.stage) return;
    if (this.invincibleT > 0) {
      this.invincibleT -= dt;
      if (this.invincibleT <= 0) {
        this.invincibleT = 0;
        audio.setRate(1);
        this.setMask(2);
      }
    }
    this.stage.update(dt, g.player);
    g.player.update(dt, this.stage, g.camera.basis);
    if (this.rain) this._updateRain(dt);
    if (this.bonusRound && !this.busy && !g.player.dead && g.player.pos.y < this.bonusRound.R.floorY - 4) this._leaveBonusRound(false);
    if (this.trialRunning && !this.busy && !g.player.frozen && !g.player.dead && !g.ui.talking) {
      if (this.freezeT > 0) this.freezeT = Math.max(0, this.freezeT - dt);
      else this.trialT += dt;
      g.ui.trialTime(fmtTime(this.trialT), this.freezeT > 0);
    }
    const tr = this.stage.track;
    if (tr && !g.player.dead) {
      const ps = g.player.body.s ?? 0;
      for (const t of tr.triggers) if (!t.fired && ps >= t.d && ps < t.d + 25) { t.fired = true; t.fn(g.player); }
    }
    this.tickets.update(dt);
    this.projectiles.update(dt);
    g.mask.update(dt, g.player, g.camera.cam);
    g.camera.update(dt, g.player);
    this.stage.followSky(g.camera.cam);
    g.fx.update(dt);
  }

  // Belly flop shockwave: breaks / squashes everything nearby.
  onFlop(pos) {
    const g = this.game;
    g.camera.shake(0.45, 0.3);
    g.fx.ring(pos.x, pos.y, pos.z, { color: 0xffffff, radius: 2.4 });
    g.fx.puff(pos.x, pos.y + 0.1, pos.z, { count: 8, size: 0.5, color: 0xf0e8d8, speed: 4 });
    for (const e of this.stage.entities) {
      if (e.dead || !e.onFlop || !e.interactive) continue;
      const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z, dy = e.pos.y - pos.y;
      if (dx * dx + dz * dz < 2.5 * 2.5 && Math.abs(dy) < 1.6) e.onFlop(g.player);
    }
  }

  dispose() {
    if (this.stage) this.stage.dispose();
  }
}
