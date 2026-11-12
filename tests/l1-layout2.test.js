import * as THREE from 'three';
import { test,expect,vi,beforeAll } from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
vi.mock('../src/art/assets.js',()=>({Assets:{has:()=>false,model:()=>null,animate:()=>null,aspect:()=>1,tex:()=>new THREE.Texture(),tiled:()=>new THREE.Texture(),url:()=>''}}));
const gradient={addColorStop(){}};const context=new Proxy({measureText:()=>({width:100}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,getImageData:()=>({data:new Uint8ClampedArray(16)})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
HTMLCanvasElement.prototype.getContext=()=>context;HTMLCanvasElement.prototype.toDataURL=()=>'';
const {Stage}=await import('../src/world/stage.js');
const {TicketSystem}=await import('../src/entities/tickets.js');
const {buildLevel1,buildLevel1Layout2}=await import('../src/levels/level1.js');
const {SECTION_TEXT}=await import('../src/story/script.js');
const {ConedDog}=await import('../src/entities/dogs.js');
const {Breakable}=await import('../src/entities/entity.js');
const {Rug,Snacks}=await import('../src/entities/breakables.js');
const {measureTicketBudget}=await import('../src/game/measureTicketBudget.js');
const {ticketBudget,checkTicketBudget}=await import('../src/game/ticketBudget.js');
const {Track,turtle}=await import('../src/world/track.js');
const {Player}=await import('../src/player/player.js');
const {moveBody}=await import('../src/world/physics.js');
const {validatePattern}=await import('../src/levels/gauntletMath.js');
const {gatedCountables,gateReachable}=await import('../src/game/gateRules.js');
const {L1_START,L1_MOVES_CLASSIC,L1_MOVES_EXTENDED,L1_SPLICES,shiftL1,L1_TEMPLE_RAW_PATTERN,L1_TEMPLE_CANDIDATE_PATTERN}=await import('../src/levels/data/l1-layout2.js');
const labels={...SECTION_TEXT,coconutRun:'Coconut Run',sunkenTemple:'Sunken Temple',burrow:'The Burrow',waterfallHollow:'Waterfall Hollow',gateApproach:'Gate Approach'};
vi.spyOn(Stage.prototype,'decor').mockImplementation(()=>{});
function build(layout=2,corrections=true){
 const g={player:{pos:new THREE.Vector3(),body:{s:0,u:0},abilities:{}},ui:{tutorial(){},banner(){}},fx:new Proxy({},{get:()=>()=>{}}),camera:{shake(){}}};
 g.session={level:1,deaths:0,runSeed:42,nextSeq:()=>1,onBreak(){},addTickets(){},cp:{pos:new THREE.Vector3()}};
 const s=new Stage(g,1),t=new TicketSystem(g,s);g.tickets=g.session.tickets=t;g.stage=g.session.stage=s;
 const info=(layout===2?buildLevel1Layout2:buildLevel1)(g,s,t,{layout,labels,corrections});t.finalize();return{g,s,t,info};
}
let raw,candidate,classic;
beforeAll(()=>{raw=build(2,false);candidate=build();classic=build(1);});
// The arena hash was re-pinned for plan B3 (FOV 56, camera offset 13/20, follow 0.15), and again when those
// same values moved to src/levels/arenaCameras.js; nothing else in it changed.
test('retains explicit Classic layout and preserves the Bird arena byte for byte',()=>{
 expect(classic.s.track.length).toBeCloseTo(328.492,2);expect(classic.s.entities.filter(e=>e instanceof ConedDog)).toHaveLength(5);
 const source=fs.readFileSync('src/levels/level1.js','utf8');
 const arena=source.slice(source.indexOf('export function buildBoss1Arena'));
 expect(createHash('sha256').update(arena).digest('hex')).toBe('cf0a19564908a8275470ce56d220e9a9b7f216748b343c2e4326fbd6dcfe7f2d');
 expect(ticketBudget(measureTicketBudget(classic.s,classic.t,7)).wholeMax).toBe(131);
});
test('adds the measured225m track without self intersections and keeps the exact gate/end',()=>{
 const a=new Track(turtle(L1_START,L1_MOVES_CLASSIC)),b=candidate.s.track;
 expect(b.length-a.length).toBeCloseTo(225.28,1);expect(shiftL1(314)).toBe(539);expect(shiftL1(322)).toBe(547);
 for(const [at,x] of L1_SPLICES)expect(shiftL1(at)-shiftL1(at-.001)).toBeCloseTo(x+.001,6);
 for(let s=0;s<b.length;s+=4)for(let d=s+60;d<b.length;d+=4)expect(b.toWorld(s).distanceTo(b.toWorld(d))).toBeGreaterThan(40);
 expect(b.triggers.some(t=>t.d===540)).toBe(true);expect(540-b.project(candidate.info.spawn.x,candidate.info.spawn.z).s).toBeCloseTo(539,2);
});
test('authors all9 stable dogs without move-gated countables or post338 Rugs',()=>{
 const dogs=candidate.s.entities.filter(e=>e instanceof ConedDog);expect(dogs).toHaveLength(9);
 expect(new Set(dogs.map(d=>d.dogId)).size).toBe(9);expect(dogs.every(d=>/^1:(shiba|pug|dalmatian|corgi)-[a-z]$/.test(d.dogId))).toBe(true);
 expect(gatedCountables(candidate.s.entities)).toEqual([]);
 for(const rug of candidate.s.entities.filter(e=>e instanceof Rug))expect(candidate.s.track.project(rug.pos.x,rug.pos.z).s).toBeLessThan(338);
});
test('keeps the Burrow open to the sky and dark only below the unchanged main path',()=>{
 const {s,g}=candidate,tr=s.track;
 for(let d=228.5;d<258;d+=.5){const floor=tr.groundAt(d,-2.5);expect(floor).not.toBeNull();expect(floor.y-tr.heightAt(d)).toBeCloseTo(-4.5,4);}
 const zone=s.entities.find(e=>e.constructor.name==='DarkZone');expect(zone.contains(240,tr.heightAt(240))).toBe(false);expect(zone.contains(240,tr.heightAt(240)-4.5)).toBe(true);
 expect(s.killYAt(tr.toWorld(234,-2.5,-4.5),{s:234})).toBeLessThan(tr.heightAt(234)-4.5);
});
test('keeps raw unfair box actions as a failing fixture and strictly validates the proposed permanent rest',()=>{
 expect(validatePattern(L1_TEMPLE_RAW_PATTERN).some(e=>e.problem.includes('Timed actions'))).toBe(true);
 expect(validatePattern(L1_TEMPLE_CANDIDATE_PATTERN)).toEqual([]);
 expect(candidate.s.l1Extension.gauntletProblems).toEqual([]);expect(raw.s.l1Extension.gauntletProblems.length).toBeGreaterThan(0);
 const a=raw.t.list.filter(t=>{const d=raw.s.track.project(t.x,t.z).s;return d>=519.95 &&d<=530.05;});
 const b=candidate.t.list.filter(t=>{const d=candidate.s.track.project(t.x,t.z).s;return d>=519.95 &&d<=530.05;});expect(a).toHaveLength(6);expect(b).toHaveLength(0);
});
test('proposes a gate timing that distinguishes RUN from Zoomies, unlike the literal3m gate',()=>{
 expect(gateReachable(3,2.2,8)).toBe(true);expect(gateReachable(13,1.2,8)).toBe(false);expect(gateReachable(13,1.2,8*1.55)).toBe(true);
});
test('measures both layouts, includes gated rewards and respects the approved205 cap',()=>{
 const a=measureTicketBudget(raw.s,raw.t,7),b=measureTicketBudget(candidate.s,candidate.t,7);
 fs.writeFileSync('/tmp/nobu-h30-budget.json',JSON.stringify({raw:a,rawTotal:ticketBudget(a),candidate:b,candidateTotal:ticketBudget(b),countable:candidate.s.entities.filter(e=>e instanceof Breakable&&e.countable).length,mysterySupport:[raw,candidate].map(({s})=>{const m=s.entities.find(e=>e.kind==='mystery'&&e.slot===0);const y=s.world.groundBelow(m.pos.x,m.pos.y+.2,m.pos.z,.01);return{entityY:m.pos.y,solidY:y,delta:m.pos.y-y};})}));
 expect(()=>checkTicketBudget(1,b,131)).toThrow(/exceeds fixed cap131|exceeds fixed cap 131/);
 expect(checkTicketBudget(1,b,205)).toMatchObject({wholeMax:203,cap:205});
 expect(a.field-b.field).toBe(6);expect(b.mystery).toBe(2);expect(b.arena).toBe(7);
});

test('clears all five proposed Coconut packs in one forward pass using actual bite handlers and collision',()=>{
 const {g,s}=build(),tr=s.track,items=s.entities.filter(e=>e.kind==='backpack' && tr.project(e.pos.x,e.pos.z).s>=384.9 &&tr.project(e.pos.x,e.pos.z).s<394);
 expect(items).toHaveLength(5);s.entities=items;
 const p={pos:tr.toWorld(382,-3.2,.02),vel:new THREE.Vector3(),body:{h:1.3,hw:.36,hd:.36,grounded:true},mode:'normal',biteT:0,bitten:new Set(),forward:new THREE.Vector3(),biteRange:.95,invincible:false};
 g.player=p;Object.assign(p.body,{pos:p.pos,vel:p.vel});let previousS=382,cycle=-1,index=0;
 for(let frame=0;frame<600 && items.some(e=>!e.broken);frame++){
  const at=tr.project(p.pos.x,p.pos.z),now=frame/60,nextCycle=Math.floor(now/.42);if(nextCycle!==cycle){cycle=nextCycle;p.bitten.clear();}
  p.biteT=now-cycle*.42<.34?(now-cycle*.42)/.34:-1;
  const row=s.l1Extension.chaseItems.filter(p=>p.kind==='pack')[index];if(index<4 &&at.s>=row.d+.2)index++;
  const target=tr.toWorld(row.d+1,row.x,0),delta=target.sub(p.pos).setY(0).normalize();p.forward.copy(delta);p.vel.x=delta.x*8;p.vel.z=delta.z*8;p.vel.y=Math.max(-28,p.vel.y-36/60);
  Player.prototype._interact.call(p,s);moveBody(s.world,p.body,1/60);Player.prototype._interact.call(p,s);
  expect(p.body.s).toBeGreaterThanOrEqual(previousS-.02);previousS=p.body.s;
 }
 expect(items.every(e=>e.broken)).toBe(true);
});
test('does not let the nearby exit mushroom bypass the Burrow Hidden Bone gate',()=>{
 const {g,s}=build(),bone=s.entities.find(e=>e.move==='dust'),wall=s.entities.find(e=>e.kind==='dustwall');
 g.session.collectHiddenBone=vi.fn(()=>true);bone.collect();expect(g.session.collectHiddenBone).not.toHaveBeenCalled();wall.broken=true;bone.collect();expect(g.session.collectHiddenBone).toHaveBeenCalledOnce();
});

test('every proposed new checkpoint stands on actual permanent ground with at most70m new section gaps',()=>{
 const {s}=candidate,tr=s.track,checkpoints=s.entities.filter(e=>e instanceof Snacks);
 for(const e of checkpoints){const d=tr.project(e.pos.x,e.pos.z).s;if(d<248)continue;const ground=tr.groundAt(d,tr.project(e.pos.x,e.pos.z).u);const slabs=s.world.query(e.pos.x-.01,-100,e.pos.z-.01,e.pos.x+.01,e.pos.y+.1,e.pos.z+.01).filter(b=>b.kind==='static' && b.max.y<=e.pos.y+.1);const y=Math.max(ground?.y??-Infinity,...slabs.map(b=>b.max.y));expect(Number.isFinite(y),JSON.stringify({d,kind:e.constructor.name})).toBe(true);expect(e.pos.y-y).toBeCloseTo(0,1);}
 const ds=checkpoints.filter(e=>e.kind==='snacks').map(e=>tr.project(e.pos.x,e.pos.z).s).filter(d=>d>184).sort((a,b)=>a-b);
 for(let i=1;i<ds.length;i++)expect(ds[i]-ds[i-1]).toBeLessThanOrEqual(70.1);
});

test('actual Coconut controller warns, uses absolute6.4/9/2 speeds, and restores camera only at416',()=>{
 const {g,s}=build(),chase=s.l1CoconutChase,tr=s.track;
 g.camera={opts:null,chaseOwner:null,setMode:vi.fn(function(mode,opts){this.mode=mode;this.opts=opts;}),shake(){}};
 s.defaultCamera={mode:'track',track:tr};g.session.cp.pos.copy(tr.toWorld(360));
 g.player.body.s=360;chase.update(0);expect(g.camera.setMode).not.toHaveBeenCalled();
 g.player.body.s=361;chase.update(0);expect(g.camera.setMode).toHaveBeenLastCalledWith('trackFront',chase.cameraOpts,1.2);
 g.player.body.s=363;chase.update(0);expect(chase.state).toBe('wait');expect(chase.s).toBeCloseTo(347,1);expect(chase.waitT).toBe(1.6);
 expect(chase.rig.ball.geometry.parameters.radius*chase.rig.ball.scale.x).toBe(2.25);
 expect(chase.speed0).toBe(6.4);expect(chase.catchUpSpeed).toBe(9);expect(chase.catchAt).toBe(2);
 g.player.body.s=414;chase.update(0);expect(chase.state).toBe('done');expect(g.camera.mode).toBe('trackFront');
 g.player.body.s=416;chase.update(0);expect(g.camera.mode).toBe('track');expect(g.camera.chaseOwner).toBeNull();
 // Respawn uses the checkpoint, never the stale death position at the gate.
 g.player.body.s=540;g.session.cp.pos.copy(tr.toWorld(393));chase.onRespawn();expect(chase.state).toBe('wait');expect(chase.s).toBeCloseTo(380,1);expect(chase.waitT).toBe(1.6);
 g.session.cp.pos.copy(tr.toWorld(360));chase.onRespawn();expect(chase.state).toBe('idle');expect(g.camera.mode).toBe('track');expect(chase.visible).toBe(false);
});

test('actual Hollow round keeps successful haul and rolls back real dog/packs on a fall with the correct returns',async()=>{
 const {Session}=await import('../src/game/session.js');
 const {g,s,t}=build(),session=new Session(g,1);g.session=session;session.stage=s;session.tickets=t;
 Object.assign(g.ui,{fade:async()=>{},chain(){},setHud(){}});g.camera.snap=()=>{};g.mask={snapTo(){}};
 g.player.spawnAt=(pos)=>g.player.pos.copy(pos);session._pushHud=()=>{};
 const {detour,lost,kept}=s.l1Hollow,dog=s.entities.find(e=>e.dogId==='1:shiba-c');
 const pack=s.entities.find(e=>e.kind==='backpack'&&!e.detour);const old=pack.broken;
 await session.enterBonusRound(detour);expect(g.player.pos.equals(detour.round.start)).toBe(true);
 dog.free();pack.break();session.freedIds.add(dog.dogId);session.snack.raw=3;
 expect(dog.freed).toBe(true);expect(pack.broken).toBe(true);
 await session._leaveBonusRound(false);
 expect(g.player.pos.equals(lost)).toBe(true);expect(dog.freed).toBe(false);expect(pack.broken).toBe(old);expect(session.freedIds.has(dog.dogId)).toBe(false);expect(session.snack.raw).toBe(0);expect(detour.used).toBeFalsy();
 await session.enterBonusRound(detour);dog.free();session.freedIds.add(dog.dogId);
 await session._leaveBonusRound(true);
 expect(g.player.pos.equals(kept)).toBe(true);expect(dog.freed).toBe(true);expect(detour.used).toBe(true);
 for(const pos of [lost,kept,detour.round.start])expect(s.world.groundBelow(pos.x,pos.y+.1,pos.z,.2)).toBeGreaterThan(-Infinity);
});

async function realJump(stage,from,to,options={}){
 const {simJump}=await import('../src/levels/gauntletMath.js');
 const start=stage.track.toWorld(from[2],from[0],from[1]),end=stage.track.toWorld(to[2],to[0],to[1]),trace=simJump({...options,dy:end.y-start.y});
 if(!trace||end.clone().sub(start).setY(0).length()/trace.air>8)return false;
 const body={pos:start.clone(),vel:new THREE.Vector3(),hw:.36,hd:.36,h:1.3,grounded:false},speed=end.clone().sub(start).setY(0).multiplyScalar(1/trace.air);
 let head=false;body.onHead=()=>{head=true;};
 for(const sample of trace.samples.slice(1)){
  body.vel.set(speed.x,sample.vy,speed.z);moveBody(stage.world,body,1/60);
  if(head)return false;
  if(body.grounded&&sample.vy<0){const ok=body.pos.distanceTo(end)<1.6&&Math.abs(body.pos.y-end.y)<.16;return options.returnLanding?(ok?{pos:body.pos.clone(),t:sample.t}:null):ok;}
 }
 return false;
}
test('lands the actual curved Temple receivers, Canopy crumble chain and Burrow exit without intermediate contact',async()=>{
 const {s}=build(),tr=s.track;
 for(const b of s.timedBoxes)if(b.entity.solid)b.entity.solid.enabled=true;
 for(const e of s.entities)if(e.constructor.name==='FlipPlank'&&e.solid)e.solid.enabled=true;
 const pattern=s.timedPatterns.find(p=>p.id==='l1-temple-candidate');
 for(const step of pattern.route){
  const a=pattern.pieces[step.from],b=pattern.pieces[step.to];
  if(a.kind==='pack')s.entities.find(e=>e.kind==='backpack'&&Math.abs(tr.project(e.pos.x,e.pos.z).s-a.d)<.05).break();
  const surface=p=>[p.x,p.y-tr.heightAt(p.d)+(['blink','lunch'].includes(p.kind)?.98:p.kind==='pack'?1:0),p.d+(p.kind==='floorStart'?.5:0)];
  expect(await realJump(s,surface(a),surface(b),step.move==='bounceHeld'?{velocity:10.5*1.15}:{}),`Temple ${a.d}→${b.d}`).toBe(true);
 }
 // Moon's small permanent launch pad raises only the branch centre; retain
 // direct landings on the unchanged2.2m rim and the new2.70m centre.
 for(const [a,b,options] of [[ [1,1.8,292],[-.6,1.8,295] ],[[-.6,1.8,295],[1.1,2.2,298.5],{doubleAt:.45}],[[-.6,1.8,295],[-.6,2.7,298.5]],[[.6,1.6,458.8],[.6,.6,461]],[[.6,.6,461],[.6,.6,464.5]],[[.6,.6,464.5],[.6,.6,468]],[[.6,.6,468],[.6,.6,471.5]],[[.6,.6,471.5],[.6,0,474.5]]]){
  expect(await realJump(s,a,b,options),`${a.join(",")}→${b.join(",")}`).toBe(true);
 }
 // Hold vertical over the trench until feet clear its side wall, then steer right.
 const {simJump}=await import('../src/levels/gauntletMath.js');
 const start=tr.toWorld(251,-2.5,-3.7),end=tr.toWorld(255,1.2,0),trace=simJump({velocity:17*1.15,cut:true,doubleAt:.45,dy:end.y-start.y});
 const body={pos:start.clone(),vel:new THREE.Vector3(),hw:.36,hd:.36,h:1.3,grounded:false};let landed=false;
 for(const sample of trace.samples.slice(1)){
  const v=end.clone().sub(body.pos).setY(0);if(v.length()>8/60)v.setLength(8);else v.multiplyScalar(60);
  if(body.pos.y<end.y+.1&&sample.vy>0)v.set(0,0,0);
  body.vel.set(v.x,sample.vy,v.z);moveBody(s.world,body,1/60);
  if(body.grounded&&sample.vy<0){landed=body.pos.distanceTo(end)<1.6;break;}
 }
 if(!landed)fs.writeFileSync('/tmp/h30-mushroom-fail.json',JSON.stringify({start:start.toArray(),end:end.toArray(),body:{pos:body.pos.toArray(),grounded:body.grounded,ground:body.ground?.kind},trace:trace.samples,solids:s.world.all.filter(a=>body.ground===a).map(a=>({min:a.min,max:a.max,ref:a.ref?.constructor.name}))}));
 expect(landed,'mushroom exit clears the trench wall before steering onto the right floor').toBe(true);
});

test('Canopy squirrel waits above the exit, drops on the authored trigger, and rearms on retry',()=>{
 const {g,s}=build(),e=s.entities.find(e=>e.canopyAmbush);
 expect(e).toBeDefined();g.player.body.s=307;e.update(.1);expect(e.visible).toBe(false);expect(e.interactive).toBe(false);
 g.player.body.s=308;e.update(.1);expect(e.visible).toBe(true);expect(e.canopyAmbush.mode).toBe('fall');
 for(let i=0;i<60;i++)e.update(1/60);expect(e.canopyAmbush.mode).toBe('active');expect(e.interactive).toBe(true);
 e.reset();e.onRespawn();expect(e.visible).toBe(false);expect(e.interactive).toBe(false);expect(e.pos.y-e.home.y).toBe(5);
});

test('Hollow return can walk laterally to every skipped payer, activate altar stairs and reach the upper dog and Zipped',async()=>{
 const {validateDetours}=await import('../src/levels/environmentKit.js');
 const {g,s}=build(),tr=s.track;expect(validateDetours(s)).toBe(true);
 const start=s.l1Hollow.kept,body={pos:start.clone(),vel:new THREE.Vector3(),hw:.36,hd:.36,h:1.3,grounded:false};
 // A reversible route down the left of the altar avoids the Cat and pack stack.
 const goals=[[-1,497],[-1.8,497],[-1,502],[3.6,502],[3.6,500],[3.6,502],[.2,502.7]];
 for(const [u,d]of goals){const target=tr.toWorld(d,u,0);let arrived=false;
  for(let i=0;i<180;i++){const delta=target.clone().sub(body.pos).setY(0);if(delta.length()<.18){arrived=true;break;}delta.setLength(Math.min(8,delta.length()*60));body.vel.set(delta.x,Math.max(-28,body.vel.y-36/60),delta.z);moveBody(s.world,body,1/60);}
  expect(arrived,`return route to u${u},d${d}`).toBe(true);expect(body.grounded).toBe(true);
 }
 // The upper altar route is supplied by a guaranteed first-visit Bone Switch.
 const boneSwitch=s.entities.find(e=>e.constructor.name==='BoneSwitch'&&tr.project(e.pos.x,e.pos.z).s>490);
 expect(boneSwitch).toBeDefined();vi.useFakeTimers();boneSwitch.press(g.player);await vi.runAllTimersAsync();vi.useRealTimers();
 for(const [a,b]of [[[-2.8,0,497],[-1.6,1.4,500]],[[-1.6,1.4,500],[.6,2.8,502.5]],[[.6,2.8,502.5],[3.4,4.2,505.5]]])expect(await realJump(s,a,b,a[2]===502.5?{doubleAt:.25}:{}),`altar ${a[2]}→${b[2]}`).toBe(true);
 const dog=s.entities.find(e=>e.dogId==='1:corgi-b'),zip=s.entities.find(e=>e.kind==='zipped'&&tr.project(e.pos.x,e.pos.z).s>500);
 for(const target of [dog,zip])expect(s.world.groundBelow(target.pos.x,target.pos.y+.1,target.pos.z,.15)).toBeCloseTo(target.pos.y,1);
});

 test('Hollow success then death before the next checkpoint restores rewards and permits reentry',async()=>{
 const {Session}=await import('../src/game/session.js');const{g,s,t}=build(),session=new Session(g,1);g.session=session;session.stage=s;session.tickets=t;
 Object.assign(g.ui,{fade:async()=>{},chain(){},setHud(){}});g.camera={snap(){},shake(){},setMode(){}};g.mask={snapTo(){}};g.player.spawnAt=pos=>g.player.pos.copy(pos);session._pushHud=()=>{};session.setMask=()=>{};session.projectiles={clear(){}};
 session.checkpoint(s.track.toWorld(457));const H=s.l1Hollow,dog=s.entities.find(e=>e.dogId==='1:shiba-c');
 await session.enterBonusRound(H.detour);dog.free();session.freedIds.add(dog.dogId);await session._leaveBonusRound(true);expect(H.detour.used).toBe(true);
 session.respawn();expect(dog.freed).toBe(false);expect(H.detour.used).toBe(false);expect(session.freedIds.has(dog.dogId)).toBe(false);
 await H.detour.travel();expect(session.bonusRound?.tray).toBe(H.detour);expect(g.player.pos.equals(H.detour.round.start)).toBe(true);
 });

test('Burrow walls stand4.5m above its floor and the opened old pocket remains a real entrance',()=>{
 const{s}=build(),tr=s.track;
 const walls=s.entities.filter(e=>e.constructor.name==='StaticPlatform'&&Math.abs(e.solid.max.y-e.solid.min.y-4.5)<.001);
 expect(walls).toHaveLength(60);
 for(const wall of walls){const q=tr.project(wall.pos.x,wall.pos.z);expect(wall.solid.max.y-tr.heightAt(q.s)).toBeCloseTo(0,1);expect(wall.solid.max.y-wall.solid.min.y).toBeCloseTo(4.5,6);}
 const cracked=s.entities.find(e=>e.constructor.name==='CrackedFloor');cracked.solid.enabled=false;
 const body={pos:tr.toWorld(227,-3.4,.01),vel:new THREE.Vector3(),hw:.36,hd:.36,h:1.3,grounded:false};
 for(let i=0;i<120;i++){body.vel.y=Math.max(-28,body.vel.y-36/60);moveBody(s.world,body,1/60);if(body.grounded)break;}
 expect(body.grounded).toBe(true);expect(body.pos.y-tr.heightAt(227)).toBeCloseTo(-4.5,1);
 const target=tr.toWorld(230,-2.5,-4.5);
 for(let i=0;i<90;i++){const delta=target.clone().sub(body.pos).setY(0);if(delta.length()<.1)break;delta.setLength(Math.min(6,delta.length()*60));body.vel.set(delta.x,-1,delta.z);moveBody(s.world,body,1/60);}
 if(body.pos.distanceTo(target)>=.2)fs.writeFileSync('/tmp/h30-burrow-walk.json',JSON.stringify({target:target.toArray(),pos:body.pos.toArray(),q:tr.project(body.pos.x,body.pos.z),ground:body.ground?.ref?.constructor.name,bodyS:body.s,u:body.u}));
 expect(body.pos.distanceTo(target)).toBeLessThan(.2);
});

test('literal6m diagonal wall AABBs block the trench while the same1m-tessellated corridor permits walking',()=>{
 const walk=({s})=>{const tr=s.track,target=tr.toWorld(230,-2.5,-4.5),b={pos:tr.toWorld(228.3,-2.5,-4.5),vel:new THREE.Vector3(),hw:.36,hd:.36,h:1.3,grounded:true};
  for(let i=0;i<90;i++){const delta=target.clone().sub(b.pos).setY(0);if(delta.length()<.1)break;delta.setLength(Math.min(6,delta.length()*60));b.vel.set(delta.x,-1,delta.z);moveBody(s.world,b,1/60);}return b.pos.distanceTo(target);
 };
 expect(walk(raw)).toBeGreaterThan(.4);expect(walk(candidate)).toBeLessThan(.2);
});

test('canonical L1 follows the selected trial layout and defaults to approved corrections',async()=>{
 const {trialLayout}=await import('../src/config/trials.js');const{g}=build(1),stage=new Stage(g,1),tickets=new TicketSystem(g,stage);g.stage=stage;g.tickets=tickets;
 buildLevel1(g,stage,tickets);const layout=trialLayout(1);expect(stage.entities.filter(e=>e instanceof ConedDog)).toHaveLength(layout===2?9:5);
 if(layout===2){expect(stage.l1Extension.corrections).toBe(true);expect(stage.l1Extension.gauntletProblems).toEqual([]);}
});

test('Burrow return can recover skipped main-road Golden targets across the old gap in either direction',async()=>{
 const{s}=build();
 expect(await realJump(s,[1.2,0,247.2],[1.2,0,239],{doubleAt:.45}),'back to Sphere/Cat/Rug on the old hill using the base double jump').toBe(true);
 expect(await realJump(s,[1.2,0,239],[1.2,0,247.2],{doubleAt:.45}),'forward return to Canopy after recovering skipped targets').toBe(true);
});

test('activated L1 metadata, approved cap and public version2 trial match the real builder',async()=>{
 const {LEVELS}=await import('../src/levels/registry.js'),{trialLayout,trialVariant,canUploadTrial,HUB_LAYOUT,TRIAL_TARGETS}=await import('../src/config/trials.js');
 const{sectionName}=await import('../src/game/hints.js');const{g,s}=candidate,def=LEVELS[1];
 expect(trialLayout(1)).toBe(2);expect(trialVariant(1)).toBe('1v2');expect(HUB_LAYOUT[1]).toBe(2);expect(canUploadTrial('1v2')).toBe(true);expect(TRIAL_TARGETS['1v2']).toEqual([94,120,158,86]);
 expect(def.build).toBe(buildLevel1);expect(def.hidden).toEqual({section:SECTION_TEXT.burrow,move:'dust'});
 for(const dog of s.entities.filter(e=>e instanceof ConedDog)){const d=s.track.project(dog.pos.x,dog.pos.z).s;expect(sectionName(def.sections,d,dog)).toBe(def.dogs[dog.dogId.slice(2)]);}
 expect(checkTicketBudget(1,measureTicketBudget(s,candidate.t,7))).toMatchObject({wholeMax:203,cap:205});
});
test('actual layout2 activation archives Classic time while retaining earned Golden and old five dog identities',async()=>{
 const {save,SAVE_KEY}=await import('../src/core/save.js');const firstFive=['shiba-a','pug-a','dalmatian-a','shiba-b','corgi-a'];
 localStorage.setItem(SAVE_KEY,JSON.stringify({v:3,bones:{1:true},boneBoard:{1:{golden:true}},bestDogs:{1:5},dogsFreed:Object.fromEntries(firstFive.map(id=>['1:'+id,true])),trials:{1:{ms:52000,best:52,layout:1}}}));save.load();
 expect(save.data.trials[1]).toBeUndefined();expect(save.data.trialsClassic[1]).toMatchObject({ms:52000,layout:1});expect(save.boneOf(1)).toBe(true);expect(save.bestDogsOf(1)).toBe(5);expect(Object.keys(save.data.dogsFreed).sort()).toEqual(firstFive.map(id=>'1:'+id).sort());
 save.write();save.load();expect(save.data.trialsClassic[1].ms).toBe(52000);expect(save.data.trials[1]).toBeUndefined();
});

test('both raised L1 Mystery slots have permanent optional support and an actual first-visit Cat escape',async()=>{
 const {rollMystery}=await import('../src/game/rng.js');
 for(const slot of [0,1]){
  const {g,s}=build(),tr=s.track,m=s.entities.find(e=>e.kind==='mystery'&&e.slot===slot),q=tr.project(m.pos.x,m.pos.z);
  expect(slot===0?Math.abs(q.u)>2.2:m.detour===true).toBe(true);
  expect(s.world.groundBelow(m.pos.x,m.pos.y+.1,m.pos.z,.01)).toBeCloseTo(m.pos.y,1);expect(m.allowTramp).toBe(false);
  for(const hazard of s.entities.filter(e=>e.kind==='cat'||e.kind==='rug'))expect(m.pos.distanceTo(hazard.pos)).toBeGreaterThanOrEqual(4);
  let seed=0;while(rollMystery(seed,1,slot)!=='cat')seed++;g.session.runSeed=seed;g.player.hurt=vi.fn();m.break();const cat=m.spawned[0];expect(cat.kind).toBe('cat');expect(cat.timer).toBe(0);
  if(slot===0){const landing=await realJump(s,[-2.4,2.2,299.5],[-.6,1.8,295],{doubleAt:.25,returnLanding:true});expect(landing?.pos).toBeInstanceOf(THREE.Vector3);expect(landing.t).toBeLessThan(3);g.player.pos.copy(landing.pos);}
  else{
   const target=tr.toWorld(492,-.2,9),body={pos:m.pos.clone(),vel:new THREE.Vector3(),hw:.36,hd:.36,h:1.3,grounded:true};
   for(let i=0;i<60;i++){const delta=target.clone().sub(body.pos).setY(0);if(delta.length()<.1)break;delta.setLength(Math.min(8,delta.length()*60));body.vel.set(delta.x,-1,delta.z);moveBody(s.world,body,1/60);}expect(body.pos.distanceTo(target)).toBeLessThan(.2);g.player.pos.copy(body.pos);
  }
  expect(g.player.pos.distanceTo(cat.pos)).toBeGreaterThan(2.7);cat.update(3.01);expect(g.player.hurt).not.toHaveBeenCalled();
 }
});
