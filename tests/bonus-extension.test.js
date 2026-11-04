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
const { buildBonusRide, buildBonusRideCandidate } = await import('../src/levels/bonusRide.js');
const { buildBonusCave, buildBonusCaveCandidate } = await import('../src/levels/bonusCave.js');
const { measureTicketBudget } = await import('../src/game/measureTicketBudget.js');
const { ticketBudget, checkTicketBudget } = await import('../src/game/ticketBudget.js');
const LEGACY_BONUS_BUDGETS = {
 ride:{field:55,packs:35,zipped:8,jackpots:0,bark:0,trampoline:0,mystery:0,arena:0,coconut:false},
 cave:{field:39,packs:55,zipped:16,jackpots:0,bark:15,trampoline:0,mystery:0,arena:0,coconut:false},
};
const { BONUS_BUDGETS_V2, CAVE_SPLICES, RIDE_SPLICES, shiftDistance, shiftSpans } = await import('../src/levels/data/bonus-layout2.js');
const { EchoCrystal, SofaLoop } = await import('../src/levels/bonusExtension.js');
vi.spyOn(Stage.prototype,'decor').mockImplementation(()=>{});
function build(id,candidate=true,roll=.001,options={}) {
 const random=vi.spyOn(Math,'random').mockReturnValue(roll);
 try {
  const noop=()=>{};
  const game={ player:{pos:new THREE.Vector3(),body:{},abilities:{}},ui:{tutorial:noop,banner:noop},fx:{},camera:{shake:noop},
   session:{level:id,deaths:0,runSeed:42,nextSeq:()=>1,onBreak:noop,addTickets:noop} };
  const stage=new Stage(game,id==='ride'?'house':'cave');game.stage=stage;
  const tickets=new TicketSystem(game,stage);game.tickets=tickets;
  const info=(id==='ride'?(candidate?buildBonusRideCandidate:buildBonusRide):(candidate?buildBonusCaveCandidate:buildBonusCave))(game,stage,tickets,options);
  tickets.finalize();return {stage,tickets,info,game,measured:measureTicketBudget(stage,tickets)};
 } finally {random.mockRestore();}
}
test('old builders retain their authored economic payload and two dog IDs',()=>{
 for(const id of ['ride','cave']){
  const {stage,measured}=build(id,false);expect(measured).toEqual(LEGACY_BONUS_BUDGETS[id]);
  expect(stage.entities.filter(e=>e.dogId).length).toBe(2);
 }
});
test('all old floor spans split at every insertion, including the second splice in Ride final floor',()=>{
 expect(shiftSpans(201,313,RIDE_SPLICES)).toEqual([[251,255],[295,379],[447,471]]);
 expect(shiftSpans(135,182,CAVE_SPLICES)).toEqual([[180,227]]);
 expect(shiftDistance(302,RIDE_SPLICES)).toBe(460);expect(shiftDistance(243,CAVE_SPLICES)).toBe(371);
});
for(const id of ['ride','cave']) test(`actual ${id} candidates keep four stable dogs and remain below the approved fixed cap`,()=>{
 const low=build(id),high=build(id,true,.99999);
 expect(low.measured).toEqual(high.measured);
 expect(low.stage.entities.filter(e=>e.dogId).map(e=>e.dogId).sort()).toEqual(id==='ride'?
 ['ride:shiba-a','ride:corgi-a','ride:pug-a','ride:dalmatian-a'].sort():
 ['cave:pug-a','cave:shiba-a','cave:corgi-a','cave:dalmatian-a'].sort());
 expect(checkTicketBudget(id,low.measured).wholeMax).toBeLessThanOrEqual(id==='ride'?110:89);
 expect(low.measured).toEqual(BONUS_BUDGETS_V2[id]);
 expect(ticketBudget(low.measured).wholeMax).toBe(id==='ride'?62:58);
});
test('Sofa raised floor leaves the original main ground visible and returns within two metres',()=>{
 const {stage}=build('ride');const loop=stage.entities.find(e=>e instanceof SofaLoop);
 expect(loop.loop).toBe(true);expect(Math.abs(loop.exitD-loop.entryD)).toBeLessThanOrEqual(2);
 expect(stage.track.groundAt(194,-2.6).y-stage.track.heightAt(194)).toBeCloseTo(0);
 const B={R:loop.round};loop.onRoundLeave(true,B);
 expect(stage.track.project(B.R.back.x,B.R.back.z).s).toBeCloseTo(176,1);
 loop.onRoundLeave(false,B);expect(stage.track.project(B.R.back.x,B.R.back.z).s).toBeCloseTo(170,1);
});
test('crystal lighting expires but every hidden stepping stone remains solid',()=>{
 const {stage}=build('cave');const crystals=stage.entities.filter(e=>e instanceof EchoCrystal);
 expect(crystals.map(e=>e.duration)).toEqual([5,3,3]);
 for(const c of crystals){
  expect(c.lights.every(e=>!e.obj.visible&&e.solid.enabled)).toBe(true);
  c.onBite();expect(c.lights.every(e=>e.obj.visible&&e.solid.enabled)).toBe(true);
  c.update(c.duration-.01);expect(c.lights.every(e=>e.obj.visible)).toBe(true);
  c.update(.02);expect(c.lights.every(e=>!e.obj.visible&&e.solid.enabled)).toBe(true);
  c.onBite();c.onRespawn();expect(c.lights.every(e=>!e.obj.visible&&e.solid.enabled)).toBe(true);
 }
});
test('Hollow launch starts below the literal return floor',()=>{
 const {stage}=build('cave');
 expect(stage.track.groundAt(283,-2.4)).not.toBeNull();
 const p=stage.track.toWorld(283,-2.4,-4.5);
 const roof=stage.track.groundAt(283,-2.4);
 expect(roof.y-p.y).toBeCloseTo(4.5);
});
const {moveBody}=await import('../src/world/physics.js');
const {TUNING}=await import('../src/config/movement.js');
const {Player}=await import('../src/player/player.js');
const {ZippedBackpack,Backpack}=await import('../src/entities/breakables.js');
const {input}=await import('../src/core/input.js');
function bodyAt(stage,d,u,y) {
 const pos=stage.track.toWorld(d,u,y),vel=new THREE.Vector3();
 return {pos,vel,hw:.3,hd:.3,h:1.3,grounded:false,ground:null,s:d,u};
}
function fly(stage,body,{speed=8,seconds=1.5}={}) {
 const trace=[];
 for(let t=0;t<seconds;t+=1/240){
  const f=stage.track.tangent(body.s,new THREE.Vector3());body.vel.x=f.x*speed;body.vel.z=f.z*speed;
  body.vel.y-=TUNING.GRAVITY*(body.vel.y<0?TUNING.FALL_MULT:1)/240;
  moveBody(stage.world,body,1/240);trace.push({s:body.s,u:body.u,y:body.pos.y-stage.track.heightAt(body.s),grounded:body.grounded});
 }
 return trace;
}
test('actual World demonstrates the literal Hollow launch reaches the return surface without an air jump',()=>{
 const {stage}=build('cave'),body=bodyAt(stage,283,-2.4,-3.7);
 body.vel.y=17; // no held-jump multiplier; unchanged mushroom power
 const trace=fly(stage,body);
 expect(trace.some(p=>p.s>285&&p.grounded&&p.y>=-.01)).toBe(true);
});
test('a single actual Player ride collision opens the new living-room Zipped Backpack',()=>{
 const {stage,game}=build('ride'),pack=stage.entities.filter(e=>e instanceof ZippedBackpack).find(e=>Math.abs(stage.track.project(e.pos.x,e.pos.z).s-168)<.2);
 game.fx={burst:vi.fn(),puff:vi.fn()};game.tickets.spawnFlying=vi.fn();
 const p=Object.create(Player.prototype);Object.assign(p,{game,pos:pack.pos.clone(),body:{h:1.3},mode:'normal',ride:{},bitten:new Set(),biteT:-1,vel:new THREE.Vector3(),facing:stage.track.yaw(168)});
 Player.prototype._interact.call(p,{entities:[pack]});
 expect(pack.broken).toBe(true);expect(pack.solid.enabled).toBe(false);expect(game.tickets.spawnFlying).toHaveBeenCalledWith(pack.pos.x,pack.pos.y+.8,pack.pos.z,8);
});
test('actual extra payers beyond each fixed cap are rejected rather than changing policy',()=>{
 for(const id of ['ride','cave']){
  const {stage,tickets}=build(id);stage.add(new Backpack(stage,0,0,0,{tickets:400}));
  expect(()=>checkTicketBudget(id,measureTicketBudget(stage,tickets))).toThrow(/exceeds fixed cap/);
 }
});
test('actual base bite reaches the literal Hollow Hidden before the exit mushroom',()=>{
 const {stage,game}=build('cave');const hidden=stage.entities.find(e=>e.constructor.name==='HiddenBone');
 const collect=vi.spyOn(hidden,'collect').mockImplementation(()=>{});
 const p=Object.create(Player.prototype);Object.assign(p,{game,pos:stage.track.toWorld(282.5,-2.4,-4.5),body:{h:1.3},mode:'normal',bitten:new Set(),biteT:.2,vel:new THREE.Vector3(),facing:stage.track.yaw(282.5)});
 Player.prototype._interact.call(p,{entities:[hidden]});expect(collect).toHaveBeenCalledOnce();
});
test('Sofa falling onto the lower main floor soft-returns, and death permits a rolled-back haul retry',()=>{
 const {stage,game}=build('ride'),loop=stage.entities.find(e=>e instanceof SofaLoop);
 game.session.bonusRound={tray:loop};game.session._leaveBonusRound=vi.fn();
 game.player.body.s=190;game.player.pos.copy(stage.track.toWorld(190,-.8,.6));
 loop.update();expect(game.session._leaveBonusRound).toHaveBeenCalledWith(false);
 loop.used=true;loop.onRespawn();expect(loop.used).toBe(false);
});
const {save}=await import('../src/core/save.js');
function rider(f,d,u=0,y) {
 const {game,stage}=f;save.load();save.data.godMode=false;
 game.fx=new Proxy({}, {get:()=>()=>{}});game.ui.setConed=()=>{};
 game.session.secretWarp=()=>false;game.onFlop=()=>{};
 const p=new Player(game);game.player=p;p._animate=()=>{};p._updateShadow=()=>{};
 p.spawnAt(stage.track.toWorld(d,u,y??(stage.track.groundAt(d,u).y-stage.track.heightAt(d))),stage.track.yaw(d));
 p.ride={speed:10.5,speedK:1,mesh:new THREE.Group()};
 const dir=stage.track.tangent(d,new THREE.Vector3());p.vel.copy(dir).multiplyScalar(10.5);
 p.body.grounded=true;p.body.ground={enabled:true,delta:{x:0,y:0,z:0},kind:'static'};
 return p;
}
function runRider(f,p,seconds,control) {
 let t=0;const trace=[];
 const pressed=vi.spyOn(input,'pressed'),held=vi.spyOn(input,'held');
 try {
  for(;t<seconds;t+=1/120) {
   const c=control(t,p)||{};input.state.x=c.steer??0;input.state.y=0;
   pressed.mockImplementation(a=>a==='jump'&&!!c.jump);held.mockImplementation(a=>a==='jump'&&!!c.hold);
   p.update(1/120,f.stage,{right:f.stage.track.right(p.body.s,new THREE.Vector3()),forward:f.stage.track.tangent(p.body.s,new THREE.Vector3())});
   trace.push({s:p.body.s,u:p.body.u,y:p.pos.y-f.stage.track.heightAt(p.body.s),dead:p.dead,grounded:p.grounded});
   if(p.dead)break;
  }
 } finally {pressed.mockRestore();held.mockRestore();input.state.x=0;input.state.y=0;}
 return trace;
}
test('actual basic ride hop clears the Dog-Door Leap with over one metre of distance reserve',()=>{
 const f=build('ride');
 // Stress the real collision route with the far floor moved one metre away.
 f.stage.track.spans.find(sp=>sp.d0===441&&sp.d1===447).d0=442;
 const p=rider(f,433.6,0,2.024);
 const trace=runRider(f,p,1.2,t=>({jump:t===0,hold:true}));
 expect(trace.some(x=>x.s>442&&x.grounded&&!x.dead)).toBe(true);
 expect(trace.every(x=>!x.dead)).toBe(true);
});
test('Sofa permanent entry ramp is driveable with unchanged Player physics',()=>{
 const f=build('ride'),p=rider(f,170,-2.6);
 const trace=runRider(f,p,.58,()=>({}));
 expect(trace.some(x=>x.s>=175&&x.y>=2.59)).toBe(true);
 expect(trace.every(x=>!x.dead)).toBe(true);
});
const {Session}=await import('../src/game/session.js');
for(const kept of [false,true]) test(`actual Sofa Session ${kept?'keeps':'rolls back'} its dog, haul and returns to the correct leg`,async()=>{
 const f=build('ride'),p=rider(f,170,-2.6),{game,stage,tickets}=f;
 game.ui={fade:async()=>{},banner:()=>{},setHud:()=>{},setConed:()=>{}};
 game.camera.snap=()=>{};game.mask={snapTo:()=>{}};
 const session=new Session(game,'ride');game.session=session;session.stage=stage;session.tickets=tickets;
 const loop=stage.entities.find(e=>e instanceof SofaLoop),dog=stage.entities.find(e=>e.dogId==='ride:dalmatian-a');
 const pack=stage.entities.find(e=>e instanceof Backpack&&Math.abs(stage.track.project(e.pos.x,e.pos.z).s-186)<.1);
 await session.enterBonusRound(loop);const seed=session.runSeed;
 pack.onSlide(p);dog.free();session.addTickets(5);expect(dog.freed).toBe(true);
 await session._leaveBonusRound(kept);
 expect(p.ride.speed).toBe(10.5);expect(session.runSeed).toBe(seed);
 expect(p.body.s).toBeCloseTo(kept?176:170,1);
 expect(pack.broken).toBe(kept);expect(dog.freed).toBe(kept);
 expect(session.freedIds.has(dog.dogId)).toBe(kept);
 expect(session.fieldRaw).toBe(kept?5:0);expect(session.bonusRound).toBeNull();
});
test('one ordinary cut ride hop rams both staggered Toy Box backpacks and lands',()=>{
 const f=build('ride'),p=rider(f,284.4,-1.2,1.53),tr=f.stage.track;
 const packs=f.stage.entities.filter(e=>e instanceof Backpack&&e.pos.y-tr.heightAt(tr.project(e.pos.x,e.pos.z).s)>2&&Math.abs(tr.project(e.pos.x,e.pos.z).s-287)<3);
 expect(packs).toHaveLength(2);f.game.tickets.spawnFlying=vi.fn();
 const first=packs.find(e=>tr.project(e.pos.x,e.pos.z).s<287);
 const trace=runRider(f,p,1.25,(t,p)=>({jump:t===0,hold:t<.075,steer:first.broken&&p.body.u<1.2?1:0}));
 expect(packs.every(e=>e.broken)).toBe(true);
 expect(trace.some(x=>x.s>290&&x.grounded&&!x.dead)).toBe(true);
});
test('one Sofa lap reaches both Golden packs, its dog and the raised Hidden using base ride controls',()=>{
 const f=build('ride'),p=rider(f,175,-2.6,2.6),tr=f.stage.track;
 f.game.session.rescueDog=vi.fn();f.game.tickets.spawnFlying=vi.fn();
 const hidden=f.stage.entities.find(e=>e.constructor.name==='HiddenBone');const collected=vi.spyOn(hidden,'collect').mockImplementation(()=>{});
 const dog=f.stage.entities.find(e=>e.dogId==='ride:dalmatian-a');
 const packs=f.stage.entities.filter(e=>e instanceof Backpack&&[186,198].some(d=>Math.abs(tr.project(e.pos.x,e.pos.z).s-d)<.1));
 let jumped=false;
 const trace=runRider(f,p,3.1,(t,p)=>{
  const s=p.body.s,target=(s<183.2||(s>=186.5&&s<191.4))?-3.85:-2.6;
  const r=tr.right(s,new THREE.Vector3()),lat=p.vel.dot(r),error=target-p.body.u-lat*.055;
  const jump=!jumped&&s>=198.6;if(jump)jumped=true;
  return {steer:Math.abs(error)>.06?Math.sign(error):0,jump,hold:jumped};
 });
 expect(packs.every(e=>e.broken)).toBe(true);expect(dog.freed).toBe(true);expect(collected).toHaveBeenCalled();
 expect(trace.every(x=>!x.dead)).toBe(true);
});

test('real Player bite and Stage visibility lifecycle preserve crystal timing and solid unlit stones',()=>{
 const {stage,game}=build('cave'),c=stage.entities.find(e=>e instanceof EchoCrystal);
 const p=Object.create(Player.prototype);Object.assign(p,{game,pos:stage.track.toWorld(320.5,0,0),body:{h:1.3},mode:'normal',bitten:new Set(),biteT:.2,vel:new THREE.Vector3(),facing:stage.track.yaw(320.5)});
 const context=Object.create(stage);context.entities=[...c.lights,c];context._ambient=()=>{};context._emit=()=>{};
 Stage.prototype.update.call(context,.01,p);expect(c.lights.every(e=>!e.obj.visible&&e.solid.enabled)).toBe(true);
 Player.prototype._interact.call(p,{entities:[c]});expect(c.remaining).toBe(5);
 Stage.prototype.update.call(context,.1,p);expect(c.lights.every(e=>e.obj.visible&&e.visible&&e.solid.enabled)).toBe(true);
 Stage.prototype.update.call(context,5,p);Stage.prototype.update.call(context,.01,p);
 expect(c.lights.every(e=>!e.obj.visible&&e.visible===false&&e.solid.enabled)).toBe(true);
 c.onBite();const near=p.pos.clone();p.pos.z-=200;
 Stage.prototype.update.call(context,5.1,p);expect(c.remaining).toBe(0);p.pos.copy(near);
 Stage.prototype.update.call(context,.01,p);expect(c.lights.every(e=>!e.obj.visible&&e.solid.enabled)).toBe(true);
 c.onBite();c.onRespawn();Stage.prototype.update.call(context,.01,p);
 expect(c.lights.every(e=>!e.obj.visible&&e.solid.enabled)).toBe(true);
});

test('literal right lunchbox fall misses the Hollow; proposed width catches all three actual World drops',()=>{
 for(const wideHollow of [false,true]) {
  const {stage,measured}=build('cave',true,.001,{wideHollow});
  expect(measured).toEqual(BONUS_BUDGETS_V2.cave);
  for(const [d,u] of [[273,-1.5],[277,1.5],[280.6,-1.2]]) {
   const body=bodyAt(stage,d,u,-2),trace=fly(stage,body,{speed:0,seconds:1.2});
   expect(trace.some(p=>p.grounded&&Math.abs(p.y+4.5)<.12)).toBe(wideHollow||u<0);
   expect(stage.track.groundAt(d,u)).toBeNull(); // Lower safety floor never masks main geometry.
  }
 }
});
const {simJump}=await import('../src/levels/gauntletMath.js');
function worldJump(stage,from,to,{velocity=TUNING.JUMP,cut=false,margin=1}={}) {
 const start=from.clone(),end=to.clone(),trace=simJump({velocity,cut,dy:end.y-start.y});
 if(!trace)return {ok:false,reason:'height'};
 const delta=end.clone().sub(start).setY(0),distance=delta.length();
 if(distance+margin>trace.air*TUNING.RUN)return {ok:false,reason:'distance',distance,reach:trace.air*TUNING.RUN};
 const body={pos:start,vel:new THREE.Vector3(),hw:.3,hd:.3,h:1.3,grounded:false},speed=delta.multiplyScalar(1/trace.air);
 let head=false;body.onHead=()=>{head=true;};
 for(const sample of trace.samples.slice(1)) {
  body.vel.set(speed.x,sample.vy,speed.z);moveBody(stage.world,body,1/60);
  if(head)return {ok:false,reason:'head'};
  if(body.grounded&&sample.vy<0) return {ok:body.pos.clone().sub(end).setY(0).length()<.9&&Math.abs(body.pos.y-end.y)<.12,reason:'landing',pos:body.pos.toArray(),distance,reach:trace.air*TUNING.RUN};
 }
 return {ok:false,reason:'no landing'};
}
test('full Mushroom Cavern chain lands on actual curved receivers with one metre movement reserve',()=>{
 const {stage,game}=build('cave'),tr=stage.track;game.fx=new Proxy({},{get:()=>()=>{}});
 const point=(d,u,y)=>tr.toWorld(d,u,y);
 const launch=d=>stage.entities.find(e=>e.constructor.name==='BouncePad'&&Math.abs(tr.project(e.pos.x,e.pos.z).s-d)<.1).power*1.15;
 const route=[
  [point(233.4,0,.8),point(237.2,0,4.2),launch(233),true],
  [point(238,0,4.2),point(242.35,-1.25,-.2),TUNING.JUMP,false],
  [point(242.35,-1.25,-.2),point(247.65,1.25,.2),launch(242),true],
  [point(247.65,1.25,.2),point(253.5,-.7,.6),launch(248),true],
  [point(253.5,-.7,.6),point(258,-1,0),launch(254),true],
 ];
 for(const [a,b,velocity,cut]of route){const result=worldJump(stage,a,b,{velocity,cut});expect(result,`${tr.project(a.x,a.z).s}→${tr.project(b.x,b.z).s} ${JSON.stringify(result)}`).toMatchObject({ok:true});}
 const relays=stage.entities.filter(e=>e.constructor.name==='MushroomRelay');expect(relays).toHaveLength(2);
 for(const relay of relays){
  const source=stage.entities.find(e=>e.constructor.name==='BouncePad'&&e.pos.distanceTo(relay.pos)<.01);
  source.onLand({bounce:vi.fn(),forward:new THREE.Vector3(0,0,-1),vel:new THREE.Vector3()});
  expect(relay.light.intensity).toBe(3);relay.update(1.99);expect(relay.light.intensity).toBe(3);
  relay.update(.02);expect(relay.light.intensity).toBe(0);relay.onRespawn();expect(relay.remaining).toBe(0);
 }
});

test('canonical registry metadata matches actual bonus dogs, Hidden placements and detour miss sections',async()=>{
 const {LEVELS}=await import('../src/levels/registry.js');
 const {sectionName}=await import('../src/game/hints.js');
 for(const id of ['ride','cave']) {
  const {stage,tickets}=build(id),def=LEVELS[id];
  expect(measureTicketBudget(stage,tickets)).toEqual(BONUS_BUDGETS_V2[id]);
  const dogs=stage.entities.filter(e=>e.dogId);
  expect(dogs.map(e=>e.dogId).sort()).toEqual(Object.keys(def.dogs).map(key=>`${id}:${key}`).sort());
  for(const dog of dogs){const d=stage.track.project(dog.pos.x,dog.pos.z).s;expect(sectionName(stage.sections,d,dog)).toBe(def.dogs[dog.dogId.slice(id.length+1)]);}
  const hidden=stage.entities.find(e=>e.constructor.name==='HiddenBone'),d=stage.track.project(hidden.pos.x,hidden.pos.z).s;
  expect(sectionName(stage.sections,d,hidden)).toBe(def.hidden.section);
  if(id==='ride') {
   const sofa=stage.entities.filter(e=>e instanceof Backpack&&Math.abs(e.pos.y-stage.track.heightAt(stage.track.project(e.pos.x,e.pos.z).s)-2.6)<.1);
   expect(sofa).toHaveLength(2);expect(sofa.every(e=>e.detour&&sectionName(stage.sections,stage.track.project(e.pos.x,e.pos.z).s,e)==='Sofa Summit')).toBe(true);
   expect(dogs.find(e=>e.dogId==='ride:pug-a').detour).not.toBe(true);
  }
 }
});
function riverPosition(entity,time) {
 if(entity.fixed)return entity.fixed.clone();
 if(entity.constructor.name==='LilyPad')return entity.home.clone().add(new THREE.Vector3(0,Math.sin(time*2)*.04,0));
 return entity.home.clone().addScaledVector(entity.dir,Math.sin(time*entity.speed+entity.phase)*entity.range);
}
function riverJump(f,source,target,time,doubleAt=null,landingOffset=0) {
 const {stage,game}=f,tr=stage.track;
 const rafts=stage.entities.filter(e=>['MovingPlatform','LilyPad'].includes(e.constructor.name)&&tr.project(e.home.x,e.home.z).s>135&&tr.project(e.home.x,e.home.z).s<175);
 const place=t=>{stage.world.beginFrame();for(const e of rafts){e.t=t;e.sink=0;e.update(0);}};
 game.player.body={grounded:false};place(time);
 const edge=(entity,p,sign)=> {
  if(entity.fixed)return p;
  const d=tr.project(p.x,p.z).s,amount=entity.dim?entity.dim.d*.24:.36;
  return p.addScaledVector(tr.tangent(d,new THREE.Vector3()),amount*sign);
 };
 const start=edge(source,riverPosition(source,time),1);
 let end=riverPosition(target,time),trace;
 for(let i=0;i<4;i++) {
  trace=simJump({dy:end.y-start.y,doubleAt});if(!trace)return false;
  end=edge(target,riverPosition(target,time+trace.air),-1);
  if(!target.fixed)end.addScaledVector(tr.right(tr.project(end.x,end.z).s,new THREE.Vector3()),landingOffset);
 }
 const delta=end.clone().sub(start).setY(0),distance=delta.length();
 if(distance+1>trace.air*TUNING.RUN)return false;
 const body={pos:start,vel:new THREE.Vector3(),hw:.3,hd:.3,h:1.3,grounded:false};game.player.body=body;
 let head=false;body.onHead=()=>{head=true;};
 const horizontal=delta.multiplyScalar(1/trace.air);
 for(const sample of trace.samples.slice(1)) {
  place(time+sample.t);body.vel.set(horizontal.x,sample.vy,horizontal.z);moveBody(stage.world,body,1/60);
  if(head||body.pos.y<stage.killYAt(body.pos,body))return false;
  if(body.grounded&&sample.vy<0) {
   const expected=target.fixed?body.ground?.kind==='track':body.ground===target.solid;
   return expected&&body.pos.clone().sub(end).setY(0).length()<1;
  }
 }
 return false;
}
test('River dynamic receivers offer real World landings across endpoint phases with one metre reserve and no wait on sinking lilies',()=>{
 const f=build('cave'),tr=f.stage.track;f.game.fx=new Proxy({},{get:()=>()=>{}});
 const find=(kind,d)=>f.stage.entities.find(e=>e.constructor.name===kind&&Math.abs(tr.project(e.home.x,e.home.z).s-d)<.1);
 const route=[{fixed:tr.toWorld(136.7,0,0)},find('MovingPlatform',141),find('MovingPlatform',149),find('MovingPlatform',155),
 {fixed:tr.toWorld(159.3,1.2,0)},find('LilyPad',164),find('LilyPad',167.5),find('MovingPlatform',171),{fixed:tr.toWorld(175.5,0,0)}];
 for(const phase of [0,Math.PI/2/1.4,Math.PI/1.4,3*Math.PI/2/1.4,Math.PI/2/1.6,Math.PI/1.6,3*Math.PI/2/1.6,Math.PI/2/1.8,Math.PI/1.8,3*Math.PI/2/1.8,8,12]) {
  for(let i=0;i<route.length-1;i++) {
   const source=route[i],target=route[i+1],canWait=source.constructor?.name!=='LilyPad';let ok=false;
   for(let wait=0;wait<=(canWait?10:0)&&!ok;wait+=.1)for(const airJump of [null,.4,.55]) {
    for(const offset of [0,-.5,.5])if(riverJump(f,source,target,phase+wait,airJump,offset)){ok=true;break;}
    if(ok)break;
   }
   expect(ok,`river leg${i} phase${phase}; base jump/double only, wait${canWait}`).toBe(true);
  }
 }
});

test('Sofa loss starts one async transition while its fade is pending',async()=>{
 const f=build('ride'),p=rider(f,170,-2.6),{game,stage,tickets}=f;
 game.ui={fade:async()=>{},banner(){},setHud(){},setConed(){}};game.camera.snap=()=>{};game.mask={snapTo(){}};
 const session=new Session(game,'ride');game.session=session;session.stage=stage;session.tickets=tickets;
 const loop=stage.entities.find(e=>e instanceof SofaLoop);await session.enterBonusRound(loop);
 game.ui.fade=()=>new Promise(()=>{});const leave=vi.spyOn(session,'_leaveBonusRound');
 p.pos.copy(stage.track.toWorld(190,-.8,.6));p.body.s=190;
 for(let i=0;i<5;i++)loop.update();expect(session.busy).toBe(true);expect(leave).toHaveBeenCalledOnce();
});
test('Hollow camera applies only below the path and restores on emergence or checkpoint respawn',async()=>{
 const {GameCamera}=await import('../src/camera/camera.js');
 const {stage,game,info}=build('cave'),tr=stage.track,zone=stage.entities.find(e=>e.constructor.name==='CamZone'&&e.d0===267);
 game.camera=new GameCamera(1100/800);stage.defaultCamera=info.camera;game.camera.setMode('track',info.camera);
 for(const d of [273,277,281]) {
  game.player.pos.copy(tr.toWorld(d,-2.6,0));game.player.body.s=d;zone.update();expect(game.camera.opts).toBe(info.camera);
  game.player.pos.copy(tr.toWorld(d,-2.6,-4.5));zone.update();expect(game.camera.opts).toBe(zone.opts);expect(zone.opts.height).toBe(11);expect(zone.opts.ahead).toBe(2.5);
  game.camera.snap(game.player);game.camera.cam.updateMatrixWorld(true);const ndc=game.player.pos.clone().add(new THREE.Vector3(0,1,0)).project(game.camera.cam);
  expect(Math.abs(ndc.x)).toBeLessThan(.8);expect(Math.abs(ndc.y)).toBeLessThan(.8);
  game.player.pos.copy(tr.toWorld(d,-2.6,0));zone.update();expect(game.camera.opts).toBe(info.camera);
 }
 game.player.pos.copy(tr.toWorld(277,-2.6,-4.5));game.player.body.s=277;zone.update();
 game.session.cp={pos:tr.toWorld(238,0,4.2)};zone.onRespawn();expect(game.camera.opts).toBe(info.camera);
 game.session.cp={pos:tr.toWorld(277,-2.6,-4.5)};zone.onRespawn();expect(game.camera.opts).toBe(zone.opts);
});
