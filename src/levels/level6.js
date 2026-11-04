import {makeKit,makeTrack,turtle} from './kit.js';
import {installRiverKit} from './riverKit.js';
import {installBoneHelpers} from '../entities/hiddenBone.js';
import {L6_TEXT} from '../story/script.js';
import {L6_TRACK,L6_END,L6_GOAL,L6_GATE,L6_RAFT_SPANS,L6_RAFT_SPANS_LITERAL,L6_RAFT_ITEMS,L6_RAFT_ITEMS_LITERAL} from './data/rapids.js';
import {buildRiverTimingCase,RiverLoop} from './riverRoutes.js';

export function buildLevel6(game,stage,tickets,{corrections=true}={}) {
 stage.tier=4.5;
 const track=makeTrack(stage,turtle([0,0,10],L6_TRACK));
 const k=installRiverKit(makeKit(game,stage,tickets,track),game,stage);installBoneHelpers(k,game,stage);
 const text=L6_TEXT.sections,F=(a,b,o={})=>k.floor(a,b,{style:'platform',...o});
 const rows=corrections?L6_RAFT_ITEMS:L6_RAFT_ITEMS_LITERAL;
 const riverItem=id=>{const item=rows.find(i=>i.id===id);if(!item)throw Error(`Missing river item ${id}`);let actor;
  if(id.startsWith('pack'))actor=k.floatPack(item.x,item.d,id==='pack-c'?3:undefined);
  else if(id.startsWith('sphere'))actor=k.sphere(item.x,-1,item.d);
  else if(id.startsWith('cp'))actor=k.snacks(item.x,-1,item.d);
  else actor=k.dog(item.x,-1,item.d,id==='dog-pug'?'pug':'corgi',{id:id==='dog-pug'?'6:pug-a':'6:corgi-a'});
  actor.raftAuthoring={...item};return actor;
 };
 const raft=index=>{const r=(corrections?L6_RAFT_SPANS:L6_RAFT_SPANS_LITERAL)[index];return k.raft(r.d0,r.d1,{...r.cfg,boost:r.boost,falls:r.falls});};
 k.walls([[-8,4.6,4.6,3],[216,4.6,4.6,3],[219,3.2,3.2,3],[230,3.2,3.2,3],[234,4.6,4.6,3],[248,5.2,5.2,3],[300,5.2,5.2,3],[304,4.6,4.6,3],[426,4.6,4.6,3],[430,3.2,3.2,3],[455,3.2,3.2,3],[L6_END+2,3.2,3.2,3]]);k.backstop(-8);k.backstop(L6_END);
 // S0: safe dock teaches. A miss lands on permanent ground.
 k.section(-8,26,text.drain);F(-8,26,{style:'ground'});
 k.sign(-3,0,3,L6_TEXT.signs.raft,{rot:-.3});k.sign(3,0,3,L6_TEXT.signs.hop,{rot:.3});
 k.tix(0,0,2,0,0,8,4);k.pack(-2.6,0,6);k.pack(2.6,0,6);k.stack(0,0,10,2);
 k.dog(-3.3,0,14,'shiba',{id:'6:shiba-a'});k.broc(0,0,17,{range:2});
 k.blinkBox(2.6,0,20.5,{on:1.2,off:1});k.blinkBox(2.6,1,22.8,{on:1.2,off:1,phase:1.1});k.tixRing(2.6,2.6,24.2,.8,6);
 k.bounceChain([[-2.4,0,20],[-2.4,1.2,22.4]]);k.tix(-2.4,3.4,21,-2.4,3.6,23.5,3);k.tut(18,'raft');k.tut(19.5,'blinkbox');k.pipe(-4.3,0,0,2.2);
 k.zoomieGate(-3.4,0,14.5,{plateD:11,open:2.5});
 // S1: first ride, steer and hop.
 k.section(26,108,text.gutter);F(24,26,{y:[0,-1]});raft(0);
 k.tix(0,-1,30,0,-1,40,5);riverItem('pack-a');riverItem('pack-b');k.log(56,{h:.6,w:4.4,x:-2.3});
 k.tixArc(2.4,-1,54,2.4,60,1.6,4);riverItem('pack-c');k.driftLog(74,{range:3,speed:1.2,w:2.6});k.tixArc(0,-1,72,0,77,2,4);
 riverItem('dog-pug');riverItem('sphere-a');riverItem('cp-a');k.pitySnacks(0,-1,60);k.outflow(96,{side:'left',push:3,period:3.2});k.tut(90,'outflow');
 k.tix(2.6,-1,94,2.6,-1,102,4);riverItem('pack-d');riverItem('pack-e');F(108,110,{y:[-1,0]});
 // S2: lock and the slide-box teach.
 k.section(108,160,text.lock);F(110,118,{depth:1.2});k.knight(0,0,114,{range:1.2});k.tut(117,'lock');
 F(118,146,{y:-3,w:9.2});k.rising(118,146,{y0:-3.4,y1:.2,rate:.35,trigger:'enter'});k.packs([[0,120],[1.6,121.5],[-1.6,121.5]],-3);k.tix(0,-3,123,0,-3,127,3);
 k.lunch(-2.8,-3,124);k.lunch(-1.4,-2,126.5);k.lunch(0,-1,129);F(130,146,{x:3.2,w:2.4,y:0});k.mystery(3.2,0,133,{slot:0});
 k.dog(3.2,0,140,'dalmatian',{id:'6:dalmatian-a'});k.boneSwitch(3.2,0,144,[[0,0,147,3,2.4],[0,0,149.4,3,2.4]]);F(151,160,{depth:1.2});
 k.snacks(0,0,152);k.zipped(-2.6,0,155,3);k.slideBox(1.6,.8,154.5,{axis:'x',range:1.2,speed:1.4});k.tix(1.6,2.2,153.5,1.6,2.2,155.5,2);k.trooper(1.2,0,157.5);F(158,160,{y:[0,-1]});
 // S3: whirlpools, opposing outflow and the first chute.
 k.section(160,246,text.bend);raft(1);k.tut(163,'whirlpool');k.whirlpool(-2,170,{r:3,pull:3.2});k.tix(2.6,-1,166,2.6,-1,174,4);
 k.driftLog(178,{range:2.6,speed:1.4,w:2.4});riverItem('pack-f');riverItem('pack-g');k.pitySnacks(0,-1,186);k.outflow(190,{side:'right',push:4,period:2.6});k.whirlpool(-2.2,194,{r:3.2,pull:3.6});
 k.tixArc(2.4,-1,188,2.4,196,1.2,4);riverItem('dog-corgi');riverItem('cp-b');k.shellback(0,-1,210,{range:2.4});k.tixRing(0,2.6,211,1,8);k.tix(0,-1,220,0,-1,228,5);
 k.whirlpool(0,236,{r:2.6,pull:4});riverItem('pack-h');riverItem('pack-i');F(246,248,{y:[-1,0]});
 // S4: safe barge teach, then Crate Drift and its mill wheel.
 k.section(248,304,text.barge);F(248,252,{depth:1.2});k.snacks(0,0,250);k.water(252,300,{w:10.4,y:-1.2,color:0x5a8a7a});
 k.platform(0,0,255,7,6);k.packs([[-2.6,253],[0,257]]);k.dog(2.8,0,256,'shiba',{id:'6:shiba-b'});k.fallBox(-2.4,1,255.5,{delay:.45});k.tix(-2.4,2.4,254.8,-2.4,2.4,256.2,2);k.tut(254,'fallbox');
 k.section(258,271,text.crateDrift);k.pitySnacks(0,0,257.6);k.fallBox(0,0,260,{delay:.45});k.fallBox(-1.2,.4,262.3,{delay:.45});k.fallBox(0,.8,264.6,{delay:.45});
 k.slideBox(0,.8,266.9,{axis:'x',range:1.6,speed:1.5});k.slideBox(0,.8,269.2,{axis:'x',range:1.6,speed:1.5,phase:Math.PI});
 k.guideArc([[0,1.6,260],[0,2.4,268]]);k.spinDrum(273,{x:0,y:.5,r:3,n:4,period:7,w:2.6,dd:2});k.drone(0,0,272,{range:2.4,hover:2.6});k.platform(0,3.6,280,3.2,4);
 k.mystery(1,3.6,281,{slot:1});k.pack(-1,3.6,281);k.zipline(0,5,282,0,1.6,293,{speed:9});F(290,300,{w:3.6,y:1.2,depth:1.2});
 k.coconuts(300,{until:290,every:2,speed:5.5,lanes:[-1,1],mesh:'barrel',reward:false});k.pack(-1.4,1.2,297);k.pack(1.4,1.2,297);F(300,304,{y:[1.2,-1]});
 // S5: slicks, momentum falls and the optional aqueduct.
 k.section(304,382,text.rapids);const ride3=raft(2);k.tut(306,'slick');k.slick(308,318,{x:-1.6,w:4.4});k.tix(2.6,-1,308,2.6,-1,318,5);
 const goodBoy=k.goodBoy(300,[[3,-.4,309,2.4,2.4],[3,.4,311.4,2.4,2.4],[3,1.2,313.8,2.4,2.4],[3,2,320,2.4,10]]);ride3.footSupports=new Set(goodBoy.plats.map(p=>p.solid));
 const extraLife=k.oneUp(3,2,322);extraLife.countable=false;const beforeGoodBoyTickets=tickets.list.length;k.tix(3,2,316,3,2,325,6);for(const ticket of tickets.list.slice(beforeGoodBoyTickets))ticket.source='jackpot';
 const extraPack=k.pack(3,2,318.5,5);extraPack.countable=false;
 k.pitySnacks(-2,-1,322);k.sign(-3.4,-1,312,L6_TEXT.signs.falls,{rot:.2});k.tut(315,'falls');k.tixArc(0,-1,327,0,335,2.2,5);riverItem('cp-c');
 k.coconuts(356,{until:340,every:1.8,speed:5,lanes:[-2.4,0,2.4],mesh:'barrel',reward:false});riverItem('pack-j');k.tixArc(0,-1,347,0,351,1.8,4);k.drone(-2,-1,352,{range:2,hover:2.6});k.slick(350,356,{x:2.3,w:4.6});k.whirlpool(1.8,368,{r:2.6,pull:3.6});
 riverItem('pack-k');riverItem('sphere-b');riverItem('pack-l');F(382,384,{y:[-1,0]});
 // S6: final four-pattern gauntlet and a pickup-free final ride.
 k.section(384,426,text.floodgate);F(384,392,{depth:1.2});k.snacks(0,0,386);k.arrowChain([[-2.4,0,388.5],[-2.4,2.2,390.6]],{power:16});k.tixRing(-2.4,4.8,391.2,.8,6);k.tut(387.5,'arrowchain');
 k.pitySnacks(0,0,391.6);k.water(392,416,{w:9.2,y:-1.2,color:0x5a8a7a});
 for(const[x,d,phase,group]of[[-1.2,393.5,0,'a'],[1.2,395.8,1.1,'b'],[-1.2,398.1,0,'a'],[1.2,400.4,1.1,'b']])k.blinkBox(x,0,d,{on:1.2,off:1,phase,group});
 if(corrections)k.lunch(0,0,401.55).rapidsRest=true;
 for(const[y,d]of[[.4,402.7],[.8,405],[1.2,407.3]])k.fallBox(0,y,d,{delay:.45});k.drone(0,1.2,405.5,{range:1.8,hover:3});
 k.slideBox(0,1.2,409.6,{axis:'x',range:1.8,speed:1.8});k.arrowChain([[0,1.2,411.9],[0,2.4,414]],{power:16});k.guideArc([[0,1.4,393],[0,2.2,411]]);
 k.platform(0,2,416.5,3,3);k.pack(-1,2,416.5);k.pack(1,2,416.5);k.zipline(0,4.8,417,0,.2,427,{speed:10});
 k.section(426,L6_GOAL,text.intake);raft(3);k.tix(0,-1,429,0,-1,437,5);k.outflow(441,{side:'left',push:4.2,period:2.2});k.driftLog(444,{range:2,speed:1.8,w:2.2});k.outflow(447,{side:'right',push:4.2,period:2.2,phase:1.1});k.tix(-1.6,-1,440,1.6,-1,450,5);k.whirlpool(-1.2,451,{r:2,pull:3.4});k.gate(L6_GATE,L6_TEXT.goal,0xd23cff);k.trigger(L6_GOAL,()=>game.session.reachGoal());
 // Post-game vent prize remains outside Golden counting.
 const vent=k.smogVent(3.6,0,386.5,{lift:6});k.platform(3.6,4.6,388.5,2.4,2.4);const ventLife=k.oneUp(3.6,4.6,388.5);ventLife.countable=false;
 const detours=[];
 if(!game.session.trial&&!game.session.remix){
  detours.push(k.detour(249,251,{y:10,entry:'pipe',x:-3.5,build:kd=>{
   kd.section(249,289,text.rainGutter);
   if(corrections){kd.floor(249,262,{x:-1.5,w:3,y:0,depth:.6});kd.floor(269.5,289,{x:-1.5,w:3,y:0,depth:.6});}else kd.floor(249,289,{x:-1.5,w:3,y:0,depth:.6});
   kd.dark(249,289,{radius:4});kd.shellback(-1.5,0,256,{range:1});kd.packs([[-1.5,253],[-1.5,260]]);kd.tix(-1.5,0,251,-1.5,0,259,4);
   kd.crumble(-1.5,0,264,{w:2.4,d:2.2});kd.crumble(-1.5,0,267.5,{w:2.4,d:2.2});kd.stack(-1.5,0,272,2);kd.dog(-1,0,276,'pug',{id:'6:pug-b'});kd.shellback(-1.5,0,280,{range:0});kd.platform(-1.5,3,284,2.4,2.4);kd.colorBone(-1.5,3,284.5,'purple');kd.pack(-.4,3,284,5);kd.start(-1.5,.05,249.5);kd.exit(-1.5,0,288);
  }}));
  detours.push(k.detour(388,390,{y:10,entry:'pipe',x:3.5,build:kd=>{
   kd.section(388,420,text.pumpHouse);kd.floor(388,396,{y:0});kd.mystery(-2,0,392,{slot:2});kd.tut(394,'market');kd.market(-1.2,0,399,{amp:1.6,group:'a'});kd.market(1.2,0,402,{amp:1.6,group:'a',invert:true});kd.market(-1.2,0,405,{amp:1.6,group:'a'});kd.floor(407,420,{y:0});kd.pill(0,0,410,{range:1.6});kd.packs([[-2.4,409],[2.4,409],[0,413]]);kd.dog(2.4,0,415,'dalmatian',{id:'6:dalmatian-b'});const wall=kd.dustWall(0,0,417.5,{w:3,h:2.6});const hidden=kd.hiddenBone(0,0,419,{move:'dust'});kd.tixArc(-1.2,0,398,1.2,406,1.8,6);kd.start(0,.05,388.5);kd.exit(0,0,420);
   stage.rapidsHidden={wall,hidden};
  }}));
  if(stage.marketClock){stage.marketClock.bpm=128/1.4;stage.marketClock.step=(120/128)*1.4;}
 }
 const timingCases=corrections?[
  buildRiverTimingCase(stage,track,{start:258,end:271.4,width:10.4,exitRise:1.8}),
  buildRiverTimingCase(stage,track,{start:392,end:415.5,width:9.2}),
 ]:[];
 const loops=detours.map((d,i)=>stage.add(new RiverLoop(stage,d,{end:i?420:288})));
 // The Moon reward is authored after detours so its final safe placement can be checked against every support.
 stage.rapids={k,detours,loops,timingCases,goodBoy,goodBoyPrizes:[extraLife,extraPack],goodBoyTickets:tickets.list.slice(beforeGoodBoyTickets,beforeGoodBoyTickets+6),vent,corrections};
 return{spawn:k.W(0,0,1),facing:track.yaw(1),camera:{mode:'track',track,height:4.3,dist:8.6,ahead:5.5},fov:60};
}
