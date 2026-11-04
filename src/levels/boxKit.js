// Installed by makeKit after its track-space API exists. Kept separate from unrelated kit props.
import * as THREE from 'three';
import { BlinkBox, FallBox, SlideBox } from '../entities/boxes.js';
import { Entity } from '../entities/entity.js';
const ringGeo=new THREE.RingGeometry(.28,.36,20);
const ringMat=new THREE.MeshLambertMaterial({color:0xffd23f,side:THREE.DoubleSide});
const guideGeo=new THREE.SphereGeometry(.08,6,4);
const guideMat=new THREE.MeshBasicMaterial({color:0xffd23f});
export function installBoxHelpers(k, game, stage) {
  stage.timedBoxes ||= [];
  stage.timedPatterns ||= [];
  k.boxPatterns=stage.timedPatterns;
  const timed=(Cls,kind,x,y,d,params={})=>{
    const caps={blink:40,fall:48,slide:24};
    if(stage.timedBoxes.filter(p=>p.kind===kind).length>=caps[kind])throw new RangeError(`Too many ${kind} boxes in stage`);
    const world=k.W(x,y,d),e=new Cls(stage,...world.toArray(),params);
    e.obj.rotation.y=k.yawAt(d)+Math.PI;
    stage.add(e);stage.timedBoxes.push({kind,x,y,d,params:{...params},entity:e});return e;
  };
  k.blinkBox=(x,y,d,o={})=>timed(BlinkBox,'blink',x,y,d,o);
  k.fallBox=(x,y,d,o={})=>timed(FallBox,'fall',x,y,d,o);
  k.slideBox=(x,y,d,o={})=>{
    const dir=o.axis==='y'?new THREE.Vector3(0,1,0):o.axis==='z'?k.fwdAt(d):k.rightAt(d);
    const e=timed(SlideBox,'slide',x,y,d,{...o,dir,yaw:k.yawAt(d)});
    // End markers are visual only, including above timing pits.
    for(const sign of [-1,1]) {
      const mark=new THREE.Mesh(new THREE.BoxGeometry(.12,.025,.4),new THREE.MeshBasicMaterial({color:0xffffff}));
      mark.position.copy(e.home).addScaledVector(dir,sign*e.range);mark.position.y+=.02;
      const decor=new Entity(stage,...mark.position.toArray());decor.interactive=false;decor.obj.add(mark);mark.position.set(0,0,0);stage.add(decor);
    }
    return e;
  };
  k.bounceChain=(points,{y=0}={})=>points.map(point=>{
    const [x,a,b]=point,d=b??a,yy=y+(b===undefined?0:a);
    const gauntlet=stage.gauntlet || /^g[1-3]$/.test(String(game.session?.level));
    const e=k.pack(x,yy,d,gauntlet?0:1);
    const update=e.update?.bind(e);e.update=dt=>{update?.(dt);if(e.distToPlayer?.()<7)game.ui?.tutorial?.('bouncechain');};
    const ring=new THREE.Mesh(ringGeo,ringMat);ring.rotation.x=-Math.PI/2;ring.position.y=1.015;
    (e.model||e.body||e.obj).add(ring);return e;
  });
  k.arrowChain=(points,{power=16}={})=>points.map((point,i)=>{
    const [x,a,b]=point,d=b??a,yy=b===undefined?0:a;
    const e=k.arrowBox(x,yy,d,power),next=points[i+1];
    const target=next?k.W(next[0],next.length===3?next[1]:0,next.at(-1)):e.home.clone().add(k.fwdAt(d));
    const yaw=Math.atan2(target.x-e.home.x,-(target.z-e.home.z));
    const decal=e.body?.children.find(o=>o.geometry?.type==='PlaneGeometry');
    if(decal)decal.rotation.z=-(yaw-e.obj.rotation.y);
    return e;
  });
  k.guideArc=(x0,y0,d0,x1,d1,h=2,n=12)=>{
    const e=new Entity(stage,0,0,0);e.interactive=false;e.countable=false;
    for(let i=0;i<n;i++){
      const t=n===1?0:i/(n-1),dot=new THREE.Mesh(guideGeo,guideMat);
      dot.position.copy(k.W(x0+(x1-x0)*t,y0+.9+Math.sin(t*Math.PI)*h,d0+(d1-d0)*t));e.obj.add(dot);
    }
    stage.add(e);return e;
  };
  return k;
}
