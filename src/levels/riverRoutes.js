import * as THREE from 'three';
import { Entity } from '../entities/entity.js';
import { Solid } from '../world/physics.js';
import { ownRiverRoot } from '../entities/riverResources.js';
import { audio } from '../audio/audio.js';
const authoredWorld=(track,...args)=>(track.authorToWorld||track.toWorld).call(track,...args);

// Cutaway warehouse panels are real collision, tiled along the curved river.
// Only the procedural panel resources are owned; kit and asset caches are borrowed.
export function riverPanels(stage, track, name) {
  const root = stage.add(new Entity(stage, 0, 0, 0));
  root.interactive = false; root.alwaysActive = true; root.kind = name;
  const material = new THREE.MeshLambertMaterial({ color: 0x718b83, transparent: true, opacity: .08, depthWrite: false });
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x526d65, transparent: true, opacity: .6 });
  const solids = [];
  const panel = (u, d, width, depth, bottom, top, outline = true) => {
    const pos = authoredWorld(track,d,u), yaw = track.yaw(d);
    const geometry = new THREE.BoxGeometry(width, top - bottom, depth);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(pos.x, (bottom + top) / 2, pos.z); mesh.rotation.y = yaw;
    root.obj.add(mesh);
    if (outline) {
      const frame = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), lineMaterial);
      frame.position.copy(mesh.position); frame.rotation.y = yaw; root.obj.add(frame);
    }
    const n = Math.ceil(width / .28), tile = width / n;
    const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
    const made = [];
    for (let i = 0; i < n; i++) {
      const p = authoredWorld(track,d,u-width/2+tile*(i+.5));
      const hx = (tile * c + depth * s) / 2, hz = (tile * s + depth * c) / 2;
      const solid = stage.world.add(new Solid({ x: p.x - hx, y: bottom, z: p.z - hz }, { x: p.x + hx, y: top, z: p.z + hz }, { ref: root }));
      solids.push(solid); made.push(solid);
    }
    return made;
  };
  return { root, solids, panel, finish: () => ownRiverRoot(stage, root.obj) };
}

export function buildRiverTimingCase(stage, track, { start, end, width, exitRise = 0 }) {
  const boxes = stage.timedBoxes.filter(b => b.d > start && b.d < end).sort((a, b) => a.d - b.d);
  if (!boxes.length) throw new Error('A river timing case needs its authored boxes');
  const lastTop = boxes.at(-1).entity.solid.max.y;
  const exitTop = exitRise ? lastTop + exitRise : track.heightAt(end) + 2;
  const ceiling = Math.max(...boxes.map(b => b.entity.solid.max.y + (b.kind === 'arrow' ? 4.5 : 2.1)), exitTop + 1.5);
  const shell = riverPanels(stage, track, 'river-timing-shell');
  const base = Math.min(track.heightAt(start), track.heightAt(end)) - 20;
  for (let d = start - .5; d <= end; d += .65) {
    shell.panel(0, d, width + .4, .85, ceiling, ceiling + .3, d === start - .5);
    for (const x of [-width / 2, width / 2]) shell.panel(x, d, .3, .85, base, track.heightAt(d) + 24, false);
  }
  for (const b of boxes) if (b.kind !== 'arrow') shell.panel(0, b.d, width + .4, .1, b.entity.solid.max.y + 1.65, ceiling + .3);
  const exitSolids = shell.panel(0, end, width + .4, .35, base, exitTop);
  shell.panel(0, end, width + .4, .35, ceiling, track.heightAt(end) + 24);
  shell.panel(0, start - .5, width + .4, .3, ceiling, track.heightAt(start) + 24);
  shell.finish();
  return { ...shell, boxes, start, end, exitTop, ceiling, exitSolids };
}

export class RiverLoop extends Entity {
  constructor(stage, detour, { end, returnU = 0 }) {
    super(stage, ...detour.pos.toArray());
    this.detour = detour; this.end = end; this.returnU = returnU;
    this.interactive = false; this.alwaysActive = true; this.active = false;
    this.originSession = this.session;
    detour.travel = (to, facingD) => this.travel(to, facingD);
  }
  async travel(to, facingD) {
    const d = this.detour, p = this.player, game = this.game, session = this.originSession;
    if (d.busy || p.dead || session.disposed || this.stage.disposed || game.session !== session || game.stage !== this.stage) return;
    const entry = to === d.startPos, epoch = d.epoch;
    d.busy = true; p.frozen = true; this.active = entry;
    const current = () => d.epoch === epoch && !p.dead && !session.disposed && !this.stage.disposed && game.session === session && game.stage === this.stage;
    try {
      await game.ui.fade(1, .25);
      if (!current()) return;
      p.setRide(null); this.stage.raftController?.dismount({ hop: false });
      p.spawnAt(to, d.track.yaw(facingD)); p.frozen = true;
      const pr = d.track.project(to.x, to.z); p.body.s = pr.s; p.body.u = pr.u;
      game.camera.snap(p); audio.play('whoosh');
      await game.ui.fade(0, .25);
    } finally {
      if (d.epoch === epoch && !session.disposed && !this.stage.disposed && game.session === session && game.stage === this.stage) { d.busy = false; if (!p.dead) p.frozen = false; }
    }
  }
  returnToDock() {
    const d = this.detour;
    return this.travel(authoredWorld(d.track,d.exitD,this.returnU,.05),d.exitD);
  }
  update() {
    const p = this.player, d = this.detour;
    if (!this.active || d.busy || p.dead || p.frozen || this.originSession.disposed || this.stage.disposed || this.game.session !== this.originSession) return;
    const s = p.body.s, y = p.pos.y - d.track.heightAt(s);
    if (s >= this.end - .8 && y >= d.y - .5) { this.returnToDock(); return; }
    if (s > this.end + .5) { p.die('splash'); return; }
    if (p.body.grounded && !d.solids.has(p.body.ground) && y < d.y - 1) {
      const yard = d.track.groundAt(s, p.body.u);
      if (!(yard && Math.abs(p.pos.y - yard.y) <= 1.4) && !this.stage.rapids.safeYardSupports.has(p.body.ground)) { p.die('splash'); return; }
      // A safe fall rejoins the entry dock, never the far side of a mandatory
      // timing lane. A river fall still uses the ordinary splash death plane.
      this.returnToDock();
    }
  }
  onRespawn() { this.active = false; }
}

// A low entrance removes borrowed Shellback momentum before the neutral Moon
// charge. The tall chamber cannot be entered from the nearby high gutter.
export function buildRiverMoonWell(stage, track, k) {
  const shell = riverPanels(stage, track, 'river-moon-well');
  k.walls([[248.5,5.2,5.2,3],[249,9,5.2,3],[263,9,5.2,3],[263.5,5.2,5.2,3]]);
  const floor = k.platform(-6.3, 10, 256.5, 4, 11.4);
  const bridge = k.platform(-3.9, 10, 252, 5.2, 2);
  for (let d = 251; d <= 262; d += .6) {
    const y = track.heightAt(d);
    shell.panel(-8.4, d, .3, .8, y + 9.4, y + 24, false);
    shell.panel(-4.2, d, .3, .8, y + (d > 250.8 && d < 253.2 ? 11.55 : 9.4), y + 24, false);
  }
  for (const d of [250.8, 262.2]) shell.panel(-6.3, d, 4.5, .3, track.heightAt(d) + 9.4, track.heightAt(d) + 24);
  shell.panel(-3.8, 252, 5.7, 2.6, track.heightAt(252) + 11.55, track.heightAt(252) + 11.85);
  const ledge = k.moonLedge(-6.3, 16.2, 259, { w: 2.4, dd: 2.4 });
  const before = stage.game.tickets.list.length;
  k.tixRing(-6.3, 17.8, 259, .7, 10);
  const reward = stage.game.tickets.list.slice(before);
  for (const ticket of reward) ticket.source = 'jackpot';
  shell.finish();
  return { shell, floor, bridge, ledge, reward, launch: k.W(-6.3, 10.01, 254), destination: { d: 259, u: -6.3 } };
}

export function buildRiverLoopCase(stage, track, detour, { end, center = 0, width = 8.8, moonDoor = false }) {
  const shell = riverPanels(stage, track, 'river-loop-shell');
  for (let d = detour.entryD - .6; d <= end + .6; d += .75) {
    const y = track.heightAt(d);
    for (const side of [-1, 1]) shell.panel(center + side * width / 2, d, .25, .95, y + (moonDoor && side === -1 && d > 250.8 && d < 253.2 ? 11.55 : detour.y - 1.2), y + 24, false);
  }
  for (const d of [detour.entryD - .6, end + .6]) shell.panel(center, d, width + .4, .3, track.heightAt(d) + detour.y - 1.2, track.heightAt(d) + 24);
  shell.finish(); return shell;
}

export function buildRiverDecor(stage, track) {
  const root=stage.add(new Entity(stage,0,0,0));root.interactive=false;root.alwaysActive=true;
  const wood=new THREE.MeshLambertMaterial({color:0x725341}),metal=new THREE.MeshLambertMaterial({color:0x586663});
  const block=(u,y,d,w,h,depth,material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,depth),material);mesh.position.copy(authoredWorld(track,d,u,y+h/2));mesh.rotation.y=track.yaw(d);root.obj.add(mesh);};
  for(const[u,d]of[[-6.3,254],[6.3,276],[-6.3,293]]){block(u,-1.4,d,3,1.2,7,wood);block(u,0,d,2,.8,2,wood);}
  block(6.3,0,280,.5,10,.5,metal);block(3.8,9.5,280,5.5,.45,.5,metal);block(1.3,7,280,.12,2.5,.12,metal);
  ownRiverRoot(stage,root.obj);return root;
}

// The prose's D30 ramp conflicts with its dock ending and raft starting at D26.
// Reserve the last four metres of the dock for a descending left-hand line.
export function buildRiverStartLine(stage, track, k) {
  const shell=riverPanels(stage,track,'river-start-divider');
  for(let d=14.8;d<=25.8;d+=.6)shell.panel(-3,d,.08,.8,track.heightAt(d),track.heightAt(d)+2.6,false);
  const ramp=k.floor(22,26,{x:-3.5,w:2.2,y:[0,-1.05],depth:1,style:'platform'});
  shell.finish();return{shell,ramp,start:22,end:26};
}

// Keep L6's explicit prizes tied to its no-death route. Ticket records retain
// their taken/seq journal state; unavailable records move outside playable Y.
export class RiverGoodBoyPrizes extends Entity {
  constructor(stage, route, prizes, tickets) {
    super(stage,0,0,0);this.interactive=false;this.alwaysActive=true;
    this.route=route;this.prizes=prizes;this.tickets=tickets;this.ticketY=tickets.map(t=>t.y);
    for(const prize of prizes){const method=typeof prize.collect==='function'?'collect':'break',collect=prize[method].bind(prize);prize[method]=(...args)=>{if(this.available())return collect(...args);};}
    this.update();
  }
  available(){return !this.session.disposed&&this.session.deaths===0&&this.route.revealed&&this.route.plats.at(-1).solid.enabled;}
  update(){
    if(this.session.deaths>0){for(const p of this.route.plats){p.solid.enabled=false;p.mesh.visible=false;}this.route.t=-1;}
    const available=this.available();for(const prize of this.prizes){prize.visible=available&&!prize.dead;prize.interactive=available&&!prize.dead;prize.obj.visible=prize.visible;if(prize.solid)prize.solid.enabled=available&&!prize.dead&&!prize.broken;}
    this.tickets.forEach((t,i)=>{t.y=available?this.ticketY[i]:this.ticketY[i]+1000;});
  }
  onRespawn(){this.update();}
}
