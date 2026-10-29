// Replay secrets: Bark Rocks (only the Mega Bark cracks them), the Good Boy Route (golden paw platforms that
// appear only if Nobu reaches them without dying), colored bone paths (a bone found in a later stage makes them
// solid), Treat Trays (bonus rounds up in the sky), warp-pit sparkles and the time-trial Freeze Packs.
import * as THREE from 'three';
import { Entity } from './entity.js';
import { Backpack, OneUp } from './breakables.js';
import { Solid } from '../world/physics.js';
import { toon } from '../player/nobuPrims.js';
import { audio } from '../audio/audio.js';
import { textSprite } from './fx.js';
import { rand, canvasTex } from '../core/util.js';

// ---------- Bark Rock: a cracked boulder with a prize inside. Only a Mega Bark shatters it ----------
export class BarkRock extends Entity {
  constructor(stage, x, y, z, { prize = 'oneup', tickets = 10 } = {}) {
    super(stage, x, y, z);
    this.prize = prize;
    this.tickets = tickets;
    const geo = new THREE.DodecahedronGeometry(1.05, 1);
    const pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const k = 0.9 + Math.random() * 0.18; pa.setXYZ(i, pa.getX(i) * k, pa.getY(i) * k * 0.85, pa.getZ(i) * k); }
    geo.computeVertexNormals();
    this.rock = new THREE.Mesh(geo, toon(0x8a7a6a));
    this.rock.position.y = 0.85;
    this.rock.castShadow = true;
    this.obj.add(this.rock);
    // glowing cracks: something shiny is inside
    const crackM = new THREE.MeshBasicMaterial({ color: 0xffd23f });
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.05, rand(0.35, 0.7), 0.05), crackM);
      const a = (i / 6) * Math.PI * 2 + rand(-0.3, 0.3);
      c.position.set(Math.cos(a) * 0.9, 0.85 + rand(-0.3, 0.3), Math.sin(a) * 0.9);
      c.rotation.set(rand(-0.6, 0.6), a, rand(-0.6, 0.6));
      this.obj.add(c);
    }
    this.setBox(2, 1.8, 2);
    this.solid = stage.world.add(new Solid({ x: x - 0.9, y, z: z - 0.9 }, { x: x + 0.9, y: y + 1.6, z: z + 0.9 }, { kind: 'static', ref: this }));
    this.t = rand(0, 5);
  }
  update(dt) {
    this.t += dt;
    if (this.distToPlayer() < 7) this.game.ui.tutorial('barkrock');
    if (Math.random() < dt * 1.5) this.fx.sparkle(this.pos.x + rand(-0.8, 0.8), this.pos.y + rand(0.4, 1.4), this.pos.z + rand(-0.8, 0.8), { count: 1, color: 0xffe680, size: 0.4, speed: 0.5, up: 1 });
  }
  _thunk(p) {
    audio.play('knock');
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1;
    p.vel.x = (dx / d) * 4; p.vel.z = (dz / d) * 4;
  }
  onBite(p) { this._thunk(p); }
  onSlide(p) { this._thunk(p); }
  onBark() {
    if (this.dead) return;
    this.dead = true;
    this.obj.visible = false;
    this.solid.enabled = false;
    const p = this.pos;
    this.fx.burst(p.x, p.y + 0.9, p.z, { count: 22, colors: [0x8a7a6a, 0x6a5a4a, 0xa89888, 0xffd23f], speed: 6, size: 0.3, floor: p.y });
    this.fx.puff(p.x, p.y + 0.8, p.z, { count: 10, size: 0.8, color: 0xc8b8a8, speed: 3 });
    audio.play('break');
    audio.play('oneUp');
    this.game.camera.shake(0.3, 0.25);
    if (this.prize === 'oneup') {
      const u = new OneUp(this.stage, p.x, p.y + 0.2, p.z);
      u.countable = false;
      u.obj.rotation.y = this.obj.rotation.y;
      this.stage.add(u);
    }
    this.game.tickets.spawnFlying(p.x, p.y + 1.2, p.z, this.tickets);
    this.game.ui.banner('SECRET!', 'The rock had treasure inside', 1.4);
  }
}

// ---------- Good Boy Route: golden paw platforms that rise only for a dog with no deaths yet ----------
const pawTex = {};
function pawTexture(base = '#ffd23f', paw = '#f0a020') {
  return (pawTex[base] ||= canvasTex(128, 128, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 128, 128);
    g.fillStyle = paw;
    g.beginPath(); g.ellipse(64, 76, 24, 20, 0, 0, 7); g.fill();
    for (const [x, y] of [[34, 46], [52, 32], [76, 32], [94, 46]]) { g.beginPath(); g.arc(x, y, 10, 0, 7); g.fill(); }
    g.strokeStyle = '#fff6c8'; g.lineWidth = 8; g.strokeRect(4, 4, 120, 120);
  }));
}
export const BONE_COLORS = { red: { base: '#ff5a5a', paw: '#b82020', hex: 0xff4040, name: 'RED' }, blue: { base: '#5ab0ff', paw: '#1a5ab8', hex: 0x3a9aff, name: 'BLUE' } };
export class GoodBoyRoute extends Entity {
  // plats: [{ x, y, z, w, d, yaw }] in world space; top: index of the platform that pays out the jackpot
  // color: a colored-bone path (BONE_COLORS key); unlocked paths rise as soon as Nobu comes near, locked ones
  // stay as see-through ghosts you can't stand on
  constructor(stage, plats, { jackpot = 12, oneUp = true, color = null, unlocked = false } = {}) {
    super(stage, plats[0].x, plats[0].y, plats[0].z);
    this.alwaysActive = true;
    this.interactive = false;
    this.jackpot = jackpot;
    this.oneUp = oneUp;
    this.color = color;
    this.autoReveal = !!color && unlocked;
    const C = color ? BONE_COLORS[color] : null;
    const top = new THREE.MeshLambertMaterial({ map: C ? pawTexture(C.base, C.paw) : pawTexture(), emissive: C ? C.hex & 0x3f3f3f : 0x3a2a00 });
    const side = toon(C ? C.hex : 0xd89a20);
    this.plats = plats.map((p) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.4, p.d), [side, side, top, side, side, side]);
      mesh.position.set(p.x, p.y - 0.2, p.z);
      mesh.rotation.y = p.yaw || 0;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.visible = false;
      stage.scene.add(mesh);
      const c = Math.abs(Math.cos(p.yaw || 0)), s = Math.abs(Math.sin(p.yaw || 0));
      const hx = (p.w * c + p.d * s) * 0.46, hz = (p.w * s + p.d * c) * 0.46;
      const solid = stage.world.add(new Solid({ x: p.x - hx, y: p.y - 0.4, z: p.z - hz }, { x: p.x + hx, y: p.y, z: p.z + hz }, { kind: 'static' }));
      solid.enabled = false;
      return { ...p, mesh, solid };
    });
    this.revealed = false;
    this.paid = false;
    this.t = -1;
    if (color && !unlocked) {
      // locked: faint ghosts of the path and a hint of which bone opens it
      for (const p of this.plats) {
        p.mesh.visible = true;
        p.mesh.material = new THREE.MeshBasicMaterial({ color: C.hex, transparent: true, opacity: 0.18, depthWrite: false });
      }
      const sign = textSprite(`${C.name} BONE`, { color: C.base, size: 60, w: 320, h: 96 });
      sign.scale.set(2.4, 0.72, 1);
      sign.position.set(plats[0].x, plats[0].y + 1.4, plats[0].z);
      sign.material.depthTest = true;
      stage.scene.add(sign);
    }
  }
  reveal() {
    if (this.revealed) return;
    this.revealed = true;
    this.t = 0;
    audio.play('oneUp');
    if (this.color) this.game.ui.banner(`${BONE_COLORS[this.color].name} BONE PATH!`, 'The bone you found opened it', 1.8);
    else this.game.ui.banner('GOOD BOY ROUTE!', 'No deaths yet: a secret path appears', 2);
  }
  update(dt) {
    if (this.autoReveal && !this.revealed && this.distToPlayer() < 14) this.reveal();
    if (this.t < 0) return;
    this.t += dt;
    // platforms rise one after another out of a burst of sparkles
    this.plats.forEach((p, i) => {
      const k = Math.min(1, Math.max(0, (this.t - i * 0.3) / 0.45));
      if (k <= 0) return;
      if (!p.mesh.visible) { p.mesh.visible = true; this.fx.sparkle(p.x, p.y, p.z, { count: 12, color: 0xffd23f, size: 0.6, speed: 3 }); audio.play('tick'); }
      const e = 1 - Math.pow(1 - k, 3);
      p.mesh.position.y = p.y - 0.2 - (1 - e) * 2.5;
      p.mesh.scale.setScalar(0.3 + e * 0.7);
      if (k >= 1 && !p.solid.enabled) {
        p.solid.enabled = true;
        if (i === this.plats.length - 1 && this.oneUp) {
          const u = new OneUp(this.stage, p.x, p.y, p.z);
          u.countable = false;
          this.stage.add(u);
        }
      }
    });
    // jackpot when Nobu stands on the last platform
    const last = this.plats[this.plats.length - 1];
    const pl = this.player;
    if (!this.paid && last.solid.enabled && pl.body.grounded && pl.body.ground === last.solid) {
      this.paid = true;
      this.game.tickets.spawnFlying(last.x, last.y + 1, last.z, this.jackpot);
      this.fx.sparkle(last.x, last.y + 0.8, last.z, { count: 24, color: 0xffd23f, size: 0.8, speed: 5 });
      audio.play('checkpoint');
    }
  }
}

// ---------- Freeze Pack (time trials only): break it to stop the clock for 1-3 seconds ----------
export class FreezePack extends Backpack {
  constructor(stage, x, y, z, { secs = 2 } = {}) {
    super(stage, x, y, z, { tickets: 1 });
    this.kind = 'freeze';
    this.secs = secs;
    this.countable = false;
    const ice = new THREE.MeshPhongMaterial({ color: 0x8adcff, emissive: 0x1a4a6a, shininess: 110, specular: 0xffffff, transparent: true, opacity: 0.92 });
    this.model.traverse((o) => { if (o.isMesh && o !== this.model.children[1]) o.material = ice; });
    const label = textSprite(`${secs}`, { color: '#ffffff', size: 110, w: 128, h: 128 });
    label.scale.setScalar(0.6);
    label.position.set(0, 1.45, 0);
    label.material.depthTest = true;
    this.obj.add(label);
    this.label = label;
  }
  update(dt) {
    super.update(dt);
    this.label.position.y = 1.45 + Math.sin(this.t * 3) * 0.08;
    if (Math.random() < dt * 3) this.fx.sparkle(this.pos.x + rand(-0.5, 0.5), this.pos.y + rand(0.3, 1.1), this.pos.z + rand(-0.5, 0.5), { count: 1, color: 0xbff0ff, size: 0.35, speed: 0.4 });
  }
  break(player, how) {
    if (this.broken) return;
    super.break(player, how);
    this.session.freezeClock?.(this.secs);
    this.fx.sparkle(this.pos.x, this.pos.y + 0.8, this.pos.z, { count: 18, color: 0xbff0ff, size: 0.6, speed: 4 });
  }
}

// ---------- Colored Bone: a collectible hidden in a later stage that opens a path in an earlier one ----------
export class ColorBone extends Entity {
  constructor(stage, x, y, z, { color = 'red' } = {}) {
    super(stage, x, y, z);
    this.color = color;
    const C = BONE_COLORS[color];
    const m = new THREE.MeshPhongMaterial({ color: C.hex, emissive: C.hex & 0x5f5f5f, shininess: 100, specular: 0xffffff });
    this.bone = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.8, 10), m);
    shaft.rotation.z = Math.PI / 2;
    this.bone.add(shaft);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), m); k.position.set(sx * 0.42, sy * 0.12, 0); this.bone.add(k); }
    this.bone.position.y = 1.0;
    this.obj.add(this.bone);
    this.setBox(1.1, 1.4, 1.1, 0.3);
    this.t = 0;
  }
  update(dt) {
    this.t += dt;
    this.bone.rotation.y = this.t * 2.2;
    this.bone.position.y = 1.0 + Math.sin(this.t * 2.5) * 0.15;
    if (Math.random() < dt * 5) this.fx.sparkle(this.pos.x + rand(-0.4, 0.4), this.pos.y + 1 + rand(-0.3, 0.4), this.pos.z + rand(-0.4, 0.4), { count: 1, color: BONE_COLORS[this.color].hex, size: 0.45, speed: 0.5, up: 1 });
  }
  collect() {
    if (this.dead) return;
    this.dead = true;
    this.obj.visible = false;
    this.game.collectBone?.(this.color);
    this.fx.sparkle(this.pos.x, this.pos.y + 1, this.pos.z, { count: 26, color: BONE_COLORS[this.color].hex, size: 0.8, speed: 5 });
  }
  onTouch() { this.collect(); }
  onBite() { this.collect(); }
  onStomp() { this.collect(); }
  onSlide() { this.collect(); }
}

// ---------- Treat Tray: hop in for a bonus round up in the sky ----------
// Fall off and the haul is lost (no life lost); reach the exit tray to keep it.
export class TreatTray extends Entity {
  constructor(stage, x, y, z, { exit = false, round = null } = {}) {
    super(stage, x, y, z);
    this.exit = exit;
    this.round = round; // session bonus-round definition (entry trays only)
    const gold = new THREE.MeshPhongMaterial({ color: exit ? 0x7dff8a : 0xffc21a, specular: 0xffffff, shininess: 90 });
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.9, 0.45, 28, 1, true), gold);
    bowl.position.y = 0.22;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 28), gold);
    base.position.y = 0.04;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.08, 8, 30), gold);
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.45;
    this.obj.add(bowl, base, rim);
    // treats heaped inside
    const treatM = toon(0xc8894a);
    for (let i = 0; i < 9; i++) {
      const tr = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.22, 4, 8), treatM);
      const a = rand(0, Math.PI * 2), r = rand(0, 0.7);
      tr.position.set(Math.cos(a) * r, 0.18 + rand(0, 0.12), Math.sin(a) * r);
      tr.rotation.set(Math.PI / 2, 0, rand(0, 3));
      this.obj.add(tr);
    }
    this.label = textSprite(exit ? 'EXIT' : 'BONUS', { color: exit ? '#7dff8a' : '#ffd23f', size: 80, w: 256, h: 96 });
    this.label.scale.set(1.8, 0.68, 1);
    this.label.position.y = 1.9;
    this.label.material.depthTest = true;
    this.obj.add(this.label);
    this.setBox(2.2, 1.0, 2.2);
    this.t = rand(0, 4);
    this.used = false;
  }
  update(dt) {
    this.t += dt;
    this.label.position.y = 1.9 + Math.sin(this.t * 3) * 0.1;
    if (Math.random() < dt * 4) this.fx.sparkle(this.pos.x + rand(-1, 1), this.pos.y + rand(0.3, 1.2), this.pos.z + rand(-1, 1), { count: 1, color: this.exit ? 0x7dff8a : 0xffe680, size: 0.4, speed: 0.4, up: 1.5 });
  }
  onTouch(p) {
    if (this.used || p.dead || p.frozen) return;
    if (this.exit) { this.used = true; this.session.finishBonusRound?.(); }
    else if (!this.session.bonusRound && !this.session.trial) this.session.enterBonusRound?.(this);
  }
  onStomp(p) { this.onTouch(p); }
  onSlide(p) { this.onTouch(p); }
  onBite() {}
}

// ---------- Warp sparkle: a faint glitter marking the secret warp at the bottom of a pit ----------
export class WarpSparkle extends Entity {
  constructor(stage, x, y, z) {
    super(stage, x, y, z);
    this.interactive = false;
    this.t = 0;
  }
  update(dt) {
    this.t += dt;
    if (Math.random() < dt * 5) this.fx.sparkle(this.pos.x + rand(-0.7, 0.7), this.pos.y + rand(-1.5, 0.3), this.pos.z + rand(-0.7, 0.7), { count: 1, color: 0xb98aff, size: 0.35, speed: 0.3, up: 1.2, life: 1 });
  }
}
