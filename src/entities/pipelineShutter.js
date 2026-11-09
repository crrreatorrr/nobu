import * as THREE from 'three';
import {Entity} from './entity.js';
import {Solid} from '../world/physics.js';
import {ownRiverRoot} from './riverResources.js';
import {onCatStageDispose} from '../bosses/catResources.js';
import {audio} from '../audio/audio.js';

// A mechanical interlock operated only by real support contacts. Its paw plates
// and lamps describe progress without consulting abilities, saves or economy.
export class PipelineShutter extends Entity {
 constructor(stage,k,d,supports,{top=30,bottom=-20}={}){
  super(stage,...k.W(0,0,d).toArray());
  if(!supports.length||new Set(supports).size!==supports.length||supports.some(e=>!e?.solid))throw new TypeError('Shutter requires distinct solid supports');
  if(!Number.isFinite(top)||!Number.isFinite(bottom)||top<=bottom)throw new RangeError('Invalid shutter bounds');
  this.kind='pipeline-shutter';this.interactive=false;this.alwaysActive=true;
  this.ownerSession=this.session;this.supports=supports;this.contacts=new Set();this.checkpointContacts=new Set();this.open=false;
  this.d=d;this.solids=[];this.lights=[];this.markers=[];this.bindings=[];
  this.mesh=new THREE.Group();this.obj.add(this.mesh);
  const panel=new THREE.Mesh(new THREE.BoxGeometry(9,top-bottom,.3),new THREE.MeshLambertMaterial({color:0x87659d}));
  panel.position.y=(top+bottom)/2;this.mesh.add(panel);this.obj.rotation.y=k.yawAt(d);
  // Small tiles avoid the wide rotated wall's AABB sealing unrelated path banks.
  const yaw=k.yawAt(d),c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw));
  for(let i=0;i<36;i++){
   const at=k.W(-4.5+(i+.5)*.25,0,d),hx=(.25*c+.3*s)/2,hz=(.25*s+.3*c)/2;
   this.solids.push(stage.world.add(new Solid({x:at.x-hx,y:this.pos.y+bottom,z:at.z-hz},{x:at.x+hx,y:this.pos.y+top,z:at.z+hz},{ref:this})));
  }
  supports.forEach((support,index)=>{
   const light=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),new THREE.MeshBasicMaterial({color:0xff6a72}));
   light.position.set((index-(supports.length-1)/2)*.5,Math.min(top-.2,2.1),.2);this.mesh.add(light);this.lights.push(light);
   const material=new THREE.MeshBasicMaterial({color:0xffe45a,side:THREE.DoubleSide});
   const marker=new THREE.Group();marker.material=material;marker.name='pipeline-paw-plate';
   const ring=new THREE.Mesh(new THREE.RingGeometry(.23,.34,16),material);marker.add(ring);
   const pad=new THREE.Mesh(new THREE.CircleGeometry(.11,12),material);pad.scale.set(1.2,.85,1);pad.position.y=-.055;marker.add(pad);
   for(const [x,y]of[[-.14,.06],[-.05,.15],[.05,.15],[.14,.06]]){const toe=new THREE.Mesh(new THREE.CircleGeometry(.05,8),material);toe.position.set(x,y,0);marker.add(toe);}
   marker.rotation.x=-Math.PI/2;marker.position.y=support.solid.max.y-support.pos.y+.055;
   const previousMarker=support.pipelineMarker;support.obj.add(marker);support.pipelineMarker=marker;this.markers.push(marker);
   ownRiverRoot(stage,marker);
   // Moving/Crumble solids have no ref by default. Make just these opt-in
   // supports reachable by Player._onLand, retaining an existing callback owner.
   const previousRef=support.solid.ref;support.solid.ref ||= support;
   const target=support.solid.ref,previousLand=target.onLand,door=this;
   const onLand=function(player,impact){
    if(!door.current())return false;
    // Arrow immediately clears ground; record contact before its original launch.
    if(player===door.player)door.contact(support);
    return previousLand?.call(this,player,impact);
   };
   target.onLand=onLand;
   this.bindings.push({support,target,previousRef,previousLand,onLand,marker,previousMarker});
  });
  ownRiverRoot(stage,this.obj);
  onCatStageDispose(stage,()=>this.retire());
 }
 current(){return!this.disposed&&!this.ownerSession.disposed&&!this.stage.disposed&&this.game.session===this.ownerSession&&this.game.stage===this.stage;}
 contact(support){
  const body=this.player?.body;
  if(!this.current()||this.open||!this.supports.includes(support)||this.contacts.has(support)||!support.solid.enabled||!body?.grounded||body.ground!==support.solid||Math.abs(this.player.pos.y-support.solid.max.y)>=.03)return false;
  this.contacts.add(support);this.paint();audio.play('chime');
  if(this.contacts.size===this.supports.length){this.open=true;for(const solid of this.solids)solid.enabled=false;audio.play('clang');}
  return true;
 }
 paint(){for(let i=0;i<this.supports.length;i++){const color=this.contacts.has(this.supports[i])?0x5aff8a:0xff6a72;this.lights[i].material.color.setHex(color);this.markers[i].material.color.setHex(color);}}
 update(dt){
  if(!this.current())return;
  this.mesh.position.y=Math.min(55,Math.max(0,this.mesh.position.y+(this.open?1:-1)*dt*400));
  if(!this.open&&this.player.body.s>=this.d-20&&this.player.body.s<this.d&&this.distToPlayer()<20)this.game.ui.tutorial('pipelineshutter');
 }
 onCheckpoint(){
  if(!this.current())return;
  // A backtracking sky-loop checkpoint can precede the door's D while
  // retaining broken route packs. Snapshot earned contacts, not CP geometry.
  this.checkpointContacts=new Set(this.contacts);
 }
 onRespawn(){
  if(!this.current())return;
  this.contacts=new Set(this.checkpointContacts);this.open=this.contacts.size===this.supports.length;this.mesh.position.y=this.open?55:0;
  for(const solid of this.solids)solid.enabled=!this.open;this.paint();
 }
 retire(){
  if(this.disposed)return;this.disposed=true;
  for(const solid of this.solids)solid.enabled=false;
  for(const{support,target,previousRef,previousLand,onLand,marker,previousMarker}of [...this.bindings].reverse()){
   if(target.onLand===onLand){if(previousLand)target.onLand=previousLand;else delete target.onLand;}
   if(previousRef==null&&support.solid.ref===support)support.solid.ref=previousRef;
   if(support.pipelineMarker===marker){if(previousMarker)support.pipelineMarker=previousMarker;else delete support.pipelineMarker;}
   marker.removeFromParent();
  }
 }
}
