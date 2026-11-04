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
 const info=(layout===2?buildLevel1Layout2:buildLevel1)(g,s,t,{labels,corrections});t.finalize();return{g,s,t,info};
}
let raw,candidate,classic;
beforeAll(()=>{raw=build(2,false);candidate=build();classic=build(1);});
test('leaves layout1 canonical and preserves the Bird arena byte for byte',()=>{
 expect(classic.s.track.length).toBeCloseTo(328.492,2);expect(classic.s.entities.filter(e=>e instanceof ConedDog)).toHaveLength(5);
 const source=fs.readFileSync('src/levels/level1.js','utf8');
 const arena=source.slice(source.indexOf('export function buildBoss1Arena'));
 expect(createHash('sha256').update(arena).digest('hex')).toBe('27e872a900c48cf7c1505c38d77ea61b8fccb2f02a6a037d97d1e071c02590f5');
 expect(ticketBudget(measureTicketBudget(classic.s,classic.t,7)).wholeMax).toBe(131);
});
test('adds the measured225m track without self intersections and keeps the exact gate/end',()=>{
 const a=new Track(turtle(L1_START,L1_MOVES_CLASSIC)),b=candidate.s.track;
 expect(b.length-a.length).toBeCloseTo(225.28,1);expect(shiftL1(314)).toBe(539);expect(shiftL1(322)).toBe(547);
 for(const [at,x] of L1_SPLICES)expect(shiftL1(at)-shiftL1(at-.001)).toBeCloseTo(x+.001,6);
 for(let s=0;s<b.length;s+=4)for(let d=s+60;d<b.length;d+=4)expect(b.toWorld(s).distanceTo(b.toWorld(d))).toBeGreaterThan(40);
 expect(b.triggers.some(t=>t.d===539)).toBe(true);
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
test('measures both complete actual candidates, includes all gated rewards, and never grows the current approved cap',()=>{
 const a=measureTicketBudget(raw.s,raw.t,7),b=measureTicketBudget(candidate.s,candidate.t,7);
 fs.writeFileSync('/tmp/nobu-h30-budget.json',JSON.stringify({raw:a,rawTotal:ticketBudget(a),candidate:b,candidateTotal:ticketBudget(b),countable:candidate.s.entities.filter(e=>e instanceof Breakable&&e.countable).length,mysterySupport:[raw,candidate].map(({s})=>{const m=s.entities.find(e=>e.kind==='mystery'&&e.slot===0);const y=s.world.groundBelow(m.pos.x,m.pos.y+.2,m.pos.z,.01);return{entityY:m.pos.y,solidY:y,delta:m.pos.y-y};})}));
 expect(()=>checkTicketBudget(1,b)).toThrow(/exceeds fixed cap131|exceeds fixed cap 131/);
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
 g.player.body.s=539;g.session.cp.pos.copy(tr.toWorld(393));chase.onRespawn();expect(chase.state).toBe('wait');expect(chase.s).toBeCloseTo(380,1);expect(chase.waitT).toBe(1.6);
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
