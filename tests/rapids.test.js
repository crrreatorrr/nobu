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
export function build({trial=false,corrections=true}={}){
 const game={player:{pos:new THREE.Vector3(),vel:new THREE.Vector3(),body:{s:0,u:0},abilities:{}},camera:{opts:{},shake(){}},ui:{tutorial(){},banner(){},fade:async()=>{}},fx:new Proxy({},{get:()=>()=>{}}),session:{level:6,def:{tier:4.5},phase:'level',trial,deaths:0,deathsAtCp:0,runSeed:42,nextSeq:()=>1,onBreak(){},rescueDog(){},addTickets(){},reachGoal(){}}};
 const stage=new Stage(game,'river');game.stage=stage;const tickets=new TicketSystem(game,stage);game.tickets=tickets;const info=buildLevel6(game,stage,tickets,{corrections});tickets.finalize();return{game,stage,tickets,info};
}
test('builds the complete numeric candidate with stable dogs, all raft spans and explicit main-goal return metadata',()=>{
 const{stage,tickets,info}=build(),measured=measureTicketBudget(stage,tickets);writeFileSync('/tmp/h45-builder-tally.json',JSON.stringify({length:stage.track.length,entities:stage.entities.length,dogs:stage.entities.filter(e=>e.dogId).map(e=>e.dogId),countables:stage.entities.filter(e=>e.countable).map(e=>e.kind??e.constructor.name),measured,total:ticketBudget(measured),slots:[...stage.mysterySlots]},null,2));
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
function attemptBypass(f,index,{u=0,jumps=[30],dash=-1}={}){
 const{stage,game}=f,lane=stage.rapids.timingCases[index],p=actualPlayer(f),start=lane.start-.4;
 game.loadout.effects={extra_air_jumps:{count:1},air_dash:{charges_per_jump:1,dash_time_s:.22,distance_m:4.4}};
 for(const id of[1,2,3,4])save.data.beaten[id]=true;save.data.godMode=false;
 for(const e of stage.entities)if(e instanceof Enemy)e.dead=true;
 p.spawnAt(stage.track.toWorld(start,u,0),stage.track.yaw(start));p.body.grounded=true;
 const pressed=vi.spyOn(input,'pressed'),held=vi.spyOn(input,'held');
 held.mockImplementation(k=>k==='jump');input.state.x=0;input.state.y=1;
 try{
  for(let frame=0;frame<480&&!p.dead;frame++){
   stage.update(1/60,p);for(const b of lane.boxes)b.entity.solid.enabled=false;
   pressed.mockImplementation(k=>(k==='jump'&&(frame===0||jumps.includes(frame)))||(k==='dash'&&frame===dash));
   const s=p.body.s??start;p.update(1/60,stage,{right:stage.track.right(s),forward:stage.track.tangent(s)});
   if(p.body.grounded&&p.body.ground?.ref?.constructor.name==='SpinDrum'&&p.body.s>lane.start+8)return{escaped:true,carrier:true,frame,s:p.body.s,y:p.pos.y};
   if(p.body.grounded&&lane.exitSolids.includes(p.body.ground))return{escaped:true,frame,s:p.body.s,y:p.pos.y};
   if(p.body.s>lane.end+.8&&p.pos.y>=lane.exitTop-.1)return{escaped:true,frame,s:p.body.s,y:p.pos.y};
  }
  return{escaped:false,dead:p.dead,s:p.body.s,y:p.pos.y};
 }finally{pressed.mockRestore();held.mockRestore();input.state.x=input.state.y=0;}
}
test('physical timing cases reject owned Double/Glide/Crown/dash bypasses when all timing supports are absent',()=>{
 const f=build({trial:true}),results=[];
 for(let index=0;index<2;index++)for(const u of[-3,0,3])for(const first of[12,24,36,48,60])for(const dash of[-1,24,48]){
  const result=attemptBypass(f,index,{u,jumps:[first,first+24],dash});results.push({index,u,first,dash,...result});
 }
 writeFileSync('/tmp/h45-timing-bypass.json',JSON.stringify(results,null,2));
 expect(results.filter(r=>r.escaped)).toEqual([]);f.stage.dispose();
},60000);

function playLane(f,index,{live=false,delay=0}={}){
 const{stage,game}=f,lane=stage.rapids.timingCases[index],p=actualPlayer(f),start=lane.start-.4;
 for(const e of stage.entities)if(e instanceof Enemy)e.dead=true;
 const rest=index===1?stage.entities.find(e=>e.rapidsRest):null;
 const targets=[...lane.boxes.map(b=>b.entity),...(rest?[rest]:[])].sort((a,b)=>stage.track.project(a.pos.x,a.pos.z).s-stage.track.project(b.pos.x,b.pos.z).s);
 targets.push({pos:stage.track.toWorld(lane.end,0,lane.exitTop-stage.track.heightAt(lane.end)),solid:lane.exitSolids[0],exit:true});
 const hits=[];p.body.onLand=solid=>{hits.push(solid);p._onLand(solid);};
 p.spawnAt(stage.track.toWorld(start,0,0),stage.track.yaw(start));p.body.grounded=true;
 for(let i=0;i<Math.round(delay*120);i++)stage.update(1/120,p);
 let target=0,launched=false,source=null;
 const pressed=vi.spyOn(input,'pressed'),held=vi.spyOn(input,'held');held.mockImplementation(k=>k==='jump');
 const trace=[];
 try{
  for(let frame=0;frame<2200&&!p.dead;frame++){
   stage.update(1/120,p);
   if(!live)for(const b of lane.boxes)b.entity.solid.enabled=true;
   const receiver=targets[target];
   if(hits.some(s=>receiver.exit?lane.exitSolids.includes(s):s===receiver.solid)){
    hits.length=0;target++;
    if(target===targets.length)return{ok:true,frames:frame,landed:target,trace};
    source=receiver;launched=!!receiver.arrow;
   }else if(hits.length&&p.body.grounded&&p.body.ground!==source?.solid){source={pos:p.pos.clone(),solid:hits.at(-1),carrier:true};launched=false;hits.length=0;}
   else hits.length=0;
   const q=stage.track.project(p.pos.x,p.pos.z),goal=targets[target],center=goal.solid?{x:(goal.solid.min.x+goal.solid.max.x)/2,z:(goal.solid.min.z+goal.solid.max.z)/2}:goal.pos;
   if(goal.kind==='slidebox'){const lead=.18,a=(goal.clock.t+lead)*goal.speed+goal.phase;center.x=goal.home.x+goal.dir.x*Math.sin(a)*goal.range;center.z=goal.home.z+goal.dir.z*Math.sin(a)*goal.range;}
   const destination=goal.exit?{s:lane.end,u:0}:stage.track.project(center.x,center.z);
   let jump=false,ready=true;
   const sourcePoint=source?.carrier?{x:(source.solid.min.x+source.solid.max.x)/2,z:(source.solid.min.z+source.solid.max.z)/2}:source?.pos;
   const sourceQ=sourcePoint?stage.track.project(sourcePoint.x,sourcePoint.z):{s:start,u:0},edge=source?sourceQ.s+(source.rapidsRest?.2:.7):start;
   if(!launched&&(p.body.grounded||p.coyote>0)){
    if(live&&goal.kind==='blink'){
     const period=goal.on+goal.off,t=((goal.clock.t+.7+goal.phase)%period+period)%period;ready=t<goal.on-.08;
    }
    if(goal.solid.max.y-p.pos.y>2.05)ready=false;
    if(ready&&q.s>=edge-.03){jump=true;launched=true;}
   }
   pressed.mockImplementation(k=>k==='jump'&&jump);
   const du=destination.u-q.u,dd=destination.s-q.s,distance=Math.hypot(du,dd),factor=Math.min(1,distance*3);
   input.state.x=distance>.04?du/distance*factor:0;input.state.y=distance>.04?dd/distance*factor:0;
   if(launched&&Math.abs(du)>.35){const x=Math.sign(du),y=Math.max(-1,Math.min(1,dd/(Math.abs(du)*2))),length=Math.hypot(x,y);input.state.x=x/length;input.state.y=y/length;}
   if(!launched){input.state.x=Math.max(-1,Math.min(1,(sourceQ.u-q.u)*3));input.state.y=ready?Math.max(0,Math.min(1,(edge+.05-q.s)*4)):0;}
   p.update(1/120,stage,{right:stage.track.right(q.s),forward:stage.track.tangent(q.s)});
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
