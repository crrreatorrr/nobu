import { test, vi, expect } from 'vitest';
import * as THREE from 'three';

vi.mock('../src/art/assets.js', () => ({ Assets: {
  has: () => false, model: () => null, animate: () => null, aspect: () => 1,
  tex: () => new THREE.Texture({ width: 256, height: 256 }),
  tiled: () => new THREE.Texture({ width: 256, height: 256 }),
  url: () => '',
} }));

const gradient = { addColorStop() {} };
const ctx = new Proxy({
  measureText: () => ({ width: 100 }),
  createLinearGradient: () => gradient,
  createRadialGradient: () => gradient,
  createImageData: (w,h) => ({ data: new Uint8ClampedArray(w*h*4) }),
  getImageData: (x,y,w,h) => ({ data: new Uint8ClampedArray(w*h*4) }),
}, { get: (obj,k) => k in obj ? obj[k] : () => {}, set: (obj,k,v) => (obj[k]=v,true) });
HTMLCanvasElement.prototype.getContext = () => ctx;
HTMLCanvasElement.prototype.toDataURL = () => '';

const { Stage } = await import('../src/world/stage.js');
const { TicketSystem } = await import('../src/entities/tickets.js');
const { buildLevel4 } = await import('../src/levels/level4.js');
const { measureTicketBudget } = await import('../src/game/measureTicketBudget.js');

const { checkTicketBudget } = await import('../src/game/ticketBudget.js');
const { Backpack } = await import('../src/entities/breakables.js');
const { DustBunny, Iron, SteamFan, ironMotion } = await import('../src/entities/laundry.js');
const { validatePattern } = await import('../src/levels/gauntletMath.js');
const { writeFileSync } = await import('node:fs');
function build(roll=.01,corrections=true,sealedCereal=true){
 const random=vi.spyOn(Math,'random').mockReturnValue(roll);
 try {
 const game={player:{pos:new THREE.Vector3(),body:{s:0},abilities:{}},ui:{tutorial(){},banner(){}},fx:{puff(){},dust(){},burst(){},smokeCard(){},sparkle(){}},camera:{shake(){}},session:{level:'4',def:{tier:4},deaths:0,runSeed:42,nextSeq:()=>1,onBreak(){},onEnemyDefeated(){},addTickets(){}}};
 const stage=new Stage(game,'4'); const tickets=new TicketSystem(game,stage);game.tickets=tickets;
 const result=buildLevel4(game,stage,tickets,{corrections,sealedCereal});tickets.finalize();return {game,stage,tickets,result};
 }finally{random.mockRestore();}
}
const { moveBody,rideGround }=await import('../src/world/physics.js');
const { TUNING }=await import('../src/config/movement.js');
function fly(stage,{u=3,from=345.8,y=0,speed=12.4,jumps=[24],dash=-1,roof=false,velocity=12.6}={}){
 const b={pos:stage.track.toWorld(from,u,y),vel:new THREE.Vector3(0,velocity,0),hw:.3,hd:.3,h:1.3,grounded:false},jumpsAt=new Set(jumps);let doubled=false,dashT=0,landings=[];
 for(let frame=0;frame<360;frame++){
  if(jumpsAt.has(frame)){b.vel.y=TUNING.DOUBLE_JUMP;doubled=true;}
  if(frame===dash)dashT=.2;
  const q=stage.track.project(b.pos.x,b.pos.z),tan=stage.track.tangent(q.s),horizontal=dashT>0?15:speed;
  b.vel.x=tan.x*horizontal;b.vel.z=tan.z*horizontal;
  if(roof&&b.grounded&&b.pos.y>=stage.cerealLane.ceiling-.1)b.vel.y=velocity;
  let g=TUNING.GRAVITY*(b.vel.y<0?TUNING.FALL_MULT:1);if(Math.abs(b.vel.y)<2.2)g*=.55;
  if(dashT>0){dashT-=1/60;b.vel.y=0;}else{b.vel.y=Math.max(-28,b.vel.y-g/60);if(doubled&&b.vel.y<0)b.vel.y=Math.max(-2.4,b.vel.y);}
  moveBody(stage.world,b,1/60);
  if(b.grounded){landings.push(b.ground?.ref);if(stage.cerealLane.boxes.some(p=>p.entity===b.ground?.ref))return{usedTimed:true,escaped:false};}
  if((b.s??q.s)>365.2)return{escaped:true,usedTimed:false,frame,pos:b.pos.toArray(),landings:landings.length};
  if(b.pos.y<-14)return{escaped:false,usedTimed:false,fall:true};
 }
 return{escaped:false,usedTimed:false,pos:b.pos.toArray(),stuck:true};
}
test('sealed cabinet blocks earned-move Glide/Zoomies and high-shelf roof approaches without timing support',()=>{
 const{stage}=build();for(const p of stage.cerealLane.boxes)p.entity.solid.enabled=false;
 const failures=[];let cases=0;
 for(const u of[-3,0,3])for(const first of[6,12,18,24,30,36,42,48,54]){
  cases++;const result=fly(stage,{u,jumps:[first]});if(result.escaped)failures.push({u,jumps:[first],...result});
 }
 outer:for(let first=6;first<=72;first+=6)for(let second=first+6;second<=144;second+=6)for(const dash of[-1,12,36,60,84,108]){
  cases++;const jumps=[first,second],result=fly(stage,{u:3,jumps,dash});if(result.escaped){failures.push({u:3,jumps,dash,...result});break outer;}
 }
 const above=fly(stage,{u:-2.6,from:343.5,y:8,jumps:[45,90],dash:54,roof:true,velocity:18.7});if(above.escaped)failures.push({from:'greenBone',...above});
 writeFileSync('/tmp/h40-cereal-bypass-search.json',JSON.stringify({cases,failures,above},null,2));expect(failures).toEqual([]);
},60000);
const { Player }=await import('../src/player/player.js');
const { input }=await import('../src/core/input.js');
const { save }=await import('../src/core/save.js');
const { GameCamera }=await import('../src/camera/camera.js');
const { resetBeatClocks }=await import('../src/entities/boxes.js');
function routePlayer(f){
 const{game,stage,result}=f;game.stage=stage;game.loadout={effects:{},cosmeticSlots:()=>({})};game.onFlop=()=>{};game.onPlayerDeath=()=>{};game.camera=new GameCamera(1100/800);game.camera.setMode('track',result.camera);stage.defaultCamera=result.camera;
 game.fx=new Proxy(game.fx,{get:(o,k)=>o[k]??(()=>{})});
 const p=Object.create(Player.prototype);Object.assign(p,{game,pos:new THREE.Vector3(),vel:new THREE.Vector3(),root:new THREE.Group(),model:{},wings:new THREE.Group(),halo:new THREE.Group(),stars:new THREE.Group(),deathCone:new THREE.Group(),_animate(){},_updateShadow(){}});
 p.body={pos:p.pos,vel:p.vel,h:1.3,hw:.3,hd:.3,onLand:(...a)=>p._onLand(...a)};game.player=p;return p;
}
function playBoxes(f,p,delay=0,{timing=false}={}){
 const{stage,game}=f,lane=stage.cerealLane;
 p.spawnAt(stage.track.toWorld(345.8,0,0),stage.track.yaw(345.8));p.body.grounded=true;
 game.session.cp={pos:p.pos.clone()};resetBeatClocks(stage);for(const b of stage.timedBoxes)b.entity.onRespawn?.();
 for(let n=0;n<Math.round(delay*120);n++)stage.update(1/120,p);
 if(!timing)for(const b of lane.boxes)b.entity.solid.enabled=true;
 const targets=[...lane.boxes.map(b=>b.entity),lane.exitRest],landed=[],trace=[];
 let target=0,source=null,launched=false,airT=0,doubleUsed=false,jumpPressed=false;
 const pressed=vi.spyOn(input,'pressed').mockImplementation(k=>k==='jump'&&jumpPressed),held=vi.spyOn(input,'held').mockImplementation(k=>k==='jump');
 try{
  for(let frame=0;frame<900&&!p.dead;frame++){
   if(timing)stage.update(1/120,p);else stage.world.beginFrame();
   const receiver=targets[target];
   if(p.body.grounded&&(p.body.ground===receiver.solid||p.body.ground?.ref===receiver)){
    landed.push(target++);if(target===targets.length)return{ok:true,landed,frames:frame,trace};source=receiver;launched=false;airT=0;doubleUsed=false;
   }
   const q=stage.track.project(p.pos.x,p.pos.z),goal=targets[target],gq=stage.track.project(goal.pos.x,goal.pos.z),sourceQ=source?stage.track.project(source.pos.x,source.pos.z):{s:345.08,u:0};
   const edge=source?sourceQ.s+.72:345.8;
   jumpPressed=false;
   if(!launched&&(q.s>=edge-.03||(!p.body.grounded&&p.coyote>0))){jumpPressed=true;launched=true;airT=0;}
   if(launched){airT++;if(airT===30&&!doubleUsed){jumpPressed=true;doubleUsed=true;}}
   const aim=launched?gq:{s:edge+.1,u:sourceQ.u},du=aim.u-q.u,dd=aim.s-q.s,length=Math.hypot(du,dd);
   input.state.x=length>.05?du/length:0;input.state.y=length>.05?dd/length:0;
   const basis={right:stage.track.right(q.s),forward:stage.track.tangent(q.s)};
   p.update(1/120,stage,basis);
   if(frame%8===0)trace.push({frame,target,s:p.body.s,u:p.body.u,y:p.pos.y,mode:p.mode,grounded:p.body.grounded});
  }
  return{ok:false,landed,s:p.body.s,u:p.body.u,y:p.pos.y,mode:p.mode,trace};
 }finally{pressed.mockRestore();held.mockRestore();input.state.x=0;input.state.y=0;}
}
test('the actual Player can traverse all five original boxes and the exit inside the cabinet',()=>{
 save.load();save.data.godMode=false;const f=build(),p=routePlayer(f),out=playBoxes(f,p);
 writeFileSync('/tmp/h40-cereal-player-route.json',JSON.stringify(out,null,2));expect(out.ok,JSON.stringify({...out,trace:out.trace.slice(-5)})).toBe(true);expect(out.landed).toEqual([0,1,2,3,4,5]);
});
test('actual Player can complete the cabinet with live shared clocks, falling boxes and moving landing',()=>{
 save.load();save.data.godMode=false;const f=build(),p=routePlayer(f),attempts=[];
 for(let delay=0;delay<2.2;delay+=.2){const out=playBoxes(f,p,delay,{timing:true});attempts.push({delay,...out});if(out.ok)break;}
 const result=attempts.at(-1);writeFileSync('/tmp/h40-cereal-live-route.json',JSON.stringify(attempts,null,2));expect(result.ok,JSON.stringify({...result,trace:result.trace.slice(-6)})).toBe(true);expect(result.landed).toEqual([0,1,2,3,4,5]);
},60000);
test('the upper cabinet closure specifically blocks the green-bone roof shortcut',()=>{
 const{stage}=build();for(const p of stage.cerealLane.boxes)p.entity.solid.enabled=false;
 const approach={u:-2.6,from:343.5,y:8,jumps:[45,90],dash:54,roof:true,velocity:18.7};
 expect(fly(stage,approach).escaped).toBe(false);
 for(const s of stage.cerealLane.solids)if(s.ref===stage.cerealLane.exitHead)s.enabled=false;
 expect(fly(stage,approach).escaped).toBe(true);
});
test('the live route has at least the tier4 twelve-frame starting window and keeps trial timing',()=>{
 save.load();save.data.godMode=false;const f=build(),p=routePlayer(f),rows=[];
 for(let n=0;n<=12;n++){const delay=1+n/60,out=playBoxes(f,p,delay,{timing:true});rows.push({delay,ok:out.ok,landed:out.landed});}
 f.game.session.trial=true;const trial=playBoxes(f,p,1,{timing:true});
 writeFileSync('/tmp/h40-cereal-input-window.json',JSON.stringify({rows,trial:{ok:trial.ok,landed:trial.landed,frames:trial.frames}},null,2));
 expect(rows.every(r=>r.ok),JSON.stringify(rows)).toBe(true);expect(trial.ok).toBe(true);
},60000);
test('walking back from the cabinet roof returns safely to its existing entry floor',()=>{
 const{stage}=build(),lane=stage.cerealLane,b={pos:stage.track.toWorld(358,0,0),vel:new THREE.Vector3(),hw:.3,hd:.3,h:1.3,grounded:true};b.pos.y=lane.ceiling+.3;
 let returned=false;
 for(let i=0;i<420;i++){const q=stage.track.project(b.pos.x,b.pos.z),v=stage.track.tangent(q.s).multiplyScalar(-8);b.vel.x=v.x;b.vel.z=v.z;b.vel.y=Math.max(-28,b.vel.y-36/120);moveBody(stage.world,b,1/120);if(b.s<340&&b.grounded){returned=true;break;}if(b.pos.y<-14)break;}
 expect(returned).toBe(true);
});
