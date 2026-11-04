import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
vi.mock('../src/art/assets.js', () => ({ Assets: {
  model: () => null, has: () => false, animate: () => null, aspect: () => 1,
  tex: () => new THREE.Texture(), tiled: () => new THREE.Texture(), url: () => '',
} }));
vi.mock('../src/audio/audio.js', () => ({ audio: { play: vi.fn(), setRate: vi.fn() } }));
const ctx = new Proxy({ measureText: () => ({ width: 100 }),
  createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  createImageData: (w,h) => ({ data: new Uint8ClampedArray(w*h*4) }),
  getImageData: (x,y,w,h) => ({ data: new Uint8ClampedArray(w*h*4) }),
}, { get: (o,k) => k in o ? o[k] : () => {}, set: (o,k,v) => (o[k]=v,true) });
HTMLCanvasElement.prototype.getContext = () => ctx;
HTMLCanvasElement.prototype.toDataURL = () => '';
const { TRACK_GROUND } = await import('../src/world/physics.js');
const { Stage } = await import('../src/world/stage.js');
const { Player } = await import('../src/player/player.js');
const { Session } = await import('../src/game/session.js');
const { TicketSystem } = await import('../src/entities/tickets.js');
const { makeKit } = await import('../src/levels/kit.js');
const { LEVELS } = await import('../src/levels/registry.js');
const { save } = await import('../src/core/save.js');
const { input } = await import('../src/core/input.js');
const { measureTicketBudget } = await import('../src/game/measureTicketBudget.js');
const { addMoonReturnExtras, addColoredReturnExtras } = await import('../src/levels/moonReturnRoutes.js');
const { MOON_RETURN_ROUTES } = await import('../src/levels/data/moon-return-routes.js');
const noop = () => {};
const basis = { right: new THREE.Vector3(1,0,0), forward: new THREE.Vector3(0,0,1) };
let pressed = new Set(), held = new Set();
beforeEach(() => {
  pressed.clear(); held.clear(); input.state.x = input.state.y = 0;
  vi.spyOn(input, 'pressed').mockImplementation(k => pressed.has(k));
  vi.spyOn(input, 'held').mockImplementation(k => held.has(k));
  vi.spyOn(Stage.prototype, 'decor').mockImplementation(noop);
  vi.spyOn(Math, 'random').mockReturnValue(.999);
  localStorage.clear(); save.reset(); save.data.godMode = false;
});
afterEach(() => vi.restoreAllMocks());
function build(id) {
  const game = { maskPickup: noop, loadout: { effects: {}, cosmeticSlots: () => ({}) },
    fx: new Proxy({}, { get: (o,k) => o[k] ||= noop }),
    ui: new Proxy({}, { get: (o,k) => o[k] ||= noop }),
    camera: { shake: noop, snap: noop, setMode: noop }, onFlop: noop, onPlayerDeath: vi.fn(),
  };
  const p = Object.create(Player.prototype);
  Object.assign(p, { game, pos: new THREE.Vector3(), vel: new THREE.Vector3(), root: new THREE.Group(),
    model: {}, wings: {}, halo: {}, stars: {}, deathCone: { position: new THREE.Vector3() },
    _animate: noop, _updateShadow: noop, _paintGear: noop });
  p.body = { pos: p.pos, vel: p.vel, h: 1.3, hw: .3, hd: .3, onLand: (...a) => p._onLand(...a),
    onHead: s => s.ref?.onHeadHit?.(p) };
  game.player = p;
  game.session = new Session(game, id);
  const stage = new Stage(game, LEVELS[id].theme); game.stage = game.session.stage = stage;
  const tickets = new TicketSystem(game, stage); game.tickets = game.session.tickets = tickets;
  LEVELS[id].build(game, stage, tickets); tickets.finalize();
  const k = makeKit(game, stage, tickets, stage.track);
  return { game, p, stage, tickets, k };
}
function resetPlayer(f, start, support, { moon = false, crown = false } = {}) {
  pressed.clear(); held.clear(); input.state.x = input.state.y = 0;
  save.data.beaten = { 1: true, 2: true, 3: true, 4: true, 5: moon };
  f.game.loadout.effects = crown ? { extra_air_jumps: { count: 1 } } : {};
  f.p.spawnAt(start, 0); f.p.body.grounded = true; f.p.body.ground = support;
}
function tick(f, dt) { f.stage.world.beginFrame(); f.p.update(dt, f.stage, basis); pressed.clear(); }
function flight(f, target, { moon, crown, delay = .4, dt = 1/120, start, support, takeoff } = {}) {
  resetPlayer(f, start, support, { moon, crown });
  if (moon) {
    pressed.add('slide'); held.add('slide');
    for (let t=0;t<.61;t+=dt) tick(f,dt);
  }
  held.add('jump');
  if (takeoff) takeoff(f.p); else pressed.add('jump');
  tick(f,dt);
  let peak = f.p.pos.y, headHits = 0;
  const onHead = f.p.body.onHead;
  f.p.body.onHead = s => { headHits++; onHead?.(s); };
  let landed = false;
  for (let t=0;t<2.6;t+=dt) {
    if (f.p.vel.y < .4 && f.p.vel.y > -.8 && f.p.canDouble) pressed.add('jump');
    const dx=target.pos.x-f.p.pos.x, dz=target.pos.z-f.p.pos.z, length=Math.hypot(dx,dz);
    if (t>=delay && length>.12) { input.state.x=dx/length; input.state.y=dz/length; }
    else input.state.x=input.state.y=0;
    tick(f,dt); peak=Math.max(peak,f.p.pos.y);
    if (f.p.body.grounded && f.p.body.ground === target.solid) { landed=true; break; }
    if (f.p.dead || (t>.5 && f.p.body.grounded)) break;
  }
  f.p.body.onHead=onHead; pressed.clear();held.clear();input.state.x=input.state.y=0;
  return { landed, peak, headHits, pos: f.p.pos.toArray(), dead: f.p.dead };
}

for (const id of [1,2,3,4,'ride','cave']) it(`proposal ${id}: real Moon lands and Crown cannot`, () => {
  const f=build(id), before=measureTicketBudget(f.stage,f.tickets);
  const extra=addMoonReturnExtras(f.k,f.stage,id);
  expect(measureTicketBudget(f.stage,f.tickets)).toEqual(before);
  const moon=flight(f,extra.ledge,{moon:true,start:extra.launchWorld,support:extra.pad.solid});
  const crown=flight(f,extra.ledge,{crown:true,start:extra.launchWorld,support:extra.pad.solid});
  expect(moon.landed).toBe(true);
  expect(crown.landed).toBe(false);
  f.stage.dispose();
});

it('demonstrates the original permanent L1 branch cannot launch to its unchanged Moon9 ledge', () => {
  const f=build(1), ledge=f.stage.entities.find(e=>e.kind==='moonledge');
  const start=f.k.W(-.6,2.2,298.5);
  const support=f.stage.world.all.find(s=>s.enabled&&Math.abs(s.max.y-start.y)<.01&&
    s.min.x<start.x&&s.max.x>start.x&&s.min.z<start.z&&s.max.z>start.z);
  expect(support).toBeDefined();
  const installed=f.stage.moonExtras?.[0];
  if(installed)installed.pad.solid.enabled=false;
  const old=flight(f,ledge,{moon:true,start,support});
  if(installed)installed.pad.solid.enabled=true;
  expect(old.landed).toBe(false);
  const extra=addMoonReturnExtras(f.k,f.stage,1);
  expect(flight(f,ledge,{moon:true,start:extra.launchWorld,support:extra.pad.solid}).landed).toBe(true);
  f.stage.dispose();
});

for (const id of [1,2,3,4,'ride','cave']) it(`proposal ${id}: every nearby actual standable top clears6.2m`, () => {
  const f=build(id), extra=addMoonReturnExtras(f.k,f.stage,id), c=extra.ledge.pos;
  extra.ledge.solid.enabled=false;
  let top=-Infinity;
  for(let x=-4;x<=4;x+=.2)for(let z=-4;z<=4;z+=.2)if(x*x+z*z<=16)
    top=Math.max(top,f.stage.world.groundBelow(c.x+x,c.y+50,c.z+z,.05));
  extra.ledge.solid.enabled=true;
  for(const s of f.stage.world.all){
    if(!s.enabled||s===extra.ledge.solid)continue;
    const edge=Math.hypot(Math.max(s.min.x-c.x,0,c.x-s.max.x),Math.max(s.min.z-c.z,0,c.z-s.max.z));
    if(edge<=4)expect(c.y-s.max.y,`${s.ref?.constructor.name??s.kind} nearestedge${edge}`).toBeGreaterThanOrEqual(6.2-1e-6);
  }
  expect(c.y-top).toBeGreaterThanOrEqual(6.2-1e-6);
  f.stage.dispose();
});

for (const id of [1,2,3,4,'ride','cave']) it(`proposal ${id}: normal double reaches the permanent pad and Moon returns safely`, () => {
  const f=build(id), extra=addMoonReturnExtras(f.k,f.stage,id), {launch}=MOON_RETURN_ROUTES[id];
  const y=id==='ride'?2.6:id===1?2.2:0;
  const start=id===1?f.k.W(1.1,2.2,298.5):f.k.W(launch.x,y,launch.d-3);
  let support=f.stage.world.all.find(s=>s.enabled&&Math.abs(s.max.y-start.y)<.05&&
    s.min.x<start.x&&s.max.x>start.x&&s.min.z<start.z&&s.max.z>start.z);
  if(!support){const g=f.stage.track.groundAt(launch.d-3,launch.x);expect(g).not.toBeNull();start.y=g.y;}
  const approach=flight(f,extra.pad,{start,support,delay:.2});
  expect(approach.landed).toBe(true);
  expect(flight(f,extra.ledge,{moon:true,start:extra.launchWorld,support:extra.pad.solid}).landed).toBe(true);
  // Walking off an optional high reward must return to its permanent support.
  resetPlayer(f,extra.ledge.pos,extra.ledge.solid);
  let landed=false;
  for(let t=0;t<3;t+=1/120){
    const dx=extra.pad.pos.x-f.p.pos.x,dz=extra.pad.pos.z-f.p.pos.z,n=Math.hypot(dx,dz);
    input.state.x=n>.1?dx/n:0;input.state.y=n>.1?dz/n:0;tick(f,1/120);
    if(f.p.body.grounded&&f.p.body.ground===extra.pad.solid){landed=true;break;}
  }
  expect(landed).toBe(true);expect(f.p.dead).toBe(false);
  f.stage.dispose();
});

for(const id of [1,2]) it(`proposal ${id}: colored route stays locked, persists unlock, walks out/back and adds no economy`,()=>{
  const f=build(id),before=measureTicketBudget(f.stage,f.tickets);
  const count=f.stage.entities.filter(e=>e.countable).length;
  const locked=addColoredReturnExtras(f.k,f.stage,id);
  expect(locked.plats.every(p=>!p.solid.enabled)).toBe(true);
  const color=id===1?'green':'yellow';save.data.colorBones[color]=true;save.write();save.load();
  const route=addColoredReturnExtras(f.k,f.stage,id), first=route.plats[0], last=route.plats.at(-1);
  f.p.pos.set(first.x,first.y,first.z);
  for(let t=0;t<2;t+=1/60)route.update(1/60);
  expect(route.plats.every(p=>p.solid.enabled)).toBe(true);
  expect(route.jackpot).toBe(0);
  expect(f.stage.entities.filter(e=>e.countable)).toHaveLength(count);
  expect(measureTicketBudget(f.stage,f.tickets)).toEqual(before);
  for(let i=0;i<route.plats.length;i++){
    const p=route.plats[i],target={pos:new THREE.Vector3(p.x,p.y,p.z),solid:p.solid};
    let start,support;
    if(i){const prior=route.plats[i-1];start=new THREE.Vector3(prior.x,prior.y,prior.z);support=prior.solid;}
    else {const d=id===1?30.5:148.5;start=f.k.W(id===1?-3.2:-1.1,id===1?0:8,d);support=undefined;}
    expect(flight(f,target,{start,support,delay:.2}).landed).toBe(true);
  }
  resetPlayer(f,new THREE.Vector3(last.x,last.y,last.z),last.solid);
  route.update(.01);route.update(.01);
  for(let i=route.plats.length-2;i>=0;i--){
    const p=route.plats[i],prior=route.plats[i+1];
    expect(flight(f,{pos:new THREE.Vector3(p.x,p.y,p.z),solid:p.solid},{start:new THREE.Vector3(prior.x,prior.y,prior.z),support:prior.solid,delay:.2}).landed).toBe(true);
  }
  const floor=f.k.W(id===1?-3.2:-1.1,id===1?0:8,id===1?30.5:148.5);
  const floorSupport=f.stage.world.all.find(s=>s.enabled&&Math.abs(s.max.y-floor.y)<.05&&s.min.x<floor.x&&s.max.x>floor.x&&s.min.z<floor.z&&s.max.z>floor.z)??TRACK_GROUND;
  expect(flight(f,{pos:floor,solid:floorSupport},{start:new THREE.Vector3(first.x,first.y,first.z),support:first.solid,delay:.2}).landed).toBe(true);
  expect(f.tickets.flying).toHaveLength(0);
  expect(f.game.session.levelTickets).toBe(0);
  expect(f.stage.entities.filter(e=>e.kind==='oneup'&&!e.countable).length).toBeGreaterThan(0);
  f.stage.dispose();
});

// Probe actual production launch callbacks, including their held-jump boost and
// the Crown's two refilled air jumps. These are intentionally pessimistic starts:
// no setup difficulty is used to excuse a launch that could bypass Moon.
for(const id of [1,2,3,4,'ride','cave']) it(`proposal ${id}: nearby Crown, bounce and moving support probes cannot bypass Moon`,()=>{
  const f=build(id),extra=addMoonReturnExtras(f.k,f.stage,id),target=extra.ledge;
  const probes=[];
  for(const e of f.stage.entities){
    const distance=Math.hypot(e.pos.x-target.pos.x,e.pos.z-target.pos.z);
    if(distance>28||e===target||e===extra.pad)continue;
    if(e.solid?.enabled && e.solid.max.y>f.k.W(MOON_RETURN_ROUTES[id].x,0,MOON_RETURN_ROUTES[id].d).y+.1){
      const start=new THREE.Vector3(e.pos.x,e.solid.max.y,e.pos.z);
      probes.push({label:e.constructor.name,start,support:e.solid});
    }
    if(e.onLand&&(e.power||['Backpack','MysteryBackpack','ZippedBackpack'].includes(e.constructor.name))){
      probes.push({label:`${e.constructor.name} bounce`,start:new THREE.Vector3(e.pos.x,e.solid?.max.y??e.pos.y,e.pos.z),takeoff:p=>{e.restore?.();e.onLand(p);}});
    }
    if(e.constructor.name==='Shellback'){
      probes.push({label:'flipped Shellback',start:e.pos.clone().add(new THREE.Vector3(0,1,0)),takeoff:p=>{e.mode='flipped';e.onStomp(p);}});
    }
    if(e.constructor.name==='Zipline')for(const t of [0,.25,.5,.75]){
      const start=e.A.clone().lerp(e.B,t);start.y-=1.25;
      probes.push({label:`Zipline${t}`,start,takeoff:p=>{p.hang={line:e,t};pressed.add('jump');}});
    }
  }
  if(process.env.MOON_AUDIT) console.log(JSON.stringify({id,ledge:target.pos.toArray(),launch:extra.launchWorld.toArray(),nearby:f.stage.world.all.filter(s=>s.enabled&&s!==target.solid&&Math.hypot(Math.max(s.min.x-target.pos.x,0,target.pos.x-s.max.x),Math.max(s.min.z-target.pos.z,0,target.pos.z-s.max.z))<=4).map(s=>({kind:s.ref?.constructor.name??s.kind,top:s.max.y,edge:Math.hypot(Math.max(s.min.x-target.pos.x,0,target.pos.x-s.max.x),Math.max(s.min.z-target.pos.z,0,target.pos.z-s.max.z))})),probes:probes.map(p=>p.label)}));
  for(const probe of probes)for(const delay of [0,.2,.4]){
    const result=flight(f,target,{...probe,crown:true,delay});
    expect(result.landed,`${id}: ${probe.label} delay${delay} peak${result.peak}`).toBe(false);
    expect(result.peak,`${id}: ${probe.label} absolute peak`).toBeLessThan(target.pos.y);
  }
  f.stage.dispose();
});

for(const id of [1,2,3,4,'ride','cave'])it(`proposal ${id}: Moon has a repeatable landing window at60 and120Hz`,()=>{
  const f=build(id),extra=addMoonReturnExtras(f.k,f.stage,id);
  for(const dt of [1/60,1/120])for(const delay of [.35,.4,.45]){
    expect(flight(f,extra.ledge,{moon:true,start:extra.launchWorld,support:extra.pad.solid,dt,delay}).landed,`${dt}/${delay}`).toBe(true);
  }
  f.stage.dispose();
});

it('L3 floor-height Moon candidate would admit the existing nearby stack and Crown',()=>{
 const f=build(3),low=f.k.moonLedge(-3,6.25,84);
 const stack=f.stage.entities.filter(e=>e.kind==='backpack'&&e.solid?.max.y>1.5).sort((a,b)=>a.pos.distanceTo(low.pos)-b.pos.distanceTo(low.pos))[0];
 expect(stack).toBeDefined();
 const start=stack.pos.clone();start.y=stack.solid.max.y;
 const results=[0,.1,.2,.3,.4,.5,.6,.7,.8].map(delay=>flight(f,low,{start,support:stack.solid,crown:true,delay}));
 expect(results.some(r=>r.landed)).toBe(true);
 f.stage.dispose();
});

it('keeps the40 authored dogs and one original HiddenBone per covered stage',()=>{
 let total=0;
 for(const [id,expected]of [[1,9],[2,7],[3,9],[4,7],['ride',4],['cave',4]]){
  const f=build(id),before=f.stage.entities.filter(e=>e.countable).length;
  addMoonReturnExtras(f.k,f.stage,id);addColoredReturnExtras(f.k,f.stage,id);
  const dogs=f.stage.entities.filter(e=>e.constructor.name==='ConedDog');
  expect(dogs).toHaveLength(expected);total+=dogs.length;
  expect(f.stage.entities.filter(e=>e.constructor.name==='HiddenBone')).toHaveLength(1);
  expect(f.stage.entities.filter(e=>e.countable)).toHaveLength(before);
  f.stage.dispose();
 }
 expect(total).toBe(40);
});

it('Ride Moon remains inside the real Sofa bonus lifecycle and returns to the main route',async()=>{
 const f=build('ride'),extra=addMoonReturnExtras(f.k,f.stage,'ride');
 const loop=f.stage.detours.find(e=>e.constructor.name==='SofaLoop');
 f.game.mask={snapTo:noop};
 await f.game.session.enterBonusRound(loop);
 expect(f.game.session.bonusRound?.tray).toBe(loop);
 expect(flight(f,extra.ledge,{moon:true,start:extra.launchWorld,support:extra.pad.solid}).landed).toBe(true);
 expect(f.p.body.s).toBeLessThan(203);
 expect(f.game.session.bonusRound?.tray).toBe(loop);
 await f.game.session._leaveBonusRound(true);
 expect(f.game.session.bonusRound).toBeNull();
 expect(loop.used).toBe(true);
 expect(f.p.pos.distanceTo(f.k.W(0,0,176))).toBeLessThan(.001);
 f.stage.dispose();
});
