import * as THREE from 'three';
import {makeKit,makeTrack,turtle} from './kit.js';
import {installPipelineKit} from './pipelineKit.js';
import {installBoneHelpers} from '../entities/hiddenBone.js';
import {buildPipelineTimingCase,PipelineAtmosphere,guardPipelineDetour,closePipelineSkyLoop} from './pipelineControllers.js';
import {buildPipelineMoon} from './pipelineMoon.js';
import {PipelineShutter} from '../entities/pipelineShutter.js';
import {ownRiverRoot} from '../entities/riverResources.js';
import {L5_TRACK,L5_GATE,L5_GOAL,L5_END,L5_STEP,L5_PITY} from './data/pipeline.js';
import {L5_TEXT} from '../story/script.js';
import {pipelineBidPattern,pipelineLiquidationPatterns} from './data/pipelineRoutes.js';
import {rand} from '../core/util.js';
export {buildBoss5Arena} from './boss5Arena.js';
export {PIPELINE_BUDGET as BUDGET} from './data/pipelineBudget.js';

export function buildLevel5(game,stage,tickets,{corrections=true,sealed=true,decor=true,shutters=sealed,text=L5_TEXT}={}){
 stage.tier=5;
 const track=makeTrack(stage,turtle([0,0,10],L5_TRACK));
 const k=installBoneHelpers(installPipelineKit(makeKit(game,stage,tickets,track),game,stage),game,stage);
 const F=(a,b,o={})=>k.floor(a,b,{style:'platform',...o});
 const dog=(id,breed,x,y,d,kit=k)=>kit.dog(x,y,d,breed,{id:`5:${id}`});
 k.walls([[-8,4.3,4.3,3],[48,4.3,4.3,3],[52,10.2,4.3,3],[114,10.2,4.3,3],[118,4.3,4.3,3],[123,4.6,4.6,3],[205,4.6,4.6,3],[209,4.3,4.3,3],[280,4.3,4.3,3],[284,4.6,4.6,18],[332,4.6,4.6,18],[336,4.3,4.3,3],[386,4.3,4.3,3],[390,4.3,4.3,1.2],[446,4.3,4.3,1.2],[450,4.3,4.3,3],[L5_END+2,4.3,4.3,3]]);k.backstop(-8);k.backstop(L5_END);
 k.section(-8,50,text.sections.opening);F(-8,16);k.sign(-3,0,3,text.signs.market,{rot:-.3});k.ticker(3,1.6,6,{group:'a'});k.tut(4,'market');
 k.floor(16,34,{y:-1.8,style:'platform'});
 for(const[x,d,invert]of[[-1.6,19.5,false],[1.6,24,true],[-1,28.5,false]]){k.market(x,0,d,{amp:1.2,group:'a',invert});k.tix(x,.6,d,x,.6,d,1);}
 k.tix(0,-1.8,18,0,-1.8,32,6);F(34,58);k.mystery(2.8,0,38,{slot:0});dog('shiba-a','shiba',-3.2,0,42);k.trooper(0,0,45);k.tix(0,0,35,0,0,44,4);k.snacks(0,0,48);
 k.section(50,125,text.sections.pump);k.water(58,115,{w:8.6,y:-1.6,color:0x5aff8a});k.tut(55,'pumpstone');
 for(const[x,d]of[[0,61.5],[-1.6,65.5],[1.4,69.5],[-.6,73.5],[1.6,81.5],[-1.2,85.5],[.8,89.5],[-1,93.5]])k.pumpStone(x,.4,d,{float:2.4});
 k.platform(0,0,77.5,3,3);k.pack(-1,0,77.5);k.platform(-3,3.4,87,2.4,2.4);k.pack(-3.4,3.4,87);k.pack(-2.6,3.4,87);k.tixArc(-3,3.4,88,-1,92,1.6,3);
 k.platform(0,0,97.5,3,3);dog('pug-a','pug',.8,0,97.8);k.market(-1.4,0,102,{amp:1,group:'b'});k.pumpStone(1.2,.4,106.5);k.market(-.8,0,111,{amp:1,group:'b',invert:true});F(115,150,{w:9.2});
 k.colorPath('green',[[2.8,2.2,62,1.6,1.8],[2.8,2.6,68,1.6,1.8],[2.8,3,74,2.2,3]],{jackpot:15});
 k.tix(0,.6,61.5,0,.6,73.5,4);k.tix(0,.6,81.5,0,.6,93.5,4);k.snacks(0,0,121);
 k.section(125,205,text.sections.smog);k.tut(126,'smogwave');const wave=k.chase(128,204,{model:'smog_wall',scale:1,count:1,speed:7.8,catchUp:1.1,lanes:[0]});
 F(153.5,176,{w:9.2});for(const[x,d,invert]of[[-2.2,178.5,false],[2.2,182.5,true],[0,186.5,false]])k.market(x,0,d,{amp:1.4,group:'c',invert});F(189,210,{w:9.2});
 k.log(140,{w:9.2});k.log(196,{w:9.2});k.packs([[-2.8,145],[2.8,160],[0,170]]);dog('corgi-a','corgi',3.4,0,165);
 k.zoomieGate(-3.6,0,148,{plateD:126,open:2.5});k.floor(148,155,{x:-3.6,w:1.8});k.tix(-3.6,0,148.5,-3.6,0,154.5,4);k.tix(0,0,129,0,0,148,7);k.tixArc(0,0,149,0,154.5,2.2,4);k.tix(2.6,0,158,2.6,0,174,6);
 k.section(205,280,text.sections.trading);k.snacks(0,0,207);k.belt(212,230,{x:0,z:3});k.crusher(0,0,217,{w:4,d:2.4,period:2.4,phase:0});k.crusher(0,0,224,{w:4,d:2.4,period:2.4,phase:1.2});F(230,236);
 for(const[y,d,phase]of[[.8,231,0],[1.6,233,L5_STEP]])k.blinkBox(-1.6,y,d,{on:L5_STEP,off:L5_STEP,phase,group:'bid-teach'});
 k.blinkBox(-2,0,238.5,{on:L5_STEP,off:L5_STEP,group:'bid'});
 k.bounceChain([[corrections?1.7:1.8,0,242.5],[corrections?-1.1:-1.2,.6,246.5]]);
 k.slideBox(1.4,0,250.5,{axis:'x',range:1.6,speed:1.7});k.drone(0,1.6,244,{range:2.6,hover:2.4});F(252,280);k.trooper(-1.5,0,256);k.trooper(1.5,0,259);
 k.vacSwitch(3.2,0,262);for(const x of[-2.4,0,2.4])k.rug(x,0,265);k.cat(-1.2,0,266.5);k.cat(1.2,0,266.5);k.packs([[-2.4,268],[0,268],[2.4,268]]);
 k.goodBoy(253,[[3.4,1.2,256],[3.4,2.4,259],[3.4,3.6,262],[3.2,4.8,266]],{jackpot:15});dog('dalmatian-a','dalmatian',-3.4,0,274);
 k.tix(0,0,213,0,0,229,6);k.tix(-2.6,0,254,-2.6,0,262,4);k.tix(0,0,270,0,0,278,4);
 k.section(280,335,text.sections.chimney);F(280,290);k.snacks(0,0,282);k.camZone(288,330,'rise',{dist:9.5,height:2.2,lookUp:3});k.tut(287,'chimney');
 for(const[x,y,d,invert]of[[0,1.6,292.5,false],[2.2,4,295.5,true],[-2,6.4,298.5,false],[1.6,8.8,301.5,true]])k.market(x,y,d,{amp:1.2,group:'e',invert});
 k.platform(-1.8,10,304.5,2.6,2.6);k.fan(-1.8,10.4,304.5,{height:6});F(306,316,{y:15,w:3.4});F(322,330,{y:15,w:3.4});k.tut(314,'glide');
 k.platform(4,14.2,319,1.8,1.8);k.colorBone(4,14.2,319,'yellow');k.packs([[-1,310],[1,310]],15);k.sphere(0,15,326);
 k.tixArc(0,1.6,293,-2,298.5,3.2,4);k.tix(0,15,307,0,15,315,4);k.tixArc(0,15,316,0,322,1.6,5);F(332,corrections?346:352);
 k.section(335,385,text.sections.rug);k.tut(343,'rugpull');k.rugPull(348,360,{x:0,w:3,tile:2.4,speed:7.4,triggerOnAnyTile:true});k.drone(0,1.8,356,{range:2});k.pumpStone(0,.4,362.5,{maxPump:1,float:1.2});k.market(0,0,366.5,{amp:1,group:'f'});k.rugPull(369,380,{x:0,w:3,tile:2.2,speed:7.6,triggerOnAnyTile:true});k.cat(-1,0,377.4);k.cat(1,0,379.6);F(380,392);dog('shiba-b','shiba',2.6,0,384);k.tix(0,0,349,0,0,359,5);k.tix(0,0,370,0,0,379,4);
 k.section(385,450,text.sections.liquidation);k.snacks(0,0,388);k.tut(389,'liquidation');k.camZone(390,446,'side',{dist:13,height:4.5,side:1,ahead:2.5});k.blinkBox(0,.8,390.5,{on:L5_STEP,off:L5_STEP,group:'liq'});
 const flood=k.rising(392,446,{y0:-4,y1:.2,rate:.35,trigger:'enter',color:0x6a3aa0});k.belt(392,402,{x:0,z:2.6},{w:3});k.crusher(0,0,398,{w:3,d:2.2,period:2.2,phase:0});
 k.blinkBox(0,.8,405,{on:L5_STEP,off:L5_STEP,group:'liq'});k.arrowChain([[0,1.2,409.5],[0,4.2,414]],{power:16});k.platform(0,4.2,418.5,3,3);k.knight(0,4.2,418.5,{range:.6});k.pack(-1.1,4.2,418.5);k.platform(0,4.2,423,2.6,4);k.crusher(0,4.2,423,{w:2.6,d:2.2,period:2,phase:1});k.rugPull(426,436,{x:0,w:2.6,tile:2,speed:7.5,triggerOnAnyTile:true});k.cat(0,0,434.4);k.fallBox(0,1.6,439.5,{delay:.35});k.bounceChain([[0,2,443]]);F(446,472);k.tix(0,.4,393,0,.4,401,4);k.guideArc(0,.8,405,0,414,3.4);k.tix(0,4.2,420,0,4.2,424.5,3);k.guideArc(0,.3,427,0,435,1.8);k.packs([[-2.4,450],[2.4,452]]);k.gate(L5_GATE,text.gate,0xd23cff);k.trigger(L5_GOAL,()=>game.session.reachBossGate());
 for(const[x,y,d]of L5_PITY)k.pitySnacks(x,y,d);
 const detours=[];
 if(!game.session.trial){
  detours.push(closePipelineSkyLoop(guardPipelineDetour(k.detour(232,233.5,{y:10,entry:'pipe',x:3.4,build:kd=>{
   kd.section(232,272,text.sections.orderBook);kd.start(2.6,.1,234);kd.platform(2.6,0,234,3,3);kd.market(2.6,0,238.5,{amp:2.6,group:'d'});kd.market(2.6,0,243,{amp:2.6,group:'d',invert:true});kd.pumpStone(2.6,.4,247.5);kd.platform(2.6,0,252,3,3);dog('corgi-b','corgi',2.6,0,252.6,kd);kd.snacks(3.6,0,251.4);kd.market(2.6,0,256.5,{amp:2.6,group:'d'});kd.platform(2.6,0,261,2.4,2.4);kd.pack(2,0,261);kd.pack(3.2,0,261);kd.platform(2.6,0,266,3,3);kd.mover(0,2.5,270,{axis:'y',range:2.5,speed:1});kd.returnLeg(236,272);kd.platform(-2.6,5,268,3,3);kd.zipline(-2.6,6.8,266,-2.6,6,254);kd.platform(-2.6,4.8,252,2.4,2.4);kd.mystery(-2.6,4.8,252,{slot:1});kd.crumble(-2.6,4.8,248.4,{w:2.2,d:2.2});kd.crumble(-2.6,4.8,244.8,{w:2.2,d:2.2});kd.platform(-2.6,4.8,241,3,3);kd.zipped(-2.6,4.8,241,8);kd.tix(2.6,.6,235,2.6,.6,265,10);kd.tix(-2.6,5.2,266,-2.6,4.8,242,8);kd.exit(-2.6,0,233.5);kd.zipline(-2.6,6.2,239,-2.6,-8.6,233.6);
  }}))));
  detours.push(guardPipelineDetour(k.detour(114,114,{y:0,entry:'flap',build:kd=>{
   kd.section(52,116,text.sections.coldWallet);kd.floor(112,116,{x:-5.4,w:2.4});kd.floor(52,116,{x:-8.2,w:3.6,slippery:true,style:'platform'});kd.pack(-8.2,0,104);kd.lunch(-8.2,0,100);kd.lunch(-8.2,1,100);kd.oneUp(-8.2,2,100);kd.knight(-8.2,0,94,{range:1});kd.packs([[-7.4,86],[-9,86]]);kd.snacks(-9.2,0,83);dog('pug-b','pug',-8.8,0,80,kd);kd.zipped(-8.2,0,72,8);kd.knight(-8.2,0,66,{range:1});kd.tix(-8.2,0,110,-8.2,0,56,12);
  }})));
 }
 const cases=sealed?[
  buildPipelineTimingCase(stage,k,{start:236,end:252,width:8.6,ceiling:4.9,curtainTop:9.8,baffles:[[237.8,3.28],[241.8,3.3],[245.8,3.9],[249.8,3.28]]}),
  buildPipelineTimingCase(stage,k,{start:392,end:446,width:8.6,ceiling:11.4,baffles:[[405,3.43],[429.3,2.3],[438.8,4.88],[442.3,5.3]],risers:[[417,4.2]]}),
 ]:[];
 const bidShutter=shutters?stage.add(new PipelineShutter(stage,k,251.8,[238.5,250.5].map(d=>stage.timedBoxes.find(b=>b.d===d).entity),{top:4.9})):null;
 const liquidationShutter=shutters?stage.add(new PipelineShutter(stage,k,445.8,[405,409.5,414,439.5].map(d=>stage.timedBoxes.find(b=>b.d===d).entity),{top:11.4})):null;
 stage.timedPatterns.push(pipelineBidPattern({corrections}),...pipelineLiquidationPatterns());
 const moonProtection=buildPipelineMoon(stage,track,k),{ledge:moon,hidden}=moonProtection;
 stage.add(new PipelineAtmosphere(stage,flood));
 if(decor){
  const candles=new THREE.Group(),bodyGeo=new THREE.BoxGeometry(1,1,1),wickGeo=new THREE.BoxGeometry(.04,.2,.04);
  const colors=[0x4ade80,0xff4a5a].map(color=>new THREE.MeshBasicMaterial({color})),wickMaterial=new THREE.MeshBasicMaterial({color:0xdce5e3});stage.scene.add(candles);
  const candle=(x,y,d,h)=>{const p=k.W(x,y,d),m=new THREE.Mesh(bodyGeo,colors[Math.random()<.5?0:1]);m.scale.set(.35,h,.35);m.position.copy(p);m.position.y+=h/2;candles.add(m);const wick=new THREE.Mesh(wickGeo,wickMaterial);wick.position.copy(p);wick.position.y+=h+.1;candles.add(wick);};
  // Cut away the camera-facing bank around the side view, including its view margin.
  k.banks(-6,L5_END,(x,y,d)=>{if(x>0&&d>=376&&d<=460)return;const r=Math.random();if(r<.35)k.pipe(x,y,d,rand(4,9),0x7a5aa0);else if(r<.6)k.vat(x,y,d,rand(1.2,1.8));else if(r<.8)candle(x,y,d,rand(3,7));else k.cones(x,y,d,3);},{every:5});
  k.edges(-4,L5_END,(x,y,d)=>Math.random()<.5?k.vent(x,y,d):k.cones(x,y,d,1),{every:4});
  for(let d=40;d<L5_END;d+=40)k.ticker((d/40%2?1:-1)*3.8,3,d,{group:d<125?'b':d<205?'c':d<280?'d':d<335?'e':d<385?'f':'g'});
  ownRiverRoot(stage,candles);
 }
 stage.pipeline={k,wave,flood,detours,cases,moon,hidden,moonProtection,bidShutter,liquidationShutter,corrections};
 return{spawn:k.W(0,0,1),facing:track.yaw(1),camera:{mode:'track',track,height:4.3,dist:8.6,ahead:5.5},fov:60};
}
