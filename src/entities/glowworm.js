// Lumi the glowworm (Glowworm Grotto bonus stage): follows Nobu and lights a circle around him.
// The glow slowly fades; when it runs out Lumi flies ahead to the next glow nest and waits there as a
// faint beacon, so Nobu has to cross the dark to fetch it. Passing a nest with Lumi tops the glow up.
import * as THREE from 'three';
import { Entity } from './entity.js';
import { audio } from '../audio/audio.js';
import { damp, rand } from '../core/util.js';

const LIFE = 16; // seconds of light from a full glow
const GREEN = 0xd8ff8a;

let glowTex;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,220,1)'); r.addColorStop(0.25, 'rgba(210,255,140,0.75)'); r.addColorStop(1, 'rgba(160,255,120,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

export class Glowworm extends Entity {
  constructor(stage, track, nests) {
    super(stage, 0, 0, 0);
    this.track = track;
    this.alwaysActive = true;
    this.interactive = false;
    // nests: track distances where Lumi rests and refuels
    this.nests = nests.slice().sort((a, b) => a - b).map((d) => ({ d, pos: track.toWorld(d, 2.6, 0, new THREE.Vector3()), used: -99 }));
    this.nests.forEach((n) => { n.pos.y = (track.groundAt(n.d, 2.6)?.y ?? track.heightAt(n.d)); });
    // body: three glowing segments and a head with eyes
    // beacon visuals ignore the black fog so Lumi can be spotted from far down the cave
    const mat = new THREE.MeshBasicMaterial({ color: GREEN, fog: false });
    this.worm = new THREE.Group();
    this.segs = [0.1, 0.12, 0.13, 0.15].map((r, i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat);
      m.position.x = -i * 0.17;
      this.worm.add(m);
      return m;
    });
    const eyeM = new THREE.MeshBasicMaterial({ color: 0x1a0a24 });
    for (const sz of [-0.06, 0.06]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), eyeM); e.position.set(0.1, 0.06, sz); this.segs[0].add(e); }
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: GREEN, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.halo.scale.setScalar(2.2);
    this.worm.add(this.halo);
    this.obj.add(this.worm);
    this.light = new THREE.PointLight(0xe0ffb0, 0, 0, 1.6);
    stage.scene.add(this.light);
    // the nests: glowing mushroom clusters
    const capM = new THREE.MeshBasicMaterial({ color: 0x8affc8, fog: false }), stemM = new THREE.MeshBasicMaterial({ color: 0xd8f0e8, fog: false });
    for (const n of this.nests) {
      const g = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const h = rand(0.25, 0.6), r = rand(0.14, 0.26);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, h, 6), stemM); stem.position.y = h / 2;
        const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), capM); cap.position.y = h;
        const m = new THREE.Group(); m.add(stem, cap);
        m.position.set(rand(-0.4, 0.4), 0, rand(-0.4, 0.4));
        g.add(m);
      }
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x8affc8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6, fog: false }));
      glow.scale.setScalar(2.4); glow.position.y = 0.5;
      g.add(glow);
      g.position.copy(n.pos);
      stage.scene.add(g);
      n.glow = glow;
    }
    this.t = 0;
    this.respawn();
  }

  respawn() {
    this.state = 'follow';
    this.energy = 1;
    this.flyT = 0;
    this.warned = false;
    const p = this.game.player.pos;
    this.pos.set(p.x, p.y + 1.9, p.z);
  }
  onRespawn() { this.respawn(); }

  get radius() { return this.state === 'wait' ? 4 : 3 + 10 * this.energy; }

  update(dt) {
    this.t += dt;
    const p = this.player;
    const ps = p.body.s ?? 0;
    if (this.state === 'follow') {
      if (!p.dead) this.energy = Math.max(0, this.energy - dt / LIFE);
      // hover over Nobu's shoulder, lagging a little
      const f = this.track.tangent(ps, new THREE.Vector3());
      const tx = p.pos.x - f.z * 0.7 - f.x * 0.4, tz = p.pos.z + f.x * 0.7 - f.z * 0.4, ty = p.pos.y + 2.0 + Math.sin(this.t * 3) * 0.15;
      this.pos.set(damp(this.pos.x, tx, 6, dt), damp(this.pos.y, ty, 6, dt), damp(this.pos.z, tz, 6, dt));
      // refuel at nests
      for (const n of this.nests) {
        if (this.t - n.used > 6 && this.pos.distanceTo(n.pos) < 4.5 && this.energy < 0.95) {
          n.used = this.t; this.energy = 1; this.warned = false;
          audio.play('chime');
          this.fx.sparkle(this.pos.x, this.pos.y, this.pos.z, { count: 14, color: GREEN, size: 0.5 });
        }
      }
      if (this.energy < 0.2 && !this.warned) { this.warned = true; this.game.ui.banner('LUMI IS FADING...', 'Find a glow nest!', 1.8); }
      if (this.energy <= 0) {
        // out of glow: fly to the next nest ahead and wait there
        this.target = (this.nests.find((n) => n.d > ps + 3) || this.nests[this.nests.length - 1]).pos;
        this.from = this.pos.clone();
        this.state = 'fly';
        this.flyT = 0;
        audio.play('fade');
      }
    } else if (this.state === 'fly') {
      this.flyT += dt / 1.6;
      const k = Math.min(1, this.flyT);
      const e = k * k * (3 - 2 * k);
      this.pos.lerpVectors(this.from, this.target, e);
      this.pos.y += Math.sin(k * Math.PI) * 3 + 1.0 * e;
      if (k >= 1) this.state = 'wait';
    } else if (this.state === 'wait') {
      this.pos.set(this.target.x, this.target.y + 1.0 + Math.sin(this.t * 2.2) * 0.12, this.target.z);
      if (!p.dead && p.pos.distanceTo(this.pos) < 2.4) {
        this.state = 'follow'; this.energy = 1; this.warned = false;
        audio.play('chime');
        this.fx.sparkle(this.pos.x, this.pos.y, this.pos.z, { count: 20, color: GREEN, size: 0.6 });
      }
    }
    // light: radius and brightness follow the glow, with a nervous flicker when it is nearly gone
    const flick = this.state === 'follow' && this.energy < 0.2 ? (Math.random() < 0.15 ? 0.4 : 1) : 1;
    const r = this.radius;
    this.light.distance = r * 1.6;
    this.light.intensity = (this.state === 'wait' ? 6 : 10 + 30 * this.energy) * flick;
    this.light.position.copy(this.pos);
    this.halo.scale.setScalar((this.state === 'wait' ? 1.4 : 1.4 + this.energy * 1.4) * (0.9 + Math.sin(this.t * 6) * 0.1));
    // wiggle the body and face the way it is moving
    this.segs.forEach((s, i) => { s.position.y = Math.sin(this.t * 8 - i * 0.9) * 0.05; s.position.z = Math.sin(this.t * 5 - i * 0.7) * 0.04; });
    this.worm.rotation.y = Math.atan2(-(p.pos.z - this.pos.z), p.pos.x - this.pos.x) + Math.PI;
    for (const n of this.nests) n.glow.material.opacity = 0.45 + Math.sin(this.t * 2 + n.d) * 0.15;
    this.obj.position.copy(this.pos);
  }
}
