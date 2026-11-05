import{test,expect,vi,beforeEach,afterEach}from'vitest';
import * as THREE from'three';
vi.mock('../src/art/assets.js',()=>({Assets:{has:()=>false,model:()=>null,animate:()=>null,aspect:()=>1,tex:()=>new THREE.Texture(),tiled:()=>new THREE.Texture(),url:()=>''}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn()}}));
import{riverFixture}from'./riverFixture.js';
import{input}from'../src/core/input.js';
import{save}from'../src/core/save.js';
import{TUNING}from'../src/config/movement.js';
import{L6_RAFT_SPANS,L6_RAFT_ITEMS,L6_RAFT_ITEMS_LITERAL}from'../src/levels/data/rapids.js';
import{raftFeasibility}from'../src/game/raft.js';
import{writeFileSync}from'node:fs';
beforeEach(()=>{save.reset();save.data.godMode=false;vi.spyOn(input,'pressed').mockReturnValue(false);vi.spyOn(input,'held').mockReturnValue(false);input.state.x=0;input.state.y=0;});afterEach(()=>vi.restoreAllMocks());
test('real Player raft hop uses its multiplier and rejects Crown extra jumps, paid dash and inherited Glide; vacuum remains unchanged',()=>{
 const f=riverFixture({moves:[[100,0,0]]}),{p,k,track,tick,game}=f;const span=k.raft(10,90,{hop:.8});p.spawnAt(track.toWorld(20,0,-.98));p.body.grounded=true;game.loadout.effects={extra_air_jumps:{count:2},air_dash:{charges_per_jump:1,dash_time_s:.2,distance_m:3}};save.data.beaten[1]=true;p.setRide({...span.cfg,mesh:'raft'});stageSetup(f,span);input.pressed.mockImplementation(a=>a==='jump');input.held.mockImplementation(a=>a==='jump');tick();expect(p.vel.y).toBeCloseTo(TUNING.JUMP*.8-TUNING.GRAVITY/120);expect(p.canDouble).toBe(false);expect(p.airJumps).toBe(0);
 input.pressed.mockReturnValue(false);for(let i=0;i<10;i++)tick();const vy=p.vel.y;input.pressed.mockImplementation(a=>a==='jump'||a==='dash');p.dashCharges=1;tick();expect(p.vel.y).toBeLessThan(vy);expect(p.airDashT).toBe(0);expect(p.glideOn).toBe(false);expect(p.dashCharges).toBe(1);
 p.setRide({speed:10.5});p._jump(TUNING.JUMP);expect(p.vel.y).toBe(TUNING.JUMP);expect(p.airJumps).toBe(3);f.stage.dispose();
});
function stageSetup(f,span){f.stage.raftController.current=span;pRide(f.p,span);}
function pRide(p,span){p.ride.raftSpan=span;p.ride.speedK=1;}
test('real maskless Player stalls and bumps on a static log without damage, while the vacuum retains its generic collision damage',()=>{
 const outcomes=[];for(const kind of['raft','vacuum']){const f=riverFixture({moves:[[100,0,0]]}),{p,k,track,tick,game}=f;const span=k.raft(10,90);k.log(30,{h:.6,w:4.4,x:0});p.spawnAt(track.toWorld(27,0,-.98));p.body.grounded=true;p.setRide({...span.cfg,mesh:kind});if(kind==='raft')stageSetup(f,span);else f.stage.raftController.current=span;p.ride.speedK=1;let stalled=false;for(let i=0;i<120&&!p.dead;i++){tick();if(p.ride.speedK<.5){stalled=true;break;}}outcomes.push({kind,dead:p.dead,death:p.deathType,stalled,vy:p.vel.y,hurts:game.onPlayerDeath.mock.calls.length});f.stage.dispose();}
 writeFileSync('/tmp/h45-static-log-player.json',JSON.stringify(outcomes,null,2));expect(outcomes[0]).toMatchObject({dead:false,stalled:true,hurts:0});expect(outcomes[0].vy).toBe(11);expect(outcomes[1]).toMatchObject({dead:true,death:'flat'});
});
test('literal raft pairs fail required perturbation and minimal coordinate candidates clear the conservative formula',()=>{
 const literal=raftFeasibility(L6_RAFT_ITEMS_LITERAL,L6_RAFT_SPANS,{perturb:.5}),candidate=raftFeasibility(L6_RAFT_ITEMS,L6_RAFT_SPANS,{perturb:.5});writeFileSync('/tmp/h45-stagger-candidates.json',JSON.stringify({literal,candidate},null,2));expect(literal).toHaveLength(4);expect(candidate).toEqual([]);
});
function crossFall(fall,{speedK=1,hop=false,dt=1/120,spanOptions={},deathsAtCp=0}={}){
 const f=riverFixture(),{p,k,track,tick}=f,span=k.raft(304,382,{speed:11.5,falls:[fall],...spanOptions});f.session.deathsAtCp=deathsAtCp;p.spawnAt(track.toWorld(fall[0]-.01,0,-.98));p.body.grounded=true;p.setRide({...span.cfg,mesh:'raft'});stageSetup(f,span);p.ride.speedK=speedK;const forward=track.tangent(p.body.s);p.vel.set(forward.x*span.cfg.speed*speedK*(deathsAtCp>=5?.92:1),0,forward.z*span.cfg.speed*speedK*(deathsAtCp>=5?.92:1));if(hop)p._jump(TUNING.JUMP);
 let crossed=false;const samples=[];for(let i=0;i<1200&&!p.dead;i++){tick(Array.isArray(dt)?dt[i%dt.length]:dt);if(i%12===0)samples.push({frame:i,s:p.body.s,y:p.pos.y,k:p.ride?.speedK,grounded:p.body.grounded});if(p.body.s>=fall[1]+.2&&p.body.grounded){crossed=true;break;}if(p.body.s>fall[1]+8)break;}
 const result={fall,speedK,hop,dt,deathsAtCp,crossed,dead:p.dead,death:p.deathType,s:p.body.s,y:p.pos.y,drop:track.heightAt(fall[0])-track.heightAt(fall[1]),samples};f.stage.dispose();return result;
}
test('literal fall-two full-speed crossing fails and neither recovering stalled run can ladder up the bank',()=>{
 const outcomes=[];for(const fall of[[329,333],[359,363]])for(const speedK of[1,.4])outcomes.push(crossFall(fall,{speedK}));writeFileSync('/tmp/h45-literal-falls-player.json',JSON.stringify(outcomes,null,2));expect(outcomes.map(r=>r.crossed)).toEqual([true,false,false,false]);expect(outcomes.slice(1).every(r=>r.dead)).toBe(true);
});
test('aligned four-metre falls clear cleanly at full speed, including DDA and variable dt, while actual recovering stalls fail',()=>{
 const outcomes=[];for(const fall of L6_RAFT_SPANS[2].falls)for(const deathsAtCp of[0,5])for(const dt of[1/120,1/60,1/30,[1/60,1/120,1/30]])for(const speedK of[1,.4]){const r=crossFall(fall,{speedK,dt,deathsAtCp});outcomes.push(r);expect(r.crossed,JSON.stringify({fall,dt,deathsAtCp,speedK})).toBe(speedK===1);expect(r.dead).toBe(speedK!==1);}
 writeFileSync('/tmp/h45-corrected-falls-player.json',JSON.stringify(outcomes,null,2));
},60000);
test('smaller quarter-metre corrections still fail the helped full-speed coarse-step crossing',()=>{
 for(const fall of[[329.5,333.5],[360.5,364.5]]){const r=crossFall(fall,{deathsAtCp:5,dt:1/30});expect(r.dead).toBe(true);expect(r.crossed).toBe(false);}
});
function ramRide(spanIndex,{startU=3.5,dt=1/120,perturb=0}={}){
 const f=riverFixture(),{p,k,track,tick}=f,source=L6_RAFT_SPANS[spanIndex],span=k.raft(source.d0,source.d1,{...source.cfg,boost:source.boost,falls:source.falls});
 const row=L6_RAFT_ITEMS.filter(i=>i.d>=span.d0&&i.d<span.d1).map((item,i)=>({...item,x:item.x+(i%2?1:-1)*perturb}));
 const actors=row.map(item=>{let e;if(item.id.startsWith('dog'))e=k.dog(item.x,-1,item.d,item.id.includes('pug')?'pug':'corgi');else if(item.id.startsWith('cp'))e=k.snacks(item.x,-1,item.d);else if(item.id.startsWith('sphere'))e=k.sphere(item.x,-1,item.d);else e=k.floatPack(item.x,item.d);return e;});
 p.spawnAt(track.toWorld(span.d0+.1,startU,-.98));p.body.grounded=true;p.setRide({...span.cfg,mesh:'raft'});stageSetup(f,span);let index=0,minK=1;
 for(let frame=0;frame<2400&&!p.dead&&index<actors.length;frame++){
  while(index<actors.length&&(actors[index].broken||actors[index].freed))index++;if(index===actors.length)break;
  const item=row[index],next=row[index+1],aim=item.x+Math.sign((next?.x??item.x)-item.x)*.6,error=aim-(p.body.u??startU);input.state.x=Math.max(-1,Math.min(1,error*6));tick(dt);minK=Math.min(minK,p.ride?.speedK??1);if(p.body.s>item.d+1.2)break;
 }
 const result={spanIndex,startU,dt,perturb,hit:actors.map((e,i)=>({id:row[i].id,hit:!!(e.broken||e.freed)})),dead:p.dead,s:p.body.s,u:p.body.u,minK};input.state.x=0;f.stage.dispose();return result;
}
test('actual Player rams each corrected raft sequence at full speed from either bank without a second pass, including perturbed placements',()=>{
 const outcomes=[];for(const spanIndex of[0,1,2])for(const startU of[-3.5,3.5])for(const perturb of[0,.25,-.25]){const r=ramRide(spanIndex,{startU,perturb});outcomes.push(r);expect(r.dead,JSON.stringify(r)).toBe(false);expect(r.hit.every(x=>x.hit),JSON.stringify(r)).toBe(true);expect(r.minK).toBe(1);}
 writeFileSync('/tmp/h45-ram-sequences-player.json',JSON.stringify(outcomes,null,2));
},60000);
test('actual post-spawn checkpoint camera snap clears a prior waterfall hold before drawing CP338',async()=>{
 const {GameCamera}=await import('../src/camera/camera.js');const f=riverFixture(),{game,p,k,track,stage}=f,span=k.raft(304,382,{speed:11.5,falls:[[329.75,333.75]]});game.camera=new GameCamera(1);game.camera.setMode('track',{track,height:4.9,dist:9.6,ahead:7.5});p.spawnAt(track.toWorld(330,0,-.98));p.body.grounded=false;p.setRide({...span.cfg,mesh:'raft'});stageSetup(f,span);game.camera.snap(p);stage.raftController.update(.01);expect(game.camera.opts.holdY).toBeDefined();
 const cp=track.toWorld(338,0,-.98),copy=cp.clone();p.spawnAt(cp);stage.raftController.restoreAtCheckpoint(cp);game.camera.snap(p);expect(game.camera.opts.holdY).toBeUndefined();expect(game.camera.trackY).toBe(p.pos.y);expect(game.camera.cam.fov).toBe(66);expect(p.ride.speedK).toBe(.35);expect(cp.equals(copy)).toBe(true);stage.dispose();
});
test('actual low aqueduct support dismounts once and does not immediately remount; a descending river return mounts again',()=>{
 const f=riverFixture(),{p,k,track,stage,tick}=f,span=k.raft(304,382,{speed:11.5});const route=k.goodBoy(300,[[3,-.4,309,2.4,2.4],[3,.4,311.4,2.4,2.4],[3,1.2,313.8,2.4,2.4],[3,2,320,2.4,10]]);span.footSupports=new Set(route.plats.map(p=>p.solid));route.reveal();route.update(2);
 p.spawnAt(track.toWorld(309,3,-.38));p.body.grounded=false;p.setRide({...span.cfg,mesh:'raft'});stageSetup(f,span);p.vel.y=-1;for(let i=0;i<12&&p.ride;i++)tick();expect(p.body.ground).toBe(route.plats[0].solid);expect(p.ride).toBeNull();for(let i=0;i<3;i++)tick();expect(p.ride).toBeNull();expect(stage.raftController.current).toBeNull();
 p.spawnAt(track.toWorld(326,-2,-.83));p.body.grounded=false;p.vel.y=-2;tick();expect(p.ride?.meshKind).toBe('raft');expect(p.ride.raftSpan).toBe(span);stage.dispose();
});
