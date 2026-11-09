import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
vi.mock('../src/art/assets.js',()=>({Assets:{has:()=>false,model:()=>null,animate:()=>null,aspect:()=>1,
  tex:()=>new THREE.Texture({width:256,height:256}),tiled:()=>new THREE.Texture({width:256,height:256}),url:()=>''}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn()}}));
const gradient={addColorStop(){}};
const ctx=new Proxy({measureText:()=>({width:100}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,
  createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)})},
  {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
HTMLCanvasElement.prototype.getContext=()=>ctx;
const {Stage}=await import('../src/world/stage.js');
const {Track,turtle}=await import('../src/world/track.js');
const {SpinDrum,RugPull}=await import('../src/entities/props2.js');
const {CamZone}=await import('../src/entities/environment.js');
const {Glowworm}=await import('../src/entities/glowworm.js');
const {Detour}=await import('../src/levels/environmentKit.js');
const {FactoryDetourRecovery}=await import('../src/levels/factoryControllers.js');
const {TopplingPost,YarnAvalanche}=await import('../src/entities/canyonHazards.js');
const {makeKit}=await import('../src/levels/kit.js');
const {Chaser}=await import('../src/entities/chaser.js');
const {DustBunny,Iron}=await import('../src/entities/laundry.js');
afterEach(()=>vi.restoreAllMocks());
function fixture(mirror){
  const noop=()=>{};
  const game={session:{remix:mirror,phase:'level',def:{tier:3},nextSeq:()=>1,runSeed:42,
    cp:{pos:new THREE.Vector3()},snack:{raw:0},freedIds:new Set(),coconutSeq:0,coconutSpawned:0,collectedCoconuts:new Set()},
    player:{pos:new THREE.Vector3(),vel:new THREE.Vector3(),abilities:{zoom:true},body:{s:40,u:0,grounded:false},dead:true},
    ui:{tutorial:noop,banner:noop},fx:new Proxy({},{get:()=>noop}),camera:{setMode:vi.fn(),shake:noop}};
  const stage=new Stage(game,1),track=new Track(turtle([5,0,8],[[40,32,1],[40,-51,-1]]),{mirror});
  stage.setTrack(track);game.stage=stage;
  game.player.pos.copy(track.authorToWorld(40));
  return{game,stage,track};
}
function pair(factory){const a=fixture(false),b=fixture(true);return{a,b,x:factory(a),y:factory(b)};}
function near(a,b){expect(b.x).toBeCloseTo(10-a.x,4);expect(b.y).toBeCloseTo(a.y,4);expect(b.z).toBeCloseTo(a.z,4);}
it.each(['x','z'])('reflects actual drum %s platforms and Solid deltas at equal clock times',axis=>{
  const {a,b,x,y}=pair(f=>new SpinDrum(f.stage,f.track,30,{x:1.5,y:2,r:2,n:4,period:6,axis,phase:.2}));
  for(let i=0;i<70;i++){
    a.stage.world.beginFrame();b.stage.world.beginFrame();x.update(.04);y.update(.04);
    x.parts.forEach((p,j)=>{const q=y.parts[j];near(p.point,q.point);expect(q.solid.max.x).toBeCloseTo(10-p.solid.min.x,4);
      expect(q.solid.delta.x).toBeCloseTo(-p.solid.delta.x,4);expect(q.solid.delta.z).toBeCloseTo(p.solid.delta.z,4);});
  }
});
it('keeps Rug Pull tiles and physical Cat contact together after reflecting an off-center strip',()=>{
  const {a,b,x,y}=pair(f=>new RugPull(f.stage,f.track,10,28,{x:1.7,w:2.2,speed:7}));
  const addCat=f=>{const cat={kind:'cat',pos:f.track.authorToWorld(15,1.7),timer:-1,light:vi.fn()};f.stage.entities.push(cat);return cat;};
  const ca=addCat(a),cb=addCat(b);x.state=y.state='pulling';
  for(let i=0;i<30;i++){x.update(.1);y.update(.1);x.tiles.forEach((p,j)=>{const q=y.tiles[j];near(p.home,q.home);expect(q.state).toBe(p.state);expect(q.solid.min.x).toBeCloseTo(10-p.solid.max.x,4);});}
  expect(ca.light).toHaveBeenCalledOnce();expect(cb.light).toHaveBeenCalledOnce();
});
it('reflects side-camera selection and keeps Packaging ignoreDepth unchanged',()=>{
  const {x,y}=pair(f=>new CamZone(f.stage,f.track,10,30,'side',{side:-1,ignoreDepth:true}));
  expect(x.opts.side).toBe(-1);expect(y.opts.side).toBe(1);expect(y.opts.ignoreDepth).toBe(true);
});
it('reflects real chase corner steering and retains speed, gap and checkpoint restart',()=>{
  const {a,b,x,y}=pair(f=>{
    f.track.ground(-20,120);f.game.player.dead=false;f.game.player.die=vi.fn();
    return new Chaser(f.stage,f.track,5,79,{model:'smog_wall',speed:6.4,catchUpSpeed:9});
  });
  x.begin(5,0);y.begin(5,0);
  for(let i=0;i<240;i++){
    const s=20+i*.15,u=Math.sin(i/29)*1.4;
    for(const f of [a,b]){f.game.player.body.s=s;f.game.player.body.u=f.track.authorU(u);f.game.player.pos.copy(f.track.authorToWorld(s,u));}
    x.update(.02);y.update(.02);near(x.pos,y.pos);
    expect(y.speed).toBeCloseTo(x.speed,10);expect(y.s).toBeCloseTo(x.s,10);
    expect(y.u).toBeCloseTo(-x.u,10);expect(y.heading).toBeCloseTo(-x.heading,8);expect(y.lean).toBeCloseTo(-x.lean,8);
  }
  for(const f of [a,b])f.game.session.cp.pos.copy(f.track.authorToWorld(45,1));
  x.onRespawn();y.onRespawn();near(x.pos,y.pos);expect(y.waitT).toBe(x.waitT);expect(y.s).toBeCloseTo(x.s,10);
  expect(a.game.player.die).not.toHaveBeenCalled();expect(b.game.player.die).not.toHaveBeenCalled();
});
it('triggers an off-center Zoomie plate at its reflected physical u',()=>{
  const {a,b,x,y}=pair(f=>makeKit(f.game,f.stage,null,f.track).zoomieGate(2,0,30,{plateD:20}));
  for(const [f,gate] of [[a,x],[b,y]]){
    f.game.player.dead=false;gate.previousS=19;
    f.game.player.body.s=20;f.game.player.body.u=f.track.authorU(2);
    f.game.player.pos.copy(f.track.authorToWorld(20,2));gate.update(.01);
    expect(gate.timer).toBeCloseTo(2.49);
  }
  near(x.pos,y.pos);expect(y.u).toBe(-x.u);expect(y.raise).toBe(x.raise);
});
it('uses physical entry u for real Factory pipe and launch recovery snapshots',()=>{
  const {a,b}=pair(()=>null);
  const recovery=(f,launch)=>{
    const entryX=launch?-2.8:3,d=launch?276:10;
    const detour=new Detour(f.stage,f.track,d,d+2,{x:entryX,y:8,entry:'duct'});detour.travel=vi.fn();
    const r=new FactoryDetourRecovery(f.stage,detour,{entryX,launch,backD:d-1});
    Object.assign(f.game.player,{dead:false,frozen:false,mode:launch?'normal':'slide'});
    Object.assign(f.game.player.body,{s:d,u:f.track.authorU(entryX)});
    f.game.player.pos.copy(f.track.authorToWorld(d,entryX,launch?7:0));r.update();
    expect(r.snapshot).not.toBeNull();return r;
  };
  const x=recovery(a,false),y=recovery(b,false);near(x.snapshot.back,y.snapshot.back);
  const p=recovery(a,true),q=recovery(b,true);near(p.snapshot.back,q.snapshot.back);
});
it('reflects Lumi nests and shoulder-follow positions while retaining energy timing',()=>{
  const {x,y}=pair(f=>new Glowworm(f.stage,f.track,[10,30],{nestU:2.6}));
  x.nests.forEach((n,i)=>near(n.pos,y.nests[i].pos));
  for(let i=0;i<20;i++){x.update(.05);y.update(.05);near(x.pos,y.pos);expect(y.energy).toBe(x.energy);}
});
it('reflects authored Iron motion, hitboxes and puff positions at equal times',()=>{
  const {x,y}=pair(f=>new Iron(f.stage,f.track,20,45,{x:2,y:1,period:5.6}));
  for(let i=0;i<150;i++){x.update(.04);y.update(.04);near(x.pos,y.pos);expect(y.size.w).toBeCloseTo(x.size.w,10);expect(y.size.d).toBeCloseTo(x.size.d,10);expect(y.motion.leg).toBe(x.motion.leg);}
});
it('reflects a half Dust Bunny fallback flee while tier scaling leaves its flee clock unchanged',()=>{
  const {a,b,x,y}=pair(f=>new DustBunny(f.stage,...f.track.authorToWorld(35,1).toArray(),{half:true,side:1}));
  expect(x.movementMultiplier).toBe(1);expect(y.movementMultiplier).toBe(1.24);
  y.movementMultiplier=1;
  a.game.player.pos.copy(x.pos);b.game.player.pos.copy(y.pos);
  x.behave(.1);y.behave(.1);near(x.pos,y.pos);expect(y.fleeT).toBe(x.fleeT);
});
it('reflects seeded yarn volleys and post fall direction with unchanged safe-lane and tell clocks',()=>{
  const {a,b,x,y}=pair(f=>new YarnAvalanche(f.stage,f.track,60,{until:20,every:2,speed:6,lanes:[-2.8,0,2.8],skip:'shadow'}));
  expect(y.freeLane()).toBe(x.freeLane());x.timer=y.timer=0;
  for(let i=0;i<80;i++){x.update(.03);y.update(.03);expect(y.balls.length).toBe(x.balls.length);x.balls.forEach((ball,j)=>near(ball.m.position,y.balls[j].m.position));}
  const post=f=>{const p=f.track.authorToWorld(30,1);return new TopplingPost(f.stage,...p.toArray(),{w:4,period:4,phase:0,yaw:f.track.yaw(30)});};
  const p=post(a),q=post(b);
  for(let i=0;i<80;i++){p.update(.05);q.update(.05);expect(q.dangerous).toBe(p.dangerous);near(p.pivot.localToWorld(new THREE.Vector3(0,4,0)),q.pivot.localToWorld(new THREE.Vector3(0,4,0)));}
});
