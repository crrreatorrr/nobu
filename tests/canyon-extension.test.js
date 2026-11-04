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


const {moveBody}=await import('../src/world/physics.js');
const { Stage } = await import('../src/world/stage.js');
const { TicketSystem } = await import('../src/entities/tickets.js');
const { buildLevel2Extended, ACTIVE } = await import('../src/levels/level2Extended.js');
const { LEVELS } = await import('../src/levels/registry.js');
const { measureTicketBudget } = await import('../src/game/measureTicketBudget.js');
const { ticketBudget } = await import('../src/game/ticketBudget.js');
const { EXTENDED_CHASE_ITEMS, EXTENDED_DOGS, extendedD, YA, CF } = await import('../src/levels/data/l2-extended.js');
const { CanyonChase } = await import('../src/entities/canyonChase.js');
const { TopplingPost, YarnAvalanche } = await import('../src/entities/canyonHazards.js');
const { ConedDog } = await import('../src/entities/dogs.js');
const { save } = await import('../src/core/save.js');
function fixture(options){
  save.load();const noop=()=>{};
  const game={player:{pos:new THREE.Vector3(),vel:new THREE.Vector3(),body:{s:32,u:0},abilities:{},dead:false,bounce:vi.fn(),die:vi.fn(),facing:0},
    ui:{tutorial:noop,banner:noop,fade:async()=>{}},fx:{dust:noop,ring:noop,sparkle:noop},camera:{shake:noop,setMode:noop,snap:noop},
    session:{level:'2',phase:'level',deaths:0,runSeed:42,nextSeq:()=>1,onBreak:noop,addTickets:noop,coconutSeq:0,coconutSpawned:0,collectedCoconuts:new Set()}};
  const stage=new Stage(game,LEVELS['2'].theme);game.stage=stage;
  vi.spyOn(stage,'decor').mockImplementation(noop);game.tickets=new TicketSystem(game,stage);
  const built=buildLevel2Extended(game,stage,game.tickets,options);game.session.stage=stage;game.session.chase=built.chase;
  return{game,stage,built};
}
test('inactive candidate leaves the shipped builder, cap and arena separate',()=>{expect(ACTIVE).toBe(false);expect(LEVELS['2'].build).not.toBe(buildLevel2Extended);});
test('actual candidate builds 519m route and every stable/new dog ID exactly once',()=>{
  const {stage,built}=fixture();expect(built.spawn.distanceTo(stage.track.toWorld(32))).toBeLessThan(.01);
  expect(extendedD(302)-32).toBe(519);expect(extendedD(293)).toBe(542);
  expect(stage.entities.filter(e=>e instanceof ConedDog).map(e=>e.dogId).sort()).toEqual(EXTENDED_DOGS.map(e=>e.id).sort());
  expect(stage.track.spans.some(s=>s.d0<YA+48&&s.d1>YA+54)).toBe(false);
});
test('candidate measures every authored payer without changing approved caps',()=>{
 const {stage,game}=fixture(),budget=measureTicketBudget(stage,game.tickets,7);expect(budget.mystery).toBe(2);expect(budget.coconut).toBe(true);
 expect(budget).toEqual({field:158,packs:196,zipped:0,jackpots:15,bark:15,trampoline:0,mystery:2,arena:7,coconut:true});expect(ticketBudget(budget).wholeMax).toBe(151);
});
test('extended countable data is placed at final coordinates with reset Snacks options',()=>{
 const{stage}=fixture({corrections:false});for(const item of EXTENDED_CHASE_ITEMS){if(item.kind==='stack')continue;const p=stage.track.toWorld(item.d,item.x,item.y);expect(stage.entities.some(e=>e.pos.distanceTo(p)<.05)).toBe(true);}
});
test('corner cuts skip unsafe landings, isolated catch requires rear/height, and hold is harmless',()=>{
 const{stage,built,game}=fixture(),cat=built.chase;cat.begin(207.5,0);cat.state='run';game.player.body.s=214;game.player.pos.copy(stage.track.toWorld(214));cat.afterAdvance(214);expect(cat.leap).toBeNull();
 cat.begin(207.5,0);cat.state='run';cat.afterAdvance(220);expect(cat.leap.s1).toBe(212.5);
 expect(cat.canCatch(-2,{pos:{y:cat.y}})).toBe(false);expect(cat.canCatch(1,{pos:{y:cat.y+8}})).toBe(false);expect(cat.canCatch(1,{pos:{y:cat.y}})).toBe(true);
 cat.hold();cat.update(.2);expect(cat.state).toBe('stop');expect(game.player.die).not.toHaveBeenCalled();
});
test('toppling posts rotate about the base and warn at least .8s before the hit',()=>{
 const{stage}=fixture();for(const post of stage.entities.filter(e=>e instanceof TopplingPost)){post.t=post.period*.5+.001;post.update(0);expect(post.shadow.material.opacity).toBe(.65);post.update(.798);expect(post.dangerous).toBe(false);post.t=Math.max(post.period*.5+.8,post.period*.72)+.001;post.update(0);expect(post.dangerous).toBe(true);expect(post.pivot.position.x).toBe(-post.w/2);expect(post.pivot.rotation.z).toBeLessThan(0);}
});
test('yarn volleys show a stable seeded empty lane 1.5s ahead and respect shared cap',()=>{
 const{stage,game}=fixture();const roller=stage.entities.filter(e=>e instanceof YarnAvalanche).at(-1);game.player.body.s=roller.until;game.player.pos.set(999,0,999);roller.timer=1.5;roller.update(0);const shown=roller.shadows.findIndex(s=>s.m.material.opacity>0);expect(shown).toBeGreaterThanOrEqual(0);
 roller.update(1.5);expect(roller.balls).toHaveLength(2);expect(roller.balls.every(b=>b.u!==roller.lanes[shown])).toBe(true);
 game.session.coconutSpawned=45;roller.timer=0;roller.update(.1);expect(roller.balls).toHaveLength(2);
});
test('chase arrows preserve vertical launch while providing at least run forward speed',()=>{
 const{stage,game}=fixture();for(const arrow of stage.canyonExtension.arrows){game.player.vel.set(0,0,0);arrow.onLand(game.player);expect(game.player.bounce).toHaveBeenCalledWith(16,{allowCut:false});const f=stage.track.tangent(stage.track.project(arrow.pos.x,arrow.pos.z).s);f.y=0;f.normalize();expect(game.player.vel.dot(f)).toBeGreaterThanOrEqual(7.999);}
});

test('canonical section labels cover every new main stretch and both loops',()=>{
 const{stage}=fixture();expect(stage.sections.map(s=>s.name)).toEqual(expect.arrayContaining(['Switchbacks','Cardboard Fort','Scratchpost Forest','Yarn Avalanche','Cat Flap Alley','Dry Riverbed']));
 for(const d of [205,265,350,480])expect(stage.sections.filter(s=>!s.detour&&d>=s.d0&&d<s.d1)).toHaveLength(1);
});
test('Fort hold and restart re-arm after the original one-shot triggers have fired',()=>{
 const{stage,game,built}=fixture();const cat=built.chase;game.player.body.s=CF+4;game.player.pos.copy(stage.track.toWorld(CF+4));cat.begin(CF-9,1.6);cat.update(.01);expect(cat.state).toBe('stop');expect(cat.s).toBe(CF-1);
 game.player.body.s=CF+13;game.player.pos.copy(stage.track.toWorld(CF+13));cat.update(.01);expect(cat.state).toBe('wait');expect(cat.waitT).toBeCloseTo(.99);expect(cat.s).toBe(CF-1);
});
test('actual Session retains loop haul on keep and restores dogs/packs on loss with the cat reset behind the main path',async()=>{
 const{Session}=await import('../src/game/session.js');
 for(const route of ['canyonFlap','canyonRiver'])for(const kept of [false,true]){
  const{stage,game,built}=fixture(),session=new Session(game,'2');game.session=session;session.stage=stage;session.tickets=game.tickets;session.chase=built.chase;session.projectiles={clear(){}};
  Object.assign(game.fx,{clear(){},burst(){},puff(){}});game.ui.setHud=()=>{};game.mask={snapTo(){}};
  game.player.spawnAt=(pos,facing)=>{game.player.pos.copy(pos);game.player.facing=facing;const pr=stage.track.project(pos.x,pos.z);game.player.body.s=pr.s;game.player.body.u=pr.u;};
  const detour=stage[route].detour;session.checkpoint(detour.pos);await detour.travel();expect(session.bonusRound.tray).toBe(detour);
  const dog=stage.entities.find(e=>e instanceof ConedDog&&e.dogId===(route==='canyonFlap'?'2:shiba-b':'2:pug-b'));
  dog.freed=true;dog.seq=session.nextSeq();session.freedIds.add(dog.dogId);
  const pack=stage.entities.find(e=>e.countable&&e.kind!=='snacks'&&Math.abs(e.pos.y-detour.round.start.y)<2&&e!==dog);pack.broken=true;pack.brokenSeq=session.nextSeq();pack.dead=true;
  await session._leaveBonusRound(kept);expect(session.bonusRound).toBeNull();expect(dog.freed).toBe(kept);expect(pack.broken).toBe(kept);
  expect(session.chase.s).toBeCloseTo(game.player.body.s-13,1);expect(session.chase.waitT).toBe(1.6);expect(game.player.body.u).toBeCloseTo(0,1);expect(detour.used).toBe(kept);
  if(kept){detour.onRespawn();expect(detour.used).toBe(false);}
 }
});

test('actual World preserves the sunken river lane and restores the main canyon clamp on exit',()=>{
 const{stage,game}=fixture(),route=stage.canyonRiver.detour;
 const pos=route.startPos.clone(),vel=new THREE.Vector3(0,-1,0),body={pos,vel,hw:.3,hd:.3,h:1.3,grounded:false};
 game.session.bonusRound={tray:route};moveBody(stage.world,body,1/60);expect(body.u).toBeCloseTo(-7.5,1);expect(pos.y-stage.track.heightAt(body.s)).toBeCloseTo(-5,1);
 game.session.bonusRound=null;pos.y=stage.track.heightAt(body.s);moveBody(stage.world,body,1/60);expect(body.u).toBeGreaterThan(-4.4);
});

for(const corrections of [false,true])test(`actual Player tail ${corrections?'breaks the corrected bounce pack in one pass':'misses the literal bounce pack'}`,async()=>{
 const{Player}=await import('../src/player/player.js'),{input}=await import('../src/core/input.js');
 const{stage,game}=fixture({corrections});save.data.godMode=false;game.fx=new Proxy(game.fx,{get:(o,k)=>o[k]??(()=>{})});game.session.onPlayerDeath=()=>{};game.session.onBreak=()=>{};game.session.checkpoint=()=>{};
 const p=new Player(game);game.player=p;p._animate=()=>{};p._updateShadow=()=>{};p.spawnAt(stage.track.toWorld(YA+48.5,0,1),stage.track.yaw(YA+48.5));
 p.body.grounded=true;p.body.ground=stage.canyonExtension.arrows[0].solid;stage.canyonExtension.arrows[0].onLand(p);
 const pressed=vi.spyOn(input,'pressed').mockReturnValue(false),held=vi.spyOn(input,'held').mockReturnValue(false);const old={x:input.state.x,y:input.state.y};input.state.x=0;input.state.y=1;
 let highest=p.pos.y,landing=null,elapsed=0;const bounce=stage.entities.find(e=>e.countable&&e.pos.distanceTo(stage.track.toWorld(YA+(corrections?55:53),corrections?0:1.2))<.05);
 for(let i=0;i<180;i++){const forward=stage.track.tangent(p.body.s),right=stage.track.right(p.body.s);p.update(1/120,stage,{forward,right});elapsed+=1/120;highest=Math.max(highest,p.pos.y);if(bounce.broken||p.body.grounded){landing=p.body.s;break;}}
 expect(bounce.broken).toBe(corrections);expect((landing-YA-48.5)/elapsed).toBeGreaterThanOrEqual(7.99);
 expect(landing).toBeGreaterThan(YA+54);pressed.mockRestore();held.mockRestore();Object.assign(input.state,old);
});

test('actual cut arc gains ground while preserving a safe landing and competitive DDA exclusion',()=>{
 const{stage,game,built}=fixture(),cat=built.chase,plain=new CanyonChase(stage,stage.track,0,[]);
 game.player.body.s=224.5;game.player.pos.copy(stage.track.toWorld(224.5));cat.begin(207.4,0);plain.begin(207.4,0);
 let wasCut=false,landingGap=null;
 for(let i=0;i<80;i++){game.player.body.s+=8/120;game.player.pos.copy(stage.track.toWorld(game.player.body.s));const cutBefore=!!cat.leap?.corner;cat.update(1/120);plain.update(1/120);wasCut||=!!cat.leap?.corner;if(cutBefore&&!cat.leap)landingGap=game.player.body.s-cat.s;}
 expect(wasCut).toBe(true);expect(cat.s).toBeGreaterThan(plain.s+1);expect(landingGap).toBeGreaterThanOrEqual(3.5);
 game.session.deathsAtCp=5;cat.begin(100,1.6);expect(cat.speedMul).toBe(.92);game.session.trial=true;cat.begin(100,1.6);expect(cat.speedMul).toBe(1);
});

test('data exports account for every countable and exact dog location in the candidate',async()=>{
 const{CORRECTED_CHASE_ITEMS,EXTENDED_DETOUR_ITEMS,CORRECTED_DOGS,CANYON_BOUNCE_ITEM}=await import('../src/levels/data/l2-extended.js');
 const{stage}=fixture(),expected=CORRECTED_CHASE_ITEMS.reduce((n,o)=>n+(o.height??1),0)+EXTENDED_DETOUR_ITEMS.length+1;
 expect(stage.entities.filter(e=>e.countable)).toHaveLength(expected);
 for(const item of [...CORRECTED_CHASE_ITEMS,...EXTENDED_DETOUR_ITEMS,CANYON_BOUNCE_ITEM])expect(stage.entities.some(e=>e.countable&&e.pos.distanceTo(stage.track.toWorld(item.d,item.x,item.y))<.05)).toBe(true);
 for(const dog of CORRECTED_DOGS){const e=stage.entities.find(e=>e.dogId===dog.id);expect(e.pos.distanceTo(stage.track.toWorld(dog.d,dog.x,dog.y??0))).toBeLessThan(.01);}
});

test('the two-lane yarn stage alternates single balls and authored hazard DDA stays off in trials',()=>{
 const{stage,game}=fixture();const roller=stage.entities.filter(e=>e instanceof YarnAvalanche)[1];expect(roller.radius).toBe(1.2);expect(roller.mat.map).toBeTruthy();game.player.pos.set(999,0,999);game.player.body.s=roller.until;roller.timer=0;roller.update(0);expect(roller.balls.map(b=>b.u)).toEqual([-2.4]);roller.timer=0;roller.update(0);expect(roller.balls.map(b=>b.u)).toEqual([-2.4,2.4]);
 const post=stage.entities.find(e=>e instanceof TopplingPost);post.t=0;game.session.deathsAtCp=5;post.update(.1);expect(post.t).toBeCloseTo(.092);game.session.trial=true;post.update(.1);expect(post.t).toBeCloseTo(.192);
});

test('the actual shifted Vacuum Dock safely clears all six old and new rugs',async()=>{
 const{Rug,VacuumSwitch}=await import('../src/entities/breakables.js'),{stage,game}=fixture();game.fx=new Proxy(game.fx,{get:(o,k)=>o[k]??(()=>{})});const dock=stage.entities.find(e=>e instanceof VacuumSwitch),rugs=stage.entities.filter(e=>e instanceof Rug);
 expect(rugs).toHaveLength(6);expect(stage.track.project(dock.pos.x,dock.pos.z).s).toBeCloseTo(542,1);for(const rug of rugs)expect(stage.track.project(rug.pos.x,rug.pos.z).s).toBeLessThan(542);
 dock.press();dock.update(1.3);expect(rugs.every(e=>e.broken)).toBe(true);expect(game.player.dead).toBe(false);
});

test('canonical real Session deaths arm the Canyon pity spot without Tickets and exclude competitive contexts',async()=>{
 const{Session}=await import('../src/game/session.js');
 const attach=(flags={},cp=232.5)=>{
  const f=fixture(),{stage,game,built}=f,s=new Session(game,'2');game.session=s;Object.assign(s,flags);s.stage=stage;s.tickets=game.tickets;s.chase=built.chase;s.projectiles={clear(){}};
  game.fx=new Proxy(game.fx,{get:(o,k)=>o[k]??(()=>{})});game.ui.setHud=()=>{};game.mask={snapTo(){},setLevel(){}};
  game.player.spawnAt=pos=>{game.player.pos.copy(pos);const pr=stage.track.project(pos.x,pos.z);game.player.body.s=pr.s;game.player.body.u=pr.u;};s.checkpoint(stage.track.toWorld(cp));
  const spot=stage.entities.find(e=>e.kind==='pitysnacks'&&Math.abs(stage.track.project(e.pos.x,e.pos.z).s-234.5)<.1);return{...f,s,spot};
 };
 const{s,spot,stage,game}=attach(),before={tickets:save.data.tickets,raw:s.fieldRaw,snack:s.snack.raw,entities:stage.entities.length};
 for(let i=0;i<6;i++)s.respawn();expect(spot.armed).toBe(false);s.respawn();expect(s.deathsAtCp).toBe(7);expect(spot.armed).toBe(true);expect(s.mask).toBe(1);expect(s.chase.speedMul).toBe(.92);
 expect(stage.entities.filter(e=>e.kind==='pitysnacks'&&e.armed)).toEqual([spot]);expect(spot.countable).toBe(false);
 expect({tickets:save.data.tickets,raw:s.fieldRaw,snack:s.snack.raw,entities:stage.entities.length}).toEqual(before);
 spot.onTouch();expect(s.cp.pos.equals(spot.pos)).toBe(true);expect(s.deathsAtCp).toBe(0);expect(save.data.tickets).toBe(before.tickets);expect(game.tickets.flying).toHaveLength(0);
 for(const mode of ['trial','remix','medalRun','rush','board']){const f=attach({[mode]:true});f.s.deathsAtCp=6;f.s.respawn();expect(f.spot.armed).toBe(false);expect(f.s.mask).toBe(0);expect(save.data.tickets).toBe(f.s.cp.tickets);}
 const blocked=attach({},201.5);blocked.s.deathsAtCp=6;blocked.s.respawn();expect(blocked.spot.armed).toBe(false);
});

test('real Session respawn restores every toppling post phase, shadow and danger state',async()=>{
 const{Session}=await import('../src/game/session.js'),{stage,game,built}=fixture(),s=new Session(game,'2');game.session=s;s.stage=stage;s.tickets=game.tickets;s.chase=built.chase;s.projectiles={clear(){}};
 Object.assign(game.fx,{clear(){},burst(){},puff(){}});game.ui.setHud=()=>{};game.mask={snapTo(){},setLevel(){}};game.player.spawnAt=pos=>{game.player.pos.copy(pos);const pr=stage.track.project(pos.x,pos.z);game.player.body.s=pr.s;game.player.body.u=pr.u;};s.checkpoint(built.spawn);
 const posts=stage.entities.filter(e=>e instanceof TopplingPost);for(const post of posts){post.t=post.period*.8;post.update(0);post.dangerous=true;post.shadow.material.opacity=.9;}
 s.respawn();for(const post of posts){expect(post.t).toBe(post.phase);expect(post.dangerous).toBe(false);expect(post.interactive).toBe(false);expect(post.shadow.material.opacity).toBeLessThan(.9);}
});

test('real pending detour fades keep the cat moving but suppress uncontrollable transition catches',async()=>{
 const{Session}=await import('../src/game/session.js'),{stage,game,built}=fixture(),s=new Session(game,'2');game.session=s;s.stage=stage;s.tickets=game.tickets;s.chase=built.chase;game.mask={snapTo(){}};const fades=[];game.ui.fade=()=>new Promise(resolve=>fades.push(resolve));
 game.player.spawnAt=pos=>{game.player.pos.copy(pos);const pr=stage.track.project(pos.x,pos.z);game.player.body.s=pr.s;game.player.body.u=pr.u;game.player.frozen=false;};
 const route=stage.canyonFlap.detour;game.player.spawnAt(route.pos);s.checkpoint(route.pos);s.chase.begin(game.player.body.s-2.7,0);s.chase.state='run';const initial=s.chase.s;
 const transition=route.travel();expect(s.busy).toBe(true);expect(game.player.frozen).toBe(true);
 for(let i=0;i<30;i++)s.chase.update(1/120);expect(s.chase.s).toBeGreaterThan(initial);expect(game.player.die).not.toHaveBeenCalled();
 fades.shift()();await Promise.resolve();expect(fades).toHaveLength(1);expect(s.busy).toBe(true);
 for(let i=0;i<30;i++)s.chase.update(1/120);expect(game.player.die).not.toHaveBeenCalled();fades.shift()();await transition;expect(s.busy).toBe(false);
 game.player.spawnAt(route.pos);s.chase.y=game.player.pos.y;expect(s.chase.canCatch(1,game.player)).toBe(true);
});
test('actual river Shellback patrol remains on its own sunken lane outside the player round',async()=>{
 const{Shellback}=await import('../src/entities/enemies.js'),{stage,game}=fixture(),enemy=stage.entities.find(e=>e instanceof Shellback);game.session.bonusRound=null;
 for(let i=0;i<600;i++)enemy.update(1/60);
 const pr=stage.track.project(enemy.pos.x,enemy.pos.z);expect(pr.u).toBeLessThan(-6.4);expect(pr.u).toBeGreaterThan(-8.6);expect(enemy.pos.y-stage.track.heightAt(pr.s)).toBeCloseTo(-5,1);
});

test('fixed-player corner landing keeps the full 3.5m boundary at30/60/120Hz without moving backwards',()=>{
 for(const hz of [30,60,120]){
 const{stage,game,built}=fixture(),cat=built.chase;game.player.body.s=216;game.player.pos.copy(stage.track.toWorld(216));cat.begin(207.5,0);cat.state='run';let cut=false,landed=false,previous=cat.s;
 for(let i=0;i<hz*3;i++){const before=!!cat.leap?.corner;cat.update(1/hz);expect(cat.s).toBeGreaterThanOrEqual(previous);previous=cat.s;cut||=!!cat.leap?.corner;if(before&&!cat.leap){landed=true;expect(game.player.body.s-cat.s).toBeGreaterThanOrEqual(3.5);break;}}
 expect(cut).toBe(true);expect(landed).toBe(true);
 }
});

test('corrected optional gap requires Glide in the actual Player timing sweep while the literal ledge bypasses it',async()=>{
 const{Player}=await import('../src/player/player.js'),{input}=await import('../src/core/input.js');const outcomes=[];
 const cases=[...[.2,.25,.3,.35,.4,.45,.5,.55,.6,.65,.7,.75,.8,.85,.9].map(doubleTime=>({glide:false,doubleTime,corrections:true})),{glide:true,doubleTime:.7,corrections:true},{glide:false,doubleTime:.7,corrections:false}];
 for(const{glide,doubleTime,corrections}of cases){
 const{stage,game}=fixture({corrections});save.data.godMode=false;save.data.beaten[1]=glide;game.fx=new Proxy(game.fx,{get:(o,k)=>o[k]??(()=>{})});game.onPlayerDeath=()=>{};game.session.onPlayerDeath=()=>{};game.session.onBreak=()=>{};game.session.checkpoint=()=>{};
 for(const e of stage.entities)if(e.constructor.name==='HiddenBone')e.interactive=false;
 const p=new Player(game);game.player=p;p._animate=()=>{};p._updateShadow=()=>{};p.spawnAt(stage.track.toWorld(170.6,1.4,8.01),stage.track.yaw(170.6));
 const old={x:input.state.x,y:input.state.y};input.state.x=0;input.state.y=1;let tick=0;
 const pressed=vi.spyOn(input,'pressed').mockImplementation(action=>action==='jump'&&(tick===1||tick===Math.round(doubleTime*120)||glide&&tick===Math.round((doubleTime+.15)*120))),held=vi.spyOn(input,'held').mockImplementation(action=>action==='jump');
 for(const e of stage.entities)if(e.solid&&Math.abs(stage.track.project(e.pos.x,e.pos.z).s-170)<.1&&e.pos.y-stage.track.heightAt(170)>7){e.solid.enabled=false;e.broken=true;e.interactive=false;}
 input.state.y=0;for(let settle=0;settle<20;settle++)p.update(1/120,stage,{forward:stage.track.tangent(p.body.s),right:stage.track.right(p.body.s)});expect(p.body.grounded).toBe(true);input.state.y=1;
 let reached=false,maxS=p.body.s;
 for(tick=0;tick<360;tick++){p.update(1/120,stage,{forward:stage.track.tangent(p.body.s),right:stage.track.right(p.body.s)});maxS=Math.max(maxS,p.body.s);if(p.body.s>(corrections?184:174)&&p.body.grounded&&p.pos.y-stage.track.heightAt(p.body.s)>7){reached=true;break;}if(p.pos.y-stage.track.heightAt(p.body.s)<4)break;}
 outcomes.push({glide,doubleTime,corrections,reached,maxS});pressed.mockRestore();held.mockRestore();Object.assign(input.state,old);
 }
 expect(outcomes.filter(o=>o.corrections&&!o.glide).some(o=>o.reached)).toBe(false);expect(outcomes.some(o=>o.glide&&o.reached)).toBe(true);expect(outcomes.find(o=>!o.corrections).reached).toBe(true);
});

test('later-move Dust Wall pickups retain the jackpot source for shared Snack-potential accounting',async()=>{
 const{staticSnackPotential}=await import('../src/game/bones.js');
 const{game}=fixture(),extras=game.tickets.list.filter(t=>t.source==='jackpot');expect(extras).toHaveLength(10);expect(extras.every(t=>t.y>90)).toBe(true);expect(staticSnackPotential(game.tickets.list)).toBe(148);
});
