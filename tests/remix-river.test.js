import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import * as THREE from 'three';
vi.mock('../src/art/assets.js',()=>({Assets:{has:()=>false,model:()=>null,animate:()=>null,aspect:()=>1,tex:()=>new THREE.Texture({width:32,height:32}),tiled:()=>new THREE.Texture({width:32,height:32}),url:()=>''}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn(),musicTime:()=>null}}));
const noop=()=>{},gradient={addColorStop:noop};
const ctx=new Proxy({measureText:()=>({width:100}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]??noop});
HTMLCanvasElement.prototype.getContext=()=>ctx;HTMLCanvasElement.prototype.toDataURL=()=>'';
const {Stage}=await import('../src/world/stage.js');
const {Player}=await import('../src/player/player.js');
const {GameCamera}=await import('../src/camera/camera.js');
const {Track,turtle}=await import('../src/world/track.js');
const {makeKit}=await import('../src/levels/kit.js');
const {installRiverKit}=await import('../src/levels/riverKit.js');
const {Whirlpool,Outflow,Slick,DriftLog}=await import('../src/entities/river.js');
const {riverPanels,RiverLoop}=await import('../src/levels/riverRoutes.js');
const {rideGround}=await import('../src/world/physics.js');
const {TicketSystem}=await import('../src/entities/tickets.js');
const {LEVELS}=await import('../src/levels/registry.js');
const {ConedDog}=await import('../src/entities/dogs.js');
const {save}=await import('../src/core/save.js');
const {input}=await import('../src/core/input.js');
const stages=[];
beforeEach(()=>{save.reset();save.data.godMode=false;for(const id of[1,2,3,4,5])save.data.beaten[id]=true;vi.spyOn(input,'pressed').mockReturnValue(false);vi.spyOn(input,'held').mockReturnValue(false);input.state.x=input.state.y=0;});
afterEach(()=>{for(const stage of stages.splice(0))stage.dispose();vi.restoreAllMocks();input.state.x=input.state.y=0;});
function fixture(mirror,{builder=false}={}){
 const game={loadout:{effects:{},cosmeticSlots:()=>({})},camera:new GameCamera(1.5),ui:new Proxy({fade:async()=>{}},{get:(o,k)=>o[k]??noop}),fx:new Proxy({},{get:()=>noop}),maskPickup:noop,onFlop:noop,onPlayerDeath:vi.fn()};
 game.session={remix:mirror,phase:'level',level:6,def:LEVELS[6],deaths:0,deathsAtCp:0,runSeed:42,nextSeq:()=>1,onBreak:noop,onEnemyDefeated:noop,rescueDog:noop,addTickets:noop,checkpoint:noop,onPlayerHurt:noop,cp:{pos:new THREE.Vector3()}};
 const stage=new Stage(game,'river');stages.push(stage);game.stage=stage;game.player=new Player(game);game.player._animate=noop;game.player._updateShadow=noop;game.player._paintGear=noop;
 const tickets=game.tickets=new TicketSystem(game,stage);
 if(builder){stage.decor=noop;const rng=vi.spyOn(Math,'random').mockReturnValue(.37);try{const info=LEVELS[6].build(game,stage,tickets);return{game,stage,tickets,p:game.player,track:stage.track,info};}finally{rng.mockRestore();}}
 const track=new Track(turtle([5,0,8],[[45,35,0],[45,-51,-2],[20,14,0]]),{mirror});stage.setTrack(track);
 const k=installRiverKit(makeKit(game,stage,tickets,track),game,stage);k.walls([[0,4,6,3],[120,4,6,3]]);const span=k.raft(20,90);
 return{game,stage,track,k,span,p:game.player,tickets};
}
function reflect(a,b,axis=5){expect(b.x).toBeCloseTo(2*axis-a.x,5);expect(b.y).toBeCloseTo(a.y,5);expect(b.z).toBeCloseTo(a.z,5);}
function solids(a,b,axis=5){reflect({x:a.max.x,y:a.min.y,z:a.min.z},b.min,axis);reflect({x:a.min.x,y:a.max.y,z:a.max.z},b.max,axis);}
function place(f,d,u,y=-.98){f.p.spawnAt(f.track.authorToWorld(d,u,y),f.track.yaw(d));f.p.body.grounded=true;f.p.body.u=f.track.authorU(u);f.p.body.s=d;}
it.each(['whirlpool','left','right'])('reflects actual raft %s force and Player/World motion without scaling its clock',kind=>{
 const a=fixture(false),b=fixture(true);const actors=[a,b].map(f=>kind==='whirlpool'?new Whirlpool(f.stage,f.track,1.2,40):new Outflow(f.stage,f.track,40,{side:kind,push:4.2,period:2.2}));
 for(const [i,f]of[a,b].entries()){
  place(f,40,kind==='whirlpool'?-.4:kind==='left'?-2:3);f.stage.raftController.mount(f.span,1);f.stage.time=.2;f.p.pushX=f.p.pushZ=0;actors[i].update(.01);
 }
 expect(b.p.pushX).toBeCloseTo(-a.p.pushX,8);expect(b.p.pushZ).toBeCloseTo(a.p.pushZ,8);reflect(actors[0].pos,actors[1].pos);
 for(const f of[a,b])f.p.update(.01,f.stage,{right:f.track.right(40),forward:f.track.tangent(40)});reflect(a.p.pos,b.p.pos);
});
it('reflects a slick band and its real mesh while retaining the physical-u steering contract',()=>{
 const a=fixture(false),b=fixture(true),x=new Slick(a.stage,a.track,30,50,{x:-1.6,w:2}),y=new Slick(b.stage,b.track,30,50,{x:-1.6,w:2});
 for(const[f,e]of[[a,x],[b,y]]){place(f,40,-2);f.stage.raftController.mount(f.span,1);e.update(.1);expect(f.p.ride.slick).toBe(.25);}
 expect(y.x).toBe(-x.x);reflect(x.pos,y.pos);
 x.obj.updateMatrixWorld(true);y.obj.updateMatrixWorld(true);const ba=new THREE.Box3().setFromObject(x.obj),bb=new THREE.Box3().setFromObject(y.obj);solids(ba,bb);
});
it('reflects the complete off-center DriftLog trajectory, collision and accumulated carry delta',()=>{
 const a=fixture(false),b=fixture(true),x=new DriftLog(a.stage,a.track,40,{x:1.2,range:2.4,speed:1.3,phase:.4}),y=new DriftLog(b.stage,b.track,40,{x:1.2,range:2.4,speed:1.3,phase:.4});
 for(const[f,e]of[[a,x],[b,y]]){f.p.ride=null;f.p.pos.copy(e.pos).add(new THREE.Vector3(0,.85,0));f.p.body.grounded=true;f.p.body.ground=e.solid;}
 for(let i=0;i<90;i++){
  a.stage.world.beginFrame();b.stage.world.beginFrame();x.update(.02);y.update(.02);rideGround(a.p.body);rideGround(b.p.body);
  reflect(x.pos,y.pos);reflect(a.p.pos,b.p.pos);solids(x.solid,y.solid);
  expect(y.solid.delta.x).toBeCloseTo(-x.solid.delta.x,8);expect(y.solid.delta.z).toBeCloseTo(x.solid.delta.z,8);
 }
 x.onRespawn();y.onRespawn();reflect(x.pos,y.pos);expect(x.solid.delta).toEqual(y.solid.delta);
});
it('reflects seeded river barrel lanes without changing their phase, rewards or speed',()=>{
 const a=fixture(false),b=fixture(true);vi.spyOn(Math,'random').mockReturnValue(.37);
 const x=a.k.coconuts(70,{until:30,every:1,speed:5,lanes:[-3,1,2],mesh:'barrel',reward:false});
 const y=b.k.coconuts(70,{until:30,every:1,speed:5,lanes:[-3,1,2],mesh:'barrel',reward:false});
 for(const f of[a,b])place(f,40,0);x.timer=y.timer=0;
 for(let i=0;i<40;i++){x.update(.02);y.update(.02);expect(y.timer).toBe(x.timer);expect(y.balls.length).toBe(x.balls.length);x.balls.forEach((ball,j)=>{reflect(ball.m.position,y.balls[j].m.position);expect(y.balls[j].u).toBe(-ball.u);});}
 expect(x.reward).toBe(false);expect(y.reward).toBe(false);
});
it('keeps boats, real mount/checkpoint/dismount and asymmetric bank choices reflected',()=>{
 const a=fixture(false),b=fixture(true);
 for(const f of[a,b]){place(f,21,2);f.stage.raftController.update(.02);expect(f.p.ride.meshKind).toBe('raft');expect(f.p.ride.speedK).toBe(.5);}
 for(const name of['moored','beached'])reflect(a.stage.raftController.boats[0][name].position,b.stage.raftController.boats[0][name].position);
 for(const f of[a,b]){place(f,45,3);f.stage.raftController.restoreAtCheckpoint(f.p.pos);expect(f.p.ride.speedK).toBe(.35);place(f,90,3);f.stage.raftController.update(.02);expect(f.p.ride).toBeNull();expect(f.p.vel.y).toBe(7.5);}
 reflect(a.p.pos,b.p.pos);expect(b.game.camera.opts).toMatchObject({height:a.game.camera.opts.height,dist:a.game.camera.opts.dist});
});
it('reflects off-center actual panel solids and loop entry/return only once',async()=>{
 const a=fixture(false),b=fixture(true),panels=[a,b].map(f=>{const panel=riverPanels(f.stage,f.track,'paired-panel');panel.panel(2.3,40,3,.4,-2,4);panel.finish();return panel;});
 panels[0].solids.forEach((s,i)=>solids(s,panels[1].solids[i]));
 for(const f of[a,b]){
  const d=f.k.detour(30,32,{x:3,y:10,entry:'pipe',build:kd=>{kd.floor(30,40,{x:1,w:3});kd.start(1,.05,30);}});
  const loop=new RiverLoop(f.stage,d,{end:40,returnU:-2});await loop.travel(d.startPos,30);expect(f.p.body.u).toBeCloseTo(f.track.authorU(1),3);f.loop=loop;
 }
 reflect(a.p.pos,b.p.pos);for(const f of[a,b])await f.loop.returnToDock();reflect(a.p.pos,b.p.pos);expect(b.p.body.u).toBeCloseTo(-a.p.body.u,3);
});
it('pairs actual Level6 Golden inventory, collision and pickups with explicit optional Moon omissions',()=>{
 const a=fixture(false,{builder:true}),b=fixture(true,{builder:true}),axis=a.track.mirrorAxisX;
 expect(a.track.length).toBe(b.track.length);reflect(a.info.spawn,b.info.spawn,axis);
 const aa=a.stage.entities.filter(e=>e.countable),bb=b.stage.entities.filter(e=>e.countable);expect(aa).toHaveLength(48);expect(bb).toHaveLength(48);aa.forEach((e,i)=>reflect(e.pos,bb[i].pos,axis));
 const da=a.stage.entities.filter(e=>e instanceof ConedDog),db=b.stage.entities.filter(e=>e instanceof ConedDog);expect(da).toHaveLength(7);expect(db.map(e=>e.dogId)).toEqual(da.map(e=>e.dogId));da.forEach((e,i)=>reflect(e.pos,db[i].pos,axis));
 const moon=a.stage.rapids.moon;expect(moon).toBeTruthy();expect(b.stage.rapids.moon).toBeNull();const moonTickets=new Set(moon.reward),ta=a.tickets.list.filter(t=>!moonTickets.has(t));expect(ta.length).toBe(b.tickets.list.length);ta.forEach((t,i)=>reflect(t,b.tickets.list[i],axis));
 const omitted=new Set([...moon.shell.solids,moon.floor.solid,moon.bridge.solid,moon.ledge.solid]),sa=a.stage.world.all.filter(s=>!omitted.has(s));expect(sa.length).toBe(b.stage.world.all.length);sa.forEach((s,i)=>solids(s,b.stage.world.all[i],axis));
 aa.forEach((e,i)=>{const ga=a.stage.world.groundBelow(e.pos.x,e.pos.y+.1,e.pos.z,.05),q=bb[i],gb=b.stage.world.groundBelow(q.pos.x,q.pos.y+.1,q.pos.z,.05);expect(gb).toBeCloseTo(ga,4);});
});
