import * as THREE from 'three';
import { Entity } from './entity.js';
import { Solid } from '../world/physics.js';
import { platformMesh } from './props.js';
import { textSprite } from './fx.js';
import { audio } from '../audio/audio.js';
import { SONGS } from '../audio/songs.js';
import { PROP_TEXT } from '../story/script.js';

export const MARKET_PATTERNS = {
  a: [1, 1, -1, 1, -1, -1, 1, -1], b: [1, 0, -1, 0],
  c: [1, 1, 1, -1], d: [1, -1, 1, -1, 0, 1, -1, -1],
  e: [1, 0, 1, 0, -1, 0], f: [0, 1, 0, -1], g: [1, -1, -1, 1, 1, -1],
};
const smooth = (v) => { const x = Math.min(1, Math.max(0, v)); return x * x * (3 - 2 * x); };
export class MarketClock extends Entity {
  constructor(stage, bpm = SONGS[stage.theme.music]?.bpm ?? 120) {
    super(stage, 0, 0, 0);
    if (!(bpm > 0)) throw new Error('Market BPM must be positive');
    this.bpm = bpm; this.step = 120 / bpm; this.t = 0; this.k = 0;
    this.platforms = []; this.interactive = false; this.alwaysActive = true;
  }
  level(group = 'a', k = this.k) {
    const pattern = MARKET_PATTERNS[group];
    if (!pattern) throw new Error(`Unknown market group: ${group}`);
    return pattern[((k % pattern.length) + pattern.length) % pattern.length];
  }
  next(group = 'a') { return this.level(group, this.k + 1); }
  value(group = 'a') {
    const previous = this.level(group, this.k - 1), current = this.level(group);
    return previous + (current - previous) * smooth((this.t - this.k * this.step) / 0.45);
  }
  update(dt) {
    this.t += dt;
    const step = Math.floor((this.t + 1e-10) / this.step);
    if (step === this.k) return;
    this.k = step;
    let nearest = null, distance = 18 * 18;
    const p = this.player.pos;
    for (const platform of this.platforms) {
      const d = platform.pos.distanceToSquared(p);
      if (d < distance) { distance = d; nearest = platform; }
    }
    if (nearest) {
      const direction = nearest.sign * (this.next(nearest.group) - this.level(nearest.group));
      if (direction) audio.play(direction > 0 ? 'chime' : 'beep');
    }
  }
  onRespawn() { /* One global clock keeps its beat through rollback. */ }
}

export class MarketPlatform extends Entity {
  constructor(stage, x, y, z, { amp = 2.2, w = 2.4, dd = 2.4, group = 'a', invert = false, yaw = 0, clock = stage.marketClock } = {}) {
    super(stage, x, y, z);
    if (!(amp >= 0 && amp <= 2.6)) throw new Error('Market amplitude must be at most 2.6 m');
    this.clock = clock; this.group = group; this.amp = amp; this.sign = invert ? -1 : 1;
    clock.level(group); clock.platforms.push(this);
    this.interactive = false; this.alwaysActive = true;
    this.obj.rotation.y = yaw;
    const mesh = platformMesh(stage, w, 0.4, dd);
    mesh.position.y = -0.2; this.obj.add(mesh);
    this.edge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.08, dd + 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.obj.add(this.edge);
    this.arrows = PROP_TEXT.arrows.map((label) => {
      const arrow = textSprite(label, { w: 96, h: 96, size: 72 });
      arrow.scale.set(0.65, 0.65, 1); arrow.position.set(0, 0.5, dd / 2); this.obj.add(arrow); return arrow;
    });
    const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
    this.w = w * c + dd * s; this.dd = w * s + dd * c;
    this.solid = stage.world.add(new Solid({ x: x - this.w / 2, y: y - 0.4, z: z - this.dd / 2 }, { x: x + this.w / 2, y, z: z + this.dd / 2 }, { kind: 'moving', ref: this }));
    this.update(0);
  }
  update() {
    this.pos.y = this.home.y + this.sign * this.amp * this.clock.value(this.group);
    this.obj.position.copy(this.pos);
    this.solid.setCenter(this.pos.x, this.pos.y - 0.4, this.pos.z, this.w, 0.4, this.dd);
    const direction = Math.sign(this.sign * (this.clock.next(this.group) - this.clock.level(this.group)));
    this.edge.material.color.setHex(direction > 0 ? 0x4ade80 : direction < 0 ? 0xff4a5a : 0xffffff);
    for (let i = 0; i < this.arrows.length; i++) this.arrows[i].visible = i === direction + 1;
  }
  onRespawn() { this.update(); }
}

export class MarketTicker extends Entity {
  constructor(stage, x, y, z, { group = 'a', clock = stage.marketClock } = {}) {
    super(stage, x, y, z);
    this.clock = clock; this.group = group; this.interactive = false;
    const board = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.1), new THREE.MeshBasicMaterial({ color: 0x17152a }));
    this.obj.add(board); this.arrows = [];
    for (let slot = 0; slot < 3; slot++) {
      const sprites = [];
      for (const label of PROP_TEXT.arrows) {
        const sprite = textSprite(label, { w: 64, h: 64, size: 48 });
        sprite.position.set((slot - 1) * 0.62, 0, 0.08); sprite.scale.set(0.5, 0.5, 1); this.obj.add(sprite); sprites.push(sprite);
      }
      this.arrows.push(sprites);
    }
    this.update();
  }
  update() {
    for (let slot = 0; slot < 3; slot++) {
      const level = this.clock.level(this.group, this.clock.k + slot + 1);
      for (let i = 0; i < 3; i++) this.arrows[slot][i].visible = i === level + 1;
    }
  }
  onRespawn() { this.update(); }
}
