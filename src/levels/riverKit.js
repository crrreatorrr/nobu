import * as THREE from 'three';
import { ownRiverRoot } from '../entities/riverResources.js';
import { Whirlpool, Outflow, Slick, DriftLog, FloatDisc, PityLily } from '../entities/river.js';
import { CoconutRoller } from '../entities/props.js';
import { RaftController } from '../entities/raftController.js';
// Level-local extension: existing builders keep the original kit and ride defaults.
export function installRiverKit(k,game,stage){
 stage.waterDeath='splash';
 const water=k.water;
 k.water=(...args)=>{const before=new Set(stage.scene.children);water(...args);const root=new THREE.Group();for(const node of [...stage.scene.children])if(!before.has(node))root.add(node);stage.scene.add(root);ownRiverRoot(stage,root);};
 k.raft=(d0,d1,options={})=>{
  if(!(d1>d0))throw Error('Raft span must run downstream');
  stage.raftSpans??=[];if(stage.raftSpans.some(r=>d0<r.d1&&d1>r.d0))throw Error('Raft spans overlap');
  const cfg={speed:11,steer:6,hop:1,airJumps:0,y:-1,w:9.2,color:0x5a8a7a,...options};
  const falls=(options.falls||[]).map(pair=>[...pair]).sort((a,b)=>a[0]-b[0]),boost=(options.boost||[]).map(row=>[...row]);
  if(falls.some(([a,b],i)=>a<d0||b>d1||b<=a||(i>0&&a<falls[i-1][1])))throw Error('Invalid raft falls');
  const span={d0,d1,cfg,falls,boost,floors:[]};cfg.boost=boost;
  let start=d0;for(const [a,b] of [...falls,[d1,d1]]){if(a>start){k.water(start,a,{w:cfg.w,y:cfg.y,color:cfg.color});const floor=k.track.ground(start,a,{u:0,w:cfg.w,dy:cfg.y+.02,visible:false,style:'platform'});floor.raftSpan=span;span.floors.push(floor);}start=b;}
  stage.raftSpans.push(span);stage.raftSpans.sort((a,b)=>a.d0-b.d0);
  if(!stage.raftController)stage.raftController=stage.add(new RaftController(stage,k.track));stage.raftController.addSpan(span);for(const fall of falls)stage.add(new PityLily(stage,k.track,span,fall));return span;
 };
 k.whirlpool=(x,d,o)=>stage.add(new Whirlpool(stage,k.track,x,d,o));
 k.outflow=(d,o)=>stage.add(new Outflow(stage,k.track,d,o));
 k.slick=(d0,d1,o)=>stage.add(new Slick(stage,k.track,d0,d1,o));
 k.driftLog=(d,o)=>stage.add(new DriftLog(stage,k.track,d,o));
 k.floatPack=(x,d,n)=>{const pack=k.pack(x,-1,d,n);stage.add(new FloatDisc(stage,pack));return pack;};
 k.coconuts=(d,o)=>stage.add(new CoconutRoller(stage,k.track,d,o));
 return k;
}
