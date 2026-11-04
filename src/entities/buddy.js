import * as THREE from 'three';
import { Entity } from './entity.js';
import { Assets } from '../art/assets.js';
import { selectedBuddy } from '../game/kennelData.js';

export class Buddy extends Entity {
  constructor(stage, breed) {
    super(stage, ...stage.game.player.pos.toArray());
    this.breed = breed; this.interactive = false; this.alwaysActive = true;
    this.visual = Assets.model(`model_dog_${breed}_free`, .8);
    if (!this.visual) {
      this.visual = new THREE.Sprite(new THREE.SpriteMaterial({ map: Assets.tex(`dog_${breed}_free`), transparent: true }));
      this.visual.center.set(.5, 0); this.visual.scale.set(.8, .8, .8);
    }
    this.obj.add(this.visual);
    const clips = this.visual.userData?.clips || [];
    const walk = clips.findIndex((clip) => /walk/i.test(clip.name));
    this.mixer = Assets.animate(this.visual, Math.max(0, walk), 1);
    this.snap();
  }
  target() {
    const p = this.player, a = p.facing;
    return new THREE.Vector3(p.pos.x - Math.sin(a) * 1.6 + Math.cos(a) * .8, p.pos.y,
      p.pos.z - Math.cos(a) * 1.6 - Math.sin(a) * .8);
  }
  snap() { this.pos.copy(this.target()); this.obj.position.copy(this.pos); }
  onRespawn() { this.respawnPending = true; }
  update(dt) {
    const session = this.session;
    const active = session?.phase === 'level' && !session.trial && !session.remix && !session.rush && !this.player.ride && !session.bonusRound;
    this.visible = active; this.obj.visible = active;
    if (!active) return;
    if (this.respawnPending || this.pos.distanceToSquared(this.player.pos) > 64) { this.snap(); this.respawnPending = false; }
    const target = this.target();
    this.pos.lerp(target, 1 - Math.exp(-6 * Math.max(0, dt)));
    this.obj.position.copy(this.pos); this.obj.rotation.y = this.player.facing;
    this.mixer?.update(dt);
  }
}
export function addBuddy(session, data, registry) {
  const breed = selectedBuddy(data, registry, { phase: session.phase, trial: session.trial, remix: session.remix, rush: session.rush, ride: session.game.player.ride });
  if (breed) return session.stage.add(new Buddy(session.stage, breed));
  return null;
}
