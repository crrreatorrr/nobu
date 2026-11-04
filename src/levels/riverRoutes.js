import * as THREE from 'three';
import { Entity } from '../entities/entity.js';
import { Solid } from '../world/physics.js';
import { ownRiverRoot } from '../entities/riverResources.js';
import { audio } from '../audio/audio.js';

// Cutaway warehouse panels are real collision, tiled along the curved river.
// Only the procedural panel resources are owned; kit and asset caches are borrowed.
export function riverPanels(stage, track, name) {
  const root = stage.add(new Entity(stage, 0, 0, 0));
  root.interactive = false; root.alwaysActive = true; root.kind = name;
  const material = new THREE.MeshLambertMaterial({ color: 0x718b83, transparent: true, opacity: .08, depthWrite: false });
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x526d65, transparent: true, opacity: .6 });
  const solids = [];
  const panel = (u, d, width, depth, bottom, top, outline = true) => {
    const pos = track.toWorld(d, u), yaw = track.yaw(d);
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
      const p = track.toWorld(d, u - width / 2 + tile * (i + .5));
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
    for (const x of [-width / 2, width / 2]) shell.panel(x, d, .3, .85, base, track.heightAt(d) + 9.2, false);
  }
  for (const b of boxes) if (b.kind !== 'arrow') shell.panel(0, b.d, width + .4, .1, b.entity.solid.max.y + 1.65, ceiling + .3);
  const exitSolids = shell.panel(0, end, width + .4, .35, base, exitTop);
  shell.panel(0, end, width + .4, .35, ceiling, track.heightAt(end) + 9.2);
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
    if (d.busy || p.dead || game.session !== session) return;
    const entry = to === d.startPos, epoch = d.epoch;
    d.busy = true; p.frozen = true; this.active = entry;
    const current = () => d.epoch === epoch && !p.dead && game.session === session && game.stage === this.stage;
    try {
      await game.ui.fade(1, .25);
      if (!current()) return;
      p.setRide(null); this.stage.raftController?.dismount({ hop: false });
      p.spawnAt(to, d.track.yaw(facingD)); p.frozen = true;
      const pr = d.track.project(to.x, to.z); p.body.s = pr.s; p.body.u = pr.u;
      game.camera.snap(p); audio.play('whoosh');
      await game.ui.fade(0, .25);
    } finally {
      if (d.epoch === epoch) { d.busy = false; if (game.session === session) p.frozen = false; }
    }
  }
  returnToDock() {
    const d = this.detour;
    return this.travel(d.track.toWorld(d.exitD, this.returnU, .05), d.exitD);
  }
  update() {
    const p = this.player, d = this.detour;
    if (!this.active || d.busy || p.dead || p.frozen || this.game.session !== this.originSession) return;
    const s = p.body.s, y = p.pos.y - d.track.heightAt(s);
    if (s >= this.end - .8 && y >= d.y - .5) { this.returnToDock(); return; }
    if (p.body.grounded && !d.solids.has(p.body.ground) && y < d.y - 1) {
      // A safe fall rejoins the entry dock, never the far side of a mandatory
      // timing lane. A river fall still uses the ordinary splash death plane.
      this.returnToDock();
    }
  }
  onRespawn() { this.active = false; }
}
