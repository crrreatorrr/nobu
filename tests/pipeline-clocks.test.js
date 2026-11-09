import * as THREE from 'three';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const music=vi.hoisted(()=>({time:0}));
vi.mock('../src/art/assets.js',()=>({Assets:{has:()=>false,model:()=>null,animate:()=>null,aspect:()=>1,tex:()=>new THREE.Texture({width:16,height:16}),tiled:()=>new THREE.Texture({width:16,height:16}),url:()=>''}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn(),musicTime:()=>music.time}}));
import {pipelineFixture} from './pipelineFixture.js';
import {advanceBeatClocks,resetBeatClocks} from '../src/entities/boxes.js';
import {L5_STEP} from '../src/levels/data/pipeline.js';
import {resetWorld} from './helpers.js';
const fixtures=[],build=o=>{const f=pipelineFixture(o);fixtures.push(f);return f;};
beforeEach(()=>{resetWorld();music.time=0;});afterEach(()=>{vi.restoreAllMocks();for(const f of fixtures.splice(0))f.stage.dispose();});
it('starts at exact128bpm but preserves global market time while checkpoint box rhythm restarts',()=>{
 const f=build(),market=f.stage.marketClock,box=f.stage.timedBoxes.find(b=>b.d===405).entity;
 expect(market.step).toBe(L5_STEP);expect(box.on).toBe(L5_STEP);expect(box.off).toBe(L5_STEP);
 market.update(0);expect(market.t).toBe(0);expect(box.clock.t).toBe(0);
 music.time=2.17;advanceBeatClocks(f.stage,2.17);market.update(0);
 expect(box.clock.t).toBeCloseTo(market.t);market.onRespawn();resetBeatClocks(f.stage);box.onRespawn();
 expect(market.t).toBe(2.17);expect(box.clock.t).toBe(0);expect(box.solid.enabled).toBe(true);
 music.time+=.2;market.update(.2);advanceBeatClocks(f.stage,.2);box.update(0);
 expect(market.t).toBe(2.37);expect(box.clock.t).toBeCloseTo(.2);expect(market.t-box.clock.t).toBeCloseTo(2.17);
});
it('follows absolute musical time after pause while the paused BeatClock advances only simulation time',()=>{
 const f=build(),market=f.stage.marketClock,box=f.stage.timedBoxes.find(b=>b.d===405).entity;
 music.time=.4;market.update(.4);advanceBeatClocks(f.stage,.4);
 // No world updates while paused: music can still advance independently.
 music.time=5.7;market.update(1/60);advanceBeatClocks(f.stage,1/60);
 expect(market.t).toBe(5.7);expect(box.clock.t).toBeCloseTo(.4+1/60);
 expect(market.k).toBe(Math.floor(5.7/L5_STEP));
});
it('documents intentional assisted rhythm stretch without retuning global markets; trials stay unassisted',()=>{
 const ordinary=build(),trial=build({session:{trial:true}});
 ordinary.session.deathsAtCp=trial.session.deathsAtCp=5;
 const a=ordinary.stage.timedBoxes.find(b=>b.d===405).entity,b=trial.stage.timedBoxes.find(b=>b.d===405).entity;
 advanceBeatClocks(ordinary.stage,L5_STEP);advanceBeatClocks(trial.stage,L5_STEP);
 music.time=L5_STEP;ordinary.stage.marketClock.update(0);trial.stage.marketClock.update(0);
 expect(a.clock.t).toBeCloseTo(L5_STEP/1.08);expect(b.clock.t).toBeCloseTo(L5_STEP);
 expect(ordinary.stage.marketClock.t).toBe(L5_STEP);expect(trial.stage.marketClock.t).toBe(L5_STEP);
});
