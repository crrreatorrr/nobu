// Shared pursuer motion. Legacy ChaseCat injects its original rig and retains its original lifecycle.
import * as THREE from 'three';
import { Entity } from './entity.js';
import { audio } from '../audio/audio.js';
import { damp, clamp } from '../core/util.js';
import { Assets } from '../art/assets.js';
import { toon } from '../player/nobuPrims.js';

export { chaseSpeed } from '../config/chase.js';
import { chaseSpeed } from '../config/chase.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
export function chaseDda(session) {
  return !session?.trial && !session?.remix && !session?.medalRun && !session?.rush && (session?.deathsAtCp ?? 0) >= 5 ? .92 : 1;
}
class PursuerRig {
  constructor({ model = 'giant_coconut', scale = 1, count = 1, lanes = [0] }) {
    this.root = new THREE.Group(); this.parts = []; this.gait = 0;
    let template;
    if (model === 'giant_coconut') template = new THREE.Mesh(new THREE.SphereGeometry(2.25, 10, 8), toon(0x6a4020));
    else if (model === 'smog_wall') {
      template = new THREE.Group();
      const pixels = new Uint8Array(32 * 32 * 4);
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const i = (y * 32 + x) * 4, a = Math.max(0, 1 - Math.hypot(x - 15.5, y - 15.5) / 16);
        pixels[i] = pixels[i+1] = pixels[i+2] = 255; pixels[i+3] = Math.round(a * a * 255);
      }
      const map = new THREE.DataTexture(pixels, 32, 32); map.needsUpdate = true;
      for (let i = 0; i < 14; i++) {
        const card = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: 0x6a5a7a, transparent: true, opacity: .55, depthWrite: false }));
        card.position.set((i % 5 - 2) * 1.8, 1 + Math.floor(i / 5) * 2, 0); card.scale.set(3, 3, 1); template.add(card);
      }
      for (const x of [-.9, .9]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(.18), new THREE.MeshBasicMaterial({ color: 0xff2030 })); eye.position.set(x, 3, 1); template.add(eye); }
    } else template = Assets.model(model, 1) || new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, .7, 16), new THREE.MeshStandardMaterial({ color: 0x7a8590 }));
    for (let i = 0; i < count; i++) { const p = template.userData.skinned ? cloneSkinned(template) : template.clone(true); p.scale.multiplyScalar(scale); p.position.x = lanes[i % lanes.length] ?? 0; p.userData.chaseScale = p.scale.clone(); this.parts.push(p); this.root.add(p); }
    if (model === 'giant_coconut') for (const p of this.parts) p.position.y = 2.25 * scale;
    this.wheels = [];
    this.root.traverse(p => { if (/wheel|brush/i.test(p.name)) this.wheels.push(p); });
    this.model = model; this.scale = scale;
  }
  pose(mode, dt, speed = 1) {
    this.gait += dt * (7.5 + 5.5 * Math.min(speed, 1.5));
    for (const wheel of this.wheels) wheel.rotation.x += dt * speed * 8;
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      if (mode === 'run' && this.model === 'giant_coconut') p.rotation.x += dt * speed * 8 / (2.25 * this.scale);
      else if (mode === 'run') p.position.y = Math.sin(this.gait + i) * .06;
    }
  }
  reset() { for (const p of this.parts) { p.rotation.set(0,0,0); p.scale.copy(p.userData.chaseScale); } }
  finish() { for (const p of this.parts) { if (this.model === 'smog_wall') p.scale.setScalar(.05); else p.rotation.z = Math.PI / 2; } }
}
const FRONT_PAWS = [[-0.8, 1.9], [0.75, 1.75]], HIND_PAWS = [[-1.05, -0.85], [1.0, -0.95]]; // root-local (x, z)
const ALL_PAWS = [...FRONT_PAWS, ...HIND_PAWS];
const REACH = 2.8, REAR = 1.4; // front paws ahead of / hind paws behind the cat's centre (m)
export class Chaser extends Entity {
  constructor(stage, track, d0, d1 = Infinity, opts = {}) {
    super(stage, 0, 0, 0);
    this.track = track;
    this.s = d0;
    this.u = 0;
    this.legacy = !!opts.legacy;
    this.d0 = d0; this.d1 = d1; this.model = opts.model; this.count = opts.count ?? 1;
    this.speed0 = opts.speed ?? 7; this.catchUp = opts.catchUp ?? 1;
    this.catchUpSpeed = this.legacy ? Infinity : (opts.catchUpSpeed ?? Infinity);
    this.catchAt = this.legacy ? 2.4 : (opts.catchAt ?? 2.4);
    this.rig = opts.rig || new PursuerRig(opts);
    this.obj.add(this.rig.root);
    this.alwaysActive = true;
    this.interactive = false;
    this.state = this.legacy ? 'wait' : 'idle';
    this.waitT = 99;
    this.speed = 0;
    this.cameraOpts = { track, height: 6.6, dist: 12.5, behind: 0.5 };
    this._g = {};
    this._v = new THREE.Vector3();
    this._reset();
    this._place();
    this.alwaysActive = this.legacy; this.visible = this.legacy;
  }
  activate(s, delay) {
    this.begin(s - 13, delay); this.alwaysActive = true; this.obj.visible = true; this.visible = true;
    this.game.camera.chaseOwner = this;
    this.game.camera.setMode('trackFront', this.cameraOpts);
    if (!this.bannerShown) { this.bannerShown = true; this.game.ui.banner('RUN!', 'Hold ↓ / S toward the camera', 2.6); }
    audio.play(this.model === 'smog_wall' ? 'suck' : 'whirr');
  }
  restoreCamera() {
    if (this.game.camera.chaseOwner !== this) return;
    this.game.camera.chaseOwner = null;
    if (this.game.camera.opts !== this.cameraOpts) return;
    const c = this.stage.defaultCamera;
    if (c) this.game.camera.setMode(c.mode, c, 0.8);
  }
  onRespawn() {
    if (this.legacy) return;
    const cp = this.session?.cp?.pos || this.session?.cp || this.player.pos;
    const s = this.track.project(cp.x, cp.z, -1, this._project ||= {}).s;
    this.bannerShown = false; this.pitT = 0; this.obj.visible = true; this.visible = true; this.rig.reset?.();
    if (s >= this.d0 && s < this.d1) this.activate(s, 1.6);
    else {
      this.state = s < this.d0 ? 'idle' : 'done'; this.alwaysActive = false; this.visible = this.state === 'done';
      this.s = this.state === 'done' ? this.d1 : this.d0; this.y = this.track.heightAt(this.s); this._place();
      if (this.state === 'done') this.rig.finish?.(); this.obj.visible = this.visible; this.restoreCamera();
    }
  }
  _reset() {
    this.uv = 0; this.heading = 0; this.lean = 0;
    this.leap = null; this.landT = 0;
    this.y = this.track.heightAt(this.s);
    this.lastStep = this._step();
  }
  // paws hit the ground twice a stride: the front pair just after "stretched", the hind pair just after "gathered"
  _step() { return Math.floor((this.rig.gait - Math.PI / 2) / Math.PI); }
  _place() {
    this.track.toWorld(this.s, this.u, 0, this.pos);
    this.pos.y = this.y;
    this.obj.position.copy(this.pos);
    this.rig.root.rotation.y = this.track.yaw(this.s) + this.heading;
    this.rig.root.rotation.z = this.lean;
  }
  begin(s, delay = 1.6) {
    // never start hovering over a pit
    while (this.model !== 'smog_wall' && this._blocked(s) && s > 0) s -= 1;
    this.s = s;
    this.u = 0;
    this.state = 'wait';
    this.waitT = delay;
    this.roared = false;
    this.speed = 2.5;
    this._reset();
    this._place();
  }
  // no floor under the centre line here, or a raised lip (a log) to hop over
  _blocked(s) {
    const g = this.track.groundAt(s, 0, this._g);
    return !g || g.y > this.track.heightAt(s) + 0.4;
  }
  // how far the cat may drift sideways at s and still have all four paws on the floor
  _lane(s) {
    let w = 0;
    for (const sp of this.track.spans) if (!sp.disabled && s >= sp.d0 && s <= sp.d1 && sp.dy === 0) w = Math.max(w, sp.w / 2 - Math.abs(sp.u));
    return Math.max(0, Math.min(1.8, w - 1.3));
  }
  _footfall(paws, loud) {
    if (!this.legacy) return;
    const v = this._v, c = this.player ? Math.max(0, 1 - Math.abs(this.player.body.s - this.s) / 18) : 0;
    for (const [x, z] of paws) {
      this.rig.root.localToWorld(v.set(x, 0.05, z));
      this.fx.dust(v.x, this.y, v.z, { count: 2, size: 0.55, color: 0xf0c890, speed: 1.4, life: 0.5 });
    }
    if (loud) {
      audio.play('paw', 0.4 + c * 0.6);
      if (c > 0.3) this.game.camera.shake(0.05 + c * 0.07, 0.12);
    }
  }
  update(dt) {
    const p = this.player;
    const ps = p.body.s ?? 0;
    if (!this.legacy) {
      if (this.state === 'idle' && ps >= this.d0 && ps < this.d1) this.activate(ps, 1.2);
      if (ps >= this.d1 && this.state !== 'done') {
        this.state = 'done'; this.alwaysActive = false;
        this.rig.finish?.(); audio.play('bonk'); this.restoreCamera();
      }
      if (this.state === 'idle' || this.state === 'done') return;
      if (this.model === 'giant_coconut' && this.pitT > 0) {
        this.pitT -= dt;
        if (this.pitT <= 0) { this.s = Math.min(ps - this.catchAt, Math.max(this.pitEnd, ps - 13)); this.y = this.track.heightAt(this.s); this.obj.visible = true; this.visible = true; this._place(); }
        return;
      }
    }
    if (this.state === 'wait') {
      this.waitT -= dt;
      this.rig.pose(this.waitT < 0.8 ? 'yowl' : 'crouch', dt, 1);
      if (this.waitT < 0.8 && !this.roared) { this.roared = true; audio.play(this.legacy ? 'yowl' : 'whirr'); this.game.camera.shake(0.4, 0.5); }
      if (this.waitT <= 0) this.state = 'run';
    } else if (this.state === 'run' || this.state === 'gloat') {
      const gap = ps - this.s;
      if (this.state === 'run') {
        // smooth rubber band: eases toward a speed that rises with the gap (no stepped jumps)
        const target = this.legacy ? chaseSpeed(gap, 6.7, this.catchUp, 1)
          : Math.min(this.catchUpSpeed, chaseSpeed(gap, this.speed0, this.catchUp, 1)) * chaseDda(this.session);
        if (!this.leap) this.speed = damp(this.speed, target, 2, dt);
      } else {
        this.speed = damp(this.speed, 0, 3.5, dt);
      }
      this.s += this.speed * dt;
      // lateral steering: a critically damped spring toward Nobu's lane, kept on the floor
      const lane = Math.min(this._lane(this.s + REACH), this._lane(this.s));
      const tu = this.count > 1 ? 0 : this.state === 'run' ? clamp(p.body.u ?? 0, -lane, lane) : this.u;
      const acc = (tu - this.u) * 5 - this.uv * 4.5;
      this.uv = clamp(this.uv + acc * dt, -3.5, 3.5);
      this.u = clamp(this.u + this.uv * dt, -1.8, 1.8);
      // face the way it is actually moving, and bank into curves and swerves
      const dy = this.track.yaw(this.s + 1) - this.track.yaw(this.s - 1);
      const curve = Math.atan2(Math.sin(dy), Math.cos(dy)) / 2; // track turn rate, rad per metre (+ = left)
      this.heading = damp(this.heading, -Math.atan2(this.uv, Math.max(2, this.speed)), 7, dt);
      this.lean = damp(this.lean, clamp(-curve * this.speed * this.speed * 0.16 + acc * 0.015, -0.2, 0.2), 5, dt);
      this.rig.lookYaw = clamp((p.body.u ?? 0) - this.u, -1, 1) * -0.3 - this.heading * 0.5;
      // pits and logs: bound clean over them, front paws taking off at the lip, hind paws landing past it
      const ground = this.track.heightAt(this.s);
      if (this.model !== 'smog_wall' && !this.leap && this.state === 'run' && this._blocked(this.s + REACH)) {
        let e = this.s + REACH;
        while (e < this.s + 40 && this._blocked(e)) e += 0.5;
        const len = e + REAR - this.s;
        if (this.model === 'giant_coconut' && !this.track.groundAt(this.s + REACH, 0, this._g)) { this.pitT = 0.6; this.pitEnd = e + REAR; this.obj.visible = false; this.visible = false; return; }
        this.leap = { s0: this.s, s1: e + REAR, y0: this.y, h: clamp(0.6 + len * 0.17, 1.4, 3.6) };
        this.speed = Math.min(this.catchUpSpeed, Math.max(this.speed, 7.5)); // Legacy's cap is Infinity.
        this._footfall(HIND_PAWS, true);
      }
      if (this.leap) {
        const L = this.leap, q = clamp((this.s - L.s0) / (L.s1 - L.s0), 0, 1);
        this.y = L.y0 + (this.track.heightAt(L.s1) - L.y0) * q + 4 * L.h * q * (1 - q);
        this.rig.pose('leap', dt, q);
        if (q >= 1) {
          this.leap = null; this.landT = 0.32; this.y = ground;
          this._footfall(ALL_PAWS, true);
          audio.play('stomp');
          this.game.camera.shake(0.2, 0.25);
        }
      } else {
        this.y = damp(this.y, ground, 20, dt);
        if (this.landT > 0) {
          this.landT -= dt;
          this.rig.pose('land', dt, Math.max(0, this.landT / 0.32));
          this.rig.gait += dt * (7.5 + 5.5 * Math.min(this.speed / 8, 1.5)); // keep the stride clock going
        } else if (this.state === 'gloat' && this.speed < 2.2) {
          this.rig.pose('sit', dt);
        } else {
          this.rig.pose('run', dt, this.speed / 8);
        }
        const step = this._step();
        if (step !== this.lastStep && this.landT <= 0 && this.speed > 2.2) {
          const front = ((step % 2) + 2) % 2 === 0;
          this._footfall(front ? FRONT_PAWS : HIND_PAWS, front);
        }
        this.lastStep = step;
      }
      if (this.state === 'run') {
        if (gap < this.catchAt && !p.dead) {
          if (p.god) this.s = ps - this.catchAt; // god mode: it can only breathe down your neck
          else {
            p.die(this.model === 'smog_wall' ? 'cone' : 'flat');
            this.state = 'gloat';
            audio.play(this.legacy ? 'meow' : 'laugh');
          }
        }
        if (p.dead && this.state === 'run') this.state = 'gloat';
      }
    } else if (this.state === 'stop') {
      this.rig.pose('idle', dt);
    }
    if (!this.legacy) {
      this.alwaysActive = this.state === 'wait' || this.state === 'run';
      this.effectT = (this.effectT ?? 0) - dt;
      if (this.effectT <= 0 && this.state === 'run') {
        this.effectT = this.model === 'smog_wall' ? 1.2 : .08;
        if (this.model === 'smog_wall') { if (Math.abs(ps - this.s) < 12) audio.play('suck', .4); }
        else this.fx.dust(this.pos.x, this.pos.y, this.pos.z, { count: 2, size: .4, color: 0xb0a090 });
      }
    }
    this._place();
  }
}

