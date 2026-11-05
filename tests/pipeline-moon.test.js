import * as THREE from 'three';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('../src/art/assets.js',()=>({Assets:{has:()=>false,model:()=>null,animate:()=>null,aspect:()=>1,tex:()=>new THREE.Texture({width:16,height:16}),tiled:()=>new THREE.Texture({width:16,height:16}),url:()=>''}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn(),musicTime:()=>null}}));
import {pipelineFixture} from './pipelineFixture.js';
import {buildPipelineMoon} from '../src/levels/pipelineMoon.js';
import {Session} from '../src/game/session.js';
import {save} from '../src/core/save.js';
import {input} from '../src/core/input.js';
import {itemById} from '../src/gear/catalog.js';
import {resetWorld} from './helpers.js';
const fixtures=[];let pressed=new Set(),held=new Set();
beforeEach(()=>{resetWorld();pressed.clear();held.clear();input.state.x=input.state.y=0;vi.spyOn(input,'pressed').mockImplementation(k=>pressed.has(k));vi.spyOn(input,'held').mockImplementation(k=>held.has(k));});
afterEach(()=>{for(const f of fixtures.splice(0))f.stage.dispose();input.state.x=input.state.y=0;vi.restoreAllMocks();});
function build({moon=false,crown=false,clown=false,remove=false}={}){
 for(const id of[1,2,3,4,6])save.data.beaten[id]=true;save.data.beaten[5]=moon;save.data.godMode=false;
 const f=pipelineFixture({session:{addTickets:()=>{}}});fixtures.push(f);
 f.game.loadout.effects={};
 for(const id of[crown&&'nobu_champions_crown',clown&&'nobu_clown_collar'])if(id){const item=itemById(id);for(const e of item.effects??[item.effect])f.game.loadout.effects[e.id]=e.params;}
 f.session.collectHiddenBone=()=>Session.prototype.collectHiddenBone.call(f.session);
 f.moon=buildPipelineMoon(f.stage,f.track,f.k,{ledge:f.stage.pipeline.moon,hidden:f.stage.pipeline.hidden});
 if(remove)for(const s of f.moon.shell.solids)s.enabled=false;
 return f;
}
function spawn(f,x,y,d){f.tickets.clearFlying();pressed.clear();held.clear();input.state.x=input.state.y=0;f.p.spawnAt(f.k.W(x,y,d),f.track.yaw(d));f.p.body.grounded=true;f.p.body.s=d;f.p.body.u=x;}
function tick(f){f.stage.update(1/120,f.p);f.p.update(1/120,f.stage,{right:f.track.right(f.p.body.s),forward:f.track.tangent(f.p.body.s)});pressed.clear();}
function steer(f,target){const v=target.clone().sub(f.p.pos);v.y=0;const n=v.length();input.state.x=n>.12?v.dot(f.track.right(f.p.body.s))/n:0;input.state.y=n>.12?v.dot(f.track.tangent(f.p.body.s))/n:0;}
function crownAttempt(f,{x=0,y=15,d=327,jumps=[0,45,90],direction=0,dash=false,action='bite'}={}){
 for(const e of f.stage.entities)if(e.broken)e.restore?.();
 spawn(f,x,y,d);held.add('jump');let peak=f.p.pos.y,sawDash=false;
 for(let frame=0;frame<300&&!f.p.dead&&!f.moon.hidden.dead;frame++){
  if(jumps==='apex'?(frame===0||f.p.canDouble&&f.p.vel.y<.4&&f.p.vel.y>-.8):jumps.includes(frame))pressed.add('jump');if(action!=='touch'&&frame>70&&frame%3===1)pressed.add('bite');
  if(dash&&frame===100)pressed.add('dash');if(action==='slide'&&frame===0||action==='flop'&&frame===110)pressed.add('slide');input.state.y=direction;tick(f);peak=Math.max(peak,f.p.pos.y);sawDash ||= f.p.airDashT>0;
 }
 return{sawDash,collected:f.moon.hidden.dead,peak,dead:f.p.dead};
}
it('rejects the reported legal Crown bite while removing the housing restores that exploit',()=>{
 const f=build({crown:true});expect(crownAttempt(f).collected).toBe(false);expect(save.data.boneBoard[5]?.hidden).not.toBe(true);
 const control=build({crown:true,remove:true});expect(crownAttempt(control).collected).toBe(true);
});
it('earned Moon without Crown lands on the inset top, collects the unchanged Hidden and exits alive',()=>{
 const f=build({moon:true});spawn(f,0,15,323.25);pressed.add('slide');held.add('slide');
 for(let i=0;i<74;i++)tick(f);expect(f.p.moonHold?.charged).toBe(true);
 pressed.add('jump');held.add('jump');tick(f);let doubled=false,landed=false;
 for(let frame=0;frame<260&&!f.p.dead;frame++){
  if(!doubled&&f.p.vel.y<.4&&f.p.canDouble){pressed.add('jump');doubled=true;}
  if(frame>80)steer(f,f.moon.landing);tick(f);
  if(f.p.body.grounded&&f.p.pos.y>21){landed=true;break;}
 }
 expect(landed).toBe(true);
 const goal=f.k.W(0,21.2,327);for(let i=0;i<180&&!f.moon.hidden.dead;i++){steer(f,goal);tick(f);}
 expect(f.moon.hidden.dead).toBe(true);expect(save.data.boneBoard[5]?.hidden).toBe(true);
 expect(f.moon.hidden.pos.distanceTo(f.k.W(0,21.2,327))).toBeLessThan(.001);
 const exit=f.k.W(0,15,322.1);for(let i=0;i<900&&!f.p.dead;i++){steer(f,exit);tick(f);if(f.p.body.grounded&&f.p.pos.distanceTo(exit)<.25)break;}
 expect(f.p.dead).toBe(false);expect(f.p.body.grounded).toBe(true);expect(f.p.pos.distanceTo(exit)).toBeLessThan(.3);
});

it('the low door and thick podium preserve the pre-Queen main catwalk and Sphere interaction',()=>{
 const f=build();spawn(f,0,15,322.1);held.add('jump');
 const target=f.k.W(0,0,333.2);
 for(let i=0;i<700&&!f.p.dead;i++){
  if(i%30===0)pressed.add('bite');steer(f,target);tick(f);
  if(f.p.body.grounded&&f.p.pos.distanceTo(target)<.3)break;
 }
 expect(f.p.dead).toBe(false);expect(f.p.body.grounded).toBe(true);expect(f.p.pos.distanceTo(target)).toBeLessThan(.4);
 expect(f.stage.entities.find(e=>e.kind==='sphere'&&Math.abs(f.track.project(e.pos.x,e.pos.z).s-326)<.1)?.broken).toBe(true);
 expect(f.moon.hidden.dead).toBe(false);
});

it('keeps every Crown/Clown catwalk launch, bite, slide, flop and air dash outside the Hidden envelope',()=>{
 const f=build({crown:true,clown:true});expect(f.p.abilities.airDash).toBe(true);const boards=structuredClone(save.data.boneBoard);let dashes=0;
 for(const d of[322.05,323.1,323.5,324,325,326,327,328,329,330])for(const x of[-1.35,0,1.35])for(const direction of[-1,0,1])for(const action of['touch','bite','slide','flop']){
  f.moon.hidden.dead=false;f.p.bitten=new Set();
  const result=crownAttempt(f,{d,x,direction,dash:true,action});
  expect(result.collected,`${x}/${d}/${direction}/${action}`).toBe(false);dashes+=Number(result.sawDash);
  expect(save.data.boneBoard).toEqual(boards);
 }
 expect(dashes).toBeGreaterThan(0);
});

it('rejects the real Sphere stomp/refill and distant fan or backpack launches with legal Crown/Clown',()=>{
 const f=build({crown:true,clown:true});
 const sphere=f.stage.entities.find(e=>e.kind==='sphere'&&Math.abs(f.track.project(e.pos.x,e.pos.z).s-326)<.1);
 expect(sphere.solid).toBeUndefined();
 const stomp=vi.spyOn(sphere,'onStomp');
 spawn(f,0,16.3,326);f.p.body.grounded=false;f.p.vel.y=-3;held.add('jump');
 for(let frame=0;frame<300&&!f.p.dead;frame++){
  if(f.p.canDouble&&f.p.vel.y<.4&&f.p.vel.y>-.8)pressed.add('jump');
  if(frame>15&&frame%3===0)pressed.add('bite');if(frame===90)pressed.add('dash');
  steer(f,f.k.W(0,21.2,327));tick(f);
 }
 expect(stomp).toHaveBeenCalled();expect(f.moon.hidden.dead).toBe(false);
 const fan=f.stage.entities.find(e=>e.constructor.name==='UpdraftFan'&&Math.abs(f.track.project(e.pos.x,e.pos.z).s-304.5)<.1);
 expect(fan).toBeDefined();
 for(const delay of[90,120,150]){
  spawn(f,-1.8,10,304.5);held.add('jump');let peak=f.p.pos.y;
  for(let frame=0;frame<500&&!f.p.dead&&!f.moon.hidden.dead;frame++){
   if(frame===0)pressed.add('jump');
   if(f.p.canDouble&&f.p.vel.y<.4&&f.p.vel.y>-.8)pressed.add('jump');
   if(frame>100&&frame%3===1)pressed.add('bite');if(frame===delay+120)pressed.add('dash');
   if(frame>delay)steer(f,f.k.W(0,21.2,327));tick(f);peak=Math.max(peak,f.p.pos.y);
  }
  expect(peak).toBeGreaterThan(15);expect(f.moon.hidden.dead).toBe(false);
 }
 for(const x of[-1,1]){
  const result=crownAttempt(f,{x,y:16,d:310,jumps:[0,45,90],direction:1,dash:true});
  expect(result.collected,`backpack310/${x}`).toBe(false);
 }
 expect(save.data.boneBoard[5]?.hidden).not.toBe(true);
});

it('the Yellow ledge and real backpack stomp cannot import height past the low header',()=>{
 const f=build({crown:true,clown:true});
 for(const direction of[-1,0,1])expect(crownAttempt(f,{x:4,y:14.2,d:319,direction,dash:true}).collected).toBe(false);
 const pack=f.stage.entities.find(e=>e.kind==='backpack'&&Math.abs(f.track.project(e.pos.x,e.pos.z).s-310)<.1);
 expect(pack).toBeDefined();spawn(f,-1,16,310);held.add('jump');pack.restore();pack.onLand(f.p,3);
 expect(f.p.vel.y).toBeGreaterThan(0);expect(f.p.canDouble).toBe(true);
 for(let frame=0;frame<400&&!f.p.dead;frame++){
  if(f.p.canDouble&&f.p.vel.y<.4&&f.p.vel.y>-.8)pressed.add('jump');
  if(frame%3===1)pressed.add('bite');if(frame===100)pressed.add('dash');
  steer(f,f.k.W(0,21.2,327));tick(f);
 }
 expect(f.moon.hidden.dead).toBe(false);expect(save.data.boneBoard[5]?.hidden).not.toBe(true);
});

it('ordinary pre-Queen Double Jump and Glide still cross the original catwalk gap and low entry',()=>{
 const f=build();spawn(f,0,15,315.5);held.add('jump');let arrived=false;
 for(let frame=0;frame<800&&!f.p.dead;frame++){
  if([0,45,90].includes(frame))pressed.add('jump');input.state.y=f.p.body.s<323.3?1:0;tick(f);
  if(f.p.body.s>323&&f.p.body.grounded){arrived=true;break;}
 }
 expect(arrived).toBe(true);expect(f.p.dead).toBe(false);expect(f.p.pos.y).toBeCloseTo(15,2);expect(f.moon.hidden.dead).toBe(false);
});

it('inventories every nearby external World top across chimney market extrema',()=>{
 const f=build({crown:true,clown:true}),owned=new Set([...f.moon.shell.solids,f.moon.ledge.solid]);
 const atlas=[],clock=f.stage.marketClock;
 for(let phase=0;phase<16;phase++){
  clock.k=phase;clock.t=phase*clock.step+.45;
  for(const e of f.stage.entities)if(e.constructor.name==='MarketPlatform')e.update(0);
  for(const solid of f.stage.world.all){
   if(!solid.enabled||owned.has(solid))continue;
   const x=(solid.min.x+solid.max.x)/2,z=(solid.min.z+solid.max.z)/2;
   if(Math.hypot(x-f.moon.hidden.pos.x,z-f.moon.hidden.pos.z)>35)continue;
   atlas.push({kind:solid.ref?.constructor.name??solid.kind,top:solid.max.y});
  }
 }
 expect(atlas.some(row=>row.kind==='MarketPlatform')).toBe(true);
 expect(Math.max(...atlas.map(row=>row.top))).toBeLessThanOrEqual(16.001);
 expect(f.moon.shell.root.alwaysActive).toBe(true);
 expect(f.moon.shell.root.obj.children.some(mesh=>mesh.material?.opacity===1)).toBe(true);
});

it('also excludes apex-timed Crown jumps and attack reach from the open launch shaft',()=>{
 const f=build({crown:true,clown:true});
 for(const d of[322.05,323.1,323.5])for(const x of[-1.35,0,1.35])for(const direction of[-1,0,1]){
  expect(crownAttempt(f,{x,d,direction,jumps:'apex',dash:true}).collected,`${x}/${d}/${direction}`).toBe(false);
 }
});
