import { chaseDda } from '../entities/chaser.js';
import { Entity } from '../entities/entity.js';
import { TopplingPost, YarnAvalanche } from '../entities/canyonHazards.js';
import { placeHiddenBone } from '../entities/hiddenBone.js';
import { SB, CF, SF, YA, extendedD as D, EXTENDED_DETOUR_ITEMS, CANYON_BOUNCE_ITEM } from './data/l2-extended.js';

export function installCanyonKit(k,game,stage) {
  const snacks=k.snacks;
  k.snacks=(x,y,d,{resetChase=false}={})=>{
    const e=snacks(x,y,d),hit=e.hit.bind(e);
    e.hit=()=>{const fresh=!e.broken;hit();if(fresh&&resetChase){const cp=game.session.cp.pos;const s=k.track.project(cp.x,cp.z).s;game.session.chase?.begin(s-13,1.6);}};
    return e;
  };
}
function loopRound(detour,k,game,stage,{start,exit,startD,exitD,exitX=0,floorY}) {
  const lost=k.W(0,.05,startD),kept=k.W(exitX,.05,exitD);
  detour.used=false;
  detour.round={start,back:lost.clone(),floorY,facing:k.yawAt(startD)};
  detour.onRoundLeave=(keep,B)=>{B.R.back.copy(keep?kept:lost);B.R.facing=k.yawAt(keep?exitD:startD);game.session.chase?.begin((keep?exitD:startD)-13,1.6);};
  const respawn=detour.onRespawn.bind(detour);detour.onRespawn=()=>{respawn();detour.used=false;};
  detour.travel=async()=>{if(!detour.used&&!game.session.busy&&!game.session.trial)await game.session.enterBonusRound(detour);};
  const e=new Entity(stage,...exit.toArray());e.interactive=false;e.alwaysActive=true;
  e.update=()=>{if(game.session.bonusRound?.tray===detour&&!game.session.busy&&!game.player.dead&&game.player.pos.distanceTo(e.pos)<1.4)game.session.finishBonusRound();};
  stage.add(e);return e;
}
export function buildCanyonSections(k,game,stage,chase,labels={}, {corrections=true}={}) {
  k.floor(SB,SB+60,{w:9.2});k.floor(SB+16,SB+20,{w:9.2,y:[0,1.5]});k.floor(SB+36,SB+40,{w:9.2,y:[0,1.5]});
  k.pitySnacks(-2.6,0,SB+35);
  const hazard=e=>{const update=e.update.bind(e);e.update=dt=>update(dt*chaseDda(game.session));return e;};
  k.tut(SB+1,'cutcorner');k.tix(-2.6,0,SB+4,-2.6,0,SB+12,4);k.tix(2.6,0,SB+28,2.6,0,SB+34,3);hazard(k.mouse(0,0,SB+29,{range:3.4,speed:5}));k.tix(2.6,0,SB+47,2.6,0,SB+56,5);
  for(const d of [SB+8,SB+28,SB+48])k.post(-5.3,0,d,5);
  k.floor(CF,CF+14,{w:9.2});k.walls([[CF,4.6,4.6,3.2],[CF+.5,3,3,3.6],[CF+13.5,3,3,3.6],[CF+14,4.6,4.6,3.2]]);
  k.tixRing(1.4,.4,CF+8,1,6);k.trigger(CF+1,()=>chase.hold());k.trigger(CF+13,()=>chase.begin(CF-1,1));
  for(const x of [-3.2,3.2])for(let d=CF+1;d<CF+13;d+=2)k.platform(x,0,d,.22,2,2.6);
  k.floor(SF,SF+90,{w:9.2});
  for(const [x,d,w,period,phase]of[[0,12,8.6,4,0],[-2.2,26,4.2,3.4,0],[2.2,29,4.2,3.4,1.7],[0,68,8.6,3,.6],[-2.2,78,4.2,3,1.5]])stage.add(new TopplingPost(stage,...k.W(x,0,SF+d).toArray(),{w,d:1.6,period,phase,yaw:k.yawAt(SF+d)}));
  k.tix(0,0,SF+4,0,0,SF+10,3);k.floor(SF+44,SF+50,{x:2.6,w:2,y:[0,2.4],style:'platform'});k.tix(2.6,2.8,SF+50,2.6,2.8,SF+57,4);
  k.pitySnacks(-2.6,0,SF+62);hazard(k.yarn(-2.4,0,SF+72,{range:3.2,speed:5.2}));hazard(k.yarn(2.4,0,SF+82,{range:3.2,speed:5.6}));
  k.tix(-2.6,0,SF+64,-2.6,0,SF+70,4);k.tix(0,0,SF+80,0,0,SF+89,5);
  // Later-move alcove: authored reward is non-countable and uses the shared jackpot source.
  const dustWall=k.dustWall(-4,0,SF+46,{w:1.8,h:2.6,gatedBox:k.gatedArea(-4.5,-3.5,0,2,SF+47,SF+50)});
  const before=game.tickets.list.length;k.tix(-4,0,SF+48,-4,0,SF+49,10);
  const prizes=game.tickets.list.slice(before).map(t=>({t,y:t.y}));for(const {t}of prizes){t.source='jackpot';t.y+=100;}
  const unlock=new Entity(stage,...dustWall.pos.toArray());unlock.interactive=false;unlock.update=()=>{if(dustWall.broken)for(const {t,y}of prizes)t.y=y;};stage.add(unlock);
  k.floor(YA,YA+48,{w:9.2});
  for(const [a,b,every,speed,lanes,skip]of[[24,2,2.4,6,[-2.4]],[40,22,2,6.6,[-2.4,2.4]],[54,38,1.7,7.2,[-2.8,0,2.8],'shadow']])stage.add(new YarnAvalanche(stage,k.track,YA+a,{until:YA+b,every,speed,lanes,skip,scale:2}));
  k.pitySnacks(0,0,YA+36);k.tix(2.4,0,YA+4,2.4,0,YA+20,6);k.tix(0,0,YA+42,0,0,YA+47,3);k.tixArc(0,0,YA+24,0,YA+30,1.8,4);
  const arrows=k.arrowChain([[0,YA+48.5],[0,YA+51]],{power:16});
  for(const arrow of arrows){const land=arrow.onLand.bind(arrow);arrow.onLand=p=>{const result=land(p);const f=k.fwdAt(k.track.project(arrow.pos.x,arrow.pos.z).s);f.y=0;f.normalize();const forward=p.vel.dot(f);if(forward<8)p.vel.addScaledVector(f,8-forward);return result;};}
  k.bounceChain([corrections?[CANYON_BOUNCE_ITEM.x,CANYON_BOUNCE_ITEM.d]:[1.2,YA+53]],{y:0});k.floor(YA+54,YA+55,{w:9.2});
  buildFlap(k,game,stage,labels,{corrections});buildRiver(k,game,stage,labels);
  stage.canyonExtension={layout:2,chase,arrows};
}
function buildFlap(k,game,stage,labels,{corrections=true}={}){
  let start,floorY=Infinity;
  const detour=k.detour(D(118),D(117),{y:8,x:4.4,entry:'flap',build(kd){
    if(labels.flap)kd.section(labels.flap);
    const floors=kd.floor(D(118),D(134),{x:0,w:3,y:0,style:'platform',depth:.8});floorY=Math.min(...floors.map(e=>e.solid.max.y));start=kd.start(0,.05,D(118)).clone();
    for(const item of EXTENDED_DETOUR_ITEMS.filter(o=>o.detour==='flap'))kd[item.kind](item.x,item.y-8,item.d);
    kd.floor(D(136),D(141),{x:1.4,w:1.6,y:0,style:'platform',depth:.8});
    kd.floor(D(corrections?154:144),D(158),{x:0,w:3,y:0,style:'platform',depth:.8});kd.tixArc(0,0,D(134),0,D(corrections?154:144),2,6);
    placeHiddenBone(k,game,stage,0,8,D(155),{move:'glide'});
    kd.post(1.5,0,D(157),8);
  }});
  detour.pos.copy(k.W(4.4,0,D(116)));detour.obj.position.copy(detour.pos);detour.interactive=true;detour.setBox(1.4,2,1.4);
  detour.onSlide=()=>{detour.travel();};detour.update=()=>{detour.lid.visible=!!game.session.trial;};
  const exit=loopRound(detour,k,game,stage,{start,exit:k.W(0,8,D(157)),startD:D(116),exitD:D(117),floorY});
  // Before-Glide countables remain returnable: walk back to the entry after rescuing the dog/ledge packs.
  const back=new Entity(stage,...start.toArray());back.interactive=false;back.alwaysActive=true;back.left=false;
  back.update=()=>{if(game.session.bonusRound?.tray!==detour){back.left=false;return;}const d=game.player.pos.distanceTo(start);if(d>3)back.left=true;if(back.left&&d<1.2&&!game.session.busy)game.session.finishBonusRound();};stage.add(back);
  stage.canyonFlap={detour,exit,back};
}
function buildRiver(k,game,stage,labels){
  let start;
  const detour=k.detour(SF+52,SF+52.5,{y:-5,x:-3.4,entry:'crumble',build(kd){
    if(labels.river)kd.section(labels.river);kd.floor(SF+52,SF+70,{x:-7.5,w:3,y:0,depth:2});start=kd.start(-7.5,.05,SF+52).clone();
    kd.shellback(-7.5,0,SF+58,{range:1});for(const item of EXTENDED_DETOUR_ITEMS.filter(o=>o.detour==='river'))kd[item.kind](item.x,item.y+5,item.d,{slot:item.slot});kd.tix(-7.5,.2,SF+53,-7.5,.2,SF+68,5);kd.pipe(-7.5,0,SF+69.5,1.4);
  }});
  const plate=k.crumble(-3.4,.06,SF+52,{w:1.6,d:2.4});const update=plate.update.bind(plate);
  plate.update=dt=>{update(dt);if(!plate.solid.enabled&&!detour.used&&!game.session.busy&&!game.session.bonusRound&&game.player.pos.distanceTo(plate.home)<3)detour.travel();};
  const exit=loopRound(detour,k,game,stage,{start,exit:k.W(-7.5,-5,SF+69.5),startD:SF+52,exitD:SF+52.5,floorY:k.W(-7.5,-5,SF+52).y});
  const wallAt=k.track.wallAt.bind(k.track);
  k.track.wallAt=s=>{
    const wall=wallAt(s);
    if(game.session.bonusRound?.tray===detour&&s>=SF+50&&s<=SF+72&&wall)return{...wall,left:9.4};
    return wall;
  };
  stage.canyonRiver={detour,exit,plate};
}
