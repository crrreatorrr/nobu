import * as THREE from 'three';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('../src/art/assets.js',()=>({Assets:{has:()=>false,model:()=>null,animate:()=>null,aspect:()=>1,tex:()=>new THREE.Texture({width:16,height:16}),tiled:()=>new THREE.Texture({width:16,height:16}),url:()=>''}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn(),musicTime:()=>null}}));
import {pipelineFixture} from './pipelineFixture.js';
import {pipelineJump} from './pipelineWorld.js';
import {validatePattern,reach,simJump} from '../src/levels/gauntletMath.js';
import {moveBody} from '../src/world/physics.js';
import {input} from '../src/core/input.js';
import {pipelineBidPattern,pipelineLiquidationPatterns} from '../src/levels/data/pipelineRoutes.js';
import {resetWorld} from './helpers.js';
import {run,budget} from '../tools/audit/chaseModel.js';
import {L5_CHASE,L5_CHASE_ITEMS} from '../src/levels/data/pipeline.js';
const fixtures=[],build=o=>{const f=pipelineFixture(o);fixtures.push(f);return f;};
beforeEach(()=>resetWorld());afterEach(()=>{for(const f of fixtures.splice(0))f.stage.dispose();vi.restoreAllMocks();});
it('retains literal BidWall reach counterexamples and validates the minimal lateral corrections plus full Liquidation entries',()=>{
 expect(validatePattern(pipelineBidPattern({corrections:false})).some(p=>p.problem.includes('Reach'))).toBe(true);
 expect(validatePattern(pipelineBidPattern())).toEqual([]);
 for(const p of pipelineLiquidationPatterns())expect(validatePattern(p),p.id).toEqual([]);
});
it('registers the full dev patterns and checks their authored pieces against actual actors and ground',()=>{
 const f=build(),patterns=f.stage.timedPatterns.filter(p=>p.id.startsWith('L5-')),names={pack:'backpack',blink:'blinkbox',arrow:'arrowbox',slide:'slidebox',fall:'fallbox'};
 expect(patterns.map(p=>p.id)).toEqual(['L5-BidWall','L5-LiquidationArrows','L5-LiquidationExit']);
 for(const pattern of patterns){expect(validatePattern(pattern)).toEqual([]);for(const p of pattern.pieces){
  const world=f.k.W(p.x,p.y,p.dd);
  if(p.kind.startsWith('floor')){const inside=f.k.W(p.x,p.y,p.dd+(p.kind==='floorEnd'?-.2:.2));expect(f.stage.world.groundBelow(inside.x,inside.y+.03,inside.z,.1),`${pattern.id}/${p.kind}/${p.dd}`).toBeCloseTo(world.y);}
  else expect(f.stage.entities.some(e=>e.kind===names[p.kind]&&e.home.distanceTo(world)<.03),`${pattern.id}/${p.kind}/${p.dd}`).toBe(true);
 }}
});
it('lands actual BidWall collision surfaces with the enclosing timing panels present',()=>{
 const f=build();const blink=f.stage.timedBoxes.find(b=>b.d===238.5).entity;blink.solid.enabled=true;
 const route=[[[0,0,235.6],[-2,.98,238.5],{}],[[-2,.98,238.5],[1.7,1,242.5],{}],[[1.7,1,242.5],[-1.1,1.6,246.5],{velocity:10.5*1.15}]];
 for(const[a,b,o]of route)expect(pipelineJump(f,a,b,{...o,realPlayer:true}).passed,`Bid ${a[2]}→${b[2]}`).toBe(true);
 const slider=f.stage.timedBoxes.find(b=>b.d===250.5).entity;
 expect(pipelineJump(f,[-1.1,1.6,246.5],[1.4,.98,250.5],{velocity:10.5*1.15,realPlayer:true}).passed).toBe(true);
 expect([...f.stage.pipeline.bidShutter.contacts].map(e=>e.kind)).toEqual(['blinkbox','slidebox']);expect(f.stage.pipeline.bidShutter.open).toBe(true);expect(pipelineJump(f,[1.4,.98,250.5],[0,0,252.4]).passed).toBe(true);expect(slider.solid.enabled).toBe(true);
});
it('lands actual Liquidation held-arrow entries and final double/fall/bounce route',()=>{
 const f=build();f.stage.timedBoxes.find(b=>b.d===405).entity.solid.enabled=true;vi.spyOn(input,'held').mockImplementation(k=>k==='jump');
 const route=[[[0,0,401.8],[0,1.78,405],{}],[[0,1.78,405.6],[0,2.18,409.5],{}],[[0,2.18,409.5],[0,5.18,414],{velocity:16*1.15,cut:true}],[[0,5.18,414],[-1.1,5.2,418.5],{velocity:16*1.15,cut:true}],[[0,0,435.6],[0,2.58,439.5],{doubleAt:.3}],[[0,2.58,439.5],[0,3,443],{}],[[0,3,443],[0,0,446.5],{velocity:10.5*1.15}]];
 for(const[a,b,o]of route){const result=pipelineJump(f,a,b,{...o,realPlayer:true});expect(result.passed,`Liquidation ${a[2]}→${b[2]} contacts:${[...f.stage.pipeline.liquidationShutter.contacts].map(e=>e.kind)}`).toBe(true);}
 expect(f.stage.pipeline.liquidationShutter.open).toBe(true);expect(f.stage.pipeline.liquidationShutter.contacts.size).toBe(4);
});
it('fits every required Smog stop inside the cumulative75percent budget and preserves a failing pressure control',()=>{
 const stops=[];
 for(const item of L5_CHASE_ITEMS){const duration=item.kind==='dog'?.34:.1;expect(duration).toBeLessThanOrEqual(budget(L5_CHASE,stops,item.d)*.75);stops.push({d:item.d-.8,dur:duration});}
 expect(run({...L5_CHASE,stops}).dead).toBe(false);expect(run({...L5_CHASE,stops:[...stops,{d:178,dur:2}]}).dead).toBe(true);
});
it('lands the moving BidWall receiver during a wide actual-world phase window',()=>{
 const f=build(),slider=f.stage.timedBoxes.find(b=>b.d===250.5).entity,air=reach('bounceHeld',-.62).air;
 let accepted=0;
 for(let i=0;i<32;i++){
  const begin=i*Math.PI*2/slider.speed/32;slider.clock.t=begin;slider.update();
  const u=1.4+Math.sin((begin+air)*slider.speed)*slider.range;
  const result=pipelineJump(f,[-1.1,1.6,246.5],[u,.98,250.5],{velocity:10.5*1.15,step:dt=>{f.stage.world.beginFrame();slider.clock.t+=dt;slider.update();}});
  if(result.passed)accepted++;
 }
 expect(accepted).toBeGreaterThanOrEqual(8);
});
it('reaches the twice-pumped high-pack platform without a later move',()=>{
 const f=build(),stone=f.stage.entities.find(e=>e.constructor.name==='PumpStone'&&Math.abs(f.track.project(e.home.x,e.home.z).s-85.5)<.05);
 stone.onLand();stone.update(.25);stone.supported=false;stone.onLand();stone.update(.25);
 expect(stone.pos.y).toBeCloseTo(2.4);expect(pipelineJump(f,[-1.2,2.4,85.5],[-3,3.4,86]).passed).toBe(true);
});

function marketAttempt(f,from,to,time,movingFrom=null,moveTime=.8){
 const clock=f.stage.marketClock,markets=clock.platforms;clock.t=time;clock.k=Math.floor(time/clock.step);for(const m of markets)m.update();
 const start=f.k.W(...from);if(movingFrom)start.y=movingFrom.pos.y;
 const end=to.pos.clone(),body={pos:start.clone(),vel:new THREE.Vector3(),hw:.3,hd:.3,h:1.3,grounded:false};
 const trace=simJump({doubleAt:.3,dy:-12});
 const vx=(end.x-start.x)/moveTime,vz=(end.z-start.z)/moveTime;if(Math.hypot(vx,vz)>8)return false;
 for(let i=1;i<trace.samples.length;i++){
  const sample=trace.samples[i],dt=1/60;f.stage.world.beginFrame();clock.update(dt);for(const m of markets)m.update();
  body.vel.set(sample.t<=moveTime?vx:0,sample.vy,sample.t<=moveTime?vz:0);moveBody(f.stage.world,body,dt);
  if(body.grounded)return body.ground===to.solid;
 }return false;
}
it('provides real moving-platform boarding windows for every chimney climb',()=>{
 const f=build(),m=d=>f.stage.marketClock.platforms.find(e=>Math.abs(f.track.project(e.home.x,e.home.z).s-d)<.05);
 const links=[[[0,0,289.6],m(292.5),null],[[0,1.6,292.5],m(295.5),m(292.5)],[[2.2,4,295.5],m(298.5),m(295.5)],[[-2,6.4,298.5],m(301.5),m(298.5)]];
 for(const[from,to,source]of links){let boarded=false;for(let i=0;i<48&&!boarded;i++)for(const duration of[.7,.9,1.1])if(marketAttempt(f,from,to,i*f.stage.marketClock.step/8,source,duration)){boarded=true;break;}expect(boarded,`chimney ${from[2]}`).toBe(true);}
});
it('uses the actual fan force and Player jump to reach the fifteen-metre catwalk',()=>{
 const f=build(),fan=f.stage.entities.find(e=>e.constructor.name==='UpdraftFan'&&Math.abs(f.track.project(e.home.x,e.home.z).s-304.5)<.1);
 expect(fan).toBeTruthy();const pressed=vi.spyOn(input,'pressed'),held=vi.spyOn(input,'held');pressed.mockReturnValue(false);held.mockReturnValue(false);input.state.x=input.state.y=0;
 f.p.spawnAt(f.k.W(-.4,10,304.5),f.track.yaw(304.5));for(let i=0;i<8;i++)f.tick(1/120,[fan]);expect(f.p.body.grounded).toBe(true);
 let crossed=false,max=10;held.mockImplementation(k=>k==='jump');
 for(let i=0;i<600&&!f.p.dead;i++){
  pressed.mockImplementation(k=>k==='jump'&&i===0);
  if(f.p.pos.y>15.7)crossed=true;const dir=(crossed?f.k.W(0,15,307):fan.pos.clone()).sub(f.p.pos).setY(0);if(dir.length()>.15){dir.normalize();input.state.x=dir.x;input.state.y=-dir.z;}else input.state.x=input.state.y=0;
  f.tick(1/120,[fan]);max=Math.max(max,f.p.pos.y);
  if(f.p.body.grounded&&f.p.body.s>=306&&f.p.pos.y>=14.9)break;
 }
 input.state.x=input.state.y=0;expect(max).toBeGreaterThan(16.4);expect(f.p.dead).toBe(false);expect(f.p.body.grounded).toBe(true);expect(f.p.pos.y).toBeCloseTo(15);expect(f.p.body.s).toBeGreaterThanOrEqual(306);
});
it('keeps the Order Book sky route above the sealed BidWall and returns falls to its entry',async()=>{
 const f=build(),detour=f.stage.pipeline.detours[0],m=d=>f.stage.marketClock.platforms.find(e=>e.detour&&Math.abs(f.track.project(e.home.x,e.home.z).s-d)<.05);
 let boarded=false;
 for(let i=0;i<64&&!boarded;i++)for(const duration of[.7,.9,1.1])if(marketAttempt(f,[2.6,10,234],m(238.5),i*f.stage.marketClock.step/8,null,duration)){boarded=true;break;}
 expect(boarded).toBe(true);
 const rest=f.k.platform(2.6,10,252,3,3);expect(pipelineJump(f,[2.6,10,250],[2.6,10,252.5]).passed).toBe(true);expect(rest.solid.enabled).toBe(true);
 detour.pipelineActive=true;f.p.spawnAt(f.k.W(0,7.8,260),f.track.yaw(260));detour.update();
 await Promise.resolve();await Promise.resolve();
 expect(f.p.body.s).toBeCloseTo(232,1);expect(f.p.pos.distanceTo(detour.pipelineDock)).toBeLessThan(.1);expect(detour.pipelineActive).toBe(false);
});
it('boards each remaining Order Book market and crosses its permanent and crumble return supports',()=>{
 const f=build(),markets=f.stage.marketClock.platforms.filter(e=>e.detour),m=d=>markets.find(e=>Math.abs(f.track.project(e.home.x,e.home.z).s-d)<.05);
 const stone=f.stage.entities.find(e=>e.kind==='pumpstone'&&e.detour),rest=f.stage.entities.find(e=>e.detour&&e.solid&&Math.abs(f.track.project(e.home.x,e.home.z).s-261)<.05&&e.home.y===10);
 for(const[from,to,source]of[[[2.6,10,238.5],m(243),m(238.5)],[[2.6,10,243],stone,m(243)],[[2.6,10,252],m(256.5),null]]){
  let boarded=false;for(let i=0;i<64&&!boarded;i++)for(const duration of[.7,.9,1.1])if(marketAttempt(f,from,to,i*f.stage.marketClock.step/8,source,duration)){boarded=true;break;}expect(boarded,`Order Book ${from[2]}`).toBe(true);
 }
 expect(rest).toBeTruthy();
 const legs=[[[2.6,11.4,247.5],[2.6,10,251],{}],[[2.6,10,262],[2.6,10,266],{}],[[0,15,270],[-2.6,15,268],{}],[[-2.6,16,254],[-3.6,14.8,252.6],{}],[[-3.6,14.8,252.6],[-2.6,14.8,248.4],{}],[[-2.6,14.8,248.4],[-2.6,14.8,244.8],{}],[[-2.6,14.8,244.8],[-3.6,14.8,241.6],{}]];
 for(const[a,b,o]of legs)expect(pipelineJump(f,a,b,o).passed,`Order Book ${a[2]}→${b[2]}`).toBe(true);
});
