import * as THREE from 'three';
import { Entity } from './entity.js';
import { Solid } from '../world/physics.js';
import { audio } from '../audio/audio.js';
import { ownRiverRoot } from './riverResources.js';

// A reusable support, deliberately separate from the damageable PumpPill enemy.
export class PumpStone extends Entity {
  constructor(stage, x, y, z, { maxPump = 3, float = 3 } = {}) {
    super(stage, x, y, z);
    if (!Number.isInteger(maxPump) || maxPump < 1 || !(float > 0)) throw new RangeError('Invalid PumpStone timing');
    this.kind = 'pumpstone'; this.interactive = false; this.countable = false;
    this.maxPump = maxPump; this.float = float;
    this.mesh = new THREE.Group(); this.obj.add(this.mesh);
    this.material = new THREE.MeshPhongMaterial({color:0x5aff8a, emissive:0x1a9a40, shininess:65});
    const pill = new THREE.Mesh(new THREE.CapsuleGeometry(.58,.65,4,12),this.material);
    pill.rotation.z=Math.PI/2; pill.position.y=-.35; this.mesh.add(pill);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.05,.12,16),new THREE.MeshLambertMaterial({color:0xbdebc7}));
    top.position.y=-.06; this.mesh.add(top);
    this.solid=stage.world.add(new Solid({x:x-1.05,y:y-.7,z:z-1.05},{x:x+1.05,y,z:z+1.05},{kind:'moving',ref:this}));
    this.onRespawn(); ownRiverRoot(stage,this.obj);
  }
  onLand() {
    if(this.state==='dumped' || this.supported) return false;
    this.supported=true;
    if(++this.pumps>this.maxPump){this.dump();return false;}
    if(this.pumps===1)this.elapsed=0;
    this.riseFrom=this.height; this.riseT=0; this.target=this.pumps;
    this.state='pumped'; this.alwaysActive=true;
    audio.play('boing',1+this.pumps*.12);
    return false;
  }
  dump() {
    if(this.state==='dumped')return;
    this.state='dumped';this.recover=0;this.solid.enabled=false;this.mesh.visible=false;this.supported=false;
    this.fx?.burst?.(this.pos.x,this.pos.y,this.pos.z,{count:12,colors:[0x5aff8a,0xffffff],speed:3});audio.play('conePop');
  }
  place() {
    this.pos.copy(this.home);this.pos.y+=this.height;
    this.obj.position.copy(this.pos);
    this.solid.setCenter(this.pos.x,this.pos.y-.7,this.pos.z,2.1,.7,2.1);
    // Cosmetic growth never changes the collision footprint or horizontal carry.
    this.mesh.scale.setScalar(1+this.pumps*.17);
  }
  update(dt) {
    if(this.player?.body?.ground!==this.solid || !this.player.body.grounded)this.supported=false;
    if(this.state==='dumped') {this.recover+=dt;if(this.recover>=4)this.onRespawn();return;}
    if(this.state==='pumped') {
      this.elapsed+=dt;this.riseT=Math.min(.25,this.riseT+dt);
      const a=this.riseT/.25;this.height=this.riseFrom+(this.target-this.riseFrom)*(a*a*(3-2*a));
      if(this.elapsed>=this.float){this.dump();return;}
    }
    this.place();
    // The top stays physical; only the pill artwork bobs under the landing disc.
    this.mesh.children[0].position.y=-.35+Math.sin((this.stage.time||0)*3)*.1;
    const warning=this.pumps && this.float-this.elapsed<1;
    this.material.emissiveIntensity=warning?.4+.4*Math.sin(this.elapsed*24):.15;
  }
  onRespawn() {
    this.state='idle';this.pumps=0;this.elapsed=0;this.height=0;this.target=0;this.riseFrom=0;this.riseT=0;this.supported=false;
    this.alwaysActive=false;this.mesh.visible=true;this.solid.enabled=true;this.place();
    Object.assign(this.solid.delta,{x:0,y:0,z:0});
  }
}
