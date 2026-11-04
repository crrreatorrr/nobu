import * as THREE from 'three';
import { Entity } from './entity.js';
import { Assets } from '../art/assets.js';
import { save } from '../core/save.js';
import { audio } from '../audio/audio.js';
import { BONE_TEXT } from '../story/script.js';
export class HiddenBone extends Entity {
  constructor(stage, x, y, z, { move = null } = {}) {
    super(stage, x, y, z);
    this.move = move;
    this.bone = new THREE.Sprite(new THREE.SpriteMaterial({ map: Assets.tex('golden_bone'), color: 0x74ffff, transparent: true }));
    this.bone.scale.set(0.8 * Assets.aspect('golden_bone'), 0.8, 1);
    this.bone.position.y = 1;
    this.obj.add(this.bone);
    this.setBox(1.1, 1.5, 1.1);
    this.t = 0;
    this.owned = !!save.data.boneBoard?.[this.session.level]?.hidden;
    if (this.owned) this.bone.material.opacity = 0.22;
  }
  update(dt) { this.t += dt; this.bone.position.y = 1 + Math.sin(this.t * 2.5) * 0.15; }
  collect() {
    if (this.owned || this.dead || !this.session.collectHiddenBone()) return;
    this.dead = true; this.obj.visible = false;
    audio.play('oneUp'); audio.play('chime');
    this.game.ui.banner(BONE_TEXT.hiddenTitle, BONE_TEXT.hiddenSub, 2);
    this.fx.sparkle(this.pos.x, this.pos.y + 1, this.pos.z, { count: 26, color: 0x74ffff, size: 0.8, speed: 5 });
  }
  onTouch() { this.collect(); }
  onBite() { this.collect(); }
  onStomp() { this.collect(); }
  onSlide() { this.collect(); }
}
export function installBoneHelpers(k, game, stage) {
  k.hiddenBone = (x, y, d, options) => {
    if (game.session?.trial || game.session?.remix || game.session?.rush) return null;
    const p = k.W(x, y, d);
    return stage.add(new HiddenBone(stage, p.x, p.y, p.z, options));
  };
  return k;
}

// Also usable before the central kit installer is integrated.
export function placeHiddenBone(k, game, stage, x, y, d, options) {
  if (!k.hiddenBone) installBoneHelpers(k, game, stage);
  return k.hiddenBone(x, y, d, options);
}
