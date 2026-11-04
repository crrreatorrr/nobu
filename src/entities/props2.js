// New track-authored gameplay props. Elevated geometry is made of Solids, never spans.
import * as THREE from 'three';
import { Entity } from './entity.js';
import { Solid } from '../world/physics.js';
import { platformMesh } from './props.js';
import { toon } from '../player/nobuPrims.js';
import { audio } from '../audio/audio.js';
import { drumPos, drumSpeed } from './propsTiming.js';

const _point = new THREE.Vector3();
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
      if (part.crumble && part.state === 'idle' && p.body.grounded && p.body.ground === part.solid) { part.state = 'shake'; part.t = 0; audio.play('roll'); }
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
      const yaw = this.track ? this.track.yaw(part.coord.d) : 0;
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
    if (Math.floor(this.t / this.opts.period) > turn) audio.play('whirr');
    this._place(dt);
  }
  onRespawn() {
    for (const part of this.parts) { part.state = 'idle'; part.t = 0; part.fall = 0; part.vy = 0; }
    this._place(0); // Orbit time deliberately keeps running.
  }
}
