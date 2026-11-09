import * as THREE from 'three';
import { Assets } from '../art/assets.js';
import { fencePost } from '../world/decor.js';
import { crowdLayout } from './kennelData.js';
import {addGauntletPhotos} from './gauntletPhotos.js';

export class KennelYard {
  constructor(game, data, registry) {
    this.scene = new THREE.Scene();
    this.scene.background = game.titleScene?.background || new THREE.Color(0x88bbdd);
    // The title background and light rig are shared presentation; dog instances are independent.
    for (const obj of game.titleScene?.children || []) if (obj.isLight) this.scene.add(obj.clone());
    if (!this.scene.children.some((obj) => obj.isLight)) this.scene.add(new THREE.HemisphereLight(0xfff0e0, 0x705040, 2));
    this.camera = new THREE.PerspectiveCamera(42, game.camera?.cam.aspect || 1, .1, 80);
    this.camera.position.set(9, 8, 13); this.camera.lookAt(0, 0, 0);
    this.resources = new Set(); this.mixers = [];
    if (game.titleMask) { this.mask = game.titleMask.clone(true); this.mask.position.set(4.8, 1.6, 2.5); this.mask.visible = false; this.scene.add(this.mask); }
    const make = (geometry, color, p, scale) => {
      const material = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material); mesh.position.copy(p);
      if (scale) mesh.scale.copy(scale);
      this.resources.add(geometry); this.resources.add(material); this.scene.add(mesh); return mesh;
    };
    make(new THREE.BoxGeometry(12, .2, 8), 0x70a74e, new THREE.Vector3(0, -.1, 0));
    const adapter = { decor: (geo, color, p, rot, scale) => { const mesh = make(geo.clone(), color, p, scale); if (rot) mesh.rotation.set(rot.x || 0, rot.y || 0, rot.z || 0); } };
    for (let x = -6; x <= 6; x += 1.2) for (const z of [-4, 4]) fencePost(adapter, x, 0, z);
    for (let z = -2.8; z <= 2.8; z += 1.12) for (const x of [-6, 6]) fencePost(adapter, x, 0, z);
    for (const y of [.35, .8]) {
      for (const z of [-4, 4]) make(new THREE.BoxGeometry(12, .08, .08), 0xc89058, new THREE.Vector3(0, y, z));
      for (const x of [-6, 6]) make(new THREE.BoxGeometry(.08, .08, 8), 0xc89058, new THREE.Vector3(x, y, 0));
    }
    this.gauntletPhotos=addGauntletPhotos(this.scene,data,this.resources);
    const lowEnd = game.renderer.capabilities.maxTextures < 16 || data.pixelated || game.renderer.getPixelRatio() < (globalThis.devicePixelRatio || 1);
    const layout = crowdLayout(data, registry, lowEnd); this.hidden = layout.hidden;
    this.dogs = layout.dogs.map((dog) => {
      let model = Assets.model(`model_dog_${dog.breed}_free`, .9);
      if (!model) {
        const material = new THREE.SpriteMaterial({ map: Assets.tex(`dog_${dog.breed}_free`), transparent: true });
        model = new THREE.Sprite(material); model.center.set(.5, 0); model.scale.set(.9, .9, 1); this.resources.add(material);
      }
      model.position.set(dog.x, 0, dog.z); this.scene.add(model);
      const clips = model.userData?.clips || [], dance = Math.max(0, clips.findIndex((clip) => /dance|celebrat/i.test(clip.name)));
      const mixer = Assets.animate(model, dance, 1.1);
      // Assets.animate picks a random initial phase; override it with the authored crowd offset.
      if (mixer && clips.length) { mixer.clipAction(clips[dance]).time = dog.offset % clips[dance].duration; this.mixers.push(mixer); }
      return { model, offset: dog.offset, animated: !!mixer };
    });
  }
  update(dt) {
    for (const mixer of this.mixers) mixer.update(dt);
    this.t = (this.t || 0) + dt;
    if (this.mask) { this.mask.position.y = 1.6 + Math.sin(this.t * 2) * .1; this.mask.rotation.y = Math.sin(this.t * 1.3) * .3; }
    for (const dog of this.dogs) if (!dog.animated) { dog.model.position.y = Math.abs(Math.sin(this.t * 5 + dog.offset)) * .12; dog.model.rotation.y = Math.sin(this.t * 3 + dog.offset) * .2; }
  }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    for (const mixer of this.mixers) mixer.stopAllAction();
    for (const resource of this.resources) resource.dispose();
    this.scene.clear();
  }
}
