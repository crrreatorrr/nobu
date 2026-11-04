import { GAUNTLET_TEXT } from '../story/script.js';
import * as THREE from 'three';
import {Entity} from '../entities/entity.js';
import {GauntletMetronome} from '../entities/gauntletMetronome.js';
import {ownGauntletMaterials} from '../entities/gauntletResources.js';
import { makeKit,makeTrack,turtle } from './kit.js';
import { GAUNTLET_INFO,GAUNTLET_PATTERNS,GAUNTLET_SOURCE_PATTERNS } from './data/gauntlets.js';
import { validatePattern } from './gauntletMath.js';

// Path distance is conservative on these curves; use actual world heights for every jump.
export function gauntletWorldPattern(pattern,track){return {...pattern,pieces:pattern.pieces.map(p=>({...p,y:track.toWorld(p.dd,p.x||0,p.y||0).y}))};}
export function gauntletProblems(patterns,track){return patterns.flatMap(p=>validatePattern(gauntletWorldPattern(p,track)).map(e=>({pattern:p.id,...e})));}
function place(k,p){
  k.boxPatterns.push(p);
  const arrows=p.pieces.filter(q=>q.kind==='arrow');
  const bounces=new Set(p.route.filter(s=>s.move.startsWith('bounce')).map(s=>s.from));
  const packs=p.pieces.filter((q,i)=>q.kind==='pack'&&bounces.has(i));
  if(packs.length)k.bounceChain(packs.map(q=>[q.x,q.y,q.dd]),{gauntlet:true,tier:p.tier});
  if(arrows.length)k.arrowChain(arrows.map(q=>[q.x,q.y,q.dd]),{power:arrows[0].params.power,tier:p.tier});
  for(const q of p.pieces){
    const {kind,x,y,dd:d,params}=q;
    if(kind==='pack'&&!packs.includes(q))k.pack(x,y,d,0);
    else if(kind==='lunch')k.lunch(x,y,d);
    else if(kind==='blink')k.blinkBox(x,y,d,{...params,tier:p.tier,group:p.id});
    else if(kind==='fall')k.fallBox(x,y,d,{...params,tier:p.tier});
    else if(kind==='slide')k.slideBox(x,y,d,params);
    else if(kind==='rug')k.rug(x,y,d);
    else if(kind==='cat')k.cat(x,y,d);
    else if(kind==='switch')k.vacSwitch(x,y,d);
  }
  const floors=p.pieces.filter(q=>q.kind==='floor');
  if(floors.length===2)k.floor(floors[0].dd,floors[1].dd,{w:3,y:floors[0].y});
}
function ceiling(k,stage,top,d,width,length,depth){
  const e=k.platform(0,top,d,width,length,depth);
  const material=new THREE.MeshBasicMaterial({color:0x88a4c4,wireframe:true,transparent:true,opacity:.35,depthWrite:false});
  e.obj.traverse(o=>{if(o.isMesh)o.material=material;});ownGauntletMaterials(stage,[material]);return e;
}
function stack(k,x,y,d,h){for(let i=0;i<h;i++)k.pack(x,y+i,d,0);}
function checkpoint(k,x,y,d){const e=k.snacks(x,y,d);e.countable=false;return e;}
function decorate(k,stage,info){
  const prop=obj=>{const materials=new Set();obj.traverse(o=>{if(o.material)materials.add(o.material);});ownGauntletMaterials(stage,materials);const e=new Entity(stage,...obj.position.toArray());e.interactive=false;obj.position.set(0,0,0);e.obj.add(obj);stage.add(e);};
  if(info.id==='g1'){
    k.banks(-8,info.end,(x,y,d)=>{k.palm(x,y,d,5);k.bush(x,y,d,1.3);},{every:12});
    k.edges(-8,info.end,(x,y,d)=>k.fern(x,y,d,.7));k.grass(-8,info.end,{every:3});
  }else if(info.id==='g2'){
    k.banks(-8,info.end,(x,y,d)=>{k.pipe(x,y,d,4);k.vat(x+Math.sign(x)*2,y,d,1);},{every:18});
    k.edges(-8,info.end,(x,y,d)=>k.vent(x,y,d),{every:15});
  }else{
    // Dog-scale laundry props use only primitive meshes and existing materials.
    for(let d=10;d<info.end;d+=26){
      const sock=new THREE.Group(),mat=new THREE.MeshLambertMaterial({color:d%3?0xf2e6d0:0x79b5cf});
      const leg=new THREE.Mesh(new THREE.BoxGeometry(1.3,4,1),mat),toe=new THREE.Mesh(new THREE.BoxGeometry(2.5,1,1),mat);
      leg.position.y=2;toe.position.set(.6,.5,0);sock.add(leg,toe);sock.position.copy(k.W(d%2?-6:6,3.4,d));prop(sock);
      if(d===62){const basket=new THREE.Mesh(new THREE.CylinderGeometry(2.2,1.8,3.3,12,1,true),new THREE.MeshLambertMaterial({color:0xc8ae86,wireframe:true}));basket.position.copy(k.W(-7,5,d));prop(basket);}
      if(d===114){const ring=new THREE.Mesh(new THREE.TorusGeometry(2,.25,8,24),new THREE.MeshPhongMaterial({color:0xb8c2d0}));ring.position.copy(k.W(7,5.5,d));ring.rotation.y=Math.PI/2;prop(ring);}
    }
  }
}
export function buildGauntlet(id,game,stage,tickets,{corrections=true,decor=true}={}){
  const info=GAUNTLET_INFO[id];if(!info)throw new RangeError(`Unknown gauntlet ${id}`);
  stage.gauntlet=true;stage.tier=info.tier;
  const track=makeTrack(stage,turtle([0,0,10],info.moves)),k=makeKit(game,stage,tickets,track);
  const patterns=(corrections?GAUNTLET_PATTERNS:GAUNTLET_SOURCE_PATTERNS)[id];
  k.walls([[-8,4.3,4.3,id==='g1'?2.6:3.4],[info.end+2,4.3,4.3,id==='g1'?2.6:3.4]]);
  k.backstop(-8);k.backstop(info.end);
  for(const p of patterns){place(k,p);k.water(p.pieces[0].dd,p.pieces.find(q=>q.kind==='floorStart').dd,{y:id==='g1'?-6:-7,color:id==='g2'?0x903acc:0x3aa8d8});}
  if(id==='g1'){
    k.floor(-8,20);k.sign(-2.8,0,2,GAUNTLET_TEXT.startSign);
    for(const[d,h]of[[8.5,1],[12,2],[15.5,3]])for(let i=0;i<h;i++)k.lunch(0,i,d);
    k.pack(0,3,15.5,0);k.guideArc(0,1,8.5,0,15.5,2.5);
    k.floor(36.5,50);checkpoint(k,0,0,44);k.pack(-2,0,47,0);k.pack(2,0,47,0);k.pitySnacks(0,0,39);
    k.floor(61,70);k.pack(0,0,66,0);k.floor(86.5,96);checkpoint(k,0,0,92);k.pitySnacks(0,0,88);
    k.floor(113,124,{y:2});stack(k,0,2,118,2);k.floor(124,130,{y:[2,0]});k.pitySnacks(0,corrections?2/3:0,128);
    k.floor(147,158,{y:4});k.pack(-2,4,151,0);k.pack(2,4,151,0);
  }else if(id==='g2'){
    k.floor(-8,8);k.pack(-2.5,0,4,0);k.pack(2.5,0,4,0);k.floor(28.5,36);k.pack(0,0,31,0);
    k.floor(53,64,{y:5});checkpoint(k,0,5,58);stack(k,2.5,5,61,2);
    k.floor(84,92,{y:5});k.pitySnacks(0,5,86);k.floor(92,100,{y:[5,0]});
    k.floor(114,124);checkpoint(k,0,0,120);k.floor(141,145);k.pitySnacks(0,0,143);
    k.floor(169.5,180,{y:2});k.pack(-2,2,173,0);k.pack(2,2,173,0);
  }else{
    k.floor(-8,6);k.floor(29.5,36);k.pack(0,0,33,0);
    k.floor(57.6,66);checkpoint(k,0,0,62);stack(k,-2.5,0,64,2);k.pack(0,7,77,0);
    k.floor(80,88,{y:7});k.pitySnacks(0,7,84);k.floor(110,118);checkpoint(k,0,0,114);
    k.floor(144.5,150,{y:1});k.pitySnacks(0,1,147);
    if(corrections){
      ceiling(k,stage,12,163.5,8.6,7,3);
      ceiling(k,stage,12,169,8.6,4,6.5);
    }else k.platform(0,9.5,163,3,6);
    k.floor(175.5,186,{y:3});k.pack(-2,3,179,0);k.pack(2,3,179,0);
  }
  stage.add(new GauntletMetronome(stage));
  k.trigger(info.goal,()=>game.session.reachGoal());
  if(decor)decorate(k,stage,info);
  stage.gauntletInfo={...info,patterns,problems:gauntletProblems(patterns,track)};
  return {spawn:k.W(0,0,1),facing:track.yaw(1),camera:{mode:'track',track,height:4.6,dist:8.6,ahead:6.5}};
}
export const buildGauntlet1=(...args)=>buildGauntlet('g1',...args);
export const buildGauntlet2=(...args)=>buildGauntlet('g2',...args);
export const buildGauntlet3=(...args)=>buildGauntlet('g3',...args);
