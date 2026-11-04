import * as THREE from 'three';
import { Entity } from '../entities/entity.js';
import { ArenaTiles, Pedestal } from './arena.js';
import { Beam } from './common.js';
import { Assets } from '../art/assets.js';
import { audio } from '../audio/audio.js';

export const CONE_PEDESTALS = Object.freeze([[4.2, 0], [0, 4.2], [-4.2, 0], [0, -4.2]].map(Object.freeze));
export const RUG_PATTERNS = Object.freeze(['rows', 'checker', 'ring', 'cross']);

export class ConeTiles extends ArenaTiles {
  constructor(stage) {
    super(stage, { cols: 6, rows: 6, size: 4.2, y: 0 });
    this.rugTexture = Assets.tex('rug');
    this.reset();
  }
  select(pattern, player, phase) {
    const candidates = [];
    for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) {
      const tile = this.tiles[j * this.cols + i];
      if (phase >= 3 && CONE_PEDESTALS.some(([x,z]) => Math.abs(tile.x-x) <= 2.1+1.6 && Math.abs(tile.z-z) <= 2.1+1.6)) continue;
      const underPlayer = Math.abs(player.pos.x - tile.x) <= 2.1 && Math.abs(player.pos.z - tile.z) <= 2.1;
      if ((pattern === 'ring' || pattern === 'cross') && underPlayer) continue;
      const chosen = pattern === 'rows' ? j % 2 === 0 : pattern === 'checker' ? (i+j)%2 === 0
        : pattern === 'ring' ? i === 0 || j === 0 || i === 5 || j === 5 : i === 2 || i === 3 || j === 2 || j === 3;
      if (chosen) candidates.push(tile);
    }
    return candidates.slice(0, Math.floor(this.tiles.length / 2));
  }
  begin(pattern, player, tell, phase) {
    if (this.busy) return false;
    this.selected = this.select(pattern, player, phase); this.elapsed = 0; this.tell = tell; this.busy = true;
    return true;
  }
  update(dt) {
    if (!this.busy) return;
    this.elapsed += dt;
    const t = this.elapsed - this.tell;
    for (const tile of this.selected) {
      const material = tile.mesh.material;
      if (t < 0) {
        material.map = this.rugTexture; material.emissive.setHex(Math.floor(this.elapsed*12)%2 ? 0x771144 : 0x25103a);
        if (!tile.rugShown) { material.needsUpdate = true; tile.rugShown = true; }
      } else {
        tile.solid.enabled = false; material.map = null; material.emissive.setHex(0);
        if (tile.rugShown) { material.needsUpdate = true; tile.rugShown = false; }
        tile.mesh.position.y = -.15 - (t < 2 ? Math.min(6,t*24) : 6*Math.max(0,1-(t-2)/.4));
      }
    }
    if (t >= 2.4) this.reset();
  }
  reset() {
    super.reset(); this.busy = false; this.selected = []; this.elapsed = 0;
    for (const tile of this.tiles) { tile.mesh.material.map = null; tile.mesh.material.needsUpdate = true; tile.rugShown = false; }
  }
}

export class ConePedestal extends Pedestal {
  constructor(stage, x, z) {
    super(stage, x, z, { r: 1.6, h: 1.2 });
    this.mesh.geometry.dispose(); this.mesh.geometry = new THREE.CylinderGeometry(1.6,1.6,1.2,24);
    this.enabled = false; this.safe = true; this.top = 0; this.destination = 0;
    this.glow = new THREE.Mesh(new THREE.RingGeometry(1.05,1.5,32).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial({ color: 0xb8ffdd, transparent: true, opacity: 0, depthWrite: false }));
    this.glow.position.y = .025; this.obj.add(this.glow);
  }
  setPhase(phase, reset = false) {
    this.enabled = phase >= 3; this.safe = true; this.destination = this.enabled ? 1.2 : 0;
    if (reset) this.top = 0;
    this._place();
  }
  _place() {
    this.pos.y = this.top; this.obj.position.copy(this.pos);
    this.solid.setCenter(this.pos.x, this.top - this.depth, this.pos.z, this.size, this.depth, this.size);
    this.solid.enabled = this.enabled;
    this.visible = this.enabled; this.obj.visible = this.enabled;
    this.glow.material.color.setHex(this.safe ? 0xb8ffdd : 0x6c3d7a);
    this.mesh.material.color.setHex(this.safe ? 0x79938a : 0x553961);
  }
  update(dt) {
    const step = 1.2 * Math.max(0,dt), delta = this.destination - this.top;
    this.top += Math.sign(delta) * Math.min(Math.abs(delta),step); this._place();
  }
  reset() { this.top = 0; this.destination = this.enabled ? 1.2 : 0; this.safe = true; this._place(); }
}

export class ConeArena extends Entity {
  constructor(stage) {
    super(stage,0,0,0); this.alwaysActive = true; this.interactive = false;
    this.tiles = stage.add(new ConeTiles(stage));
    this.pedestals = CONE_PEDESTALS.map(([x,z]) => stage.add(new ConePedestal(stage,x,z)));
    this.fog = new THREE.Mesh(new THREE.PlaneGeometry(25.2,25.2).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial({ color: 0x6a3aa0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    this.fog.visible = false; this.obj.add(this.fog);
    this.beam = new Beam(stage.scene,0xc56aff);
    this.aim = new THREE.Vector3(); this.eye = new THREE.Vector3();
    this.phase = 1; this.reset();
  }
  setPhase(phase, reset = false) {
    this.phase = phase; this.tiles.reset(); this.stopSmog();
    for (const pedestal of this.pedestals) pedestal.setPhase(phase,reset);
  }
  nearest(position, safeOnly = false) {
    let nearest = null, best = Infinity;
    for (const p of this.pedestals) {
      if (safeOnly && !p.safe) continue;
      const d = (p.pos.x-position.x)**2 + (p.pos.z-position.z)**2;
      if (d < best) { best = d; nearest = p; }
    }
    return nearest;
  }
  startRug(pattern, player, tell, phase) { return !this.smog && this.tiles.begin(pattern,player,tell,phase); }
  startSmog({ tell, duration = 4, aimTime, ultimate = false, eye }) {
    if (this.tiles.busy || this.smog) return false;
    this.smog = { t: 0, tell, duration, aimTime, ultimate, shot: -1, firedShot: -1 };
    this.eye.copy(eye); this.fog.visible = true;
    const first = this.pedestals.indexOf(this.nearest(this.player.pos));
    for (let i=0;i<4;i++) {
      const p = this.pedestals[i]; p.safe = !ultimate || i === first || i === (first+1)%4;
      p.destination = p.safe ? 1.2 : .6; p.glow.material.opacity = p.safe ? .85 : .08;
    }
    return true;
  }
  update(dt) {
    const player = this.player;
    if (!player.dead && player.pos.y < -2.2) player.die('puff');
    const s = this.smog; if (!s) return;
    s.t += dt;
    const t = s.t-s.tell, warn = Math.min(1,s.t/s.tell);
    this.fog.position.y = -.2 + .7*warn; this.fog.material.opacity = .15 + .4*warn;
    if (t >= 0 && t < s.duration) {
      // Contact tolerance makes the two lowered .6m tops unsafe, as authored.
      if (!player.dead && player.pos.y <= .6001) player.hurt('puff',player.pos.x,player.pos.z);
      if (!s.ultimate) {
        const shot = t < 2 ? 0 : 1, local = t-shot*2-.2;
        if (shot !== s.shot && local >= 0) {
          s.shot = shot; const target = this.nearest(player.pos); this.aim.set(target.pos.x,1.2,target.pos.z); audio.play('charge');
        }
        if (local >= 0 && local < s.aimTime+.6) {
          const fire = local >= s.aimTime;
          if (fire && s.firedShot !== shot) { s.firedShot = shot; audio.play('laser'); }
          this.beam.set(this.eye,this.aim,fire,s.t);
          if (fire && !player.dead && this.beam.hits(player,.8)) player.hurt('angel',this.aim.x,this.aim.z);
        } else this.beam.hide();
      }
    }
  }
  stopSmog() {
    this.smog = null; this.fog.visible = false; this.fog.material.opacity = 0; this.beam.hide();
    for (const p of this.pedestals) { p.safe = true; p.destination = p.enabled ? 1.2 : 0; p.glow.material.opacity = 0; }
  }
  reset() { this.tiles.reset(); this.stopSmog(); for (const p of this.pedestals) p.setPhase(this.phase,true); }
  onRespawn() { this.reset(); }
}

export function buildConeArena(stage) {
  const arena = stage.add(new ConeArena(stage)); stage.coneArena = arena;
  return { coneArena: arena, tiles: arena.tiles, pedestals: arena.pedestals };
}
