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
const { Rug } = await import('../src/entities/breakables.js');
const { buildLevel3, buildLevel3Layout2, buildBoss3Arena } = await import('../src/levels/level3.js');
const { LEVELS } = await import('../src/levels/registry.js');
const { LEVEL_BUDGETS } = await import('../src/levels/data/budgets.js');
const { measureTicketBudget } = await import('../src/game/measureTicketBudget.js');
const { checkTicketBudget, ticketBudget } = await import('../src/game/ticketBudget.js');
const { save } = await import('../src/core/save.js');
const { Session } = await import('../src/game/session.js');
vi.spyOn(Stage.prototype, 'decor').mockImplementation(() => {});

function build(candidate=true, roll=.001, trial=false, purple=false) {
  const random=vi.spyOn(Math,'random').mockReturnValue(roll);
  try {
    save.load(); save.data.colorBones.purple=purple;
    const noop=()=>{}, game={
      player:{pos:new THREE.Vector3(),abilities:{},body:{s:1,u:0,grounded:false},mode:'normal',
        spawnAt(pos){this.pos.copy(pos);}, facing:0},
      ui:new Proxy({}, {get:()=>noop}), fx:new Proxy({}, {get:()=>noop}),
      camera:{shake:noop,snap:noop,setMode:noop},mask:{snapTo:noop},
    };
    const session=new Session(game,'3',{trial}); game.session=session;
    const stage=new Stage(game,LEVELS['3'].theme); session.stage=stage;
    const tickets=new TicketSystem(game,stage); game.tickets=session.tickets=tickets;
    const info=(candidate?buildLevel3Layout2:buildLevel3)(game,stage,tickets); tickets.finalize();
    session.cp={pos:info.spawn.clone(),lifeLine:session.lifeLine};
    session.dogsTotal=stage.entities.filter(e=>e.dogId).length;
    session.breakablesTotal=stage.entities.filter(e=>e.countable).length;
    return {stage,tickets,session,game,info,measured:measureTicketBudget(stage,tickets)};
  } finally {random.mockRestore();}
}

const {validatePattern,reach}=await import('../src/levels/gauntletMath.js');
const {vatPattern,worldVatPattern}=await import('../src/levels/data/l3-vat.js');
const {validateDetours}=await import('../src/levels/environmentKit.js');
const {FactoryDetourRecovery,ReversingFactoryBelt}=await import('../src/levels/factoryControllers.js');
const {gatedCountables}=await import('../src/game/gateRules.js');
const {GoodBoyRoute}=await import('../src/entities/secrets.js');
const {RisingHazard}=await import('../src/entities/environment.js');
const {ConedDog}=await import('../src/entities/dogs.js');
const {L3_LAYOUT2_INFO}=await import('../src/levels/level3.js');
const {HiddenBone}=await import('../src/entities/hiddenBone.js');

test('candidate measures real fresh payers, including optional gates, both Mystery rolls and arena',()=>{
  const a=build(),b=build(true,.999999), original=build(false);
  const arena=new Stage(a.game,LEVELS['3'].bossTheme), arenaTickets=new TicketSystem(a.game,arena);
  buildBoss3Arena(a.game,arena,arenaTickets);arenaTickets.finalize();
  const measured={...a.measured,arena:measureTicketBudget(arena,arenaTickets).field};
  expect(a.measured).toEqual(b.measured);
  expect(measured).toEqual({field:83,packs:149,zipped:8,jackpots:27,bark:10,trampoline:0,mystery:2,arena:7,coconut:false});
  expect(ticketBudget(measured)).toEqual({raw:302,coconut:0,wholeMax:100});
  expect(checkTicketBudget('3',measured,101).wholeMax).toBe(100);
  expect(()=>checkTicketBudget('3',measured,99)).toThrow(/exceeds fixed cap/);
  expect(()=>checkTicketBudget('3',measured)).toThrow(/exceeds fixed cap/);
  expect(original.measured).toEqual({...LEVEL_BUDGETS['3'],arena:0});
  expect(LEVELS['3'].build).toBe(buildLevel3);
  expect(L3_LAYOUT2_INFO).toMatchObject({active:false,path:419,gate:418,trigger:420,end:427});
});

test('nine stable dogs, all original countables, blue bone, and final gate retain reachable authored placements',()=>{
 const {stage,game}=build(), tr=stage.track;
 const dogs=stage.entities.filter(e=>e instanceof ConedDog);
 expect(dogs.map(e=>e.dogId).sort()).toEqual(['3:pug-a','3:pug-b','3:dalmatian-a','3:dalmatian-b','3:dalmatian-c','3:corgi-a','3:corgi-b','3:shiba-a','3:shiba-b'].sort());
 const positions={'3:pug-a':68,'3:dalmatian-a':96.5,'3:corgi-a':279.2,'3:shiba-a':294.5,'3:dalmatian-b':387,'3:shiba-b':118,'3:pug-b':229.5,'3:corgi-b':198,'3:dalmatian-c':294};
 for(const d of dogs)expect(tr.project(d.home.x,d.home.z).s).toBeCloseTo(positions[d.dogId],1);
 expect(gatedCountables(stage.entities)).toEqual([]);
 const blue=stage.entities.find(e=>e.color==='blue'); expect(tr.project(blue.pos.x,blue.pos.z).s).toBeCloseTo(281.6,1);
 expect(tr.spans.some(s=>s.d0===397 && s.d1===427)).toBe(true);
 game.session.reachBossGate=vi.fn();
 const gate=tr.triggers.find(t=>Math.abs(t.s-420)<.01 || Math.abs(t.d-420)<.01);
 expect(gate).toBeDefined(); gate.fn(); expect(game.session.reachBossGate).toHaveBeenCalledOnce();
 expect(tr.wallKeys.some(k=>Math.abs((k.d??k.s)-297.5)<.01)).toBe(true);
});

test('unchanged Tier3 validator rejects literal Vat and accepts every edge of corrected full climb',()=>{
 expect(validatePattern(vatPattern(true)).map(p=>p.problem)).toEqual(expect.arrayContaining([expect.stringMatching(/Input window 16/),expect.stringMatching(/Input window 0/),expect.stringMatching(/unreachable/)]));
 expect(validatePattern(vatPattern())).toEqual([]);
 const {stage,tickets}=build();
 expect(tickets.list.filter(t=>{const s=stage.track.project(t.x,t.z).s;return s>337&&s<381;})).toEqual([]);
 for(const pattern of stage.timedPatterns)expect(validatePattern(pattern)).toEqual([]);
 const arrows=stage.timedBoxes.filter(b=>b.kind==='arrow'); expect(arrows.map(a=>a.y)).toEqual([6.6,7.4]);
});

test('detour skips can be walked back on the actual permanent main floor',()=>{
 const {stage}=build(); expect(validateDetours(stage)).toBe(true);
 for(const [a,b] of [[188,201],[276,312]]) for(let d=a;d<=b;d+=.5) {
  const ground=stage.track.groundAt(d,0); expect(ground).not.toBeNull();
  expect(ground.y-stage.track.heightAt(d)).toBeCloseTo(0,1);
 }
});

test('duct roller rolls only the two duct Rugs, preserving the old Golden puzzle',()=>{
 const {stage}=build(); const roller=stage.entities.find(e=>e.kind==='lintroller'&&e.detour);
 const rugs=stage.entities.filter(e=>e instanceof Rug), before=rugs.filter(r=>!r.detour);
 roller.onBite(); expect(rugs.filter(r=>r.detour).every(r=>r.broken)).toBe(true);
 expect(before.every(r=>!r.broken)).toBe(true);
});

test('failed raised excursion rolls back real Session tickets, dogs, packs and lives without death or checkpoint',()=>{
 const {stage,session,game,tickets}=build();
 const recovery=stage.entities.find(e=>e instanceof FactoryDetourRecovery && !e.launch);
 const cp=session.cp, lives=save.data.lives, balance=save.data.tickets;
 recovery.capture();
 const dog=stage.entities.find(e=>e.dogId==='3:corgi-b'); dog.free();
 const pack=stage.entities.find(e=>e.kind==='mystery'&&e.detour); pack.markBroken();pack.hide();
 tickets.list[0].taken=true;tickets.list[0].seq=session.nextSeq();
 session.addTickets(12); save.data.lives++;
 game.player.pos.copy(stage.track.toWorld(194,0,5));game.player.body.s=194;recovery.update();
 expect(session.cp).toBe(cp);expect(session.deaths).toBe(0);expect(session.deathsAtCp).toBe(0);
 expect(save.data.lives).toBe(lives);expect(save.data.tickets).toBe(balance);
 expect(session.fieldRaw).toBe(0);expect(session.freedIds.size).toBe(0);
 expect(dog.freed).toBe(false);expect(dog.obj.visible).toBe(true);expect(pack.broken).toBe(false);
 expect(tickets.list[0].taken).toBe(false);expect(game.player.body.s).toBeCloseTo(190.5,1);
});

test('reversing belt warns a full second, flips real force and UV direction, and resets',()=>{
 const {stage,game}=build();const belt=stage.entities.find(e=>e instanceof ReversingFactoryBelt);
 game.player.body.s=151;
 belt.update(3);expect(belt.warning).toBe(true);expect(belt.span.conveyor.z).toBe(4);
 belt.update(.99);expect(belt.span.conveyor.z).toBe(4);
 belt.update(.02);expect(belt.span.conveyor.z).toBe(-4);expect(belt.direction).toBe(-1);
 belt.onRespawn();expect(belt.span.conveyor.z).toBe(4);expect(belt.warning).toBe(false);
});

test('switch starts actual rising vat, death resets it, and activated pity drains it immediately',()=>{
 const {stage,game}=build();const vat=stage.entities.find(e=>e instanceof RisingHazard);
 game.player.body.s=338;game.player.pos.copy(stage.track.toWorld(338,0,3));
 vat.update(1);expect(vat.y).toBe(-1.2);
 vat.switchEntity.press();vat.update(1);expect(vat.state).toBe('rising');expect(vat.y).toBeCloseTo(-.78);
 vat.onRespawn();expect(vat.y).toBe(-1.2);
 const pity=stage.entities.find(e=>e.kind==='pitysnacks'&&Math.abs(stage.track.project(e.pos.x,e.pos.z).s-359)<.1);
 vat.y=5;pity.arm();pity.hit();expect(vat.y).toBe(-1.2);expect(pity.broken).toBe(true);
});

test('purple is ghost until the canonical saved bone, and hidden bone is Bark-gated in the Ducts',()=>{
 const locked=build(), unlocked=build(true,.001,false,true);
 for(const [built,owned]of[[locked,false],[unlocked,true]]){
  const purple=built.stage.entities.find(e=>e instanceof GoodBoyRoute&&e.color==='purple');
  expect(purple.autoReveal).toBe(owned);expect(purple.jackpot).toBe(15);
  expect(purple.plats.every(p=>!p.solid.enabled)).toBe(true);
  const hidden=built.stage.entities.filter(e=>e instanceof HiddenBone);
  expect(hidden).toHaveLength(1);expect(hidden[0].move).toBe('bark');expect(hidden[0].detour).toBe(true);
 }
 expect(build(true,.001,true).stage.entities.filter(e=>e instanceof HiddenBone)).toHaveLength(0);
});

test('ordinary checkpoints obey Tier3 spacing and each has permanent hazard-clear floor',()=>{
 const {stage}=build(),tr=stage.track;
 const checkpoints=stage.entities.filter(e=>e.kind==='snacks').map(e=>({e,...tr.project(e.pos.x,e.pos.z)})).sort((a,b)=>a.s-b.s);
 expect(checkpoints.map(p=>Math.round(p.s*10)/10)).toEqual([69.5,122,190.5,228,312,334,389.5]);
 let last=1;
 for(const p of checkpoints){expect(p.s-last).toBeLessThanOrEqual(90);expect(tr.groundAt(p.s,p.u)).not.toBeNull();last=p.s;}
});

test('duct Hidden Bone cannot be collected through an uncleared vent or without Bark',()=>{
 const {stage,game,session}=build();const hidden=stage.entities.find(e=>e instanceof HiddenBone);
 const vent=stage.entities.find(e=>e.kind==='smogvent');
 hidden.onTouch();expect(session.hiddenFound).toBe(false);
 game.player.abilities.bark=true;hidden.onBite();expect(session.hiddenFound).toBe(false);
 game.player.pos.copy(vent.pos);vent.onBark();hidden.onTouch();expect(session.hiddenFound).toBe(true);
});

test('Vat validator sees actual world surface heights and moving receiver windows',()=>{
 const {stage}=build(), tr=stage.track, raw=vatPattern(), world=worldVatPattern(tr,raw), full=stage.timedPatterns.find(p=>p.id==='l3-vat-overflow');
 expect(full).toEqual(world);expect(validatePattern(world)).toEqual([]);
 const top=p=>p.y+(['pack','arrow','blink','fall','slide'].includes(p.kind)?p.kind==='pack'?1:.98:0);
 const slider=stage.entities.find(e=>e.constructor.name==='SlideBox');
 const point=(piece,time)=>{const p=tr.toWorld(piece.dd,piece.x,top(piece));if(piece.kind==='slide')p.addScaledVector(slider.dir,Math.sin(time*slider.speed+slider.phase)*slider.range);return p;};
 for(const step of raw.route){
  const a=raw.pieces[step.from],b=raw.pieces[step.to],from=point(a,0),to=point(b,0);
  const r=reach(step.move,to.y-from.y,a.params?.power??16);
  if(a.kind!=='slide'&&b.kind!=='slide'){
   expect(Math.hypot(to.x-from.x,to.z-from.z)).toBeLessThanOrEqual(r.dist*.86+1e-8);
   continue;
  }
  const n=1200,cycle=2*Math.PI/slider.speed,valid=[];
  for(let j=0;j<n;j++){
   const t=j*cycle/n,pa=point(a,t),pb=point(b,t+r.air),distance=Math.hypot(pb.x-pa.x,pb.z-pa.z);
   valid.push(distance<=r.dist*.86 && r.dist-distance>=.4);
  }
  let run=0,longest=0;for(let j=0;j<2*n;j++){run=valid[j%n]?Math.min(n,run+1):0;longest=Math.max(longest,run);}
  expect(longest*cycle/n*60).toBeGreaterThanOrEqual(18);
 }
 const start=tr.groundAt(337,-1.8);expect(top(world.pieces[0])).toBeCloseTo(start.y,7);
 const vat=stage.entities.find(e=>e instanceof RisingHazard);
 expect(vat.switchEntity.platforms[0].y).toBeCloseTo(top(world.pieces.at(-1)),7);
});

test('a later failed excursion preserves banked progress and entity state from the other detour',()=>{
 const {stage,session}=build(),recoveries=stage.entities.filter(e=>e instanceof FactoryDetourRecovery);
 const duct=recoveries.find(e=>!e.launch),rails=recoveries.find(e=>e.launch);
 const earlier=stage.entities.find(e=>e.dogId==='3:corgi-b'),later=stage.entities.find(e=>e.dogId==='3:dalmatian-c');
 earlier.freed=true;earlier.seq=session.nextSeq();session.freedIds.add(earlier.dogId);session.addTickets(6);
 const enemy=stage.entities.find(e=>e.detour&&e.constructor.name==='PillBot');
 const reset=enemy?vi.spyOn(enemy,'reset'):null;
 rails.capture();later.freed=true;later.seq=session.nextSeq();session.freedIds.add(later.dogId);session.addTickets(3);
 rails.rollback();expect(earlier.freed).toBe(true);expect(session.freedIds).toEqual(new Set([earlier.dogId]));
 expect(later.freed).toBe(false);expect(session.fieldRaw).toBe(6);
 if(reset)expect(reset).not.toHaveBeenCalled();
 expect(duct.detour.factoryEntities.has(earlier)).toBe(true);expect(rails.detour.factoryEntities.has(earlier)).toBe(false);
});

test('both softfall return pads have permanent floor and normal-height capsule clearance',()=>{
 const {stage}=build();
 for(const recovery of stage.entities.filter(e=>e instanceof FactoryDetourRecovery)){
  recovery.capture();const p=recovery.snapshot.back,tr=stage.track,pr=tr.project(p.x,p.z);
  expect(tr.groundAt(pr.s,pr.u)).not.toBeNull();
  const hits=stage.world.query(p.x-.36,p.y+.02,p.z-.36,p.x+.36,p.y+1.3,p.z+.36,[]);
  expect(hits).toEqual([]);
 }
});

test('the gantry leaves the actual vertical fan/arrow approach column clear',()=>{
 const {stage}=build(),p=stage.track.toWorld(275,-2.8,1.1);
 const blockers=stage.world.query(p.x-.36,p.y,p.z-.36,p.x+.36,p.y+7.2,p.z+.36,[]);
 expect(blockers).toEqual([]);
});
