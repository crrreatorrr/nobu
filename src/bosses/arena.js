// Arena pieces are ordinary entities: add them with stage.add(...). All movable
// collision boxes use the world's moving list, including disabled floor tiles.
import * as THREE from 'three';
import { Entity } from '../entities/entity.js';
import { toon } from '../player/nobuPrims.js';

// A landed cage remains cover without creating a solid through its captive.
// Keep projectile cover separate from the hollow physical bars. An occupied
// cage has a body-width exit corridor, so ending the trap never strands Nobu.
export class CageCover {
  constructor(stage, x, y, z) {
    this.stage = stage; this.x = x; this.y = y; this.z = z;
    this.box = { min: { x: x - 0.8, y, z: z - 0.8 }, max: { x: x + 0.8, y: y + 1.8, z: z + 0.8 }, enabled: false };
    this.solids = [];
    this.roof = null;
    this.occupant = null;
  }
  _box(x0, z0, x1, z1, y, height) {
    if (x1 - x0 < 0.001 || z1 - z0 < 0.001) return;
    const solid = this.stage.world.addBox(this.x + (x0 + x1) / 2, y, this.z + (z0 + z1) / 2,
      x1 - x0, height, z1 - z0, { kind: 'moving', ref: this });
    this.solids.push(solid);
    return solid;
  }
  activate(player) {
    this.box.enabled = true;
    const body = player.body;
    const hw = body?.hw ?? 0.36, hd = body?.hd ?? 0.36;
    const dx = player.pos.x - this.x, dz = player.pos.z - this.z;
    const intersects = Math.abs(dx) < 0.8 + hw && Math.abs(dz) < 0.8 + hd &&
      player.pos.y < this.y + 1.8 && player.pos.y + (body?.h ?? 1.3) > this.y;
    if (!intersects) {
      this._box(-0.8, -0.8, 0.8, 0.8, this.y, 1.8);
      return;
    }
    this.occupant = player;
    const alongX = Math.abs(dx) >= Math.abs(dz);
    const center = alongX ? dz : dx;
    const halfLane = (alongX ? hd : hw) + 0.1;
    const lo = center - halfLane, hi = center + halfLane;
    // Clip each wall against the full exit corridor. At a diagonal capture this
    // also removes the intersecting corner, instead of ejecting the captive.
    for (const wall of [[-0.8, -0.8, -0.7, 0.8], [0.7, -0.8, 0.8, 0.8], [-0.8, -0.8, 0.8, -0.7], [-0.8, 0.7, 0.8, 0.8]]) {
      const [x0, z0, x1, z1] = wall;
      if (alongX) {
        this._box(x0, z0, x1, Math.min(z1, lo), this.y, 1.7);
        this._box(x0, Math.max(z0, hi), x1, z1, this.y, 1.7);
      } else {
        this._box(x0, z0, Math.min(x1, lo), z1, this.y, 1.7);
        this._box(Math.max(x0, hi), z0, x1, z1, this.y, 1.7);
      }
    }
    this.roof = this._box(-0.8, -0.8, 0.8, 0.8, this.y + 1.7, 0.1);
    this.roof.enabled = false;
    this.update();
  }
  update() {
    if (!this.roof || this.roof.enabled || !this.box.enabled) return;
    const p = this.occupant, body = p.body;
    const outside = Math.abs(p.pos.x - this.x) >= 0.8 + (body?.hw ?? 0.36) ||
      Math.abs(p.pos.z - this.z) >= 0.8 + (body?.hd ?? 0.36);
    if (outside || p.pos.y + (body?.h ?? 1.3) <= this.roof.min.y || p.pos.y >= this.roof.max.y) this.roof.enabled = true;
  }
  clear() {
    this.box.enabled = false;
    for (const solid of this.solids) this.stage.world.remove(solid);
  }
}

export class ArenaTiles extends Entity {
  constructor(stage, { cols = 6, rows = 6, size = 4, y = 0, x = 0, z = 0 } = {}) {
    super(stage, x, y, z);
    this.alwaysActive = true;
    this.interactive = false;
    this.cols = cols; this.rows = rows; this.tileSize = size;
    this.tiles = [];
    const geo = new THREE.BoxGeometry(size - 0.04, 0.3, size - 0.04);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const tx = (i - (cols - 1) / 2) * size, tz = (j - (rows - 1) / 2) * size;
      const mesh = new THREE.Mesh(geo, toon(0x8d819e));
      mesh.position.set(tx, -0.15, tz);
      this.obj.add(mesh);
      const solid = stage.world.addBox(x + tx, y - 0.3, z + tz, size, 0.3, size, { kind: 'moving', ref: this });
      this.tiles.push({ mesh, solid, x: x + tx, z: z + tz, timer: 0, duration: 0, crumble: false });
    }
  }
  flip(i, j, t = 3) {
    const tile = this.tiles[j * this.cols + i];
    if (!tile || i < 0 || i >= this.cols || j < 0 || j >= this.rows) return;
    tile.timer = 0; tile.duration = Math.max(0, t) + 0.5;
  }
  crumbleRing() {
    for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) {
      if (i === 0 || j === 0 || i === this.cols - 1 || j === this.rows - 1) this.tiles[j * this.cols + i].crumble = true;
    }
  }
  update(dt) {
    const body = this.player.body;
    for (const tile of this.tiles) {
      if (!tile.duration && tile.crumble && body.grounded && body.ground === tile.solid) tile.duration = 5.5;
      if (!tile.duration) continue;
      tile.timer += dt;
      if (tile.timer < 0.5) {
        tile.mesh.material.emissive.setHex(Math.floor(tile.timer * 16) % 2 ? 0x771122 : 0);
      } else {
        tile.solid.enabled = false;
        tile.mesh.position.y = -0.15 - Math.min(8, (tile.timer - 0.5) * 12);
      }
      if (tile.timer >= tile.duration) this._restore(tile);
    }
  }
  _restore(tile) {
    tile.timer = 0; tile.duration = 0;
    tile.solid.enabled = true;
    tile.mesh.position.y = -0.15;
    tile.mesh.material.emissive.setHex(0);
  }
  reset() { for (const tile of this.tiles) { this._restore(tile); tile.crumble = false; } }
  onRespawn() { this.reset(); }
}

export class CandlePillar extends Entity {
  constructor(stage, x, z, { y = 0, size = 2.6, depth = 12, damping = 8 } = {}) {
    super(stage, x, y, z);
    this.alwaysActive = true; this.interactive = false;
    this.target = y; this.size = size; this.depth = depth; this.damping = damping;
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(size, depth, size), toon(0x4aff8a));
    this.mesh.position.y = -depth / 2;
    this.obj.add(this.mesh);
    this.solid = stage.world.addBox(x, y - depth, z, size, depth, size, { kind: 'moving', ref: this });
  }
  update(dt) {
    const difference = this.target - this.pos.y;
    this.mesh.material.color.setHex(difference >= 0 ? 0x4aff8a : 0xff3a4a);
    this.pos.y += difference * (1 - Math.exp(-this.damping * dt));
    this.obj.position.copy(this.pos);
    this.solid.setCenter(this.pos.x, this.pos.y - this.depth, this.pos.z, this.size, this.depth, this.size);
  }
  reset() {
    this.target = this.home.y;
    this.pos.copy(this.home); this.obj.position.copy(this.pos);
    this.solid.setCenter(this.pos.x, this.pos.y - this.depth, this.pos.z, this.size, this.depth, this.size);
    this.solid.enabled = true;
  }
  onRespawn() { this.reset(); }
}

export class Pedestal extends CandlePillar {
  constructor(stage, x, z, { r = 1.4, h = 1.8, y = 0 } = {}) {
    super(stage, x, z, { y, size: r * 2, depth: h });
    this.floorY = y; this.height = h; this.riseT = 0;
    this.target = y + h;
  }
  update(dt) {
    this.riseT = Math.min(1, this.riseT + dt);
    this.pos.y = this.floorY + this.height * this.riseT;
    this.obj.position.copy(this.pos);
    this.solid.setCenter(this.pos.x, this.pos.y - this.depth, this.pos.z, this.size, this.depth, this.size);
  }
  reset() { this.riseT = 0; this.pos.y = this.floorY; this.obj.position.copy(this.pos); this.solid.setCenter(this.pos.x, this.pos.y - this.depth, this.pos.z, this.size, this.depth, this.size); }
}

export class ConveyorZone extends Entity {
  constructor(stage, rect, dir, speed) {
    super(stage, 0, 0, 0);
    this.alwaysActive = true; this.interactive = false;
    this.rect = rect; this.dir = dir; this.speed = speed; this.enabled = true;
  }
  update() {
    const p = this.player, r = this.rect;
    if (this.enabled && p.body.grounded && p.pos.x >= r.x0 && p.pos.x <= r.x1 &&
        p.pos.z >= r.z0 && p.pos.z <= r.z1 && (r.y == null || Math.abs(p.pos.y - r.y) < 0.2)) {
      p.pushX = (p.pushX || 0) + this.dir.x * this.speed;
      p.pushZ = (p.pushZ || 0) + this.dir.z * this.speed;
    }
  }
  reset() { this.enabled = true; }
  onRespawn() { this.reset(); }
}
