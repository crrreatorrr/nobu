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
test('literal builder has stable seven rescues, three Mystery slots, complete sections and real track',()=>{
 const {stage,result}=build();
 expect(stage.track.length).toBeGreaterThanOrEqual(490);
 expect(stage.entities.filter(e=>e.dogId).map(e=>e.dogId).sort()).toEqual(['4:corgi-a','4:corgi-b','4:dalmatian-a','4:dalmatian-b','4:pug-a','4:shiba-a','4:shiba-b']);
 expect([...stage.mysterySlots].sort()).toEqual([0,1,2]);
 expect(stage.sections.filter(s=>!s.detour).map(s=>s.name)).toEqual(['Hallway','Laundry Room','Ironing Board','Kitchen Counter','Roomba Stampede','Basement Stairs','Boiler Room']);
 expect(stage.detours.map(d=>({loop:d.loop,skipSpan:d.skipSpan}))).toEqual([{loop:true,skipSpan:null},{loop:false,skipSpan:[187,244]}]);
 expect(result.camera.height).toBe(4.3);expect(stage.emitters.filter(e=>e.kind==='bubble')).toHaveLength(9);
});
test('measured authored payer maxima are roll independent and fail above the fixed184 cap',()=>{
 const low=build(),high=build(.99999),measured=measureTicketBudget(low.stage,low.tickets,7);
 expect(measured).toEqual(measureTicketBudget(high.stage,high.tickets,7));
 expect(measured).toEqual({field:121,packs:192,zipped:14,jackpots:15,bark:15,trampoline:0,mystery:3,arena:7,coconut:true});
 expect(checkTicketBudget('4',measured).wholeMax).toBe(145);
 low.stage.add(new Backpack(low.stage,0,0,0,{tickets:121}));
 expect(()=>checkTicketBudget('4',measureTicketBudget(low.stage,low.tickets,7))).toThrow(/exceeds fixed cap184|exceeds fixed cap 184/);
});
test('Iron pauses at both ends, touches as a hazard and resets without touching movement tuning',()=>{
 expect(ironMotion(.2,131,172,4.8).d).toBe(131);expect(ironMotion(2.6,131,172,4.8).d).toBe(172);
 const {stage}=build(),iron=stage.entities.find(e=>e instanceof Iron),hurt=vi.fn();
 iron.onTouch({hurt});expect(hurt).toHaveBeenCalledWith('flat',iron.pos.x,iron.pos.z);
 iron.update(1);expect(iron.motion.d).toBeGreaterThan(131);iron.onRespawn();expect(iron.motion.d).toBe(131);
 expect(stage.entities.filter(e=>e instanceof SteamFan)).toHaveLength(4);
});
test('a bitten whole Dust Bunny splits once, halves flee and die without splitting; retry removes both',()=>{
 const {stage,game}=build(),b=stage.entities.find(e=>e instanceof DustBunny);game.player.pos.copy(b.pos).add(new THREE.Vector3(-2,0,0));
 b.onBite(game.player);expect(b.spawned).toHaveLength(2);const children=[...b.spawned];
 expect(b.dead).toBe(true);b.onBite(game.player);expect(b.spawned).toHaveLength(2);
 const first=children[0],before=first.pos.clone();first.update(.1);expect(first.pos.distanceTo(before)).toBeGreaterThan(.1);
 expect(first.size.w).toBeCloseTo(b.size.w/2);first.onBite(game.player);expect(first.spawned).toHaveLength(0);expect(first.alive).toBe(false);
 b.reset();b.onRespawn();expect(b.alive).toBe(true);expect(b.dead).toBe(false);expect(children.every(e=>!stage.entities.includes(e)&&!e.obj.parent)).toBe(true);
});
test('ambush canonical visibility stays hidden before trigger, drops, then rearms on retry',()=>{
 const {stage,game}=build(),e=stage.entities.find(e=>e.ambush);game.player.body.s=369;e.update(.1);expect(e.visible).toBe(false);expect(e.interactive).toBe(false);
 game.player.body.s=370;e.update(.1);expect(e.visible).toBe(true);expect(e.pos.y).toBeLessThan(e.home.y+5);
 for(let i=0;i<60;i++)e.update(1/60);expect(e.ambush.mode).toBe('active');expect(e.interactive).toBe(true);
 e.reset();e.onRespawn();expect(e.visible).toBe(false);expect(e.obj.visible).toBe(false);expect(e.pos.y).toBe(e.home.y+5);
});
const { laundryBoilerPattern:boiler, laundryCerealPattern:cereal } = await import('../src/levels/data/laundryRoutes.js');
test('record literal Boiler fairness failures and test the minimal rest/tell proposal',()=>{
 const {stage}=build(.01,false,false),literal=validatePattern(boiler(stage)),candidate=validatePattern(boiler(build(.01,true).stage));
 writeFileSync('/tmp/h40-boiler-fairness.json',JSON.stringify({literal,candidate},null,2));
 expect(literal.some(p=>p.problem.includes('Timed actions'))).toBe(true);expect(literal.some(p=>p.problem.includes('contact tell'))).toBe(true);
 expect(candidate).toEqual([]);
});

test('Cereal actual-world route passes tier4 jump and moving-window requirements',()=>{const{stage}=build();expect(validatePattern(cereal(stage))).toEqual([]);});
const { moveBody } = await import('../src/world/physics.js');
const { L4_STAMPEDE, L4_CHASE_PACKS } = await import('../src/levels/data/laundry.js');
const { run:chaseRun, budget:chaseBudget, chaseStops } = await import('../tools/audit/chaseModel.js');
test('actual authored stampede stops fit75percent budget with earlier stops and bounded negative case',()=>{
 const earlier=[],segment={...L4_STAMPEDE};
 for(const stop of chaseStops(L4_CHASE_PACKS)){
  expect(stop.dur).toBeLessThanOrEqual(chaseBudget(segment,earlier,stop.d)*.75);
  earlier.push({d:stop.d-.8,dur:stop.dur});
 }
 expect(chaseRun({...segment,stops:earlier}).dead).toBe(false);
 expect(chaseRun({...segment,stops:[{d:275,dur:8}]}).dead).toBe(true);
});
function walk(stage,u,d0,d1){
 const body={pos:stage.track.toWorld(d0,u,0),vel:new THREE.Vector3(),hw:.36,hd:.36,h:1.3,grounded:true,s:d0};
 const dt=1/60;
 for(let i=0;i<180;i++){
  const q=stage.track.project(body.pos.x,body.pos.z),target=stage.track.toWorld(Math.min(d1,q.s+.12),u,0),delta=target.sub(body.pos).setY(0);
  if(q.s>d1-.1)return {passed:true,body};
  body.vel.copy(delta.multiplyScalar(1/dt));body.vel.y=-1;
  moveBody(stage.world,body,dt);
 }
 return {passed:false,body};
}
test('literal Dust Wall has a demonstrated walking bypass and Bark Rock blocks the narrow right lane',()=>{
 const{stage}=build();const dust=stage.entities.find(e=>e.kind==='dustwall');
 expect(walk(stage,-6.65,381,388).passed).toBe(true);expect(dust.broken).toBe(false);
 expect([4.3,4.6,5,5.4,5.7].map(u=>walk(stage,u,381,388).passed)).toEqual([false,false,false,false,false]);
});

test('local Hidden Bone lock is visible and rejects all collection approaches until its own Dust Wall opens',()=>{
 const{stage,game}=build(),bone=stage.entities.find(e=>e.dustWall),collect=vi.fn(()=>true);game.session.collectHiddenBone=collect;
 const cage=bone.obj.children.find(c=>c.isLineSegments);
 expect(cage.visible).toBe(true);expect(bone.bone.material.opacity).toBe(.35);
 for(const action of ['onTouch','onBite','onStomp','onSlide'])bone[action]();expect(collect).not.toHaveBeenCalled();
 game.player.abilities.dust=true;game.player.dustDashing=true;bone.dustWall.onTouch(game.player);expect(bone.dustWall.broken).toBe(true);
 bone.update(0);expect(cage.visible).toBe(false);expect(bone.bone.material.opacity).toBe(1);bone.onTouch();expect(collect).toHaveBeenCalledOnce();
});
const { simJump } = await import('../src/levels/gauntletMath.js');
function jumpLanding(stage,from,to,opts={}){
 const start=stage.track.toWorld(from[2],from[0],from[1]),end=stage.track.toWorld(to[2],to[0],to[1]);
 const trace=simJump({...opts,dy:end.y-start.y}),body={pos:start.clone(),vel:new THREE.Vector3(),hw:.36,hd:.36,h:1.3,grounded:false};
 if(!trace||Math.hypot(end.x-start.x,end.z-start.z)/trace.air>8){writeFileSync(`/tmp/h40-jump-failure-${from[2]}.json`,JSON.stringify({from,to,start:start.toArray(),end:end.toArray(),air:trace?.air,reason:'speed-or-trace'},null,2));return null;}
 const targets=stage.world.all.filter(s=>s.enabled&&s.max.y>=end.y-.02&&s.max.y<=end.y+1.1&&end.x>=s.min.x-.36&&end.x<=s.max.x+.36&&end.z>=s.min.z-.36&&end.z<=s.max.z+.36);
 const arrived=()=>targets.includes(body.ground)||(body.ground?.kind==='track'&&body.pos.distanceTo(end)<1.8);
 let headHit=false;body.onHead=()=>{headHit=true;};
 const vx=(end.x-start.x)/trace.air,vz=(end.z-start.z)/trace.air;
 for(let i=1;i<trace.samples.length;i++){
  const sample=trace.samples[i];body.vel.set(vx,sample.vy,vz);moveBody(stage.world,body,1/60);
  if(headHit)return null;
  if(body.grounded&&sample.vy<0){if(arrived())return body;return null;}
 }
 for(let i=0;i<12;i++){body.vel.set(0,-2.4,0);moveBody(stage.world,body,1/60);if(body.grounded&&arrived())return body;}
 writeFileSync(`/tmp/h40-jump-failure-${from[2]}.json`,JSON.stringify({from,to,start:start.toArray(),end:end.toArray(),air:trace.air,traceEnd:trace.samples.at(-1),body:{pos:body.pos.toArray(),grounded:body.grounded,s:body.s,u:body.u}},null,2));return null;
}
test('actual World collision lands every Top Shelf outbound jump and both toaster shelf launches',()=>{
 const{stage}=build();
 const out=[[3,9.5,122],[2.4,10.1,126],[2,10.1,131],[2.8,10.7,136],[2.2,10.7,140],[3,10.7,143.4],[2.6,11.3,147.5],[2.6,11.3,152],[2.6,11.3,156.5]];
 for(let i=1;i<out.length;i++)expect(jumpLanding(stage,out[i-1],out[i]),`Top Shelf ${i}`).not.toBeNull();
 expect(jumpLanding(stage,[-2.4,1,187.5],[-2.4,4.2,192],{velocity:15*1.15,cut:true})).not.toBeNull();
 expect(jumpLanding(stage,[2.4,1,200.5],[2.4,4.2,205],{velocity:15*1.15,cut:true})).not.toBeNull();
});
test('document the literal Cereal Glide bypass rather than claiming chosen-route proof rules it out',()=>{
 const{stage}=build(.01,false,false);expect(jumpLanding(stage,[3,0,345.5],[3,0,366],{doubleAt:.45,glide:true})).not.toBeNull();
});
const { SpinDrum }=await import('../src/entities/props2.js');
const { drumPos }=await import('../src/entities/propsTiming.js');
const { rideGround }=await import('../src/world/physics.js');
test('moving Laundry drums carry real bodies and admit held-jump boarding windows from their preceding rests',()=>{
 const{stage,game}=build(),drums=stage.entities.filter(e=>e instanceof SpinDrum);
 for(const [j,drum]of drums.entries()){
  // Search a bounded set of authored drum phases; do not freeze the destination.
  const from=j?[0,3.2,72.5]:[0,0,59.5],start=stage.track.toWorld(from[2],from[0],from[1]);let boarded=false;
  for(let phase=0;phase<24&&!boarded;phase++)for(let part=0;part<4&&!boarded;part++){
   drum.t=phase*drum.opts.period/24;drum.onRespawn();const begin=drum.t;
   let flight=.7,end,trace;
   for(let it=0;it<5;it++){const c=drumPos(part,begin+flight,drum.opts);end=stage.track.toWorld(c.d,c.x,c.y);trace=simJump({dy:end.y-start.y});if(!trace)break;flight=trace.air;}
   if(!trace||end.clone().sub(start).setY(0).length()/trace.air>8)continue;
   const b={pos:start.clone(),vel:new THREE.Vector3(),hw:.36,hd:.36,h:1.3,grounded:false},v=end.clone().sub(start).setY(0).multiplyScalar(1/trace.air);let head=false;b.onHead=()=>{head=true;};
   game.player.body=b;
   for(const sample of trace.samples.slice(1)){
    stage.world.beginFrame();drum.update(1/60);b.vel.set(v.x,sample.vy,v.z);moveBody(stage.world,b,1/60);
    if(head)break;
    if(b.grounded){boarded=b.ground?.ref===drum;break;}
   }
  }
  expect(boarded,`Drum${j+1} has a real moving boarding window`).toBe(true);
  drum.t=0;drum.onRespawn();const solid=drum.parts[3].solid,b={pos:new THREE.Vector3((solid.min.x+solid.max.x)/2,solid.max.y,(solid.min.z+solid.max.z)/2),vel:new THREE.Vector3(),hw:.36,hd:.36,h:1.3,grounded:true,ground:solid};game.player.body=b;
  // A quarter turn lifts the bottom rider to the forward rim; real carry/collision order.
  for(let i=0;i<Math.floor(drum.opts.period/4*60);i++){stage.world.beginFrame();drum.update(1/60);rideGround(b);b.vel.set(0,-1,0);moveBody(stage.world,b,1/60);}
  expect(b.pos.y).toBeGreaterThan(drum.home.y-1);expect(b.grounded).toBe(true);
 }
});
test('actual drum forward-rim jumps reach both shelves and Drum1 top reaches the high rescue shelf',()=>{
 const{stage}=build();
 for(const[from,to]of [[[0,3.2,67.2],[0,3.2,71.5]],[[0,3.2,82.4],[0,3.2,86.5]],[[0,6.4,64],[-3.6,6.6,67]]])expect(jumpLanding(stage,from,to)).not.toBeNull();
});
test('candidate Cereal and Boiler jump shapes land on actual solids while lit, including the proposed permanent rest',()=>{
 const{stage}=build(.01,true,false);
 // Timing windows are separately checked by validatePattern. Here collision shapes
 // are tested in their lit interval so an off-phase cannot masquerade as bad geometry.
 for(const p of stage.timedBoxes)if(p.entity.solid)p.entity.solid.enabled=true;
 for(const pattern of [cereal(stage),boiler(stage)])for(const step of pattern.route){
  const a=pattern.pieces[step.from],b=pattern.pieces[step.to];
  const surface=p=>[p.x,p.y-stage.track.heightAt(p.d)+(['arrow','blink','slide','fall','lunch'].includes(p.kind)?.98:p.kind==='pack'?1:0),p.d];
  const opts=step.move==='arrowHeld'?{velocity:16*1.15,cut:true}:step.move==='bounceHeld'?{velocity:10.5*1.15}:{};
  expect(jumpLanding(stage,surface(a),surface(b),opts),`${pattern.id} ${a.d}→${b.d}`).not.toBeNull();
 }
});
const { RisingHazard }=await import('../src/entities/environment.js');
const { LAUNDRY_BUDGET }=await import('../src/levels/data/laundryBudget.js');
const { L4_RISING_CHECKS }=await import('../src/levels/data/laundry.js');
test('actual hot-water instance respects authored good-pace margins and reset; exported budget matches the built sources',()=>{
 const{stage,tickets}=build(),water=stage.entities.find(e=>e instanceof RisingHazard);
 expect(water.fairness(L4_RISING_CHECKS.map(([d,y,arrival])=>({d,y,arrival})))).toEqual([]);
 expect(water.fairness([{d:410.5,y:0,arrival:10}])).toHaveLength(1);
 water.y=8;water.state='rising';water.onRespawn();expect(water.y).toBe(-3);expect(water.state).toBe('armed');
 expect(measureTicketBudget(stage,tickets,7)).toEqual(LAUNDRY_BUDGET);
});
test('candidate pity relocation uses existing permanent floor and armed checkpoint respawn settles',()=>{
 const literal=build(.01,false,false),candidate=build(.01,true),spot=({stage})=>stage.entities.find(e=>e.kind==='pitysnacks'&&stage.track.project(e.pos.x,e.pos.z).s>406);
 const bad=spot(literal);expect(literal.stage.world.groundBelow(bad.pos.x,bad.pos.y+.1,bad.pos.z,.2)).toBe(-Infinity);
 const{stage,game}=candidate,cp=spot(candidate);game.session.checkpoint=vi.fn();cp.arm();cp.hit();expect(game.session.checkpoint).toHaveBeenCalledOnce();
 const start=game.session.checkpoint.mock.calls[0][0],body={pos:start.clone(),vel:new THREE.Vector3(),hw:.36,hd:.36,h:1.3,grounded:false};
 for(let i=0;i<60;i++){body.vel.y-=25/60;moveBody(stage.world,body,1/60);}
 expect(body.grounded).toBe(true);expect(body.pos.y).toBeCloseTo(start.y,3);expect(stage.track.project(start.x,start.z).s).toBeCloseTo(407.5,2);
 for(const e of stage.entities.filter(e=>e.kind==='pitysnacks'||e.constructor.name==='Snacks'))expect(stage.world.groundBelow(e.pos.x,e.pos.y+.1,e.pos.z,.2),`checkpoint ${e.pos.toArray()}`).toBeGreaterThan(-Infinity);
});
const { GameCamera }=await import('../src/camera/camera.js');
test('local framing keeps player poses within bounds and restores the original track camera after each area',()=>{
 const{stage,game,result}=build();stage.finalize();stage.scene.updateMatrixWorld(true);stage.defaultCamera=result.camera;game.camera=new GameCamera(1100/800);
 for(const[d,u,y,expectedHeight]of [[86.5,0,3.2,6.5],[385,-6.2,0,14]]){
  game.player.pos.copy(stage.track.toWorld(d,u,y));Object.assign(game.player.body,{s:d,u,grounded:true});
  const zone=stage.entities.find(e=>e.constructor.name==='CamZone'&&e.contains(d));zone.apply(d);game.camera.snap(game.player);game.camera.cam.updateMatrixWorld();
  expect(game.camera.opts.height).toBe(expectedHeight);expect(game.camera.sideAxis).toBe(false);
  for(const h of [.2,1.2]){const ndc=game.player.pos.clone().add(new THREE.Vector3(0,h,0)).project(game.camera.cam);expect(Math.abs(ndc.x)).toBeLessThan(.9);expect(Math.abs(ndc.y)).toBeLessThan(.9);expect(ndc.z).toBeLessThan(1);}
  const target=game.player.pos.clone().add(new THREE.Vector3(0,1,0)),origin=game.camera.cam.position,direction=target.clone().sub(origin),distance=direction.length(),ray=new THREE.Raycaster(origin,direction.normalize(),.1,distance-.1);
  ray.camera=game.camera.cam;
  const opaque=ray.intersectObjects(stage.scene.children,true).filter(hit=>{if(!hit.object.isMesh)return false;let obj=hit.object;while(obj){if(!obj.visible)return false;obj=obj.parent;}const m=hit.object.material;return !m?.transparent||m.opacity>.5;});
  expect(opaque.map(hit=>({type:hit.object.geometry?.type,distance:hit.distance,point:hit.point.toArray(),entity:stage.entities.find(e=>{let o=hit.object;while(o){if(o===e.obj)return true;o=o.parent;}return false;})?.constructor.name,color:hit.object.material?.color?.getHex()})),`visible player pose at${d}`).toEqual([]);
  zone.apply(zone.d1+1);expect(game.camera.opts).toBe(result.camera);expect(game.camera.mode).toBe('track');
 }
});
