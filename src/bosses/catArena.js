import * as THREE from 'three';
import { Entity } from '../entities/entity.js';
import { toon } from '../player/nobuPrims.js';
import { onCatStageDispose, disposeProcedural } from './catResources.js';

// Cat's rectangular edge band is independent of the shared square ArenaTiles.
// Exact coverage: 21m permanent centre, 2m edge, total25m. Corner tiles belong
// only to the north/south strips, so no hidden overlapping floor survives a fall.
export function catRingRects() {
  const out = [];
  for (const z of [-11.5, 11.5]) for (let x = -11.25; x < 12.5; x += 2.5) out.push({ x, z, w: 2.5, d: 2 });
  for (const x of [-11.5, 11.5]) for (let z0 = -10.5; z0 < 10.5; z0 += 2.5) {
    const d = Math.min(2.5, 10.5 - z0); out.push({ x, z: z0 + d / 2, w: 2, d });
  }
  return out;
}

export class CatArena extends Entity {
  constructor(stage) {
    super(stage, 0, 0, 0); this.alwaysActive = true; this.interactive = false;
    this.tiles = catRingRects().map((r) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(r.w - .025, .3, r.d - .025), toon(0xad835d));
      mesh.position.set(r.x, -.15, r.z); this.obj.add(mesh);
      const solid = stage.world.addBox(r.x, -.3, r.z, r.w, .3, r.d, { kind: 'moving', ref: this });
      return { ...r, mesh, solid, timer: null };
    });
    this.ledges = [-9.5, 9.5].map((x) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, .5, 2.6), toon(0xb05a30)); this.obj.add(mesh);
      const solid = stage.world.addBox(x, -1, -10, 4, .5, 2.6, { kind: 'moving', ref: this });
      return { x, z: -10, y: -.5, mesh, solid };
    });
    this.setPhase(1); this._syncLedges();
    onCatStageDispose(stage, () => this.dispose());
  }
  setPhase(phase) {
    const alreadyRaised = this.phase >= 2 && phase >= 2;
    this.phase = phase; this.rise = alreadyRaised ? 1 : 0; this.warning = phase === 3 ? 1 : 0;
    for (const t of this.tiles) this._restore(t);
    for (const l of this.ledges) l.y = alreadyRaised ? 2.4 : -.5;
    this._syncLedges();
  }
  _syncLedges() {
    for (const l of this.ledges) {
      l.mesh.visible = this.phase >= 2; l.mesh.position.set(l.x, l.y - .25, l.z);
      l.solid.enabled = this.phase >= 2; l.solid.setCenter(l.x, l.y - .5, l.z, 4, .5, 2.6);
    }
  }
  _restore(t) { t.timer = null; t.solid.enabled = true; t.mesh.position.y = -.15; t.mesh.material.emissive.setHex(0); }
  update(dt) {
    if (this.phase >= 2) {
      this.rise = Math.min(1, this.rise + dt); for (const l of this.ledges) l.y = -.5 + 2.9 * this.rise;
      this._syncLedges();
    }
    this.warning = Math.max(0, this.warning - dt);
    for (const t of this.tiles) {
      if (this.warning > 0) t.mesh.material.emissive.setHex(Math.floor(this.warning * 12) % 2 ? 0x773322 : 0x221100);
      if (this.phase !== 3 || this.warning > 0) continue;
      if (t.timer === null && this.player.body.grounded && this.player.body.ground === t.solid) t.timer = 0;
      if (t.timer === null) continue;
      t.timer += dt;
      if (t.timer < .6) t.mesh.material.emissive.setHex(Math.floor(t.timer * 16) % 2 ? 0x882211 : 0);
      else { t.solid.enabled = false; t.mesh.position.y = -.15 - Math.min(8, (t.timer - .6) * 12); }
      if (t.timer >= 4.6) this._restore(t);
    }
  }
  dispose() { if (this.disposed) return; this.disposed = true; disposeProcedural(this.obj); }
  reset() { this.setPhase(1); }
  onRespawn() { this.reset(); }
}
