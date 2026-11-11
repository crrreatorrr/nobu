import * as THREE from 'three';
import { Entity } from '../entities/entity.js';
import { PumpPill } from '../entities/enemies.js';
import { BlueSphere, explode } from '../entities/breakables.js';
import { TitanTNT } from './titanArena.js';
import { makeMarker, setMarkerRim, MARKER_OPACITY } from './common.js';
import { audio } from '../audio/audio.js';
import { materialSet, modelSkeletons } from './catResources.js';
import { queenCleanup, queenHazardsPaused, queenProceduralCleanup } from './queenResources.js';

export class QueenPill extends PumpPill {
  constructor(stage, candle, queen, { pump = 0 } = {}) {
    super(stage, candle.pos.x, candle.pos.y, candle.pos.z, { maxPump: 4 });
    this.candle = candle;
    this.queen = queen;
    this.pump = pump;
    this.alwaysActive = true;
    const owned = this.glb ? materialSet(this.glb) : new Set();
    owned.add(this.tag.material);
    owned.add(this.shadow.material);
    const skeletons = this.glb ? modelSkeletons(this.glb) : new Set();
    this.disposeResources = queenCleanup(stage, () => {
      this.obj.parent?.remove(this.obj);
      this.tag.material.map.dispose();
      for (const material of owned) material.dispose();
      for (const skeleton of skeletons) skeleton.dispose();
      this.mixer?.stopAllAction();
      if (this.glb) this.mixer?.uncacheRoot(this.glb);
    });
  }
  update(dt) {
    if (queenHazardsPaused(this.game)) return;
    super.update(dt);
    if (this.dead) this.disposeResources();
  }
  behave(dt) {
    const oldGround = this.ground;
    this.ground = this.candle.pos.y;
    if (this.mode === 'wait' || this.mode === 'graduate') this.pos.y += this.ground - oldGround;
    // A Queen ladder holds its third pump while allocated to the crown route.
    // It remains stompable/killable; ordinary Cone and level pills keep hopping.
    if (this.pump === 3 && this.mode === 'wait' && !this.queen.defeated) {
      this.hopWait = 1;
      this.modeT = 0;
    }
    super.behave(dt);
    this.pos.x = this.candle.pos.x;
    this.pos.z = this.candle.pos.z;
    const scale = this.size0 ?? 1;
    this.setBox(0.8 * scale, 1.5 * scale, 0.8 * scale);
  }
  reset() {
    this.dead = true;
    this.visible = false;
    this.obj.visible = false;
    this.interactive = false;
    this.disposeResources();
  }
}

class QueenSphere extends BlueSphere {
  constructor(stage, candle) {
    super(stage, candle.pos.x, candle.pos.y, candle.pos.z);
    this.candle = candle;
    this.countable = false;
    this.alwaysActive = true;
    this.disposeResources = queenCleanup(stage, () => {
      this.obj.parent?.remove(this.obj);
      this.shadow.material.dispose();
    });
  }
  update(dt) {
    this.pos.y = this.candle.pos.y;
    this.obj.position.copy(this.pos);
    this.updateBox();
    super.update(dt);
  }
  onRespawn() {
    this.dead = true;
    this.visible = false;
    this.obj.visible = false;
    this.disposeResources();
  }
  pop() {
    super.pop();
    if (this.dead) this.disposeResources();
  }
}

class QueenCat extends TitanTNT {
  constructor(stage, candle) {
    super(stage, candle.pos.x, candle.pos.z);
    this.candle = candle;
    this.pos.y = candle.pos.y;
    this.updateBox();
    this.arm();
    const owned = materialSet(this.obj),
      skeletons = modelSkeletons(this.obj);
    this.disposeResources = queenCleanup(stage, () => {
      this.obj.parent?.remove(this.obj);
      this.count.material.map.dispose();
      this.fuse.geometry.dispose();
      for (const material of owned) material.dispose();
      for (const skeleton of skeletons) skeleton.dispose();
    });
  }
  update(dt) {
    if (queenHazardsPaused(this.game)) return;
    this.pos.y = this.candle.pos.y;
    this.obj.position.copy(this.pos);
    this.updateBox();
    const previous = this.count.material.map;
    super.update(dt);
    if (previous !== this.count.material.map) previous.dispose();
  }
  pounce() {
    if (this.dead) return;
    this.markBroken();
    this.hide();
    this.count.visible = false;
    explode(this.stage, this.pos.x, this.pos.y + 0.4, this.pos.z, 2.3, {
      kind: 'flat',
      source: this,
      color: 0xffb070
    });
    this.disposeResources();
  }
  onRespawn() {
    this.dead = true;
    this.visible = false;
    this.obj.visible = false;
    this.disposeResources();
  }
}

export class QueenAirdrop extends Entity {
  constructor(stage, candle, blue) {
    super(stage, candle.pos.x, 12, candle.pos.z);
    this.alwaysActive = true;
    this.interactive = false;
    this.candle = candle;
    this.blue = blue;
    this.crate = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshLambertMaterial({ color: 0xcaa573 })
    );
    this.obj.add(this.crate);
    const color = blue ? 0x56baff : 0xff5270;
    const chute = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: false })
    );
    chute.position.y = 1.4;
    this.obj.add(chute);
    // The landing spot is only a soft shadow under the crate; the chute colour tells blue from red.
    this.marker = makeMarker(1);
    this.marker.position.set(this.pos.x, candle.pos.y + 0.04, this.pos.z);
    this.marker.material.opacity = 0;
    setMarkerRim(this.marker, 0);
    stage.scene.add(this.marker);
    this.disposeResources = queenProceduralCleanup(
      stage,
      [this.obj, this.marker]
    );
  }
  update(dt) {
    if (queenHazardsPaused(this.game)) return;
    this.pos.y -= 3 * dt;
    this.obj.position.copy(this.pos);
    this.marker.position.y = this.candle.pos.y + 0.04;
    const near = Math.max(0, Math.min(1, 1 - (this.pos.y - this.candle.pos.y) / 11));
    this.marker.material.opacity = MARKER_OPACITY * near;
    setMarkerRim(this.marker, near);
    if (this.pos.y > this.candle.pos.y + 0.6) return;
    const p = this.player;
    if (
      !p.dead &&
      Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 1 &&
      p.pos.y + (p.body?.h ?? 1.3) > this.candle.pos.y &&
      p.pos.y - this.candle.pos.y < 1.6
    )
      p.hurt('flat', this.pos.x, this.pos.z);
    this.payload = this.stage.add(
      this.blue ? new QueenSphere(this.stage, this.candle) : new QueenCat(this.stage, this.candle)
    );
    this.dead = true;
    this.visible = false;
    this.obj.visible = false;
    this.marker.visible = false;
    audio.play('stomp');
    this.disposeResources();
  }
  onRespawn() {
    this.dead = true;
    this.visible = false;
    this.obj.visible = false;
    this.marker.visible = false;
    this.payload?.onRespawn();
    this.disposeResources();
  }
}
