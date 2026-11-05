import {test,vi,expect} from 'vitest';
import * as THREE from 'three';
vi.mock('../src/art/assets.js',()=>({Assets:{has:()=>false,model:()=>null,animate:()=>null,aspect:()=>1,tex:()=>new THREE.Texture(),tiled:()=>new THREE.Texture(),url:()=>''}}));
const gradient={addColorStop(){}};const ctx=new Proxy({measureText:()=>({width:100}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]??(()=>{})});HTMLCanvasElement.prototype.getContext=()=>ctx;HTMLCanvasElement.prototype.toDataURL=()=>'';
const {Stage}=await import('../src/world/stage.js');
const {TicketSystem}=await import('../src/entities/tickets.js');
const {buildLevel6}=await import('../src/levels/level6.js');
const {measureTicketBudget}=await import('../src/game/measureTicketBudget.js');
const {ticketBudget}=await import('../src/game/ticketBudget.js');
const {writeFileSync}=await import('node:fs');
const {Player}=await import('../src/player/player.js');
const {input}=await import('../src/core/input.js');
const {save}=await import('../src/core/save.js');
const {Enemy}=await import('../src/entities/enemies.js');
const {audio}=await import('../src/audio/audio.js');
const {Session}=await import('../src/game/session.js');
export function build({trial=false,remix=false,corrections=true,decor=false}={}){
 const game={player:{pos:new THREE.Vector3(),vel:new THREE.Vector3(),body:{s:0,u:0},abilities:{}},camera:{opts:{height:4.3,dist:8.6,ahead:5.5},shake(){},snap(){},setMode(_,opts){this.opts=opts;}},ui:{tutorial(){},banner(){},fade:async()=>{}},fx:new Proxy({},{get:()=>()=>{}}),session:{level:6,def:{tier:4.5},phase:'level',trial,remix,deaths:0,deathsAtCp:0,runSeed:42,nextSeq:()=>1,onBreak(){},onEnemyDefeated(){},checkpoint(){},rescueDog(){},addTickets(){},reachGoal(){}}};
 const stage=new Stage(game,'river');game.stage=stage;const tickets=new TicketSystem(game,stage);game.tickets=tickets;const info=buildLevel6(game,stage,tickets,{corrections,decor});tickets.finalize();return{game,stage,tickets,info};
}
test('builds the complete numeric candidate with stable dogs, all raft spans and explicit main-goal return metadata',()=>{
 const{stage,tickets,info}=build({decor:true}),measured=measureTicketBudget(stage,tickets);writeFileSync('/tmp/h45-builder-tally.json',JSON.stringify({length:stage.track.length,entities:stage.entities.length,dogs:stage.entities.filter(e=>e.dogId).map(e=>e.dogId),countables:stage.entities.filter(e=>e.countable).map(e=>e.kind??e.constructor.name),measured,total:ticketBudget(measured),slots:[...stage.mysterySlots]},null,2));
 expect(stage.entities.filter(e=>e.dogId).map(e=>e.dogId).sort()).toEqual(['6:corgi-a','6:dalmatian-a','6:dalmatian-b','6:pug-a','6:pug-b','6:shiba-a','6:shiba-b']);expect(stage.raftSpans).toHaveLength(4);expect(stage.detours.map(d=>d.loop)).toEqual([true,true]);expect([...stage.mysterySlots]).toEqual([0,1,2]);expect(info.ride).toBeUndefined();expect(stage.track.triggers.some(t=>t.d===455)).toBe(true);expect(measured.coconut).toBe(false);stage.dispose();
});
test('trials omit both high detour loops while preserving the four ordinary raft spans and mandatory patterns',()=>{
 const{stage}=build({trial:true});expect(stage.detours||[]).toHaveLength(0);expect(stage.raftSpans).toHaveLength(4);expect(stage.entities.filter(e=>e.dogId)).toHaveLength(5);stage.dispose();
});

function actualPlayer(f){
 const{game,stage}=f;game.loadout={effects:{},cosmeticSlots:()=>({})};game.onPlayerDeath=()=>{};game.onFlop=()=>{};game.maskPickup=()=>{};game.ui.setConed=()=>{};
 const p=Object.create(Player.prototype);Object.assign(p,{game,pos:new THREE.Vector3(),vel:new THREE.Vector3(),root:new THREE.Group(),model:{},wings:new THREE.Group(),halo:new THREE.Group(),stars:new THREE.Group(),deathCone:new THREE.Group(),_animate(){},_updateShadow(){},_paintGear(){}});
 p.body={pos:p.pos,vel:p.vel,h:1.3,hw:.3,hd:.3,onLand:(...args)=>p._onLand(...args)};game.player=p;p.reset();return p;
}
function attemptBypass(f,index,{u=0,jumps=[30],dash=-1,moon=false,startBack=.4}={}){
 const{stage,game}=f,lane=stage.rapids.timingCases[index],p=actualPlayer(f),start=lane.start-startBack;
 game.loadout.effects={extra_air_jumps:{count:1},air_dash:{charges_per_jump:1,dash_time_s:.22,distance_m:4.4}};
 for(const id of[1,2,3,4])save.data.beaten[id]=true;save.data.beaten[5]=moon;save.data.godMode=false;
 for(const e of stage.entities)if(e instanceof Enemy)e.dead=true;
 p.spawnAt(stage.track.toWorld(start,u,0),stage.track.yaw(start));p.body.grounded=true;
 const pressed=vi.spyOn(input,'pressed'),held=vi.spyOn(input,'held');
 held.mockImplementation(k=>k==='jump');input.state.x=0;input.state.y=1;
 try{
  for(let frame=0;frame<480&&!p.dead;frame++){
   stage.update(1/60,p);for(const b of lane.boxes)b.entity.solid.enabled=false;
   const wheelLaunch=p.body.grounded&&p.body.ground?.ref?.constructor.name==='SpinDrum'&&p.pos.y>lane.exitTop-1.7,startFrame=moon?73:0;
   input.state.y=moon&&frame<=73?0:1;held.mockImplementation(k=>k==='jump'||k==='slide'&&moon&&frame<=73);
   pressed.mockImplementation(k=>k==='slide'&&moon&&frame===0||k==='jump'&&(frame===startFrame||jumps.some(j=>frame===startFrame+j)||wheelLaunch)||k==='dash'&&dash>=0&&frame===startFrame+dash);
   const s=p.body.s??start;p.update(1/60,stage,{right:stage.track.right(s),forward:stage.track.tangent(s)});
   if(p.body.grounded&&lane.exitSolids.includes(p.body.ground))return{escaped:true,frame,s:p.body.s,y:p.pos.y};
   if(p.body.s>lane.end+.8&&p.pos.y>=lane.exitTop-.1)return{escaped:true,frame,s:p.body.s,y:p.pos.y};
  }
  return{escaped:false,dead:p.dead,s:p.body.s,y:p.pos.y};
 }finally{pressed.mockRestore();held.mockRestore();input.state.x=input.state.y=0;}
}
test('physical timing cases reject owned Double/Glide/Crown/dash bypasses when all timing supports are absent',()=>{
 const f=build(),results=[];
 for(let index=0;index<2;index++)for(const u of[-3,0,3])for(const first of[12,24,36,48,60])for(const dash of[-1,24,48]){
  const result=attemptBypass(f,index,{u,jumps:[first,first+24],dash});results.push({index,u,first,dash,...result});
 }
 writeFileSync('/tmp/h45-timing-bypass.json',JSON.stringify(results,null,2));
 expect(results.filter(r=>r.escaped)).toEqual([]);f.stage.dispose();
},60000);

function playLane(f,index,{live=false,delay=0,hz=120}={}){
 const dt=1/hz;
 const{stage,game}=f,lane=stage.rapids.timingCases[index],p=actualPlayer(f),start=lane.start-.4;
 for(const e of stage.entities)if(e instanceof Enemy)e.dead=true;
 const rest=index===1?stage.entities.find(e=>e.rapidsRest):null;
 const targets=[...lane.boxes.map(b=>b.entity),...(rest?[rest]:[])].sort((a,b)=>stage.track.project(a.pos.x,a.pos.z).s-stage.track.project(b.pos.x,b.pos.z).s);
 targets.push({pos:stage.track.toWorld(lane.end,0,lane.exitTop-stage.track.heightAt(lane.end)),solid:lane.exitSolids[0],exit:true});
 const hits=[];p.body.onLand=solid=>{hits.push(solid);p._onLand(solid);};
 p.spawnAt(stage.track.toWorld(start,0,0),stage.track.yaw(start));p.body.grounded=true;
 for(let i=0;i<Math.round(delay*hz);i++)stage.update(dt,p);
 let target=0,launched=false,source=null;
 const pressed=vi.spyOn(input,'pressed'),held=vi.spyOn(input,'held');held.mockImplementation(k=>k==='jump');
 const trace=[];
 try{
  for(let frame=0;frame<Math.round(18.4*hz)&&!p.dead;frame++){
   stage.update(dt,p);
   if(!live)for(const b of lane.boxes)b.entity.solid.enabled=true;
   const receiver=targets[target];
   if(hits.some(s=>receiver.exit?lane.exitSolids.includes(s):s===receiver.solid)){
    hits.length=0;target++;
    if(target===targets.length)return{ok:true,frames:frame,landed:target,trace};
    source=receiver;launched=!!receiver.arrow;
   }else if(target>0&&hits.length&&p.body.grounded&&p.body.ground!==source?.solid){source={pos:p.pos.clone(),solid:hits.at(-1),carrier:true};launched=false;hits.length=0;}
   else hits.length=0;
   const q=stage.track.project(p.pos.x,p.pos.z),goal=targets[target],center=goal.solid?{x:(goal.solid.min.x+goal.solid.max.x)/2,z:(goal.solid.min.z+goal.solid.max.z)/2}:goal.pos;
   if(goal.kind==='slidebox'){const lead=.18,a=(goal.clock.t+lead)*goal.speed+goal.phase;center.x=goal.home.x+goal.dir.x*Math.sin(a)*goal.range;center.z=goal.home.z+goal.dir.z*Math.sin(a)*goal.range;}
   const destination=goal.exit?{s:lane.end,u:0}:stage.track.project(center.x,center.z);
   let jump=false,ready=true;
   const sourcePoint=source?.carrier?{x:(source.solid.min.x+source.solid.max.x)/2,z:(source.solid.min.z+source.solid.max.z)/2}:source?.pos;
   const sourceQ=sourcePoint?stage.track.project(sourcePoint.x,sourcePoint.z):{s:start,u:0},edge=source?sourceQ.s+(source.rapidsRest?.2:.7):start;
   if(!launched&&(p.body.grounded||p.coyote>0)){
    if(live&&goal.kind==='blinkbox'){
     const period=goal.on+goal.off,t=((goal.clock.t+(source?.kind==='blinkbox'?.7:.5)+goal.phase)%period+period)%period;ready=t<goal.on-.3;
    }
    if(goal.solid.max.y-p.pos.y>2.05)ready=false;
    if(ready&&q.s>=edge-.03){jump=true;launched=true;}
   }
   pressed.mockImplementation(k=>k==='jump'&&jump);
   const du=destination.u-q.u,dd=destination.s-q.s,distance=Math.hypot(du,dd),factor=Math.min(1,distance*3);
   input.state.x=distance>.04?du/distance*factor:0;input.state.y=distance>.04?dd/distance*factor:0;
   if(launched&&Math.abs(du)>.35){const x=Math.sign(du),y=Math.max(-1,Math.min(1,dd/(Math.abs(du)*2))),length=Math.hypot(x,y);input.state.x=x/length;input.state.y=y/length;}
   if(!launched){input.state.x=Math.max(-1,Math.min(1,(sourceQ.u-q.u)*3));input.state.y=ready?Math.max(0,Math.min(1,(edge+.05-q.s)*4)):0;}
   p.update(dt,stage,{right:stage.track.right(q.s),forward:stage.track.tangent(q.s)});
   if(frame%20===0)trace.push({frame,target,s:p.body.s,u:p.body.u,y:p.pos.y,grounded:p.body.grounded,vy:p.vel.y,goalTop:goal.solid.max.y,edge,ready,sourceKind:source?.kind});
  }
  return{ok:false,landed:target,s:p.body.s,y:p.pos.y,dead:p.dead,trace};
 }finally{pressed.mockRestore();held.mockRestore();input.state.x=input.state.y=0;}
}
test('actual Player crosses both timing cases with ordinary single jumps and the authored arrow launches',()=>{
 const outputs=[];
 for(let index=0;index<2;index++){const f=build({trial:true}),out=playLane(f,index);outputs.push({index,...out});f.stage.dispose();}
 writeFileSync('/tmp/h45-timing-positive.json',JSON.stringify(outputs,null,2));expect(outputs.map(x=>({...x,trace:x.trace.slice(-5)}))).toEqual(expect.arrayContaining([expect.objectContaining({index:0,ok:true}),expect.objectContaining({index:1,ok:true})]));
},60000);

function tryMoonWell({moon=false,crown=false,bounce=false,startD=254}={}){
 const f=build(),{stage,game}=f,p=actualPlayer(f),well=stage.rapids.moon;
 for(const e of stage.entities)if(e instanceof Enemy)e.dead=true;
 save.data.beaten[5]=moon;save.data.godMode=false;
 if(crown)game.loadout.effects.extra_air_jumps={count:1};
 const point=stage.track.toWorld(startD,-6.3);point.y=well.floor.solid.max.y+.002;
 p.spawnAt(point,stage.track.yaw(startD));p.body.grounded=true;p.body.ground=well.floor.solid;
 let jumping=false,jumpCount=0,high=p.pos.y,landed=false;const trace=[];
 const pressed=vi.spyOn(input,'pressed'),held=vi.spyOn(input,'held');
 try{
  for(let frame=0;frame<480&&!p.dead;frame++){
   const charge=moon&&frame<=73;
   input.state.x=input.state.y=0;
   let jump=false;
   if((moon?frame===73:frame===0)){jump=true;jumping=true;jumpCount++;}
   if(jumping&&p.vel.y<.4&&p.vel.y>-.8&&p.canDouble){jump=true;jumpCount++;}
   pressed.mockImplementation(k=>k==='slide'&&frame===0&&moon||k==='jump'&&jump);
   held.mockImplementation(k=>k==='slide'&&charge||k==='jump');
   if(jumping&&frame>(moon?73:0)){const q=stage.track.project(p.pos.x,p.pos.z);input.state.y=Math.max(-1,Math.min(1,(well.destination.d-q.s)*3));input.state.x=Math.max(-1,Math.min(1,(well.destination.u-q.u)*3));}
   stage.update(1/120,p);p.update(1/120,stage,{right:stage.track.right(p.body.s??startD),forward:stage.track.tangent(p.body.s??startD)});
   if(bounce&&frame===0){p.vel.y=16;p.canDouble=true;}
   game.tickets.update(1/120);high=Math.max(high,p.pos.y);if(frame%20===0)trace.push({frame,y:p.pos.y,s:p.body.s,u:p.body.u,ground:p.body.grounded,charge:p.moonHold?.time,vy:p.vel.y,mode:p.mode});
   if(p.body.grounded&&p.body.ground===well.ledge.solid){landed=true;break;}
  }
  return{moon,crown,bounce,landed,high:high-well.floor.solid.max.y,jumpCount,s:p.body.s,u:p.body.u,collected:well.reward.filter(t=>t.taken).length,trace};
 }finally{pressed.mockRestore();held.mockRestore();input.state.x=input.state.y=0;stage.dispose();}
}
test('Moon well requires the earned charged jump instead of an ordinary Crown triple',()=>{
 const results=[tryMoonWell({moon:true}),tryMoonWell({crown:true})];writeFileSync('/tmp/h45-moon-proof.json',JSON.stringify(results,null,2));expect(results[0].landed).toBe(true);expect(results[1].landed).toBe(false);expect(results[1].collected).toBe(0);
});

function enterMoonWell({bounce=false,direct=false,open=false}={}){
 const f=build(),{stage,game}=f,p=actualPlayer(f),well=stage.rapids.moon;
 for(const e of stage.entities)if(e instanceof Enemy)e.dead=true;
 save.data.beaten[5]=false;save.data.godMode=false;game.loadout.effects={extra_air_jumps:{count:1}};
 if(open)for(const s of[...well.shell.solids,...stage.rapids.loopCases[0].solids])s.enabled=false;
 const start=stage.track.toWorld(256,-1.5,10.01);p.spawnAt(start,stage.track.yaw(256));p.body.grounded=true;
 const pressed=vi.spyOn(input,'pressed'),held=vi.spyOn(input,'held');held.mockImplementation(k=>k==='jump');
 let entered=false,landed=false;
 try{
  if(bounce)p.bounce(16);
  for(let frame=0;frame<600&&!p.dead;frame++){
   const q=stage.track.project(p.pos.x,p.pos.z);if(q.u<-4.7)entered=true;
   const goal=direct?(q.u<-5.9?well.destination:{d:256,u:-6.3}):(entered?well.destination:{d:252,u:-6.3});
   const du=goal.u-q.u,dd=goal.d-q.s,length=Math.hypot(du,dd),scale=Math.min(1,length*3);
   input.state.x=length>.02?du/length*scale:0;input.state.y=length>.02?dd/length*scale:0;
   pressed.mockImplementation(k=>k==='jump'&&!p.body.grounded&&p.canDouble&&p.vel.y<.4&&p.vel.y>-.8);
   stage.update(1/120,p);p.update(1/120,stage,{right:stage.track.right(q.s),forward:stage.track.tangent(q.s)});
   if(p.body.grounded&&p.body.ground===well.ledge.solid){landed=true;break;}
  }
  return{bounce,direct,open,entered,landed,s:p.body.s,u:p.body.u};
 }finally{pressed.mockRestore();held.mockRestore();input.state.x=input.state.y=0;stage.dispose();}
}
test('Moon chamber entrance is walkable and removes the nearby Shellback bounce shortcut',()=>{
 const results=[enterMoonWell(),enterMoonWell({bounce:true}),enterMoonWell({bounce:true,direct:true}),enterMoonWell({bounce:true,direct:true,open:true})];writeFileSync('/tmp/h45-moon-entry-proof.json',JSON.stringify(results,null,2));
 expect(results[0].entered).toBe(true);expect(results.slice(0,3).every(r=>!r.landed)).toBe(true);expect(results[3].landed).toBe(true);
},60000);

test('timing cases remain traversable on their authored live clocks across entry phases',()=>{
 const results=[];
 for(let index=0;index<2;index++)for(const delay of[0,.4,.8,1.2,1.6,2]){const f=build({trial:true});const r=playLane(f,index,{live:true,delay});results.push({index,delay,...r,trace:r.trace.slice(-6)});f.stage.dispose();}
 writeFileSync('/tmp/h45-live-lanes.json',JSON.stringify(results,null,2));expect(results.filter(r=>!r.ok)).toEqual([]);
},60000);

async function fallFromLoop({d,u,index=0}={}){
 const f=build(),{stage,game}=f,p=actualPlayer(f),loop=stage.rapids.loops[index];
 for(const e of stage.entities)if(e instanceof Enemy)e.dead=true;
 loop.active=true;p.spawnAt(stage.track.toWorld(d,u,10.03),stage.track.yaw(d));p.body.grounded=false;p.body.ground=null;
 const pressed=vi.spyOn(input,'pressed').mockReturnValue(false),held=vi.spyOn(input,'held').mockReturnValue(false);input.state.x=input.state.y=0;
 try{
  for(let i=0;i<500&&!p.dead;i++){
   stage.update(1/120,p);p.update(1/120,stage,{right:stage.track.right(p.body.s??d),forward:stage.track.tangent(p.body.s??d)});await Promise.resolve();await Promise.resolve();
   if(!loop.active&&!loop.detour.busy)return{returned:true,dead:p.dead,s:p.body.s,haul:game.session.rawTickets};
  }
  return{returned:false,dead:p.dead,s:p.body.s,type:p.deathType,y:p.pos.y,u:p.body.u,ground:p.body.ground?.ref?.constructor.name,grounded:p.body.grounded};
 }finally{pressed.mockRestore();held.mockRestore();stage.dispose();}
}
test('a physical Gutter side fall washes back to its entry while its real river gap still kills',async()=>{
 const safe=await fallFromLoop({d:255,u:1}),river=await fallFromLoop({d:265,u:-1.5});writeFileSync('/tmp/h45-loop-falls.json',JSON.stringify({safe,river},null,2));expect(safe.returned).toBe(true);expect(safe.s).toBeCloseTo(251,0);expect(river.dead).toBe(true);expect(river.returned).toBe(false);
},60000);

test('both high-loop exits return to their own entry and preserve the run haul',async()=>{
 const f=build(),{stage,game}=f,p=actualPlayer(f);game.session.rawTickets=19;
 for(const[index,d]of[[0,288],[1,420]]){
  const loop=stage.rapids.loops[index];loop.active=true;p.spawnAt(stage.track.toWorld(d,0,10.05),stage.track.yaw(d));loop.update();await Promise.resolve();await Promise.resolve();await Promise.resolve();
  expect(p.body.s).toBeCloseTo(index?390:251,0);expect(loop.active).toBe(false);expect(game.session.rawTickets).toBe(19);
 }
 stage.dispose();
});
test('the Pump House Hidden Bone requires the actual Dust Wall to have broken',()=>{
 const f=build(),{stage,game}=f,p=actualPlayer(f),{wall,hidden}=stage.rapidsHidden;let earned=0;game.session.collectHiddenBone=()=>{earned++;return true;};hidden.owned=false;
 hidden.collect();wall.onBite(p);hidden.collect();expect(earned).toBe(0);
 save.data.beaten[4]=true;p.dustDashT=.2;wall.contact(p);expect(wall.broken).toBe(true);hidden.collect();expect(earned).toBe(1);stage.dispose();
});

function rideWheelToCrane(delay){
 const f=build({trial:true}),{stage}=f,p=actualPlayer(f),lane=stage.rapids.timingCases[0],wheel=stage.entities.find(e=>e.constructor.name==='SpinDrum'),crane=[...stage.rapids.safeYardSupports][1];
 for(const e of stage.entities)if(e instanceof Enemy)e.dead=true;
 p.spawnAt(stage.track.toWorld(lane.end,0,lane.exitTop-stage.track.heightAt(lane.end)+.002),stage.track.yaw(lane.end));p.body.grounded=true;p.body.ground=lane.exitSolids[0];
 for(let i=0;i<delay*120;i++)stage.update(1/120,p);
 const pressed=vi.spyOn(input,'pressed'),held=vi.spyOn(input,'held').mockImplementation(k=>k==='jump');let mounted=false,launched=false,done=false,boardingPart=null;const trace=[];
 try{
  for(let frame=0;frame<1800&&!p.dead;frame++){
   stage.update(1/120,p);const q=stage.track.project(p.pos.x,p.pos.z);let jump=false,goalD=lane.end+.42,goalU=0;
   if(p.body.ground?.ref===wheel&&!mounted){mounted=true;launched=false;}
   if(mounted){
    if(p.body.grounded&&p.pos.y>crane.max.y-1.7&&q.s>275){jump=true;launched=true;}
    if(launched)goalD=280;else{goalD=q.s;goalU=q.u;}
   }else{
    const candidates=wheel.parts.filter(b=>b.coord.d<276&&b.coord.y>1).sort((a,b)=>a.coord.d-b.coord.d),part=boardingPart||candidates[0];
    if(part&&q.s>=lane.end+.36&&(p.body.grounded||p.coyote>0)){jump=true;launched=true;boardingPart=part;}
    if(launched&&part){goalD=part.coord.d;goalU=part.coord.x;}
    if(launched&&q.s>lane.end+.8&&p.vel.y<.4&&p.canDouble&&!p.body.grounded)jump=true;
   }
   pressed.mockImplementation(k=>k==='jump'&&jump);
   const du=goalU-q.u,dd=goalD-q.s,len=Math.hypot(du,dd),factor=Math.min(1,len*3);input.state.x=len>.02?du/len*factor:0;input.state.y=len>.02?dd/len*factor:0;
   p.update(1/120,stage,{right:stage.track.right(q.s),forward:stage.track.tangent(q.s)});
   if(frame%10===0)trace.push({frame,s:p.body.s,u:p.body.u,y:p.pos.y,vy:p.vel.y,ground:p.body.grounded,ref:p.body.ground?.ref?.constructor.name,mounted,launched,goalD,goalU,x:input.state.x,z:input.state.y});
   if(p.body.grounded&&p.body.ground===crane){done=true;break;}
  }
  return{delay,mounted,done,dead:p.dead,s:p.body.s,u:p.body.u,y:p.pos.y,trace};
 }finally{pressed.mockRestore();held.mockRestore();input.state.x=input.state.y=0;stage.dispose();}
}
test('the downstream wheel still carries a real Player onward to the crane deck',()=>{
 const results=[0,1,2,3,4,5,6].map(rideWheelToCrane);writeFileSync('/tmp/h45-wheel-route.json',JSON.stringify(results,null,2));expect(results.filter(r=>!r.done)).toEqual([]);expect(results.filter(r=>r.mounted).length).toBeGreaterThanOrEqual(6);
},60000);

function runStartLine({earned=true,startD=10,u=-3.4}={}){
 const f=build({trial:true}),{stage}=f,p=actualPlayer(f);for(const e of stage.entities)if(e instanceof Enemy)e.dead=true;save.data.beaten[2]=earned;save.data.godMode=false;
 p.spawnAt(stage.track.toWorld(startD,u,.002),stage.track.yaw(startD));p.body.grounded=true;stage.rapids.startGate.previousS=startD;
 const pressed=vi.spyOn(input,'pressed').mockReturnValue(false),held=vi.spyOn(input,'held').mockReturnValue(false);let mounted=false,frames=0;
 try{
  for(;frames<500&&!p.dead;frames++){const q=stage.track.project(p.pos.x,p.pos.z);input.state.x=Math.max(-1,Math.min(1,(u-q.u)*3));input.state.y=1;stage.update(1/120,p);p.update(1/120,stage,{right:stage.track.right(q.s),forward:stage.track.tangent(q.s)});if(p.ride?.meshKind==='raft'){mounted=true;break;}}
  return{earned,startD,u,mounted,frames,s:p.body.s,y:p.pos.y,gateRaised:stage.rapids.startGate.raise};
 }finally{pressed.mockRestore();held.mockRestore();input.state.x=input.state.y=0;stage.dispose();}
}
test('the earned Zoomie gate leads through a real four-metre ramp into the raft',()=>{
 const results=[runStartLine(),runStartLine({earned:false}),runStartLine({startD:22}),runStartLine({startD:22,u:0}),runStartLine({startD:12,earned:false})];writeFileSync('/tmp/h45-start-line.json',JSON.stringify(results,null,2));expect(results[0].mounted).toBe(true);expect(results[4].mounted).toBe(false);expect(results[4].s).toBeLessThan(14.5);expect(results[2].mounted).toBe(true);expect(results[3].mounted).toBe(true);expect(results[2].frames).toBeLessThan(results[3].frames);
},60000);

test('Remix retains every Golden dog and countable in both high loops',()=>{
 const normal=build(),remix=build({remix:true});expect(remix.stage.detours).toHaveLength(2);expect(remix.stage.entities.filter(e=>e.dogId)).toHaveLength(7);expect(remix.stage.entities.filter(e=>e.countable)).toHaveLength(normal.stage.entities.filter(e=>e.countable).length);expect(remix.stage.rapids.moon).toBeNull();normal.stage.dispose();remix.stage.dispose();
});

test('the live mandatory lane routes also work at30and60Hz',()=>{
 const results=[];for(const hz of[30,60])for(let index=0;index<2;index++)for(const delay of[0,.8]){const f=build({trial:true}),r=playLane(f,index,{live:true,delay,hz});results.push({hz,index,delay,...r,trace:r.trace.slice(-4)});f.stage.dispose();}
 writeFileSync('/tmp/h45-live-lane-rates.json',JSON.stringify(results,null,2));expect(results.filter(r=>!r.ok)).toEqual([]);
},60000);

test('a disposed loop session cannot resume its pending entry fade on the shared Player',async()=>{
 const f=build(),{game,stage}=f,p=actualPlayer(f),loop=stage.rapids.loops[0],d=loop.detour;let resolve;
 game.ui.fade=vi.fn(()=>new Promise(r=>{resolve=r;}));const spawn=vi.spyOn(p,'spawnAt'),snap=vi.spyOn(game.camera,'snap'),sound=vi.spyOn(audio,'play');
 const pending=loop.travel(d.startPos,d.entryD);expect(game.ui.fade).toHaveBeenCalledTimes(1);Object.assign(game.session,{game,stage});Session.prototype.dispose.call(game.session);expect(game.session.disposed).toBe(true);p.frozen=false;const before=p.pos.clone();resolve();await pending;
 expect(spawn).not.toHaveBeenCalled();expect(snap).not.toHaveBeenCalled();expect(sound).not.toHaveBeenCalled();expect(game.ui.fade).toHaveBeenCalledTimes(1);expect(p.pos.equals(before)).toBe(true);expect(p.frozen).toBe(false);
 await loop.travel(d.startPos,d.entryD);expect(game.ui.fade).toHaveBeenCalledTimes(1);spawn.mockRestore();snap.mockRestore();sound.mockRestore();
});

test('the no-death aqueduct pays only its authored1UP,6rawand5pack and closes after death',()=>{
 const f=build(),{stage,game}=f,{goodBoy,goodBoyGate,goodBoyPrizes,goodBoyTickets}=stage.rapids;actualPlayer(f);
 expect(goodBoy.jackpot).toBe(0);expect(goodBoy.oneUp).toBe(false);expect(goodBoyPrizes).toHaveLength(2);expect(goodBoyPrizes.filter(p=>p.constructor.name==='OneUp')).toHaveLength(1);expect(goodBoyPrizes.every(p=>!p.countable)).toBe(true);expect(goodBoyTickets).toHaveLength(6);expect(goodBoyPrizes.every(p=>!p.interactive)).toBe(true);const pack=goodBoyPrizes.find(p=>p.solid);expect(pack.solid.enabled).toBe(false);pack.break(game.player,'bite');expect(pack.broken).toBe(false);
 const journal=goodBoyTickets.map(t=>({taken:t.taken,seq:t.seq}));goodBoy.reveal();goodBoy.update(2);goodBoyGate.update();expect(goodBoyPrizes.every(p=>p.interactive)).toBe(true);expect(pack.solid.enabled).toBe(true);pack.break(game.player,'bite');goodBoyGate.update();expect(pack.broken).toBe(true);expect(pack.solid.enabled).toBe(false);expect(pack.interactive).toBe(false);expect(goodBoyTickets.every((t,i)=>t.y===goodBoyGate.ticketY[i])).toBe(true);
 game.session.deaths=1;pack.restore();goodBoyGate.onRespawn();expect(pack.solid.enabled).toBe(false);expect(goodBoy.plats.every(p=>!p.solid.enabled)).toBe(true);expect(goodBoyPrizes.every(p=>!p.interactive)).toBe(true);expect(goodBoyTickets.every((t,i)=>t.y===goodBoyGate.ticketY[i]+1000)).toBe(true);expect(goodBoyTickets.map(t=>({taken:t.taken,seq:t.seq}))).toEqual(journal);stage.dispose();
});

test('the complete ordinary and trial scenes contain only finite authored transforms and vertices',()=>{
 for(const trial of[false,true]){const f=build({trial,decor:true}),bad=[];f.stage.scene.traverse(o=>{for(const key of['position','quaternion','scale'])if(!o[key].toArray().every(Number.isFinite))bad.push({name:o.name,type:o.type,key});const points=o.geometry?.attributes?.position?.array;if(points&&![...points].every(Number.isFinite))bad.push({name:o.name,type:o.type,key:'vertices'});});expect(bad).toEqual([]);f.stage.dispose();}
});

function springOnRiverShell(hopAt){
 const f=build({trial:true}),{stage,game}=f,p=actualPlayer(f),shell=stage.rapids.riverShell;for(const e of stage.entities)if(e instanceof Enemy&&e!==shell)e.dead=true;save.data.godMode=false;
 p.spawnAt(stage.track.toWorld(203,0,-.98),stage.track.yaw(203));p.body.grounded=true;stage.raftController.mount(stage.raftSpans[1],1);p.ride.speedK=1;
 const pressed=vi.spyOn(input,'pressed'),held=vi.spyOn(input,'held').mockImplementation(k=>k==='jump'),flip=vi.spyOn(shell,'flip'),stomp=vi.spyOn(shell,'onStomp');let jumped=false,high=p.pos.y,closest=Infinity,near=null;
 try{
  for(let frame=0;frame<240&&!p.dead;frame++){const q=stage.track.project(p.pos.x,p.pos.z),target=stage.track.project(shell.pos.x,shell.pos.z);input.state.x=Math.max(-1,Math.min(1,(target.u-q.u)*3));input.state.y=0;const jump=!jumped&&q.s>=hopAt;if(jump)jumped=true;pressed.mockImplementation(k=>k==='jump'&&jump);stage.update(1/120,p);p.update(1/120,stage,{right:stage.track.right(q.s),forward:stage.track.tangent(q.s)});game.tickets.update(1/120);high=Math.max(high,p.pos.y-stage.track.heightAt(p.body.s));const distance=p.pos.distanceTo(shell.pos);if(distance<closest){closest=distance;near={s:p.body.s,u:p.body.u,relativeY:p.pos.y-shell.pos.y,enemy:stage.track.project(shell.pos.x,shell.pos.z),vy:p.vel.y};}if(p.body.s>219)break;}
  return{hopAt,flipped:flip.mock.calls.length,stomped:stomp.mock.calls.length,high,closest,near,dead:p.dead,ring:game.tickets.list.filter(t=>t.taken&&Math.abs(stage.track.project(t.x,t.z).s-211)<2).length};
 }finally{pressed.mockRestore();held.mockRestore();flip.mockRestore();stomp.mockRestore();input.state.x=input.state.y=0;stage.dispose();}
}
test('the raft can flip its river Shellback and spring from a real descending hop to the ring',()=>{
 const results=[203,203.25,203.5,203.75,204].map(springOnRiverShell);writeFileSync('/tmp/h45-shellback-route.json',JSON.stringify(results,null,2));expect(results.some(r=>r.flipped>0&&r.stomped>0&&r.high>2.6&&r.ring>0&&!r.dead)).toBe(true);
});

test('early Crown and fully earned Moon starts cannot enter the timing cabinets from above',()=>{
 const f=build(),results=[];for(let index=0;index<2;index++)for(const startBack of[.4,3,5.5])for(const moon of[false,true])for(const first of[24,36,48,60])for(const dash of[-1,48]){const r=attemptBypass(f,index,{moon,startBack,jumps:[first,first+24],dash});results.push({index,startBack,moon,first,dash,...r});}
 writeFileSync('/tmp/h45-early-moon-bypass.json',JSON.stringify(results,null,2));expect(results.filter(r=>r.escaped)).toEqual([]);f.stage.dispose();
},60000);

test('only the opted-in river Shellback flips for a raft ram',()=>{
 const f=build(),p=actualPlayer(f),shell=f.stage.rapids.riverShell,other=f.stage.entities.find(e=>e.constructor.name==='Shellback'&&e!==shell);shell.onSlide(p);expect(shell.mode).toBe('walk');p.setRide({mesh:'vacuum'});shell.onSlide(p);expect(shell.mode).toBe('walk');p.setRide({mesh:'raft',airJumps:0});other.onSlide(p);expect(other.mode).toBe('walk');shell.onSlide(p);expect(shell.mode).toBe('flipped');f.stage.dispose();
});

test('all ten post-game Moon Tickets are collectible from the earned ledge without gear',()=>{
 const f=build(),{stage,game}=f,p=actualPlayer(f),well=stage.rapids.moon;for(const e of stage.entities)if(e instanceof Enemy)e.dead=true;save.data.godMode=false;const origin=well.ledge.pos.clone();origin.y=well.ledge.solid.max.y+.002;p.spawnAt(origin,stage.track.yaw(259));p.body.grounded=true;p.body.ground=well.ledge.solid;
 const pressed=vi.spyOn(input,'pressed'),held=vi.spyOn(input,'held').mockImplementation(k=>k==='jump');
 try{
  for(let frame=0;frame<1600&&!p.dead&&well.reward.some(t=>!t.taken);frame++){const target=well.reward.find(t=>!t.taken),q=stage.track.project(p.pos.x,p.pos.z),goal=stage.track.project(target.x,target.z),du=goal.u-q.u,dd=goal.s-q.s,len=Math.hypot(du,dd),factor=Math.min(1,len*3);input.state.x=len>.02?du/len*factor:0;input.state.y=len>.02?dd/len*factor:0;pressed.mockImplementation(k=>k==='jump'&&(p.body.grounded||p.canDouble&&p.vel.y<.4&&p.vel.y>-.8));stage.update(1/120,p);p.update(1/120,stage,{right:stage.track.right(q.s),forward:stage.track.tangent(q.s)});game.tickets.update(1/120);}
  expect(well.reward.filter(t=>t.taken)).toHaveLength(10);expect(p.dead).toBe(false);
 }finally{pressed.mockRestore();held.mockRestore();input.state.x=input.state.y=0;stage.dispose();}
});
