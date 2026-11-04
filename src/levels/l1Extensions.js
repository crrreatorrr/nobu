// Layout2 candidate authoring. It is never selected by the shipped layout1 registry entry.
import * as THREE from 'three';
import { Entity } from '../entities/entity.js';
import { placeHiddenBone } from '../entities/hiddenBone.js';
import { L1_CHASE_RAW_ITEMS,L1_CHASE_CANDIDATE_ITEMS,L1_TEMPLE_RAW_PATTERN,L1_TEMPLE_CANDIDATE_PATTERN } from './data/l1-layout2.js';
import { armCanopySquirrel } from './l1Ambush.js';
import { L1CoconutChase } from './l1CoconutChase.js';
import { validatePattern } from './gauntletMath.js';

export function buildL1Extensions(k,game,stage,{labels,corrections=false}={}) {
  const CW=249,CR=362,ST=438;
  const gatedTickets=fn=>{const from=game.tickets.list.length;fn();for(const tk of game.tickets.list.slice(from))tk.source='jackpot';};
  if(corrections)k.snacks(1.2,0,248); // Proposed: protect the long new Canopy section.
  k.tut(CW+1,'zipline');k.floor(CW+3,CW+17,{x:1.9,w:4.8});
  k.platform(1.2,1.6,CW+5,3,3);k.zipline(1.2,3.8,CW+5.5,1.2,2.8,CW+15,{speed:7});
  k.tix(1.2,2.2,CW+7,1.2,1.4,CW+14,5);k.pack(3.2,0,CW+9);k.pack(3.2,0,CW+11);
  k.dog(3.3,0,CW+13,'pug').dogId='1:pug-b';
  k.platform(1.2,1.4,CW+17.5,3,3);k.zipline(1.2,3.6,CW+18,-1,3,CW+28,{speed:8});
  k.tix(1,2.4,CW+20,-.8,2,CW+27,4);k.platform(-1,1.8,CW+30,3,3);
  k.pack(-2,1.8,CW+30.5);k.pack(0,1.8,CW+30.5);k.zipline(-1,4,CW+31,1,3.2,CW+41,{speed:8.5});
  k.tixArc(-.8,2.6,CW+32,.8,CW+40,.8,5);k.crumble(1,1.8,CW+43,{w:2.6,d:2.6});k.crumble(-.6,1.8,CW+46,{w:2.4,d:2.4});
  k.platform(-.6,2.2,CW+49.5,3,3);k.pitySnacks(-.6,2.2,CW+49.5);
  k.mystery(-2.4,2.2,CW+50.5,{slot:0});
  k.zoomieGate(2.6,0,CW+(corrections?72:62),{plateD:CW+59,open:corrections?1.2:2.2});
  const moon=k.moonLedge(2.6,9,CW+52,{w:2.4,dd:2.4,gatedBox:k.gatedArea(1.3,3.9,8.8,11,CW+50.5,CW+53.5)});
  const extra=k.oneUp(2.6,9,CW+52);extra.countable=false;gatedTickets(()=>k.tixRing(2.6,9.4,CW+52,.7,10));
  k.zipline(-.6,4.4,CW+50,0,1.6,CW+58,{speed:9});k.floor(CW+58,CW+75);
  armCanopySquirrel(k.squirrel(.6,0,CW+63),CW+59);k.snacks(-2.6,0,CW+60);k.tix(-2.4,0,CW+64,-2.4,0,CW+73,5);
  k.packs([[2.4,CW+68],[-2.4,CW+70],[0,CW+72]]);
  gatedTickets(()=>k.tix(2.6,.2,CW+(corrections?73:61),2.6,.2,CW+(corrections?75:64),3));
  k.walls([[CW+17,4.3,4.3,2.6],[CW+19,5.2,5.2,2.6],[CW+57,5.2,5.2,2.6],[CW+59,4.3,4.3,2.6]]);

  k.snacks(-2.6,0,CR-2);k.tut(CR-1,'chase');k.floor(CR,CR+37);k.floor(CR+40.5,CR+55);
  stage.l1CoconutChase=stage.add(new L1CoconutChase(stage,k.track));
  k.tix(0,0,CR+4,0,0,CR+12,4);k.log(CR+14);k.tix(1.6,0,CR+17,1.6,0,CR+24,4);
  const chaseItems=corrections?L1_CHASE_CANDIDATE_ITEMS:L1_CHASE_RAW_ITEMS;
  for(const p of chaseItems){if(p.kind==='stack')k.stack(p.x,p.y,p.d,p.height);else k.pack(p.x,p.y,p.d);}
  k.pitySnacks(2.8,0,CR+31);k.tixArc(0,0,CR+36,0,CR+42,2.2,4);
  if(corrections)k.snacks(-2.6,0,CR+54);

  k.floor(ST+4,ST+8,{y:[0,.8],style:'platform'});k.floor(ST+8,ST+12,{y:[.8,1.6],style:'platform'});k.floor(ST+12,ST+20,{y:1.6,style:'platform'});
  k.spiky(-1.2,.8,ST+9,{range:1});k.spiky(1.4,1.6,ST+14,{range:1.4});k.stack(-2.8,1.6,ST+16,2);k.pack(2.8,1.6,ST+17);
  k.tix(0,0,ST+3,0,1.6,ST+12,5);k.snacks(0,1.6,ST+19);
  k.water(ST+20,ST+40,{y:-1});k.floor(ST+20,ST+21,{y:1.6,style:'platform',depth:.6});
  for(const [d,period,phase] of [[23,3.2,0],[26.5,3.2,1.6],[30,3,0],[33.5,3,1.5]])k.flip(.6,.6,ST+d,{w:2.8,d:2.2,period,phase});
  k.lily(-2.4,0,ST+25);k.lily(-3,0,ST+28.5);k.floor(ST+35.5,ST+40,{w:3.4,x:.6,style:'platform',depth:.6});k.tix(.6,1,ST+22,.6,1,ST+34,6);
  k.platform(.6,2.4,ST+40.5,3,2.4);k.zipline(.6,4.6,ST+41,-.8,3.2,ST+50,{speed:8.5});k.water(ST+41,ST+55,{y:-1});
  k.crumble(-.8,1.2,ST+52,{w:2.6,d:2.6});k.crumble(.8,1.2,ST+54.5,{w:2.6,d:2.6});k.tixArc(.4,2.8,ST+42,-.6,ST+49,.6,4);k.pitySnacks(0,0,ST+57);
  k.floor(ST+56,ST+76);k.boneSwitch(-2.8,0,ST+59,[[-1.6,1.4,ST+62,2.2,2.2],[.6,2.8,ST+64.5,2.2,2.2],[2.6,4.2,ST+67,2.6,3]]);
  k.dog(2.6,4.2,ST+67.5,'corgi').dogId='1:corgi-b';k.zipped(2,4.2,ST+66.4);k.cat(1.2,0,ST+62);k.stack(2.6,0,ST+62,2);k.pack(.2,0,ST+63.5);
  k.snacks(-2.6,0,ST+71);k.tix(-2.4,0,ST+66,-2.4,0,ST+75,4);
  k.floor(ST+76,ST+82);k.floor(ST+82,ST+86,{y:-1.2,depth:2});k.water(ST+86,ST+92,{y:-1});k.floor(ST+92,ST+95);
  const pattern=corrections?L1_TEMPLE_CANDIDATE_PATTERN:L1_TEMPLE_RAW_PATTERN;
  const worldPattern={...pattern,pieces:pattern.pieces.map(p=>({...p,dd:undefined,d:ST+p.dd,y:p.kind==='floorEnd'||p.kind==='floorStart'?k.track.groundAt(ST+p.dd,p.x).y:k.track.heightAt(ST+p.dd)+p.y}))};
  stage.timedPatterns.push(worldPattern);
  for(const p of pattern.pieces){if(p.kind==='blink')k.blinkBox(p.x,p.y,ST+p.dd,{...p.params,tier:1});else if(p.kind==='lunch')k.lunch(p.x,p.y,ST+p.dd);}
  k.bounceChain(pattern.pieces.filter(p=>p.kind==='pack').map(p=>[p.x,p.y,ST+p.dd]),{tier:1});
  if(corrections){k.guideArc(-1,.4,ST+82,1,ST+86,1.2,8);k.guideArc(0,.4,ST+87,1.2,ST+92,1.8,8);}
  else {k.tixArc(-1,.4,ST+82,1,ST+86,1.2,3);k.tixArc(0,.4,ST+87,1.2,ST+92,1.8,3);}
  k.walls([[ST+19,4.3,4.3,2.6],[ST+20,4.6,4.6,3.2],[ST+55,4.6,4.6,3.2],[ST+56,4.3,4.3,2.6]]);

  // Open trench: no roof, no later-move countables, and no top-level darkness on the old hill.
  const before=stage.entities.length;k.section(228,258,labels.burrow,{detour:true});k.floor(228,258,{x:-2.5,w:3.6,y:-4.5,depth:2});
  // Keep the authored wall dimensions; short curved pieces avoid broad diagonal AABBs.
  const wallStep=corrections?1:6;
  for(let d=228;d<258;d+=wallStep){k.platform(-4.6,0,d+wallStep/2,.6,wallStep,4.5);k.platform(-.45,0,d+wallStep/2,.5,wallStep,4.5);}
  const dark=k.dark(228,258,{radius:5,baseY:-4.5,x:-2.5});const contains=dark.contains.bind(dark);dark.contains=(s,y=game.player.pos.y)=>y<k.track.heightAt(s)-1.5 && contains(s,y);
  k.water(232,236,{y:-5.8,w:3.6});k.lunch(-2.5,-5,233);k.lunch(-2.5,-5,235);k.shellback(-2.5,-4.5,239,{range:1.2});
  k.dog(-2.6,-4.5,244,'dalmatian').dogId='1:dalmatian-b';k.pack(-3.4,-4.5,246);k.pack(-1.6,-4.5,246);k.tix(-2.5,-4.3,229,-2.5,-4.3,250,7);k.mushroom(-2.5,-4.5,251,{power:17});
  const dustBox=k.gatedArea(-4.3,-.7,-4.6,-1.3,254,258);const wall=k.dustWall(-2.5,-4.5,253,{w:3.6,h:3,gatedBox:dustBox});const bone=placeHiddenBone(k,game,stage,-2.5,-4.5,255.5,{move:'dust'});
  if(bone){
    const cage=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.25,1.9,1.25)),new THREE.LineBasicMaterial({color:0xb0b0c0,transparent:true,opacity:.8}));
    cage.position.y=.95;bone.obj.add(cage);
    const collect=bone.collect.bind(bone),update=bone.update.bind(bone);
    const sync=()=>{cage.visible=!wall.broken;bone.bone.material.color.setHex(wall.broken?0x74ffff:0x8a8a90);bone.bone.material.opacity=bone.owned?.22:wall.broken?1:.35;};
    bone.collect=()=>{if(wall.broken)return collect();game.ui.tutorial('dustwall');};
    bone.update=dt=>{update(dt);sync();};bone.dustWall=wall;sync();
  }
  for(const e of stage.entities.slice(before))e.detour=true;
  buildWaterfallHollow(k,game,stage,labels);
  stage.l1Extension={layout:2,corrections,gauntletProblems:validatePattern(worldPattern),chaseItems};
}

function buildWaterfallHollow(k,game,stage,labels) {
  const ST=438;let start,floorY=Infinity;
  const detour=k.detour(ST+29,ST+66,{y:9,x:-3,entry:'pipe',build(kd){
    kd.section(labels.waterfallHollow);const floors=kd.floor(ST+29,ST+66,{x:-1,w:3.2,y:0,style:'platform',depth:.8});
    floorY=Math.min(...floors.map(e=>e.solid.max.y));start=kd.start(-1,.05,ST+30).clone();
    kd.flip(-1,0,ST+38,{w:3,d:2.2,period:3.4});kd.flip(-1,0,ST+41,{w:3,d:2.2,period:3.4,phase:1.7});
    kd.dog(-1.6,0,ST+47,'shiba').dogId='1:shiba-c';kd.mystery(-.2,0,ST+50,{slot:1});kd.oneUp(-1,0,ST+56);kd.tix(-1,0,ST+31,-1,0,ST+63,8);
    const vent=kd.smogVent(-1,0,ST+60,{lift:6,gatedBox:k.gatedArea(-2.2,.2,14.5,17,ST+58.5,ST+61.5)});
    kd.platform(-1,6,ST+60,2.4,2.4);const from=game.tickets.list.length;kd.tixRing(-1,6.4,ST+60,.7,15);for(const tk of game.tickets.list.slice(from))tk.source='jackpot';
  }});
  const lost=k.W(-3,.05,ST+28.5),kept=k.W(-1,.05,ST+66);
  detour.round={start,back:lost.clone(),floorY,facing:k.yawAt(ST+30)};
  detour.onRoundLeave=(keep,B)=>{B.R.back.copy(keep?kept:lost);};
  const respawn=detour.onRespawn.bind(detour);
  detour.onRespawn=()=>{respawn();detour.used=false;};
  detour.travel=async()=>{if(!detour.used && !game.session.busy)await game.session.enterBonusRound(detour);};
  const exit=new Entity(stage,...k.W(-1,9,ST+65).toArray());exit.interactive=false;exit.alwaysActive=true;
  exit.update=()=>{const s=game.session,p=game.player;if(s.bonusRound?.tray===detour && !s.busy && !p.dead && p.pos.distanceTo(exit.pos)<1.4)s.finishBonusRound();};
  stage.add(exit);stage.l1Hollow={detour,exit,lost,kept};
}
