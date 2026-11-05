import * as THREE from 'three';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('../src/art/assets.js',()=>({Assets:{has:()=>false,model:()=>null,animate:()=>null,aspect:()=>1,tex:()=>new THREE.Texture({width:16,height:16}),tiled:()=>new THREE.Texture({width:16,height:16}),url:()=>''}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn(),musicTime:()=>null}}));
import {pipelineFixture} from './pipelineFixture.js';
import {HANG} from '../src/player/hang.js';
import {input} from '../src/core/input.js';
import {resetWorld} from './helpers.js';
const fixtures=[],build=()=>{const f=pipelineFixture();fixtures.push(f);return f;};
beforeEach(()=>{resetWorld();input.state.x=input.state.y=0;});afterEach(()=>{vi.restoreAllMocks();for(const f of fixtures.splice(0))f.stage.dispose();});
it('finishes the actual owned descending exit line at its authored233.6dock without a fall-return fade',()=>{
 const f=build(),d=f.stage.pipeline.detours[0],line=d.pipelineExitLine,fade=vi.spyOn(f.game.ui,'fade');
 vi.spyOn(input,'held').mockReturnValue(false);vi.spyOn(input,'pressed').mockReturnValue(false);
 expect(line).toBeTruthy();f.p.spawnAt(line.A.clone().add(new THREE.Vector3(0,-HANG,0)),f.track.yaw(239));f.p.biteT=.1;line.update(0);expect(f.p.hang?.line).toBe(line);d.pipelineActive=true;
 let stayedOnLowLine=false;
 for(let i=0;i<420;i++){
  f.tick(1/120,[d,line]);if(f.p.hang?.line===line&&f.p.pos.y<8)stayedOnLowLine||=d.pipelineActive;
  if(!f.p.hang&&f.p.body.grounded)break;
 }
 d.update();expect(stayedOnLowLine).toBe(true);expect(fade).not.toHaveBeenCalled();expect(f.p.hang).toBeNull();expect(f.p.body.grounded).toBe(true);expect(f.p.body.s).toBeGreaterThan(233);expect(f.p.body.s).toBeLessThan(234.5);expect(f.p.pos.y).toBeCloseTo(0);expect(d.pipelineActive).toBe(false);
});
it.each([[0,7,260],[0,11,274],[0,11,230]])('returns an accidental loop escape%s/%s/%s to the entry dock',async(x,y,s)=>{
 const f=build(),d=f.stage.pipeline.detours[0];d.pipelineActive=true;f.p.spawnAt(f.k.W(x,y,s),f.track.yaw(s));d.update();await Promise.resolve();await Promise.resolve();
 expect(f.p.pos.distanceTo(d.pipelineDock)).toBeLessThan(.1);expect(d.pipelineActive).toBe(false);
});
it('returns a lateral landing on non-detour roof support instead of allowing a parachute skip',async()=>{
 const f=build(),d=f.stage.pipeline.detours[0],roof=f.stage.pipeline.cases[0].solids.find(s=>s.max.y===9.8);d.pipelineActive=true;
 f.p.spawnAt(f.k.W(3,9.8,248),f.track.yaw(248));f.p.body.grounded=true;f.p.body.ground=roof;d.update();await Promise.resolve();await Promise.resolve();expect(f.p.pos.distanceTo(d.pipelineDock)).toBeLessThan(.1);
});
it.each(['replacement','dispose'])('guards ownership before base update/respawn after%s',kind=>{
 const f=build(),d=f.stage.pipeline.detours[0];d.validated=false;const epoch=d.epoch;
 if(kind==='replacement'){f.game.session={cp:{pos:f.k.W(0,0,1)}};f.game.stage={};}else f.stage.dispose();
 const retiredEpoch=d.epoch;f.p.frozen=true;const pos=f.p.pos.clone();d.update();d.onRespawn();expect(d.validated).toBe(false);expect(d.epoch).toBe(retiredEpoch);expect(f.p.pos.equals(pos)).toBe(true);expect(f.p.frozen).toBe(true);if(kind==='replacement')expect(d.epoch).toBe(epoch);
});
it('cancels pending detour fade without moving or unfreezing a newer shared Player',async()=>{
 const f=build(),d=f.stage.pipeline.detours[0];let release;f.game.ui.fade=()=>new Promise(resolve=>release=resolve);
 const travel=d.travel(d.startPos,d.entryD);expect(f.p.frozen).toBe(true);f.game.session={};f.game.stage={};f.p.pos.set(100,40,100);release();expect(await travel).toBe(false);expect(f.p.pos.toArray()).toEqual([100,40,100]);expect(f.p.frozen).toBe(true);
});
