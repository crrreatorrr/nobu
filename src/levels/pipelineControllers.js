import * as THREE from 'three';
import {Entity} from '../entities/entity.js';
import {Solid} from '../world/physics.js';
import {ownRiverRoot} from '../entities/riverResources.js';
import {onCatStageDispose} from '../bosses/catResources.js';

// Thin cutaway tank panels follow authored track coordinates, including mirroring.
export function pipelinePanels(stage,k,name){
 const root=stage.add(new Entity(stage,0,0,0));root.kind=name;root.interactive=false;
 const material=new THREE.MeshLambertMaterial({color:0x735a83,transparent:true,opacity:.09,depthWrite:false});
 const solids=[];
 const panel=(u,d,w,depth,bottom,top)=>{
  const p=k.W(u,0,d),yaw=k.yawAt(d),mesh=new THREE.Mesh(new THREE.BoxGeometry(w,top-bottom,depth),material);
  mesh.position.set(p.x,(bottom+top)/2,p.z);mesh.rotation.y=yaw;root.obj.add(mesh);
  const made=[],n=Math.ceil(w/.25),tile=w/n,c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw));
  for(let i=0;i<n;i++){
   const at=k.W(u-w/2+tile*(i+.5),0,d),hx=(tile*c+depth*s)/2,hz=(tile*s+depth*c)/2;
   const body=stage.world.add(new Solid({x:at.x-hx,y:bottom,z:at.z-hz},{x:at.x+hx,y:top,z:at.z+hz},{ref:root}));
   made.push(body);solids.push(body);
  }return made;
 };
 return{root,solids,panel,finish:()=>ownRiverRoot(stage,root.obj)};
}

export function buildPipelineTimingCase(stage,k,{start,end,width=8.6,ceiling,baffles=[],risers=[],curtainTop=30}){
 const shell=pipelinePanels(stage,k,'pipeline-timing-shell');
 for(let d=start-.5;d<end+.5;d+=.6){
  shell.panel(0,d,width+.4,.8,ceiling,ceiling+.3);
  for(const x of[-width/2,width/2])shell.panel(x,d,.28,.8,-20,30);
 }
 for(const[d,bottom]of baffles)shell.panel(0,d,width+.4,.08,bottom,ceiling+.3);
 const riserSolids=risers.flatMap(([d,top])=>shell.panel(0,d,width+.4,.3,-20,top));
 // Crown/Moon replays must not board the tank roof from the entrance/exit floor.
 shell.panel(0,start-.5,width+.4,.3,ceiling,curtainTop);
 shell.panel(0,end+.5,width+.4,.3,ceiling,curtainTop);
 shell.finish();return{...shell,start,end,ceiling,baffles,risers,riserSolids};
}

// Field-only visuals. All mutations target this stage, never the shared theme.
export class PipelineAtmosphere extends Entity {
 constructor(stage,flood){super(stage,0,0,0);this.interactive=false;this.alwaysActive=true;this.flood=flood;
  this.far=stage.scene.fog?.far;this.color=stage.scene.fog?.color.clone();this.background=stage.scene.background?.isColor?stage.scene.background.clone():null;
  const dispose=stage.dispose.bind(stage);stage.dispose=()=>{this.restore();dispose();};
 }
 restore(){if(this.stage.scene.fog){this.stage.scene.fog.far=this.far;this.stage.scene.fog.color.copy(this.color);}if(this.background)this.stage.scene.background.copy(this.background);}
 update(){
  const s=this.player.body.s??0,fog=this.stage.scene.fog;
  if(fog){fog.far=s>=284&&s<=332?60:this.far;fog.color.copy(this.color);}
  if(this.background)this.stage.scene.background.copy(this.background);
  if(s>=392&&s<=446&&this.flood.state==='rising'){
   const a=(this.flood.y-this.flood.y0)/(this.flood.y1-this.flood.y0);
   if(fog)fog.color.lerp(new THREE.Color(0x2a0a10),a);
   if(this.background)this.stage.scene.background.lerp(new THREE.Color(0x2a0a10),a);
  }
 }
 onRespawn(){this.restore();this.update();}
}

// Detour travel must never resume against a replacement stage/session.
export function guardPipelineDetour(detour){
 const session=detour.session,stage=detour.stage,game=detour.game;
 let retired=false;onCatStageDispose(stage,()=>{retired=true;detour.epoch++;detour.busy=false;detour.pipelineActive=false;});
 detour.travel=async(to,facingD)=>{
  const p=game.player,epoch=detour.epoch;
  const live=()=>!retired&&!session.disposed&&!stage.disposed&&game.session===session&&game.stage===stage&&detour.epoch===epoch&&!p.dead;
  if(detour.busy||!live())return false;
  detour.busy=true;p.frozen=true;
  try{await game.ui.fade(1,.25);if(!live())return false;if(to===detour.startPos)detour.pipelineActive=true;p.spawnAt(to,detour.track.yaw(facingD));p.frozen=true;
   const pr=detour.track.project(to.x,to.z);p.body.s=pr.s;p.body.u=pr.u;game.camera.snap(p);
   await game.ui.fade(0,.25);return live();
  }finally{if(live()){detour.busy=false;p.frozen=false;}}
 };return detour;
}

// A sky loop returns to its entry even after an accidental fall. It cannot be
// used as a parachute around the mandatory timing lane beneath it.
export function closePipelineSkyLoop(detour){
 const update=detour.update.bind(detour),respawn=detour.onRespawn.bind(detour),stage=detour.stage,game=detour.game,session=detour.session;
 let retired=false;onCatStageDispose(stage,()=>{retired=true;});
 const live=()=>!retired&&!session.disposed&&!stage.disposed&&game.session===session&&game.stage===stage;
 const dock=detour.home.clone();dock.y=detour.track.heightAt(detour.entryD)+.05;
 const exitLine=stage.entities.find(e=>e.detour&&e.A&&e.B&&Math.abs(detour.track.project(e.B.x,e.B.z).s-233.6)<.1);
 detour.pipelineActive=false;
 detour.update=()=>{
  if(!live())return;
  update();const p=game.player;
  if(!live()||!detour.pipelineActive||detour.busy||p.dead||p.frozen)return;
  const s=p.body.s,relative=p.pos.y-detour.track.heightAt(s);
  if(exitLine&&p.hang?.line===exitLine){detour.pipelineExiting=true;return;}
  // The owned descending line ends above its authored main-floor dock. Let the
  // real hang/release physics finish there, rather than truncating its descent.
  if(detour.pipelineExiting&&!p.hang&&Math.abs(s-233.6)<1.2&&relative<1.8){detour.pipelineActive=false;detour.pipelineExiting=false;return;}
  if(relative<detour.y-2||s>273||s<231||(p.body.grounded&&relative>=detour.y-2&&!detour.solids.has(p.body.ground))){
   detour.pipelineActive=false;detour.pipelineExiting=false;detour.travel(dock,detour.entryD);
  }
 };
 detour.onRespawn=()=>{if(!live())return;respawn();detour.pipelineExiting=false;const cp=session.cp?.pos;if(!cp){detour.pipelineActive=false;return;}const pr=detour.track.project(cp.x,cp.z);detour.pipelineActive=pr.s>=232&&pr.s<=273&&cp.y-detour.track.heightAt(pr.s)>=detour.y-2;};
 detour.pipelineDock=dock;detour.pipelineExitLine=exitLine;return detour;
}
