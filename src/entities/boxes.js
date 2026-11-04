// Timed boxes use shared stage clocks, never entity visibility, to determine phase.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Entity } from './entity.js';
import { CrumblePlatform, MovingPlatform } from './props.js';
import { Solid } from '../world/physics.js';
import { audio } from '../audio/audio.js';
import { fair } from '../levels/gauntletMath.js';

export function ddaTiming(stage) {
  const s = stage.game.session;
  const disabled = s?.trial || s?.remix || s?.bossRush || s?.medalRun || s?.boardRun;
  // Box rhythm uses a duration multiplier; generic hazard DDA is a separate policy.
  const assisted = !disabled && (s?.deathsAtCp || 0) >= 5;
  return { rate: assisted ? 1 / 1.08 : 1, delayK: assisted ? 1.08 : 1 };
}
export class BeatClock {
  constructor() { this.t = 0; this.rate = 1; }
  advance(dt, rate = this.rate) { this.rate = rate; this.t += dt * this.rate; }
  reset() { this.t = 0; }
}
export function registerBeatClock(stage, group = null) {
  stage.beatClocks ||= new Map();
  const key = group ?? Symbol('private box clock');
  if (!stage.beatClocks.has(key)) stage.beatClocks.set(key, new BeatClock());
  return stage.beatClocks.get(key);
}
export function advanceBeatClocks(stage, dt) {
  const { rate } = ddaTiming(stage);
  for (const clock of stage.beatClocks?.values() || []) clock.advance(dt, rate);
}
export function resetBeatClocks(stage) {
  for (const clock of stage.beatClocks?.values() || []) clock.reset();
}
const mod = (n, m) => ((n % m) + m) % m;
const boxGeo = new RoundedBoxGeometry(.98, .98, .98, 3, .1);
const bandGeo = new THREE.BoxGeometry(1, .16, 1);
const outlineGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, .98, 1));
const steel = new THREE.MeshPhongMaterial({ color: 0xb8c2d0, shininess: 70 });
boxGeo.userData.shared=true;
bandGeo.userData.shared=true;
outlineGeo.userData.shared=true;
function boxMesh(color, diamond = false) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(boxGeo, steel); body.position.y = .49;
  const band = new THREE.Mesh(bandGeo, new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0 }));
  band.position.y = .42; group.add(body, band);
  if (diamond) {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.12), band.material);
    gem.position.y = 1.08; group.add(gem);
  } else {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.2, .045, 8, 16, Math.PI), new THREE.MeshLambertMaterial({ color: 0x5a6272 }));
    handle.position.y = .98; group.add(handle);
  }
  group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { mesh: group, band: band.material };
}
function overlapsPlayer(entity, at = entity.home) {
  const p = entity.player, b = p?.body;
  if (!p || !b) return false;
  return p.pos.x + Math.max(.36,b.hw) > at.x - .49 && p.pos.x - Math.max(.36,b.hw) < at.x + .49 &&
    p.pos.z + Math.max(.36,b.hd) > at.z - .49 && p.pos.z - Math.max(.36,b.hd) < at.z + .49 &&
    p.pos.y + b.h > at.y && p.pos.y < at.y + .98;
}
export class BlinkBox extends Entity {
  constructor(stage, x, y, z, { on = 1.2, off = 1, phase = 0, group = null, tier = stage.tier || 1 } = {}) {
    super(stage, x, y, z);
    if (on <= 0 || off <= 0) throw new RangeError('Blink intervals must be positive');
    this.kind = 'blinkbox'; this.interactive = false; this.countable = false;
    Object.assign(this, { on, off, phase, tell: Math.max(.3, fair(tier).tell) });
    this.clock = registerBeatClock(stage, group);
    const visual = boxMesh(0x3ad0ff, true); this.mesh = visual.mesh; this.band = visual.band;
    this.obj.add(this.mesh);
    this.shell=this.mesh.children[0].material.clone();this.mesh.children[0].material=this.shell;
    this.outline = new THREE.LineSegments(outlineGeo, new THREE.LineBasicMaterial({ color: 0x3ad0ff, transparent: true, opacity: .35 }));
    this.outline.position.y = .49; this.obj.add(this.outline);
    this.solid = stage.world.add(new Solid({ x: x - .49, y, z: z - .49 }, { x: x + .49, y: y + .98, z: z + .49 }, { ref: this }));
    this.solid.enabled = false; this._cue = null; this.update(0, true);
  }
  update(dt, silent = false) {
    if(!silent && this.distToPlayer()<7)this.game.ui?.tutorial?.('blinkbox');
    const t = mod(this.clock.t + this.phase, this.on + this.off);
    const on = t < this.on;
    const returning = !on && this.on + this.off - t <= this.tell;
    const warning = on && this.on - t <= this.tell;
    const cue = warning ? 'warning' : returning ? 'returning' : on ? 'on' : 'off';
    if (!silent && cue !== this._cue && (warning || returning || cue === 'off')) audio.play('blip');
    this._cue = cue;
    // A culled box may have skipped an entire off phase; stale enabled state is not a safe return.
    const cycle=Math.floor((this.clock.t + this.phase)/(this.on + this.off));
    const stillSolid=this.solid.enabled && cycle===this._cycle;
    this.solid.enabled = on && (stillSolid || !overlapsPlayer(this));
    this._cycle=cycle;
    this.mesh.visible = this.solid.enabled;
    this.outline.visible = !this.solid.enabled;
    this.outline.material.opacity = returning ? .8 : .35;
    this.band.emissiveIntensity = warning ? .3 + .7 * Math.abs(Math.sin(this.clock.t * Math.PI * 20)) : 0;
    this.shell.emissive.setHex(0xffffff);this.shell.emissiveIntensity=this.band.emissiveIntensity * .65;
  }
  onRespawn() { this.clock.reset(); this.solid.enabled = false; this._cue = null; this.update(0, true); }
}

export class FallBox extends CrumblePlatform {
  constructor(stage, x, y, z, { delay = .45, tier = stage.tier || 1 } = {}) {
    // Parent positions its surface at y; this helper takes the box bottom.
    super(stage, x, y + .98, z, { w: 1, h: .98, d: 1 });
    this.home.y = y; this.pos.y = y; this.obj.position.y = y;
    this.obj.remove(this.mesh);
    const visual = boxMesh(0xff8a3a); this.mesh = visual.mesh; this.band = visual.band; this.obj.add(this.mesh);
    this.kind = 'fallbox'; this.countable = false; this.delay = delay;
    this.tell = Math.max(.3, fair(tier).tell);
    this.alwaysActive = true;
    for (const x0 of [-.25, 0, .25]) {
      const crack = new THREE.Mesh(new THREE.BoxGeometry(.025, .008, .65), new THREE.MeshLambertMaterial({ color: 0x28212b }));
      crack.position.set(x0, .985, 0); crack.rotation.y = .25; this.mesh.add(crack);
    }
    this.reset();
  }
  _place() {
    this.solid.setCenter(this.pos.x, this.pos.y, this.pos.z, .98, .98, .98);
    this.obj.position.copy(this.pos);
  }
  update(dt) {
    if(this.distToPlayer()<7)this.game.ui?.tutorial?.('fallbox');
    const p = this.player;
    if (this.state === 'idle' && p?.body.grounded && p.body.ground === this.solid) {
      this.state = 'shake'; this.t = 0; this.warned = false;
      this.activeDelay = this.delay * ddaTiming(this.stage).delayK;
      // Contact starts both cues. The permanent crack markings teach the hazard earlier.
      audio.play('roll');
    }
    if (this.state === 'shake') {
      this.t += dt;
      this.mesh.position.x = Math.sin(this.t * 60) * .06;
      this.band.emissiveIntensity = .4 + .4 * Math.abs(Math.sin(this.t * 20));
      if (!this.warned && this.t >= this.activeDelay - .15) { audio.play('roll'); this.warned = true; }
      if (this.t >= this.activeDelay - 1e-10) {
        this.state = 'fall'; this.t = 0; this.vy = 0; this.solid.enabled = false;
      }
    } else if (this.state === 'fall') {
      this.t += dt; this.vy -= 25 * dt; this.pos.y += this.vy * dt;
      this.obj.rotation.x += dt * 1.5; this._place();
      if (this.t >= 2.8) this.reset();
    } else if (this.state === 'returning' && !overlapsPlayer(this)) this.reset();
  }
  reset() {
    this.pos.copy(this.home); this.obj.position.copy(this.home); this.obj.rotation.x = 0;
    this.mesh.position.x = 0; this.mesh.rotation.z = 0; this.band.emissiveIntensity = 0;
    this.t = 0; this.vy = 0; this._place();
    this.solid.enabled = !overlapsPlayer(this);
    this.state = this.solid.enabled ? 'idle' : 'returning';
    this.mesh.visible = this.solid.enabled;
  }
  onRespawn() { this.reset(); }
}

export class SlideBox extends MovingPlatform {
  constructor(stage, x, y, z, { dir = new THREE.Vector3(1, 0, 0), range = 1.6, speed = 1.5, phase = 0, yaw = 0 } = {}) {
    super(stage, x, y + .98, z, { w: 1, h: .98, d: 1, dir, range, speed, phase, yaw });
    this.home.y = y; this.pos.y = y;
    this.obj.clear();
    const visual = boxMesh(0x2ad1a0); this.mesh = visual.mesh; this.obj.add(this.mesh);
    this.kind = 'slidebox'; this.countable = false;
    this.clock = registerBeatClock(stage); this._sign = null;
    this.onRespawn();
  }
  update() {
    if(this.distToPlayer()<7)this.game.ui?.tutorial?.('slidebox');
    this.t = this.clock.t;
    const angle = this.t * this.speed + this.phase;
    this.pos.copy(this.home).addScaledVector(this.dir, Math.sin(angle) * this.range);
    this.obj.position.copy(this.pos);
    this.solid.setCenter(this.pos.x, this.pos.y, this.pos.z, this.half.hx * 2, .98, this.half.hz * 2);
    const sign = Math.sign(Math.cos(angle));
    if (this._sign !== null && this._sign !== sign) audio.play('clang');
    this._sign = sign;
  }
  onRespawn() {
    this.clock.reset(); this._sign = null; this.update();
    this.solid.delta.x = this.solid.delta.y = this.solid.delta.z = 0;
  }
}
