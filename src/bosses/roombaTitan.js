import * as THREE from 'three';
import { Boss, flamePart, glowPart, pullToward } from './common.js';
import { Vacuum } from '../entities/enemies.js';
import { Assets } from '../art/assets.js';
import { toon } from '../player/nobuPrims.js';
import { audio } from '../audio/audio.js';
import { TUNING } from '../config/movement.js';
import { moveBody } from '../world/physics.js';
import { TITAN_STAGE_POWERS, TITAN_FLOP_HINT } from '../story/script.js';
import { startBossFling } from '../player/bossFling.js';

export const TITAN_PLANS = Object.freeze({
  1: ['patrol', 'charge', 'cable', 'chain', 'patrol', 'charge', 'cable', 'chain'],
  2: ['patrol', 'swarm', 'charge', 'suction', 'chain', 'patrol', 'cable', 'charge', 'suction', 'chain'],
  3: [
    'lightsout',
    'stomp',
    'charge',
    'patrol',
    'swarm',
    'chain',
    'suction',
    'lightsout',
    'stomp',
    'chain',
    'cable',
    'charge'
  ]
});
export const TITAN_CHAINS = Object.freeze({
  1: [['cable', 'charge']],
  2: [
    ['charge', 'recharge'],
    ['cable', 'charge']
  ],
  3: [
    ['stomp', 'charge', 'recharge'],
    ['cable', 'charge', 'recharge'],
    ['charge', 'recharge']
  ]
});

// Fallback transforms deliberately compose in Assets.model. This consumer has
// an authored physical height, so normalize the returned independent clone.
export function normalizeTitanModel(model) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model),
    size = box.getSize(new THREE.Vector3());
  if (!(size.x > 0 && size.y > 0 && size.z > 0)) return null;
  model.scale.multiply(new THREE.Vector3(6 / size.x, 1.8 / size.y, 6 / size.z));
  model.updateMatrixWorld(true);
  box.setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;
  model.updateMatrixWorld(true);
  box.setFromObject(model);
  return Math.max(Math.abs(box.min.x), Math.abs(box.max.x));
}

export class TitanVacuum extends Vacuum {
  // Summons are rebuilt by the attack, never by a level checkpoint's generic
  // Enemy.reset loop (including ones retired in an earlier phase).
  reset() {
    this.dead = true;
    this.visible = false;
    this.interactive = false;
    this.obj.visible = false;
  }
  behave(dt) {
    this.chaseBody ||= {
      pos: this.pos,
      vel: new THREE.Vector3(),
      hw: 0.55,
      hd: 0.55,
      h: 0.7,
      grounded: false
    };
    const b = this.chaseBody,
      d = this.player.pos.clone().sub(this.pos);
    d.y = 0;
    if (d.lengthSq() > 0.01) d.normalize();
    b.vel.set(d.x * this.speed, -2, d.z * this.speed);
    moveBody(this.stage.world, b, dt);
    this.facing = Math.atan2(d.x, d.z);
    this.brush.rotation.y += dt * 20;
  }
}

export class RoombaTitan extends Boss {
  constructor(stage, x = 0, y = 0, z = -6) {
    super(stage, x, y, z, { name: 'ROOMBA TITAN', portrait: 'portrait_titan', key: 'titan' });
    this.ground = 0;
    this.home.set(0, 0, -6);
    this.pos.copy(this.home);
    this.R = 3;
    this.rig = new THREE.Group();
    this.obj.add(this.rig);
    this.buildModel();
    this.setBox(2 * (this.R + 0.2), 1.8, 2 * (this.R + 0.2));
    this.arena = stage.titanArena;
    this.stageScale = [1, 1, 1.08, 1.16];
    this.stageColors = [0, 0, 0x40e0ff, 0xff3a2a];
    this.stageGlow = { 2: 0x001218, 3: 0x200404 };
    this.stageNames = { 2: 'DEEP CLEAN', 3: 'OVERHEAT PROTOCOL' };
    this.stagePowers = TITAN_STAGE_POWERS;
    this.acceptsBark = true;
    this.CHAINS = TITAN_CHAINS;
    this.plan = [];
    this.minions = [];
    this.chargeDir = new THREE.Vector3();
    this.laneAim = new THREE.Vector3();
    this.lane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0xffedc6,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
        fog: false
      })
    );
    this.lane.position.y = 0.035;
    this.lane.visible = false;
    stage.scene.add(this.lane);
    this.stars = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16),
        new THREE.MeshBasicMaterial({ color: 0xffe77a, fog: false })
      );
      s.position.set(Math.cos((i * Math.PI) / 3), 2.4, Math.sin((i * Math.PI) / 3));
      this.stars.add(s);
    }
    this.obj.add(this.stars);
    this.stars.visible = false;
    this.collectMeshes();
    this.setStageLook(1);
  }
  buildModel() {
    const add = (geo, color, x, y, z, parent = this.rig) => {
      const m = new THREE.Mesh(geo, toon(color));
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };
    this.fb = new THREE.Group();
    this.rig.add(this.fb);
    add(new THREE.CylinderGeometry(3, 3, 1.6, 36), 0x3a3d44, 0, 0.8, 0, this.fb);
    add(new THREE.CylinderGeometry(2.4, 2.4, 0.2, 36), 0x64666d, 0, 1.7, 0, this.fb);
    const model = Assets.model('model_roomba_titan', 1.8);
    if (model) {
      const radius = normalizeTitanModel(model);
      if (radius) {
        this.R = radius;
        this.fb.visible = false;
        this.rig.add(model);
        this.glb = model;
      }
    }
    this.bumper = add(new THREE.TorusGeometry(3.05, 0.18, 8, 32, Math.PI), 0x222222, 0, 0.4, 0);
    this.bumper.rotation.x = Math.PI / 2;
    this.brushes = [];
    for (const x of [-2.2, 2.2]) {
      const g = new THREE.Group();
      g.position.set(x, 0.1, 2);
      for (let i = 0; i < 3; i++) {
        const m = add(new THREE.BoxGeometry(0.9, 0.05, 0.12), 0xe1b751, 0, 0, 0, g);
        m.rotation.y = (i * Math.PI) / 3;
      }
      this.rig.add(g);
      this.brushes.push(g);
    }
    this.button = add(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 20), 0xe62c3a, 0, 1.65, 0);
    this.button.material.emissive.setHex(0x550000);
    this.ledRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.06, 6, 64).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x40e0ff, fog: false })
    );
    this.ledRing.position.y = 1.62;
    this.rig.add(this.ledRing);
    this.dustBag = add(new THREE.SphereGeometry(0.9, 16, 12), 0x8b8990, 0, 1, -2.3);
  }
  makeStageParts() {
    const two = [this.dustBag],
      three = [];
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), toon(0x777788));
    antenna.position.set(0.8, 2, 0);
    this.rig.add(antenna);
    two.push(antenna);
    for (const x of [-1.1, 1.1]) {
      const vent = glowPart(0x9ad8ff, 0.4);
      vent.position.set(x, 0.8, 2.5);
      this.rig.add(vent);
      two.push(vent);
      const flame = flamePart(0xff6a2a, 0.7, 1.4);
      flame.position.set(x, 0.6, -2.5);
      this.rig.add(flame);
      three.push(flame);
    }
    for (let i = 0; i < 12; i++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.25, 0.12),
        toon(i % 2 ? 0xffce45 : 0x16151a)
      );
      const a = (i * Math.PI) / 6;
      stripe.position.set(Math.sin(a) * 2.8, 1.3, Math.cos(a) * 2.8);
      stripe.rotation.y = a;
      this.rig.add(stripe);
      three.push(stripe);
    }
    const crack = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.07).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x15151a })
    );
    crack.position.set(0.8, 1.81, 0.3);
    crack.rotation.y = 0.65;
    this.rig.add(crack);
    three.push(crack);
    return { 2: two, 3: three };
  }
  setStageLook(n) {
    super.setStageLook(n);
    this.setBox(
      2 * (this.R * this.stageScale[n] + 0.2),
      1.8 * this.stageScale[n],
      2 * (this.R * this.stageScale[n] + 0.2)
    );
  }
  get radius() {
    return this.R * this.stageScale[this.phase];
  }
  intro() {
    this.pos.set(0, 0, -16);
    this.introT = 0;
    this.scan ||= new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.025, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xff3040, fog: false })
    );
    this.stage.scene.add(this.scan);
    this.scan.visible = true;
    audio.play('whirr', 0.65);
    return new Promise((resolve) => {
      this.introResolve = resolve;
    });
  }
  start() {
    this.active = true;
    this.beginPhase();
  }
  beginPhase() {
    this.killMinions();
    this.plan = [];
    this.arena?.setPhase(this.phase);
    this.nextAction();
  }
  nextAction() {
    if (!this.plan.length) this.plan = TITAN_PLANS[this.phase].slice();
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
  beginAttack(s) {
    this.setState(s);
    this.vulnerable = false;
    this.lane.visible = false;
    this.lane.material.color.setHex(0xffedc6);
    this.did = false;
    this.shots = 0;
    this.bounces = 0;
    this.locked = false;
    this.attackT = 0;
    this.tell =
      s === 'charge'
        ? this.tele(1)
        : s === 'recharge'
          ? 0.2 + this.tele(0.6)
          : s === 'cable'
            ? this.tele(0.9)
            : s === 'suction'
              ? this.tele(0.7)
              : s === 'stomp'
                ? this.tele(1)
                : 0;
    this.approaching = s === 'cable' || s === 'ultimate';
    if (s === 'charge' || s === 'recharge') {
      this._laneThrough(this.player.pos);
      this.waitStock = this.phase >= 3 && !this.arena?.stocked;
      audio.play('whirr');
    }
    if (s === 'ultimate') {
      this.beginUlt();
      this.debrisT = 0;
    }
    if (s === 'stomp') {
      this.legTargets = Array.from(
        { length: 3 },
        (_, i) =>
          new THREE.Vector3(
            THREE.MathUtils.clamp(this.player.pos.x + (i - 1) * 2.8, -11.8, 11.8),
            0,
            THREE.MathUtils.clamp(this.player.pos.z, -11.8, 11.8)
          )
      );
      audio.play('roll', 0.7);
    }
    if (s === 'swarm') audio.play('beep');
  }
  afterAttack() {
    this.nextAction();
  }
  _laneThrough(p) {
    this.laneAim.copy(p);
    this.chargeDir.set(p.x - this.pos.x, 0, p.z - this.pos.z);
    if (this.chargeDir.lengthSq() < 0.001) this.chargeDir.set(0, 0, 1);
    this.chargeDir.normalize();
    this.showLane();
  }
  showLane() {
    const r = this.arena?.wallR ?? 13,
      d = this.chargeDir;
    const tx = d.x > 0 ? (r - this.pos.x) / d.x : d.x < 0 ? (-r - this.pos.x) / d.x : Infinity;
    const tz = d.z > 0 ? (r - this.pos.z) / d.z : d.z < 0 ? (-r - this.pos.z) / d.z : Infinity;
    const length = Math.max(0, Math.min(tx, tz));
    this.lane.scale.set(2 * this.radius, 1, length);
    this.lane.rotation.y = Math.atan2(d.x, d.z);
    this.lane.position.set(this.pos.x + (d.x * length) / 2, 0.035, this.pos.z + (d.z * length) / 2);
    this.lane.visible = true;
  }
  stun(duration = this.W) {
    this.cancelUlt();
    this.lane.visible = false;
    this.setState('stunned');
    this.vulnerable = true;
    this.stunFor = duration;
    this.stars.visible = true;
    audio.play('bonk');
    this.fx.sparkle(this.pos.x, 1.8, this.pos.z, { count: 12, color: 0xfff19a });
  }
  _wallHit() {
    const r = (this.arena?.wallR ?? 13) - this.radius;
    const hitX = Math.abs(this.pos.x) >= r,
      hitZ = Math.abs(this.pos.z) >= r;
    if (!hitX && !hitZ) return false;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, -r, r);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, -r, r);
    this.pos.addScaledVector(this.chargeDir, -0.6);
    this.bumperT = 0.2;
    this.game.camera.shake(0.5, 0.25);
    audio.play('bonk');
    if (this.phase < 3) {
      if (this.chainQ?.[0] === 'recharge') {
        this.endAttack();
      } else this.stun();
    } else {
      this.bounces++;
      if (this.bounces >= 3) {
        this.lane.visible = false;
        this.endAttack();
      } else {
        if (hitX) this.chargeDir.x *= -1;
        if (hitZ) this.chargeDir.z *= -1;
        this.showLane();
      }
    }
    return true;
  }
  moveCharge(dt) {
    const distance = 16 * this.sp * dt,
      steps = Math.max(1, Math.ceil(distance / 0.15));
    for (let i = 0; i < steps; i++) {
      this.pos.addScaledVector(this.chargeDir, distance / steps);
      for (const e of [...(this.arena?.pillars ?? []), ...(this.arena?.legs ?? [])])
        if (
          e.solid.enabled &&
          Math.hypot(
            Math.max(0, Math.abs(this.pos.x - e.pos.x) - 0.6),
            Math.max(0, Math.abs(this.pos.z - e.pos.z) - 0.6)
          ) < this.radius
        ) {
          this.pos.addScaledVector(this.chargeDir, -0.6);
          this.stun();
          return;
        }
      if (this.phase >= 3)
        for (const { cat } of this.arena?.tntSpots ?? [])
          if (!cat.dead && this.pos.distanceTo(cat.pos) < this.radius + 0.5) {
            cat.pounce();
            this.stun();
            return;
          }
      if (this._wallHit()) return;
    }
  }
  spawnSwarm(count = 3) {
    this.minions = this.minions.filter((m) => !m.dead);
    for (let i = 0; i < count && this.minions.length < 3; i++) {
      const a = (this.minions.length / 3) * Math.PI * 2;
      const m = this.stage.add(
        new TitanVacuum(
          this.stage,
          this.pos.x + Math.cos(a) * (this.radius + 1),
          0,
          this.pos.z + Math.sin(a) * (this.radius + 1),
          { chase: true, speed: 3.2 * (this.phase === 3 ? 1.2 : 1) }
        )
      );
      m.alwaysActive = true;
      this.minions.push(m);
    }
  }
  ai(dt) {
    const p = this.player;
    this.attackT += dt;
    this.stars.visible = this.state === 'stunned';
    this.button.material.emissive.setHex(this.vulnerable ? 0xff5050 : 0x550000);
    this.button.scale.setScalar(this.vulnerable ? 1 + Math.sin(this.stateT * 16) * 0.1 : 1);
    if (this.bumperT > 0) this.bumperT = Math.max(0, this.bumperT - dt);
    this.bumper.scale.z = this.bumperT > 0 ? 0.8 : 1;
    const s = this.state,
      t = this.stateT;
    this.ledRing.material.color.setHex(
      s === 'charge' || s === 'recharge' ? (t < this.tell ? 0xffbc45 : 0xff3030) : 0x40e0ff
    );
    if (this.approaching) {
      const target = s === 'cable' ? new THREE.Vector3(0, 0, -9) : new THREE.Vector3(),
        delta = target.sub(this.pos),
        distance = delta.length(),
        travel = 4 * this.sp * dt;
      if (distance > travel) {
        this.pos.addScaledVector(delta, travel / distance);
        this.stateT = 0;
        return;
      }
      this.pos.add(delta);
      this.approaching = false;
      this.stateT = 0;
      return;
    }
    if (s === 'stunned') {
      if (t >= this.stunFor) {
        this.vulnerable = false;
        this.nextAction();
      }
      return;
    }
    if (s === 'patrol') {
      this.patrolAngle = (this.patrolAngle || 0) + dt * 1.2;
      const a = this.patrolAngle,
        target = new THREE.Vector3(Math.sin(a) * 4, 0, -3 + Math.sin(a * 2) * 2),
        delta = target.sub(this.pos),
        distance = delta.length();
      if (distance > 0) this.pos.addScaledVector(delta, Math.min(1, (4 * this.sp * dt) / distance));
      for (const b of this.brushes) b.rotation.y += dt * 30;
      const d = this.distToPlayer();
      if (d >= this.radius && d < this.radius + 0.8 && p.pos.y < 0.5) p.hurt('angel', this.pos.x, this.pos.z);
      if (t >= 1.4 / this.sp) this.endAttack();
    } else if (s === 'charge' || s === 'recharge') {
      if (this.waitStock) {
        if (!this.arena.stocked) {
          this.stateT = 0;
          this.lane.visible = false;
          return;
        }
        this.waitStock = false;
        this.stateT = 0;
        this._laneThrough(p.pos);
        return;
      }
      if (t < this.tell) {
        if (t < this.tell - 0.3) this._laneThrough(p.pos);
        this.showLane();
      } else {
        this.moveCharge(dt);
        for (const b of this.brushes) b.rotation.y += dt * 30;
      }
    } else if (s === 'cable') {
      // Radius-three disc plugs its rear into the z=-12 socket after reversing there.
      if (t < this.tell) {
        this.lane.position.set(Math.sin(-Math.PI / 3) * 7, 0.035, -12 + Math.cos(-Math.PI / 3) * 7);
        this.lane.rotation.y = -Math.PI / 3;
        this.lane.scale.set(0.5, 1, 14);
        this.lane.material.color.setHex(0xffdc55);
        this.lane.visible = true;
      } else if (!this.did) {
        this.did = true;
        this.lane.visible = false;
        const life = (2 * Math.PI) / 3 / (1.6 * this.sp);
        this.proj.cableArc(
          this.arena?.socket ?? new THREE.Vector3(0, 0, -12),
          14,
          -Math.PI / 3,
          Math.PI / 3,
          0.5,
          { life }
        );
        this.cableLife = life;
        audio.play('zip');
      }
      if (this.did && this.phase >= 3 && !this.backCable && t >= this.tell + this.cableLife) {
        this.backCable = true;
        this.proj.cableArc(this.arena.socket, 14, Math.PI / 3, -Math.PI / 3, 0.5, { life: this.cableLife });
      }
      if (this.did && t >= this.tell + this.cableLife * (this.phase >= 3 ? 2 : 1)) {
        this.backCable = false;
        this.endAttack();
      }
    } else if (s === 'swarm') {
      if (this.shots < 3 && t >= this.shots * 0.18) {
        this.shots++;
        audio.play('beep');
      }
      this.button.position.y = 1.65 + (t < 0.6 ? 0.2 : 0);
      if (t >= 0.6) {
        this.spawnSwarm();
        this.button.position.y = 1.65;
        this.endAttack();
      }
    } else if (s === 'suction') {
      this.dustBag.scale.setScalar(t < this.tell ? 0.7 : 1 + Math.min(1, (t - this.tell) / 2.6) * 0.3);
      if (t >= this.tell) {
        const d = pullToward(this, 2.8 + 0.5 * this.phase, dt);
        if (d < this.radius + 0.4 && p.pos.y < 2) p.hurt('puff', this.pos.x, this.pos.z);
      }
      if (t >= this.tell + 2.6) this.endAttack();
    } else if (s === 'stomp') {
      while (this.shots < 3 && t >= this.shots * 0.4) {
        const target = this.legTargets[this.shots++];
        this.proj.falling(target.x, target.z, {
          kind: 'leg',
          r: 1.2,
          delay: this.tell,
          onLand: () => {
            if (this.active && !this.defeated && this.phase === 3) this.arena.addLeg(target.x, target.z);
          }
        });
      }
      if (t >= this.tell + 0.8 + 0.5) this.endAttack();
    } else if (s === 'lightsout') {
      this.ledRing.material.color.setHex(Math.floor(t * 6) % 2 ? 0xffffff : 0x40e0ff);
      if (t >= 1) {
        this.arena?.darken();
        this.fx.smokeCard(this.pos.x, 1, this.pos.z, { size: 5, life: 1, color: 0x777777 });
        this.endAttack();
      }
    } else if (s === 'ultimate') {
      if (t < 1.6) {
        this.powerUp(dt, t / 1.6, 0x40e0ff, 1, 0);
        this.ledRing.material.color.setHSL((t * 2) % 1, 1, 0.7);
      } else if (t < 7.6) {
        const u = t - 1.6;
        this.arena?.setWalls(13 - 3.25 * Math.min(1, u / 1.5));
        this.rig.rotation.y += dt * 8;
        this.debrisT -= dt;
        if (this.debrisT <= 0) {
          this.debrisT += 0.12;
          for (let i = 0; i < this.phase + 1; i++) {
            const a = u * 2 + (i * Math.PI * 2) / (this.phase + 1);
            this.proj.debris(
              new THREE.Vector3(0, 0.5, 0),
              new THREE.Vector3(Math.sin(a), 0, Math.cos(a)),
              7 * this.sp
            );
          }
        }
        if (!this.did) {
          this.did = true;
          if (this.phase >= 2) this.spawnSwarm(1);
          if (this.phase >= 3) this.arena.darken();
        }
      } else if (t < 8.6) this.arena?.setWalls(9.75 + 3.25 * (t - 7.6));
      else {
        this.arena?.setWalls(13);
        this.endUlt();
        this.stun(this.W + 1);
      }
    }
    if (s === 'patrol' || s === 'suction') {
      const want = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      const difference = want - this.rig.rotation.y;
      this.rig.rotation.y += Math.atan2(Math.sin(difference), Math.cos(difference)) * Math.min(1, dt * 6);
    } else if (s !== 'ultimate')
      this.rig.rotation.y = s === 'cable' ? 0 : Math.atan2(this.chargeDir.x, this.chargeDir.z);
  }
  onStomp(p) {
    const top = this.pos.y + 1.8 * this.stageScale[this.phase];
    if (
      p.pos.y < top - 0.5 ||
      Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) > 0.55 * this.stageScale[this.phase] + 0.3
    ) {
      this.onTouch(p);
      return;
    }
    if (this.vulnerable && p.mode === 'flop') {
      this.damage(p);
      return;
    }
    p.bounce(TUNING.STOMP_BOUNCE);
    audio.play('clang');
    if (!this.flopHint) {
      this.flopHint = true;
      this.game.ui.banner(TITAN_FLOP_HINT, '', 2);
    }
  }
  onTouch(p) {
    if (!this.active || this.defeated || p.dead || this.vulnerable) return;
    if (p.bossFling?.source === this) return;
    const dx = p.pos.x - this.pos.x,
      dz = p.pos.z - this.pos.z,
      d = Math.hypot(dx, dz);
    if (p.pos.y >= 1.4 * this.stageScale[this.phase]) {
      startBossFling(p, this, 8);
      return;
    }
    if (
      d < this.radius + (this.state === 'ultimate' ? 0.3 : 0.2) &&
      p.pos.y < 1.8 * this.stageScale[this.phase] &&
      !this.vulnerable
    )
      p.hurt(
        this.state === 'ultimate' ||
          ((this.state === 'charge' || this.state === 'recharge') && this.stateT >= this.tell)
          ? 'flat'
          : 'angel',
        this.pos.x,
        this.pos.z
      );
  }
  onBite() {
    audio.play('clang');
  }
  onSlide() {
    audio.play('clang');
  }
  onBark() {
    if (this.phase >= 2 && this.state === 'suction' && this.stateT >= this.tell) this.stun(0.8);
  }
  onExplosion(source) {
    if (source?.titanTNT && this.phase >= 3 && (this.state === 'charge' || this.state === 'recharge'))
      this.stun();
  }
  onHit() {
    this.lane.visible = false;
    if (!this.defeated) this.stun(0.5);
  }
  onResetPhase() {
    if (this.player.bossFling?.source === this) this.player.bossFling = null;
    this.pos.copy(this.home);
    this.plan = [];
    this.lane.visible = false;
    this.stars.visible = false;
    this.backCable = false;
    this.killMinions();
    this.arena?.setPhase(this.phase);
    this.setState('patrol');
  }
  idleAnim(dt) {
    for (const b of this.brushes) b.rotation.y += dt * 5;
    if (this.introResolve) {
      this.introT = Math.min(2, this.introT + dt);
      this.pos.z = -16 + 5 * this.introT;
      this.scan.position.set(0, 0.7, -12 + this.introT * 12);
      if (this.introT >= 2) {
        this.scan.visible = false;
        const resolve = this.introResolve;
        this.introResolve = null;
        audio.play('bossRoar', 0.6);
        resolve();
      }
    }
  }
  killMinions() {
    for (const m of this.minions) {
      m.dead = true;
      m.visible = false;
      m.obj.visible = false;
    }
    this.minions = [];
  }
  defeatAnim(dt) {
    this.defeatT = (this.defeatT || 0) + dt;
    if (!this.defeatProps) {
      this.killMinions();
      this.lane.visible = false;
      this.ledRing.visible = false;
      this.defeatLEDs = [];
      for (let i = 0; i < 16; i++) {
        const led = new THREE.Mesh(
          new THREE.TorusGeometry(2.5, 0.06, 6, 8, Math.PI / 8).rotateX(Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: 0x40e0ff, transparent: true, fog: false })
        );
        led.position.y = 1.62;
        led.rotation.y = (i * Math.PI) / 8;
        this.rig.add(led);
        this.defeatLEDs.push(led);
      }
      this.defeatProps = [];
      for (let i = 0; i < 10; i++) {
        const mesh = new THREE.Mesh(
          i % 2 ? new THREE.ConeGeometry(0.24, 0.5, 10) : new THREE.TorusGeometry(0.22, 0.055, 6, 14),
          toon(i % 2 ? 0xf29a4c : 0x65c6c0)
        );
        mesh.position.set(this.pos.x, 2.2, this.pos.z);
        this.stage.scene.add(mesh);
        const angle = (i * Math.PI) / 5;
        this.defeatProps.push({
          mesh,
          vx: Math.cos(angle) * (2 + (i % 3)),
          vz: Math.sin(angle) * (2 + (i % 3)),
          vy: 4 + (i % 4)
        });
      }
      this.fx.burst(this.pos.x, 1.3, this.pos.z - 2, {
        count: 45,
        colors: [0x999999, 0xcccccc, 0xeeeeee],
        speed: 7
      });
    }
    this.arena?.restoreLights();
    this.rig.rotation.y += dt * 10;
    this.dustBag.scale.setScalar(Math.max(0.1, 1 - this.defeatT * 0.8));
    this.defeatLEDs.forEach((led, i) => {
      led.material.opacity = THREE.MathUtils.clamp(1 - (this.defeatT - i * 0.09) / 0.25, 0, 1);
    });
    for (const prop of this.defeatProps) {
      if (prop.mesh.position.y > 0.2) {
        prop.vy -= dt * 12;
        prop.mesh.position.x += prop.vx * dt;
        prop.mesh.position.z += prop.vz * dt;
        prop.mesh.position.y = Math.max(0.2, prop.mesh.position.y + prop.vy * dt);
        prop.mesh.rotation.x += dt * 8;
        prop.mesh.rotation.z += dt * 4;
      }
    }
    if (Math.random() < dt * 12)
      this.fx.smokeCard(this.pos.x, 1, this.pos.z, {
        size: 1.5,
        life: 1,
        colors: [0x999999, 0xdddddd],
        vy: 3
      });
  }
}
