// Kept separate from the large kit so parallel helper work has one integration point.
import * as THREE from 'three';
import { Entity } from '../entities/entity.js';
import { Chaser } from '../entities/chaser.js';
import { CamZone, DarkZone, RisingHazard, checkpointS } from '../entities/environment.js';
import { audio } from '../audio/audio.js';

const overlap = (a, b, c, d) => a <= d && b >= c;
export function validateDetours(stage) {
  const tr = stage.track;
  for (const detour of stage.detours || []) {
    if (detour.y < 0) {
      for (const water of tr.waters) if (overlap(detour.entryD, detour.exitD, water.d0, water.d1) && detour.y <= water.y) throw new Error('Detour is below the water death plane');
      for (const e of stage.entities) if (e instanceof RisingHazard && overlap(detour.entryD, detour.exitD, e.d0, e.d1) && detour.y <= e.y1) throw new Error('Detour is below a rising death plane');
    }
    if (detour.loop) continue;
    const [a, b] = detour.skipSpan;
    for (const chase of stage.entities) if (chase instanceof Chaser && overlap(a, b, chase.d0, chase.d1)) throw new Error('Chase detours must be loops');
    for (const stretch of [...(stage.rideStretches || []), ...(stage.raftStretches || []), ...(stage.autoScrollStretches || [])]) {
      if (overlap(a, b, stretch.d0, stretch.d1)) throw new Error('Ride/raft/autoscroll detours must be loops');
    }
    if (stage.ride || stage.game.session?.ride || stage.game.player?.ride) throw new Error('Ride detours must be loops');
    for (const e of stage.entities) {
      if (e === detour) continue;
      const d0 = e.d0 ?? (e.pos && tr.project(e.pos.x, e.pos.z).s), d1 = e.d1 ?? d0;
      if (!overlap(a, b, d0, d1)) continue;
      if (e instanceof RisingHazard || ['RugPull', 'BoxGauntlet'].includes(e.constructor.name)) throw new Error('Detour skips a one-way hazard');
    }
    // A return needs a permanent route: crumble/fall boxes alone never count as ground.
    let lastY = null, gap = 0;
    for (let s = b; s >= a; s -= .5) {
      const ground = tr.groundAt(s, 0);
      let y = ground?.y ?? null;
      if (y === null) {
        const p = tr.toWorld(s);
        for (const solid of stage.world.all) {
          if (detour.solids.has(solid) || !solid.enabled || solid.kind !== 'static' || (solid.ref && solid.ref.constructor.name !== 'Lunchbox')) continue;
          if (p.x >= solid.min.x && p.x <= solid.max.x && p.z >= solid.min.z && p.z <= solid.max.z) y = Math.max(y ?? -Infinity, solid.max.y);
        }
      }
      if (y === null && stage.entities.some(e => {
        if (!['CrumblePlatform','FallBox'].includes(e.constructor.name) || !e.solid) return false;
        const a = tr.project(e.solid.min.x,e.solid.min.z).s, b = tr.project(e.solid.max.x,e.solid.max.z).s;
        return s >= Math.min(a,b)-.5 && s <= Math.max(a,b)+.5;
      })) throw new Error('Detour skips a crumble/fall-box-only crossing');
      if (y === null) { gap += .5; if (gap > 6.5) throw new Error('Detour skipped stretch cannot be walked back'); continue; }
      if (lastY !== null && y - lastY > 3.9) throw new Error('Detour skipped stretch cannot be walked back');
      gap = 0; lastY = y;
    }
    if (gap > 0) throw new Error('Detour skipped stretch cannot be walked back');
  }
  return true;
}

export class Detour extends Entity {
  constructor(stage, track, entryD, exitD, { y, entry = 'pipe', x = 0 }) {
    super(stage, ...track.toWorld(entryD, x).toArray());
    this.track = track; this.entryD = entryD; this.exitD = exitD; this.y = y; this.entry = entry;
    this.loop = Math.abs(exitD - entryD) <= 2; this.skipSpan = this.loop ? null : [Math.min(entryD, exitD), Math.max(entryD, exitD)];
    this.interactive = false; this.alwaysActive = true; this.solids = new Set(); this.returnLegs = []; this.busy = false; this.cameraActive = false; this.epoch = 0;
    this.startPos = track.toWorld(entryD, x, y); this.exitPos = null;
    const mat = new THREE.MeshLambertMaterial({ color: entry === 'flap' ? 0x866044 : 0x7f9297 });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(.7, .7, 1.4, 16, 1, true), mat); mesh.position.y = .7; this.obj.add(mesh);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(.65, 16), new THREE.MeshBasicMaterial({ color: 0x10141b, side: THREE.DoubleSide })); hole.rotation.x = -Math.PI / 2; hole.position.y = 1.4; this.obj.add(hole);
    this.lid = new THREE.Mesh(new THREE.CylinderGeometry(.72, .72, .16, 16), mat); this.lid.position.y = 1.42; this.obj.add(this.lid);
    this.cameraOpts = { track, height: 6.6, dist: 12.5, behind: .5 };
  }
  async travel(to, facingD) {
    if (this.busy || this.player.dead) return;
    this.busy = true; const p = this.player, epoch = this.epoch; p.frozen = true;
    try {
      await this.game.ui.fade(1, .25);
      if (this.epoch !== epoch || p.dead || (this.game.stage && this.game.stage !== this.stage)) return;
      p.spawnAt(to, this.track.yaw(facingD)); p.frozen = true;
      const projection = this.track.project(to.x,to.z,-1,this._travelProjection ||= {}); p.body.s = projection.s; p.body.u = projection.u;
      this.game.camera.snap(p); audio.play('whoosh');
      await this.game.ui.fade(0, .25);
    } finally { if (this.epoch === epoch) { p.frozen = false; this.busy = false; } }
  }
  camera(s, y, ground, force = false) {
    let inLeg = false; for (const leg of this.returnLegs) if (s >= leg.d0 && s <= leg.d1 && leg.solids.has(ground)) inLeg = true;
    const active = inLeg && y >= this.track.heightAt(s) + this.y - 1;
    if (!force && active === this.cameraActive) return;
    this.cameraActive = active;
    if (active) this.game.camera.setMode('trackFront', this.cameraOpts);
    else if (this.game.camera.opts === this.cameraOpts && this.stage.defaultCamera) { const c = this.stage.defaultCamera; this.game.camera.setMode(c.mode, c); }
  }
  update() {
    if (!this.validated) { if (import.meta.env.DEV) validateDetours(this.stage); this.validated = true; }
    const p = this.player, s = p.body.s ?? 0;
    this.lid.visible = !!this.session?.trial;
    this.camera(s, p.pos.y, p.body.ground);
    if (this.busy || p.dead) return;
    const near = p.pos.distanceToSquared(this.pos) < 2.5;
    if (near && !this.wasNear && this.entry === 'pipe') {
      if (this.session?.trial) audio.play('bonk'); else this.travel(this.startPos, this.entryD);
    }
    this.wasNear = near;

  }
  onRespawn() {
    this.epoch++; this.busy = false; this.wasNear = false; this.wasExit = false; this.cameraActive = false;
    const cp = this.session.cp.pos, s = checkpointS(this);
    // A checkpoint above a return platform restores its camera even before spawnAt resets body.ground.
    let ground = null;
    for (const solid of this.solids) if (cp.x >= solid.min.x && cp.x <= solid.max.x && cp.z >= solid.min.z && cp.z <= solid.max.z && Math.abs(cp.y - solid.max.y) < 1.5) ground = solid;
    this.camera(s, cp.y, ground, true);
  }
}

const Y_AT_1 = new Set(['platform','pack','sphere','oneUp','tramp','snacks','cat','rug','lint','zipped','vacSwitch','lunch','arrowBox','broc','spiky','trooper','squirrel','drone','vacuum','mouse','yarn','pill','knight','shellback','dog','bgDog','mover','crumble','lily','flip','cracked','mushroom','fan','hammer','crusher','boneSwitch','barkRock','colorBone','hiddenBone','mystery','dustWall','moonLedge','smogVent','zoomieGate','toaster','market','fallBox','slideBox','blinkBox','pitySnacks','pumpStone','dustBunny','toys','leg','sign','palm','bush','fern','flowers','rock','tuft','vent','post','yarnPile','pipe','vat','cones','ticker']);
export function installEnvironmentKit(k, game, stage, tickets, track, waterMaterial) {
  k.chase = (d0, d1, opts) => stage.add(new Chaser(stage, track, d0, d1, opts));
  k.camZone = (d0, d1, mode, opts) => stage.add(new CamZone(stage, track, d0, d1, mode, opts));
  k.dark = (d0, d1, opts) => stage.add(new DarkZone(stage, track, d0, d1, opts));
  k.rising = (d0, d1, opts) => stage.add(new RisingHazard(stage, track, d0, d1, { ...opts, material: waterMaterial(opts?.color ?? 0xffb070, opts?.w ?? 8.6) }));
  k.detour = (entryD, exitD, opts) => {
    if (typeof opts?.build !== 'function') throw new Error('Detour needs build(kd)');
    const detour = stage.add(new Detour(stage, track, entryD, exitD, opts));
    (stage.detours ||= []).push(detour);
    const before = stage.entities.length;
    const kd = Object.create(k), base = opts.y, autoSections = [];
    let bound0 = Math.min(entryD,exitD), bound1 = Math.max(entryD,exitD);
    const record = d => { if(Number.isFinite(d)){bound0=Math.min(bound0,d);bound1=Math.max(bound1,d);} };
    for (const name of Object.keys(k)) {
      if (typeof k[name] !== 'function') continue;
      if (Y_AT_1.has(name) || name === 'W') kd[name] = (...args) => { record(args[2]); args[1] = (args[1] ?? 0) + base; return k[name](...args); };
    }
    kd.floor = (a, b, o = {}) => {
      record(a); record(b);
      const dy = base + (o.y ?? 0), x = o.x ?? 0, w = o.w ?? 8.6;
      detour.floorCenter = x;
      if (base >= 8) {
        // Follow curved paths with small Solid slabs, leaving groundAt below untouched.
        const n = Math.max(1, Math.ceil(Math.abs(b - a) / 1.5)), result = [];
        for (let i = 0; i < n; i++) result.push(k.platform(x, dy, a + (b - a) * (i + .5) / n, w, Math.abs(b - a) / n + .08, o.depth ?? .6));
        return result;
      }
      if (base < 0 && track.spans.some(sp => overlap(a, b, sp.d0, sp.d1) && Math.abs(x - sp.u) < (w + sp.w) / 2 && track.spanDy(sp, Math.max(a, sp.d0)) > dy)) throw new Error('Burrow span would be covered by main-path ground');
      const entryBridge = Math.abs(b-a) <= 4 && [entryD,exitD].some(d => Math.min(a,b) >= d-2 && Math.max(a,b) <= d+2);
      if (base === 0 && !entryBridge && Math.abs(x) - w / 2 < 6.1) throw new Error('Side detour needs a 1.8m pit beyond the main floor');
      return k.floor(a, b, { ...o, y: dy });
    };
    if (k.zipline) kd.zipline = (x0,y0,d0,x1,y1,d1,o) => {record(d0);record(d1);return k.zipline(x0,y0+base,d0,x1,y1+base,d1,o);};
    if (k.spinDrum) kd.spinDrum = (d,o={}) => k.spinDrum(d,{...o,y:(o.y??0)+base});
    if (k.boneSwitch) kd.boneSwitch = (x,y,d,plats) => k.boneSwitch(x,y+base,d,plats.map(([x,y,d,...rest])=>[x,y+base,d,...rest]));
    if (k.fence) kd.fence = (x,a,b,y=0) => k.fence(x,a,b,y+base);
    kd.rising = (a,b,o) => k.rising(a,b,{...o,y0:o.y0+base,y1:o.y1+base});
    kd.packs = (list, y = 0) => list.forEach(([x, d]) => kd.pack(x, y, d));
    kd.stack = (x, y, d, h) => k.stack(x, y + base, d, h);
    kd.tix = (x0,y0,d0,x1,y1,d1,n) => k.tix(x0,y0+base,d0,x1,y1+base,d1,n);
    kd.tixArc = (x,y,d,x1,d1,h,n) => k.tixArc(x,y+base,d,x1,d1,h,n);
    kd.tixRing = (x,y,d,...rest) => k.tixRing(x,y+base,d,...rest);
    kd.start = (x,y,d) => {record(d);return detour.startPos.copy(k.W(x,y+base,d));};
    kd.exit = (x,y,d) => { record(d); detour.exitPos = k.W(x,y+base,d); return detour.exitPos; };
    kd.returnLeg = (a,b) => { if (a >= b) throw new Error('Return leg bounds must increase'); record(a);record(b);detour.returnLegs.push({d0:a,d1:b,from:stage.entities.length,solids:new Set()}); };
    kd.section = (...args) => {
      const [a,b,name] = args.length === 1 ? [Math.min(entryD,exitD),Math.max(entryD,exitD)+1,args[0]] : args;
      let section;
      if (k.section) section = k.section(a,b,name,{detour:true});
      else { section = { d0:a,d1:b,name,detour:true }; track.sections.push(section); (stage.sections ||= []).push(section); }
      if(args.length===1)autoSections.push(section);
      track.sections.sort((a,b)=>a.d0-b.d0);return section;
    };
    kd.dark = (a,b,o={}) => k.dark(a,b,{...o,minY:base-1,baseY:base,x:o.x??detour.floorCenter??0});
    kd.camZone = (a,b,mode,o={}) => k.camZone(a,b,mode,{...o,minY:base-1});
    const result = opts.build(kd);
    for(const section of autoSections){section.d0=bound0;section.d1=bound1+.001;}
    track.sections.sort((a,b)=>a.d0-b.d0);
    if (result?.start) detour.startPos.copy(result.start);
    const collect = (e,set) => { if(e.solid)set.add(e.solid); for(const part of e.parts || [])if(part.solid)set.add(part.solid); };
    for (const e of stage.entities.slice(before)) {
      e.detour = true;
      collect(e, detour.solids);
    }
    // returnLeg is the authoring marker between outbound and return platforms (L4/L5 examples).
    for (const leg of detour.returnLegs) for (const e of stage.entities.slice(leg.from)) collect(e,leg.solids);
    if (opts.entry === 'burrow') {
      const cracked = k.cracked(opts.x ?? 0, 0, entryD);
      const onLand = cracked.onLand.bind(cracked);
      cracked.onLand = (p) => { const broken = onLand(p); if (broken) detour.travel(detour.startPos, entryD); return broken; };
    }
    return detour;
  };
  return k;
}
