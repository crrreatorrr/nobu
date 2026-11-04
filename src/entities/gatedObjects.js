import * as THREE from 'three';
import { Entity } from './entity.js';
import { Snacks } from './breakables.js';
import { StaticPlatform } from './props.js';
import { Solid } from '../world/physics.js';
import { toon } from '../player/nobuPrims.js';
import { audio } from '../audio/audio.js';
import { updraft } from './updraft.js';
import { canvasTex } from '../core/util.js';

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const dotGeo = new THREE.SphereGeometry(0.09, 6, 4);
const moonMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8, fog: false });
const ventMat = toon(0x3a2e4a), ventBarsMat = toon(0x8a7aa8);
const shutterMat = toon(0xffd23f);
const dustExplosion = { volume: 0.6 };
const boxEdges = new THREE.EdgesGeometry(boxGeo);
let fuzz, fuzzMat;
function fuzzMaterial() {
  if (fuzzMat) return fuzzMat;
  if (!fuzz) {
    fuzz = canvasTex(64, 64, (ctx) => {
      ctx.fillStyle = '#8a8a90'; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#b0b0c0';
      for (let i = 0; i < 200; i++) ctx.fillRect((i * 17) % 64, (i * 31) % 64, 2, 1);
    });
  }
  return (fuzzMat = new THREE.MeshLambertMaterial({ map: fuzz }));
}
function mesh(w, h, d, material, y = h / 2) {
  const m = new THREE.Mesh(boxGeo, material); m.scale.set(w, h, d); m.position.y = y; return m;
}
function solid(stage, pos, w, h, d, yaw, ref, kind = 'static') {
  const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
  const hx = (w * c + d * s) / 2, hz = (w * s + d * c) / 2;
  return stage.world.add(new Solid({ x: pos.x - hx, y: pos.y, z: pos.z - hz }, { x: pos.x + hx, y: pos.y + h, z: pos.z + hz }, { kind, ref }));
}
export class DustWall extends Entity {
  constructor(stage, x, y, z, { w = 3, h = 2.6, yaw = 0, gatedBox = null } = {}) {
    super(stage, x, y, z); this.kind = 'dustwall'; this.countable = false;
    this.gatedBox = gatedBox; this.broken = false; this.t = 0; this.moteT = 0; this.bonkT = 0;
    this.obj.rotation.y = yaw; this.obj.add(mesh(w, h, 0.9, fuzzMaterial()));
    this.outline = new THREE.LineSegments(boxEdges, new THREE.LineBasicMaterial({ color: 0xb0b0c0, transparent: true }));
    this.outline.scale.set(w + 0.03, h + 0.03, 0.93); this.outline.position.y = h / 2; this.obj.add(this.outline);
    this.solid = solid(stage, this.pos, w, h, 0.9, yaw, this);
    // Physics resolves a blocking face before interactions; include its contact epsilon.
    this.box = { min: { ...this.solid.min }, max: { ...this.solid.max } };
    this.box.min.x -= 0.04; this.box.min.z -= 0.04; this.box.max.x += 0.04; this.box.max.z += 0.04;
  }
  contact(p = this.player, allowDash = true) {
    if (this.broken) return;
    if (allowDash && p.dustDashing && p.abilities.dust) {
      this.broken = true; this.solid.enabled = false; this.visible = false; this.obj.visible = false;
      this.fx.burst(this.pos.x, this.pos.y + 1.3, this.pos.z, { count: 24, colors: [0x8a8a90, 0xb0b0c0], speed: 4 });
      this.game.camera.shake(0.25, 0.25); audio.play('explosion', 1, dustExplosion);
    } else if (this.bonkT <= 0) {
      this.bonkT = 0.35; this.fx.puff(this.pos.x, this.pos.y + 1, this.pos.z, { count: 3, color: 0x8a8a90 });
      audio.play('bonk'); this.game.ui.tutorial(p.abilities.dust ? 'dustwallUnlocked' : 'dustwall');
    }
  }
  onTouch(p) { this.contact(p); }
  onBite(p) { this.contact(p, false); }
  onSlide(p) { this.contact(p, false); }
  onFlop(p) { this.contact(p, false); }
  onStomp(p) { this.contact(p, false); }
  onBark() { this.contact(this.player, false); }
  update(dt) {
    if (this.broken) return;
    const p = this.player, b = this.box;
    if (p.dustDashing && p.pos.x + 0.36 >= b.min.x && p.pos.x - 0.36 <= b.max.x && p.pos.z + 0.36 >= b.min.z && p.pos.z - 0.36 <= b.max.z && p.pos.y < b.max.y && p.pos.y + (p.body.h ?? 1.6) > b.min.y) this.contact(p);
    if (this.broken) return;
    this.t += dt; this.bonkT -= dt; this.moteT -= dt;
    if (!this.player.abilities.dust && this.distToPlayer() < 4) this.game.ui.tutorial('dustwall');
    this.outline.material.opacity = 0.45 + Math.sin(this.t * Math.PI) * 0.25;
    if (this.distToPlayer() < 20 && this.moteT <= 0) {
      this.moteT = 0.5; this.fx.dust(this.pos.x, this.pos.y + 1, this.pos.z, { count: 6, color: 0xb0b0c0, speed: 0.2, life: 1.5 });
    }
  }
  onRespawn() {} // Explicit helper contract: broken for the entire attempt.
}

export class MoonLedge extends StaticPlatform {
  constructor(stage, x, y, z, { w = 2.4, dd = 2.4, yaw = 0, gatedBox = null } = {}) {
    super(stage, x, y, z, { w, d: dd, h: 0.5, yaw, tint: 0xdfe8ff });
    this.kind = 'moonledge'; this.gatedBox = gatedBox; this.t = 0;
    this.dots = new THREE.Group(); this.obj.add(this.dots);
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(dotGeo, moonMat); const a = i * Math.PI / 3; m.position.set(Math.cos(a) * 0.8, 0.45, Math.sin(a) * 0.8); this.dots.add(m); }
  }
  update(dt) { this.t += dt; this.dots.rotation.y = this.t * 0.4; }
  onRespawn() {}
}

const smokeGeo = new THREE.PlaneGeometry(1.8, 1.1);
let smokeMap;
export class SmogVent extends Entity {
  constructor(stage, x, y, z, { lift = 6, yaw = 0, gatedBox = null } = {}) {
    super(stage, x, y, z); this.kind = 'smogvent'; this.countable = false; this.lift = lift;
    this.gatedBox = gatedBox; this.cleared = false; this.clearT = 0; this.t = 0;
    this.obj.rotation.y = yaw; this.obj.add(mesh(1.54, 0.112, 1.54, ventMat));
    for (let i = -2; i <= 2; i++) { const bar = mesh(0.084, 0.084, 1.33, ventBarsMat, 0.14); bar.position.x = i * 0.28; this.obj.add(bar); }
    this.smoke = new THREE.Group(); this.obj.add(this.smoke);
    smokeMap ||= canvasTex(64, 64, (ctx) => {
      ctx.fillStyle = '#ffffff';
      for (const [cx, cy, r] of [[20, 34, 18], [36, 24, 20], [46, 39, 16]]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
    });
    this.smokeMat = new THREE.MeshBasicMaterial({ map: smokeMap, color: 0x7a4a9a, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
    for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(smokeGeo, this.smokeMat); m.position.y = 0.5 + i * 0.3; m.rotation.y = i * 1.7; this.smoke.add(m); }
    this.setBox(1.54, 3.4, 1.54);
  }
  onTouch() { if (!this.cleared) this.game.ui.tutorial(this.player.abilities.bark ? 'smogvent' : 'smogventLocked'); }
  onBark() {
    if (this.cleared || !this.player.abilities.bark || this.distToPlayer() > 6) return;
    this.cleared = true; this.clearT = 0.6; audio.play('whoosh');
  }
  update(dt) {
    this.t += dt;
    if (!this.cleared && !this.player.abilities.bark && this.distToPlayer() < 4) this.game.ui.tutorial('smogventLocked');
    if (!this.cleared) this.smoke.rotation.y = this.t * 0.3;
    else if (this.clearT > 0) {
      this.clearT = Math.max(0, this.clearT - dt); this.smoke.scale.setScalar(1 + (0.6 - this.clearT) * 2);
      this.smokeMat.opacity = 0.7 * this.clearT / 0.6;
      if (!this.clearT) this.smoke.visible = false;
    } else updraft(this.player, dt, this.pos, this.lift, 30);
  }
  onRespawn() {} // Explicit helper contract: cleared for the entire attempt.
}

export class ZoomieGate extends Entity {
  constructor(stage, x, y, z, { yaw = 0, platePos, plateD, u = 0, open = 2.5, gatedBox = null } = {}) {
    super(stage, x, y, z); this.kind = 'zoomiegate'; this.gatedBox = gatedBox;
    this.openDuration = open; this.plateD = plateD; this.u = u; this.timer = 0; this.raise = 0; this.tickT = 0; this.previousS = this.player.body.s;
    this.obj.rotation.y = yaw; this.shutter = new THREE.Group(); this.shutter.position.y = 1.3;
    this.shutter.add(mesh(2.2, 2.6, 0.3, shutterMat, 0)); this.obj.add(this.shutter);
    const black = toon(0x22222a);
    for (let i = 0; i < 5; i++) { const stripe = mesh(2.2, 0.15, 0.32, black, 0.3 + i * 0.5); this.shutter.add(stripe); stripe.position.y -= 1.3; }
    this.plate = mesh(1.6, 0.06, 1.6, toon(this.player.abilities.zoom ? 0xffd23f : 0xff9a32), 0);
    this.plate.position.copy(platePos).sub(this.pos); this.plate.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw); this.obj.add(this.plate);
    for (let i = 0; i < 4; i++) { const toe = new THREE.Mesh(dotGeo, black); toe.position.set((i - 1.5) * 0.22, 0.07, -0.18 + Math.abs(i - 1.5) * 0.05); this.plate.add(toe); }
    const paw = mesh(0.5, 0.02, 0.45, black, 0.05); this.plate.add(paw);
    this.solid = solid(stage, this.pos, 2.2, 2.6, 0.3, yaw, this, 'moving'); this.interactive = false;
  }
  update(dt) {
    const p = this.player, s = p.body.s;
    if (!p.abilities.zoom && this.distToPlayer() < 4) this.game.ui.tutorial('zoomiegate');
    if (!p.dead && this.previousS < this.plateD && s >= this.plateD && Math.abs(p.body.u - this.u) < 1) {
      this.timer = p.abilities.zoom ? this.openDuration : 0.4; this.tickT = 0.5; audio.play('switch');
    }
    this.previousS = s;
    if (this.timer > 0) { this.timer = Math.max(0, this.timer - dt); this.tickT -= dt; if (this.tickT <= 0) { audio.play('tick'); this.tickT = this.timer < 1 ? 0.2 : 0.5; } }
    const wanted = this.timer > 0 ? 2.6 : 0;
    const old = this.raise;
    // Keep the returning shutter away from an overlapping player.
    const occupied = Math.abs(p.pos.x - this.pos.x) < 1.5 && Math.abs(p.pos.z - this.pos.z) < 1.5 && p.pos.y < this.pos.y + 2.6 && p.pos.y > this.pos.y - 1;
    if (wanted > this.raise || !occupied) this.raise = wanted > this.raise ? Math.min(wanted, this.raise + dt * 2.6 / 0.15) : Math.max(wanted, this.raise - dt * 2.6 / 0.12);
    this.shutter.position.y = 1.3 + this.raise;
    this.solid.setCenter(this.pos.x, this.pos.y + this.raise + 1.3, this.pos.z);
    if (old > 0 && this.raise === 0) audio.play('clang');
  }
  onRespawn() {
    this.timer = 0; this.raise = 0; this.shutter.position.y = 1.3;
    this.solid.setCenter(this.pos.x, this.pos.y + 1.3, this.pos.z);
    // Session calls entity hooks before moving the player back to the checkpoint.
    const cp = this.session.cp?.pos, track = this.stage.track;
    this.previousS = cp && track ? track.project(cp.x, cp.z).s : this.player.body.s;
  }
}

export class PitySnacks extends Snacks {
  constructor(...args) { super(...args); this.kind = 'pitysnacks'; this.countable = false; this.armed = false; this.interactive = false; this.visible = false; this.obj.visible = false; this.drop = 0; }
  arm() {
    const s = this.session;
    if (this.armed || s.trial || s.remix || s.medal || s.bossMedal || s.rush) return false;
    this.armed = true; this.visible = true; this.obj.visible = true; this.interactive = true; this.drop = 2; this.obj.position.y = this.pos.y + 2;
    this.fx.burst(this.pos.x, this.pos.y, this.pos.z, { count: 18, colors: [0xffffff, 0xffd23f], speed: 3 }); audio.play('chime'); return true;
  }
  update(dt) { if (!this.armed) return; super.update(dt); this.drop = Math.max(0, this.drop - dt * 5); this.obj.position.y = this.pos.y + this.drop; }
  hit() { if (this.armed) super.hit(); }
  onRespawn() {}
}
