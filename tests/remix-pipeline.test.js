import * as THREE from 'three';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('../src/art/assets.js',()=>({Assets:{has:()=>false,model:()=>null,animate:()=>null,aspect:()=>1,tex:()=>new THREE.Texture({width:16,height:16}),tiled:()=>new THREE.Texture({width:16,height:16}),url:()=>''}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn(),musicTime:()=>null}}));
import {pipelineFixture} from './pipelineFixture.js';
import {ConedDog} from '../src/entities/dogs.js';
import {MysteryBackpack} from '../src/entities/mysteryBackpack.js';
import {PumpStone} from '../src/entities/pumpStone.js';
import {RugPull} from '../src/entities/props2.js';
import {CamZone} from '../src/entities/environment.js';
import {GameCamera} from '../src/camera/camera.js';
import * as decorHelpers from '../src/world/decor.js';
import {moveBody,rideGround} from '../src/world/physics.js';
import {input} from '../src/core/input.js';
import {save} from '../src/core/save.js';
import {resetWorld} from './helpers.js';
const fixtures=[],noop=()=>{};
beforeEach(()=>{resetWorld();save.data.beaten={1:true,2:true,3:true,4:true,5:true,6:true};vi.spyOn(input,'held').mockReturnValue(false);vi.spyOn(input,'pressed').mockReturnValue(false);input.state.x=input.state.y=0;});
afterEach(()=>{for(const f of fixtures.splice(0))f.stage.dispose();vi.restoreAllMocks();input.state.x=input.state.y=0;});
function build(remix,{decor=false,roll=.37}={}){
 const rng=vi.spyOn(Math,'random').mockReturnValue(roll);
 try{const f=pipelineFixture({decor,session:{remix,addTickets:noop,secretWarp:()=>false}});fixtures.push(f);f.stage.defaultCamera=f.info.camera;return f;}finally{rng.mockRestore();}
}
const pair=o=>[build(false,o),build(true,o)];
function reflect(a,b,axis=0,label='point'){
 expect(b.x,label+' x').toBeCloseTo(2*axis-a.x,4);expect(b.y,label+' y').toBeCloseTo(a.y,4);expect(b.z,label+' z').toBeCloseTo(a.z,4);
}
function solidPair(a,b,axis=0,label='solid'){
 reflect({x:a.max.x,y:a.min.y,z:a.min.z},b.min,axis,label+' min');reflect({x:a.min.x,y:a.max.y,z:a.max.z},b.max,axis,label+' max');expect(b.enabled,label+' enabled').toBe(a.enabled);
}
function place(f,position){f.p.spawnAt(position,0);const pr=f.track.project(position.x,position.z);f.p.body.s=pr.s;f.p.body.u=pr.u;}
function land(f,support,offset=0){
 const s=support.solid;s.enabled=true;place(f,new THREE.Vector3((s.min.x+s.max.x)/2+offset,s.max.y+.35,(s.min.z+s.max.z)/2));f.p.vel.set(0,-2.4,0);
 let called=false;const original=f.p.body.onLand;f.p.body.onLand=(...args)=>{called=true;return original(...args);};
 try{for(let i=0;i<40&&!called;i++)moveBody(f.stage.world,f.p.body,1/120);}finally{f.p.body.onLand=original;}
 expect(called,'actual World→Player.onLand contact').toBe(true);
}
it('pairs all actual L5 Golden inventory, Tickets and World supports with exact optional Moon exclusions',()=>{
 const[a,b]=pair(),axis=a.track.mirrorAxisX;
 expect(b.track.length).toBe(a.track.length);reflect(a.info.spawn,b.info.spawn,axis,'spawn');
 const aa=a.stage.entities.filter(e=>e.countable),bb=b.stage.entities.filter(e=>e.countable);expect(aa).toHaveLength(44);expect(bb).toHaveLength(44);
 aa.forEach((e,i)=>reflect(e.pos,bb[i].pos,axis,`countable${i}/${e.kind}`));
 const da=a.stage.entities.filter(e=>e instanceof ConedDog),db=b.stage.entities.filter(e=>e instanceof ConedDog);expect(da).toHaveLength(7);expect(db.map(e=>e.dogId)).toEqual(da.map(e=>e.dogId));da.forEach((e,i)=>reflect(e.home,db[i].home,axis,e.dogId));
 expect(a.stage.entities.filter(e=>e instanceof MysteryBackpack)).toHaveLength(2);expect(b.stage.entities.some(e=>e instanceof MysteryBackpack||e.kind==='freeze'||e.kind==='hiddenbone'||e.kind==='moonledge')).toBe(false);
 expect(a.tickets.list.length).toBe(b.tickets.list.length);a.tickets.list.forEach((e,i)=>reflect(e,b.tickets.list[i],axis,`Ticket${i}`));
 const moon=a.stage.pipeline.moonProtection;expect(moon.ledge).toBeTruthy();expect(b.stage.pipeline.moonProtection).toEqual({ledge:null,hidden:null,shell:null});
 const omitted=new Set([...moon.shell.solids,moon.ledge.solid]),sa=a.stage.world.all.filter(s=>!omitted.has(s));expect(sa.length).toBe(b.stage.world.all.length);
 sa.forEach((s,i)=>solidPair(s,b.stage.world.all[i],axis,`World${i}/${s.ref?.kind||s.kind}`));
 aa.forEach((e,i)=>{const other=bb[i],ga=a.stage.world.groundBelow(e.pos.x,e.pos.y+.1,e.pos.z,.05),gb=b.stage.world.groundBelow(other.pos.x,other.pos.y+.1,other.pos.z,.05);expect(gb,`support${i}`).toBeCloseTo(ga,4);});
 for(const name of['bidShutter','liquidationShutter'])expect(b.stage.pipeline[name].supports.length).toBe(a.stage.pipeline[name].supports.length);
});
it('pairs actual PumpStone landings, rises, carry, dump and recovery including Order Book base+10 once',()=>{
 const[a,b]=pair(),axis=a.track.mirrorAxisX,all=[a,b].map(f=>f.stage.entities.filter(e=>e instanceof PumpStone));
 expect(all[0]).toHaveLength(11);expect(all[1]).toHaveLength(11);all[0].forEach((e,i)=>reflect(e.home,all[1][i].home,axis));
 const stones=all.map(list=>list.find(e=>e.detour));expect(stones[0].home.y-a.track.heightAt(247.5)).toBeCloseTo(10.4,4);expect(stones[1].home.y-b.track.heightAt(247.5)).toBeCloseTo(10.4,4);
 for(const[f,e]of[[a,stones[0]],[b,stones[1]]])land(f,e);
 for(let i=0;i<80;i++){
  for(const[f,e]of[[a,stones[0]],[b,stones[1]]]){f.stage.time+=1/120;f.stage.world.beginFrame();e.update(1/120);f.p.update(1/120,f.stage,{right:{x:1,z:0},forward:{x:0,z:-1}});}
  reflect(a.p.pos,b.p.pos,axis,'actual rider');solidPair(stones[0].solid,stones[1].solid,axis);expect(stones[1].solid.delta.x).toBeCloseTo(-stones[0].solid.delta.x,8);expect(stones[1].solid.delta.z).toBeCloseTo(stones[0].solid.delta.z,8);
 }
 expect(stones.map(e=>e.pumps)).toEqual([1,1]);expect(a.p.body.ground).toBe(stones[0].solid);expect(b.p.body.ground).toBe(stones[1].solid);
 for(const e of stones){e.update(e.float);expect(e.state).toBe('dumped');expect(e.solid.enabled).toBe(false);e.update(4);expect(e.state).toBe('idle');expect(e.pumps).toBe(0);expect(e.solid.enabled).toBe(true);}
 reflect(stones[0].pos,stones[1].pos,axis);solidPair(stones[0].solid,stones[1].solid,axis);
});
it('pairs live MarketClock phases and moving Solid deltas on main and high detour markets',()=>{
 const[a,b]=pair(),axis=a.track.mirrorAxisX,markets=[a.stage.marketClock.platforms,b.stage.marketClock.platforms];expect(markets[0].length).toBe(markets[1].length);
 for(const t of[0,.12,.449,.94,1.2,2.81,4.14,7.49]){
  for(const f of[a,b]){f.stage.world.beginFrame();f.stage.marketClock.t=t;f.stage.marketClock.k=Math.floor(t/f.stage.marketClock.step);for(const e of f.stage.marketClock.platforms)e.update();}
  markets[0].forEach((e,i)=>{const q=markets[1][i];reflect(e.pos,q.pos,axis);solidPair(e.solid,q.solid,axis);expect(q.solid.delta.x).toBeCloseTo(-e.solid.delta.x,8);expect(q.solid.delta.y).toBeCloseTo(e.solid.delta.y,8);expect(q.edge.material.color.getHex()).toBe(e.edge.material.color.getHex());expect(q.arrows.map(a=>a.visible)).toEqual(e.arrows.map(a=>a.visible));});
 }
 expect(a.stage.marketClock.step).toBe(.9375);expect(b.stage.marketClock.step).toBe(.9375);
});
it('pairs every any-tile Rug Pull trigger and collapse state without changing its authored speed',()=>{
 const[a,b]=pair(),axis=a.track.mirrorAxisX,rugs=[a,b].map(f=>f.stage.entities.filter(e=>e instanceof RugPull));expect(rugs[0]).toHaveLength(3);
 for(let j=0;j<3;j++){
  for(const[f,r]of[[a,rugs[0][j]],[b,rugs[1][j]]]){expect(r.triggerOnAnyTile).toBe(true);const tile=r.tiles.at(-1);land(f,tile);expect(f.p.body.ground).toBe(tile.solid);r.update(.01);expect(r.state).toBe('pulling');}
  for(let i=0;i<45;i++){for(const f of[a,b])f.stage.world.beginFrame();rugs[0][j].update(.1);rugs[1][j].update(.1);expect(rugs[1][j].front).toBe(rugs[0][j].front);expect(rugs[1][j].speed).toBe(rugs[0][j].speed);rugs[0][j].tiles.forEach((e,i)=>{const q=rugs[1][j].tiles[i];expect(q.state).toBe(e.state);reflect(e.home,q.home,axis);solidPair(e.solid,q.solid,axis);});}
  rugs[0][j].onRespawn();rugs[1][j].onRespawn();expect(rugs[0][j].state).toBe('idle');expect(rugs[1][j].state).toBe('idle');
 }
});
it.each(['bidShutter','liquidationShutter'])('pairs actual landing contacts, checkpoint restoration and retirement for %s',name=>{
 const[a,b]=pair(),axis=a.track.mirrorAxisX,doors=[a.stage.pipeline[name],b.stage.pipeline[name]];
 for(let i=0;i<doors[0].supports.length;i++){
  land(a,doors[0].supports[i],.25);land(b,doors[1].supports[i],-.25);expect(doors[0].contacts.size).toBe(i+1);expect(doors[1].contacts.size).toBe(i+1);reflect(a.p.pos,b.p.pos,axis);
 }
 expect(doors.every(d=>d.open&&d.solids.every(s=>!s.enabled))).toBe(true);
 for(const d of doors){d.onCheckpoint();d.contacts.clear();d.open=false;d.onRespawn();expect(d.open).toBe(true);expect(d.contacts.size).toBe(d.supports.length);expect(d.mesh.position.y).toBe(55);}
 const bindings=doors.map(d=>[...d.bindings]);a.stage.dispose();b.stage.dispose();
 for(let j=0;j<2;j++){expect(doors[j].disposed).toBe(true);for(const binding of bindings[j]){expect(binding.target.onLand).toBe(binding.previousLand);expect(binding.support.pipelineMarker).toBe(binding.previousMarker);expect(binding.marker.parent).toBeNull();}}
});
it('reflects actual Order Book docks, descending line and owned fall/respawn return',async()=>{
 const[a,b]=pair(),axis=a.track.mirrorAxisX,detours=[a.stage.pipeline.detours[0],b.stage.pipeline.detours[0]];
 for(const key of['home','startPos','exitPos','pipelineDock'])reflect(detours[0][key],detours[1][key],axis,key);
 for(const key of['A','B'])reflect(detours[0].pipelineExitLine[key],detours[1].pipelineExitLine[key],axis,'exit line '+key);
 for(const[f,d]of[[a,detours[0]],[b,detours[1]]]){expect(d.loop).toBe(true);await d.travel(d.startPos,232);expect(d.pipelineActive).toBe(true);f.p.pos.y=f.track.heightAt(240)+d.y-3;f.p.body.s=240;d.update();await Promise.resolve();await Promise.resolve();expect(d.pipelineActive).toBe(false);}
 reflect(a.p.pos,b.p.pos,axis,'fall return');expect(a.p.pos.distanceTo(detours[0].pipelineDock)).toBeLessThan(.02);expect(b.p.pos.distanceTo(detours[1].pipelineDock)).toBeLessThan(.02);
 for(const[f,d]of[[a,detours[0]],[b,detours[1]]]){f.session.cp.pos=f.k.W(2.6,10,252);d.onRespawn();expect(d.pipelineActive).toBe(true);}
 await detours[0].travel(detours[0].startPos,232);await detours[1].travel(detours[1].startPos,232);reflect(a.p.pos,b.p.pos,axis,'reentry');
});
it('pairs actual side-camera framing and preserves physical backstop projection in track views',()=>{
 const[a,b]=pair(),axis=a.track.mirrorAxisX,zones=[a,b].map(f=>f.stage.entities.find(e=>e instanceof CamZone&&e.mode==='side'));
 expect(zones.map(e=>e.opts.side)).toEqual([1,-1]);
 for(const[f,z]of[[a,zones[0]],[b,zones[1]]]){f.game.camera=new GameCamera(.55);place(f,f.k.W(1.2,4.2,418));z.apply(418);f.game.camera.snap(f.p);f.game.camera.update(.016,f.p);}
 reflect(a.game.camera.pos,b.game.camera.pos,axis,'side camera');reflect(a.game.camera.look,b.game.camera.look,axis,'side look');reflect(a.game.camera.basis.right,b.game.camera.basis.right,0,'side right input');reflect(a.game.camera.basis.forward,b.game.camera.basis.forward,0,'side depth input');
 for(const mode of['track','rise','trackFront']){
  for(const f of[a,b]){const d=mode==='trackFront'?465:1;place(f,f.k.W(1.3,0,d));f.game.camera.setMode(mode,{...f.info.camera,mode,track:f.track});f.game.camera.snap(f.p);f.game.camera.update(.016,f.p);expect(f.track.spans.some(s=>s.cameraBackstop)).toBe(true);}
  reflect(a.game.camera.pos,b.game.camera.pos,axis,mode+' camera');reflect(a.game.camera.look,b.game.camera.look,axis,mode+' look');
 }
});
it.each([.1,.4,.7,.9])('reflects seeded bank helper anchors and preserves the positive-author-side cutaway (roll%s)',roll=>{
 const capture=new Map();
 for(const name of['pipe','vat','vent','coneStack']){const original=decorHelpers[name];vi.spyOn(decorHelpers,name).mockImplementation(function(stage,x,y,z,...rest){const list=capture.get(stage)||[];list.push({name,pos:new THREE.Vector3(x,y,z)});capture.set(stage,list);return original(stage,x,y,z,...rest);});}
 const[a,b]=pair({decor:true,roll}),axis=a.track.mirrorAxisX,aa=capture.get(a.stage)||[],bb=capture.get(b.stage)||[];
 expect(bb.map(e=>e.name)).toEqual(aa.map(e=>e.name));aa.forEach((e,i)=>reflect(e.pos,bb[i].pos,axis,`${e.name} world anchor${i}`));
 const bank=(f,list)=>list.filter(e=>{const q=f.track.project(e.pos.x,e.pos.z);return q.s>=376&&q.s<=460&&Math.abs(q.u)>4.8;});
 const bankA=bank(a,aa),bankB=bank(b,bb);expect(bankB.length).toBe(bankA.length);
 if(roll<.6||roll>=.8){expect(bankA.length).toBeGreaterThan(0);expect(bankA.every(e=>a.track.project(e.pos.x,e.pos.z).u<0)).toBe(true);expect(bankB.every(e=>b.track.project(e.pos.x,e.pos.z).u>0)).toBe(true);}
 const candles=f=>f.stage.scene.children.find(g=>g.children?.some(m=>m.geometry?.parameters?.width===.04&&m.geometry.parameters.height===.2));
 if(roll>=.6&&roll<.8){
  expect(candles(a)).toBeTruthy();expect(candles(b).children.length).toBe(candles(a).children.length);candles(a).children.forEach((m,i)=>reflect(m.position,candles(b).children[i].position,axis,'bank candle'));
  const bankCandles=candles(a).children.filter(m=>{const q=a.track.project(m.position.x,m.position.z);return q.s>=376&&q.s<=460;});expect(bankCandles.length).toBeGreaterThan(0);expect(bankCandles.every(m=>a.track.project(m.position.x,m.position.z).u<0)).toBe(true);
 }else expect(candles(b)).toBeUndefined();
});
it.each([.1,.4,.7,.9])('keeps finalized normal and mirrored side-camera body rays clear for every decor branch (roll%s)',roll=>{
 const[a,b]=pair({decor:true,roll}),axis=a.track.mirrorAxisX;
 for(const f of[a,b]){f.stage.finalize();f.game.camera=new GameCamera(1100/800);}
 const zones=[a,b].map(f=>f.stage.entities.find(e=>e instanceof CamZone&&e.d0===390));
 for(const d of[391,400,428.49,435,444]){
  for(const[f,zone]of[[a,zones[0]],[b,zones[1]]]){
   place(f,f.k.W(0,d===444?3:0,d));f.p.facing=f.track.yaw(d);zone.update(0);f.game.camera.snap(f.p);f.stage.update(0,f.p);f.stage.scene.updateMatrixWorld(true);
   const target=f.p.pos.clone().add(new THREE.Vector3(0,.9,0)),delta=target.clone().sub(f.game.camera.cam.position);
   const ray=new THREE.Raycaster(f.game.camera.cam.position,delta.clone().normalize(),0,delta.length()-.04);ray.camera=f.game.camera.cam;
   const blockers=ray.intersectObjects(f.stage.scene.children,true).filter(hit=>{for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;return true;});
   expect(blockers.map(hit=>({name:hit.object.name,type:hit.object.type,distance:hit.distance})),`actual body sightline mirror=${f.session.remix}/D${d}/roll${roll}`).toEqual([]);
  }
  reflect(a.game.camera.pos,b.game.camera.pos,axis,`visible camera D${d}`);reflect(a.p.pos,b.p.pos,axis,`visible body D${d}`);
 }
});
