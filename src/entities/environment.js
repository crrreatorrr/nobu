// Track-local environment controllers. All restart through Entity.onRespawn.
import * as THREE from 'three';
import { Entity } from './entity.js';
import { Glowworm } from './glowworm.js';
import { THEMES } from '../world/stage.js';
import { audio } from '../audio/audio.js';
import { chaseDda } from './chaser.js';
import { ENVIRONMENT_TEXT } from '../story/script.js';

export function checkpointS(entity) {
  const p = entity.session?.cp?.pos || entity.player.pos;
  return entity.track.project(p.x, p.z, -1, entity._checkpoint ||= {}).s;
}
export class CamZone extends Entity {
  constructor(stage, track, d0, d1, mode, opts = {}) {
    super(stage, ...track.toWorld((d0 + d1) / 2).toArray());
    this.track = track; this.d0 = d0; this.d1 = d1; this.mode = mode;
    this.opts = { track, ...opts };
    if (mode === 'side' && track.mirror) this.opts.side = -(opts.side ?? 1);
    this.active = false; this.alwaysActive = true; this.interactive = false;
  }
  contains(s, y = this.player.pos.y) { return s >= this.d0 && s <= this.d1 && (this.opts.minY === undefined || y >= this.track.heightAt(s) + this.opts.minY); }
  apply(s, y) {
    const inside = this.contains(s, y);
    if (inside === this.active) return;
    this.active = inside;
    if (inside) this.game.camera.setMode(this.mode, this.opts);
    else if (this.game.camera.opts === this.opts && this.stage.defaultCamera) {
      const c = this.stage.defaultCamera; this.game.camera.setMode(c.mode, c);
    }
  }
  update() { this.apply(this.player.body.s ?? 0); }
  onRespawn() { this.active = !this.contains(checkpointS(this), this.session.cp.pos.y); this.apply(checkpointS(this), this.session.cp.pos.y); }
}
export class RisingHazard extends Entity {
  // still: the liquid never moves. It stays at y0 as a plain death plane (no rise, no drain, no
  // per-frame emitter or mesh writes), which is the cheapest form of this hazard.
  constructor(stage, track, d0, d1, { y0, y1, rate, trigger = 'enter', color = 0xffb070, w = 8.6, material, still = false } = {}) {
    super(stage, 0, 0, 0);
    if (!(y1 > y0 && rate > 0 && d1 > d0)) throw new Error('RisingHazard requires increasing bounds and a positive rate');
    Object.assign(this, { track, d0, d1, y0, y1, rate, trigger, still });
    this.alwaysActive = true; this.interactive = false;
    const vertices = [], indices = [], uv = [], v = new THREE.Vector3();
    const n = Math.max(1, Math.ceil((d1 - d0) / .75));
    for (let i = 0; i <= n; i++) {
      const d = d0 + (d1 - d0) * i / n;
      for (const x of [-w / 2, w / 2]) { track.toWorld(d, x, 0, v); vertices.push(v.x, v.y, v.z); uv.push(x, d); }
      if (i) { const b = i * 2; indices.push(b - 2, b, b - 1, b - 1, b, b + 1); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals();
    this.mesh = new THREE.Mesh(g, material || new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8, side: THREE.DoubleSide })); this.obj.add(this.mesh);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, y1 - y0 + 2, .3), new THREE.MeshLambertMaterial({ color }));
    track.toWorld(d1, 0, (y0 + y1) / 2, wall.position); wall.rotation.y = track.yaw(d1); this.obj.add(wall);
    this.emitters = [];
    if (stage.emitter) for (let d = d0 + 2; d < d1; d += 7) {
      const p = track.toWorld(d, 0, y0);
      stage.emitter(p.x,p.y,p.z,color === 0x6a3aa0 ? 'bubble' : 'steam',{color: color === 0x6a3aa0 ? 0xa060d0 : 0xffffff,every:.3});
      this.emitters.push({ emitter: stage.emitters[stage.emitters.length-1], baseY: p.y-y0 });
    }
    this.onRespawn();
  }
  armWith(sw) { this.switchEntity = sw; return this; }
  start() { if (this.state !== 'armed' || this.still) return; this.state = 'rising'; audio.play('suck'); this.game.ui.banner(ENVIRONMENT_TEXT.rising, '', 2); }
  onRespawn() { this.y = this.y0; this.state = this.still ? 'done' : 'armed'; this.soundT = 0; if (this.mesh) this.mesh.position.y = this.y; }
  update(dt) {
    const p = this.player, s = p.body.s ?? 0;
    if (this.still) {
      if (this.mesh.material.uniforms?.uTime) this.mesh.material.uniforms.uTime.value += dt;
      if (s >= this.d0 && s <= this.d1 && !p.dead && p.pos.y < this.track.heightAt(s) + this.y0) p.die('fall');
      return;
    }
    if (this.state === 'armed') {
      const at = typeof this.trigger === 'number' ? this.trigger : this.d0;
      const sw = this.switchEntity;
      if (this.trigger === 'switch' ? !!(sw?.used || sw?.broken || sw?.hit || sw?.active || sw?.on || sw?.state === 'on') : s >= at) this.start();
    }
    const rate = this.rate * chaseDda(this.session);
    if (s > this.d1 && this.state === 'rising') this.state = 'draining';
    if (this.state === 'rising') {
      this.y = Math.min(this.y1, this.y + rate * dt);
      if (s >= this.d0 && s <= this.d1 && p.pos.y < this.track.heightAt(s) + this.y && !p.dead) p.die('fall');
      this.soundT -= dt;
      if (this.soundT <= 0 && s >= this.d0 - 15 && s <= this.d1 + 15) { audio.play('roll', .25); this.soundT = .6; }
    } else if (this.state === 'draining') { this.y = Math.max(this.y0, this.y - rate * 3 * dt); if (this.y === this.y0) this.state = 'done'; }
    this.mesh.position.y = this.y;
    for (const e of this.emitters) e.emitter.y = e.baseY + this.y;
    if (this.mesh.material.uniforms?.uTime) this.mesh.material.uniforms.uTime.value += dt;
  }
  // Arrival times include vertical climbs; returns concrete authoring failures.
  fairness(surfaces) { return surfaces.filter(({ d, y, arrival }) => d >= this.d0 && d <= this.d1 && y - Math.min(this.y1, this.y0 + this.rate * arrival) < 1.5); }
}
export class DarkZone extends Entity {
  constructor(stage, track, d0, d1, { radius = 4, minY, baseY, x = 2.6 } = {}) {
    super(stage, 0, 0, 0);
    Object.assign(this, { track, d0, d1, minY }); this.alwaysActive = true; this.interactive = false; this.blend = 0; this.inside = false;
    this.lumi = stage.add(new Glowworm(stage, track, [d0, d0 + (d1 - d0) / 2, Math.max(d0, d1 - 6)], { baseY, nestU: x }));
    this.lumi.zoneRadius = radius; this.lumi.sleep(true);
    this.base = { fog: stage.scene.fog.color.clone(), near: stage.scene.fog.near, far: stage.scene.fog.far, sun: stage.sun.intensity, hemi: stage.hemi.intensity, rim: stage.rim.intensity };
    this.cave = new THREE.Color(THEMES.cave.fog);
  }
  contains(s, y = this.player.pos.y) { return s >= this.d0 - 4 && s <= this.d1 + 4 && (this.minY === undefined || y >= this.track.heightAt(s) + this.minY); }
  update(dt, atS = this.player.body.s ?? 0, atY = this.player.pos.y) {
    const s = atS, inside = this.contains(s, atY);
    if (inside && !this.inside) {
      if (import.meta.env.DEV && this.stage.darkZone && this.stage.darkZone !== this && this.stage.darkZone.inside) throw new Error('Overlapping active DarkZones');
      this.stage.darkZone = this; this.lumi.wake(s); this.game.ui.tutorial('glowworm');
    } else if (!inside && this.inside) this.lumi.sleep();
    this.inside = inside;
    if (this.stage.darkZone && this.stage.darkZone !== this) return;
    this.blend = Math.max(0, Math.min(1, this.blend + (inside ? 1 : -1) * dt / 1.2));
    const b = this.base, t = this.blend, theme = THEMES.cave;
    const fog = this.stage.scene.fog; fog.color.copy(b.fog).lerp(this.cave, t); fog.near = b.near + (theme.fogNear - b.near) * t; fog.far = b.far + (theme.fogFar - b.far) * t;
    this.stage.hemi.intensity = b.hemi + (theme.hemiI - b.hemi) * t; this.stage.sun.intensity = b.sun + (theme.sunI - b.sun) * t; this.stage.rim.intensity = b.rim + (theme.rimI - b.rim) * t;
    if (!inside && t === 0 && this.stage.darkZone === this) this.stage.darkZone = null;
  }
  onRespawn() {
    const s = checkpointS(this); this.inside = this.contains(s, this.session.cp.pos.y);
    if (this.inside) { this.stage.darkZone = this; this.lumi.wake(s); } else this.lumi.sleep(true);
    this.blend = this.inside ? 1 : 0;
    this.update(0, s, this.session.cp.pos.y);
  }
}
