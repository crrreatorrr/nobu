// A play session for one level: the path stage, then its boss arena (bonus stages end at a goal instead).
// Owns checkpoints (with Crash-style rollback on death), lives, tickets, masks, invincibility and stats.
import * as THREE from 'three';
import { masteryTrialMedal, trialMastery, mergeTrialMastery, perfectRun } from './mastery.js';
import { addBuddy } from '../entities/buddy.js';
import { Stage } from '../world/stage.js';
import { TicketSystem } from '../entities/tickets.js';
import { FX } from '../entities/fx.js';
import { Projectiles } from '../bosses/common.js';
import { bossDda, bossMedals, newBossRun } from '../bosses/medals.js';
import { BlueSphere, backpackModel } from '../entities/breakables.js';
import { Breakable } from '../entities/entity.js';
import { Enemy } from '../entities/enemies.js';
import { ConedDog } from '../entities/dogs.js';
import { CrumblePlatform, CrackedFloor, CoconutRoller } from '../entities/props.js';
import { FreezePack } from '../entities/secrets.js';
import { Backpack, ZippedBackpack } from '../entities/breakables.js';
import { LEVELS, levelDef, LEVEL_NAMES } from '../levels/registry.js';
import { MASTERY_TEXT, LEVEL_INTRO, BOSS_TALK, BOSS_MEDAL_TEXT, SECTION_TEXT } from '../story/script.js';
import { createChain, refreshChain, chainPitch } from './rewards.js';
import { hitSessionChain, finishSessionChain, updateSessionChain, removeChainDrops } from './chain.js';
import { missesBySection, boundedMiss } from './hints.js';
import { SNACK_EXCLUDED, applyRunResults, boneContext, snackTier } from './bones.js';
import { audio } from '../audio/audio.js';
import { save, START_LIVES } from '../core/save.js';
import { input } from '../core/input.js';
import { rand } from '../core/util.js';
import { hub } from '../hub/hubBridge.js';
import { COCONUT_CAP_PER_CLEAR, rawTicketsForWhole, wholeTicketsFromRaw } from '../config/tickets.js';
import { TRIAL_TARGETS, trialMedal, fmtTime, trialLayout, trialVariant } from '../config/trials.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Let the loading bar paint before the next synchronous build step. rAF stops in a
// hidden tab, so a short timeout also ends the wait.
const nextFrame = () => new Promise((r) => {
  const done = () => { clearTimeout(t); r(); };
  const t = setTimeout(done, 50);
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(done);
});

export { TRIAL_TARGETS, trialMedal, fmtTime };

export { LEVEL_NAMES };

export class Session {
  constructor(game, level, { trial = false } = {}) {
    this.game = game;
    this.level = level;
    this.def = levelDef(level);
    this.trial = trial;      // time trial run: clock, freeze packs, no lives lost, ends at the boss gate
    this.trialT = 0;
    this.freezeT = 0;
    this.freezeMs = 0;       // clock time held by Freeze Packs this trial (informational, sent as score meta)
    this.deaths = 0;
    this.seq = 0;
    this.runSeed = (Math.random() * 2 ** 32) >>> 0;
    this.chain = createChain();
    this.mask = 0;
    this.invincibleT = 0;
    this.phase = 'level';
    this.levelTickets = 0;   // whole Tickets this attempt, after NOBU_TICKET_SCALE
    this.fieldRaw = 0;        // unscaled pickups other than coconuts; remainder is fieldRaw % scale
    this.coconutRaw = 0;      // unscaled coconut pickups accepted under the per-clear cap
    this.coconutSpawned = 0;  // coconuts launched this attempt; not rolled back on death
    this.coconutSeq = 0;
    this.collectedCoconuts = new Set();
    this.lifeLine = Math.floor(Math.max(0, Number(save.data.tickets) || 0) / 100);
    this._lifeLineHold = false;
    this.stats = null;
    this.snack = { raw: 0, potential: 0 };
    this.freedIds = new Set();
    this.hiddenFound = false;
    this.deathsAtGate = null;
    this.godUsed = !!save.data.godMode;
    this.deathsAtCp = 0;
    this.busy = false;     // transitions / dialogue
    this.over = false;
    this.bossRun = null;
    this.bossClock = 0;
    this.bossDeaths = {};
    this.bossStageDeaths = 0;
    this.bossDdaUsed = false;
  }

  nextSeq() { return ++this.seq; }
  get chainSoundPitch() { return this.phase === 'level' ? chainPitch(this.chain.n) : 1; }
  chainRefresh() { if (this.phase === 'level') refreshChain(this.chain); }

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

  // Compile the new stage's shaders while the loading screen is up, so the first frames
  // of play don't stutter. Capped, so a slow GPU driver can't hold the load.
  async _warmUp() {
    const g = this.game;
    const r = g.renderer;
    if (!r || !this.stage?.scene) return;
    try {
      const compile = typeof r.compileAsync === 'function'
        ? r.compileAsync(this.stage.scene, g.camera.cam)
        : Promise.resolve(r.compile(this.stage.scene, g.camera.cam));
      await Promise.race([compile, wait(3000)]);
    } catch (err) {
      console.warn('[load] shader warm-up skipped', err);
    }
  }

  _attachActors(info) {
    const g = this.game;
    const stage = this.stage;
    g.player.attach(stage.scene);
    g.mask.attach(stage.scene);
    g.player.spawnAt(info.spawn, info.facing);
    g.applyKennelTint?.(g.player.model, this);
    g.mask.setLevel(this.mask, this.mask);
    g.mask.snapTo(g.player);
    stage.defaultCamera = info.camera;
    g.camera.setMode(info.camera.mode, info.camera);
    g.camera.cam.fov = info.fov || 58;
    g.camera.cam.updateProjectionMatrix();
    g.camera.endCinematic();
    g.camera.snap(g.player);
    this.cp = { pos: info.spawn.clone(), facing: info.facing, seq: this.seq, tickets: save.data.tickets, levelTickets: this.levelTickets, fieldRaw: this.fieldRaw, coconutRaw: this.coconutRaw, lifeLine: this.lifeLine || 0, snackRaw: this.snack.raw, freedIds: new Set(this.freedIds) };
    this.deathsAtCp = 0;
  }

  async startLevel() {
    const g = this.game;
    const ui = g.ui;
    this.busy = true;
    this.phase = 'level';
    ui.showLoading(this.trial ? 'TIME TRIAL' : this.def.bonus ? 'BONUS STAGE' : `LEVEL ${this.level}`, this.def.name.toUpperCase());
    ui.loadingProgress(0.05, 'Saving progress...');
    const attempt = await hub.beginAttempt(this.level);
    this.attemptId = attempt.id;
    this.attemptDurable = attempt.ok;
    // Never wait on the hub here: a slow or unreachable hub used to leave this
    // transition on a black screen. bank() at the level end waits for this job.
    hub.startCarry();
    ui.loadingProgress(0.15, `Building ${this.def.name}...`);
    await nextFrame();
    const stage = this._newStage(this.def.theme);
    const info = this.def.build(g, stage, this.tickets);
    stage.finalize();
    this.tickets.finalize();
    this.snack.potential = this.tickets.list.length + stage.entities.filter((e) => e instanceof Backpack && e.countable && e.kind !== 'mystery').reduce((n, e) => n + e.tickets, 0);
    const dogIds = Object.keys(this.def.dogs || {});
    stage.entities.filter((e) => e instanceof ConedDog).forEach((e, i) => { if (!e.dogId && dogIds[i]) e.dogId = `${this.level}:${dogIds[i]}`; });
    ui.loadingProgress(0.65, 'Placing Nobu...');
    await nextFrame();
    this.info = info;
    this.chase = info.chase || null;
    this._attachActors(info);
    this.breakablesTotal = stage.entities.filter((e) => e instanceof Breakable && e.countable).length;
    this.dogsTotal = stage.entities.filter((e) => e instanceof ConedDog).length;
    ui.loadingProgress(0.8, 'Warming up...');
    await this._warmUp();
    audio.setRate(1);
    audio.playMusic(stage.theme.music);
    ui.fade(0, 0);
    await ui.hideLoading();
    ui.showHud(4);
    this._pushHud();
    g.player.setRide(info.ride || null);
    this.buddy = addBuddy(this, save.data, LEVELS);
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
    this.freezeMs = 0;
    this._trialCs = 0;
    this._trialFrozen = false;
    this.trialRunning = true;
    this.game.ui.trialTime(fmtTime(0), false);
  }

  // ---------- Treat Tray bonus round ----------
  async enterBonusRound(tray) {
    if (this.busy || this.bonusRound) return;
    finishSessionChain(this);
    const g = this.game, p = g.player, R = tray.round;
    this.busy = true;
    p.frozen = true;
    audio.play('boing');
    await g.ui.fade(1, 0.25);
    this.bonusRound = { tray, R, seq: this.nextSeq(), tickets: save.data.tickets, levelTickets: this.levelTickets, fieldRaw: this.fieldRaw, coconutRaw: this.coconutRaw, lifeLine: this.lifeLine || 0, snackRaw: this.snack.raw, freedIds: new Set(this.freedIds) };
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
    finishSessionChain(this);
    this.busy = true;
    p.frozen = true;
    if (!kept) {
      removeChainDrops(this, B.seq);
      // roll back everything grabbed up there
      for (const e of this.stage.entities) if (e instanceof Breakable && e.broken && e.brokenSeq > B.seq) e.restore();
      this.tickets.restoreAfter(B.seq);
      const lineBefore = this.lifeLine || 0;
      this.tickets.clearFlying();
      this._undoLifeLinesAbove(lineBefore);
      save.data.tickets = B.tickets;
      this.levelTickets = B.levelTickets;
      this.fieldRaw = B.fieldRaw;
      this.snack.raw = B.snackRaw;
      this.freedIds = new Set(B.freedIds);
      this.coconutRaw = B.coconutRaw;
      this._lifeLineHold = true;
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

  // ---------- secret warp ----------
  secretWarp(target) {
    if (this.trial || this.busy || this.phase !== 'level' || !levelDef(target)) return false;
    const g = this.game;
    this.busy = true;
    g.player.frozen = true;
    save.data.bonus ||= {};
    save.data.bonus[target] = { ...(save.data.bonus[target] || {}), found: true };
    save.data.open[target] = true;
    save.write();
    audio.play('whoosh');
    audio.play('oneUp');
    g.ui.banner('SECRET WARP!', LEVEL_NAMES[target], 2);
    setTimeout(() => g.startLevel(target), 1200);
    return true;
  }

  freezeClock(secs) {
    if (!this.trial) return;
    this.freezeT += secs;
    this.freezeMs += secs * 1000;
    this.game.ui.banner(`CLOCK FROZEN +${secs}s`, '', 1);
    audio.play('chime');
  }

  _finishTrial() {
    const g = this.game, t = this.trialT;
    this.trialRunning = false;
    const layout = trialLayout(this.level), variant = trialVariant(this.level, layout);
    const ms = Math.round(t * 1000), d = save.data;
    const godUsed = this.godUsed || !!d.godMode;
    this.godUsed = godUsed;
    const medal = masteryTrialMedal(variant, t, { godUsed });
    d.trials ||= {};
    const candidate = d.trials[this.level];
    const prev = (candidate?.layout ?? 1) === layout ? candidate : null;
    const prevMs = Number.isInteger(prev?.ms) ? prev.ms : Number.isFinite(prev?.best) ? Math.round(prev.best * 1000) : null;
    const deaths = this.deaths | 0, freezeMs = Math.round(this.freezeMs || 0);
    // God-used belongs to this whole run, even after the toggle is turned off.
    const pid = godUsed ? null : hub.playerId();
    const incoming = trialMastery(variant, { best: t, ms, medal, at: Date.now(), deaths, freezeMs, pid, layout, godUsed });
    const best = !!incoming && (prevMs == null || ms < prevMs);
    const merged = mergeTrialMastery(variant, prev, incoming);
    if (merged) d.trials[this.level] = merged;
    save.write();
    hub.bank(this.attemptId, this.levelTickets, this.attemptDurable).catch((err) => console.warn('[hub] bank failed', err));
    if (incoming && !godUsed && pid) {
      // A local god/practice best never replaces the integer time this clean run posts.
      const rec = d.trials[this.level];
      const own = !best && rec && !rec.godUsed && (rec.layout ?? 1) === layout && rec.pid === pid && Number.isInteger(rec.ms) && rec.ms <= ms;
      if (own) hub.submitScore(rec.ms, this.level, { deaths: rec.deaths | 0, freezeMs: rec.freezeMs | 0 }).catch(() => {});
      else hub.submitScore(ms, this.level, { deaths, freezeMs }).catch(() => {});
    }
    g.ui.trialTime(null);
    g.player.frozen = true;
    audio.play(medal ? 'oneUp' : 'checkpoint');
    g.ui.fade(1).then(() => g.trialDone(this, t, medal, best));
  }

  _startChase(s, delay, first, { banner = true } = {}) {
    this.chase.begin(s, delay);
    if (first && banner) setTimeout(() => this.game.ui.banner('RUN!', 'Hold ↓ / S toward the camera', 2.2), delay * 1000 - 300);
  }

  async reachBossGate() {
    if (this.phase !== 'level' || this.busy) return;
    if (import.meta.env.DEV) this.game.devTuning?.gate(this);
    finishSessionChain(this);
    if (this.trial) { this.busy = true; this._finishTrial(); return; }
    this.deathsAtGate = this.deaths;
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
    if (import.meta.env.DEV) this.game.devTuning?.gate(this);
    finishSessionChain(this);
    const g = this.game;
    if (this.trial) { this.busy = true; this._finishTrial(); return; }
    this.deathsAtGate = this.deaths;
    this.busy = true;
    this._recordLevelStats();
    g.player.frozen = true;
    audio.play('checkpoint');
    g.ui.banner('STAGE CLEAR!', this.def.name, 1.6);
    await wait(900);
    await this._missedRain();
    await g.ui.fade(1);
    g.player.setRide(null);
    if (this.def.bonus) g.bonusCleared(this);
    else g.goalLevelCleared(this);
  }

  // Every breakable Nobu skipped drops on his head, one by one, before the level ends.
  async _missedRain() {
    const g = this.game, p = g.player;
    if (!this.breakablesTotal) return;
    const missed = this.stage.entities.filter((e) => e instanceof Breakable && e.countable && !e.broken).length;
    await wait(350);
    if (!missed) {
      g.ui.banner('PERFECT!', this.stats?.perfectCandidate ? MASTERY_TEXT.perfectRain : 'Not a single backpack missed', 1.8);
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

  liveStats() {
    const ents = this.stage.entities;
    return { level: this.level, broken: ents.filter((e) => e instanceof Breakable && e.countable && e.broken).length, breakables: this.breakablesTotal, dogs: ents.filter((e) => e instanceof ConedDog && e.freed).length, dogsTotal: this.dogsTotal, deathsAtGate: this.deathsAtGate ?? this.deaths, snackRaw: this.snack.raw, snackPotential: this.snack.potential, snackTier: snackTier(this.snack.raw, this.snack.potential), hiddenFound: this.hiddenFound, bestChain: Math.max(this.chain.best, this.chain.n), ...this._missStats() };
  }

  collectHiddenBone() {
    const ctx = boneContext(this, this.godUsed || save.data.godMode);
    if (ctx.trial || ctx.remix || ctx.rush) return false;
    this.hiddenFound = true;
    applyRunResults(save.data, this.level, { hidden: true }, { bonus: this.def.bonus });
    save.write();
    return true;
  }

  _missStats() {
    const stage = this.stage, sections = stage.sections || this.def.sections || [];
    const project = (x, z) => stage.track?.project(x, z) || { s: NaN };
    return {
      sectionMiss: missesBySection(stage.entities.filter((e) => e instanceof Breakable && e.countable && !e.broken), sections, project, SECTION_TEXT.path),
      missedDogs: missesBySection(stage.entities.filter((e) => e instanceof ConedDog && !e.freed), sections, project, SECTION_TEXT.path),
    };
  }

  _recordLevelStats() {
    const ents = this.stage.entities;
    this.stats = {
      ...this.liveStats(),
      freedIds: [...this.freedIds],
      godUsed: this.godUsed || !!save.data.godMode,
      tickets: this.levelTickets,
      broken: ents.filter((e) => e instanceof Breakable && e.countable && e.broken).length,
      breakables: this.breakablesTotal,
      dogs: ents.filter((e) => e instanceof ConedDog && e.freed).length,
      dogsTotal: this.dogsTotal,
    };
    this.stats.perfectCandidate = perfectRun(this.stats, boneContext(this, this.stats.godUsed), this.def);
    const ctx = boneContext(this);
    if (!ctx.trial && !ctx.remix && !ctx.rush) {
      save.data.lastMiss[this.level] = boundedMiss(this.stats.sectionMiss);
      save.write();
    }
  }

  async startBoss() {
    const g = this.game;
    this.phase = 'boss';
    this.tickets.clearFlying?.();
    g.ui.showLoading('BOSS FIGHT', this.def.name.toUpperCase());
    g.ui.loadingProgress(0.1, 'Building the arena...');
    await nextFrame();
    const stage = this._newStage(this.def.bossTheme);
    const info = this.def.arena(g, stage, this.tickets);
    stage.finalize();
    this.tickets.finalize();
    g.ui.loadingProgress(0.6, 'Waking the boss...');
    await nextFrame();
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
    g.ui.loadingProgress(0.8, 'Warming up...');
    await this._warmUp();
    audio.playMusic('cutscene');
    // intro shot on the boss
    const bp = boss.pos.clone();
    g.camera.cinematic(new THREE.Vector3(bp.x + 3, Math.max(3, bp.y + 1.5), bp.z + 9), new THREE.Vector3(bp.x, bp.y + 1, bp.z), 2.5);
    g.camera.pos.set(bp.x + 6, bp.y + 4, bp.z + 16);
    g.ui.fade(0, 0);
    await g.ui.hideLoading();
    audio.play('bossRoar');
    g.camera.shake(0.4, 0.5);
    await g.ui.say(BOSS_TALK[this.def.bossKey].intro);
    g.camera.endCinematic();
    g.player.frozen = false;
    g.ui.bossShow(boss.name, boss.portrait, boss.stages);
    g.ui.bossCharge(0, false);
    audio.playMusic(stage.theme.music);
    g.ui.banner('FIGHT!', boss.name, 1.4);
    boss.start();
    this.bossRun = newBossRun();
    this.bossClock = 0;
    this.bossDeaths = {};
    this.bossStageDeaths = 0;
    this.bossDdaUsed = false;
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
    this.bossStageDeaths = 0;
    boss.dda = { tele: 1, window: 0 };
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
    // Bird/Cat retry from stage 1, so later stages must restore their own help
    // when reached again rather than losing it at the earlier restart.
    this._applyBossDda(phase);
    boss.stateT = 0; // the phase-change reaction (rage/roar) starts now, after the dialogue
    boss.active = true;
    boss.beginPhase?.();
    this.busy = false;
  }

  onBossDefeated(boss) {
    const g = this.game;
    this._awardBossMedals(boss);
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
      this._showBossMedals?.();
    }, 2600);
    setTimeout(() => {
      g.ui.fade(1).then(() => g.levelCleared(this));
    }, 6200);
  }

  // ---------- events from entities ----------
  _bossContext() {
    return { god: !!(save.data.godMode || this.game.player?.god), trial: this.trial,
      remix: !!this.remix, rush: !!this.rush, ranked: !!this.ranked, medal: !!this.medalMode,
      skipped: !!this.bossSkipped };
  }

  _applyBossDda(phase, resetMask = false) {
    this.bossStageDeaths = this.bossDeaths[phase] || 0;
    const help = bossDda(this.bossStageDeaths, this._bossContext());
    this.boss.dda = { tele: help.tele, window: help.window };
    if (resetMask || help.masks) this.setMask(resetMask ? help.masks : Math.max(this.mask, help.masks));
    if (help.masks) {
      this.bossDdaUsed = true;
      if (this.bossRun) this.bossRun.void = true;
    }
  }

  onPlayerHurt() {
    if (this.phase !== 'boss' || !this.boss || this.boss.defeated) return;
    this.boss.onPlayerHurt();
    if (this.bossRun) this.bossRun.noHit = false;
  }

  _awardBossMedals(boss) {
    if (!this.bossRun || boss !== this.boss) return;
    const previous = save.data.bossMedals?.[boss.key] || {};
    this.bossRun.noHit &&= !boss.tookHitThisFight;
    this.bossRun.void ||= this.bossDdaUsed;
    const record = bossMedals(boss.key, this.bossRun, previous, this._bossContext());
    this.newBossMedals = null;
    if (!record) return;
    this.newBossMedals = { noHit: record.noHit && !previous.noHit, speed: record.speed && !previous.speed };
    (save.data.bossMedals ||= {})[boss.key] = record;
    save.write();
  }

  _showBossMedals() {
    const earned = this.newBossMedals;
    if (!earned || (!earned.noHit && !earned.speed)) return;
    this.game.ui.banner(earned.noHit ? BOSS_MEDAL_TEXT.noHit : BOSS_MEDAL_TEXT.speed,
      earned.noHit && earned.speed ? BOSS_MEDAL_TEXT.speed : '', 3);
  }

  onBreak(entity) { hitSessionChain(this, entity); this._pushHud(); }
  onEnemyDefeated(entity) { hitSessionChain(this, entity); }

  addTickets(n, source) {
    n = Math.floor(Number(n));
    if (!(n > 0)) return;
    if (this.phase === 'level' && !SNACK_EXCLUDED.has(source)) this.snack.raw += n;
    if (source === 'coconut') {
      const capRaw = rawTicketsForWhole(COCONUT_CAP_PER_CLEAR);
      const room = capRaw - this.coconutRaw;
      if (room <= 0) return;
      n = Math.min(n, room);
      this.coconutRaw += n;
    } else {
      this.fieldRaw += n;
    }
    const whole = Math.min(COCONUT_CAP_PER_CLEAR, wholeTicketsFromRaw(this.coconutRaw)) + wholeTicketsFromRaw(this.fieldRaw);
    const gain = whole - this.levelTickets;
    if (gain <= 0) return;
    this.levelTickets = whole;
    const before = save.data.tickets;
    if (!this._lifeLineHold) {
      const spentLine = Math.floor(Math.max(0, before) / 100);
      if (spentLine < (this.lifeLine || 0)) this._setLifeLine(spentLine);
    }
    save.data.tickets += gain;
    this._grantLifeLines();
    this.game.ui.setHud('tickets', save.data.tickets);
  }

  _setLifeLine(line) {
    const next = Math.max(0, Math.floor(line));
    this.lifeLine = next;
    if (this.cp) this.cp.lifeLine = next;
  }

  _grantLifeLines() {
    const line = Math.floor(Math.max(0, save.data.tickets) / 100);
    while ((this.lifeLine || 0) < line) {
      this.lifeLine = (this.lifeLine || 0) + 1;
      if (this.cp) this.cp.lifeLine = Math.max(this.cp.lifeLine || 0, this.lifeLine);
      this.addLife(1);
    }
  }

  _undoLifeLinesAbove(line) {
    const floor = Math.max(0, Math.floor(line));
    const current = this.lifeLine || 0;
    if (current > floor) {
      this.addLife(floor - current);
      this._setLifeLine(floor);
    }
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

  rescueDog(dog) {
    if (dog?.dogId) this.freedIds.add(dog.dogId);
    const freed = this.stage.entities.filter((e) => e instanceof ConedDog && e.freed).length;
    this.game.ui.setHud('dogs', `${freed}/${this.dogsTotal}`);
    if (freed === this.dogsTotal && this.dogsTotal > 0) this.game.ui.banner('ALL DOGS FREE!', '', 1.6);
  }

  checkpoint(pos, snacks) {
    this.chain.sphereGiven = false;
    this.cp = { pos: pos.clone(), facing: this.game.player.facing, seq: this.seq, tickets: save.data.tickets, levelTickets: this.levelTickets, fieldRaw: this.fieldRaw, coconutRaw: this.coconutRaw, lifeLine: this.lifeLine || 0, snackRaw: this.snack.raw, freedIds: new Set(this.freedIds) };
    for (const entity of this.stage.entities) if (entity.kind !== 'mystery') entity.onCheckpoint?.();
    this._lifeLineHold = false;
    this.deathsAtCp = 0;
    this.game.ui.banner('CHECKPOINT!', 'yum', 1.4);
    // Golden Collar refills here. Pits never come through this path.
    this.game.player?.rechargeGuard?.();
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
    if (import.meta.env.DEV) this.game.devTuning?.death(this, type);
    this.dying = true;
    this.onPlayerHurt(); // Includes direct pit/crusher deaths which bypass hurt().
    if (this.phase === 'boss' && this.boss && !this.boss.defeated) {
      const phase = this.boss.phase;
      this.bossDeaths[phase] = (this.bossDeaths[phase] || 0) + 1;
      this.bossStageDeaths = this.bossDeaths[phase];
    }
    finishSessionChain(this);
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
    finishSessionChain(this);
    this.chain.sphereGiven = false;
    removeChainDrops(this);
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
    const lineBefore = this.lifeLine || 0;
    this.tickets.clearFlying();
    this._undoLifeLinesAbove(lineBefore);
    const restored = Number.isFinite(cp.lifeLine) ? cp.lifeLine : lineBefore;
    if ((this.lifeLine || 0) < restored) this._setLifeLine(restored);
    this._lifeLineHold = true;
    save.data.tickets = cp.tickets;
    this.levelTickets = cp.levelTickets;
    this.fieldRaw = cp.fieldRaw || 0;
    this.snack.raw = cp.snackRaw || 0;
    this.freedIds = new Set(cp.freedIds);
    this.coconutRaw = cp.coconutRaw || 0;
    this.projectiles.clear();
    g.fx.clear();
    g.player.spawnAt(cp.pos, cp.facing);
    if (g.player.ride) g.player.ride.speedK = 0;
    g.camera.snap(g.player);
    // pity mask after a few deaths at the same checkpoint (classic!)
    if (this.phase !== 'boss') this.setMask(this.deathsAtCp >= 3 ? 1 : 0);
    g.mask.snapTo(g.player);
    this._pushHud();
    if (this.chase && this.stage.track) {
      const pr = this.stage.track.project(cp.pos.x, cp.pos.z);
      this.chase.begin(pr.s - 13, 1.6);
    }
    if (this.phase === 'boss' && this.boss) {
      this.boss.killMinions?.();
      const phase = this.boss.phaseCheckpoints === false ? 1 : this.bossPhaseCp;
      this.boss.resetToPhase(phase);
      this._applyBossDda(phase, true);
      g.ui.bossHp(this.boss.hp / this.boss.maxHp, phase);
      this.boss.active = true;
    }
  }

  // ---------- per-frame ----------
  update(dt) {
    const g = this.game;
    if (!this.stage) return;
    this.godUsed ||= !!save.data.godMode;
    if (this.phase === 'boss' && this.bossRun && this.boss?.active && !this.boss.defeated && !this.busy && g.state !== 'pause') {
      this.bossRun.t += dt;
      this.bossClock = this.bossRun.t;
      // Enabling God Mode for any part of a fight permanently voids this attempt.
      if (save.data.godMode || g.player.god) this.bossRun.void = true;
    }
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
    if (import.meta.env.DEV) g.devTuning?.update(this, dt);
    updateSessionChain(this, dt);
    if (this.rain) this._updateRain(dt);
    if (this.bonusRound && !this.busy && !g.player.dead && g.player.pos.y < this.bonusRound.R.floorY - 4) this._leaveBonusRound(false);
    if (this.trialRunning && !this.busy && !g.player.frozen && !g.player.dead && !g.ui.talking) {
      if (this.freezeT > 0) this.freezeT = Math.max(0, this.freezeT - dt);
      else this.trialT += dt;
      // Rebuild the clock text only when the shown centisecond or the frozen tint changes.
      const cs = Math.round(this.trialT * 100), frozen = this.freezeT > 0;
      if (cs !== this._trialCs || frozen !== this._trialFrozen) {
        this._trialCs = cs;
        this._trialFrozen = frozen;
        g.ui.trialTime(fmtTime(this.trialT), frozen);
      }
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
    for (const e of [...this.stage.entities]) {
      if (e.dead || !e.onFlop || !e.interactive) continue;
      const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z, dy = e.pos.y - pos.y;
      if (dx * dx + dz * dz < 2.5 * 2.5 && Math.abs(dy) < 1.6) e.onFlop(g.player);
    }
  }

  dispose() {
    if (this.stage) this.stage.dispose();
  }
}
