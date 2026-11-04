import * as THREE from 'three';
import { Entity } from '../entities/entity.js';
import { Backpack, Cat, explode } from '../entities/breakables.js';
import { Assets } from '../art/assets.js';
import { toon } from '../player/nobuPrims.js';
import { audio } from '../audio/audio.js';
import { clamp } from '../core/util.js';
import { onCatStageDispose, materialSet, disposeMaterials, disposeProcedural } from './catResources.js';

class TableCat extends Cat {
  constructor(...args) { super(...args); this.ownedMaterials = materialSet(this.obj); }
  update(dt) {
    const previous = this.count.material.map; super.update(dt);
    if (previous !== this.count.material.map) previous.dispose();
  }
  retire() {
    this.hide(); this.obj.parent?.remove(this.obj);
    if (this.disposed) return; this.disposed = true;
    this.count.material.map.dispose(); disposeMaterials(this.ownedMaterials);
  }
  pounce() {
    if (this.dead) return;
    this.markBroken(); this.hide(); this.count.visible = false; audio.play('pounce');
    explode(this.stage, this.pos.x, this.pos.y + .4, this.pos.z, 2.3, { kind: 'flat', source: this, color: 0xffb070 });
    this.retire();
  }
}
class Catnip extends Entity {
  constructor(stage, x, z, use) {
    super(stage, x, 0, z); this.kind = 'catnip'; this.use = use;
    for (const [dx, dz, h] of [[0, 0, .9], [-.3, .1, .6], [.25, -.2, .7]]) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(.35, h, 6), toon(0x57de6a)); m.position.set(dx, h / 2, dz); this.obj.add(m);
    }
    this.setBox(1.1, 1.2, 1.1); this.t = 0;
  }
  update(dt) { this.t += dt; if (this.t >= .25) { this.t = 0; this.fx.sparkle(this.pos.x, .7, this.pos.z, { count: 1, color: 0x8aff80 }); } }
  retire() { this.dead = true; this.obj.visible = false; if (!this.disposed) { this.disposed = true; disposeProcedural(this.obj); } }
  onBite() { if (this.dead) return; this.retire(); this.use(); }
}

export function ghostConflicts(target, boss) {
  return boss.marker.visible && target.distanceTo(boss.marker.position) < 4.2;
}
function ghostModel() {
  const asset = Assets.model('model_ghost_cat', 1);
  const root = asset || new THREE.Mesh(new THREE.SphereGeometry(.8, 12, 8), toon(0x80ffff));
  const geometries = new Set(asset ? [] : [root.geometry]);
  const materials = new Set(), clones = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const clone = (source) => {
      if (!clones.has(source)) {
        const c = asset ? source.clone() : source; c.color?.setHex(0x80ffff); c.transparent = true; c.opacity = .45; c.depthWrite = false;
        clones.set(source, c); materials.add(c);
      }
      return clones.get(source);
    };
    o.material = Array.isArray(o.material) ? o.material.map(clone) : clone(o.material);
  });
  return { root, materials, geometries };
}
function retireGhost(g) {
  g.mesh.parent?.remove(g.mesh);
  if (g.disposed) return; g.disposed = true;
  disposeMaterials(g.materials); for (const geometry of g.geometries) geometry.dispose();
}

export class CatPowers {
  constructor(boss) {
    this.b = boss; this.ghosts = []; this.spawned = []; this.trails = []; this.catnipT = 0; this.catnipWait = 0;
    this.dot = new THREE.Mesh(new THREE.CircleGeometry(.6, 24), new THREE.MeshBasicMaterial({ color: 0xff2030, transparent: true, opacity: .95, depthWrite: false }));
    this.dot.rotation.x = -Math.PI / 2; this.dot.visible = false; boss.stage.scene.add(this.dot);
    this.silhouette = boss.rig.root.clone(true);
    this.silhouette.traverse((o) => { if (o.isMesh) { const list = Array.isArray(o.material) ? o.material : [o.material]; const cloned = list.map((m) => { const c = m.clone(); c.transparent = true; c.opacity = .3; c.depthWrite = false; c.blending = THREE.AdditiveBlending; return c; }); o.material = Array.isArray(o.material) ? cloned : cloned[0]; } });
    this.silhouette.visible = false; boss.stage.scene.add(this.silhouette); this.history = [];
    this.silhouetteMaterials = materialSet(this.silhouette);
    onCatStageDispose(boss.stage, () => this.dispose());
  }
  phase() { this.b.stage.catArena?.setPhase(this.b.phase); if (this.b.phase === 3 && !this.catnip) this.growCatnip(); }
  reset() {
    for (const g of this.ghosts) retireGhost(g);
    for (const e of this.spawned) { if (e.retire) e.retire(); else e.hide?.(); }
    this.catnip?.retire();
    this.ghosts = []; this.spawned = []; this.trails = []; this.lastLeap = null; this.recording = null;
    this.catnip = null; this.catnipT = 0; this.catnipWait = 0; this.dot.visible = false;
    this.silhouette.visible = false; this.history = []; this.mode = null;
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.reset();
    this.dot.parent?.remove(this.dot); this.silhouette.parent?.remove(this.silhouette);
    this.dot.geometry.dispose(); this.dot.material.dispose(); disposeMaterials(this.silhouetteMaterials);
  }
  freeSpot() {
    const b = this.b;
    for (const radius of [6, 7.5, 9]) for (let i = 0; i < 24; i++) {
      const a = i * Math.PI / 12, x = b.pos.x + Math.sin(a) * radius, z = b.pos.z + Math.cos(a) * radius;
      if (Math.abs(x) <= 9.5 && Math.abs(z) <= 9.5 && Math.hypot(x - b.player.pos.x, z - b.player.pos.z) > 1.5) return [x, z];
    }
    return null; // Retry later rather than grow a bush outside permanent ground.
  }
  growCatnip() {
    const p = this.freeSpot(); if (!p) return;
    this.catnip = this.b.stage.add(new Catnip(this.b.stage, ...p, () => {
      this.catnip = null; this.catnipT = 8; this.catnipWait = 20; audio.play('catnip');
    })); audio.play('chime');
  }
  recordLeap(from, target, duration, apex = 5) { this.lastLeap = { from: from.clone(), target: target.clone(), duration, apex }; }
  startLeap(from, target, duration, apex = 5) {
    this.recording = { from: from.clone(), target: target.clone(), duration, apex, samples: [{ t: 0, pos: from.clone() }] };
  }
  sampleLeap(time, position, complete = false) {
    const trace = this.recording; if (!trace) return;
    if (complete || time - trace.samples.at(-1).t >= 1 / 240) trace.samples.push({ t: time, pos: position.clone() });
    if (complete) { trace.duration = time; this.lastLeap = trace; this.recording = null; }
  }
  ghost() {
    if (!this.lastLeap || this.ghosts.length >= 2) return false;
    const leap = this.lastLeap, model = ghostModel(), mesh = model.root; mesh.position.copy(leap.from); this.b.stage.scene.add(mesh);
    this.ghosts.push({ ...leap, mesh, materials: model.materials, geometries: model.geometries, wait: 1.5, t: 0 }); audio.play('meow', 1.4); return true;
  }
  scratchStar() {
    const b = this.b;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, end = b.pos.clone().add(new THREE.Vector3(Math.sin(a) * 2.5, 0, Math.cos(a) * 2.5)); b.proj.scratch(b.pos, end, 3); }
  }
  trail(pr) { this.trails.push({ pr, previous: pr.mesh.position.clone() }); }
  update(dt) {
    const b = this.b;
    this.catnipT = Math.max(0, this.catnipT - dt);
    if (b.phase === 3 && !this.catnip) { this.catnipWait = Math.max(0, this.catnipWait - dt); if (!this.catnipWait) this.growCatnip(); }
    for (const g of [...this.ghosts]) {
      if (g.wait > 0) { g.wait -= dt; if (g.wait <= 0 && ghostConflicts(g.target, b)) g.wait = .5; if (g.wait > 0) continue; }
      if (ghostConflicts(g.target, b)) { g.wait = .5; continue; }
      g.t += dt; const k = Math.min(1, g.t / g.duration); if (g.samples) {
        let i = 1; while (i < g.samples.length - 1 && g.samples[i].t < g.t) i++;
        const a = g.samples[i - 1], c = g.samples[i];
        g.mesh.position.lerpVectors(a.pos, c.pos, Math.min(1, Math.max(0, (g.t - a.t) / (c.t - a.t))));
      } else { g.mesh.position.lerpVectors(g.from, g.target, k); g.mesh.position.y += Math.sin(k * Math.PI) * g.apex; }
      if (k >= 1) {
        if (!b.player.dead && Math.hypot(b.player.pos.x - g.target.x, b.player.pos.z - g.target.z) < 1.8 && b.player.pos.y - g.target.y < 1.4) b.player.hurt('flat', g.target.x, g.target.z);
        retireGhost(g); this.ghosts.splice(this.ghosts.indexOf(g), 1);
      }
    }
    for (const t of [...this.trails]) {
      const now = t.pr.mesh.position;
      if (now.distanceTo(t.previous) >= .35) { const a = t.previous.clone().setY(b.home.y), c = now.clone().setY(b.home.y); b.proj.scratch(a, c, 3); t.previous.copy(now); }
      if (t.pr.life <= 0 || !b.proj.list.includes(t.pr)) this.trails.splice(this.trails.indexOf(t), 1);
    }
    this.silhouette.visible = b.phase === 3;
    if (b.phase === 3) {
      this.history.push({ pos: b.pos.clone(), yaw: b.yaw, age: 0 }); for (const h of this.history) h.age += dt;
      while (this.history.length > 1 && this.history[1].age >= .15) this.history.shift();
      const old = this.history[0]; this.silhouette.position.copy(old.pos); this.silhouette.rotation.y = old.yaw; this.silhouette.scale.copy(b.rig.root.scale);
    }
    if (b.state === 'dot') { this.dotAttack(dt); return true; }
    if (b.state === 'table') { this.tableAttack(dt); return true; }
    return false;
  }
  begin(kind) {
    const b = this.b; b.setState(kind); this.mode = kind; this.t = 0;
    if (kind === 'dot') {
      this.waypoint = 0; this.step = 'move'; this.dot.position.copy(b.pos).addScaledVector(b.fwd, 2); this.dot.position.y = .06; this.dot.visible = true; this.nextWaypoint(); audio.play('beep');
    } else {
      this.step = 'up'; this.from = b.pos.clone(); this.ledge = b.stage.catArena?.ledges[b.pos.x < 0 ? 0 : 1] || { x: -9.5, y: 2.4, z: -10 }; this.dropCount = 0;
    }
  }
  nextWaypoint() {
    const b = this.b; this.waypoint++; this.from = this.dot.position.clone(); this.to = b.player.pos.clone();
    if (this.waypoint !== 4) this.to.addScaledVector(new THREE.Vector3(b.fwd.z, 0, -b.fwd.x), this.waypoint % 2 ? 3 : -3);
    if (this.waypoint !== 4) this.to.set(clamp(this.to.x, -11.5, 11.5), .06, clamp(this.to.z, -11.5, 11.5));
    else this.to.y = .06; // Final exact-player rule takes precedence over side-waypoint clamp.
    this.t = 0;
  }
  land() {
    const b = this.b; b.pos.y = b.home.y; b.marker.visible = false; audio.play('stomp');
    const hit = !b.player.dead && Math.hypot(b.player.pos.x - b.pos.x, b.player.pos.z - b.pos.z) < 2.4 && b.player.pos.y - b.pos.y < 1.6 && b.player.hurt('flat', b.pos.x, b.pos.z);
    if (b.phase >= 2) b.proj.shockwave(b.pos.x, b.pos.y, b.pos.z, 7 + b.phase, 8);
    return hit;
  }
  dotAttack(dt) {
    const b = this.b; this.t += dt;
    if (this.step === 'move') {
      const k = Math.min(1, this.t / (.7 / b.sp)); this.dot.position.lerpVectors(this.from, this.to, k); b.rig.pose('crouch', dt); b.faceTo(this.dot.position, dt);
      if (k >= 1) { if (this.waypoint % 2) this.nextWaypoint(); else { this.step = 'aim'; this.t = 0; this.target = this.to.clone().setY(b.home.y); } }
    } else if (this.step === 'aim') {
      const tell = b.tele(.55);
      if (this.waypoint === 4 && this.t < tell - .3) this.target.copy(b.player.pos).setY(b.home.y);
      this.dot.position.set(this.target.x, .06, this.target.z); b.marker.visible = true; b.marker.position.copy(this.dot.position); b.rig.pose('crouch', dt); b.faceTo(this.target, dt);
      if (this.t >= tell) { this.from = b.pos.clone(); this.step = 'leap'; this.t = 0; this.startLeap(this.from, this.target, .75 / b.sp); audio.play('pounce'); }
    } else {
      const k = Math.min(1, this.t / (.75 / b.sp)); b.pos.lerpVectors(this.from, this.target, k); b.pos.y = b.home.y + Math.sin(k * Math.PI) * 5; b.rig.pose('leap', dt, k);
      this.sampleLeap(this.t, b.pos, k >= 1);
      if (k >= 1) {
        const hit = this.land();
        if (this.waypoint < 4) { this.step = 'move'; this.nextWaypoint(); }
        else { this.dot.visible = false; b.wallBonus = Math.abs(b.pos.x) > 10.5 || Math.abs(b.pos.z) > 10.5; b.landT = .25; if (!hit || b.wallBonus) { b.setState('dizzy'); audio.play('dizzy'); } else b.finishAttack(); }
      }
    }
  }
  dropObject() {
    const b = this.b, tnt = this.dropCount === 1;
    let x = clamp(b.player.pos.x, -9.5, 9.5), z = clamp(b.player.pos.z, -9.5, 9.5);
    if (tnt) {
      const occupied = this.spawned.filter((e) => e instanceof TableCat && !e.dead);
      const candidates = [[x, z], ...Array.from({ length: 24 }, (_, i) => [Math.sin(i * Math.PI / 12) * 7, Math.cos(i * Math.PI / 12) * 7])];
      const safe = candidates.find(([cx, cz]) => occupied.every((e) => Math.hypot(e.pos.x - cx, e.pos.z - cz) >= 4.6));
      if (!safe) return; [x, z] = safe;
    }
    b.proj.falling(x, z, { kind: tnt ? 'cat' : 'backpack', delay: b.tele(.9), r: 1, onLand: () => {
      if (b.defeated) return;
      const e = tnt ? new TableCat(b.stage, x, 0, z) : new Backpack(b.stage, x, 0, z, { tickets: 0 });
      e.countable = false; b.stage.add(e); this.spawned.push(e); b.player.bitten?.add(e); if (tnt) { e.arm(); e.update(0); }
    } });
  }
  tableAttack(dt) {
    const b = this.b; this.t += dt;
    if (this.step === 'up' || this.step === 'down') {
      const k = Math.min(1, this.t / (.75 / b.sp)); const target = this.step === 'up' ? new THREE.Vector3(this.ledge.x, 2.4, this.ledge.z) : new THREE.Vector3(0, 0, 0);
      b.pos.lerpVectors(this.from, target, k); b.pos.y += Math.sin(k * Math.PI) * 5; b.rig.pose('leap', dt, k);
      if (k >= 1) { this.step = this.step === 'up' ? 'bat' : 'lag'; this.t = 0; }
    } else if (this.step === 'bat') {
      b.rig.pose('bat', dt, Math.min(1, this.t / b.tele(.5))); b.faceTo(b.player.pos, dt);
      if (this.t >= b.tele(.5)) { this.dropObject(); this.dropCount++; this.step = 'wait'; this.t = 0; }
    } else if (this.step === 'wait') {
      b.rig.pose('sit', dt);
      if (this.t >= (this.dropCount >= (b.phase === 3 ? 4 : 3) ? b.tele(.9) : .7 - b.tele(.5))) {
        if (this.dropCount >= (b.phase === 3 ? 4 : 3)) { this.step = 'down'; this.from = b.pos.clone(); } else this.step = 'bat'; this.t = 0;
      }
    } else { b.rig.pose('land', dt); if (this.t >= .8) b.finishAttack(); }
  }
}
