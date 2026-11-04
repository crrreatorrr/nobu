import * as THREE from 'three';
import {test,expect,vi} from 'vitest';
vi.mock('../src/art/assets.js',()=>({Assets:{has:()=>false,model:()=>null,aspect:()=>1,tex:()=>new THREE.Texture(),tiled:()=>new THREE.Texture()}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn(),setRate:vi.fn()}}));
vi.mock('../src/hub/hubBridge.js',()=>({hub:{bank:vi.fn().mockResolvedValue({ok:true})}}));
const gradient={addColorStop(){}};const context=new Proxy({measureText:()=>({width:100}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,getImageData:()=>({data:new Uint8ClampedArray(16)})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
HTMLCanvasElement.prototype.getContext=()=>context;
const {Stage}=await import('../src/world/stage.js');
const {TicketSystem}=await import('../src/entities/tickets.js');
const {buildGauntlet}=await import('../src/levels/gauntlets.js');
const {GAUNTLET_INFO,GAUNTLET_SOURCE_PATTERNS}=await import('../src/levels/data/gauntlets.js');
const {validatePattern}=await import('../src/levels/gauntletMath.js');
const {Breakable}=await import('../src/entities/entity.js');
const {Snacks,Backpack}=await import('../src/entities/breakables.js');
const {measureTicketBudget}=await import('../src/game/measureTicketBudget.js');
export function fixture(id='g1',corrections=true){
 const g={player:{pos:new THREE.Vector3(1000,0,0),body:{s:0,u:0},abilities:{}},ui:{tutorial:vi.fn(),banner:vi.fn()},fx:new Proxy({},{get:()=>()=>{}}),camera:{shake(){}}};
 let seq=0;g.session={level:id,deaths:0,deathsAtCp:0,nextSeq:()=>++seq,onBreak:vi.fn(),reachGoal:vi.fn(),setCheckpoint:vi.fn()};
 const s=new Stage(g,GAUNTLET_INFO[id].theme),t=new TicketSystem(g,s);g.tickets=g.session.tickets=t;g.stage=g.session.stage=s;
 const info=buildGauntlet(id,g,s,t,{corrections,decor:false});t.finalize();return{g,s,t,info};
}
for(const[id,def]of Object.entries(GAUNTLET_INFO)){
 test(`${id} actual curved placements strictly meet every tier`,()=>{const{s}=fixture(id);expect(s.gauntletInfo.problems).toEqual([]);});
 test(`${id} preserves${def.count} countables, two checkpoint Snacks and zero static/raw payouts`,()=>{
  const{s,t}=fixture(id);expect(s.entities.filter(e=>e instanceof Breakable&&e.countable)).toHaveLength(def.count);
  expect(s.entities.filter(e=>e.kind==='snacks')).toHaveLength(2);expect(s.entities.filter(e=>e.kind==='snacks').every(e=>!e.countable)).toBe(true);
  expect(s.entities.filter(e=>e instanceof Backpack).every(e=>e.tickets===0)).toBe(true);expect(t.list).toHaveLength(0);
  const b=measureTicketBudget(s,t,0);expect(b.field).toBe(0);expect(b.packs).toBe(0);
 });
 test(`${id} keeps checkpoints grounded and goal trigger before a real backed goal pad`,()=>{
  const{g,s}=fixture(id),tr=s.track;
  for(const cp of s.entities.filter(e=>e.kind==='snacks'))expect(s.world.groundBelow(cp.pos.x,cp.pos.y+.1,cp.pos.z,.01)).toBeCloseTo(cp.pos.y,2);
  expect(tr.triggers.find(t=>t.d===def.goal)).toBeTruthy();tr.triggers.find(t=>t.d===def.goal).fn();expect(g.session.reachGoal).toHaveBeenCalledOnce();
 });
}
test('retains negative source fixtures for all stage tells/rest/physics corrections',()=>{
 for(const id of ['g1-P2','g1-P7','g1-P10','g1-P5','g2-P7','g2-P16','g3-P3','g3-P7','g3-P16'])expect(validatePattern(Object.values(GAUNTLET_SOURCE_PATTERNS).flat().find(p=>p.id===id)).length,id).toBeGreaterThan(0);
});

test('all three routes build their actual procedural decor without media or gameplay colliders',()=>{
 for(const id of ['g1','g2','g3']){const{g}=fixture(id);const s=new Stage(g,GAUNTLET_INFO[id].theme),t=new TicketSystem(g,s);expect(()=>buildGauntlet(id,g,s,t)).not.toThrow();}
});

const {Session}=await import('../src/game/session.js');
const {save,SAVE_KEY}=await import('../src/core/save.js');
const {hub}=await import('../src/hub/hubBridge.js');
const {advanceBeatClocks}=await import('../src/entities/boxes.js');
function sessionFixture(id='g1'){
 localStorage.setItem(SAVE_KEY,JSON.stringify({v:3}));save.load();
 const f=fixture(id),{g,s,t,info}=f,session=new Session(g,id);g.session=session;
 Object.assign(session,{def:{...GAUNTLET_INFO[id],gauntlet:true,bonus:true},stage:s,tickets:t,projectiles:{clear:vi.fn()},_pushHud:vi.fn(),_undoLifeLinesAbove:vi.fn(),setMask:vi.fn(),attemptId:'gauntlet-proof',attemptDurable:true});
 Object.assign(g.player,{facing:info.facing,spawnAt(pos){this.pos.copy(pos);}});g.player.pos.copy(info.spawn);
 g.camera.snap=vi.fn();g.mask={snapTo:vi.fn()};g.ui.setHud=vi.fn();g.gauntletCleared=vi.fn();
 session.cp={pos:info.spawn.clone(),seq:0,tickets:0,levelTickets:0,freedIds:new Set()};
 session.breakablesTotal=s.entities.filter(e=>e instanceof Breakable&&e.countable).length;
 return{...f,session};
}
test('actual Session checkpoint keeps earlier breaks, restores later packs and resets every timed clock on retry',()=>{
 const{session,s}=sessionFixture(),packs=s.entities.filter(e=>e instanceof Backpack),cp=s.entities.find(e=>e.kind==='snacks');
 packs[0].break();cp.hit();packs[1].break();advanceBeatClocks(s,.7);
 expect(packs[0].broken&&packs[1].broken).toBe(true);expect([...s.beatClocks.values()].every(c=>c.t>.6)).toBe(true);
 session.deaths=1;session.respawn();expect(packs[0].broken).toBe(true);expect(packs[1].broken).toBe(false);
 expect([...s.beatClocks.values()].every(c=>c.t===0)).toBe(true);expect(session.deaths).toBe(1);expect(session.deathsAtCp).toBe(1);
});
test('actual Session suppresses every raw/chain reward, banks five whole Tickets once and leaves boards/relics untouched',async()=>{
 const{session,s,g}=sessionFixture('g2');hub.bank.mockClear();
 for(const e of s.entities.filter(e=>e instanceof Breakable&&e.countable))e.markBroken();
 session.addTickets(100,'snack');expect(session.chain.n).toBe(0);expect(session.levelTickets).toBe(0);expect(session.snack.raw).toBe(0);
 session.gauntletT=42.25;const result=await session.reachGoal();expect(result.tickets).toBe(5);expect(save.data.tickets).toBe(5);
 expect(hub.bank).toHaveBeenCalledWith('gauntlet-proof',5,true);expect(g.gauntletCleared).toHaveBeenCalledWith(session,result);
 expect(save.data.boneBoard).toEqual({});expect(save.data.perfect).toEqual({});expect(save.data.bestChain).toEqual({});expect(save.data.gauntlets.g2).toMatchObject({allBoxes:true,flawless:true,bestMs:42250,firstPaid:true});
 session.busy=false;await session.reachGoal();expect(save.data.tickets).toBe(5);expect(session.levelTickets).toBe(5);
});
const {Player,TUNING}=await import('../src/player/player.js');
const {input}=await import('../src/core/input.js');
const {reach}=await import('../src/levels/gauntletMath.js');
function actor(f){
 const p=new Player(f.g);f.g.player=p;p._animate=()=>{};p._updateShadow=()=>{};p._interact=()=>{};p._dustColor=()=>0xffffff;
 return p;
}
test('actual Player.update and Backpack.onLand clear both bounce bridges in a forward pass',()=>{
 for(const id of ['g1','g3']){
  const f=sessionFixture(id),{s}=f,p=actor(f),tr=s.track,pattern=s.gauntletInfo.patterns[0],packs=s.entities.filter(e=>e instanceof Backpack&&tr.project(e.pos.x,e.pos.z).s>pattern.pieces[0].dd&&tr.project(e.pos.x,e.pos.z).s<pattern.pieces.at(-1).dd).sort((a,b)=>tr.project(a.pos.x,a.pos.z).s-tr.project(b.pos.x,b.pos.z).s);
  let held=false;const heldSpy=vi.spyOn(input,'held').mockImplementation(a=>a==='jump'&&held),pressedSpy=vi.spyOn(input,'pressed').mockReturnValue(false);
  p.spawnAt(packs[0].pos.clone().add(new THREE.Vector3(0,1.01,0)),tr.yaw(0));p.vel.y=-1;
  // Land onto the first pack using normal collision, then choose the advertised next bounce.
  const steps=pattern.route.filter(r=>r.move.startsWith('bounce'));
  const targetFor=(index)=>index<packs.length?packs[index].pos.clone().add(new THREE.Vector3(0,1,0)):tr.toWorld(pattern.pieces.at(-1).dd+.4,0,0);
  for(let n=0;n<packs.length;n++){
   held=steps[n].move==='bounceHeld';
   if(!packs[n].broken){input.state.x=0;input.state.y=0;for(let i=0;i<6&&!packs[n].broken;i++)p.update(1/60,s,{right:new THREE.Vector3(1,0,0),forward:new THREE.Vector3(0,0,1)});}
   expect(packs[n].broken,`${id} pack${n} receives a real landing`).toBe(true);
   const target=targetFor(n+1),launchY=p.pos.y,r=reach(steps[n].move,target.y-launchY),v=target.clone().sub(p.pos).setY(0).multiplyScalar(1/r.air);
   // Starting velocity can retain momentum from the previous landing, never above RUN.
   expect(v.length()).toBeLessThanOrEqual(TUNING.RUN);p.vel.x=v.x;p.vel.z=v.z;
   input.state.x=v.x/TUNING.RUN;input.state.y=v.z/TUNING.RUN;
   let landed=false;
   for(let i=0;i<180;i++){
    if(n+1<packs.length&&p.vel.y<0)held=steps[n+1]?.move==='bounceHeld';
    p.update(1/60,s,{right:new THREE.Vector3(1,0,0),forward:new THREE.Vector3(0,0,1)});
    if((n+1<packs.length&&packs[n+1].broken)||(n+1===packs.length&&p.body.grounded)){landed=true;break;}
   }
   expect(landed,`${id} bounce${n} reaches next receiver`).toBe(true);
  }
  heldSpy.mockRestore();pressedSpy.mockRestore();input.state.x=input.state.y=0;
  expect(packs.every(e=>e.broken)).toBe(true);expect(f.session.levelTickets).toBe(0);
 }
});
