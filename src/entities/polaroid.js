import * as THREE from 'three';
import { Entity } from './entity.js';
import {ownGauntletMaterials} from './gauntletResources.js';
import { Assets } from '../art/assets.js';
import { save } from '../core/save.js';
import { audio } from '../audio/audio.js';
import { GAUNTLET_INFO } from '../levels/data/gauntlets.js';
import { GAUNTLET_TEXT } from '../story/script.js';
export function polaroidContext(session,data){return !session.trial&&!session.remix&&!session.bossRush&&!session.rush&&!session.ranked&&!session.medalMode&&!session.medalRun&&!session.boardRun&&!session.godUsed&&!data.godMode;}
export class Polaroid extends Entity {
  constructor(stage,x,y,z,{id}={}){
    super(stage,x,y,z);if(!Object.hasOwn(GAUNTLET_INFO,id))throw new RangeError('Unknown Polaroid');
    this.id=id;this.kind='polaroid';this.countable=false;this.alwaysActive=true;this.t=0;this.greySeen=false;
    this.frameMaterial=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,transparent:true});
    this.photoMaterial=new THREE.MeshBasicMaterial({map:Assets.tex(`bg_level${GAUNTLET_INFO[id].host}`),side:THREE.DoubleSide,transparent:true});
    ownGauntletMaterials(stage,[this.frameMaterial,this.photoMaterial]);
    const frame=new THREE.Mesh(new THREE.PlaneGeometry(.7,.85),this.frameMaterial),photo=new THREE.Mesh(new THREE.PlaneGeometry(.56,.55),this.photoMaterial);
    photo.position.set(0,.06,.01);this.visual=new THREE.Group();this.visual.add(frame,photo);this.visual.position.y=.65;this.obj.add(this.visual);
    this.setBox(.85,1.3,.85);this.update(0);
  }
  update(dt){
    this.t+=dt;const found=save.data.gauntlets?.[this.id]?.found||save.data.gauntlets?.[this.id]?.polaroid;
    this.visible=!found&&polaroidContext(this.session,save.data);this.obj.visible=this.visible;
    this.available=this.visible&&this.session.deaths===0;
    for(const m of[this.frameMaterial,this.photoMaterial]){m.opacity=this.available?1:.35;m.depthWrite=this.available;}
    this.visual.position.y=.65+Math.sin(this.t*2)*.12;this.visual.rotation.y=this.t*.7;
    if(this.visible&&this.distToPlayer()<7){
      this.game.ui.tutorial?.('polaroid');
      if(!this.available&&!this.greySeen){this.greySeen=true;audio.play('fade',1,{volume:.3});this.game.ui.banner(GAUNTLET_TEXT.polaroidGrey,GAUNTLET_TEXT.grey,1.8);}
    }
  }
  onTouch(){
    this.update(0);if(!this.available)return false;
    const row=(save.data.gauntlets||={})[this.id]||={};row.found=row.polaroid=true;
    save.write();this.visible=this.obj.visible=false;this.available=false;
    this.game.ui.banner(GAUNTLET_TEXT.polaroid,GAUNTLET_TEXT.polaroidFound,2);audio.play('oneUp');return true;
  }
}
export function installPolaroidHelper(k,stage){k.polaroid=(x,y,d,id)=>stage.add(new Polaroid(stage,...k.W(x,y,d).toArray(),{id}));return k;}
