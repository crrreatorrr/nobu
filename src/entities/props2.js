// New track-authored gameplay props. Elevated geometry is made of Solids, never spans.
import * as THREE from 'three';
import { Entity } from './entity.js';
import { Solid } from '../world/physics.js';
import { platformMesh } from './props.js';
import { toon } from '../player/nobuPrims.js';
import { audio } from '../audio/audio.js';
import { Assets } from '../art/assets.js';
import { PROP_TEXT } from '../story/script.js';
import { HANG } from '../player/hang.js';
import { drumPos, drumSpeed, toasterCycle } from './propsTiming.js';

const _point = new THREE.Vector3();
const _direction = new THREE.Vector3();
const DRUM_SOUND = Object.freeze({ volume: 0.4 });
const ZIP_SOUND = Object.freeze({ volume: 0.3 });
export function propWorld(track, x, y, d, out) {
  return track ? track.toWorld(d, x, y, out) : out.set(x, y, -d);
}
function dimensions(w, dd, yaw, out) {
  const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
  out.w = w * c + dd * s; out.d = w * s + dd * c;
}
const platformGeometry = new Map();
function propPlatform(stage, w, h, dd, tint) {
  const mesh = platformMesh(stage, w, h, dd, tint);
  const key = `${w}:${h}:${dd}`;
  if (platformGeometry.has(key)) { mesh.geometry.dispose(); mesh.geometry = platformGeometry.get(key); }
  else platformGeometry.set(key, mesh.geometry);
  return mesh;
}

export class SpinDrum extends Entity {
  constructor(stage, track, d, options = {}) {
    const opts = { x: 0, y: 0, d, r: 3.2, n: 4, period: 6, w: 2.2, dd: 2.2, axis: 'x', dir: 1, phase: 0, crumble: [], ...options };
    const p = propWorld(track, opts.x, opts.y, d, _point);
    super(stage, p.x, p.y, p.z);
    if (!(opts.period > 0) || !Number.isInteger(opts.n) || opts.n < 1) throw new Error('Invalid spin drum period/count');
    this.track = track; this.opts = opts; this.t = 0;
    this.interactive = false; this.alwaysActive = true;
    if (import.meta.env.DEV && drumSpeed(opts.r, opts.period) > 3.4) console.warn('[spinDrum] tangential speed exceeds 3.4 m/s');
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.7, 16), toon(0xd8dde6));
    hub.rotation.z = Math.PI / 2;
    this.obj.add(hub);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.49, 20), new THREE.MeshBasicMaterial({ color: 0x9ad8ef, transparent: true, opacity: 0.4 }));
    glass.rotation.y = Math.PI / 2; glass.position.x = 0.36; this.obj.add(glass);
    this.parts = [];
    for (let i = 0; i < opts.n; i++) {
      const body = new THREE.Group(), mesh = propPlatform(stage, opts.w, 0.4, opts.dd);
      mesh.position.y = -0.2; body.add(mesh); this.obj.add(body);
      for (const side of [-1, 1]) {
        const runner = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, opts.dd * 0.9), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
        runner.position.set(side * (opts.w / 2 - 0.1), 0.02, 0); body.add(runner);
      }
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 5), toon(0xaeb8c6));
      this.obj.add(spoke);
      const part = { body, spoke, mesh, state: 'idle', t: 0, vy: 0, fall: 0, crumble: opts.crumble.includes(i), point: new THREE.Vector3(), coord: {}, dim: {} };
      drumPos(i, 0, opts, part.coord);
      propWorld(track, part.coord.x, part.coord.y, part.coord.d, part.point);
      part.solid = stage.world.addBox(part.point.x, part.point.y - 0.4, part.point.z, opts.w, 0.4, opts.dd, { kind: 'moving', ref: this });
      this.parts.push(part);
    }
    this._place(0);
  }
  _place(dt) {
    const p = this.player, opts = this.opts;
    for (let i = 0; i < this.parts.length; i++) {
      const part = this.parts[i];
      if (dt > 0 && part.crumble && part.state === 'idle' && p.body.grounded && p.body.ground === part.solid) { part.state = 'shake'; part.t = 0; audio.play('roll'); }
      if (part.state === 'shake') {
        part.t += dt;
        if (part.t >= 0.55) { part.state = 'fall'; part.t = 0; }
      } else if (part.state === 'fall') {
        part.t += dt; part.vy -= 25 * dt; part.fall += part.vy * dt;
        if (part.t >= 2.8) { part.state = 'idle'; part.t = 0; part.fall = 0; part.vy = 0; }
      }
      drumPos(i, this.t, opts, part.coord);
      propWorld(this.track, part.coord.x, part.coord.y + part.fall, part.coord.d, part.point);
      part.body.position.copy(part.point).sub(this.home);
      const forward = this.track ? this.track.tangent(part.coord.d, _direction) : null;
      const yaw = forward ? Math.atan2(forward.x, forward.z) : 0;
      part.body.rotation.y = yaw;
      part.mesh.rotation.z = part.state === 'shake' ? Math.sin(part.t * 45) * 0.03 : 0;
      part.body.rotation.x = part.state === 'fall' ? part.t * 1.5 : 0;
      dimensions(opts.w * 0.95, opts.dd * 0.95, yaw, part.dim);
      part.solid.setCenter(part.point.x, part.point.y - 0.4, part.point.z, part.dim.w, 0.4, part.dim.d);
      part.solid.enabled = part.state !== 'fall' || part.t < 0.2;
      // Spokes follow the orbit, not a crumbled platform's fall.
      propWorld(this.track, part.coord.x, part.coord.y, part.coord.d, _point).sub(this.home);
      part.spoke.position.copy(_point).multiplyScalar(0.5);
      part.spoke.scale.y = _point.length();
      part.spoke.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, _point.normalize());
    }
  }
  update(dt) {
    const turn = Math.floor(this.t / this.opts.period);
    this.t += dt;
    if (Math.floor(this.t / this.opts.period) > turn) audio.play('whirr', 1, DRUM_SOUND);
    this._place(dt);
  }
  onRespawn() {
    for (const part of this.parts) { part.state = 'idle'; part.t = 0; part.fall = 0; part.vy = 0; }
    this._place(0); // Orbit time deliberately keeps running.
  }
}

const toasterBody = new THREE.BoxGeometry(1.6, 1, 1.2);
const toastSlice = new THREE.BoxGeometry(0.42, 0.7, 0.75);
export class Toaster extends Entity {
  constructor(stage, x, y, z, { power = 15, period = 2.4, phase = 0, skin = 'toast', yaw = 0 } = {}) {
    super(stage, x, y, z);
    if (!(period >= 0.6)) throw new Error('Toaster period must leave time for its 0.6 second tell');
    this.power = power; this.period = period; this.phase = phase; this.skin = skin;
    this.t = 0; this.popT = 10; this.cycle = {};
    toasterCycle(0, period, phase, this.cycle);
    // Keep the local pop phase running when the stage culls distant geometry.
    this.interactive = false; this.alwaysActive = true;
    this.obj.rotation.y = yaw;
    const body = new THREE.Mesh(toasterBody, toon(skin === 'valve' ? 0xc8a040 : 0xd8dde6));
    body.position.y = 0.5; this.obj.add(body);
    this.glow = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.04, 0.85), new THREE.MeshStandardMaterial({ color: 0x26180e, emissive: 0xff6a18, emissiveIntensity: 0 }));
    this.glow.position.y = 1.02; this.obj.add(this.glow);
    this.toast = [];
    if (skin !== 'valve') for (const side of [-1, 1]) {
      const slice = new THREE.Mesh(toastSlice, toon(0xe8ba76));
      slice.position.set(side * 0.37, 0.85, 0); this.toast.push(slice); this.obj.add(slice);
    }
    const dim = {}; dimensions(1.6, 1.2, yaw, dim);
    this.solid = stage.world.addBox(x, y, z, dim.w, 1, dim.d, { ref: this });
  }
  update(dt) {
    const oldCycle = this.cycle.cycle, oldTick = this.cycle.tick;
    this.t += dt; this.popT += dt;
    toasterCycle(this.t, this.period, this.phase, this.cycle);
    if (this.cycle.cycle > oldCycle) {
      this.popT = 0;
      const p = this.player;
      if (p.body.grounded && p.body.ground === this.solid && !p.dead) p.bounce(this.power, { allowCut: false });
      audio.play('boing');
      if (this.skin === 'valve') this.fx?.puff?.(this.pos.x, this.pos.y + 1, this.pos.z, { color: 0xffffff, count: 12, speed: 4 });
    } else if (this.cycle.tick > oldTick) audio.play('tick');
    this.glow.material.emissiveIntensity = this.cycle.glow * 2;
    const hop = Math.max(0, 2 - (this.popT - 0.3) ** 2 * (2 / 0.09));
    for (const slice of this.toast) slice.position.y = 0.85 + hop;
  }
  onRespawn() { /* The authored rhythm deliberately continues through a death. */ }
}

export class RugPull extends Entity {
  constructor(stage, track, d0, d1, { x = 0, w = 3, tile = 2.4, speed = 7 } = {}) {
    const p = propWorld(track, x, 0, d0, _point);
    super(stage, p.x, p.y, p.z);
    if (!(speed >= 6.5 && speed < 8)) throw new Error('Rug pull speed must be at least RUN - 1.5 and below RUN');
    if (!(tile > 0 && d1 - d0 >= tile)) throw new Error('Rug pull needs at least one tile');
    this.track = track; this.x = x; this.w = w; this.d0 = d0; this.d1 = d1; this.speed = speed;
    this.state = 'idle'; this.t = 0; this.front = d0; this.shown = false; this.tiles = []; this.litCats = new Set();
    this.interactive = false; this._projection = {};
    const count = Math.floor((d1 - d0) / tile);
    const geometry = new THREE.BoxGeometry(w, 0.4, tile - 0.1);
    const material = new THREE.MeshLambertMaterial({ map: Assets.tiled('rug') });
    for (let i = 0; i < count; i++) {
      const d = d0 + (i + 0.5) * tile;
      propWorld(track, x, 0, d, _point);
      const home = _point.clone(), body = new THREE.Group(), mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = -0.2; body.add(mesh); body.position.copy(home).sub(this.home);
      const yaw = track ? track.yaw(d) : 0;
      body.rotation.y = yaw; this.obj.add(body);
      const dim = {}; dimensions(w * 0.95, tile - 0.1, yaw, dim);
      const solid = stage.world.addBox(home.x, home.y - 0.4, home.z, dim.w, 0.4, dim.d, { kind: 'moving', ref: this });
      this.tiles.push({ body, mesh, solid, home, dim, end: d0 + (i + 1) * tile, state: 'idle', t: 0, vy: 0, fall: 0 });
    }
  }
  update(dt) {
    if (this.state === 'idle') {
      const p = this.player;
      if (!p.dead && p.body.grounded && p.body.ground === this.tiles[0].solid) {
        this.state = 'pulling'; this.alwaysActive = true;
        if (!this.shown) { this.game.camera?.shake(0.15, 0.2); this.game.ui?.banner(PROP_TEXT.rugPull, '', 1.4); this.shown = true; }
      }
    }
    if (this.state === 'idle') return;
    this.t += dt; this.front = this.d0 + this.speed * this.t;
    let falling = false;
    for (const part of this.tiles) {
      if (part.state === 'idle' && this.front + this.speed * 0.25 >= part.end) { part.state = 'tell'; audio.play('roll'); }
      if (part.state === 'tell') {
        const warning = Math.max(0, Math.min(1, (this.front + this.speed * 0.25 - part.end) / (this.speed * 0.25)));
        part.mesh.rotation.x = warning * Math.PI / 12;
        if (this.front >= part.end) {
          part.state = 'fall'; part.t = 0;
          this.fx?.puff?.(part.home.x, part.home.y, part.home.z, { count: 4, color: 0xd8c0a0, speed: 2 });
          audio.play('whoosh');
        }
      }
      if (part.state === 'fall') {
        part.t += dt; part.vy -= 25 * dt; part.fall += part.vy * dt;
        part.body.position.y = part.home.y - this.home.y + part.fall;
        part.body.rotation.x = part.t * 1.5;
        part.solid.setCenter(part.home.x, part.home.y - 0.4 + part.fall, part.home.z, part.dim.w, 0.4, part.dim.d);
        if (part.t >= 0.2) part.solid.enabled = false;
        if (part.t >= 2.8) { part.state = 'gone'; part.body.visible = false; }
        else falling = true;
      }
    }
    for (const e of this.stage.entities) {
      if (e.kind !== 'cat' || e.dead || !e.light) continue;
      const d = this.track ? this.track.project(e.pos.x, e.pos.z, -1, this._projection).s : -e.pos.z;
      const u = this.track ? this._projection.u : e.pos.x;
      if (Math.abs(u - this.x) <= this.w / 2 && d >= this.d0 && d <= Math.min(this.front, this.d1) && Math.abs(e.pos.y - (this.track ? this.track.heightAt(d) : 0)) < 1.2 && !this.litCats.has(e)) {
        if (e.timer < 0 || e.timer === undefined) { e.light(); this.litCats.add(e); }
      }
    }
    if (this.front >= this.tiles.at(-1).end) this.state = 'gone';
    this.alwaysActive = this.state === 'pulling' || falling;
  }
  onRespawn() {
    for (const cat of this.litCats) if (!cat.broken && !cat.dead) cat.onRestore?.();
    this.litCats.clear();
    this.state = 'idle'; this.t = 0; this.front = this.d0; this.alwaysActive = false;
    for (const part of this.tiles) {
      part.state = 'idle'; part.t = 0; part.vy = 0; part.fall = 0;
      part.body.position.copy(part.home).sub(this.home); part.body.rotation.x = 0; part.body.visible = true; part.mesh.rotation.x = 0;
      part.solid.setCenter(part.home.x, part.home.y - 0.4, part.home.z, part.dim.w, 0.4, part.dim.d); part.solid.enabled = true;
    }
  }
}

export class Zipline extends Entity {
  constructor(stage, A, B, { speed = 9 } = {}) {
    super(stage, A.x, A.y, A.z);
    this.A = A.clone(); this.B = B.clone();
    this.velocity = B.clone().sub(A); this.length = this.velocity.length();
    if (!(this.length > 0 && speed > 0)) throw new Error('Zipline requires distinct ends and positive speed');
    this.speed = speed; this.velocity.multiplyScalar(speed / this.length);
    // A long cable can be grabbed near either end, beyond its origin's culling radius.
    this.interactive = false; this.alwaysActive = true;
    this.blockGrabT = 0; this.rollT = 0; this._point = new THREE.Vector3();
    this._delta = B.clone().sub(A);
    const end = this._delta.clone(), middle = end.clone().multiplyScalar(0.5); middle.y -= 0.5;
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(), middle, end);
    this.obj.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.035, 5, false), toon(0x35383d)));
    const postGeometry = new THREE.BoxGeometry(0.14 * 1.6, 1.1 * 1.6, 0.14 * 1.6);
    for (const endpoint of [new THREE.Vector3(), end]) {
      const post = new THREE.Mesh(postGeometry, toon(0xc89058));
      post.position.copy(endpoint); post.position.y -= 0.55 * 1.6; this.obj.add(post);
    }
    this.pulley = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.06, 6, 12), toon(0xe2bb42));
    this.obj.add(this.pulley);
    // Primitive socks are also suitable for L4's clothesline skin.
    const sockGeometry = new THREE.BoxGeometry(0.18, 0.5, 0.09);
    for (let i = 1; i <= 4; i++) {
      const sock = new THREE.Mesh(sockGeometry, toon(i % 2 ? 0xf0e9dc : 0x75a9c8));
      curve.getPoint(i / 5, sock.position); sock.position.y -= 0.27; this.obj.add(sock);
    }
  }
  update(dt) {
    this.blockGrabT = Math.max(0, this.blockGrabT - dt);
    const p = this.player;
    if (p.hang?.line === this) {
      this.pulley.position.copy(this._delta).multiplyScalar(p.hang.t);
      this.rollT -= dt;
      if (this.rollT <= 0) { this.rollT += 0.25; audio.play('roll', 1, ZIP_SOUND); }
      return;
    }
    if (p.hang || p.mode !== 'normal' || p.dead || p.frozen || p.ride || this.blockGrabT > 0 || p.biteT < 0.05 || p.biteT > 0.3) return;
    this._point.copy(p.pos); this._point.y += HANG;
    const t = this._point.sub(this.A).dot(this._delta) / (this.length * this.length);
    if (t < 0 || t > 1 || (t > 0.2 && (p.body.grounded || p.vel.y >= 0))) return;
    this._point.copy(this.A).addScaledVector(this._delta, t);
    const dx = this._point.x - p.pos.x, dy = this._point.y - p.pos.y - HANG, dz = this._point.z - p.pos.z;
    if (dx * dx + dy * dy + dz * dz > 1.2 * 1.2) return;
    p.hang = { line: this, t }; p.biteT = -1;
    p.body.grounded = false; p.body.ground = null; p.vel.set(0, 0, 0);
    p.airDashT = 0; this.rollT = 0.25;
    this.pulley.position.copy(this._delta).multiplyScalar(t);
    audio.play('zip');
  }
  onRespawn() {
    if (this.player.hang?.line === this) this.player.hang = null;
    this.blockGrabT = 0; this.rollT = 0; this.pulley.position.set(0, 0, 0);
  }
}
