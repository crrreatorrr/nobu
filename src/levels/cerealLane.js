// A cutaway cereal cabinet seals the timing lane without changing any player move.
// Small collision tiles follow the curved track: one wide rotated AABB would
// extend low braces several metres past their visible faces.
import * as THREE from 'three';
import { Entity } from '../entities/entity.js';
import { Solid } from '../world/physics.js';

export function buildCerealLane(stage,track){
  const boxes=stage.timedBoxes.filter(p=>p.d>=348&&p.d<=362).sort((a,b)=>a.d-b.d);
  if(boxes.length!==5)throw new Error('Cereal lane requires its five authored timing boxes');
  const highest=Math.max(...boxes.map(p=>p.entity.solid.max.y));
  const exitTop=boxes.at(-1).entity.solid.max.y+2.8;
  const ceiling=Math.max(highest+2.1,exitTop+1.5),top=ceiling+24;
  const panels=[],solids=[];
  const shell=new THREE.MeshLambertMaterial({color:0xbda575,transparent:true,opacity:.10,depthWrite:false,side:THREE.FrontSide});
  const trim=new THREE.LineBasicMaterial({color:0xb3833d,transparent:true,opacity:.7});
  function panel(x,d,w,depth,bottom,height,{widthStep=.55,outline=true}={}){
    const point=(track.authorToWorld||track.toWorld).call(track,d,x,0),yaw=track.yaw(d),obj=new Entity(stage,point.x,bottom,point.z);
    obj.interactive=false;obj.obj.rotation.y=yaw;
    const geo=new THREE.BoxGeometry(w,height,depth),mesh=new THREE.Mesh(geo,shell);mesh.position.y=height/2;
    obj.obj.add(mesh);
    if(outline){const frame=new THREE.LineSegments(new THREE.EdgesGeometry(geo),trim);frame.position.y=height/2;obj.obj.add(frame);}
    stage.add(obj);panels.push(obj);
    const n=Math.ceil(w/widthStep),tile=w/n,c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw));
    for(let i=0;i<n;i++){
      const p=(track.authorToWorld||track.toWorld).call(track,d,x-w/2+tile*(i+.5),0),hx=(tile*c+depth*s)/2,hz=(tile*s+depth*c)/2;
      solids.push(stage.world.add(new Solid({x:p.x-hx,y:bottom,z:p.z-hz},{x:p.x+hx,y:bottom+height,z:p.z+hz},{ref:obj})));
    }
    return obj;
  }
  // A continuous visible lid prevents dropping into the lane from the six-metre
  // green-bone shelf. Its cutaway material keeps the existing camera readable.
  for(let i=0;i<26;i++){const d=345.5+i*.75;panel(0,d,8.8,.95,ceiling,.3,{outline:i===0||i===25});}
  for(let i=0;i<26;i++)for(const x of [-4.2,4.2])panel(x,345.5+i*.75,.35,.95,-24,top+24,{outline:i===0||i===25});
  // Low braces are just above standing height at each timed landing. A player
  // crossing while gliding must settle onto a live box before the next launch.
  for(const p of boxes){const bottom=p.entity.solid.max.y+1.65;panel(0,p.d,8.8,.12,bottom,ceiling+.3-bottom,{widthStep:.28}).cerealBrace=true;}
  // The cabinet's end blocks walking over its roof. A raised exit threshold also
  // removes the long downward Glide escape; the dog behind it stays on its floor.
  const exitRest=panel(0,364.3,8.8,.45,-24,exitTop+24);
  const exitHead=panel(0,364.3,8.8,.45,ceiling,24);
  const lane={boxes,panels,solids,ceiling,exitTop,top,entry:345.5,exit:364.3,exitRest,exitHead};
  stage.cerealLane=lane;return lane;
}
