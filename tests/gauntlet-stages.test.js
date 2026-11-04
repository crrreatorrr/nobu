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
export function fixture(id='g1',corrections=true,options={}){
 const g={player:{pos:new THREE.Vector3(1000,0,0),body:{s:0,u:0},abilities:{}},ui:{tutorial:vi.fn(),banner:vi.fn()},fx:new Proxy({},{get:()=>()=>{}}),camera:{shake(){}}};
 let seq=0;g.session={level:id,deaths:0,deathsAtCp:0,nextSeq:()=>++seq,onBreak:vi.fn(),reachGoal:vi.fn(),setCheckpoint:vi.fn()};
 const s=new Stage(g,GAUNTLET_INFO[id].theme),t=new TicketSystem(g,s);g.tickets=g.session.tickets=t;g.stage=g.session.stage=s;
 const info=buildGauntlet(id,g,s,t,{corrections,decor:false,...options});t.finalize();return{g,s,t,info};
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
test('canonical first-clear15raw credits5whole with normal100Ticket life line/HUD feedback and no repeat faucet',async()=>{
 const{session,g}=sessionFixture();save.data.tickets=99;save.write();session.lifeLine=0;const lives=save.data.lives;
 session.addTickets(15,'gauntlet-first-clear');expect(save.data.tickets).toBe(99);
 session.gauntletT=10;await session.reachGoal();expect(session.fieldRaw).toBe(15);expect(session.levelTickets).toBe(5);expect(save.data.tickets).toBe(104);expect(save.data.lives).toBe(lives+1);
 expect(g.ui.setHud).toHaveBeenCalledWith('tickets',104);expect(g.ui.setHud).toHaveBeenCalledWith('lives',lives+1);expect(session.snack.raw).toBe(0);
 session.addTickets(15,'gauntlet-first-clear');session.addTickets(99,'jackpot');expect(save.data.tickets).toBe(104);
});
test('actual TNT pounce clears every wall pack and Vacuum Dock clears every Rug on the curved stage',()=>{
 const{g,s,session}=sessionFixture('g2'),tr=s.track,cat=s.entities.find(e=>e.kind==='cat'),wall=s.entities.filter(e=>e instanceof Backpack&&Math.abs(tr.project(e.pos.x,e.pos.z).s-136.6)<.1);
 expect(wall).toHaveLength(6);cat.arm();cat.update(3.01);expect(wall.every(e=>e.broken)).toBe(true);
 const dock=s.entities.find(e=>e.kind==='vacswitch'),rugs=s.entities.filter(e=>e.kind==='rug');dock.press();for(let i=0;i<90;i++)dock.update(1/60);expect(rugs).toHaveLength(4);expect(rugs.every(e=>e.broken)).toBe(true);
 expect(session.fieldRaw).toBe(0);expect(session.levelTickets).toBe(0);expect(g.tickets.flying).toHaveLength(0);
});

test('actual Player arrow receivers and G3 ceiling admit the advertised tap/held launch without head collision',()=>{
 for(const id of ['g1','g2','g3']){
  const f=sessionFixture(id),p=actor(f),tr=f.s.track;
  for(const pattern of f.s.gauntletInfo.patterns)for(const step of pattern.route.filter(r=>r.move.startsWith('arrow'))){
   const a=pattern.pieces[step.from],b=pattern.pieces[step.to];
   const launch=f.s.entities.find(e=>e.constructor.name==='Lunchbox'&&Math.abs(tr.project(e.pos.x,e.pos.z).s-a.dd)<.05);
   const held=step.move==='arrowHeld',heldSpy=vi.spyOn(input,'held').mockImplementation(key=>key==='jump'&&held),pressedSpy=vi.spyOn(input,'pressed').mockReturnValue(false);
   let target=tr.toWorld(b.dd,b.x||0,(b.y||0)+(['lunch','arrow','slide','blink','fall'].includes(b.kind)?.98:b.kind==='pack'?1:0));
   const slider=b.kind==='slide'&&f.s.timedBoxes.find(q=>q.kind==='slide'&&q.d===b.dd)?.entity;
   // The moving window explicitly permits waiting for the receiver's near phase.
   if(slider){slider.clock.t=(Math.PI*2-Math.PI/6)/(b.params.speed);slider.update(0);target=slider.pos.clone().add(new THREE.Vector3(0,.98,0));}
   if(b.kind==='floorStart')target=tr.toWorld(b.dd+.3,b.x||0,b.y||0);
   p.spawnAt(launch.pos.clone().add(new THREE.Vector3(0,.98,0)),tr.yaw(a.dd));launch.onLand(p,-1);
   const r=reach(step.move,target.y-p.pos.y,a.params.power),v=target.clone().sub(p.pos).setY(0).multiplyScalar(1/r.air);expect(v.length(),`${id} ${a.dd} launch`).toBeLessThanOrEqual(8);
   p.vel.x=v.x;p.vel.z=v.z;input.state.x=v.x/8;input.state.y=v.z/8;
   let landed=null,head=false;const onLand=p.body.onLand;p.body.onLand=(solid,impact,was)=>{landed=p.pos.clone();onLand(solid,impact,was);};p.body.onHead=()=>{head=true;};
   for(let i=0;i<150&&!landed&&!head;i++)p.update(1/60,f.s,{right:new THREE.Vector3(1,0,0),forward:new THREE.Vector3(0,0,1)});
   expect(head,`${id} arrow${a.dd} headroom`).toBe(false);expect(landed?.distanceTo(target),`${id} arrow${a.dd} landing`).toBeLessThan(.9);
   p.body.onLand=onLand;heldSpy.mockRestore();pressedSpy.mockRestore();input.state.x=input.state.y=0;
  }
 }
});
test('actual G3 ladder lands beside its perched pack and bites it without a placement correction',async()=>{
 const {simJump}=await import('../src/levels/gauntletMath.js');
 for(const corrections of [false,true]){
  const f=fixture('g3',corrections),p=actor(f),tr=f.s.track,source=tr.toWorld(73,0,3.98),target=tr.toWorld(77,0,6.98),trace=simJump({doubleAt:20/60,dy:target.y-source.y}),velocity=target.clone().sub(source).setY(0).multiplyScalar(1/trace.air);
  f.g.onPlayerDeath=vi.fn();const held=vi.spyOn(input,'held').mockImplementation(k=>k==='jump'),pressed=vi.spyOn(input,'pressed').mockReturnValue(false);
  p.spawnAt(source,tr.yaw(73));p._jump(TUNING.JUMP);p.vel.x=velocity.x;p.vel.z=velocity.z;input.state.x=velocity.x/8;input.state.y=velocity.z/8;
  let landed=false,head=false;p.body.onHead=solid=>{head=true;solid.ref?.onHeadHit?.(p);};
  for(let frame=0;frame<100&&!p.dead;frame++){
   if(frame===20)p._airJump();p.update(1/60,f.s,{right:new THREE.Vector3(1,0,0),forward:new THREE.Vector3(0,0,1)});
   if(p.body.grounded&&p.pos.y>target.y-.1){landed=true;break;}
  }
  held.mockRestore();pressed.mockRestore();input.state.x=input.state.y=0;
  expect({head,landed,dead:p.dead},`corrections=${corrections}`).toMatchObject({head:false,landed:true,dead:false});
  const topPack=f.s.entities.find(e=>e instanceof Backpack&&Math.abs(tr.project(e.pos.x,e.pos.z).s-77)<.1);
  expect(p.pos.distanceTo(target)).toBeLessThan(1);p._startBite();p.biteT=.3;Player.prototype._interact.call(p,f.s);expect(topPack.broken).toBe(true);

 }
});
const {audio}=await import('../src/audio/audio.js');
test('gauntlet blink metronome follows the real shared clock, does not multiply sibling cues, and resets on retry',()=>{
 const{g,s}=fixture('g3'),metronome=s.entities.find(e=>e.constructor.name==='GauntletMetronome'),blink=s.timedBoxes.find(e=>e.kind==='blink').entity;
 g.player.pos.copy(blink.pos);audio.play.mockClear();metronome.update();metronome.update();expect(audio.play.mock.calls.filter(c=>c[0]==='tick')).toHaveLength(1);
 blink.clock.t=.95;metronome.update();expect(audio.play.mock.calls.filter(c=>c[0]==='tick')).toHaveLength(1);
 blink.clock.t=1.81;metronome.update();expect(audio.play.mock.calls.filter(c=>c[0]==='tick')).toHaveLength(2);
 metronome.onRespawn();blink.clock.reset();metronome.update();expect(audio.play.mock.calls.filter(c=>c[0]==='tick')).toHaveLength(3);
});
test('G3 Glide Drop uses actual earned Glide input and lands on the real Lunch receiver',async()=>{
 const{simJump}=await import('../src/levels/gauntletMath.js');const f=sessionFixture('g3'),p=actor(f),tr=f.s.track;
 save.data.beaten['1']=true;const from=tr.toWorld(88,0,7),to=tr.toWorld(102,0,.98),r=simJump({doubleAt:.3,glide:true,dy:to.y-from.y}),v=to.clone().sub(from).setY(0).multiplyScalar(1/r.air);
 p.spawnAt(from,tr.yaw(88));p._jump(TUNING.JUMP);p.vel.x=v.x;p.vel.z=v.z;input.state.x=v.x/8;input.state.y=v.z/8;
 let frame=0,glided=false,landing=null;const held=vi.spyOn(input,'held').mockImplementation(k=>k==='jump'),pressed=vi.spyOn(input,'pressed').mockImplementation(k=>k==='jump'&&(frame===18||frame===20));
 const onLand=p.body.onLand;p.body.onLand=(solid,impact,was)=>{landing=p.pos.clone();onLand(solid,impact,was);};
 for(frame=0;frame<400&&!landing;frame++){p.update(1/60,f.s,{right:new THREE.Vector3(1,0,0),forward:new THREE.Vector3(0,0,1)});glided ||= p.gliding;}
 held.mockRestore();pressed.mockRestore();input.state.x=input.state.y=0;
 expect(glided).toBe(true);expect(landing?.distanceTo(to)).toBeLessThan(.9);expect(p.dead).toBe(false);
});
test('G3 source roof permits a late double skip, while the extended roof blocks that route',()=>{
 for(const corrections of [false,true]){
 save.data.beaten['1']=true;
 const f=fixture('g3',corrections),p=actor(f),tr=f.s.track,launch=f.s.entities.find(e=>e.constructor.name==='Lunchbox'&&Math.abs(tr.project(e.pos.x,e.pos.z).s-159.5)<.05),pack=f.s.entities.find(e=>e instanceof Backpack&&Math.abs(tr.project(e.pos.x,e.pos.z).s-171.5)<.05),target=pack.pos.clone().add(new THREE.Vector3(0,1,0));
 let frame=0;const held=vi.spyOn(input,'held').mockImplementation(k=>k==='jump'),pressed=vi.spyOn(input,'pressed').mockImplementation(k=>k==='jump'&&(frame===16||frame===18));f.g.onPlayerDeath=vi.fn();
 p.spawnAt(launch.pos.clone().add(new THREE.Vector3(0,.98,0)),tr.yaw(159.5));launch.onLand(p,-1);let head=false,sliderContact=false;p.body.onHead=()=>{head=true;};const land=p.body.onLand;p.body.onLand=(solid,...args)=>{sliderContact ||= solid===f.s.timedBoxes.find(q=>q.kind==='slide'&&q.d===167).entity.solid;land(solid,...args);};
 for(frame=0;frame<220&&!pack.broken&&!p.dead;frame++){
  const delta=target.clone().sub(p.pos).setY(0),speed=Math.min(8,delta.length()*30);delta.normalize().multiplyScalar(speed);input.state.x=delta.x/8;input.state.y=delta.z/8;
  p.update(1/60,f.s,{right:new THREE.Vector3(1,0,0),forward:new THREE.Vector3(0,0,1)});
 }
 held.mockRestore();pressed.mockRestore();input.state.x=input.state.y=0;
 expect(pack.broken&&!sliderContact,`corrections=${corrections}`).toBe(!corrections);
 }
});
test('existing track walls contain the side-and-Glide roof escape attempt without extra wall geometry',()=>{
 {
  const f=fixture('g3',true),p=actor(f),tr=f.s.track,launch=f.s.entities.find(e=>e.constructor.name==='Lunchbox'&&Math.abs(tr.project(e.pos.x,e.pos.z).s-159.5)<.05),pack=f.s.entities.find(e=>e instanceof Backpack&&Math.abs(tr.project(e.pos.x,e.pos.z).s-171.5)<.05);
  save.data.beaten['1']=true;f.g.onPlayerDeath=vi.fn();let frame=0;const held=vi.spyOn(input,'held').mockImplementation(k=>k==='jump'),pressed=vi.spyOn(input,'pressed').mockImplementation(k=>k==='jump'&&(frame===48||frame===50));
  p.spawnAt(launch.pos.clone().add(new THREE.Vector3(0,.98,0)),tr.yaw(159.5));launch.onLand(p,-1);let waypoint=0,escaped=false;
  const goals=[tr.toWorld(159.5,5.5,0),tr.toWorld(175,5.5,0),pack.pos.clone()];
  for(frame=0;frame<650&&!pack.broken&&!p.dead;frame++){
   const target=goals[waypoint],delta=target.clone().sub(p.pos).setY(0);if(delta.length()<.25&&waypoint<2)waypoint++;
   const speed=Math.min(8,delta.length()*30);delta.normalize().multiplyScalar(speed);input.state.x=delta.x/8;input.state.y=delta.z/8;
   p.update(1/60,f.s,{right:new THREE.Vector3(1,0,0),forward:new THREE.Vector3(0,0,1)});escaped ||= Math.abs(p.body.u)>5;
  }
  held.mockRestore();pressed.mockRestore();input.state.x=input.state.y=0;
  expect({escaped,broken:pack.broken}).toEqual({escaped:false,broken:false});
 }
});
test('lower G3 exit ceiling preserves actual Slider-to-pack held jump with normal headroom',async()=>{
 const{simJump}=await import('../src/levels/gauntletMath.js'),f=sessionFixture('g3'),p=actor(f),tr=f.s.track,slider=f.s.timedBoxes.find(q=>q.kind==='slide'&&q.d===167).entity,pack=f.s.entities.find(e=>e instanceof Backpack&&Math.abs(tr.project(e.pos.x,e.pos.z).s-171.5)<.05);
 slider.clock.t=Math.PI/4;slider.update(0);const from=slider.pos.clone().add(new THREE.Vector3(0,.98,0)),to=pack.pos.clone().add(new THREE.Vector3(0,1,0)),r=simJump({dy:to.y-from.y}),v=to.clone().sub(from).setY(0).multiplyScalar(1/r.air);
 const held=vi.spyOn(input,'held').mockImplementation(k=>k==='jump'),pressed=vi.spyOn(input,'pressed').mockReturnValue(false);let head=false;p.body.onHead=()=>{head=true;};
 p.spawnAt(from,tr.yaw(167));p._jump(TUNING.JUMP);p.vel.x=v.x;p.vel.z=v.z;input.state.x=v.x/8;input.state.y=v.z/8;
 for(let frame=0;frame<150&&!pack.broken;frame++)p.update(1/60,f.s,{right:new THREE.Vector3(1,0,0),forward:new THREE.Vector3(0,0,1)});
 held.mockRestore();pressed.mockRestore();input.state.x=input.state.y=0;expect(head).toBe(false);expect(pack.broken).toBe(true);
});
test('new laundry prop materials dispose once while their asset/Kit materials remain borrowed',()=>{
 const{g}=fixture('g3'),s=new Stage(g,'house'),t=new TicketSystem(g,s);buildGauntlet('g3',g,s,t);
 const prop=s.entities.find(e=>e.obj?.children.some(o=>o.type==='Group'&&o.children.some(m=>m.geometry?.type==='BoxGeometry'&&m.geometry.parameters.height===4)));
 expect(prop).toBeTruthy();const materials=new Set();prop.obj.traverse(o=>{if(o.material)materials.add(o.material);});const spies=[...materials].map(m=>vi.spyOn(m,'dispose'));
 s.dispose();s.dispose();expect(spies.every(spy=>spy.mock.calls.length===1)).toBe(true);
});
test('actual G2 Nitro hop route clears all four rotated Rug hitboxes before the Dock removes them',async()=>{
 const{simJump}=await import('../src/levels/gauntletMath.js'),f=sessionFixture('g2'),p=actor(f),tr=f.s.track,pattern=f.s.gauntletInfo.patterns.find(q=>q.id==='g2-P12');
 p._interact=Player.prototype._interact;f.g.onPlayerDeath=vi.fn();const held=vi.spyOn(input,'held').mockImplementation(k=>k==='jump'),pressed=vi.spyOn(input,'pressed').mockReturnValue(false);
 for(const step of pattern.route.filter(s=>s.move!=='run')){
  const a=pattern.pieces[step.from],b=pattern.pieces[step.to],top=q=>q.y+(q.kind==='lunch'?.98:0),from=tr.toWorld(a.dd-(a.kind==='floorEnd'?1.2:0),a.x||0,top(a)),to=tr.toWorld(b.dd,b.x||0,top(b)),r=simJump({dy:to.y-from.y}),v=to.clone().sub(from).setY(0).multiplyScalar(1/r.air);
  p.spawnAt(from,tr.yaw(a.dd));p._jump(TUNING.JUMP);p.vel.x=v.x;p.vel.z=v.z;input.state.x=v.x/8;input.state.y=v.z/8;let landed=false;
  for(let frame=0;frame<150&&!p.dead;frame++){p.update(1/60,f.s,{right:new THREE.Vector3(1,0,0),forward:new THREE.Vector3(0,0,1)});if(p.body.grounded){landed=true;break;}}
  expect({dead:p.dead,landed},`${a.dd}→${b.dd}`).toEqual({dead:false,landed:true});expect(p.pos.distanceTo(to)).toBeLessThan(.9);
 }
 held.mockRestore();pressed.mockRestore();input.state.x=input.state.y=0;expect(f.s.entities.filter(e=>e.kind==='rug').every(e=>!e.broken)).toBe(true);
});
test('all gauntlet Pity respawn spots have real support; G1 ramp spot uses actual ramp height',()=>{
 for(const id of ['g1','g2','g3']){const{s}=fixture(id);for(const e of s.entities.filter(e=>e.constructor.name==='PitySnacks'))expect(s.world.groundBelow(e.pos.x,e.pos.y+.1,e.pos.z),`${id} Pity at${s.track.project(e.pos.x,e.pos.z).s}`).toBeCloseTo(e.pos.y,3);}
 const{s}=fixture('g1',false),spot=s.entities.find(e=>e.constructor.name==='PitySnacks'&&Math.abs(s.track.project(e.pos.x,e.pos.z).s-128)<.1);
 expect(s.world.groundBelow(spot.pos.x,spot.pos.y+.1,spot.pos.z)).toBeLessThan(spot.pos.y-.1);
});
test('G3 raised finale receiver preserves its normal held bounce to the backed goal pad',()=>{
 const f=sessionFixture('g3'),p=actor(f),tr=f.s.track,pack=f.s.entities.find(e=>e instanceof Backpack&&Math.abs(tr.project(e.pos.x,e.pos.z).s-171.5)<.05),target=tr.toWorld(175.9,0,3);
 const held=vi.spyOn(input,'held').mockImplementation(k=>k==='jump'),pressed=vi.spyOn(input,'pressed').mockReturnValue(false);
 p.spawnAt(pack.pos.clone().add(new THREE.Vector3(0,1,0)),tr.yaw(171.5));pack.onLand(p,-1);const r=reach('bounceHeld',target.y-p.pos.y),v=target.clone().sub(p.pos).setY(0).multiplyScalar(1/r.air);p.vel.x=v.x;p.vel.z=v.z;input.state.x=v.x/8;input.state.y=v.z/8;
 let landed=false,head=false;p.body.onHead=()=>{head=true;};for(let frame=0;frame<180&&!landed;frame++){p.update(1/60,f.s,{right:new THREE.Vector3(1,0,0),forward:new THREE.Vector3(0,0,1)});landed=p.body.grounded;}
 held.mockRestore();pressed.mockRestore();input.state.x=input.state.y=0;expect(head).toBe(false);expect(landed).toBe(true);expect(p.pos.distanceTo(target)).toBeLessThan(.9);
});
test('G3 corrected finale rejects late Double+Glide skips across18 press times and4 actual moving-slider start phases',()=>{
 const f=fixture('g3'),p=actor(f),tr=f.s.track,launch=f.s.entities.find(e=>e.constructor.name==='Lunchbox'&&Math.abs(tr.project(e.pos.x,e.pos.z).s-159.5)<.05),pack=f.s.entities.find(e=>e instanceof Backpack&&Math.abs(tr.project(e.pos.x,e.pos.z).s-171.5)<.05),slider=f.s.timedBoxes.find(q=>q.kind==='slide'&&q.d===167).entity;
 save.data.beaten['1']=true;f.g.onPlayerDeath=vi.fn();let frame=0,pressAt=0;const held=vi.spyOn(input,'held').mockImplementation(k=>k==='jump'),pressed=vi.spyOn(input,'pressed').mockImplementation(k=>k==='jump'&&(frame===pressAt||frame===pressAt+2));
 for(const phase of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(pressAt=12;pressAt<=80;pressAt+=4){
  pack.restore();slider.clock.t=phase/2;slider.update(0);p.spawnAt(launch.pos.clone().add(new THREE.Vector3(0,.98,0)),tr.yaw(159.5));launch.onLand(p,-1);let contacted=false;
  const target=pack.pos.clone().add(new THREE.Vector3(0,1,0));p.body.onLand=(solid,impact,was)=>{contacted ||= solid===slider.solid;Player.prototype._onLand.call(p,solid,impact,was);};
  for(frame=0;frame<220&&!pack.broken&&!p.dead&&!contacted;frame++){
   const delta=target.clone().sub(p.pos).setY(0),speed=Math.min(8,delta.length()*30);delta.normalize().multiplyScalar(speed);input.state.x=delta.x/8;input.state.y=delta.z/8;
   f.s.world.beginFrame();advanceBeatClocks(f.s,1/60);slider.update(1/60);p.update(1/60,f.s,{right:new THREE.Vector3(1,0,0),forward:new THREE.Vector3(0,0,1)});
  }
  expect(pack.broken&&!contacted,`phase${phase},Doubleframe${pressAt}`).toBe(false);
 }
 held.mockRestore();pressed.mockRestore();input.state.x=input.state.y=0;
});
test('abandoning a goal while its claim lock waits cannot award, bank or freeze the next screen',async()=>{
 const{session,g}=sessionFixture();let run;vi.stubGlobal('navigator',{locks:{request:(_name,callback)=>new Promise(resolve=>{run=()=>resolve(callback());})}});hub.bank.mockClear();
 try{const goal=session.reachGoal();session.dispose();g.session=null;g.player.frozen=false;run();const result=await goal;expect(result.cancelled).toBe(true);expect(save.data.gauntlets.g1).toBeUndefined();expect(hub.bank).not.toHaveBeenCalled();expect(g.gauntletCleared).not.toHaveBeenCalled();expect(g.player.frozen).toBe(false);}finally{vi.unstubAllGlobals();}
});
test('a committed goal still settles after disposal but cannot complete or freeze the replacement screen',async()=>{
 const{session,g}=sessionFixture();hub.bank.mockClear();const original=save.withGauntletEnd.bind(save),method=vi.spyOn(save,'withGauntletEnd').mockImplementation(async(...args)=>{const result=await original(...args);session.dispose();g.session=null;g.player.frozen=false;return result;});
 try{const result=await session.reachGoal();expect(result).toMatchObject({tickets:5,claimDurable:true});expect(hub.bank).toHaveBeenCalledWith('gauntlet-proof',5,true);expect(g.gauntletCleared).not.toHaveBeenCalled();expect(g.player.frozen).toBe(false);}finally{method.mockRestore();}
});
test('quota failure retains best-effort local feedback but cannot repeat external bank across reloads',async()=>{
 for(let attempt=0;attempt<2;attempt++){
  const{session}=sessionFixture();hub.bank.mockClear();const write=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new DOMException('quota','QuotaExceededError');});
  try{const result=await session.reachGoal();expect(result).toMatchObject({tickets:5,claimDurable:false});expect(save.data.tickets).toBe(5);expect(hub.bank).not.toHaveBeenCalled();}finally{write.mockRestore();}
 }
});
