import * as THREE from 'three';
import { Boss, Beam, pullToward, glowPart } from './common.js';
import { autoRig } from './autorig.js';
import { QueenPill, QueenAirdrop } from './queenHelpers.js';
import { Assets } from '../art/assets.js';
import { toon } from '../player/nobuPrims.js';
import { textTexture } from '../entities/fx.js';
import { audio } from '../audio/audio.js';
import { QUEEN_STAGE_POWERS, QUEEN_TICKER_TEXT } from '../story/script.js';
import { materialSet, modelSkeletons } from './catResources.js';
import { queenCleanup, queenHazardsPaused, queenProceduralCleanup } from './queenResources.js';

export const QUEEN_PLANS = Object.freeze({
  1: ['mint', 'wave', 'pump', 'mint', 'chain', 'pump'],
  2: ['mint', 'airdrop', 'fomo', 'pump', 'chain', 'mint', 'pump'],
  3: ['mint', 'crash', 'fomo', 'pump', 'airdrop', 'chain', 'pump'],
  4: ['liquidation', 'wake', 'airdrop', 'chain', 'liquidation', 'wake']
});
export const QUEEN_CHAINS = Object.freeze({
  1: [['mint', 'pump']],
  2: [
    ['fomo', 'pump'],
    ['airdrop', 'fomo'],
    ['mint', 'airdrop', 'pump']
  ],
  3: [
    ['fomo', 'crash', 'pump'],
    ['airdrop', 'fomo', 'pump']
  ],
  4: [
    ['liquidation', 'fomo', 'crash', 'wake'],
    ['airdrop', 'fomo', 'liquidation', 'wake'],
    ['fomo', 'crash', 'wake']
  ]
});
const JOINTS = {
  root: [0, 0, 0],
  body: [0, 1.4, 0],
  top: [0, 2.8, 0],
  head: [0, 3.5, 0],
  armL: [-1, 2.2, 0],
  armR: [1, 2.2, 0]
};
const PARENTS = { root: null, body: 'root', top: 'body', head: 'top', armL: 'body', armR: 'body' };
const weigh = (x, y) =>
  y > 3.2
    ? { head: 1 }
    : y > 2.4
      ? { top: 1 }
      : Math.abs(x) > 0.8 && y > 1.6
        ? { [x < 0 ? 'armL' : 'armR']: 1 }
        : { body: 1 };

export function fitQueenModel(model, height = 5.5) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model),
    size = box.getSize(new THREE.Vector3());
  if (!(size.y > 0)) return false;
  model.scale.multiplyScalar(height / size.y);
  model.updateMatrixWorld(true);
  box.setFromObject(model);
  const c = box.getCenter(new THREE.Vector3());
  model.position.x -= c.x;
  model.position.z -= c.z;
  model.position.y -= box.min.y;
  return true;
}

// autoRig consumes static geometry. The existing pill_bot is already skinned;
// read its actual rest-pose vertices (including skin/bind transforms) before
// replacing that skeleton. Raw-buffer baking shrinks this asset by100x.
export function bakeQueenRestPose(model) {
  model.updateMatrixWorld(true);
  const meshes = [];
  model.traverse((obj) => {
    if (obj.isMesh) meshes.push(obj);
  });
  if (!meshes.some((obj) => obj.isSkinnedMesh)) return new Set();
  const inverse = new THREE.Matrix4().copy(model.matrixWorld).invert(),
    vertex = new THREE.Vector3();
  const baked = [],
    geometries = new Set();
  for (const source of meshes) {
    const geometry = source.geometry.clone(),
      positions = geometry.attributes.position;
    const local = new THREE.Matrix4().multiplyMatrices(inverse, source.matrixWorld);
    for (let i = 0; i < positions.count; i++) {
      source.getVertexPosition(i, vertex);
      vertex.applyMatrix4(local);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    geometry.morphAttributes = {};
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometries.add(geometry);
    baked.push(new THREE.Mesh(geometry, source.material));
  }
  model.clear();
  model.add(...baked);
  return geometries;
}

export class PumpQueen extends Boss {
  constructor(stage, x = 0, y = 3, z = 0) {
    super(stage, x, y, z, { name: 'THE PUMP QUEEN', portrait: 'portrait_queen', key: 'queen' });
    this.pos.set(0, 3, 0);
    this.home.copy(this.pos);
    this.ground = 0;
    this.arena = stage.queenArena;
    this.stageScale = [1, 1, 1.1, 1.2, 1.28];
    this.stageColors = [0, 0, 0x4aff8a, 0xffd23f, 0xff2a3a];
    this.stageNames = { 2: 'HYPE', 3: 'BUBBLE', 4: 'RUG PULL' };
    this.stagePowers = QUEEN_STAGE_POWERS;
    this.rig = new THREE.Group();
    this.obj.add(this.rig);
    this.buildModel();
    this.center = new THREE.Vector3();
    this.crownPoint = new THREE.Vector3();
    this.beamFrom = new THREE.Vector3();
    this.beamTo = new THREE.Vector3();
    this.beam = new Beam(stage.scene, 0x4aff8a);
    this.CHAINS = QUEEN_CHAINS;
    this.plan = [];
    this.minions = [];
    this.airdrops = [];
    this.acceptsBark = true;
    this.pumpAmount = 0;
    this.introCandle = new THREE.Mesh(new THREE.BoxGeometry(2.6, 12, 2.6), toon(0x4aff8a));
    this.introCandle.position.y = -6;
    this.introCandle.visible = false;
    this.obj.add(this.introCandle);
    this.collectMeshes();
    this.setStageLook(1);
    this.refreshBox();
    this.disposeResources = queenProceduralCleanup(stage, [this.obj, this.beam.group], [this.tickerTexture]);
    queenCleanup(stage, () => {
      if (this.crown.parent !== this.crownAnchor) this.crown.parent?.remove(this.crown);
    });
  }
  buildModel() {
    let model = Assets.model('model_pump_queen', 5.5);
    const primitive = !model,
      alias = !!model && !Assets.models?.has('model_pump_queen');
    if (!model) {
      model = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 3.1, 8, 24), toon(0xd23cff));
      body.position.y = 2.75;
      model.add(body);
    }
    fitQueenModel(model);
    this.rig.add(model);
    this.model = model;
    const supersededMaterials = primitive || alias ? materialSet(model) : new Set();
    const supersededSkeletons = modelSkeletons(model);
    const supersededGeometry = new Set();
    if (primitive)
      model.traverse((obj) => {
        if (obj.isMesh) supersededGeometry.add(obj.geometry);
      });
    for (const geometry of bakeQueenRestPose(model)) supersededGeometry.add(geometry);
    const rig = autoRig(model, { height: 5.5, joints: JOINTS, parents: PARENTS, weigh, yaw: -Math.PI / 2 });
    if (rig) {
      for (const material of supersededMaterials) material.dispose();
      for (const skeleton of supersededSkeletons) skeleton.dispose();
      for (const geometry of supersededGeometry) geometry.dispose();
    }
    this.bones = rig?.bones;
    this.crownAnchor = new THREE.Group();
    this.crownAnchor.position.y = this.bones ? 5.2 - (3.5 * 5.5) / 4 : 5.2;
    (this.bones?.head ?? this.rig).add(this.crownAnchor);
    this.crown = Assets.model('model_nobu_champions_crown', 1.1);
    if (!this.crown) {
      this.crown = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.8, 0.12, 8, 24).rotateX(Math.PI / 2),
        toon(0xffcf4a)
      );
      this.crown.add(ring);
      for (let i = 0; i < 5; i++) {
        const p = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 5), toon(0xffcf4a));
        p.position.set(Math.cos((i * Math.PI * 2) / 5) * 0.8, 0.35, Math.sin((i * Math.PI * 2) / 5) * 0.8);
        this.crown.add(p);
      }
    } else {
      const clones = new Map();
      const cloneMaterial = (material) => {
        if (!clones.has(material)) clones.set(material, material.clone());
        return clones.get(material);
      };
      this.crown.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry = obj.geometry.clone();
          obj.material = Array.isArray(obj.material)
            ? obj.material.map(cloneMaterial)
            : cloneMaterial(obj.material);
        }
      });
      fitQueenModel(this.crown, 1.1);
    }
    this.crown.rotation.z = 0.15;
    this.crown.rotation.y = -Math.PI / 2;
    this.crownAnchor.add(this.crown);
    this.crownGlow = glowPart(0xffed8a, 1.7);
    this.crownAnchor.add(this.crownGlow);
    this.crownGlow.visible = false;
    this.bubble = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 32, 20),
      new THREE.MeshBasicMaterial({
        color: 0xffdcb0,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
        fog: false
      })
    );
    this.bubble.position.y = 2.75;
    this.rig.add(this.bubble);
    this.bubble.visible = false;
  }
  makeStageParts() {
    const two = [],
      three = [],
      four = [];
    for (const y of [2.2, 3]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.2, 0.08, 8, 48).rotateX(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x4aff8a, fog: false })
      );
      ring.position.y = y;
      this.rig.add(ring);
      two.push(ring);
    }
    this.tickerTexture = textTexture(QUEEN_TICKER_TEXT.pump, { color: '#4aff8a', w: 1024, h: 128, size: 90 });
    this.tickerTexture.wrapS = THREE.RepeatWrapping;
    const ticker = new THREE.Mesh(
      new THREE.CylinderGeometry(1.85, 1.85, 0.6, 48, 1, true),
      new THREE.MeshBasicMaterial({ map: this.tickerTexture, transparent: true, side: THREE.DoubleSide })
    );
    ticker.position.y = 2.7;
    this.rig.add(ticker);
    two.push(ticker);
    const chain = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.16, 8, 32).rotateX(Math.PI / 2),
      toon(0xffce55)
    );
    chain.position.y = 4.2;
    this.rig.add(chain);
    three.push(chain);
    for (let i = 0; i < 7; i++) {
      const crack = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 1.3, 0.04),
        new THREE.MeshBasicMaterial({ color: 0xff3a4a, fog: false })
      );
      const a = (i * Math.PI * 2) / 7;
      crack.position.set(Math.sin(a) * 1.4, 2.8, Math.cos(a) * 1.4);
      crack.rotation.z = (i % 2 ? 1 : -1) * 0.45;
      this.rig.add(crack);
      four.push(crack);
    }
    return { 2: two, 3: three, 4: four };
  }
  start() {
    this.active = true;
    this.beginPhase();
  }
  intro() {
    this.introT = 0;
    this.chants = 0;
    this.pos.y = -8;
    this.introCandle.visible = true;
    this.arena.setTicker('pump');
    return new Promise((resolve) => {
      this.introResolve = resolve;
    });
  }
  setStageLook(phase) {
    super.setStageLook(phase);
    this.crown.rotation.z = phase === 4 ? 0.5 : 0.15;
  }
  update(dt) {
    if (queenHazardsPaused(this.game) && this.active && !this.evolving && !this.defeated) {
      this.refreshBox();
      return;
    }
    super.update(dt);
  }
  evolve(phase) {
    if (phase === 4) {
      this.arena.setTicker('dump');
      audio.play('crashSiren');
    }
    const result = super.evolve(phase);
    if (!this.pillarCleanup) this.pillarCleanup = queenProceduralCleanup(this.stage, [this.pillar]);
    return result;
  }
  beginPhase() {
    this.killMinions();
    this.arena.setPhase(this.phase);
    this.pos.set(0, 3, 0);
    this.pumpAmount = 0;
    this.shielded = false;
    this.bubble.visible = false;
    this.plan = [];
    this.nextAction();
  }
  nextAction() {
    if (!this.plan.length) this.plan = QUEEN_PLANS[this.phase].slice();
    if (this.ultReady) {
      this.beginAttack('ultimate');
      return;
    }
    const s = this.plan.shift();
    if (s === 'chain') {
      if (this.startChain(this.pickChain())) return;
      this.nextAction();
      return;
    }
    this.beginAttack(s);
  }
  afterAttack() {
    this.nextAction();
  }
  beginAttack(s) {
    this.setState(s);
    this.vulnerable = false;
    this.crownGlow.visible = false;
    this.beam.hide();
    this.did = false;
    this.windowExtra = 0;
    this.tell =
      s === 'mint'
        ? this.tele(0.8)
        : s === 'pump'
          ? this.tele(1.4)
          : s === 'fomo'
            ? this.tele(0.9)
            : s === 'crash'
              ? this.tele(1)
              : s === 'wake'
                ? this.tele(1)
                : s === 'ultimate'
                  ? 1.5
                  : 0;
    if (s === 'mint') {
      this.minions = this.minions.filter((m) => !m.dead && m.alive);
      const occupied = new Set(this.minions.map((m) => m.candle));
      const inner = this.arena.pillars.filter((p) => p.inner && !occupied.has(p)).sort((a, b) => b.pos.y - a.pos.y),
        outer = this.arena.pillars.filter((p) => !p.inner && !occupied.has(p)).sort(() => Math.random() - 0.5);
      this.mintTargets = [inner[0], ...outer.slice(0, 2)].filter(Boolean);
      for (const c of this.mintTargets)
        this.fx.sparkle(c.pos.x, c.pos.y + 0.5, c.pos.z, { count: 3, color: 0xb478ff, size: 0.6 });
      audio.play('laugh');
    }
    if (s === 'pump' && !this.hasLadder()) {
      this.setState('awaitLadder');
      this.pendingPump = true;
    } else if (s === 'pump') this.pendingPump = false;
    if (s === 'pump' && this.state === 'pump') {
      this.pumpPulseT = 0;
      audio.play('charge');
    }
    if (s === 'fomo') audio.play('charge', 1.5);
    if (s === 'airdrop') {
      const targets = this.arena.pillars
        .slice()
        .sort((a, b) => b.pos.y - a.pos.y)
        .slice(0, 4);
      this.airdrops.push(
        ...targets.map((p, i) =>
          this.stage.add(new QueenAirdrop(this.stage, p, i < (this.phase === 4 ? 1 : 2)))
        )
      );
    }
    if (s === 'crash') {
      this.arena.beginCrash(this.player, this.tell);
      this.crashNotes = 1; // The arena starts the first of three warning blips.
    }
    if (s === 'liquidation') {
      this.lastGreen = this.arena.beginLiquidation(this.player);
      this.safeChimeT = 0.65;
      audio.play('chime');
    }
    if (s === 'wake') {
      const launch = this.lastGreen ?? this.arena.nearest(this.player.pos, { outer: true });
      this.wakeCandle = this.arena.nearest(launch.pos, { inner: true });
      this.pos.set(this.wakeCandle.pos.x, 1.5, this.wakeCandle.pos.z);
      this.pumpAmount = 0;
      this.crumpled = false;
      this.wake = this.proj.wakeRing(this.pos.x, this.pos.z, {
        groundY: 1.5,
        life: this.tell + this.W + 2.5
      });
      this.wake.mesh.material.opacity = 0;
      this.wake.active = false;
      this.waveCount = 0;
    }
    if (s === 'ultimate') {
      this.beginUlt();
      this.trueGreen = this.arena.beginUltimate(this.player, this.tell, this.phase);
      this.safeChimeT = 0;
      audio.play('crashSiren');
    }
  }
  hasLadder() {
    return this.minions.some((m) => !m.dead && m.alive && m.pump >= 3 && m.candle.pos.y >= 1);
  }
  crownPosition() {
    this.obj.position.copy(this.pos);
    this.obj.updateMatrixWorld(true);
    return this.crownAnchor.getWorldPosition(this.crownPoint);
  }
  setPump(amount) {
    this.pumpAmount = amount;
    for (const name of ['body', 'top'])
      if (this.bones?.[name])
        this.bones[name].scale.set(1 + 0.35 * amount, 1 + 0.2 * amount, 1 + 0.35 * amount);
  }
  alignPumpedCrown() {
    const actual = this.crownPosition().y;
    const desired = 9 + 5.2 * (this.stageScale[this.phase] - 1);
    this.pos.y += desired - actual;
  }
  openWindow(extra = 0) {
    this.setState('pumped');
    this.windowExtra = extra;
    this.pumpedFor = this.W + extra;
    this.shielded = this.phase === 3;
    this.bubble.visible = this.shielded;
    this.vulnerable = !this.shielded;
    this.crownGlow.visible = this.vulnerable;
  }
  dump() {
    this.vulnerable = false;
    this.shielded = false;
    this.bubble.visible = false;
    this.crownGlow.visible = false;
    this.setState('dump');
    this.dumpStart = this.pos.y;
    this.did = false;
    this.beam.hide();
  }
  ai(dt) {
    const t = this.stateT,
      p = this.player,
      s = this.state;
    this.minions = this.minions.filter((m) => !m.dead && m.alive);
    this.crown.rotation.z = this.phase === 4 ? 0.5 : 0.15;
    for (const [name, sign] of [['armL', -1], ['armR', 1]]) {
      const arm = this.bones?.[name];
      if (!arm) continue;
      const angle = s === 'mint'
        ? sign * 0.9 * Math.sin(Math.min(1, t / this.tell) * Math.PI / 2)
        : 0;
      arm.rotation.z += (angle - arm.rotation.z) * Math.min(1, dt * 12);
    }
    if (this.tickerTexture) this.tickerTexture.offset.x += dt * 0.15;
    if (s === 'mint') {
      if (t >= this.tell) {
        for (const candle of this.mintTargets)
          if (this.minions.length < 4)
            this.minions.push(this.stage.add(new QueenPill(this.stage, candle, this)));
        if (this.pendingPump) {
          this.pendingPump = false;
          this.beginAttack('pump');
        } else this.endAttack();
      }
    } else if (s === 'awaitLadder') {
      if (this.hasLadder()) this.beginAttack('pump');
      else if (!this.minions.length) {
        this.pendingPump = true;
        this.beginAttack('mint');
      }
    } else if (s === 'wave') {
      if (t >= 1.4 / this.sp) this.endAttack();
    } else if (s === 'pump') {
      this.setPump(Math.min(1, t / this.tell));
      this.alignPumpedCrown();
      this.pumpPulseT -= dt;
      if (this.pumpPulseT <= 0) {
        this.pumpPulseT = 0.22;
        this.fx.shock(this.pos.x, this.pos.y + 0.15, this.pos.z, {
          radius: 2.2 + this.pumpAmount,
          life: 0.3,
          color: 0x4aff8a
        });
      }
      if (t >= this.tell) this.openWindow();
    } else if (s === 'pumped') {
      this.vulnerable = !this.shielded;
      this.crownGlow.visible = this.vulnerable;
      if (t >= this.pumpedFor) this.dump();
    } else if (s === 'dump') {
      this.setPump(Math.max(0, 1 - t / 0.4));
      const restingY = this.phase === 4 ? (this.wakeCandle?.pos.y ?? 1.5) : 3;
      this.pos.y = this.dumpStart + (restingY - this.dumpStart) * Math.min(1, t / 0.4);
      if (t >= 0.4 && !this.did) {
        this.did = true;
        this.proj.shockwave(this.pos.x, this.pos.y, this.pos.z, 8 * this.sp, 12);
      }
      if (this.phase === 4 && t >= 0.7 && !this.didSecond) {
        this.didSecond = true;
        this.proj.shockwave(this.pos.x, this.pos.y, this.pos.z, 8 * this.sp, 12);
      }
      if (t >= 0.8) {
        this.didSecond = false;
        this.crumpled = false;
        this.rig.scale.y = this.stageScale[this.phase];
        if (this.phase < 4 && Math.hypot(this.pos.x, this.pos.z) > 0.05) this.setState('returnCenter');
        else this.endAttack();
      }
    } else if (s === 'returnCenter') {
      const distance = Math.hypot(this.pos.x, this.pos.z),
        step = 4 * this.sp * dt;
      if (distance <= step) {
        this.pos.x = 0;
        this.pos.z = 0;
        this.endAttack();
      } else {
        this.pos.x -= (this.pos.x / distance) * step;
        this.pos.z -= (this.pos.z / distance) * step;
      }
    } else if (s === 'fomo') {
      this.beamFrom.copy(this.pos);
      this.beamFrom.y += 3;
      this.beamTo.copy(p.pos);
      this.beamTo.y += 0.5;
      this.beam.set(this.beamFrom, this.beamTo, t >= this.tell, t);
      if (t >= this.tell) pullToward(this, 3.4, dt, { constant: true, center: this.center });
      if (t >= this.tell + 2.8) this.endAttack();
    } else if (s === 'airdrop') {
      if (t >= 4.5) this.endAttack();
    } else if (s === 'crash') {
      while (this.crashNotes < 3 && t >= (this.crashNotes * this.tell) / 3) {
        audio.play('blipLow');
        this.crashNotes++;
      }
      if (t >= this.tell + 1) this.endAttack();
    } else if (s === 'liquidation') {
      this.chimeSafePillar(dt);
      if (t >= (11 * 0.45) / this.sp + 1) this.endAttack();
    } else if (s === 'wake') {
      this.pos.y = this.wakeCandle.pos.y;
      this.wake.mesh.position.y = this.pos.y + 1.1;
      this.wake.groundY = this.pos.y;
      this.wake.mesh.material.opacity = 0.5 * Math.min(1, t / this.tell);
      if (t >= this.tell) {
        this.wake.active = true;
        const n = Math.floor((t - this.tell) / 1.5);
        if (n > this.waveCount) {
          this.waveCount = n;
          this.proj.shockwave(this.pos.x, this.pos.y, this.pos.z, 8 * this.sp, 12);
        }
      }
      if (t >= this.tell + this.W + 2.5) {
        this.clearWake();
        this.dump();
      }
    } else if (s === 'ultimate') {
      if (this.arena.ultimate?.settledAt != null) this.chimeSafePillar(dt);
      if (t < this.tell) this.powerUp(dt, t / this.tell, 0xff3a4a, 2, 0);
      else {
        if (!this.did) {
          this.did = true;
          if (this.phase <= 2) this.arena.ring.hotT = 4;
          const candle = this.trueGreen;
          if (!this.minions.some((m) => m.candle === candle)) {
            if (this.minions.length >= 4) this.minions[0].reset();
            this.minions = this.minions.filter((m) => !m.dead);
            this.minions.push(this.stage.add(new QueenPill(this.stage, candle, this, { pump: 3 })));
          }
        }
      }
      if (t >= this.tell + 5) {
        this.arena.endUltimate();
        this.pos.x = this.trueGreen.pos.x;
        this.pos.z = this.trueGreen.pos.z;
        this.setPump(1);
        this.alignPumpedCrown();
        this.endUlt();
        this.openWindow(1);
      }
    }
    if (this.crumpled) {
      this.rig.scale.y = 0.7 / 5.2;
      this.crownAnchor.position.y = this.bones ? 5.2 - (3.5 * 5.5) / 4 : 5.2;
    }
    this.refreshBox();
  }
  chimeSafePillar(dt) {
    this.safeChimeT -= dt;
    if (this.safeChimeT <= 0) {
      this.safeChimeT = 0.65;
      audio.play('chime');
    }
  }
  refreshBox() {
    this.setBox(3.6, Math.max(1, this.crownPosition().y - this.pos.y + 1), 3.6);
  }
  nearCrown(p) {
    return (
      Math.hypot(
        p.pos.x - this.crownPosition().x,
        p.pos.y + 0.75 - this.crownPoint.y,
        p.pos.z - this.crownPoint.z
      ) <= 1.6
    );
  }
  onBite(p) {
    if (this.vulnerable && this.nearCrown(p)) this.damage(p);
  }
  onStomp(p) {
    if (this.vulnerable && this.nearCrown(p)) this.damage(p);
    else this.onTouch(p);
  }
  onTouch(p) {
    if (this.hitCool > 0) return; // Let the successful crown bounce clear this body.
    if (
      this.active &&
      !this.defeated &&
      !this.vulnerable &&
      Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 1.8
    )
      p.hurt('angel', this.pos.x, this.pos.z);
  }
  popBubble() {
    if (this.phase === 3 && this.state === 'pumped' && this.shielded) {
      this.shielded = false;
      this.bubble.visible = false;
      this.vulnerable = true;
      this.crownGlow.visible = true;
      this.stateT = 0;
      this.pumpedFor = this.W + this.windowExtra;
      audio.play('conePop');
      return true;
    }
    return false;
  }
  onBark() {
    return this.popBubble();
  }
  onEarnedBark() {
    return this.popBubble();
  }
  onDash(p) {
    if (
      this.phase === 4 &&
      this.state === 'wake' &&
      this.stateT >= this.tell &&
      p.dustDashing &&
      Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) <= 2.16 &&
      Math.abs(p.pos.y - this.pos.y) < 1.6
    ) {
      this.clearWake();
      this.crumpled = true;
      this.setPump(0);
      this.rig.scale.y = 0.7 / 5.2;
      this.openWindow();
      this.refreshBox();
      return true;
    }
    return false;
  }
  clearWake() {
    if (this.wake) {
      this.wake.life = 0;
      this.wake.active = false;
      this.wake.mesh.visible = false;
      this.wake = null;
    }
  }
  onHit() {
    this.clearWake();
    this.dump();
  }
  killMinions() {
    for (const m of this.minions) m.reset();
    this.minions = [];
  }
  onResetPhase() {
    this.killMinions();
    for (const drop of this.airdrops) drop.onRespawn();
    this.airdrops = [];
    this.clearWake();
    this.beam.hide();
    this.shielded = false;
    this.crumpled = false;
    this.bubble.visible = false;
    this.pendingPump = false;
    this.setPump(0);
    this.pos.copy(this.home);
    this.arena.setPhase(this.phase);
    this.plan = [];
    this.beginAttack(this.phase === 4 ? 'liquidation' : 'mint');
  }
  idleAnim(dt = 0) {
    if (this.introResolve) {
      this.introT = Math.min(2, this.introT + dt);
      const k = this.introT / 2;
      this.pos.y = -8 + 11 * k * k * (3 - 2 * k);
      while (this.chants < 4 && this.introT >= this.chants * 0.4) {
        this.chants++;
        audio.play('doubleJump', 0.8 + this.chants * 0.08);
      }
      if (this.bones?.armR) this.bones.armR.rotation.z = Math.sin(this.introT * 10) * 0.5;
      if (this.introT >= 2) {
        const resolve = this.introResolve;
        this.introResolve = null;
        this.introCandle.visible = false;
        resolve();
      }
    }
    this.refreshBox();
  }
  defeatAnim(dt) {
    this.beam.hide();
    this.clearWake();
    if (!this.defeatT) {
      this.arena.setTicker('zero');
      this.killMinions();
      for (const drop of this.airdrops) drop.onRespawn();
      this.defeatOrigin = this.pos.clone();
      this.rig.scale.setScalar(this.stageScale[this.phase]);
    }
    this.defeatT = (this.defeatT || 0) + dt;
    const t = this.defeatT,
      k = Math.min(1, t / 2);
    this.rig.rotation.y += dt * 8;
    this.pos.x = this.defeatOrigin.x + Math.sin(t * 7) * 2 * (1 - k);
    this.pos.z = this.defeatOrigin.z + Math.cos(t * 7) * 2 * (1 - k);
    this.rig.scale.y = Math.max(0.03, this.stageScale[this.phase] * (1 - k));
    if (t >= 2 && !this.popped) {
      this.popped = true;
      this.rig.visible = false;
      this.fx.burst(this.pos.x, this.pos.y + 2, this.pos.z, {
        count: 60,
        colors: [0xffd23f, 0xd23cff, 0x4aff8a],
        speed: 8
      });
      this.fx.explosion(this.pos.x, this.pos.y + 2, this.pos.z, { radius: 3, color: 0xd23cff });
      audio.play('conePop');
      audio.play('explosion');
      this.player.root.add(this.crown);
      this.crown.position.set(0, 1.35, 0);
      this.crown.rotation.set(0, -Math.PI / 2, 0);
    }
    if (this.popped && t < 2.65) this.crown.rotation.z = Math.sin(t * 40) * 0.18;
    if (t >= 2.65 && !this.crownFlying) {
      this.crownFlying = true;
      this.stage.scene.attach(this.crown);
      this.crownVelocity = new THREE.Vector3(4, 5, 2);
    }
    if (this.crownFlying) {
      this.crownVelocity.y -= dt * 12;
      this.crown.position.addScaledVector(this.crownVelocity, dt);
      this.crown.rotation.x += dt * 8;
      if (t > 4) this.crown.visible = false;
    }
  }
}
